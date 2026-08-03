// Idexal Core — Anthropic Messages API provider
//
// Speaks Anthropic's native wire format (system as a top-level field,
// content blocks, tool_use / tool_result blocks) and translates to and from
// the unified types in types.rs. SSE streaming with incremental tool-call
// argument accumulation — the subtle part the reference implementation
// documented with a dedicated regression test: input_json_delta chunks are
// fragments that must be concatenated, not whole arguments.

use super::types::{Delta, Message, Role, ToolCall, ToolDefinition, Turn};
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
    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: usize, content_block: ContentBlockStart },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: ContentDelta },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(other)]
    Other,
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

    let mut turn = Turn::default();
    // Tool-call blocks arrive as: content_block_start (id+name), then a
    // series of input_json_delta fragments that must be concatenated.
    let mut pending: std::collections::HashMap<usize, (String, String, String)> =
        std::collections::HashMap::new();

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
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
            match serde_json::from_str::<SseEvent>(data) {
                Ok(SseEvent::ContentBlockStart {
                    index,
                    content_block: ContentBlockStart::ToolUse { id, name },
                }) => {
                    pending.insert(index, (id, name, String::new()));
                }
                Ok(SseEvent::ContentBlockDelta {
                    delta: ContentDelta::TextDelta { text },
                    ..
                }) => {
                    turn.text.push_str(&text);
                    on_delta(Delta::Text(text));
                }
                Ok(SseEvent::ContentBlockDelta {
                    index,
                    delta: ContentDelta::InputJsonDelta { partial_json },
                }) => {
                    if let Some(entry) = pending.get_mut(&index) {
                        entry.2.push_str(&partial_json);
                    }
                }
                Ok(SseEvent::MessageStop) => break,
                _ => {}
            }
        }
    }

    let mut indices: Vec<usize> = pending.keys().copied().collect();
    indices.sort();
    for idx in indices {
        let (id, name, args) = pending.get(&idx).unwrap().clone();
        turn.tool_calls.push(ToolCall {
            id,
            name,
            arguments: if args.is_empty() { "{}".to_string() } else { args },
        });
    }

    Ok(turn)
}

#[cfg(test)]
mod tests {
    use super::*;

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
