// Idexal Core — Anthropic Messages API provider
//
// Speaks Anthropic's native wire format (system as a top-level field,
// content blocks, tool_use / tool_result blocks) and translates to and from
// the unified types in types.rs. SSE streaming with incremental tool-call
// argument accumulation — the subtle part the reference implementation
// documented with a dedicated regression test: input_json_delta chunks are
// fragments that must be concatenated, not whole arguments.

use super::types::{Delta, Message, Role, TokenUsage, ToolCall, ToolDefinition, Turn};
use crate::config::ProviderConfig;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;

/// Translate unified messages into Anthropic's `messages` array plus the
/// separate top-level `system` string.
fn to_anthropic_messages(messages: &[Message]) -> (String, Vec<serde_json::Value>) {
    let mut system = String::new();
    let mut out: Vec<serde_json::Value> = Vec::new();

    for m in messages {
        match m.role {
            Role::System => {
                if !system.is_empty() {
                    system.push_str("\n\n");
                }
                system.push_str(&m.content);
            }
            Role::User => {
                if let Some(id) = &m.tool_call_id {
                    // Tool results are user-role messages with a
                    // tool_result content block.
                    out.push(json!({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": id,
                            "content": m.content,
                        }]
                    }));
                } else {
                    out.push(json!({ "role": "user", "content": m.content }));
                }
            }
            Role::Assistant => {
                let mut blocks: Vec<serde_json::Value> = Vec::new();
                if !m.content.is_empty() {
                    blocks.push(json!({ "type": "text", "text": m.content }));
                }
                for tc in &m.tool_calls {
                    let input: serde_json::Value =
                        serde_json::from_str(&tc.arguments).unwrap_or_else(|_| json!({}));
                    blocks.push(json!({
                        "type": "tool_use",
                        "id": tc.id,
                        "name": tc.name,
                        "input": input,
                    }));
                }
                if blocks.is_empty() {
                    blocks.push(json!({ "type": "text", "text": "" }));
                }
                out.push(json!({ "role": "assistant", "content": blocks }));
            }
        }
    }
    (system, out)
}

fn to_anthropic_tools(tools: &[ToolDefinition]) -> Vec<serde_json::Value> {
    tools
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            })
        })
        .collect()
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
enum SseEvent {
    #[serde(rename = "message_start")]
    MessageStart { message: MessageStartBody },
    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: usize, content_block: ContentBlockStart },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: ContentDelta },
    #[serde(rename = "message_delta")]
    MessageDelta { usage: Option<TokenCounts> },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(other)]
    Other,
}

#[derive(Deserialize, Debug)]
struct MessageStartBody {
    usage: Option<TokenCounts>,
}

/// Both events reuse the same shape; each sends only the half it knows, so
/// every field must tolerate being absent.
#[derive(Deserialize, Debug, Default)]
struct TokenCounts {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    output_tokens: u64,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
enum ContentBlockStart {
    #[serde(rename = "tool_use")]
    ToolUse { id: String, name: String },
    #[serde(other)]
    Other,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
enum ContentDelta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },
    #[serde(rename = "input_json_delta")]
    InputJsonDelta { partial_json: String },
    #[serde(other)]
    Other,
}

/// Everything accumulated while consuming one SSE stream. Split out of the
/// network loop so the ordering rules that are easy to get wrong — tool
/// arguments arriving as fragments, token counts arriving as running
/// totals — are testable without a live endpoint.
#[derive(Default)]
struct StreamState {
    turn: Turn,
    /// block index -> (id, name, accumulated arguments)
    pending: std::collections::HashMap<usize, (String, String, String)>,
    usage: TokenUsage,
    saw_usage: bool,
}

impl StreamState {
    /// Returns true once the message is complete and the stream can be
    /// abandoned.
    fn apply<F: FnMut(Delta)>(&mut self, event: SseEvent, on_delta: &mut F) -> bool {
        match event {
            SseEvent::MessageStart { message: MessageStartBody { usage: Some(counts) } } => {
                // The prompt is counted only here; message_delta never
                // repeats it.
                self.usage.input_tokens = counts.input_tokens;
                self.usage.output_tokens = counts.output_tokens;
                self.saw_usage = true;
            }
            SseEvent::MessageDelta { usage: Some(counts) } => {
                // Anthropic sends the RUNNING TOTAL of output tokens on each
                // message_delta, not an increment. Adding them up would
                // multiply the reported output — and the estimated cost.
                self.usage.output_tokens = counts.output_tokens;
                self.saw_usage = true;
            }
            SseEvent::ContentBlockStart {
                index,
                content_block: ContentBlockStart::ToolUse { id, name },
            } => {
                self.pending.insert(index, (id, name, String::new()));
            }
            SseEvent::ContentBlockDelta { delta: ContentDelta::TextDelta { text }, .. } => {
                self.turn.text.push_str(&text);
                on_delta(Delta::Text(text));
            }
            SseEvent::ContentBlockDelta {
                index,
                delta: ContentDelta::InputJsonDelta { partial_json },
            } => {
                if let Some(entry) = self.pending.get_mut(&index) {
                    entry.2.push_str(&partial_json);
                }
            }
            SseEvent::MessageStop => return true,
            _ => {}
        }
        false
    }

    fn finish(mut self) -> Turn {
        let mut indices: Vec<usize> = self.pending.keys().copied().collect();
        indices.sort();
        for idx in indices {
            let (id, name, args) = self.pending.remove(&idx).expect("index came from the map");
            self.turn.tool_calls.push(ToolCall {
                id,
                name,
                arguments: if args.is_empty() { "{}".to_string() } else { args },
            });
        }
        self.turn.usage = self.saw_usage.then_some(self.usage);
        self.turn
    }
}

/// Stream one turn. `on_delta` fires for text as it arrives; the returned
/// `Turn` carries the full text plus any completed tool calls.
pub async fn stream_turn<F: FnMut(Delta)>(
    cfg: &ProviderConfig,
    messages: &[Message],
    tools: &[ToolDefinition],
    mut on_delta: F,
) -> Result<Turn, String> {
    let key = cfg
        .resolve_key()
        .ok_or_else(|| format!("provider '{}' has no API key", cfg.id))?;
    let (system, msgs) = to_anthropic_messages(messages);

    let mut body = json!({
        "model": cfg.model,
        "max_tokens": 4096,
        "stream": true,
        "messages": msgs,
    });
    if !system.is_empty() {
        body["system"] = json!(system);
    }
    if !tools.is_empty() {
        body["tools"] = json!(to_anthropic_tools(tools));
    }
    if let Some(obj) = body.as_object_mut() {
        for (k, v) in &cfg.extra_body {
            obj.insert(k.clone(), v.clone());
        }
    }

    let client = reqwest::Client::new();
    let mut req = client
        .post(format!("{}/v1/messages", cfg.effective_base_url().trim_end_matches('/')))
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json");
    for (k, v) in &cfg.headers {
        req = req.header(k.as_str(), v.as_str());
    }

    let res = req
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("HTTP {status}: {}", super::truncate(&text, 400)));
    }

    // Tool-call blocks arrive as: content_block_start (id+name), then a
    // series of input_json_delta fragments that must be concatenated.
    let mut state = StreamState::default();

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    'outer: while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("stream read error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim_end_matches('\r').to_string();
            buffer.drain(..=pos);
            let Some(data) = line.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data.is_empty() {
                continue;
            }
            // A line we can't parse is skipped, not fatal: an unknown event
            // type must never take down a turn that is otherwise fine.
            let Ok(event) = serde_json::from_str::<SseEvent>(data) else { continue };
            // message_stop ends the message. Labelled break because a plain
            // one only leaves the line loop and would leave us waiting on a
            // socket that has nothing left to say.
            if state.apply(event, &mut on_delta) {
                break 'outer;
            }
        }
    }

    Ok(state.finish())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Feed raw SSE payloads through the same state machine the network
    /// loop uses.
    fn consume(events: &[&str]) -> Turn {
        let mut state = StreamState::default();
        let mut sink = |_: Delta| {};
        for raw in events {
            let event = serde_json::from_str::<SseEvent>(raw).expect("test fixture must parse");
            if state.apply(event, &mut sink) {
                break;
            }
        }
        state.finish()
    }

    #[test]
    fn usage_is_captured_from_message_start_and_message_delta() {
        let turn = consume(&[
            r#"{"type":"message_start","message":{"id":"msg_1","role":"assistant","usage":{"input_tokens":1200,"output_tokens":1}}}"#,
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hi"}}"#,
            r#"{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":345}}"#,
            r#"{"type":"message_stop"}"#,
        ]);
        let usage = turn.usage.expect("usage must be reported");
        assert_eq!(usage.input_tokens, 1200);
        assert_eq!(usage.output_tokens, 345);
        assert_eq!(turn.text, "hi");
    }

    #[test]
    fn output_tokens_are_a_running_total_not_an_increment() {
        // Anthropic re-sends the cumulative output count on every
        // message_delta. Summing them would report 1+40+345 = 386 here and
        // inflate every cost estimate the usage page shows.
        let turn = consume(&[
            r#"{"type":"message_start","message":{"usage":{"input_tokens":10,"output_tokens":1}}}"#,
            r#"{"type":"message_delta","delta":{},"usage":{"output_tokens":40}}"#,
            r#"{"type":"message_delta","delta":{},"usage":{"output_tokens":345}}"#,
            r#"{"type":"message_stop"}"#,
        ]);
        assert_eq!(turn.usage.unwrap().output_tokens, 345);
    }

    #[test]
    fn a_stream_without_usage_events_reports_none() {
        // None must stay distinguishable from a genuine zero, or the usage
        // page silently treats "unreported" as "free".
        let turn = consume(&[
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}"#,
            r#"{"type":"message_stop"}"#,
        ]);
        assert!(turn.usage.is_none());
    }

    #[test]
    fn tool_arguments_are_concatenated_across_fragments() {
        // input_json_delta chunks are fragments; treating one as the whole
        // argument object yields invalid JSON and a dead tool call.
        let turn = consume(&[
            r#"{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"c1","name":"read_file"}}"#,
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"path\":"}}"#,
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"\"a.txt\"}"}}"#,
            r#"{"type":"message_stop"}"#,
        ]);
        assert_eq!(turn.tool_calls.len(), 1);
        assert_eq!(turn.tool_calls[0].arguments, r#"{"path":"a.txt"}"#);
    }

    #[test]
    fn system_messages_are_hoisted_out_of_the_array() {
        let msgs = vec![
            Message { role: Role::System, content: "be brief".into(), tool_calls: vec![], tool_call_id: None },
            Message::user("hi"),
        ];
        let (system, arr) = to_anthropic_messages(&msgs);
        assert_eq!(system, "be brief");
        assert_eq!(arr.len(), 1, "system must not appear in the messages array");
        assert_eq!(arr[0]["role"], "user");
    }

    #[test]
    fn tool_result_becomes_a_tool_result_block() {
        let msgs = vec![Message::tool_result("call_1", "42")];
        let (_, arr) = to_anthropic_messages(&msgs);
        assert_eq!(arr[0]["role"], "user");
        assert_eq!(arr[0]["content"][0]["type"], "tool_result");
        assert_eq!(arr[0]["content"][0]["tool_use_id"], "call_1");
    }

    #[test]
    fn assistant_tool_calls_become_tool_use_blocks() {
        let msgs = vec![Message::assistant(
            "let me check",
            vec![ToolCall { id: "c1".into(), name: "read_file".into(), arguments: r#"{"path":"a.txt"}"#.into() }],
        )];
        let (_, arr) = to_anthropic_messages(&msgs);
        let blocks = arr[0]["content"].as_array().unwrap();
        assert_eq!(blocks[0]["type"], "text");
        assert_eq!(blocks[1]["type"], "tool_use");
        assert_eq!(blocks[1]["name"], "read_file");
        assert_eq!(blocks[1]["input"]["path"], "a.txt");
    }
}
