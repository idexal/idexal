//! Conversation memory module - stores and retrieves conversation context

use super::*;

pub struct ConversationMemory {
    conversations: Vec<MemoryEntry>,
    max_entries: usize,
}

impl ConversationMemory {
    pub fn new(max_entries: usize) -> Self {
        Self {
            conversations: Vec::new(),
            max_entries,
        }
    }
    
    /// Add a conversation entry
    pub fn add_entry(&mut self, entry: MemoryEntry) {
        self.conversations.push(entry);
        
        // Remove oldest entries if we exceed max
        if self.conversations.len() > self.max_entries {
            let excess = self.conversations.len() - self.max_entries;
            self.conversations.drain(0..excess);
        }
    }
    
    /// Search conversations
    pub fn search(&self, query: &str) -> Vec<&MemoryEntry> {
        let query_lower = query.to_lowercase();
        
        self.conversations.iter()
            .filter(|e| {
                e.key.to_lowercase().contains(&query_lower) ||
                e.value.to_lowercase().contains(&query_lower)
            })
            .collect()
    }
    
    /// Get recent conversations
    pub fn get_recent(&self, limit: usize) -> &[MemoryEntry] {
        let start = self.conversations.len().saturating_sub(limit);
        &self.conversations[start..]
    }
    
    /// Clear all conversations
    pub fn clear(&mut self) {
        self.conversations.clear();
    }
    
    /// Get conversation count
    pub fn count(&self) -> usize {
        self.conversations.len()
    }
}

impl Default for ConversationMemory {
    fn default() -> Self {
        Self::new(1000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(key: &str, value: &str) -> MemoryEntry {
        create_memory_entry(
            MemoryType::Conversation,
            key.into(),
            value.into(),
            HashMap::new(),
        )
    }

    #[test]
    fn add_and_count() {
        let mut mem = ConversationMemory::new(10);
        assert_eq!(mem.count(), 0);
        mem.add_entry(entry("k1", "v1"));
        mem.add_entry(entry("k2", "v2"));
        assert_eq!(mem.count(), 2);
    }

    #[test]
    fn respects_max_entries() {
        let mut mem = ConversationMemory::new(2);
        mem.add_entry(entry("a", "1"));
        mem.add_entry(entry("b", "2"));
        mem.add_entry(entry("c", "3"));
        assert_eq!(mem.count(), 2);
        // Oldest ("a") should be evicted
        let recent = mem.get_recent(2);
        assert!(recent.iter().any(|e| e.key == "b"));
        assert!(recent.iter().any(|e| e.key == "c"));
    }

    #[test]
    fn search_finds_by_key_or_value() {
        let mut mem = ConversationMemory::new(10);
        mem.add_entry(entry("topic", "rust ownership"));
        mem.add_entry(entry("other", "python tips"));

        let results = mem.search("rust");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].value, "rust ownership");
    }

    #[test]
    fn search_case_insensitive() {
        let mut mem = ConversationMemory::new(10);
        mem.add_entry(entry("k", "RUST"));
        assert_eq!(mem.search("rust").len(), 1);
    }

    #[test]
    fn search_no_match() {
        let mut mem = ConversationMemory::new(10);
        mem.add_entry(entry("k", "value"));
        assert!(mem.search("missing").is_empty());
    }

    #[test]
    fn get_recent_limits_output() {
        let mut mem = ConversationMemory::new(10);
        for i in 0..5 {
            mem.add_entry(entry(&format!("k{i}"), &format!("v{i}")));
        }
        assert_eq!(mem.get_recent(3).len(), 3);
    }

    #[test]
    fn clear_empties_all() {
        let mut mem = ConversationMemory::new(10);
        mem.add_entry(entry("k", "v"));
        mem.clear();
        assert_eq!(mem.count(), 0);
    }
}
