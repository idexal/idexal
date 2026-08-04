// Idexal Core — OpenAI-compatible provider
//
// One client serving OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together,
// Ollama, LM Studio, vLLM and any private gateway — they all speak the same
// /chat/completions wire format, so the only difference is base URL, key and
// headers (all user-configurable via config.rs, no vendor allowlist).
//
// Streaming detail carried over from the reference implementation: tool-call
// arguments arrive as fragments keyed by `index` and must be concatenated
// across chunks before the call is complete.

use super::types::{Delta, Message, Role, TokenUsage, ToolCall, ToolDefinition, Turn};
use crate::config::ProviderConfig;
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;

fn to_openai_messages(messages: &[Message]) -> Vec<serde_json::Value> {
    messages
        .iter()
        .map(|m| {
            if let Some(id) = &m.tool_call_id {
                return json!({ "role": "tool", "tool_call_id": id, "content": m.content });
            }
            match m.role {
                Role::System => json!({ "role": "system", "content": m.content }),
                Role::User => json!({ "role": "user", "content": m.content }),
                Role::Assistant => {
                    if m.tool_calls.is_empty() {
                        json!({ "role": "assistant", "content": m.content })
                    } else {
                        let calls: Vec<serde_json::Value> = m
                            .tool_calls
                            .iter()
                            .map(|tc| {
                                json!({
                                    "id": tc.id,
                                    "type": "function",
                                    "function": { "name": tc.name, "arguments": tc.arguments },
                                })
                            })
                            .collect();
                        json!({ "role": "assistant", "content": m.content, "tool_calls": calls })
                    }
                }
            }
        })
        .collect()
}

fn to_openai_tools(tools: &[ToolDefinition]) -> Vec<serde_json::Value> {
    tools
        .iter()
        .map(|t| {
            json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                }
            })
        })
        .collect()
}

#[derive(Deserialize, Debug, Default)]
struct FnDelta {
    name: Option<String>,
    arguments: Option<String>,
}

#[derive(Deserialize, Debug, Default)]
struct ToolCallDelta {
    index: usize,
    id: Option<String>,
    function: Option<FnDelta>,
}

#[derive(Deserialize, Debug, Default)]
struct MsgDelta {
    content: Option<String>,
    tool_calls: Option<Vec<ToolCallDelta>>,
}

#[derive(Deserialize, Debug, Default)]
struct Choice {
    delta: Option<MsgDelta>,
}

/// Sent once, in a final chunk whose `choices` array is empty — which is
/// why usage has to be read before the code gives up on a chunk for having
/// no choices.
#[derive(Deserialize, Debug, Default)]
struct UsageBlock {
    #[serde(default)]
    prompt_tokens: u64,
    #[serde(default)]
    completion_tokens: u64,
}

#[derive(Deserialize, Debug, Default)]
struct Chunk {
    choices: Option<Vec<Choice>>,
    usage: Option<UsageBlock>,
}

/// Accumulated state for one stream. Extracted from the network loop so the
/// chunk-ordering rules can be tested without a live endpoint.
#[derive(Default)]
struct StreamState {
    turn: Turn,
    /// index -> (id, name, accumulated arguments)
    pending: std::collections::HashMap<usize, (String, String, String)>,
    usage: Option<TokenUsage>,
}

impl StreamState {
    fn apply<F: FnMut(Delta)>(&mut self, chunk: Chunk, on_delta: &mut F) {
        if let Some(u) = chunk.usage {
            self.usage =
                Some(TokenUsage { input_tokens: u.prompt_tokens, output_tokens: u.completion_tokens });
        }
        let Some(delta) = chunk.choices.and_then(|c| c.into_iter().next()).and_then(|c| c.delta)
        else {
            return;
        };
        if let Some(text) = delta.content {
            if !text.is_empty() {
                self.turn.text.push_str(&text);
                on_delta(Delta::Text(text));
            }
        }
        if let Some(calls) = delta.tool_calls {
            for tc in calls {
                let entry = self
                    .pending
                    .entry(tc.index)
                    .or_insert_with(|| (String::new(), String::new(), String::new()));
                if let Some(id) = tc.id {
                    entry.0 = id;
                }
                if let Some(f) = tc.function {
                    if let Some(name) = f.name {
                        entry.1.push_str(&name);
                    }
                    if let Some(args) = f.arguments {
                        entry.2.push_str(&args);
                    }
                }
            }
        }
    }

    fn finish(mut self) -> Turn {
        let mut indices: Vec<usize> = self.pending.keys().copied().collect();
        indices.sort();
        for idx in indices {
            let (id, name, args) = self.pending.remove(&idx).expect("index came from the map");
            self.turn.tool_calls.push(ToolCall {
                // Some gateways stream tool calls without ever sending an
                // id; a stable synthetic one keeps the follow-up
                // tool_result matchable.
                id: if id.is_empty() { format!("call_{idx}") } else { id },
                name,
                arguments: if args.is_empty() { "{}".to_string() } else { args },
            });
        }
        self.turn.usage = self.usage;
        self.turn
    }
}

/// Build the request body. `include_usage` is separate because the same
/// body has to be re-sent without it when a server rejects the field.
fn build_body(
    cfg: &ProviderConfig,
    messages: &[Message],
    tools: &[ToolDefinition],
    include_usage: bool,
) -> serde_json::Value {
    let mut body = json!({
        "model": cfg.model,
        "stream": true,
        "messages": to_openai_messages(messages),
    });
    if include_usage {
        // Without this, a streaming response carries no token counts at all.
        body["stream_options"] = json!({ "include_usage": true });
    }
    if !tools.is_empty() {
        body["tools"] = json!(to_openai_tools(tools));
        body["tool_choice"] = json!("auto");
    }
    // extra_body is merged last so a user-configured value always wins,
    // including over stream_options.
    if let Some(obj) = body.as_object_mut() {
        for (k, v) in &cfg.extra_body {
            obj.insert(k.clone(), v.clone());
        }
    }
    body
}

async fn post(cfg: &ProviderConfig, body: &serde_json::Value) -> Result<reqwest::Response, String> {
    let client = reqwest::Client::new();
    let mut req = client
        .post(format!("{}/chat/completions", cfg.effective_base_url().trim_end_matches('/')))
        .header("content-type", "application/json");
    if let Some(key) = cfg.resolve_key() {
        req = req.header("authorization", format!("Bearer {key}"));
    }
    for (k, v) in &cfg.headers {
        req = req.header(k.as_str(), v.as_str());
    }
    req.json(body).send().await.map_err(|e| format!("request failed: {e}"))
}

pub async fn stream_turn<F: FnMut(Delta)>(
    cfg: &ProviderConfig,
    messages: &[Message],
    tools: &[ToolDefinition],
    mut on_delta: F,
) -> Result<Turn, String> {
    let mut res = post(cfg, &build_body(cfg, messages, tools, true)).await?;

    // Older Ollama and LM Studio builds reject the unknown `stream_options`
    // field with a 400. Token counts are worth having but never worth
    // failing a turn over, so drop the field and try once more — exactly
    // once, so a server that 400s for a real reason still surfaces it.
    if res.status() == reqwest::StatusCode::BAD_REQUEST {
        res = post(cfg, &build_body(cfg, messages, tools, false)).await?;
    }

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("HTTP {status}: {}", super::truncate(&text, 400)));
    }

    // Tool-call arguments arrive as fragments keyed by `index` and must be
    // concatenated across chunks before the call is complete.
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
            if data == "[DONE]" {
                // Labelled: a plain break only leaves the line loop and
                // would leave us waiting on a socket with nothing to say.
                break 'outer;
            }
            let Ok(parsed) = serde_json::from_str::<Chunk>(data) else { continue };
            state.apply(parsed, &mut on_delta);
        }
    }

    Ok(state.finish())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ProviderKind;

    fn consume(chunks: &[&str]) -> Turn {
        let mut state = StreamState::default();
        let mut sink = |_: Delta| {};
        for raw in chunks {
            let chunk = serde_json::from_str::<Chunk>(raw).expect("test fixture must parse");
            state.apply(chunk, &mut sink);
        }
        state.finish()
    }

    fn test_cfg() -> ProviderConfig {
        ProviderConfig {
            id: "t".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("http://localhost:11434/v1".into()),
            api_key: None,
            api_key_env: None,
            model: "m".into(),
            priority: 1,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        }
    }

    #[test]
    fn usage_is_requested_and_can_be_dropped_for_servers_that_reject_it() {
        // Some Ollama / LM Studio builds 400 on the unknown field, so the
        // retry body must be byte-for-byte the original minus that field.
        let cfg = test_cfg();
        let with = build_body(&cfg, &[Message::user("hi")], &[], true);
        assert_eq!(with["stream_options"]["include_usage"], true);

        let without = build_body(&cfg, &[Message::user("hi")], &[], false);
        assert!(without.get("stream_options").is_none());
        assert_eq!(without["messages"], with["messages"], "only the usage field differs");
    }

    #[test]
    fn usage_arrives_in_a_final_chunk_that_has_no_choices() {
        // Regression: reading `choices[0].delta` first and bailing when it
        // is missing skips the usage chunk entirely — the field would be
        // requested from the server and then silently thrown away.
        let turn = consume(&[
            r#"{"choices":[{"delta":{"content":"hello"}}]}"#,
            r#"{"choices":[],"usage":{"prompt_tokens":812,"completion_tokens":97,"total_tokens":909}}"#,
        ]);
        assert_eq!(turn.text, "hello");
        let usage = turn.usage.expect("usage must survive the empty-choices chunk");
        assert_eq!(usage.input_tokens, 812);
        assert_eq!(usage.output_tokens, 97);
    }

    #[test]
    fn a_server_that_never_reports_usage_yields_none() {
        let turn = consume(&[r#"{"choices":[{"delta":{"content":"hi"}}]}"#]);
        assert!(turn.usage.is_none(), "unreported must not look like zero");
    }

    #[test]
    fn tool_arguments_are_concatenated_across_chunks() {
        let turn = consume(&[
            r#"{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"read_file","arguments":"{\"pa"}}]}}]}"#,
            r#"{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"th\":\"a.txt\"}"}}]}}]}"#,
        ]);
        assert_eq!(turn.tool_calls.len(), 1);
        assert_eq!(turn.tool_calls[0].id, "c1");
        assert_eq!(turn.tool_calls[0].name, "read_file");
        assert_eq!(turn.tool_calls[0].arguments, r#"{"path":"a.txt"}"#);
    }

    #[test]
    fn tool_result_uses_the_tool_role() {
        let msgs = vec![Message::tool_result("call_1", "42")];
        let arr = to_openai_messages(&msgs);
        assert_eq!(arr[0]["role"], "tool");
        assert_eq!(arr[0]["tool_call_id"], "call_1");
        assert_eq!(arr[0]["content"], "42");
    }

    #[test]
    fn assistant_tool_calls_use_the_function_envelope() {
        let msgs = vec![Message::assistant(
            "",
            vec![ToolCall { id: "c1".into(), name: "list_dir".into(), arguments: r#"{"path":"."}"#.into() }],
        )];
        let arr = to_openai_messages(&msgs);
        assert_eq!(arr[0]["tool_calls"][0]["type"], "function");
        assert_eq!(arr[0]["tool_calls"][0]["function"]["name"], "list_dir");
    }

    #[test]
    fn system_message_stays_in_the_array() {
        let msgs = vec![Message {
            role: Role::System,
            content: "be brief".into(),
            tool_calls: vec![],
            tool_call_id: None,
        }];
        let arr = to_openai_messages(&msgs);
        assert_eq!(arr.len(), 1);
        assert_eq!(arr[0]["role"], "system");
    }
}
