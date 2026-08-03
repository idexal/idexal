// Idexal Core — the agent loop
//
// One agent = a conversation with a model that can call tools. The loop:
//   1. send the conversation (+ tool definitions) to the provider chain
//   2. if the model returned tool calls → execute them, append the results,
//      go back to 1
//   3. otherwise the turn is final → return the text
//
// Ported from reference/ai-core-node-reference/src/chat.ts. Bounded by
// `max_tool_rounds` so a model that loops forever calling tools eventually
// stops (the reference's off-by-design "+5 turns" fudge is gone: the bound
// here is exactly what it says).

use crate::config::Config;
use crate::providers::types::{Delta, Message, Role, ToolDefinition};
use crate::providers::Registry;
use crate::tools;
use std::path::Path;

pub struct AgentEvents<'a> {
    pub on_provider: &'a mut dyn FnMut(&str),
    pub on_text: &'a mut dyn FnMut(&str),
    pub on_tool_call: &'a mut dyn FnMut(&str, &str),
    pub on_tool_result: &'a mut dyn FnMut(&str, bool, &str),
}

pub struct AgentOutcome {
    pub text: String,
    pub provider_id: String,
    pub tool_rounds: u32,
}

/// Run one agent to completion.
pub async fn run(
    registry: &mut Registry,
    cfg: &Config,
    cwd: &Path,
    system_prompt: &str,
    task: &str,
    tool_defs: &[ToolDefinition],
    events: &mut AgentEvents<'_>,
) -> Result<AgentOutcome, Vec<String>> {
    let mut messages = vec![
        Message { role: Role::System, content: system_prompt.into(), tool_calls: vec![], tool_call_id: None },
        Message::user(task),
    ];

    let mut rounds = 0u32;

    loop {
        let outcome = registry
            .stream_turn(
                &messages,
                tool_defs,
                |p| (events.on_provider)(p),
                |delta| {
                    let Delta::Text(t) = &delta;
                    (events.on_text)(t);
                },
            )
            .await?;

        let provider_id = outcome.provider_id;
        let turn = outcome.turn;

        if turn.tool_calls.is_empty() {
            return Ok(AgentOutcome { text: turn.text, provider_id, tool_rounds: rounds });
        }

        rounds += 1;
        if rounds > cfg.agent.max_tool_rounds {
            // Bound reached: return whatever text we have rather than
            // looping forever, and say so explicitly instead of pretending
            // the answer is complete.
            let text = if turn.text.is_empty() {
                format!("[توقف بعد {} جولات أدوات — الحد الأقصى المُعرَّف]", cfg.agent.max_tool_rounds)
            } else {
                turn.text
            };
            return Ok(AgentOutcome { text, provider_id, tool_rounds: rounds });
        }

        messages.push(Message::assistant(turn.text.clone(), turn.tool_calls.clone()));

        for call in &turn.tool_calls {
            (events.on_tool_call)(&call.name, &call.arguments);
            let result = tools::dispatch(cwd, &call.name, &call.arguments);
            (events.on_tool_result)(&call.name, result.ok, &result.output);
            let payload = if result.ok {
                result.output
            } else {
                format!("ERROR: {}", result.output)
            };
            messages.push(Message::tool_result(&call.id, payload));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::providers::types::ToolCall;

    #[test]
    fn tool_result_messages_carry_the_call_id() {
        let call = ToolCall { id: "abc".into(), name: "read_file".into(), arguments: "{}".into() };
        let msg = Message::tool_result(&call.id, "content");
        assert_eq!(msg.tool_call_id.as_deref(), Some("abc"));
        assert_eq!(msg.role, Role::User);
    }

    #[test]
    fn assistant_message_preserves_tool_calls() {
        let calls = vec![ToolCall { id: "1".into(), name: "list_dir".into(), arguments: "{}".into() }];
        let msg = Message::assistant("thinking", calls.clone());
        assert_eq!(msg.tool_calls.len(), 1);
        assert_eq!(msg.tool_calls[0].name, "list_dir");
    }
}
