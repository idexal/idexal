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
use thiserror::Error;
use uuid::Uuid;

pub mod project_memory;
pub mod conversation;
pub mod code_index;
pub mod vector_store;

pub use code_index::CodeIndex;
pub use conversation::ConversationMemory;
pub use project_memory::ProjectMemory;
pub use vector_store::VectorStore;

// ── Error type ───────────────────────────────────────────────────────

/// Errors produced by memory operations.
#[derive(Error, Debug)]
#[non_exhaustive]
pub enum MemoryError {
    #[error("entry not found: {id}")]
    NotFound { id: String },

    #[error("duplicate entry: {key}")]
    Duplicate { key: String },

    #[error("capacity exceeded: {0}")]
    CapacityExceeded(String),

    #[error("storage failure: {0}")]
    Storage(String),

    #[error("serialization error: {0}")]
    Serialization(String),
}

/// Convenience alias for memory operations.
pub type MemoryResult<T> = Result<T, MemoryError>;

// ── Types ────────────────────────────────────────────────────────────

/// Memory entry types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
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

/// Memory store trait.
pub trait MemoryStore: Send + Sync {
    /// Add a memory entry.
    fn add(&self, entry: MemoryEntry) -> MemoryResult<()>;

    /// Get a memory entry by ID.
    fn get(&self, id: &str) -> Option<MemoryEntry>;

    /// Search memory entries.
    fn search(&self, query: &str) -> Vec<MemoryEntry>;

    /// Delete a memory entry.
    fn delete(&self, id: &str) -> MemoryResult<()>;

    /// Get all entries of a specific type.
    fn get_by_type(&self, memory_type: MemoryType) -> Vec<MemoryEntry>;

    /// Clear all entries.
    fn clear(&self) -> MemoryResult<()>;
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── create_memory_entry ───────────────────────────────────────────

    #[test]
    fn create_memory_entry_generates_unique_id() {
        let a = create_memory_entry(MemoryType::Project, "k1".into(), "v1".into(), HashMap::new());
        let b = create_memory_entry(MemoryType::Project, "k1".into(), "v1".into(), HashMap::new());
        assert_ne!(a.id, b.id);
    }

    #[test]
    fn create_memory_entry_sets_fields() {
        let mut meta = HashMap::new();
        meta.insert("source".into(), "test".into());

        let entry = create_memory_entry(MemoryType::UserPreference, "theme".into(), "dark".into(), meta.clone());

        assert_eq!(entry.memory_type, MemoryType::UserPreference);
        assert_eq!(entry.key, "theme");
        assert_eq!(entry.value, "dark");
        assert_eq!(entry.metadata.get("source").unwrap(), "test");
        assert!(entry.relevance.is_none());
        assert_eq!(entry.created_at, entry.updated_at);
    }

    #[test]
    fn create_memory_entry_serde_roundtrip() {
        let entry = create_memory_entry(MemoryType::Conversation, "k".into(), "v".into(), HashMap::new());
        let json = serde_json::to_string(&entry).unwrap();
        let back: MemoryEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(entry.id, back.id);
        assert_eq!(entry.key, back.key);
        assert_eq!(entry.memory_type, back.memory_type);
    }

    // ── MemoryType serde ──────────────────────────────────────────────

    #[test]
    fn memory_type_serde_roundtrip() {
        for mt in [MemoryType::Project, MemoryType::Conversation, MemoryType::CodeIndex, MemoryType::UserPreference] {
            let json = serde_json::to_string(&mt).unwrap();
            let back: MemoryType = serde_json::from_str(&json).unwrap();
            assert_eq!(mt, back);
        }
    }

    #[test]
    fn memory_type_snake_case_variants() {
        assert_eq!(serde_json::to_string(&MemoryType::Project).unwrap(), "\"project\"");
        assert_eq!(serde_json::to_string(&MemoryType::Conversation).unwrap(), "\"conversation\"");
        assert_eq!(serde_json::to_string(&MemoryType::UserPreference).unwrap(), "\"user_preference\"");
    }

    // ── create_code_symbol ────────────────────────────────────────────

    #[test]
    fn create_code_symbol_sets_fields() {
        let sym = create_code_symbol(
            "main".into(),
            SymbolType::Function,
            "src/main.rs".into(),
            10,
            4,
            "fn main() {}".into(),
        );

        assert_eq!(sym.name, "main");
        assert_eq!(sym.symbol_type, SymbolType::Function);
        assert_eq!(sym.file_path, "src/main.rs");
        assert_eq!(sym.line, 10);
        assert_eq!(sym.column, 4);
        assert_eq!(sym.snippet, "fn main() {}");
        assert!(sym.references.is_empty());
    }

    #[test]
    fn create_code_symbol_serde_roundtrip() {
        let sym = create_code_symbol(
            "foo".into(),
            SymbolType::Class,
            "a.ts".into(),
            1,
            0,
            "class Foo".into(),
        );
        let json = serde_json::to_string(&sym).unwrap();
        let back: CodeSymbol = serde_json::from_str(&json).unwrap();
        assert_eq!(sym.name, back.name);
        assert_eq!(sym.symbol_type, back.symbol_type);
    }

    // ── SymbolType serde ──────────────────────────────────────────────

    #[test]
    fn symbol_type_serde_roundtrip() {
        let variants = [
            SymbolType::Function,
            SymbolType::Class,
            SymbolType::Interface,
            SymbolType::Variable,
            SymbolType::Module,
            SymbolType::Struct,
            SymbolType::Enum,
            SymbolType::Trait,
        ];
        for st in variants {
            let json = serde_json::to_string(&st).unwrap();
            let back: SymbolType = serde_json::from_str(&json).unwrap();
            assert_eq!(st, back);
        }
    }

    // ── ProjectContext serde ──────────────────────────────────────────

    #[test]
    fn project_context_serde_roundtrip() {
        let ctx = ProjectContext {
            root_path: "/project".into(),
            name: "Test".into(),
            description: "desc".into(),
            languages: vec!["rust".into()],
            frameworks: vec!["tokio".into()],
            symbols: vec![],
            last_indexed: Utc::now(),
        };
        let json = serde_json::to_string(&ctx).unwrap();
        let back: ProjectContext = serde_json::from_str(&json).unwrap();
        assert_eq!(ctx.name, back.name);
        assert_eq!(ctx.languages, back.languages);
    }

    // ── MemoryError ──────────────────────────────────────────────────

    #[test]
    fn memory_error_messages_are_lowercase() {
        let cases = [
            (MemoryError::NotFound { id: "x".into() }, "entry not found: x"),
            (MemoryError::Duplicate { key: "k".into() }, "duplicate entry: k"),
            (MemoryError::CapacityExceeded("full".into()), "capacity exceeded: full"),
            (MemoryError::Storage("disk".into()), "storage failure: disk"),
            (MemoryError::Serialization("bad json".into()), "serialization error: bad json"),
        ];
        for (err, expected) in cases {
            assert_eq!(err.to_string(), expected);
        }
    }

    #[test]
    fn memory_type_serde_snake_case() {
        let json = serde_json::to_string(&MemoryType::CodeIndex).unwrap();
        assert_eq!(json, "\"code_index\"");
    }

    #[test]
    fn memory_result_type_alias() {
        let ok: MemoryResult<i32> = Ok(42);
        match ok {
            Ok(v) => assert_eq!(v, 42),
            Err(_) => panic!("expected Ok"),
        }

        let err: MemoryResult<()> = Err(MemoryError::NotFound { id: "1".into() });
        assert!(err.is_err());
    }
}
