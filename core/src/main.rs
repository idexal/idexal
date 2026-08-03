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

use serde::Serialize;
use std::io::{self, Write};
use std::{env, process, thread, time::Duration};

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

fn stream_task(task: &str) {
    emit(&Event::Start);

    // Placeholder response until real provider integration lands — streamed
    // word-by-word so the Electron renderer's incremental-render path is
    // exercised identically to how it will behave with real output.
    let response = format!(
        "استلمت المهمة: \"{task}\". نواة Idexal بلغة Rust تعمل الآن، لكن تكامل المزودين \
         الحقيقي (Anthropic/OpenAI/محلي) لم يُبنَ بعد في هذا الإصدار — هذا تحقق أولي \
         لسلسلة التنفيذ الكاملة (Electron يستدعي هذا الثنائي عبر NDJSON)."
    );
    for word in response.split_whitespace() {
        emit(&Event::Delta {
            text: &format!("{word} "),
        });
        thread::sleep(Duration::from_millis(35));
    }

    emit(&Event::Done {
        summary: "بث تجريبي مكتمل — بانتظار تكامل المزودين الحقيقي".to_string(),
    });
}

fn main() {
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
            stream_task(&task);
        }
        _ => {
            eprintln!("Usage: idexal-core stream \"<task>\" | idexal-core --version");
            process::exit(2);
        }
    }
}
