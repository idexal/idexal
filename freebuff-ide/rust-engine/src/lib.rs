#![deny(clippy::all)]

mod agent;
mod memory;
mod parser;

use napi_derive::napi;

/// Idexal Engine - High-performance backend for Idexal IDE
/// 
/// This module provides:
/// - Multi-agent orchestration
/// - Memory management
/// - Code parsing and indexing
/// - Git operations
/// - Terminal management

pub use agent::*;
pub use memory::*;
pub use parser::*;

/// Initialize the engine
#[napi]
pub fn init_engine() -> String {
    env_logger::init();
    log::info!("Idexal Engine initialized");
    "Idexal Engine v0.1.0 initialized successfully".to_string()
}

/// Get engine version
#[napi]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Process a file and extract symbols
#[napi]
pub fn process_file(file_path: String, content: String, language: String) -> String {
    match parser::parse_file(&file_path, &content, &language) {
        Ok(symbols) => {
            let result = serde_json::json!({
                "success": true,
                "file_path": file_path,
                "symbols": symbols,
                "symbol_count": symbols.len(),
            });
            result.to_string()
        }
        Err(e) => {
            let result = serde_json::json!({
                "success": false,
                "error": e.to_string(),
            });
            result.to_string()
        }
    }
}

/// Search codebase for patterns
#[napi]
pub fn search_codebase(query: String, files: Vec<String>) -> String {
    let results = parser::search_in_files(&query, &files);
    let result = serde_json::json!({
        "query": query,
        "results": results,
        "total_matches": results.len(),
    });
    result.to_string()
}
