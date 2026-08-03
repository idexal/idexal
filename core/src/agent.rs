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

/// Callbacks are `+ Send` so an agent future can be spawned onto the tokio
/// runtime — that is what lets the orchestrator run executors in parallel.
pub struct AgentEvents<'a> {
    pub on_provider: &'a mut (dyn FnMut(&str) + Send),
    pub on_text: &'a mut (dyn FnMut(&str) + Send),
    pub on_tool_call: &'a mut (dyn FnMut(&str, &str) + Send),
    pub on_tool_result: &'a mut (dyn FnMut(&str, bool, &str) + Send),
}

pub struct AgentOutcome {
    pub text: String,
    pub provider_id: String,
    pub tool_rounds: u32,
    /// Everything this run added to the conversation (the user turn, the
    /// assistant's replies, its tool calls and their results) so a caller
    /// can persist it and a follow-up continues where this left off.
    pub new_messages: Vec<Message>,
}

/// How deep delegation may nest. An agent may delegate, and its subagent
/// may delegate once more; beyond that the tool refuses. Without a bound a
/// model that likes delegating can recurse until it exhausts the budget or
/// the stack.
pub const MAX_DELEGATION_DEPTH: u32 = 2;

const SUBAGENT_PROMPT: &str = "\
You are a SUBAGENT. You were given one self-contained sub-task by another
agent. Do exactly that sub-task using your tools, then reply with a short
factual summary of what you found or changed — that summary is all the
calling agent will see, so include the specifics it needs (paths, names,
line numbers), not pleasantries.";

/// Run one agent to completion.
pub async fn run(
    registry: &mut Registry,
    cfg: &Config,
    cwd: &Path,
    system_prompt: &str,
    task: &str,
    tool_defs: &[ToolDefinition],
    memory_context: Option<String>,
    events: &mut AgentEvents<'_>,
) -> Result<AgentOutcome, Vec<String>> {
    run_with_history(registry, cfg, cwd, system_prompt, task, tool_defs, memory_context, &[], events).await
}

/// Run an agent that continues an existing conversation. `history` is
/// replayed before the new turn, which is what makes a follow-up a
/// conversation rather than a fresh agent with amnesia.
#[allow(clippy::too_many_arguments)]
pub async fn run_with_history(
    registry: &mut Registry,
    cfg: &Config,
    cwd: &Path,
    system_prompt: &str,
    task: &str,
    tool_defs: &[ToolDefinition],
    memory_context: Option<String>,
    history: &[Message],
    events: &mut AgentEvents<'_>,
) -> Result<AgentOutcome, Vec<String>> {
    run_at_depth(registry, cfg, cwd, system_prompt, task, tool_defs, memory_context, history, events, 0).await
}

/// The real loop. `depth` is 0 for a top-level agent and increments with
/// each delegation, so recursion is bounded.
#[allow(clippy::too_many_arguments)]
pub fn run_at_depth<'a>(
    registry: &'a mut Registry,
    cfg: &'a Config,
    cwd: &'a Path,
    system_prompt: &'a str,
    task: &'a str,
    tool_defs: &'a [ToolDefinition],
    memory_context: Option<String>,
    history: &'a [Message],
    events: &'a mut AgentEvents<'_>,
    depth: u32,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<AgentOutcome, Vec<String>>> + Send + 'a>> {
    // Boxed because this future is recursive: a plain `async fn` that awaits
    // itself has infinitely-sized state and will not compile.
    Box::pin(run_inner(registry, cfg, cwd, system_prompt, task, tool_defs, memory_context, history, events, depth))
}

#[allow(clippy::too_many_arguments)]
async fn run_inner(
    registry: &mut Registry,
    cfg: &Config,
    cwd: &Path,
    system_prompt: &str,
    task: &str,
    tool_defs: &[ToolDefinition],
    memory_context: Option<String>,
    history: &[Message],
    events: &mut AgentEvents<'_>,
    depth: u32,
) -> Result<AgentOutcome, Vec<String>> {
    // Recalled memory is injected into the system prompt, not the user
    // turn, so it can't be mistaken for the user's request.
    //
    // The caller passes an already-rendered context block rather than the
    // store itself: a rusqlite Connection is !Sync, so holding one across
    // an await would make this future non-Send and rule out running
    // executors in parallel.
    let system = match memory_context {
        Some(block) if !block.trim().is_empty() => format!("{system_prompt}\n\n{block}"),
        _ => system_prompt.to_string(),
    };

    let mut messages = assemble(&system, history, task);
    // Everything this run adds, for the caller to persist.
    let mut new_messages = vec![Message::user(task)];

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
            new_messages.push(Message::assistant(turn.text.clone(), vec![]));
            return Ok(AgentOutcome { text: turn.text, provider_id, tool_rounds: rounds, new_messages });
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
            new_messages.push(Message::assistant(text.clone(), vec![]));
            return Ok(AgentOutcome { text, provider_id, tool_rounds: rounds, new_messages });
        }

        let assistant_turn = Message::assistant(turn.text.clone(), turn.tool_calls.clone());
        messages.push(assistant_turn.clone());
        new_messages.push(assistant_turn);

        for call in &turn.tool_calls {
            (events.on_tool_call)(&call.name, &call.arguments);

            // Delegation re-enters this loop, so it cannot go through the
            // synchronous tool dispatcher — it is handled here instead.
            let result = if call.name == tools::DELEGATE {
                delegate(registry, cfg, cwd, tool_defs, events, depth, &call.arguments).await
            } else {
                tools::dispatch(cwd, &call.name, &call.arguments)
            };

            (events.on_tool_result)(&call.name, result.ok, &result.output);
            let payload = if result.ok {
                result.output
            } else {
                format!("ERROR: {}", result.output)
            };
            let tool_msg = Message::tool_result(&call.id, payload);
            messages.push(tool_msg.clone());
            new_messages.push(tool_msg);
        }
    }
}

/// Build the message list for one turn: current system prompt, then the
/// replayed conversation, then the new user turn.
///
/// Split out so the ordering guarantee is testable without a live
/// provider — this is what makes a follow-up a continuation rather than a
/// fresh agent, so it is worth pinning.
fn assemble(system: &str, history: &[Message], task: &str) -> Vec<Message> {
    let mut messages =
        vec![Message { role: Role::System, content: system.to_string(), tool_calls: vec![], tool_call_id: None }];
    // Stored history never contains a system message (session.rs drops
    // them on write), so the current prompt always wins.
    messages.extend(history.iter().cloned());
    messages.push(Message::user(task));
    messages
}

/// Run a subagent for a `delegate` tool call and return its summary as the
/// tool result. Errors are returned as failed tool results rather than
/// aborting the parent: a subagent that fails is information the parent can
/// act on, not a reason to kill the whole task.
#[allow(clippy::too_many_arguments)]
async fn delegate(
    registry: &mut Registry,
    cfg: &Config,
    cwd: &Path,
    tool_defs: &[ToolDefinition],
    events: &mut AgentEvents<'_>,
    depth: u32,
    arguments: &str,
) -> tools::ToolResult {
    if depth >= MAX_DELEGATION_DEPTH {
        return tools::ToolResult {
            ok: false,
            output: format!(
                "delegation depth limit ({MAX_DELEGATION_DEPTH}) reached — do this sub-task yourself"
            ),
        };
    }

    let args: serde_json::Value = serde_json::from_str(arguments).unwrap_or(serde_json::Value::Null);
    let sub_task = args.get("task").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    if sub_task.is_empty() {
        return tools::ToolResult { ok: false, output: "delegate requires a non-empty 'task'".into() };
    }
    let context = args.get("context").and_then(|v| v.as_str()).unwrap_or("").trim();
    let full_task = if context.is_empty() {
        sub_task
    } else {
        format!("{sub_task}\n\nContext from the calling agent:\n{context}")
    };

    // The subagent inherits the caller's toolset, so a read-only session
    // stays read-only all the way down — delegation can never widen
    // permissions.
    // A subagent starts with no history: it is given one self-contained
    // sub-task, and replaying the parent's whole conversation would both
    // bloat the context and blur the boundary of what it was asked to do.
    match run_at_depth(
        registry,
        cfg,
        cwd,
        SUBAGENT_PROMPT,
        &full_task,
        tool_defs,
        None,
        &[],
        events,
        depth + 1,
    )
    .await
    {
        Ok(outcome) => tools::ToolResult {
            ok: true,
            output: if outcome.text.trim().is_empty() {
                "subagent finished without a summary".into()
            } else {
                outcome.text
            },
        },
        Err(errors) => tools::ToolResult { ok: false, output: format!("subagent failed: {}", errors.join("; ")) },
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
    fn a_follow_up_replays_the_conversation_between_system_and_new_turn() {
        // The whole point of sessions: the model must see what it already
        // did. Order matters — system first (so the current prompt wins),
        // then history, then the new question last.
        let history = vec![
            Message::user("read main.rs"),
            Message::assistant(
                "reading",
                vec![ToolCall { id: "c1".into(), name: "read_file".into(), arguments: "{}".into() }],
            ),
            Message::tool_result("c1", "fn main() {}"),
            Message::assistant("it's an empty main", vec![]),
        ];
        let messages = assemble("SYSTEM", &history, "now add a log line");

        assert_eq!(messages.len(), 6);
        assert_eq!(messages[0].role, Role::System);
        assert_eq!(messages[0].content, "SYSTEM");
        assert_eq!(messages[1].content, "read main.rs");
        // The earlier tool call and its result must survive, or the model
        // cannot reason about work it already performed.
        assert_eq!(messages[2].tool_calls.len(), 1);
        assert_eq!(messages[3].tool_call_id.as_deref(), Some("c1"));
        assert_eq!(messages.last().unwrap().role, Role::User);
        assert_eq!(messages.last().unwrap().content, "now add a log line");
    }

    #[test]
    fn a_first_turn_has_no_history_to_replay() {
        let messages = assemble("SYSTEM", &[], "hello");
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, Role::System);
        assert_eq!(messages[1].content, "hello");
    }

    #[test]
    fn delegate_is_advertised_but_never_dispatched_directly() {
        // The tool must be offered to the model, yet the synchronous
        // dispatcher must refuse it — delegation re-enters the async loop
        // and is intercepted in run_inner. If this ever silently succeeded
        // through dispatch, subagents would not actually run.
        let names: Vec<String> = tools::definitions().into_iter().map(|d| d.name).collect();
        assert!(names.contains(&tools::DELEGATE.to_string()), "delegate must be advertised");

        let dir = std::env::temp_dir();
        let result = tools::dispatch(&dir, tools::DELEGATE, r#"{"task":"x"}"#);
        assert!(!result.ok);
        assert!(result.output.contains("agent loop"), "got: {}", result.output);
    }

    #[test]
    fn delegate_is_not_offered_in_read_only_mode() {
        // A review must not be able to spawn a subagent that could widen
        // what the session is allowed to do.
        let names: Vec<String> = tools::read_only_definitions().into_iter().map(|d| d.name).collect();
        assert!(!names.contains(&tools::DELEGATE.to_string()));
    }

    #[tokio::test]
    async fn delegation_refuses_beyond_the_depth_limit() {
        // At the limit the tool must refuse with a message the model can
        // act on, rather than recursing until the budget or stack is gone.
        let cfg = Config::default();
        let mut registry = Registry::from_config(&cfg);
        let mut noop_p = |_: &str| {};
        let mut noop_t = |_: &str| {};
        let mut noop_c = |_: &str, _: &str| {};
        let mut noop_r = |_: &str, _: bool, _: &str| {};
        let mut events = AgentEvents {
            on_provider: &mut noop_p,
            on_text: &mut noop_t,
            on_tool_call: &mut noop_c,
            on_tool_result: &mut noop_r,
        };
        let result = delegate(
            &mut registry,
            &cfg,
            std::path::Path::new("."),
            &[],
            &mut events,
            MAX_DELEGATION_DEPTH,
            r#"{"task":"anything"}"#,
        )
        .await;
        assert!(!result.ok);
        assert!(result.output.contains("depth limit"), "got: {}", result.output);
    }

    #[tokio::test]
    async fn delegation_rejects_an_empty_task() {
        let cfg = Config::default();
        let mut registry = Registry::from_config(&cfg);
        let mut noop_p = |_: &str| {};
        let mut noop_t = |_: &str| {};
        let mut noop_c = |_: &str, _: &str| {};
        let mut noop_r = |_: &str, _: bool, _: &str| {};
        let mut events = AgentEvents {
            on_provider: &mut noop_p,
            on_text: &mut noop_t,
            on_tool_call: &mut noop_c,
            on_tool_result: &mut noop_r,
        };
        let result = delegate(
            &mut registry,
            &cfg,
            std::path::Path::new("."),
            &[],
            &mut events,
            0,
            r#"{"task":"   "}"#,
        )
        .await;
        assert!(!result.ok);
        assert!(result.output.contains("non-empty"));
    }

    #[test]
    fn assistant_message_preserves_tool_calls() {
        let calls = vec![ToolCall { id: "1".into(), name: "list_dir".into(), arguments: "{}".into() }];
        let msg = Message::assistant("thinking", calls.clone());
        assert_eq!(msg.tool_calls.len(), 1);
        assert_eq!(msg.tool_calls[0].name, "list_dir");
    }
}
