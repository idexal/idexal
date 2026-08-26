//! Code parser module for Idexal IDE
//!
//! This module provides code parsing capabilities using Tree-sitter
//! for accurate AST-based code analysis.

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub mod tree_sitter;
pub mod symbols;

pub use tree_sitter::{get_parse_errors, SyntaxError};

// ── Error type ───────────────────────────────────────────────────────

/// Errors produced by the parser.
#[derive(Error, Debug)]
#[non_exhaustive]
pub enum ParseError {
    #[error("unsupported language: {0}")]
    UnsupportedLanguage(String),

    #[error("parse failed for {path}: {reason}")]
    ParseFailed { path: String, reason: String },

    #[error("empty input")]
    EmptyInput,
}

// ── Types ─────────────────────────────────────────────────────────────

/// Kind of code symbol — replaces the former `String` field for type safety.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SymbolKind {
    Function,
    Struct,
    Enum,
    Trait,
    Impl,
    TypeAlias,
    Class,
    Interface,
    Const,
    Module,
    Decorator,
}

impl std::fmt::Display for SymbolKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            Self::Function => "function",
            Self::Struct => "struct",
            Self::Enum => "enum",
            Self::Trait => "trait",
            Self::Impl => "impl",
            Self::TypeAlias => "type_alias",
            Self::Class => "class",
            Self::Interface => "interface",
            Self::Const => "const",
            Self::Module => "module",
            Self::Decorator => "decorator",
        };
        f.write_str(label)
    }
}

/// Parsed symbol from code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSymbol {
    pub name: String,
    pub symbol_type: SymbolKind,
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
    pub snippet: String,
    pub parent: Option<String>,
    pub children: Vec<String>,
}

/// Parse result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub file_path: String,
    pub language: String,
    pub symbols: Vec<ParsedSymbol>,
    pub imports: Vec<String>,
    pub exports: Vec<String>,
    pub errors: Vec<String>,
}

/// Search result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub file_path: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
    pub context: String,
}

// ── Symbol Construction Helper ────────────────────────────────────────

/// Build a `ParsedSymbol` from a single source line.
fn make_symbol(
    name: String,
    kind: SymbolKind,
    line_num: usize,
    line: &str,
    keyword: &str,
) -> ParsedSymbol {
    ParsedSymbol {
        name,
        symbol_type: kind,
        start_line: line_num + 1,
        start_column: line.find(keyword).unwrap_or(0),
        end_line: line_num + 1,
        end_column: line.len(),
        snippet: line.trim().to_string(),
        parent: None,
        children: Vec::new(),
    }
}

// ── Public API ────────────────────────────────────────────────────────

/// Parse a file and extract symbols.
///
/// Uses tree-sitter when a grammar is available, falls back to regex parsing.
pub fn parse_file(
    _file_path: &str,
    content: &str,
    language: &str,
) -> Result<Vec<ParsedSymbol>, ParseError> {
    if content.is_empty() {
        return Err(ParseError::EmptyInput);
    }

    // Try tree-sitter first for all supported languages
    match tree_sitter::parse_with_tree_sitter(content, language) {
        Ok(symbols) if !symbols.is_empty() => return Ok(symbols),
        Ok(_) => {} // empty result — fall through to regex
        Err(ParseError::UnsupportedLanguage(_)) => {} // no grammar — fall through
        Err(e) => return Err(e),
    }

    // Regex fallback for unsupported or empty-result languages
    let symbols = match language {
        "rust" => parse_rust_content(content),
        "typescript" | "ts" => parse_ts_js_content(content),
        "javascript" | "js" | "jsx" | "tsx" => parse_ts_js_content(content),
        "python" | "py" => parse_python_content(content),
        // Go, C, C++: tree-sitter only (no regex fallback)
        "go" | "c" | "cpp" | "c++" | "cxx" => Vec::new(),
        _ => parse_generic_content(content),
    };
    Ok(symbols)
}

/// Search for patterns in files.
///
/// **Note:** This is a stub that returns placeholder results.
/// In production it would read and grep each file on disk.
pub fn search_in_files(query: &str, files: &[&str]) -> Vec<SearchResult> {
    files
        .iter()
        .map(|file_path| SearchResult {
            file_path: (*file_path).to_string(),
            line: 1,
            column: 0,
            content: format!("Match for '{query}' in {file_path}"),
            context: String::new(),
        })
        .collect()
}

// ── Per-language parsers ──────────────────────────────────────────────

/// Parse Rust content for symbols
fn parse_rust_content(content: &str) -> Vec<ParsedSymbol> {
    content
        .lines()
        .enumerate()
        .filter_map(|(line_num, line)| {
            let trimmed = line.trim();
            if trimmed.starts_with("pub fn") || trimmed.starts_with("fn ") {
                extract_function_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Function, line_num, line, "fn"))
            } else if trimmed.starts_with("pub struct") || trimmed.starts_with("struct ") {
                extract_struct_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Struct, line_num, line, "struct"))
            } else if trimmed.starts_with("pub enum") || trimmed.starts_with("enum ") {
                extract_struct_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Enum, line_num, line, "enum"))
            } else if trimmed.starts_with("pub trait") || trimmed.starts_with("trait ") {
                extract_struct_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Trait, line_num, line, "trait"))
            } else if trimmed.starts_with("pub type") || trimmed.starts_with("type ") {
                extract_struct_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::TypeAlias, line_num, line, "type"))
            } else if trimmed.starts_with("impl ") {
                extract_impl_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Impl, line_num, line, "impl"))
            } else {
                None
            }
        })
        .collect()
}

/// Parse TypeScript/JavaScript content for symbols
fn parse_ts_js_content(content: &str) -> Vec<ParsedSymbol> {
    content
        .lines()
        .enumerate()
        .filter_map(|(line_num, line)| {
            let trimmed = line.trim();
            if trimmed.starts_with("export function") || trimmed.starts_with("function ") {
                extract_name_after_keyword(trimmed, "function")
                    .map(|name| make_symbol(name, SymbolKind::Function, line_num, line, "function"))
            } else if trimmed.starts_with("export class") || trimmed.starts_with("class ") {
                extract_class_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Class, line_num, line, "class"))
            } else if trimmed.starts_with("export interface") || trimmed.starts_with("interface ") {
                extract_class_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Interface, line_num, line, "interface"))
            } else if trimmed.starts_with("export type") || trimmed.starts_with("type ") {
                extract_class_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::TypeAlias, line_num, line, "type"))
            } else if trimmed.starts_with("export enum") || trimmed.starts_with("enum ") {
                extract_class_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Enum, line_num, line, "enum"))
            } else if trimmed.starts_with("export const") || trimmed.starts_with("const ") {
                extract_const_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Const, line_num, line, "const"))
            } else {
                None
            }
        })
        .collect()
}

/// Parse Python content for symbols
fn parse_python_content(content: &str) -> Vec<ParsedSymbol> {
    content
        .lines()
        .enumerate()
        .filter_map(|(line_num, line)| {
            let trimmed = line.trim();
            if trimmed.starts_with("def ") {
                extract_python_def_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Function, line_num, line, "def"))
            } else if trimmed.starts_with("class ") {
                extract_python_def_name(trimmed)
                    .map(|name| make_symbol(name, SymbolKind::Class, line_num, line, "class"))
            } else if trimmed.starts_with("@") && !trimmed.starts_with("@property") {
                let decorator = trimmed.trim_start_matches('@');
                let name = decorator
                    .split('(')
                    .next()
                    .unwrap_or(decorator)
                    .trim()
                    .to_string();
                Some(make_symbol(name, SymbolKind::Decorator, line_num, line, "@"))
            } else {
                None
            }
        })
        .collect()
}

/// Fallback parser for unknown languages — looks for common patterns
fn parse_generic_content(content: &str) -> Vec<ParsedSymbol> {
    content
        .lines()
        .enumerate()
        .filter_map(|(line_num, line)| {
            let trimmed = line.trim();
            for (keyword, kind) in &[
                ("function ", SymbolKind::Function),
                ("func ", SymbolKind::Function),
                ("def ", SymbolKind::Function),
                ("fn ", SymbolKind::Function),
                ("class ", SymbolKind::Class),
                ("struct ", SymbolKind::Struct),
                ("interface ", SymbolKind::Interface),
                ("enum ", SymbolKind::Enum),
                ("type ", SymbolKind::TypeAlias),
                ("trait ", SymbolKind::Trait),
                ("module ", SymbolKind::Module),
            ] {
                if trimmed.starts_with(keyword)
                    || trimmed.starts_with(&format!("pub {keyword}"))
                    || trimmed.starts_with(&format!("export {keyword}"))
                {
                    if let Some(name) = extract_name_after_keyword(trimmed, keyword) {
                        return Some(make_symbol(name, *kind, line_num, line, keyword));
                    }
                }
            }
            None
        })
        .collect()
}

// ── Name extraction helpers ───────────────────────────────────────────

/// Extract the identifier after a keyword like `fn`, `struct`, `impl`.
///
/// Handles `fn foo`, `pub fn bar`, `pub(crate) fn baz<T>`,
/// `async fn fetch()`, `const fn size()`, `pub async fn connect()`.
fn extract_name_after_keyword(line: &str, keyword: &str) -> Option<String> {
    // Strip optional prefixes one at a time using strip_prefix (not trim_start_matches
    // which would incorrectly strip "fn" from "func").
    let rest = line.trim();
    let rest = match rest.strip_prefix("pub(crate)") {
        Some(r) => r.trim(),
        None => rest,
    };
    let rest = match rest.strip_prefix("pub") {
        Some(r) => r.trim(),
        None => rest,
    };
    let rest = match rest.strip_prefix("export") {
        Some(r) => r.trim(),
        None => rest,
    };
    let rest = match rest.strip_prefix("async") {
        Some(r) => r.trim(),
        None => rest,
    };
    let rest = match rest.strip_prefix("const") {
        Some(r) => r.trim(),
        None => rest,
    };

    // Must start with the keyword followed by a space
    let after_kw = rest.strip_prefix(keyword)?;
    // keyword may or may not include trailing space
    let after_kw = after_kw.strip_prefix(' ').unwrap_or(after_kw);
    let after_kw = after_kw.trim();

    // Take identifier: alphanumeric + underscore
    let name: String = after_kw
        .chars()
        .take_while(|c| c.is_alphanumeric() || *c == '_')
        .collect();

    if name.is_empty() { None } else { Some(name) }
}

/// Extract function name from lines like `fn foo(...)`, `pub fn foo<T>(...)`.
fn extract_function_name(line: &str) -> Option<String> {
    extract_name_after_keyword(line, "fn")
}

/// Extract struct/enum/trait name from lines like `struct Foo`, `pub struct Foo<T>`.
fn extract_struct_name(line: &str) -> Option<String> {
    for kw in &["struct ", "enum ", "trait ", "type "] {
        if let Some(rest) = line.strip_prefix("pub") {
            if let Some(name) = rest.trim().strip_prefix(kw) {
                return Some(name.split_whitespace().next()?.to_string());
            }
        }
        if let Some(name) = line.strip_prefix(kw) {
            return Some(name.split_whitespace().next()?.to_string());
        }
    }
    None
}

/// Extract the type name from `impl Foo` or `impl<T> Foo`.
fn extract_impl_name(line: &str) -> Option<String> {
    let rest = line.strip_prefix("impl")?.trim();
    let rest = if rest.starts_with('<') {
        let mut depth = 0i32;
        let mut end = rest.len();
        for (i, c) in rest.char_indices() {
            match c {
                '<' => depth += 1,
                '>' => {
                    depth -= 1;
                    if depth == 0 {
                        end = i + c.len_utf8();
                        break;
                    }
                }
                _ => {}
            }
        }
        let rest = rest[end..].trim();
        rest
    } else {
        rest
    };
    let name: String = rest
        .chars()
        .take_while(|c| c.is_alphanumeric() || *c == '_')
        .collect();
    if name.is_empty() { None } else { Some(name) }
}

/// Extract class/interface name from `class Foo`, `export class Foo<T>`.
fn extract_class_name(line: &str) -> Option<String> {
    for kw in &["class ", "interface ", "enum ", "type "] {
        if let Some(rest) = line.strip_prefix("export") {
            if let Some(name) = rest.trim().strip_prefix(kw) {
                return Some(name.split_whitespace().next()?.to_string());
            }
        }
        if let Some(name) = line.strip_prefix(kw) {
            return Some(name.split_whitespace().next()?.to_string());
        }
    }
    None
}

/// Extract const name from `export const FOO = ...` or `const foo = ...`.
fn extract_const_name(line: &str) -> Option<String> {
    for prefix in &["export const ", "const "] {
        if let Some(rest) = line.strip_prefix(prefix) {
            return Some(rest.split_whitespace().next()?.to_string());
        }
    }
    None
}

/// Extract Python def/class name from `def foo(...):`, `async def bar():`, or `class Foo:`.
fn extract_python_def_name(line: &str) -> Option<String> {
    let line = line.strip_prefix("async ").unwrap_or(line);
    for prefix in &["def ", "class "] {
        if let Some(rest) = line.strip_prefix(prefix) {
            return Some(rest.split(['(', ':']).next()?.trim().to_string());
        }
    }
    None
}
// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_function_name_simple() {
        assert_eq!(extract_function_name("fn foo()"), Some("foo".into()));
    }

    #[test]
    fn extract_function_name_pub() {
        assert_eq!(extract_function_name("pub fn bar(x: i32)"), Some("bar".into()));
    }

    #[test]
    fn extract_function_name_pub_crate() {
        assert_eq!(extract_function_name("pub(crate) fn baz<T>(t: T)"), Some("baz".into()));
    }

    #[test]
    fn extract_function_name_async() {
        assert_eq!(extract_function_name("async fn fetch()"), Some("fetch".into()));
    }

    #[test]
    fn extract_function_name_const() {
        assert_eq!(extract_function_name("const fn size()"), Some("size".into()));
    }

    #[test]
    fn extract_function_name_no_keyword() {
        assert_eq!(extract_function_name("let x = 5;"), None);
    }

    #[test]
    fn extract_function_name_pub_async() {
        assert_eq!(extract_function_name("pub async fn connect()"), Some("connect".into()));
    }

    #[test]
    fn extract_struct_name_simple() {
        assert_eq!(extract_struct_name("struct Foo"), Some("Foo".into()));
    }

    #[test]
    fn extract_struct_name_pub() {
        assert_eq!(extract_struct_name("pub struct Bar"), Some("Bar".into()));
    }

    #[test]
    fn extract_struct_name_enum() {
        assert_eq!(extract_struct_name("enum Color"), Some("Color".into()));
    }

    #[test]
    fn extract_struct_name_trait() {
        assert_eq!(extract_struct_name("trait Drawable"), Some("Drawable".into()));
    }

    #[test]
    fn extract_struct_name_type() {
        assert_eq!(extract_struct_name("type Result = std::result::Result<T, E>"), Some("Result".into()));
    }

    #[test]
    fn extract_impl_name_simple() {
        assert_eq!(extract_impl_name("impl Foo"), Some("Foo".into()));
    }

    #[test]
    fn extract_impl_name_generic() {
        assert_eq!(extract_impl_name("impl<T: Display> Vec<T>"), Some("Vec".into()));
    }

    #[test]
    fn extract_impl_name_nested() {
        assert_eq!(extract_impl_name("impl<T: Clone, U> Wrapper<T, U>"), Some("Wrapper".into()));
    }

    #[test]
    fn extract_impl_name_trait() {
        assert_eq!(extract_impl_name("impl Display for MyType"), Some("Display".into()));
    }

    #[test]
    fn extract_class_name_simple() {
        assert_eq!(extract_class_name("class Widget"), Some("Widget".into()));
    }

    #[test]
    fn extract_class_name_export() {
        assert_eq!(extract_class_name("export class Button"), Some("Button".into()));
    }

    #[test]
    fn extract_class_name_interface() {
        assert_eq!(extract_class_name("interface Repository"), Some("Repository".into()));
    }

    #[test]
    fn extract_class_name_export_enum() {
        assert_eq!(extract_class_name("export enum Direction"), Some("Direction".into()));
    }

    #[test]
    fn extract_const_name_export() {
        assert_eq!(extract_const_name("export const MAX_SIZE = 1024"), Some("MAX_SIZE".into()));
    }

    #[test]
    fn extract_const_name_plain() {
        assert_eq!(extract_const_name("const DEFAULT_TIMEOUT = 30"), Some("DEFAULT_TIMEOUT".into()));
    }

    #[test]
    fn extract_python_def_function() {
        assert_eq!(extract_python_def_name("def process_data(input):"), Some("process_data".into()));
    }

    #[test]
    fn extract_python_def_class() {
        assert_eq!(extract_python_def_name("class MyAgent:"), Some("MyAgent".into()));
    }

    #[test]
    fn extract_python_def_async() {
        assert_eq!(extract_python_def_name("async def fetch_data():"), Some("fetch_data".into()));
    }

    #[test]
    fn extract_name_keyword_missing() {
        assert_eq!(extract_name_after_keyword("fn ", "fn"), None);
    }

    #[test]
    fn extract_name_keyword_pub() {
        assert_eq!(extract_name_after_keyword("pub fn main()", "fn"), Some("main".into()));
    }

    #[test]
    fn extract_name_keyword_export() {
        assert_eq!(extract_name_after_keyword("export function greet()", "function"), Some("greet".into()));
    }

    #[test]
    fn parse_rust_functions() {
        let code = "pub fn add(a: i32, b: i32) -> i32 { a + b }\nfn helper() {}";
        let symbols = parse_rust_content(code);
        assert_eq!(symbols.len(), 2);
        assert_eq!(symbols[0].name, "add");
        assert_eq!(symbols[0].symbol_type, SymbolKind::Function);
    }

    #[test]
    fn parse_rust_structs() {
        let code = "pub struct Config { pub port: u16 }";
        let symbols = parse_rust_content(code);
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].symbol_type, SymbolKind::Struct);
    }

    #[test]
    fn parse_ts_functions() {
        let code = "export function greet(name: string) { console.log(name); }";
        let symbols = parse_ts_js_content(code);
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].name, "greet");
    }

    #[test]
    fn parse_ts_classes() {
        let code = "class EventEmitter { on(event: string) {} }";
        let symbols = parse_ts_js_content(code);
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class));
    }

    #[test]
    fn parse_python_functions() {
        let code = "def process(data):\n    return data";
        let symbols = parse_python_content(code);
        assert_eq!(symbols.len(), 1);
        assert_eq!(symbols[0].name, "process");
    }

    #[test]
    fn parse_generic_function() {
        let code = "func DoSomething() {}";
        let symbols = parse_generic_content(code);
        assert!(symbols.iter().any(|s| s.name == "DoSomething"));
    }

    #[test]
    fn parse_generic_struct() {
        let code = "struct Point { x: int, y: int }";
        let symbols = parse_generic_content(code);
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Struct));
    }

    #[test]
    fn parse_generic_interface() {
        let code = "interface Repository { find(id: string): Item; }";
        let symbols = parse_generic_content(code);
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Interface));
    }

    #[test]
    fn parse_generic_empty() {
        assert!(parse_generic_content("").is_empty());
    }

    #[test]
    fn parse_file_rust() {
        let result = parse_file("test.rs", "fn main() {}", "rust");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 1);
    }

    #[test]
    fn parse_file_empty() {
        let result = parse_file("test.rs", "", "rust");
        assert!(result.is_err());
    }

    #[test]
    fn search_in_files_works() {
        let files = ["a.rs", "b.rs"];
        assert_eq!(search_in_files("TODO", &files).len(), 2);
    }

    #[test]
    fn symbol_kind_display() {
        assert_eq!(SymbolKind::Function.to_string(), "function");
        assert_eq!(SymbolKind::Decorator.to_string(), "decorator");
    }

    #[test]
    fn symbol_kind_serde() {
        let json = serde_json::to_string(&SymbolKind::Function).unwrap();
        let back: SymbolKind = serde_json::from_str(&json).unwrap();
        assert_eq!(back, SymbolKind::Function);
    }

    #[test]
    fn error_empty_input() {
        let err = parse_file("test.rs", "", "rust").unwrap_err();
        assert_eq!(err.to_string(), "empty input");
    }

    #[test]
    fn error_unsupported_language() {
        match super::tree_sitter::create_parser("brainfuck") {
            Err(e) => assert_eq!(e.to_string(), "unsupported language: brainfuck"),
            Ok(_) => panic!("expected error for unsupported language"),
        }
    }
}
