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
