//! TCP server for the Idexal Engine.
//!
//! Runs as a local TCP server (127.0.0.1) that the Electron main process
//! connects to. Communicates via a simple newline-delimited JSON protocol.
//!
//! Protocol:
//!   Request:  {"id":"uuid","method":"parse_file","params":{...}}\n
//!   Response: {"id":"uuid","result":{...},"error":null}\n
//!
//! This avoids N-API complexity and lets the engine run as a separate process.

use std::io::{BufRead, BufReader, BufWriter, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::parser;

// ── Protocol types ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub id: String,
    pub method: String,
    pub params: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub id: String,
    pub result: Option<Value>,
    pub error: Option<String>,
}

// ── Engine state ──────────────────────────────────────────────────────

pub struct EngineState {
    pub project_root: Option<String>,
    pub symbols: Vec<parser::ParsedSymbol>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self::new()
    }
}

impl EngineState {
    pub fn new() -> Self {
        Self {
            project_root: None,
            symbols: Vec::new(),
        }
    }
}

// ── Request handler ───────────────────────────────────────────────────

fn handle_request(
    state: &Arc<Mutex<EngineState>>,
    request: &JsonRpcRequest,
) -> JsonRpcResponse {
    let result = match request.method.as_str() {
        // ── Parser ───────────────────────────────────────────────
        "parse_file" => {
            let file_path = request.params["file_path"].as_str().unwrap_or("");
            let content = request.params["content"].as_str().unwrap_or("");
            let language = request.params["language"].as_str().unwrap_or("");

            match parser::parse_file(file_path, content, language) {
                Ok(symbols) => {
                    let symbol_count = symbols.len();
                    Some(serde_json::json!({
                        "success": true,
                        "symbols": symbols,
                        "symbol_count": symbol_count,
                    }))
                }
                Err(e) => Some(serde_json::json!({
                    "success": false,
                    "error": e.to_string(),
                })),
            }
        }

        "detect_language" => {
            let file_path = request.params["file_path"].as_str().unwrap_or("");
            let ext = std::path::Path::new(file_path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            let lang = match ext {
                "rs" => "rust",
                "ts" | "tsx" => "typescript",
                "js" | "jsx" | "mjs" => "javascript",
                "py" => "python",
                "go" => "go",
                "c" | "h" => "c",
                "cpp" | "cxx" | "cc" | "hpp" => "cpp",
                _ => "unknown",
            };
            Some(serde_json::json!({ "language": lang }))
        }

        "supported_languages" => Some(serde_json::json!([
            "rust", "typescript", "javascript", "python", "go", "c", "cpp"
        ])),

        // ── Project index ────────────────────────────────────────
        "index_file" => {
            let file_path = request.params["file_path"].as_str().unwrap_or("");
            let content = request.params["content"].as_str().unwrap_or("");
            let language = request.params["language"].as_str().unwrap_or("");

            if let Ok(symbols) = parser::parse_file(file_path, content, language) {
                let mut state = state.lock().unwrap();
                // Remove old symbols for this file
                state.symbols.retain(|s| s.snippet != file_path);
                // Add new symbols
                for sym in symbols {
                    state.symbols.push(sym);
                }
                Some(serde_json::json!({
                    "success": true,
                    "total_symbols": state.symbols.len(),
                }))
            } else {
                Some(serde_json::json!({ "success": false }))
            }
        }

        "search_symbols" => {
            let query = request.params["query"].as_str().unwrap_or("");
            let state = state.lock().unwrap();
            let results: Vec<_> = state
                .symbols
                .iter()
                .filter(|s| s.name.to_lowercase().contains(&query.to_lowercase()))
                .map(|s| serde_json::json!({
                    "name": s.name,
                    "symbol_type": s.symbol_type,
                    "start_line": s.start_line,
                    "snippet": s.snippet,
                }))
                .collect();
            Some(serde_json::json!({
                "results": results,
                "total": results.len(),
            }))
        }

        "get_symbols_by_file" => {
            let file_path = request.params["file_path"].as_str().unwrap_or("");
            let state = state.lock().unwrap();
            let results: Vec<_> = state
                .symbols
                .iter()
                .filter(|s| s.snippet.contains(file_path))
                .map(|s| serde_json::json!({
                    "name": s.name,
                    "symbol_type": s.symbol_type,
                    "start_line": s.start_line,
                }))
                .collect();
            Some(serde_json::json!({
                "results": results,
                "total": results.len(),
            }))
        }

        "get_project_stats" => {
            let state = state.lock().unwrap();
            let total = state.symbols.len();
            let functions = state.symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Function).count();
            let classes = state.symbols.iter().filter(|s|
                s.symbol_type == parser::SymbolKind::Class ||
                s.symbol_type == parser::SymbolKind::Struct
            ).count();
            let enums = state.symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Enum).count();
            let traits = state.symbols.iter().filter(|s|
                s.symbol_type == parser::SymbolKind::Trait ||
                s.symbol_type == parser::SymbolKind::Interface
            ).count();

            Some(serde_json::json!({
                "total": total,
                "functions": functions,
                "classes": classes,
                "enums": enums,
                "traits": traits,
            }))
        }

        // ── Health ───────────────────────────────────────────────
        "ping" => Some(serde_json::json!({ "pong": true })),

        _ => Some(serde_json::json!({
            "error": format!("unknown method: {}", request.method)
        })),
    };

    JsonRpcResponse {
        id: request.id.clone(),
        result,
        error: None,
    }
}

// ── Connection handler ────────────────────────────────────────────────

fn handle_connection(
    stream: TcpStream,
    state: Arc<Mutex<EngineState>>,
) {
    let reader_stream = stream.try_clone().expect("failed to clone stream");
    let mut writer = BufWriter::new(stream);
    let reader = BufReader::new(reader_stream);

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let response = JsonRpcResponse {
                    id: String::new(),
                    result: None,
                    error: Some(format!("parse error: {e}")),
                };
                let _ = writer.write_all(
                    format!("{}\n", serde_json::to_string(&response).unwrap()).as_bytes(),
                );
                let _ = writer.flush();
                continue;
            }
        };

        let response = handle_request(&state, &request);
        let _ = writer.write_all(
            format!("{}\n", serde_json::to_string(&response).unwrap()).as_bytes(),
        );
        let _ = writer.flush();
    }
}

// ── Server ────────────────────────────────────────────────────────────

pub struct EngineServer {
    port: u16,
    state: Arc<Mutex<EngineState>>,
    running: Arc<Mutex<bool>>,
}

impl EngineServer {
    pub fn new(port: u16) -> Result<Self, String> {
        // Verify the port is available
        let addr = format!("127.0.0.1:{port}");
        let test_listener = TcpListener::bind(&addr)
            .map_err(|e| format!("failed to bind to {addr}: {e}"))?;
        let actual_port = test_listener.local_addr().unwrap().port();
        drop(test_listener);

        Ok(Self {
            port: actual_port,
            state: Arc::new(Mutex::new(EngineState::new())),
            running: Arc::new(Mutex::new(false)),
        })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub fn start(&self) -> Result<(), String> {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr)
            .map_err(|e| format!("failed to bind: {e}"))?;
        listener.set_nonblocking(false)
            .map_err(|e| format!("set_nonblocking failed: {e}"))?;

        let state = Arc::clone(&self.state);
        *self.running.lock().unwrap() = true;
        let running = Arc::clone(&self.running);

        thread::spawn(move || {
            listener.set_nonblocking(false).ok();
            for stream in listener.incoming() {
                if !*running.lock().unwrap() {
                    break;
                }
                match stream {
                    Ok(stream) => {
                        let state = Arc::clone(&state);
                        thread::spawn(move || {
                            handle_connection(stream, state);
                        });
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(std::time::Duration::from_millis(10));
                    }
                    Err(e) => {
                        eprintln!("[engine] connection error: {e}");
                    }
                }
            }
        });

        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpStream;

    fn send_request(port: u16, method: &str, params: Value) -> JsonRpcResponse {
        let mut stream = TcpStream::connect(format!("127.0.0.1:{port}")).unwrap();
        let request = JsonRpcRequest {
            id: "test-1".to_string(),
            method: method.to_string(),
            params,
        };
        let mut line = serde_json::to_string(&request).unwrap();
        line.push('\n');
        stream.write_all(line.as_bytes()).unwrap();
        stream.flush().unwrap();

        let reader = BufReader::new(stream.try_clone().unwrap());
        let response_line = reader.lines().next().unwrap().unwrap();
        serde_json::from_str(&response_line).unwrap()
    }

    #[test]
    fn server_starts_and_pings() {
        let server = EngineServer::new(0).unwrap(); // random port
        let port = server.port();
        server.start().unwrap();
        thread::sleep(std::time::Duration::from_millis(50));

        let response = send_request(port, "ping", serde_json::json!({}));
        assert!(response.result.is_some());
        assert_eq!(response.result.unwrap()["pong"], true);
    }

    #[test]
    fn server_detects_language() {
        let server = EngineServer::new(0).unwrap();
        let port = server.port();
        server.start().unwrap();
        thread::sleep(std::time::Duration::from_millis(50));

        let response = send_request(port, "detect_language", serde_json::json!({
            "file_path": "main.rs"
        }));
        let result = response.result.unwrap();
        assert_eq!(result["language"], "rust");
    }

    #[test]
    fn server_parses_file() {
        let server = EngineServer::new(0).unwrap();
        let port = server.port();
        server.start().unwrap();
        thread::sleep(std::time::Duration::from_millis(50));

        let response = send_request(port, "parse_file", serde_json::json!({
            "file_path": "test.rs",
            "content": "fn main() {}",
            "language": "rust"
        }));
        let result = response.result.unwrap();
        assert_eq!(result["success"], true);
        assert_eq!(result["symbol_count"], 1);
    }

    #[test]
    fn server_indexes_and_searches() {
        let server = EngineServer::new(0).unwrap();
        let port = server.port();
        server.start().unwrap();
        thread::sleep(std::time::Duration::from_millis(50));

        // Index a file
        send_request(port, "index_file", serde_json::json!({
            "file_path": "lib.rs",
            "content": "pub fn helper() {}\npub struct Config {}",
            "language": "rust"
        }));

        // Search
        let response = send_request(port, "search_symbols", serde_json::json!({
            "query": "helper"
        }));
        let result = response.result.unwrap();
        assert_eq!(result["total"], 1);
        assert_eq!(result["results"][0]["name"], "helper");
    }

    #[test]
    fn server_returns_stats() {
        let server = EngineServer::new(0).unwrap();
        let port = server.port();
        server.start().unwrap();
        thread::sleep(std::time::Duration::from_millis(50));

        send_request(port, "index_file", serde_json::json!({
            "file_path": "a.rs",
            "content": "fn foo() {}\nstruct Bar {}",
            "language": "rust"
        }));

        let response = send_request(port, "get_project_stats", serde_json::json!({}));
        let result = response.result.unwrap();
        assert!(result["total"].as_u64().unwrap() >= 2);
    }
}
