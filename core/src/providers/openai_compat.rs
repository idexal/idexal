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

use super::types::{Delta, Message, Role, ToolCall, ToolDefinition, Turn};
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

#[derive(Deserialize, Debug, Default)]
struct Chunk {
    choices: Option<Vec<Choice>>,
}

pub async fn stream_turn<F: FnMut(Delta)>(
    cfg: &ProviderConfig,
    messages: &[Message],
    tools: &[ToolDefinition],
    mut on_delta: F,
) -> Result<Turn, String> {
    let mut body = json!({
        "model": cfg.model,
        "stream": true,
        "messages": to_openai_messages(messages),
    });
    if !tools.is_empty() {
        body["tools"] = json!(to_openai_tools(tools));
        body["tool_choice"] = json!("auto");
    }
    if let Some(obj) = body.as_object_mut() {
        for (k, v) in &cfg.extra_body {
            obj.insert(k.clone(), v.clone());
        }
    }

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

    let res = req.json(&body).send().await.map_err(|e| format!("request failed: {e}"))?;
    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("HTTP {status}: {}", super::truncate(&text, 400)));
    }

    let mut turn = Turn::default();
    // index -> (id, name, accumulated arguments)
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
            if data == "[DONE]" {
                break;
            }
            let Ok(parsed) = serde_json::from_str::<Chunk>(data) else { continue };
            let Some(delta) = parsed.choices.and_then(|c| c.into_iter().next()).and_then(|c| c.delta)
            else {
                continue;
            };
            if let Some(text) = delta.content {
                if !text.is_empty() {
                    turn.text.push_str(&text);
                    on_delta(Delta::Text(text));
                }
            }
            if let Some(calls) = delta.tool_calls {
                for tc in calls {
                    let entry = pending
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
    }

    let mut indices: Vec<usize> = pending.keys().copied().collect();
    indices.sort();
    for idx in indices {
        let (id, name, args) = pending.get(&idx).unwrap().clone();
        turn.tool_calls.push(ToolCall {
            id: if id.is_empty() { format!("call_{idx}") } else { id },
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
