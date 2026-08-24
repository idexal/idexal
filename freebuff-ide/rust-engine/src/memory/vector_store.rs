//! Vector store for semantic similarity search

use super::*;
use std::collections::HashMap;

pub struct VectorStore {
    vectors: Vec<VectorEntry>,
}

struct VectorEntry {
    id: String,
    text: String,
    metadata: HashMap<String, String>,
}

impl VectorStore {
    pub fn new() -> Self {
        Self {
            vectors: Vec::new(),
        }
    }
    
    /// Add a vector to the store
    pub fn add(&mut self, id: String, text: String, metadata: HashMap<String, String>) {
        self.vectors.push(VectorEntry { id, text, metadata });
    }
    
    /// Search for similar texts using simple keyword matching
    /// In production, this would use actual vector embeddings
    pub fn search(&self, query: &str, limit: usize) -> Vec<(String, f64)> {
        let query_lower = query.to_lowercase();
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();
        
        let mut results: Vec<(String, f64)> = self.vectors.iter()
            .map(|entry| {
                let text_lower = entry.text.to_lowercase();
                let score = query_words.iter()
                    .filter(|word| text_lower.contains(*word))
                    .count() as f64 / query_words.len() as f64;
                (entry.id.clone(), score)
            })
            .filter(|(_, score)| *score > 0.0)
            .collect();
        
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);
        results
    }
    
    /// Clear the store
    pub fn clear(&mut self) {
        self.vectors.clear();
    }
    
    /// Get count
    pub fn count(&self) -> usize {
        self.vectors.len()
    }
}

impl Default for VectorStore {
    fn default() -> Self {
        Self::new()
    }
}
