//! Symbol extraction utilities

use super::*;

#[allow(dead_code, reason = "utility for future CLI integration")]
pub fn extract_all_symbols(
    file_path: &str,
    content: &str,
) -> Result<Vec<ParsedSymbol>, ParseError> {
    let language = detect_language_from_path(file_path);
    parse_file(file_path, content, &language)
}

#[allow(dead_code, reason = "utility for future CLI integration")]
pub fn detect_language_from_path(file_path: &str) -> String {
    let ext = std::path::Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    match ext {
        "rs" => "rust".to_string(),
        "ts" | "tsx" => "typescript".to_string(),
        "js" | "jsx" => "javascript".to_string(),
        "py" => "python".to_string(),
        "go" => "go".to_string(),
        "c" | "h" => "c".to_string(),
        "cpp" | "hpp" => "cpp".to_string(),
        "java" => "java".to_string(),
        _ => "plaintext".to_string(),
    }
}

#[allow(dead_code, reason = "utility for future CLI integration")]
pub fn get_symbol_emoji(kind: SymbolKind) -> &'static str {
    match kind {
        SymbolKind::Function => "ƒ",
        SymbolKind::Class => "C",
        SymbolKind::Struct => "S",
        SymbolKind::Interface => "I",
        SymbolKind::Enum => "E",
        SymbolKind::Module => "M",
        SymbolKind::Impl => "⌊",
        SymbolKind::Trait => "△",
        SymbolKind::TypeAlias => "≡",
        SymbolKind::Const => "⊞",
        SymbolKind::Decorator => "@",
    }
}

#[allow(dead_code, reason = "utility for future CLI integration")]
pub fn sort_symbols_by_relevance(
    symbols: &mut [ParsedSymbol],
    query: &str,
) {
    let query_lower = query.to_lowercase();
    symbols.sort_by(|a, b| {
        let a_score = calculate_relevance_score(a, &query_lower);
        let b_score = calculate_relevance_score(b, &query_lower);
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });
}

#[allow(dead_code, reason = "utility for future CLI integration")]
fn calculate_relevance_score(symbol: &ParsedSymbol, query: &str) -> f64 {
    let name_lower = symbol.name.to_lowercase();
    let mut score = 0.0;

    if name_lower == query {
        score += 100.0;
    }
    if name_lower.starts_with(query) {
        score += 50.0;
    }
    if name_lower.contains(query) {
        score += 25.0;
    }
    for part in query.split_whitespace() {
        if name_lower.contains(part) {
            score += 10.0;
        }
    }
    score
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_language_rust() {
        assert_eq!(detect_language_from_path("src/main.rs"), "rust");
    }

    #[test]
    fn detect_language_typescript() {
        assert_eq!(detect_language_from_path("app.ts"), "typescript");
        assert_eq!(detect_language_from_path("comp.tsx"), "typescript");
    }

    #[test]
    fn detect_language_javascript() {
        assert_eq!(detect_language_from_path("index.js"), "javascript");
        assert_eq!(detect_language_from_path("App.jsx"), "javascript");
    }

    #[test]
    fn detect_language_python() {
        assert_eq!(detect_language_from_path("script.py"), "python");
    }

    #[test]
    fn detect_language_unknown() {
        assert_eq!(detect_language_from_path("file.xyz"), "plaintext");
    }

    #[test]
    fn get_symbol_emoji_all_types() {
        assert_eq!(get_symbol_emoji(SymbolKind::Function), "ƒ");
        assert_eq!(get_symbol_emoji(SymbolKind::Class), "C");
        assert_eq!(get_symbol_emoji(SymbolKind::Struct), "S");
        assert_eq!(get_symbol_emoji(SymbolKind::Interface), "I");
        assert_eq!(get_symbol_emoji(SymbolKind::Enum), "E");
        assert_eq!(get_symbol_emoji(SymbolKind::Trait), "△");
    }

    #[test]
    fn sort_by_relevance_exact_match_first() {
        let mut symbols = vec![
            ParsedSymbol { name: "process_data".into(), symbol_type: SymbolKind::Function, start_line: 1, start_column: 0, end_line: 1, end_column: 0, snippet: String::new(), parent: None, children: vec![] },
            ParsedSymbol { name: "process".into(), symbol_type: SymbolKind::Function, start_line: 1, start_column: 0, end_line: 1, end_column: 0, snippet: String::new(), parent: None, children: vec![] },
        ];
        sort_symbols_by_relevance(&mut symbols, "process");
        assert_eq!(symbols[0].name, "process");
    }

    #[test]
    fn extract_all_symbols_dispatches() {
        let result = extract_all_symbols("main.rs", "fn main() {}");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 1);
    }
}
