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
    pub fn index_file(&mut self, file_path: String, symbols: Vec<CodeSymbol>) {
        let start_idx = self.symbols.len();
        
        for symbol in symbols {
            self.file_index
                .entry(symbol.file_path.clone())
                .or_insert_with(Vec::new)
                .push(self.symbols.len());
            
            self.symbols.push(symbol);
        }
    }
    
    /// Search symbols by name
    pub fn search_by_name(&self, query: &str) -> Vec<&CodeSymbol> {
        let query_lower = query.to_lowercase();
        
        self.symbols.iter()
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
