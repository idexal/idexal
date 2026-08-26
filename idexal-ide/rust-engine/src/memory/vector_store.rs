//! Vector store for semantic similarity search

use std::collections::HashMap;

pub struct VectorStore {
    vectors: Vec<VectorEntry>,
}

struct VectorEntry {
    id: String,
    text: String,
    #[expect(dead_code, reason = "stored for future filtering/ranking")]
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
    
    /// Search for similar texts using simple keyword matching.
    ///
    /// In production, this would use actual vector embeddings.
    /// Returns an empty vec when `query` is empty or whitespace-only.
    pub fn search(&self, query: &str, limit: usize) -> Vec<(String, f64)> {
        let query_words: Vec<&str> = query.split_whitespace().collect();

        if query_words.is_empty() {
            return Vec::new();
        }

        let mut results: Vec<(String, f64)> = self
            .vectors
            .iter()
            .map(|entry| {
                let text_lower = entry.text.to_lowercase();
                let score = query_words
                    .iter()
                    .filter(|word| text_lower.contains(*word))
                    .count() as f64
                    / query_words.len() as f64;
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

#[cfg(test)]
mod tests {
    use super::*;

    fn filled_store() -> VectorStore {
        let mut store = VectorStore::new();
        store.add("1".into(), "rust ownership borrowing lifetimes".into(), HashMap::new());
        store.add("2".into(), "python django flask web".into(), HashMap::new());
        store.add("3".into(), "rust async tokio concurrency".into(), HashMap::new());
        store
    }

    #[test]
    fn search_finds_matching_entries() {
        let store = filled_store();
        let results = store.search("rust", 10);
        assert_eq!(results.len(), 2); // entries 1 and 3
        assert!(results.iter().all(|(_, score)| *score > 0.0));
    }

    #[test]
    fn search_respects_limit() {
        let store = filled_store();
        let results = store.search("rust", 1);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn search_no_match() {
        let store = filled_store();
        let results = store.search("java", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn search_empty_query_returns_empty() {
        let store = filled_store();
        let results = store.search("", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn search_whitespace_only_returns_empty() {
        let store = filled_store();
        let results = store.search("   ", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn search_empty_store() {
        let store = VectorStore::new();
        let results = store.search("anything", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn count_tracks_entries() {
        let mut store = VectorStore::new();
        assert_eq!(store.count(), 0);
        store.add("a".into(), "text".into(), HashMap::new());
        assert_eq!(store.count(), 1);
    }

    #[test]
    fn clear_removes_all() {
        let mut store = filled_store();
        store.clear();
        assert_eq!(store.count(), 0);
    }

    #[test]
    fn search_ranks_by_relevance() {
        let mut store = VectorStore::new();
        store.add("1".into(), "rust".into(), HashMap::new());
        store.add("2".into(), "rust async tokio".into(), HashMap::new());
        let results = store.search("rust async", 10);
        // Entry 2 should rank higher (matches both words)
        assert!(results[0].1 >= results[1].1);
    }
}
