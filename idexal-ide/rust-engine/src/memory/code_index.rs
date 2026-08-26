//! Code index module - indexes code for fast search

use super::*;
use std::collections::HashMap;

pub struct CodeIndex {
    symbols: Vec<CodeSymbol>,
    file_index: HashMap<String, Vec<usize>>,
}

impl CodeIndex {
    pub fn new() -> Self {
        Self {
            symbols: Vec::new(),
            file_index: HashMap::new(),
        }
    }
    
    /// Index a file's symbols
    pub fn index_file(&mut self, _file_path: String, symbols: Vec<CodeSymbol>) {
        for symbol in symbols {
            self.file_index
                .entry(symbol.file_path.clone())
                .or_default()
                .push(self.symbols.len());
            self.symbols.push(symbol);
        }
    }
    
    /// Search symbols by name
    pub fn search_by_name(&self, query: &str) -> Vec<&CodeSymbol> {
        let query_lower = query.to_lowercase();
        self.symbols
            .iter()
            .filter(|s| s.name.to_lowercase().contains(&query_lower))
            .collect()
    }
    
    /// Get symbols by file
    pub fn get_by_file(&self, file_path: &str) -> Vec<&CodeSymbol> {
        self.file_index.get(file_path)
            .map(|indices| {
                indices.iter()
                    .filter_map(|&idx| self.symbols.get(idx))
                    .collect()
            })
            .unwrap_or_default()
    }
    
    /// Get all symbols
    pub fn get_all(&self) -> &[CodeSymbol] {
        &self.symbols
    }
    
    /// Clear the index
    pub fn clear(&mut self) {
        self.symbols.clear();
        self.file_index.clear();
    }
    
    /// Get statistics
    pub fn stats(&self) -> serde_json::Value {
        serde_json::json!({
            "total_symbols": self.symbols.len(),
            "total_files": self.file_index.len(),
        })
    }
}

impl Default for CodeIndex {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_symbol(name: &str, file: &str) -> CodeSymbol {
        create_code_symbol(
            name.into(),
            SymbolType::Function,
            file.into(),
            1,
            0,
            format!("fn {name}()"),
        )
    }

    #[test]
    fn index_and_search_by_name() {
        let mut idx = CodeIndex::new();
        let syms = vec![make_test_symbol("parse_config", "src/config.rs")];
        idx.index_file("src/config.rs".into(), syms);

        let found = idx.search_by_name("parse");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "parse_config");
    }

    #[test]
    fn search_by_name_case_insensitive() {
        let mut idx = CodeIndex::new();
        idx.index_file("f.rs".into(), vec![make_test_symbol("MyStruct", "f.rs")]);
        assert_eq!(idx.search_by_name("mystruct").len(), 1);
    }

    #[test]
    fn search_by_name_no_match() {
        let idx = CodeIndex::new();
        assert!(idx.search_by_name("nonexistent").is_empty());
    }

    #[test]
    fn get_by_file() {
        let mut idx = CodeIndex::new();
        idx.index_file("a.rs".into(), vec![make_test_symbol("fn_a", "a.rs")]);
        idx.index_file("b.rs".into(), vec![make_test_symbol("fn_b", "b.rs")]);

        assert_eq!(idx.get_by_file("a.rs").len(), 1);
        assert_eq!(idx.get_by_file("b.rs").len(), 1);
        assert!(idx.get_by_file("c.rs").is_empty());
    }

    #[test]
    fn get_all_returns_all_symbols() {
        let mut idx = CodeIndex::new();
        idx.index_file("f.rs".into(), vec![
            make_test_symbol("a", "f.rs"),
            make_test_symbol("b", "f.rs"),
        ]);
        assert_eq!(idx.get_all().len(), 2);
    }

    #[test]
    fn clear_removes_everything() {
        let mut idx = CodeIndex::new();
        idx.index_file("f.rs".into(), vec![make_test_symbol("x", "f.rs")]);
        idx.clear();
        assert_eq!(idx.get_all().len(), 0);
        assert!(idx.get_by_file("f.rs").is_empty());
    }

    #[test]
    fn stats_reports_correct_counts() {
        let mut idx = CodeIndex::new();
        idx.index_file("a.rs".into(), vec![make_test_symbol("a", "a.rs")]);
        idx.index_file("b.rs".into(), vec![
            make_test_symbol("b1", "b.rs"),
            make_test_symbol("b2", "b.rs"),
        ]);
        let stats = idx.stats();
        assert_eq!(stats["total_symbols"], 3);
        assert_eq!(stats["total_files"], 2);
    }
}
