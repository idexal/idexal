// Idexal Core — agent engine (Rust)
//
// Standalone binary driving Idexal's agents. Speaks NDJSON on stdout so any
// front end (the Electron app, the CLI, an editor plugin) consumes the same
// contract:
//   {"type":"start","providers":["anthropic","ollama"]}
//   {"type":"provider","name":"anthropic"}
//   {"type":"delta","text":"..."}
//   {"type":"tool-call","name":"read_file","args":"{...}"}
//   {"type":"tool-result","name":"read_file","ok":true,"output":"..."}
//   {"type":"done","summary":"...","provider":"anthropic"}
//   {"type":"error","error":"..."}
//
// Commands:
//   idexal-core stream "<task>"     run an agent, stream NDJSON
//   idexal-core providers           list configured providers (JSON)
//   idexal-core --version

mod agent;
mod config;
mod memory;
mod orchestrator;
mod providers;
mod session;
mod tools;

use config::ProviderKind;
use providers::types::Message;
use providers::Registry;
use serde::Serialize;
use std::io::{self, Write};
use std::time::Instant;
use std::{env, process};

#[derive(Serialize)]
#[serde(tag = "type")]
enum Event<'a> {
    #[serde(rename = "start")]
    Start { providers: Vec<String> },
    #[serde(rename = "provider")]
    Provider { name: &'a str },
    #[serde(rename = "delta")]
    Delta { text: &'a str },
    #[serde(rename = "tool-call")]
    ToolCall {
        name: &'a str,
        args: &'a str,
        /// Which plan step issued this call; absent in single-agent runs.
        #[serde(skip_serializing_if = "Option::is_none")]
        step: Option<u32>,
    },
    #[serde(rename = "tool-result")]
    ToolResult {
        name: &'a str,
        ok: bool,
        output: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        step: Option<u32>,
    },
    #[serde(rename = "done")]
    Done { summary: String, provider: String, tool_rounds: u32 },
    #[serde(rename = "error")]
    Error { error: String },

    // Multi-agent orchestration events.
    #[serde(rename = "phase")]
    Phase { phase: &'a str },
    #[serde(rename = "plan")]
    Plan { steps: Vec<orchestrator::PlanStep> },
    #[serde(rename = "step-start")]
    StepStart { id: u32, description: String },
    #[serde(rename = "step-end")]
    StepEnd { id: u32, ok: bool, summary: String },
    #[serde(rename = "review")]
    Review { text: String },
}

fn emit(event: &Event) {
    let line = serde_json::to_string(event).expect("event always serializes");
    println!("{line}");
    io::stdout().flush().ok();
}

/// Tool output echoed into the event stream is capped: a 20k-char file dump
/// would flood the UI. The model still receives the full (already capped)
/// tool output — this only trims what the front end renders.
fn preview(s: &str) -> String {
    providers::truncate_public(s, 300)
}

const SYSTEM_PROMPT: &str = "\
You are Idexal, an autonomous coding agent working inside a real workspace.

Tools: search_files (regex across the workspace), find_files (locate by
path), read_file, edit_file (exact-string replace), write_file, list_dir,
run_command.

How to work:
- Find before you read: search_files/find_files beat guessing at paths.
- Read before you change. Never edit a file you have not read this turn.
- Prefer edit_file over write_file for existing files: it replaces one
  exact occurrence in place. Include enough surrounding context that the
  'old' string is unique. Reserve write_file for new files.
- Verify after you change: re-read, or run the project's tests.
- If a tool fails, read its message and adapt — do not repeat the call
  unchanged.

Be concise. Answer in the user's language.";

async fn stream_task(task: &str, read_only: bool, session_id: Option<&str>) {
    let cfg = config::load();
    let mut registry = Registry::from_config(&cfg);
    // Sessions are best-effort like memory: an unwritable store degrades to
    // a one-shot turn rather than refusing to run.
    let sessions = match session_id {
        Some(_) => match session::Sessions::open(None) {
            Ok(s) => Some(s),
            Err(e) => {
                eprintln!("[idexal] session store unavailable: {e}");
                None
            }
        },
        None => None,
    };
    // Memory is best-effort: a broken/unwritable store must not stop the
    // agent from running, so failure downgrades to "no memory" with a note
    // on stderr rather than aborting the task.
    let memory = match memory::Memory::open(None) {
        Ok(m) => Some(m),
        Err(e) => {
            eprintln!("[idexal] long-term memory unavailable: {e}");
            None
        }
    };

    if registry.is_empty() {
        emit(&Event::Error {
            error: "لا يوجد مزود صالح. عرّف ANTHROPIC_API_KEY أو OPENAI_API_KEY، أو شغّل Ollama محلياً، أو أضف مزوداً في ~/.idexal/config.json".into(),
        });
        process::exit(1);
    }

    emit(&Event::Start { providers: registry.provider_ids() });

    let cwd = env::current_dir().unwrap_or_else(|_| ".".into());
    let defs = if read_only { tools::read_only_definitions() } else { tools::definitions() };

    let mut on_provider = |name: &str| emit(&Event::Provider { name });
    let mut on_text = |text: &str| emit(&Event::Delta { text });
    let mut on_tool_call = |name: &str, args: &str| emit(&Event::ToolCall { name, args, step: None });
    let mut on_tool_result = |name: &str, ok: bool, output: &str| {
        emit(&Event::ToolResult { name, ok, output: preview(output), step: None })
    };

    let mut events = agent::AgentEvents {
        on_provider: &mut on_provider,
        on_text: &mut on_text,
        on_tool_call: &mut on_tool_call,
        on_tool_result: &mut on_tool_result,
    };

    let project = cwd.file_name().map(|n| n.to_string_lossy().to_string());
    let memory_context = memory.as_ref().and_then(|m| m.context_block(task, project.as_deref(), 5));

    // Replay the conversation so a follow-up continues it instead of
    // starting a fresh agent with no idea what just happened.
    let history: Vec<Message> = match (&sessions, session_id) {
        (Some(s), Some(id)) => {
            let title: String = task.chars().take(60).collect();
            let _ = s.ensure(id, &title, project.as_deref());
            s.history(id).unwrap_or_default()
        }
        _ => Vec::new(),
    };

    let result = agent::run_with_history(
        &mut registry,
        &cfg,
        &cwd,
        SYSTEM_PROMPT,
        task,
        &defs,
        memory_context,
        &history,
        &mut events,
    )
    .await;

    match result {
        Ok(outcome) => {
            if let (Some(s), Some(id)) = (&sessions, session_id) {
                if let Err(e) = s.append(id, &outcome.new_messages) {
                    eprintln!("[idexal] could not persist session: {e}");
                }
            }
            // Persist a session record so the next run has context. Only
            // on success: storing failed attempts would poison recall with
            // noise the agent should not learn from.
            if let Some(m) = &memory {
                let project = cwd.file_name().map(|n| n.to_string_lossy().to_string());
                let summary = outcome.text.chars().take(500).collect::<String>();
                if !summary.trim().is_empty() {
                    let _ = m.remember(
                        memory::MemoryKind::Session,
                        &format!("مهمة: {task}\nالنتيجة: {summary}"),
                        project.as_deref(),
                    );
                }
            }
            emit(&Event::Done {
                summary: if outcome.text.is_empty() {
                    "انتهت المهمة".into()
                } else {
                    outcome.text.chars().take(200).collect()
                },
                provider: outcome.provider_id,
                tool_rounds: outcome.tool_rounds,
            })
        }
        Err(errors) => emit(&Event::Error {
            error: format!("كل المزودين فشلوا:\n{}", errors.join("\n")),
        }),
    }
}

/// Multi-agent run: planner → parallel executors → reviewer.
async fn orchestrate_task(task: &str) {
    let cfg = config::load();
    let registry = Registry::from_config(&cfg);
    if registry.is_empty() {
        emit(&Event::Error {
            error: "لا يوجد مزود صالح. عرّف ANTHROPIC_API_KEY أو OPENAI_API_KEY، أو شغّل Ollama محلياً.".into(),
        });
        process::exit(1);
    }
    emit(&Event::Start { providers: registry.provider_ids() });

    let cwd = env::current_dir().unwrap_or_else(|_| ".".into());
    // Resolve the memory path once and hand it down: each parallel agent
    // opens its own SQLite handle (a Connection can't be shared).
    let memory_path = config::home_dir().map(|h| h.join(".idexal").join("memory.db"));

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<orchestrator::OrchestratorEvent>();

    // Drain events as they arrive so the UI streams live rather than
    // receiving everything at the end.
    let pump = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            use orchestrator::OrchestratorEvent as E;
            match event {
                E::Phase(p) => emit(&Event::Phase { phase: &p }),
                E::Plan(steps) => emit(&Event::Plan { steps }),
                E::StepStarted { id, description } => emit(&Event::StepStart { id, description }),
                E::StepFinished { id, ok, summary } => emit(&Event::StepEnd { id, ok, summary }),
                E::Provider(name) => emit(&Event::Provider { name: &name }),
                E::Text(text) => emit(&Event::Delta { text: &text }),
                E::ToolCall { step, name, args } => {
                    emit(&Event::ToolCall { name: &name, args: &args, step: Some(step) })
                }
                E::ToolResult { step, name, ok, output } => emit(&Event::ToolResult {
                    name: &name,
                    ok,
                    output: preview(&output),
                    step: Some(step),
                }),
                E::Review(text) => emit(&Event::Review { text }),
            }
        }
    });

    let result = orchestrator::run(&cfg, cwd.clone(), task, memory_path.clone(), tx).await;
    // Dropping the sender inside `run` ends the channel; wait for the pump
    // so no event is lost between the last send and process exit.
    let _ = pump.await;

    match result {
        Ok(outcome) => {
            if let Some(path) = &memory_path {
                if let Ok(m) = memory::Memory::open(Some(path.clone())) {
                    let project = cwd.file_name().map(|n| n.to_string_lossy().to_string());
                    let summary: String = outcome.summary.chars().take(500).collect();
                    if !summary.trim().is_empty() {
                        let _ = m.remember(
                            memory::MemoryKind::Session,
                            &format!("مهمة (متعددة الوكلاء): {task}\nالنتيجة: {summary}"),
                            project.as_deref(),
                        );
                    }
                }
            }
            emit(&Event::Done {
                summary: outcome.summary.chars().take(400).collect(),
                provider: outcome.provider_id,
                tool_rounds: outcome.steps_run as u32,
            });
        }
        Err(errors) => emit(&Event::Error { error: errors.join("\n") }),
    }
}

/// `memory` subcommands: inspect and seed long-term memory from the CLI.
///   idexal-core memory stats
///   idexal-core memory recall "<query>"
///   idexal-core memory add <fact|decision|preference> "<content>"
fn memory_command(args: &[String]) {
    let store = match memory::Memory::open(None) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("memory unavailable: {e}");
            process::exit(1);
        }
    };
    let project = env::current_dir()
        .ok()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()));

    match args.first().map(String::as_str) {
        Some("stats") | None => match store.count() {
            Ok(n) => println!("{}", serde_json::json!({ "memories": n })),
            Err(e) => {
                eprintln!("{e}");
                process::exit(1);
            }
        },
        Some("recall") => {
            let query = args.get(1).cloned().unwrap_or_default();
            if query.is_empty() {
                eprintln!("Usage: idexal-core memory recall \"<query>\"");
                process::exit(2);
            }
            match store.recall(&query, project.as_deref(), 10) {
                Ok(hits) => {
                    let out: Vec<serde_json::Value> = hits
                        .iter()
                        .map(|r| {
                            serde_json::json!({
                                "kind": r.kind,
                                "content": r.content,
                                "project": r.project,
                                "createdAt": r.created_at,
                            })
                        })
                        .collect();
                    println!("{}", serde_json::to_string_pretty(&out).unwrap());
                }
                Err(e) => {
                    eprintln!("{e}");
                    process::exit(1);
                }
            }
        }
        Some("add") => {
            let kind_str = args.get(1).cloned().unwrap_or_default();
            let content = args.get(2).cloned().unwrap_or_default();
            let Some(kind) = memory::MemoryKind::parse(&kind_str) else {
                eprintln!("Usage: idexal-core memory add <fact|decision|preference|session> \"<content>\"");
                process::exit(2);
            };
            if content.is_empty() {
                eprintln!("memory add needs content");
                process::exit(2);
            }
            match store.remember(kind, &content, project.as_deref()) {
                Ok(id) => println!("{}", serde_json::json!({ "id": id, "kind": kind.as_str() })),
                Err(e) => {
                    eprintln!("{e}");
                    process::exit(1);
                }
            }
        }
        Some(other) => {
            eprintln!("unknown memory subcommand: {other}");
            process::exit(2);
        }
    }
}

/// Effective configuration as a single JSON document: every usable and
/// unusable provider with its resolved settings, plus agent knobs and the
/// file the settings page should persist to. API keys are never included —
/// only whether one is resolvable — so the renderer can render the whole
/// page without ever touching a secret.
fn dump_config() {
    let cfg = config::load();
    let providers: Vec<serde_json::Value> = cfg
        .providers
        .iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "type": match p.kind {
                    ProviderKind::Anthropic => "anthropic",
                    ProviderKind::OpenaiCompatible => "openai-compatible",
                },
                "baseUrl": p.effective_base_url(),
                "model": p.model,
                "priority": p.priority,
                "enabled": p.enabled,
                "apiKeyEnv": p.api_key_env,
                "hasKey": p.resolve_key().is_some(),
                "local": p.is_local(),
                "usable": p.usable(),
                "headers": p.headers,
                "extraBody": p.extra_body,
            })
        })
        .collect();
    let out = serde_json::json!({
        "providers": providers,
        "agent": {
            "maxToolRounds": cfg.agent.max_tool_rounds,
            "useReviewer": cfg.agent.use_reviewer,
            "maxParallelAgents": cfg.agent.max_parallel_agents,
        },
        "configPath": config::home_dir()
            .map(|h| h.join(".idexal").join("config.json").to_string_lossy().to_string()),
    });
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
}

/// Round-trip one tiny completion through a single provider so the settings
/// page (and the CLI) can verify a configured endpoint actually answers.
/// Emits one JSON document: {ok, provider?, latencyMs?, reply?, error?}.
async fn test_provider(id: &str) {
    let cfg = config::load();
    let Some(provider) = cfg.providers.iter().find(|p| p.id == id).cloned() else {
        println!("{}", serde_json::json!({ "ok": false, "error": format!("no provider named '{id}'") }));
        return;
    };
    // A single-provider config so the chain can't silently fall through to
    // another provider and mask a broken one.
    let single = crate::config::Config { providers: vec![provider.clone()], agent: cfg.agent.clone() };
    let mut registry = Registry::from_config(&single);
    if registry.is_empty() {
        println!(
            "{}",
            serde_json::json!({ "ok": false, "error": format!("provider '{id}' is not usable (disabled or no key)") })
        );
        return;
    }

    let started = Instant::now();
    let result = registry
        .stream_turn(&[Message::user("Reply with exactly: OK")], &[], |_| {}, |_| {})
        .await;
    let latency_ms = started.elapsed().as_millis();

    match result {
        Ok(outcome) => println!(
            "{}",
            serde_json::json!({
                "ok": true,
                "provider": outcome.provider_id,
                "latencyMs": latency_ms,
                "reply": outcome.turn.text.chars().take(80).collect::<String>(),
            })
        ),
        Err(errors) => println!("{}", serde_json::json!({ "ok": false, "error": errors.join("; ") })),
    }
}

fn list_providers() {
    let cfg = config::load();
    let list: Vec<serde_json::Value> = cfg
        .providers
        .iter()
        .map(|p| {
            serde_json::json!({
                "id": p.id,
                "model": p.model,
                "baseUrl": p.effective_base_url(),
                "priority": p.priority,
                "enabled": p.enabled,
                "usable": p.usable(),
                "local": p.is_local(),
            })
        })
        .collect();
    println!("{}", serde_json::to_string_pretty(&list).unwrap());
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    match args.get(1).map(String::as_str) {
        Some("--version") | Some("-v") => {
            println!("idexal-core {}", env!("CARGO_PKG_VERSION"));
        }
        Some("providers") => list_providers(),
        // Run one tool directly — how you verify tool behaviour without
        // burning a model call, and what the CLI's `idexal grep` uses.
        Some("tool") => {
            let name = args.get(2).cloned().unwrap_or_default();
            let payload = args.get(3).cloned().unwrap_or_else(|| "{}".into());
            if name.is_empty() {
                eprintln!("Usage: idexal-core tool <name> '<json args>'");
                process::exit(2);
            }
            let cwd = env::current_dir().unwrap_or_else(|_| ".".into());
            let result = tools::dispatch(&cwd, &name, &payload);
            println!("{}", result.output);
            if !result.ok {
                process::exit(1);
            }
        }
        Some("config") => dump_config(),
        Some("test") => {
            let id = args.get(2).cloned().unwrap_or_default();
            if id.is_empty() {
                eprintln!("Usage: idexal-core test <provider-id>");
                process::exit(2);
            }
            test_provider(&id).await;
        }
        Some("memory") => memory_command(&args[2..]),
        Some("stream") => {
            let read_only = args.iter().any(|a| a == "--read-only");
            // `--session <id>` continues an existing conversation. Its value
            // must be skipped when looking for the task, or the id would be
            // mistaken for the prompt.
            let session_id = args
                .iter()
                .position(|a| a == "--session")
                .and_then(|i| args.get(i + 1))
                .cloned();
            let task = args
                .iter()
                .enumerate()
                .skip(2)
                .find(|(i, a)| {
                    !a.starts_with("--") && args.get(i.wrapping_sub(1)).map(String::as_str) != Some("--session")
                })
                .map(|(_, a)| a.clone())
                .unwrap_or_default();
            if task.is_empty() {
                emit(&Event::Error {
                    error: "Usage: idexal-core stream [--read-only] [--session <id>] \"<task>\"".into(),
                });
                process::exit(1);
            }
            stream_task(&task, read_only, session_id.as_deref()).await;
        }
        Some("sessions") => {
            let store = match session::Sessions::open(None) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("sessions unavailable: {e}");
                    process::exit(1);
                }
            };
            match args.get(2).map(String::as_str) {
                Some("delete") => {
                    let id = args.get(3).cloned().unwrap_or_default();
                    if id.is_empty() {
                        eprintln!("Usage: idexal-core sessions delete <id>");
                        process::exit(2);
                    }
                    match store.delete(&id) {
                        Ok(()) => println!("{}", serde_json::json!({ "deleted": id })),
                        Err(e) => {
                            eprintln!("{e}");
                            process::exit(1);
                        }
                    }
                }
                Some("show") => {
                    let id = args.get(3).cloned().unwrap_or_default();
                    if id.is_empty() {
                        eprintln!("Usage: idexal-core sessions show <id>");
                        process::exit(2);
                    }
                    match store.history(&id) {
                        Ok(messages) => {
                            let out: Vec<serde_json::Value> = messages
                                .iter()
                                .map(|m| {
                                    serde_json::json!({
                                        "role": match m.role {
                                            providers::types::Role::System => "system",
                                            providers::types::Role::User => "user",
                                            providers::types::Role::Assistant => "assistant",
                                        },
                                        "content": m.content,
                                        "toolCalls": m.tool_calls.iter().map(|t| &t.name).collect::<Vec<_>>(),
                                        "toolCallId": m.tool_call_id,
                                    })
                                })
                                .collect();
                            println!("{}", serde_json::to_string_pretty(&out).unwrap());
                        }
                        Err(e) => {
                            eprintln!("{e}");
                            process::exit(1);
                        }
                    }
                }
                _ => match store.list(50) {
                    Ok(rows) => {
                        let out: Vec<serde_json::Value> = rows
                            .into_iter()
                            .map(|(id, title, updated)| {
                                serde_json::json!({ "id": id, "title": title, "updatedAt": updated })
                            })
                            .collect();
                        println!("{}", serde_json::to_string_pretty(&out).unwrap());
                    }
                    Err(e) => {
                        eprintln!("{e}");
                        process::exit(1);
                    }
                },
            }
        }
        Some("agent") => {
            let task = args
                .iter()
                .skip(2)
                .find(|a| !a.starts_with("--"))
                .cloned()
                .unwrap_or_default();
            if task.is_empty() {
                emit(&Event::Error { error: "Usage: idexal-core agent \"<task>\"".into() });
                process::exit(1);
            }
            orchestrate_task(&task).await;
        }
        _ => {
            eprintln!("Usage:");
            eprintln!("  idexal-core stream [--read-only] \"<task>\"   single agent");
            eprintln!("  idexal-core agent \"<task>\"                  multi-agent (plan→execute→review)");
            eprintln!("  idexal-core providers");
            eprintln!("  idexal-core config                effective config as JSON");
            eprintln!("  idexal-core test <provider-id>    live connectivity round-trip");
            eprintln!("  idexal-core memory stats|recall \"<query>\"|add <kind> \"<content>\"");
            eprintln!("  idexal-core --version");
            process::exit(2);
        }
    }
}
