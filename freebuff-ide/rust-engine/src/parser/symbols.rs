//! Symbol extraction utilities

use super::*;

/// Extract all symbols from a file
pub fn extract_all_symbols(
    file_path: &str,
    content: &str,
) -> Result<Vec<ParsedSymbol>, String> {
    let language = detect_language_from_path(file_path);
    parse_file(file_path, content, &language)
}

/// Detect language from file path
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

/// Get symbol type emoji
pub fn get_symbol_emoji(symbol_type: &str) -> &str {
    match symbol_type {
        "function" => "ƒ",
        "class" => "C",
        "struct" => "S",
        "interface" => "I",
        "enum" => "E",
        "variable" => "V",
        "module" => "M",
        "impl" => "⌊",
        _ => "?",
    }
}

/// Sort symbols by relevance
pub fn sort_symbols_by_relevance(
    symbols: &mut Vec<ParsedSymbol>,
    query: &str,
) {
    let query_lower = query.to_lowercase();
    
    symbols.sort_by(|a, b| {
        let a_score = calculate_relevance_score(a, &query_lower);
        let b_score = calculate_relevance_score(b, &query_lower);
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });
}

/// Calculate relevance score for a symbol
fn calculate_relevance_score(symbol: &ParsedSymbol, query: &str) -> f64 {
    let name_lower = symbol.name.to_lowercase();
    let mut score = 0.0;
    
    // Exact match
    if name_lower == query {
        score += 100.0;
    }
    
    // Starts with query
    if name_lower.starts_with(query) {
        score += 50.0;
    }
    
    // Contains query
    if name_lower.contains(query) {
        score += 25.0;
    }
    
    // Partial match
    for part in query.split_whitespace() {
        if name_lower.contains(part) {
            score += 10.0;
        }
    }
    
    score
}
