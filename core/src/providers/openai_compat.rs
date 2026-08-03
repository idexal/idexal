// Idexal Core — OpenAI-compatible provider
//
// Works with any OpenAI-compatible endpoint: OpenAI, OpenRouter, Groq,
// DeepSeek, Ollama, LM Studio, vLLM. Ported from
// reference/ai-core-node-reference/src/providers/openaiCompat.ts.
//
// The default (no env vars at all) points at a local Ollama server, which
// needs no API key — this is the "works with zero setup, zero account"
// fallback the free/unrestricted design goal calls for.

use futures_util::StreamExt;
use serde::Deserialize;
use std::env;

pub struct OpenAiCompatConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
}

/// Resolution order: `OPENAI_API_KEY` (official OpenAI) → local Ollama
/// (`http://localhost:11434/v1`, no key, model `llama3.1`) as the
/// always-available, zero-account fallback.
pub fn resolve_openai_compat() -> OpenAiCompatConfig {
    if let Ok(key) = env::var("OPENAI_API_KEY") {
        return OpenAiCompatConfig {
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: Some(key),
            model: "gpt-4o-mini".to_string(),
        };
    }
    OpenAiCompatConfig {
        base_url: env::var("IDEXAL_OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434/v1".to_string()),
        api_key: None,
        model: env::var("IDEXAL_OLLAMA_MODEL").unwrap_or_else(|_| "llama3.1".to_string()),
    }
}

#[derive(Deserialize, Debug, Default)]
struct Delta {
    content: Option<String>,
}

#[derive(Deserialize, Debug, Default)]
struct Choice {
    delta: Option<Delta>,
}

#[derive(Deserialize, Debug, Default)]
struct ChunkResponse {
    choices: Option<Vec<Choice>>,
}

pub async fn stream_chat<F: FnMut(&str)>(
    cfg: &OpenAiCompatConfig,
    system_prompt: &str,
    user_message: &str,
    mut on_text: F,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": cfg.model,
        "stream": true,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_message }
        ],
    });

    let mut req = client
        .post(format!("{}/chat/completions", cfg.base_url.trim_end_matches('/')))
        .header("content-type", "application/json");
    if let Some(key) = &cfg.api_key {
        req = req.header("authorization", format!("Bearer {key}"));
    }

    let res = req
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("{} request failed: {e}", cfg.base_url))?;

    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("{} HTTP {status}: {}", cfg.base_url, truncate(&text, 500)));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream read error: {e}"))?;
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
                return Ok(());
            }
            if let Ok(parsed) = serde_json::from_str::<ChunkResponse>(data) {
                if let Some(text) = parsed
                    .choices
                    .and_then(|c| c.into_iter().next())
                    .and_then(|c| c.delta)
                    .and_then(|d| d.content)
                {
                    on_text(&text);
                }
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
