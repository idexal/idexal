// Idexal Core — multi-agent orchestration
//
// planner → executors (genuinely parallel) → reviewer.
//
// The previous Node implementation exposed a `maxParallelAgents` knob that
// the orchestrator never read — every step ran sequentially. Here the knob
// is real: steps the planner marks as independent run concurrently, bounded
// by that value.
//
// Concurrency note: each parallel executor builds its own Registry from the
// shared Config, because a Registry owns a SQLite handle that cannot cross
// into a spawned task. Sharing one Registry behind a Mutex would serialize
// every provider call and defeat the point.
//
// Provider *health* is shared, though — it is knowledge about the outside
// world, not per-agent state. It used to be private to each Registry, so a
// dead provider was rediscovered by every agent: one measured run against a
// real gateway attempted a broken provider seven times, once per agent,
// each paying the full round trip.

use crate::config::Config;
use crate::memory::Memory;
use crate::providers::{new_shared_health, Pin, Registry, SharedHealth};
use crate::usage::Usage;
use crate::{agent, tools};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::sync::mpsc;

/// Recall relevant memory and render it as a prompt block, opening and
/// closing the store synchronously.
///
/// A rusqlite `Connection` is !Sync, so a live handle can't be held across
/// an await without making the future non-Send — which would rule out
/// running executors in parallel. Recalling up front and passing plain
/// text sidesteps that entirely.
fn recall_block(path: &Option<PathBuf>, query: &str, project: Option<&str>) -> Option<String> {
    let path = path.clone()?;
    let store = Memory::open(Some(path)).ok()?;
    store.context_block(query, project, 5)
}

/// Build one agent's registry: the shared provider config, narrowed by the
/// run's pin, with a usage ledger attached.
///
/// Every agent in the pipeline gets its own of both for the same reason: a
/// rusqlite `Connection` is !Sync and cannot cross into a spawned executor.
/// They all write to the same file under one `task_id`, so a multi-agent
/// run adds up to a single line of spend instead of scattering across the
/// planner, each executor and the reviewer.
///
/// The ledger is best-effort, like memory: one that will not open costs
/// statistics, never a run. The **pin is not** — if it cannot be honoured
/// the agent must not run, because running on a provider the user did not
/// ask for is a worse outcome than not running at all.
fn agent_registry(
    cfg: &Config,
    task_id: &Option<String>,
    pin: &Pin,
    health: &SharedHealth,
) -> Result<Registry, String> {
    let registry = Registry::from_config(cfg).pinned(pin)?.with_shared_health(health.clone());
    Ok(match Usage::open(None) {
        Ok(u) => registry.with_usage(u, task_id.clone()),
        Err(e) => {
            eprintln!("[idexal] usage tracking unavailable: {e}");
            registry
        }
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStep {
    pub id: u32,
    pub description: String,
    /// Ids this step must wait for. Empty = can start immediately.
    #[serde(default)]
    pub depends_on: Vec<u32>,
}

/// Events emitted while orchestrating. Mapped 1:1 to NDJSON by main.rs.
#[derive(Debug, Clone)]
pub enum OrchestratorEvent {
    Phase(String),
    Plan(Vec<PlanStep>),
    StepStarted { id: u32, description: String },
    StepFinished { id: u32, ok: bool, summary: String },
    Provider(String),
    Text(String),
    ToolCall { step: u32, name: String, args: String },
    ToolResult { step: u32, name: String, ok: bool, output: String },
    Review(String),
}

const PLANNER_PROMPT: &str = "\
You are the PLANNER of a multi-agent coding system.
Break the user's task into the smallest set of concrete, independently
verifiable steps. Prefer FEWER steps: use one step when the task is simple.

Reply with ONLY a JSON array, no prose, no markdown fences:
[{\"id\":1,\"description\":\"...\",\"depends_on\":[]}]

`depends_on` lists step ids that must finish first. Steps with no shared
dependency will be executed IN PARALLEL, so never make two steps that edit
the same file independent of each other.";

const EXECUTOR_PROMPT: &str = "\
You are an EXECUTOR agent in a multi-agent coding system.
Do exactly the step you are given — nothing more.

Use search_files/find_files to locate code, read_file before changing it,
and edit_file (exact-string replace, unique match) rather than rewriting
whole files with write_file. Verify your change afterwards.

run_command is a real shell on the user's machine: builds, tests, package
managers, git, scripts and launching applications are all things you can
actually do. Start anything that does not exit on its own — a GUI app, a
server, a watcher — with \"background\": true.

Other executors may be working in parallel on other files: stay inside
your step's scope. Reply with a short summary of what you actually did.
Answer in the user's language.";

const REVIEWER_PROMPT: &str = "\
You are the REVIEWER of a multi-agent coding system.
Inspect what the executors produced. You have read-only tools. Report:
whether the task is complete, any real problems you found (with file:line),
and concrete fixes. Be brief and specific. Answer in the user's language.";

/// Pull a JSON array out of a model reply that may be wrapped in prose or
/// markdown fences. Falls back to treating each non-empty line as a step,
/// so a planner that ignores the format still produces a usable plan
/// instead of failing the whole run.
fn parse_plan(text: &str) -> Vec<PlanStep> {
    let cleaned = text.trim();
    if let (Some(start), Some(end)) = (cleaned.find('['), cleaned.rfind(']')) {
        if end > start {
            if let Ok(steps) = serde_json::from_str::<Vec<PlanStep>>(&cleaned[start..=end]) {
                if !steps.is_empty() {
                    return steps;
                }
            }
        }
    }

    cleaned
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with("```"))
        .enumerate()
        .map(|(i, line)| PlanStep {
            id: i as u32 + 1,
            // Strip common list markers so the description reads cleanly.
            description: line
                .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == '-' || c == '*' || c == ' ')
                .to_string(),
            depends_on: Vec::new(),
        })
        .collect()
}

/// Group steps into execution waves: every step in a wave has all of its
/// dependencies satisfied by earlier waves, so a wave can run in parallel.
/// Steps in a dependency cycle (or depending on a nonexistent id) are
/// placed in a final wave rather than silently dropped.
fn schedule(steps: &[PlanStep], max_parallel: usize) -> Vec<Vec<PlanStep>> {
    let mut waves: Vec<Vec<PlanStep>> = Vec::new();
    let mut done: Vec<u32> = Vec::new();
    let mut remaining: Vec<PlanStep> = steps.to_vec();

    while !remaining.is_empty() {
        let (ready, blocked): (Vec<PlanStep>, Vec<PlanStep>) = remaining
            .iter()
            .cloned()
            .partition(|s| s.depends_on.iter().all(|d| done.contains(d)));

        if ready.is_empty() {
            // Unsatisfiable dependencies: run what's left sequentially
            // rather than deadlocking or dropping work.
            for step in blocked {
                waves.push(vec![step]);
            }
            break;
        }

        for chunk in ready.chunks(max_parallel.max(1)) {
            waves.push(chunk.to_vec());
        }
        done.extend(ready.iter().map(|s| s.id));
        remaining = blocked;
    }

    waves
}

pub struct OrchestratorOutcome {
    pub summary: String,
    pub steps_run: usize,
    pub provider_id: String,
}

/// Run the full planner → executors → reviewer pipeline.
pub async fn run(
    cfg: &Config,
    cwd: PathBuf,
    task: &str,
    memory_path: Option<PathBuf>,
    task_id: Option<String>,
    pin: Pin,
    tx: mpsc::UnboundedSender<OrchestratorEvent>,
) -> Result<OrchestratorOutcome, Vec<String>> {
    // ---- Phase 1: plan ----
    let _ = tx.send(OrchestratorEvent::Phase("planning".into()));
    // One health map for the whole run: a provider that is down is a fact
    // about the world, not about the agent that happened to discover it.
    let health = new_shared_health();
    let mut registry = agent_registry(cfg, &task_id, &pin, &health).map_err(|e| vec![e])?;
    let project = crate::memory::project_for(&cwd);
    let plan_memory = recall_block(&memory_path, task, project.as_deref());

    let plan_text = {
        let tx_p = tx.clone();
        let tx_t = tx.clone();
        let mut on_provider = move |p: &str| {
            let _ = tx_p.send(OrchestratorEvent::Provider(p.to_string()));
        };
        let mut on_text = move |t: &str| {
            let _ = tx_t.send(OrchestratorEvent::Text(t.to_string()));
        };
        let mut noop_call = |_: &str, _: &str| {};
        let mut noop_result = |_: &str, _: bool, _: &str| {};
        let mut events = agent::AgentEvents {
            on_provider: &mut on_provider,
            on_text: &mut on_text,
            on_tool_call: &mut noop_call,
            on_tool_result: &mut noop_result,
        };
        // The planner gets no tools: planning is reasoning, and giving it
        // file access invites it to start doing the work itself.
        agent::run(&mut registry, cfg, &cwd, PLANNER_PROMPT, task, &[], plan_memory, &mut events)
            .await?
    };

    let steps = parse_plan(&plan_text.text);
    if steps.is_empty() {
        return Err(vec!["planner produced no usable steps".into()]);
    }
    let _ = tx.send(OrchestratorEvent::Plan(steps.clone()));

    // ---- Phase 2: execute ----
    let _ = tx.send(OrchestratorEvent::Phase("executing".into()));
    let waves = schedule(&steps, cfg.agent.max_parallel_agents);
    let total_steps = steps.len();
    let mut results: Vec<(u32, bool, String)> = Vec::new();

    for wave in waves {
        let mut handles = Vec::new();
        for step in wave {
            let cfg = cfg.clone();
            let cwd = cwd.clone();
            let tx = tx.clone();
            let task_ctx = task.to_string();
            let task_id = task_id.clone();
            let pin = pin.clone();
            let health = health.clone();
            // Recall happens here, on the parent task, so no SQLite handle
            // is alive inside the spawned (Send-required) future.
            let step_memory = recall_block(&memory_path, &step.description, project.as_deref());

            handles.push(tokio::spawn(async move {
                let _ = tx.send(OrchestratorEvent::StepStarted {
                    id: step.id,
                    description: step.description.clone(),
                });

                let mut registry = match agent_registry(&cfg, &task_id, &pin, &health) {
                    Ok(r) => r,
                    Err(e) => {
                        let _ = tx.send(OrchestratorEvent::StepFinished {
                            id: step.id,
                            ok: false,
                            summary: e.clone(),
                        });
                        return (step.id, false, e);
                    }
                };
                let step_id = step.id;

                let tx_p = tx.clone();
                let tx_t = tx.clone();
                let tx_c = tx.clone();
                let tx_r = tx.clone();
                let mut on_provider = move |p: &str| {
                    let _ = tx_p.send(OrchestratorEvent::Provider(p.to_string()));
                };
                let mut on_text = move |t: &str| {
                    let _ = tx_t.send(OrchestratorEvent::Text(t.to_string()));
                };
                let mut on_tool_call = move |name: &str, args: &str| {
                    let _ = tx_c.send(OrchestratorEvent::ToolCall {
                        step: step_id,
                        name: name.to_string(),
                        args: args.to_string(),
                    });
                };
                let mut on_tool_result = move |name: &str, ok: bool, output: &str| {
                    let _ = tx_r.send(OrchestratorEvent::ToolResult {
                        step: step_id,
                        name: name.to_string(),
                        ok,
                        output: output.to_string(),
                    });
                };
                let mut events = agent::AgentEvents {
                    on_provider: &mut on_provider,
                    on_text: &mut on_text,
                    on_tool_call: &mut on_tool_call,
                    on_tool_result: &mut on_tool_result,
                };

                let step_task = format!(
                    "Overall task: {task_ctx}\n\nYour step ({} of {}): {}",
                    step.id, total_steps, step.description
                );
                let executor_system = format!("{EXECUTOR_PROMPT}{}", tools::platform_note(&cwd));
                let outcome = agent::run(
                    &mut registry,
                    &cfg,
                    &cwd,
                    &executor_system,
                    &step_task,
                    &tools::definitions(),
                    step_memory,
                    &mut events,
                )
                .await;

                match outcome {
                    Ok(o) => {
                        let _ = tx.send(OrchestratorEvent::StepFinished {
                            id: step.id,
                            ok: true,
                            summary: o.text.chars().take(200).collect(),
                        });
                        (step.id, true, o.text)
                    }
                    Err(errors) => {
                        let msg = errors.join("; ");
                        let _ = tx.send(OrchestratorEvent::StepFinished {
                            id: step.id,
                            ok: false,
                            summary: msg.clone(),
                        });
                        (step.id, false, msg)
                    }
                }
            }));
        }

        for handle in handles {
            match handle.await {
                Ok(r) => results.push(r),
                Err(e) => results.push((0, false, format!("executor task panicked: {e}"))),
            }
        }
    }

    let steps_run = results.len();
    let any_failed = results.iter().any(|(_, ok, _)| !ok);

    // ---- Phase 3: review ----
    let mut review_text = String::new();
    if cfg.agent.use_reviewer {
        let _ = tx.send(OrchestratorEvent::Phase("reviewing".into()));
        let transcript = results
            .iter()
            .map(|(id, ok, text)| format!("Step {id} [{}]: {}", if *ok { "ok" } else { "failed" }, text))
            .collect::<Vec<_>>()
            .join("\n\n");
        let review_task = format!("Original task: {task}\n\nWhat the executors reported:\n{transcript}");

        // One health map for the whole run: a provider that is down is a fact
    // about the world, not about the agent that happened to discover it.
    let health = new_shared_health();
    let mut registry = agent_registry(cfg, &task_id, &pin, &health).map_err(|e| vec![e])?;
        let review_memory = recall_block(&memory_path, task, project.as_deref());
        let tx_p = tx.clone();
        let tx_t = tx.clone();
        let mut on_provider = move |p: &str| {
            let _ = tx_p.send(OrchestratorEvent::Provider(p.to_string()));
        };
        let mut on_text = move |t: &str| {
            let _ = tx_t.send(OrchestratorEvent::Text(t.to_string()));
        };
        let mut noop_call = |_: &str, _: &str| {};
        let mut noop_result = |_: &str, _: bool, _: &str| {};
        let mut events = agent::AgentEvents {
            on_provider: &mut on_provider,
            on_text: &mut on_text,
            on_tool_call: &mut noop_call,
            on_tool_result: &mut noop_result,
        };

        // The reviewer gets read-only tools: it must be able to check the
        // work on disk, but never to change it.
        if let Ok(o) = agent::run(
            &mut registry,
            cfg,
            &cwd,
            REVIEWER_PROMPT,
            &review_task,
            &tools::read_only_definitions(),
            review_memory,
            &mut events,
        )
        .await
        {
            review_text = o.text;
            let _ = tx.send(OrchestratorEvent::Review(review_text.clone()));
        }
    }

    let summary = if !review_text.is_empty() {
        review_text
    } else {
        results
            .iter()
            .map(|(id, _, t)| format!("[{id}] {t}"))
            .collect::<Vec<_>>()
            .join("\n")
    };

    Ok(OrchestratorOutcome {
        summary: if any_failed {
            format!("{summary}\n\n(بعض الخطوات فشلت)")
        } else {
            summary
        },
        steps_run,
        provider_id: plan_text.provider_id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_clean_json_plan() {
        let text = r#"[{"id":1,"description":"read the file","depends_on":[]},
                       {"id":2,"description":"edit it","depends_on":[1]}]"#;
        let steps = parse_plan(text);
        assert_eq!(steps.len(), 2);
        assert_eq!(steps[1].depends_on, vec![1]);
    }

    #[test]
    fn parses_a_plan_wrapped_in_prose_and_fences() {
        // Models routinely ignore "no markdown" instructions.
        let text = "Sure! Here's the plan:\n```json\n[{\"id\":1,\"description\":\"do it\"}]\n```\nHope that helps.";
        let steps = parse_plan(text);
        assert_eq!(steps.len(), 1);
        assert_eq!(steps[0].description, "do it");
    }

    #[test]
    fn falls_back_to_lines_when_json_is_absent() {
        let text = "1. inspect the config\n2. update the parser";
        let steps = parse_plan(text);
        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].description, "inspect the config");
        assert_eq!(steps[1].id, 2);
    }

    #[test]
    fn independent_steps_share_a_wave_and_respect_the_parallel_cap() {
        let steps = vec![
            PlanStep { id: 1, description: "a".into(), depends_on: vec![] },
            PlanStep { id: 2, description: "b".into(), depends_on: vec![] },
            PlanStep { id: 3, description: "c".into(), depends_on: vec![] },
        ];
        let waves = schedule(&steps, 2);
        assert_eq!(waves.len(), 2, "3 independent steps at cap 2 → two waves");
        assert_eq!(waves[0].len(), 2);
        assert_eq!(waves[1].len(), 1);
    }

    #[test]
    fn dependent_steps_are_serialized_into_later_waves() {
        let steps = vec![
            PlanStep { id: 1, description: "a".into(), depends_on: vec![] },
            PlanStep { id: 2, description: "b".into(), depends_on: vec![1] },
            PlanStep { id: 3, description: "c".into(), depends_on: vec![2] },
        ];
        let waves = schedule(&steps, 4);
        assert_eq!(waves.len(), 3, "a chain cannot be parallelized");
        assert_eq!(waves[0][0].id, 1);
        assert_eq!(waves[2][0].id, 3);
    }

    #[test]
    fn dependency_cycles_do_not_deadlock_or_drop_steps() {
        // Two steps depending on each other: the scheduler must still run
        // them (sequentially) rather than looping forever or losing work.
        let steps = vec![
            PlanStep { id: 1, description: "a".into(), depends_on: vec![2] },
            PlanStep { id: 2, description: "b".into(), depends_on: vec![1] },
        ];
        let waves = schedule(&steps, 4);
        let total: usize = waves.iter().map(|w| w.len()).sum();
        assert_eq!(total, 2, "no step may be dropped");
    }

    #[test]
    fn dependency_on_a_nonexistent_step_still_runs() {
        let steps = vec![PlanStep { id: 1, description: "a".into(), depends_on: vec![99] }];
        let waves = schedule(&steps, 4);
        assert_eq!(waves.iter().map(|w| w.len()).sum::<usize>(), 1);
    }
}
