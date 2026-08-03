// Idexal Core — agent engine (Rust)
//
// This is the fresh Rust replacement for the former Node-based
// `idexal/ai-core`. It speaks the same NDJSON-over-stdout contract so the
// Electron shell's renderer can reuse the same event-handling logic:
//   {"type":"start"}
//   {"type":"delta","text":"..."}      (repeated, streamed)
//   {"type":"done","summary":"..."}
//   {"type":"error","error":"..."}
//
// Current state: proves the process boundary and event contract end to end.
// Real provider HTTP calls (Anthropic/OpenAI/etc.), multi-agent
// orchestration, and long-term memory are the next milestones — ported from
// the design already validated in the previous Node implementation.

mod providers;

use serde::Serialize;
use std::io::{self, Write};
use std::{env, process};

#[derive(Serialize)]
#[serde(tag = "type")]
enum Event<'a> {
    #[serde(rename = "start")]
    Start,
    #[serde(rename = "delta")]
    Delta { text: &'a str },
    #[serde(rename = "done")]
    Done { summary: String },
    #[serde(rename = "error")]
    Error { error: String },
}

fn emit(event: &Event) {
    let line = serde_json::to_string(event).expect("event always serializes");
    println!("{line}");
    io::stdout().flush().ok();
}

async fn stream_task(task: &str) {
    emit(&Event::Start);

    match providers::resolve_anthropic() {
        Some(cfg) => {
            let system_prompt = "You are Idexal, a helpful coding agent. Answer concisely.";
            let mut had_error = false;
            let result = providers::stream_chat(&cfg, system_prompt, task, |text| {
                emit(&Event::Delta { text });
            })
            .await;
            if let Err(err) = result {
                had_error = true;
                emit(&Event::Error { error: err });
            }
            if !had_error {
                emit(&Event::Done {
                    summary: format!("تم الرد عبر مزود {}", cfg.model),
                });
            }
        }
        None => {
            emit(&Event::Error {
                error: "لا يوجد مزود مُهيَّأ — عرّف ANTHROPIC_API_KEY لتفعيل ردود حقيقية.".to_string(),
            });
        }
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    match args.get(1).map(String::as_str) {
        Some("--version") | Some("-v") => {
            println!("idexal-core {}", env!("CARGO_PKG_VERSION"));
        }
        Some("stream") => {
            let task = args.get(2).cloned().unwrap_or_default();
            if task.is_empty() {
                emit(&Event::Error {
                    error: "Usage: idexal-core stream \"<task>\"".to_string(),
                });
                process::exit(1);
            }
            stream_task(&task).await;
        }
        _ => {
            eprintln!("Usage: idexal-core stream \"<task>\" | idexal-core --version");
            process::exit(2);
        }
    }
}
