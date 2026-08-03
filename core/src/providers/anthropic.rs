// Idexal Core — provider layer
//
// First real (non-placeholder) provider: Anthropic's Messages API, with SSE
// streaming. Ported from the design in
// reference/ai-core-node-reference/src/providers/anthropic.ts (protocol
// shape) and openaiCompat.ts (streaming-loop structure), rewritten for
// Rust/reqwest instead of fetch.
//
// Config resolution order: `ANTHROPIC_API_KEY` (the standard, documented
// variable end users set) first; `ANTHROPIC_AUTH_TOKEN` + optional
// `ANTHROPIC_BASE_URL` as a fallback for proxy/enterprise setups. No
// fallback chain across multiple providers yet — that's the next milestone
// once a second provider (OpenAI-compatible, for local Ollama/LM Studio) is
// ported too.

use futures_util::StreamExt;
use serde::Deserialize;
use std::env;

pub struct AnthropicConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

pub fn resolve_anthropic() -> Option<AnthropicConfig> {
    if let Ok(key) = env::var("ANTHROPIC_API_KEY") {
        return Some(AnthropicConfig {
            base_url: env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.anthropic.com".to_string()),
            api_key: key,
            model: "claude-sonnet-4-5-20250929".to_string(),
        });
    }
    if let Ok(key) = env::var("ANTHROPIC_AUTH_TOKEN") {
        return Some(AnthropicConfig {
            base_url: env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.anthropic.com".to_string()),
            api_key: key,
            model: "claude-sonnet-4-5-20250929".to_string(),
        });
    }
    None
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
enum SseEvent {
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { delta: ContentDelta },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(other)]
    Other,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
enum ContentDelta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },
    #[serde(other)]
    Other,
}

/// Stream one user-turn chat completion from Anthropic. Calls `on_text` for
/// each text delta as it arrives. Returns an error string on any failure
/// (network, non-2xx, or malformed stream) instead of panicking — the
/// caller (main.rs) turns that into an `error` NDJSON event.
pub async fn stream_chat<F: FnMut(&str)>(
    cfg: &AnthropicConfig,
    system_prompt: &str,
    user_message: &str,
    mut on_text: F,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": cfg.model,
        "max_tokens": 4096,
        "system": system_prompt,
        "stream": true,
        "messages": [
            { "role": "user", "content": user_message }
        ],
    });

    let res = client
        .post(format!("{}/v1/messages", cfg.base_url.trim_end_matches('/')))
        .header("x-api-key", &cfg.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic request failed: {e}"))?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Anthropic HTTP {status}: {}", truncate(&text, 500)));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream read error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        // SSE frames are separated by blank lines; each frame may contain
        // multiple `field: value` lines. We only care about `data:` lines.
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim_end_matches('\r').to_string();
            buffer.drain(..=pos);
            let Some(data) = line.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data.is_empty() {
                continue;
            }
            match serde_json::from_str::<SseEvent>(data) {
                Ok(SseEvent::ContentBlockDelta { delta: ContentDelta::TextDelta { text } }) => {
                    on_text(&text);
                }
                Ok(SseEvent::MessageStop) => return Ok(()),
                _ => {}
            }
        }
    }
    Ok(())
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max])
    }
}
