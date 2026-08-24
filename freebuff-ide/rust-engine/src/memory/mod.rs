//! Memory system for Idexal IDE
//!
//! This module provides:
//! - Project memory (understands codebase structure)
//! - Conversation memory (context across sessions)
//! - Code index (semantic code search)
//! - Vector store for similarity search

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub mod project_memory;
pub mod conversation;
pub mod code_index;
pub mod vector_store;

/// Memory entry types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MemoryType {
    Project,
    Conversation,
    CodeIndex,
    UserPreference,
}

/// Memory entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: String,
    pub memory_type: MemoryType,
    pub key: String,
    pub value: String,
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub relevance: Option<f64>,
}

/// Code symbol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSymbol {
    pub name: String,
    pub symbol_type: SymbolType,
    pub file_path: String,
    pub line: usize,
    pub column: usize,
    pub snippet: String,
    pub references: Vec<String>,
}

/// Symbol types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SymbolType {
    Function,
    Class,
    Interface,
    Variable,
    Module,
    Struct,
    Enum,
    Trait,
}

/// Project context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub root_path: String,
    pub name: String,
    pub description: String,
    pub languages: Vec<String>,
    pub frameworks: Vec<String>,
    pub symbols: Vec<CodeSymbol>,
    pub last_indexed: DateTime<Utc>,
}

/// Memory store trait
pub trait MemoryStore: Send + Sync {
    /// Add a memory entry
    fn add(&self, entry: MemoryEntry) -> Result<(), String>;
    
    /// Get a memory entry by ID
    fn get(&self, id: &str) -> Option<MemoryEntry>;
    
    /// Search memory entries
    fn search(&self, query: &str) -> Vec<MemoryEntry>;
    
    /// Delete a memory entry
    fn delete(&self, id: &str) -> Result<(), String>;
    
    /// Get all entries of a specific type
    fn get_by_type(&self, memory_type: MemoryType) -> Vec<MemoryEntry>;
    
    /// Clear all entries
    fn clear(&self) -> Result<(), String>;
}

/// Create a new memory entry
pub fn create_memory_entry(
    memory_type: MemoryType,
    key: String,
    value: String,
    metadata: HashMap<String, String>,
) -> MemoryEntry {
    let now = Utc::now();
    MemoryEntry {
        id: Uuid::new_v4().to_string(),
        memory_type,
        key,
        value,
        metadata,
        created_at: now,
        updated_at: now,
        relevance: None,
    }
}

/// Create a new code symbol
pub fn create_code_symbol(
    name: String,
    symbol_type: SymbolType,
    file_path: String,
    line: usize,
    column: usize,
    snippet: String,
) -> CodeSymbol {
    CodeSymbol {
        name,
        symbol_type,
        file_path,
        line,
        column,
        snippet,
        references: Vec::new(),
    }
}
