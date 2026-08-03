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
mod providers;
mod tools;

use providers::Registry;
use serde::Serialize;
use std::io::{self, Write};
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
    ToolCall { name: &'a str, args: &'a str },
    #[serde(rename = "tool-result")]
    ToolResult { name: &'a str, ok: bool, output: String },
    #[serde(rename = "done")]
    Done { summary: String, provider: String, tool_rounds: u32 },
    #[serde(rename = "error")]
    Error { error: String },
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
You have tools to read, write and list files and to run shell commands.
Use them to inspect before you change anything, and verify your work after.
Be concise. Answer in the user's language.";

async fn stream_task(task: &str, read_only: bool) {
    let cfg = config::load();
    let mut registry = Registry::from_config(&cfg);
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
    let mut on_tool_call = |name: &str, args: &str| emit(&Event::ToolCall { name, args });
    let mut on_tool_result = |name: &str, ok: bool, output: &str| {
        emit(&Event::ToolResult { name, ok, output: preview(output) })
    };

    let mut events = agent::AgentEvents {
        on_provider: &mut on_provider,
        on_text: &mut on_text,
        on_tool_call: &mut on_tool_call,
        on_tool_result: &mut on_tool_result,
    };

    let result =
        agent::run(&mut registry, &cfg, &cwd, SYSTEM_PROMPT, task, &defs, memory.as_ref(), &mut events).await;

    match result {
        Ok(outcome) => {
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
        Some("memory") => memory_command(&args[2..]),
        Some("stream") => {
            let read_only = args.iter().any(|a| a == "--read-only");
            let task = args
                .iter()
                .skip(2)
                .find(|a| !a.starts_with("--"))
                .cloned()
                .unwrap_or_default();
            if task.is_empty() {
                emit(&Event::Error { error: "Usage: idexal-core stream [--read-only] \"<task>\"".into() });
                process::exit(1);
            }
            stream_task(&task, read_only).await;
        }
        _ => {
            eprintln!("Usage:");
            eprintln!("  idexal-core stream [--read-only] \"<task>\"");
            eprintln!("  idexal-core providers");
            eprintln!("  idexal-core memory stats|recall \"<query>\"|add <kind> \"<content>\"");
            eprintln!("  idexal-core --version");
            process::exit(2);
        }
    }
}
