//! Code parser module for Freebuff IDE
//!
//! This module provides code parsing capabilities using Tree-sitter
//! for accurate AST-based code analysis.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod tree_sitter;
pub mod symbols;

/// Parsed symbol from code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSymbol {
    pub name: String,
    pub symbol_type: String,
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
    pub snippet: String,
    pub parent: Option<String>,
    pub children: Vec<String>,
}

/// Parse result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub file_path: String,
    pub language: String,
    pub symbols: Vec<ParsedSymbol>,
    pub imports: Vec<String>,
    pub exports: Vec<String>,
    pub errors: Vec<String>,
}

/// Search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub file_path: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
    pub context: String,
}

/// Parse a file and extract symbols
pub fn parse_file(
    file_path: &str,
    content: &str,
    language: &str,
) -> Result<Vec<ParsedSymbol>, String> {
    // Simple pattern-based parsing as a fallback
    // In production, this would use Tree-sitter for accurate parsing
    let mut symbols = Vec::new();
    
    match language {
        "rust" => {
            symbols.extend(parse_rust_content(content));
        }
        "typescript" | "javascript" => {
            symbols.extend(parse_ts_js_content(content));
        }
        "python" => {
            symbols.extend(parse_python_content(content));
        }
        _ => {
            // Basic parsing for unknown languages
            symbols.extend(parse_generic_content(content));
        }
    }
    
    Ok(symbols)
}

/// Search for patterns in files
pub fn search_in_files(query: &str, files: &[String]) -> Vec<SearchResult> {
    let mut results = Vec::new();
    let query_lower = query.to_lowercase();
    
    for file_path in files {
        // In production, this would read and search the actual file
        // For now, return mock results
        results.push(SearchResult {
            file_path: file_path.clone(),
            line: 1,
            column: 0,
            content: format!("Match for '{}' in {}", query, file_path),
            context: String::new(),
        });
    }
    
    results
}

/// Parse Rust content for symbols
fn parse_rust_content(content: &str) -> Vec<ParsedSymbol> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    for (line_num, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        
        // Function definitions
        if trimmed.starts_with("pub fn") || trimmed.starts_with("fn ") {
            if let Some(name) = extract_function_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "function".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("fn").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
        
        // Struct definitions
        if trimmed.starts_with("pub struct") || trimmed.starts_with("struct ") {
            if let Some(name) = extract_struct_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "struct".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("struct").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
        
        // Impl blocks
        if trimmed.starts_with("impl ") {
            if let Some(name) = extract_impl_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "impl".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("impl").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
    }
    
    symbols
}

/// Parse TypeScript/JavaScript content for symbols
fn parse_ts_js_content(content: &str) -> Vec<ParsedSymbol> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    for (line_num, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        
        // Function definitions
        if trimmed.starts_with("export function") || trimmed.starts_with("function ") {
            if let Some(name) = extract_function_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "function".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("function").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
        
        // Class definitions
        if trimmed.starts_with("export class") || trimmed.starts_with("class ") {
            if let Some(name) = extract_class_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "class".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("class").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
        
        // Interface definitions
        if trimmed.starts_with("export interface") || trimmed.starts_with("interface ") {
            if let Some(name) = extract_interface_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "interface".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("interface").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
    }
    
    symbols
}

/// Parse Python content for symbols
fn parse_python_content(content: &str) -> Vec<ParsedSymbol> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    for (line_num, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        
        // Function definitions
        if trimmed.starts_with("def ") {
            if let Some(name) = extract_python_function_name(trimmed) {
                symbols.push(ParsedSymbol {
                    name,
                    symbol_type: "function".to_string(),
                    start_line: line_num + 1,
                    start_column: line.find("def").unwrap_or(0),
                    end_line: line_num + 1,
                    end_column: line.len(),
                    snippet: trimmed.to_string(),
                    parent: None,
                    children: Vec::new(),
                });
            }
        }
        
       
