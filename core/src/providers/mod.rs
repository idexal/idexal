// Idexal Core — provider registry & fallback
//
// Mirrors the design in reference/ai-core-node-reference/src/providers/registry.ts:
// try providers in priority order, fall through to the next on failure.
// No cooldown/health-tracking yet (single-shot fallback per request) — that
// refinement comes once there are enough real providers configured to make
// it matter.

pub mod anthropic;
pub mod openai_compat;

/// Try each configured provider in order; the first one that streams at
/// least one text delta without erroring "wins". `on_provider` fires once
/// per attempt (so the UI can show "trying anthropic…", "trying
/// openai-compatible…"); `on_text` fires for each streamed delta from
/// whichever provider succeeds.
pub async fn stream_chat_with_fallback<FP: FnMut(&str), FT: FnMut(&str)>(
    system_prompt: &str,
    user_message: &str,
    mut on_provider: FP,
    mut on_text: FT,
) -> Result<String, Vec<String>> {
    let mut errors = Vec::new();

    if let Some(cfg) = anthropic::resolve_anthropic() {
        on_provider("anthropic");
        match anthropic::stream_chat(&cfg, system_prompt, user_message, &mut on_text).await {
            Ok(()) => return Ok("anthropic".to_string()),
            Err(err) => errors.push(format!("anthropic: {err}")),
        }
    }

    let openai_cfg = openai_compat::resolve_openai_compat();
    on_provider("openai-compatible");
    match openai_compat::stream_chat(&openai_cfg, system_prompt, user_message, &mut on_text).await {
        Ok(()) => Ok("openai-compatible".to_string()),
        Err(err) => {
            errors.push(format!("openai-compatible ({}): {err}", openai_cfg.base_url));
            Err(errors)
        }
    }
}
