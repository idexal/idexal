//! Tree-sitter integration for accurate AST-based code parsing.
//!
//! Uses tree-sitter grammars to produce precise symbol extractions.
//! Supports: Rust, TypeScript, JavaScript, Python, Go, C, C++.
//!
//! Tree-sitter advantages over regex:
//! - Correctly ignores symbols inside strings and comments
//! - Handles multiline declarations
//! - Produces exact byte offsets and line numbers

use super::*;
use ::tree_sitter::{Language, Node, Parser};

// ── Grammar singletons ────────────────────────────────────────────────

fn rust_language() -> Language { tree_sitter_rust::LANGUAGE.into() }
fn typescript_language() -> Language { tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into() }
fn javascript_language() -> Language { tree_sitter_javascript::LANGUAGE.into() }
fn python_language() -> Language { tree_sitter_python::LANGUAGE.into() }
fn go_language() -> Language { tree_sitter_go::LANGUAGE.into() }
fn c_language() -> Language { tree_sitter_c::LANGUAGE.into() }
fn cpp_language() -> Language { tree_sitter_cpp::LANGUAGE.into() }

// ── Public API ────────────────────────────────────────────────────────

/// Initialize a tree-sitter parser for the given language.
pub fn create_parser(language: &str) -> Result<Parser, ParseError> {
    let lang = match language {
        "rust" => rust_language(),
        "typescript" | "ts" => typescript_language(),
        "javascript" | "js" | "jsx" | "tsx" => javascript_language(),
        "python" | "py" => python_language(),
        "go" => go_language(),
        "c" => c_language(),
        "cpp" | "c++" | "cxx" => cpp_language(),
        _ => return Err(ParseError::UnsupportedLanguage(language.to_string())),
    };

    let mut parser = Parser::new();
    parser
        .set_language(&lang)
        .map_err(|e| ParseError::ParseFailed {
            path: String::new(),
            reason: e.to_string(),
        })?;
    Ok(parser)
}

/// Parse code using tree-sitter and extract symbols.
pub fn parse_with_tree_sitter(
    content: &str,
    language: &str,
) -> Result<Vec<ParsedSymbol>, ParseError> {
    let mut parser = create_parser(language)?;
    let tree = parser
        .parse(content, None)
        .ok_or_else(|| ParseError::ParseFailed {
            path: String::new(),
            reason: "tree-sitter failed to parse".to_string(),
        })?;

    let root = tree.root_node();
    let mut symbols = Vec::new();
    extract_symbols(root, content, &mut symbols);
    Ok(symbols)
}

/// A syntax error extracted from the tree-sitter AST.
#[derive(Debug, Clone, serde::Serialize)]
pub struct SyntaxError {
    pub line: usize,
    pub column: usize,
    pub end_line: usize,
    pub end_column: usize,
    pub message: String,
    pub severity: String,
}

/// Walk the tree-sitter AST and collect ERROR / MISSING nodes.
pub fn get_parse_errors(
    content: &str,
    language: &str,
) -> Result<Vec<SyntaxError>, ParseError> {
    let mut parser = create_parser(language)?;
    let tree = parser
        .parse(content, None)
        .ok_or_else(|| ParseError::ParseFailed {
            path: String::new(),
            reason: "tree-sitter failed to parse".to_string(),
        })?;

    let root = tree.root_node();
    let mut errors = Vec::new();
    collect_errors(root, content, &mut errors);
    Ok(errors)
}

/// Recursively walk the AST and collect ERROR and MISSING nodes.
fn collect_errors(node: Node, source: &str, errors: &mut Vec<SyntaxError>) {
    if node.is_error() || node.is_missing() {
        let start = node.start_position();
        let end = node.end_position();
        let byte_range = node.byte_range();
        let text = if byte_range.start < source.len() && byte_range.end <= source.len() {
            &source[byte_range]
        } else {
            ""
        };

        let message = if node.is_missing() {
            format!("Missing {}", node.kind())
        } else if text.is_empty() {
            format!("Unexpected '{}'", node.kind())
        } else {
            let preview: String = text.chars().take(40).collect();
            format!("Unexpected '{}'", preview)
        };

        errors.push(SyntaxError {
            line: start.row + 1,
            column: start.column,
            end_line: end.row + 1,
            end_column: end.column,
            message,
            severity: if node.is_missing() { "error".to_string() } else { "error".to_string() },
        });
    }

    // Walk children
    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        collect_errors(child, source, errors);
    }
}

// ── Node kind mapping ─────────────────────────────────────────────────

/// Map a tree-sitter node kind to our `SymbolKind`.
fn kind_to_symbol(kind: &str) -> Option<SymbolKind> {
    match kind {
        // ── Rust ───────────────────────────────────────────────────
        "function_item" | "function_signature_item" => Some(SymbolKind::Function),
        "enum_item" => Some(SymbolKind::Enum),
        "trait_item" => Some(SymbolKind::Trait),
        "impl_item" => Some(SymbolKind::Impl),
        "type_item" => Some(SymbolKind::TypeAlias),
        "mod_item" => Some(SymbolKind::Module),
        "use_declaration" => Some(SymbolKind::Module),
        "macro_definition" => Some(SymbolKind::Function),
        "const_item" | "constant_item" => Some(SymbolKind::Const),
        "static_item" => Some(SymbolKind::Const),

        // ── Functions (TS/JS/Go/C/C++) ─────────────────────────────
        "function_declaration"
        | "generator_function_declaration"
        | "function_signature"
        | "method_declaration"
        | "function_definition" => Some(SymbolKind::Function),

        // ── Classes (TS/JS/Python/C++) ─────────────────────────────
        "class_declaration"
        | "abstract_class_declaration"
        | "class_definition"
        | "class_specifier" => Some(SymbolKind::Class),

        // ── Interfaces (TS/Go) ─────────────────────────────────────
        "interface_declaration" => Some(SymbolKind::Interface),

        // ── Type aliases (TS/C) ────────────────────────────────────
        "type_alias_declaration"
        | "type_definition" => Some(SymbolKind::TypeAlias),

        // ── Structs (Rust/C/Go) ─────────────────────────────────────
        "struct_item"
        | "union_item"
        | "struct_specifier"
        | "type_declaration"
        | "type_spec" => Some(SymbolKind::Struct),

        // ── Enums (TS/C) ───────────────────────────────────────────
        "enum_declaration"
        | "enum_specifier" => Some(SymbolKind::Enum),

        // ── Modules / namespaces (TS/Go/C++) ───────────────────────
        "internal_module"
        | "namespace_definition"
        | "module"
        | "package_clause"
        | "import_declaration" => Some(SymbolKind::Module),

        // ── Constants / variables ──────────────────────────────────
        "lexical_declaration"
        | "variable_declaration"
        | "const_spec"
        | "var_spec" => Some(SymbolKind::Const),



        // ── Python (handled specially in extract_symbols) ───────────
        "decorated_definition" => None,

        _ => None,
    }
}

// ── Symbol extraction ─────────────────────────────────────────────────

/// Recursively walk the AST and collect symbols.
fn extract_symbols(node: Node, source: &str, out: &mut Vec<ParsedSymbol>) {
    let kind = node.kind();

    // Handle decorated definitions (Python) specially
    if kind == "decorated_definition" {
        extract_decorated_definition(node, source, out);
        return;
    }

    if let Some(sym_kind) = kind_to_symbol(kind) {
        if let Some(symbol) = node_to_symbol(node, source, sym_kind) {
            out.push(symbol);
        }
    }

    // Recurse into children
    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        extract_symbols(child, source, out);
    }
}

/// Handle Python `decorated_definition`.
fn extract_decorated_definition(node: Node, source: &str, out: &mut Vec<ParsedSymbol>) {
    let decorator_name = node.child(0).map(|d| {
        let text = &source[d.start_byte()..d.end_byte()];
        text.trim_start_matches('@')
            .split('(')
            .next()
            .unwrap_or("")
            .trim()
            .to_string()
    });

    if let Some(definition) = node.child_by_field_name("definition") {
        let def_kind = match definition.kind() {
            "function_definition" => Some(SymbolKind::Function),
            "class_definition" => Some(SymbolKind::Class),
            _ => None,
        };
        if let Some(kind) = def_kind {
            if let Some(mut symbol) = node_to_symbol(definition, source, kind) {
                symbol.parent = decorator_name;
                out.push(symbol);
            }
        }
    }
}

/// Convert a tree-sitter node into a `ParsedSymbol`.
fn node_to_symbol(node: Node, source: &str, kind: SymbolKind) -> Option<ParsedSymbol> {
    let name = extract_node_name(node, source)?;
    let start_pos = node.start_position();
    let end_pos = node.end_position();

    let node_text = &source[node.start_byte()..node.end_byte()];
    let snippet = node_text
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    Some(ParsedSymbol {
        name,
        symbol_type: kind,
        start_line: start_pos.row + 1,
        start_column: start_pos.column,
        end_line: end_pos.row + 1,
        end_column: end_pos.column,
        snippet,
        parent: None,
        children: Vec::new(),
    })
}

/// Extract the name from a declaration node.
///
/// Searches:
/// 1. Field-based access (e.g., `child_by_field_name("name")` for C structs)
/// 2. Direct identifier children
/// 3. One level deeper into wrapper nodes (variable_declarator, etc.)
fn extract_node_name(node: Node, source: &str) -> Option<String> {
    // Field-based access for node types that name their identifier via a field
    for field in &["name", "left", "declarator"] {
        if let Some(child) = node.child_by_field_name(field) {
            if let Some(name) = identifier_name(child, source) {
                return Some(name);
            }
        }
    }

    // Direct children
    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        if let Some(name) = identifier_name(child, source) {
            return Some(name);
        }
        // One level deeper for wrapper nodes
        let mut child_cursor = child.walk();
        for grandchild in child.named_children(&mut child_cursor) {
            if let Some(name) = identifier_name(grandchild, source) {
                return Some(name);
            }
        }
    }
    None
}

/// Check if a node is an identifier-like node and return its text.
fn identifier_name(node: Node, source: &str) -> Option<String> {
    match node.kind() {
        "identifier"
        | "type_identifier"
        | "field_identifier"
        | "property_identifier"
        | "package_identifier"
        | "namespace_identifier" => {
            let text = &source[node.start_byte()..node.end_byte()];
            Some(text.to_string())
        }
        // Go: extract package name from import string like "fmt"
        "interpreted_string_literal" | "scoped_identifier" => {
            let text = &source[node.start_byte()..node.end_byte()];
            let cleaned = text.trim_matches('"');
            // For scoped identifiers like "fmt", take the last segment
            if let Some(last) = cleaned.rsplit('/').next() {
                Some(last.to_string())
            } else {
                Some(cleaned.to_string())
            }
        }
        _ => None,
    }
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ── Rust ──────────────────────────────────────────────────────────

    #[test]
    fn rust_parse_functions() {
        let code = "pub fn add(a: i32, b: i32) -> i32 { a + b }\nfn helper() {}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert!(funcs.len() >= 2);
        assert!(funcs.iter().any(|s| s.name == "add"));
        assert!(funcs.iter().any(|s| s.name == "helper"));
    }

    #[test]
    fn rust_parse_structs() {
        let code = "pub struct Config {\n    pub port: u16,\n    pub host: String,\n}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Struct && s.name == "Config"));
    }

    #[test]
    fn rust_parse_enums() {
        let code = "enum Shape { Circle, Rectangle }";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Enum && s.name == "Shape"));
    }

    #[test]
    fn rust_parse_traits() {
        let code = "trait Drawable { fn draw(&self); }";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Trait && s.name == "Drawable"));
    }

    #[test]
    fn rust_parse_impl_blocks() {
        let code = "impl MyStruct {\n    pub fn new() -> Self { todo!() }\n}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Impl && s.name == "MyStruct"));
    }

    #[test]
    fn rust_parse_type_aliases() {
        let code = "type Result<T> = std::result::Result<T, Error>;";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::TypeAlias && s.name == "Result"));
    }

    #[test]
    fn rust_parse_mod_items() {
        let code = "mod utils;";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Module && s.name == "utils"));
    }

    #[test]
    fn rust_parse_use_declarations() {
        let code = "use std::collections::HashMap;";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let uses: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Module).collect();
        assert_eq!(uses.len(), 1);
    }

    #[test]
    fn rust_parse_constants() {
        let code = "const MAX_SIZE: usize = 1024;";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let consts: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Const).collect();
        assert_eq!(consts.len(), 1);
        assert_eq!(consts[0].name, "MAX_SIZE");
    }

    #[test]
    fn rust_parse_static_items() {
        let code = "static DEFAULT: &str = \"hello\";";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let consts: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Const).collect();
        assert_eq!(consts.len(), 1);
        assert_eq!(consts[0].name, "DEFAULT");
    }

    #[test]
    fn rust_parse_macros() {
        let code = "macro_rules! vec { ($($x:expr),*) => { Vec::new() }; }";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        assert!(symbols.iter().any(|s| s.name == "vec"));
    }

    #[test]
    fn rust_parse_ignores_strings_and_comments() {
        let code = "// This is a comment with fn and struct keywords\nlet s = \"fn helper() {}\";\nfn real_function() {}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 1);
        assert_eq!(funcs[0].name, "real_function");
    }

    #[test]
    fn rust_line_numbers_are_correct() {
        let code = "fn first() {}\n\nfn second() {}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 2);
        assert_eq!(funcs[0].start_line, 1);
        assert_eq!(funcs[1].start_line, 3);
    }

    #[test]
    fn rust_impl_methods_not_duplicate() {
        let code = "impl Foo {\n    pub fn new() -> Self { todo!() }\n    pub fn method(&self) {}\n}";
        let symbols = parse_with_tree_sitter(code, "rust").unwrap();
        let impls: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Impl).collect();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(impls.len(), 1);
        assert_eq!(funcs.len(), 2);
    }

    // ── TypeScript ────────────────────────────────────────────────────

    #[test]
    fn ts_parse_functions() {
        let code = "export function greet(name: string) { console.log(name); }";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 1);
        assert_eq!(funcs[0].name, "greet");
    }

    #[test]
    fn ts_parse_classes() {
        let code = "class EventEmitter {\n    on(event: string) {}\n}";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class && s.name == "EventEmitter"));
    }

    #[test]
    fn ts_parse_interfaces() {
        let code = "interface Config {\n    port: number;\n}";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Interface && s.name == "Config"));
    }

    #[test]
    fn ts_parse_type_aliases() {
        let code = "type ID = string | number;";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::TypeAlias && s.name == "ID"));
    }

    #[test]
    fn ts_parse_enums() {
        let code = "enum Direction { Up, Down, Left, Right }";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Enum && s.name == "Direction"));
    }

    #[test]
    fn ts_parse_abstract_classes() {
        let code = "abstract class BaseWidget {\n    abstract render(): void;\n}";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class && s.name == "BaseWidget"));
    }

    #[test]
    fn ts_parse_namespaces() {
        let code = "namespace Utils {\n    export function helper() {}\n}";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        let modules: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Module).collect();
        assert!(modules.iter().any(|s| s.name == "Utils"));
    }

    #[test]
    fn ts_imports_and_exports() {
        let code = "import { Config } from './config';\nexport function createApp(cfg: Config) {}";
        let symbols = parse_with_tree_sitter(code, "typescript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Function && s.name == "createApp"));
    }

    // ── JavaScript ────────────────────────────────────────────────────

    #[test]
    fn js_parse_const_arrow() {
        let code = "const greet = (name) => console.log(name);";
        let symbols = parse_with_tree_sitter(code, "javascript").unwrap();
        let consts: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Const).collect();
        assert_eq!(consts.len(), 1);
        assert_eq!(consts[0].name, "greet");
    }

    #[test]
    fn js_parse_function_declaration() {
        let code = "function hello() { return 'world'; }";
        let symbols = parse_with_tree_sitter(code, "javascript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Function && s.name == "hello"));
    }

    #[test]
    fn js_parse_class() {
        let code = "class Widget { render() {} }";
        let symbols = parse_with_tree_sitter(code, "javascript").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class && s.name == "Widget"));
    }

    // ── Python ────────────────────────────────────────────────────────

    #[test]
    fn python_parse_functions() {
        let code = "def process(data):\n    return data";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 1);
        assert_eq!(funcs[0].name, "process");
    }

    #[test]
    fn python_parse_classes() {
        let code = "class Agent:\n    pass";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class && s.name == "Agent"));
    }

    #[test]
    fn python_parse_decorated_functions() {
        let code = "@staticmethod\ndef helper():\n    pass";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 1);
        assert_eq!(funcs[0].name, "helper");
        assert_eq!(funcs[0].parent.as_deref(), Some("staticmethod"));
    }

    #[test]
    fn python_parse_decorated_classes() {
        let code = "@dataclass\nclass Config:\n    name: str";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        let classes: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Class).collect();
        assert_eq!(classes.len(), 1);
        assert_eq!(classes[0].name, "Config");
        assert_eq!(classes[0].parent.as_deref(), Some("dataclass"));
    }

    #[test]
    fn python_async_functions() {
        let code = "async def fetch_data():\n    pass";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(funcs.len(), 1);
        assert_eq!(funcs[0].name, "fetch_data");
    }

    #[test]
    fn python_nested_class_methods() {
        let code = "class Agent:\n    def run(self):\n        pass\n    def stop(self):\n        pass";
        let symbols = parse_with_tree_sitter(code, "python").unwrap();
        let classes: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Class).collect();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert_eq!(classes.len(), 1);
        assert_eq!(funcs.len(), 2);
    }

    // ── Go ────────────────────────────────────────────────────────────

    #[test]
    fn go_parse_functions() {
        let code = "func Add(a int, b int) int { return a + b }";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert!(!funcs.is_empty());
        assert!(funcs.iter().any(|s| s.name == "Add"));
    }

    #[test]
    fn go_parse_methods() {
        let code = "func (s *Server) Start() error { return nil }";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert!(!funcs.is_empty());
    }

    #[test]
    fn go_parse_structs() {
        let code = "type Config struct {\n    Port int\n    Host string\n}";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Struct && s.name == "Config"));
    }

    #[test]
    fn go_parse_interfaces() {
        let code = "type Reader interface {\n    Read(p []byte) (n int, err error)\n}";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        // Go interfaces appear as type_declaration with type_spec
        let types: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Struct).collect();
        assert!(types.iter().any(|s| s.name == "Reader"));
    }

    #[test]
    fn go_parse_package() {
        let code = "package main";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        let modules: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Module).collect();
        assert!(modules.iter().any(|s| s.name == "main"));
    }

    #[test]
    fn go_parse_imports() {
        let code = "import \"fmt\"";
        let symbols = parse_with_tree_sitter(code, "go").unwrap();
        let modules: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Module).collect();
        assert!(!modules.is_empty());
    }

    // ── C ─────────────────────────────────────────────────────────────

    #[test]
    fn c_parse_functions() {
        let code = "int add(int a, int b) {\n    return a + b;\n}";
        let symbols = parse_with_tree_sitter(code, "c").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert!(!funcs.is_empty());
        assert!(funcs.iter().any(|s| s.name == "add"));
    }

    #[test]
    fn c_parse_structs() {
        let code = "struct Point {\n    int x;\n    int y;\n};";
        let symbols = parse_with_tree_sitter(code, "c").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Struct && s.name == "Point"));
    }

    #[test]
    fn c_parse_enums() {
        let code = "enum Color {\n    RED,\n    GREEN,\n    BLUE\n};";
        let symbols = parse_with_tree_sitter(code, "c").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Enum && s.name == "Color"));
    }

    #[test]
    fn c_parse_typedefs() {
        let code = "typedef struct { int x; } Point;";
        let symbols = parse_with_tree_sitter(code, "c").unwrap();
        let types: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::TypeAlias).collect();
        assert!(!types.is_empty());
    }

    // ── C++ ───────────────────────────────────────────────────────────

    #[test]
    fn cpp_parse_classes() {
        let code = "class Widget {\npublic:\n    void render();\n};";
        let symbols = parse_with_tree_sitter(code, "cpp").unwrap();
        assert!(symbols.iter().any(|s| s.symbol_type == SymbolKind::Class && s.name == "Widget"));
    }

    #[test]
    fn cpp_parse_namespaces() {
        let code = "namespace Utils {\n    int helper();\n}";
        let symbols = parse_with_tree_sitter(code, "cpp").unwrap();
        let modules: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Module).collect();
        assert!(modules.iter().any(|s| s.name == "Utils"));
    }

    #[test]
    fn cpp_parse_functions() {
        let code = "int compute(int x) {\n    return x * 2;\n}";
        let symbols = parse_with_tree_sitter(code, "cpp").unwrap();
        let funcs: Vec<_> = symbols.iter().filter(|s| s.symbol_type == SymbolKind::Function).collect();
        assert!(!funcs.is_empty());
    }

    // ── Error handling ────────────────────────────────────────────────

    #[test]
    fn unsupported_language_returns_error() {
        let result = parse_with_tree_sitter("code", "brainfuck");
        assert!(result.is_err());
        match result.unwrap_err() {
            ParseError::UnsupportedLanguage(lang) => assert_eq!(lang, "brainfuck"),
            other => panic!("expected UnsupportedLanguage, got {other:?}"),
        }
    }

    #[test]
    fn empty_input_returns_empty() {
        let symbols = parse_with_tree_sitter("", "rust").unwrap();
        assert!(symbols.is_empty());
    }

    #[test]
    fn create_parser_returns_ok() {
        for lang in &["rust", "typescript", "python", "go", "c", "cpp", "js"] {
            assert!(create_parser(lang).is_ok(), "failed for {lang}");
        }
    }

    #[test]
    fn create_parser_aliases() {
        for lang in &["ts", "jsx", "tsx", "py", "c++", "cxx"] {
            assert!(create_parser(lang).is_ok(), "failed for {lang}");
        }
    }
}
