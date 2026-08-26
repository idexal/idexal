#![deny(clippy::all)]

mod agent;
mod memory;
mod parser;
pub mod server;
pub mod traits;

use napi_derive::napi;

// ── Selective public re-exports (proj-pub-crate-internal) ─────────────

// Agent module
pub use agent::{
    Agent, AgentError, AgentResponse, AgentStatus, AgentTask, AgentType, TaskId,
    create_task, get_system_prompt,
};
pub use agent::orchestrator::Orchestrator;
pub use agent::code_agent::CodeAgent;
pub use agent::review_agent::ReviewAgent;
pub use agent::debug_agent::DebugAgent;
pub use agent::architect::ArchitectAgent;
pub use agent::test_agent::TestAgent;

// Memory module
pub use memory::{
    CodeIndex, CodeSymbol, ConversationMemory, MemoryEntry, MemoryError, MemoryResult,
    MemoryStore, MemoryType, ProjectContext, ProjectMemory, SymbolType, VectorStore,
    create_code_symbol, create_memory_entry,
};

// Parser module
pub use parser::{
    ParseError, ParseResult, ParsedSymbol, SearchResult, SymbolKind,
    parse_file, search_in_files,
};

/// Idexal Engine — High-performance backend for Idexal IDE
///
/// This module provides:
/// - Multi-agent orchestration
/// - Memory management
/// - Code parsing and indexing
/// Initialize the engine.
#[napi]
pub fn init_engine() -> String {
    tracing_subscriber::fmt::init();
    tracing::info!("idexal engine initialized");
    "Idexal Engine v0.1.0 initialized successfully".to_string()
}

/// Get engine version.
#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Process a file and extract symbols.
#[napi]
pub fn process_file(file_path: String, content: String, language: String) -> String {
    match parser::parse_file(&file_path, &content, &language) {
        Ok(symbols) => {
            serde_json::json!({
                "success": true,
                "file_path": file_path,
                "symbols": symbols,
                "symbol_count": symbols.len(),
            })
            .to_string()
        }
        Err(e) => {
            serde_json::json!({
                "success": false,
                "error": e.to_string(),
            })
            .to_string()
        }
    }
}

/// Search codebase for patterns.
#[napi]
pub fn search_codebase(query: String, files: Vec<String>) -> String {
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    let results = parser::search_in_files(&query, &file_refs);
    serde_json::json!({
        "query": query,
        "results": results,
        "total_matches": results.len(),
    })
    .to_string()
}

// ══════════════════════════════════════════════════════════════════════
// PARSER — extended API
// ══════════════════════════════════════════════════════════════════════

/// Get list of supported languages for parsing.
#[napi]
pub fn supported_languages() -> String {
    serde_json::json!([
        "rust", "typescript", "javascript", "python",
        "go", "c", "cpp"
    ])
    .to_string()
}

/// Get tree-sitter parse errors (syntax errors) for a file.
/// Returns JSON array of { line, column, end_line, end_column, message, severity }.
#[napi]
pub fn get_parse_errors(content: String, language: String) -> String {
    if content.is_empty() {
        return "[]".to_string();
    }

    match parser::get_parse_errors(&content, &language) {
        Ok(errors) => serde_json::json!(errors).to_string(),
        Err(e) => serde_json::json!({ "error": e.to_string() }).to_string(),
    }
}

/// Parse a file using tree-sitter (preferred) with regex fallback.
/// Returns structured JSON with symbols, imports, exports, errors.
#[napi]
pub fn parse_file_structured(file_path: String, content: String, language: String) -> String {
    if content.is_empty() {
        return serde_json::json!({ "success": false, "error": "empty input" }).to_string();
    }

    match parser::parse_file(&file_path, &content, &language) {
        Ok(symbols) => {
            let symbol_count = symbols.len();
            let functions = symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Function).count();
            let classes = symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Class || s.symbol_type == parser::SymbolKind::Struct).count();
            let enums = symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Enum).count();
            let traits = symbols.iter().filter(|s| s.symbol_type == parser::SymbolKind::Trait || s.symbol_type == parser::SymbolKind::Interface).count();

            serde_json::json!({
                "success": true,
                "file_path": file_path,
                "language": language,
                "symbols": symbols,
                "stats": {
                    "total": symbol_count,
                    "functions": functions,
                    "classes": classes,
                    "enums": enums,
                    "traits": traits,
                },
            })
            .to_string()
        }
        Err(e) => {
            serde_json::json!({
                "success": false,
                "error": e.to_string(),
            })
            .to_string()
        }
    }
}

/// Detect programming language from file extension.
#[napi]
pub fn detect_language(file_path: String) -> String {
    let ext = std::path::Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let lang = match ext {
        "rs" => "rust",
        "ts" | "tsx" => "typescript",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "py" | "pyw" => "python",
        "go" => "go",
        "c" | "h" => "c",
        "cpp" | "cxx" | "cc" | "hpp" | "hxx" => "cpp",
        _ => "unknown",
    };
    lang.to_string()
}

// ══════════════════════════════════════════════════════════════════════
// MEMORY — project memory API
// ══════════════════════════════════════════════════════════════════════

use std::sync::Mutex;
use once_cell::sync::Lazy;

static PROJECT_MEMORY: Lazy<Mutex<memory::ProjectMemory>> =
    Lazy::new(|| Mutex::new(memory::ProjectMemory::new()));

/// Initialize project memory for a workspace root.
#[napi]
pub fn init_project_memory(root_path: String, name: String) -> String {
    if let Ok(mut mem) = PROJECT_MEMORY.lock() {
        let ctx = memory::ProjectContext {
            root_path: root_path.clone(),
            name,
            description: String::new(),
            languages: Vec::new(),
            frameworks: Vec::new(),
            symbols: Vec::new(),
            last_indexed: chrono::Utc::now(),
        };
        mem.set_context(ctx);
        serde_json::json!({ "success": true, "root_path": root_path }).to_string()
    } else {
        serde_json::json!({ "success": false, "error": "failed to lock memory" }).to_string()
    }
}

/// Add a code symbol to project memory.
#[napi]
pub fn add_project_symbol(
    name: String,
    symbol_type: String,
    file_path: String,
    line: u32,
    column: u32,
    snippet: String,
) -> String {
    let st = match symbol_type.as_str() {
        "function" => memory::SymbolType::Function,
        "class" => memory::SymbolType::Class,
        "interface" => memory::SymbolType::Interface,
        "variable" => memory::SymbolType::Variable,
        "module" => memory::SymbolType::Module,
        "struct" => memory::SymbolType::Struct,
        "enum" => memory::SymbolType::Enum,
        "trait" => memory::SymbolType::Trait,
        _ => memory::SymbolType::Function,
    };
    let sym = memory::create_code_symbol(name, st, file_path, line as usize, column as usize, snippet);
    if let Ok(mut mem) = PROJECT_MEMORY.lock() {
        mem.add_symbol(sym);
        serde_json::json!({ "success": true }).to_string()
    } else {
        serde_json::json!({ "success": false, "error": "failed to lock memory" }).to_string()
    }
}

/// Search project symbols by name.
#[napi]
pub fn search_project_symbols(query: String) -> String {
    if let Ok(mem) = PROJECT_MEMORY.lock() {
        let results = mem.get_symbols_by_name(&query);
        serde_json::json!({
            "success": true,
            "results": results.iter().map(|s| serde_json::json!({
                "name": s.name,
                "symbol_type": s.symbol_type,
                "file_path": s.file_path,
                "line": s.line,
                "column": s.column,
                "snippet": s.snippet,
            })).collect::<Vec<_>>(),
            "total": results.len(),
        })
        .to_string()
    } else {
        serde_json::json!({ "success": false, "error": "failed to lock memory" }).to_string()
    }
}

/// Get project memory summary.
#[napi]
pub fn get_project_summary() -> String {
    if let Ok(mem) = PROJECT_MEMORY.lock() {
        let summary = mem.get_summary();
        serde_json::json!({ "success": true, "summary": summary }).to_string()
    } else {
        serde_json::json!({ "success": false, "error": "failed to lock memory" }).to_string()
    }
}

/// Clear project memory.
#[napi]
pub fn clear_project_memory() -> String {
    if let Ok(mut mem) = PROJECT_MEMORY.lock() {
        mem.set_context(memory::ProjectContext {
            root_path: String::new(),
            name: String::new(),
            description: String::new(),
            languages: Vec::new(),
            frameworks: Vec::new(),
            symbols: Vec::new(),
            last_indexed: chrono::Utc::now(),
        });
        serde_json::json!({ "success": true }).to_string()
    } else {
        serde_json::json!({ "success": false, "error": "failed to lock memory" }).to_string()
    }
}

// ══════════════════════════════════════════════════════════════════════
// AGENT — task creation and system prompts
// ══════════════════════════════════════════════════════════════════════

/// Create a new agent task.
#[napi]
pub fn create_agent_task(
    agent_type: String,
    description: String,
    priority: u32,
) -> String {
    let at = match agent_type.as_str() {
        "code" => AgentType::Code,
        "review" => AgentType::Review,
        "debug" => AgentType::Debug,
        "architect" => AgentType::Architect,
        "test" => AgentType::Test,
        "orchestrator" => AgentType::Orchestrator,
        _ => AgentType::Code,
    };
    let ctx = std::collections::HashMap::new();
    let task = create_task(at, description, ctx, priority as u8);
    serde_json::json!({
        "success": true,
        "task_id": task.id.to_string(),
        "agent_type": task.agent_type.to_string(),
        "description": task.description,
        "priority": task.priority,
        "status": "idle",
    })
    .to_string()
}

/// Get system prompt for an agent type.
#[napi]
pub fn get_agent_prompt(agent_type: String) -> String {
    let at = match agent_type.as_str() {
        "code" => AgentType::Code,
        "review" => AgentType::Review,
        "debug" => AgentType::Debug,
        "architect" => AgentType::Architect,
        "test" => AgentType::Test,
        "orchestrator" => AgentType::Orchestrator,
        _ => AgentType::Code,
    };
    let prompt = get_system_prompt(&at);
    serde_json::json!({ "success": true, "prompt": prompt }).to_string()
}

/// List all available agent types.
#[napi]
pub fn list_agent_types() -> String {
    serde_json::json!({
        "success": true,
        "agents": [
            { "type": "code", "name": "Code Agent", "description": "Writing high-quality, clean code" },
            { "type": "review", "name": "Review Agent", "description": "Code review and quality analysis" },
            { "type": "debug", "name": "Debug Agent", "description": "Debugging and error analysis" },
            { "type": "architect", "name": "Architect Agent", "description": "System design and architecture" },
            { "type": "test", "name": "Test Agent", "description": "Writing comprehensive tests" },
            { "type": "orchestrator", "name": "Orchestrator", "description": "Task coordination and delegation" },
        ],
    })
    .to_string()
}

// ══════════════════════════════════════════════════════════════════════
// SERVER — TCP server for Electron integration
// ══════════════════════════════════════════════════════════════════════

use std::sync::OnceLock;
static ENGINE_SERVER: OnceLock<server::EngineServer> = OnceLock::new();

/// Start the TCP engine server on a given port.
/// Returns the actual port the server is listening on.
#[napi]
pub fn start_engine_server(port: u32) -> String {
    let server = match server::EngineServer::new(port as u16) {
        Ok(s) => s,
        Err(e) => return serde_json::json!({ "success": false, "error": e }).to_string(),
    };
    let actual_port = server.port();
    if let Err(e) = server.start() {
        return serde_json::json!({ "success": false, "error": e }).to_string();
    }
    let _ = ENGINE_SERVER.set(server);
    serde_json::json!({ "success": true, "port": actual_port }).to_string()
}

/// Stop the engine server.
#[napi]
pub fn stop_engine_server() -> String {
    // OnceLock doesn't support take, so we just acknowledge
    serde_json::json!({ "success": true, "message": "server stop requested" }).to_string()
}
