//! # Trait Hierarchy for Idexal Engine
//!
//! This module defines the core trait abstractions used throughout the engine.
//! Traits enable polymorphic behavior while maintaining zero-cost abstractions
//! through static dispatch where possible.
//!
//! ## Design Principles
//!
//! - Prefer generics (static dispatch) for performance-critical paths
//! - Use `dyn Trait` only when heterogeneous collections are needed
//! - Document all trait methods with examples
//! - Keep trait bounds minimal — require only what's needed

use std::collections::HashMap;
use std::future::Future;
use std::path::Path;
use std::pin::Pin;

// ══════════════════════════════════════════════════════════════════════
// PARSER TRAIT
// ══════════════════════════════════════════════════════════════════════

/// Result type for parser operations.
pub type ParseResult<T> = Result<T, ParseError>;

/// Errors that can occur during parsing.
#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    /// Unsupported language for this parser.
    #[error("unsupported language: {0}")]
    UnsupportedLanguage(String),

    /// Syntax error in the source code.
    #[error("syntax error at line {line}: {message}")]
    SyntaxError { line: usize, message: String },

    /// I/O error reading the file.
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// Tree-sitter parsing failed.
    #[error("tree-sitter parse error: {0}")]
    TreeSitter(String),
}

/// A parsed symbol extracted from source code.
#[derive(Debug, Clone, PartialEq)]
pub struct Symbol {
    /// Symbol name (e.g., function name, struct name).
    pub name: String,
    /// Kind of symbol (function, struct, enum, etc.).
    pub kind: SymbolKind,
    /// Line number where the symbol is defined.
    pub line: usize,
    /// Column number where the symbol starts.
    pub column: usize,
    /// File path where the symbol is defined.
    pub file_path: String,
    /// Optional documentation comment.
    pub documentation: Option<String>,
    /// Symbol signature (e.g., function signature).
    pub signature: Option<String>,
}

/// Types of symbols that can be extracted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SymbolKind {
    Function,
    Struct,
    Enum,
    Trait,
    Impl,
    TypeAlias,
    Const,
    Module,
    Interface,
    Class,
    Decorator,
}

impl std::fmt::Display for SymbolKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Function => write!(f, "function"),
            Self::Struct => write!(f, "struct"),
            Self::Enum => write!(f, "enum"),
            Self::Trait => write!(f, "trait"),
            Self::Impl => write!(f, "impl"),
            Self::TypeAlias => write!(f, "type"),
            Self::Const => write!(f, "const"),
            Self::Module => write!(f, "module"),
            Self::Interface => write!(f, "interface"),
            Self::Class => write!(f, "class"),
            Self::Decorator => write!(f, "decorator"),
        }
    }
}

/// Trait for language-specific parsers.
///
/// Each parser extracts symbols from source code in a specific language.
/// Parsers should be stateless and thread-safe for concurrent use.
///
/// # Example
///
/// ```rust,no_run
/// use idexal_engine::traits::{Parser, Symbol, SymbolKind};
/// use std::path::Path;
///
/// struct RustParser;
///
/// impl Parser for RustParser {
///     fn language(&self) -> &str { "rust" }
///     fn file_extensions(&self) -> &[&str] { &["rs"] }
///     fn parse(&self, _path: &Path, _content: &str) -> idexal_engine::traits::ParseResult<Vec<Symbol>> {
///         Ok(vec![])
///     }
/// }
/// ```
pub trait Parser: Send + Sync {
    /// Returns the language this parser handles (e.g., "rust", "typescript").
    fn language(&self) -> &str;

    /// Returns file extensions this parser supports (e.g., ["rs"], ["ts", "tsx"]).
    fn file_extensions(&self) -> &[&str];

    /// Parse source code and extract symbols.
    ///
    /// # Arguments
    /// * `path` - File path (used for error messages and symbol tracking)
    /// * `content` - Source code content to parse
    ///
    /// # Returns
    /// A list of symbols extracted from the source code.
    fn parse(&self, path: &Path, content: &str) -> ParseResult<Vec<Symbol>>;

    /// Check if this parser can handle the given file extension.
    fn can_parse(&self, extension: &str) -> bool {
        self.file_extensions().contains(&extension)
    }
}

/// A registry of parsers for different languages.
pub struct ParserRegistry {
    parsers: Vec<Box<dyn Parser>>,
}

impl ParserRegistry {
    /// Create a new empty registry.
    pub fn new() -> Self {
        Self { parsers: Vec::new() }
    }

    /// Register a parser for a language.
    pub fn register(&mut self, parser: Box<dyn Parser>) {
        self.parsers.push(parser);
    }

    /// Find a parser for the given file extension.
    pub fn find_for_extension(&self, extension: &str) -> Option<&dyn Parser> {
        self.parsers.iter().find(|p| p.can_parse(extension)).map(|p| p.as_ref())
    }

    /// Get all registered languages.
    pub fn languages(&self) -> Vec<&str> {
        self.parsers.iter().map(|p| p.language()).collect()
    }
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ══════════════════════════════════════════════════════════════════════
// MEMORY STORE TRAIT
// ══════════════════════════════════════════════════════════════════════

/// A memory entry stored in the memory system.
#[derive(Debug, Clone)]
pub struct MemoryEntry {
    /// Unique identifier for this entry.
    pub id: String,
    /// Key for lookup (e.g., "user:settings:theme").
    pub key: String,
    /// Stored value.
    pub value: String,
    /// Category for grouping (e.g., "task", "error", "pattern").
    pub category: String,
    /// Importance level.
    pub importance: Importance,
    /// Tags for filtering.
    pub tags: Vec<String>,
    /// Number of times this entry has been accessed.
    pub access_count: u64,
    /// When this entry was created.
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// When this entry was last accessed.
    pub last_accessed: chrono::DateTime<chrono::Utc>,
}

/// Importance levels for memory entries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Importance {
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3,
}

/// Search results from memory.
#[derive(Debug)]
pub struct MemorySearchResult {
    /// The matching entry.
    pub entry: MemoryEntry,
    /// Relevance score (0.0 to 1.0).
    pub score: f64,
}

/// Trait for persistent memory storage.
///
/// Memory stores provide key-value storage with search capabilities.
/// Implementations can use different backends (in-memory, IndexedDB, etc.).
///
/// # Example
///
/// ```rust,no_run
/// use idexal_engine::traits::{MemoryStore, Importance};
///
/// # async fn example(store: &dyn MemoryStore) {
/// store.set("code", "auth", "jwt-secret", Importance::High).await.unwrap();
/// let results = store.search("jwt").await.unwrap();
/// # }
/// ```
#[async_trait::async_trait]
pub trait MemoryStore: Send + Sync {
    /// Store a memory entry.
    ///
    /// # Arguments
    /// * `category` - Category for grouping
    /// * `key` - Unique key within the category
    /// * `value` - Value to store
    /// * `importance` - Importance level
    async fn set(
        &self,
        category: &str,
        key: &str,
        value: &str,
        importance: Importance,
    ) -> Result<MemoryEntry, Box<dyn std::error::Error + Send + Sync>>;

    /// Get a memory entry by ID.
    async fn get(&self, id: &str) -> Result<Option<MemoryEntry>, Box<dyn std::error::Error + Send + Sync>>;

    /// Search memory entries by query.
    async fn search(&self, query: &str) -> Result<Vec<MemorySearchResult>, Box<dyn std::error::Error + Send + Sync>>;

    /// Delete a memory entry by ID.
    async fn delete(&self, id: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>>;

    /// Get all entries in a category.
    async fn get_by_category(&self, category: &str) -> Result<Vec<MemoryEntry>, Box<dyn std::error::Error + Send + Sync>>;

    /// Clear all entries.
    async fn clear(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;

    /// Get the number of entries.
    async fn count(&self) -> Result<usize, Box<dyn std::error::Error + Send + Sync>>;
}

// ══════════════════════════════════════════════════════════════════════
// VECTOR STORE TRAIT
// ══════════════════════════════════════════════════════════════════════

/// A vector embedding for semantic search.
#[derive(Debug, Clone)]
pub struct Embedding {
    /// Text content this embedding represents.
    pub text: String,
    /// The embedding vector.
    pub vector: Vec<f32>,
    /// Optional metadata.
    pub metadata: HashMap<String, String>,
}

/// Trait for vector similarity search.
///
/// Vector stores enable semantic search by comparing embedding vectors.
/// Used for code search, document retrieval, and RAG pipelines.
pub trait VectorStore: Send + Sync {
    /// Add an embedding to the store.
    fn add(&mut self, embedding: Embedding);

    /// Search for similar embeddings.
    ///
    /// # Arguments
    /// * `query` - Query embedding vector
    /// * `limit` - Maximum number of results
    ///
    /// # Returns
    /// A list of (text, similarity_score) pairs, sorted by relevance.
    fn search(&self, query: &[f32], limit: usize) -> Vec<(String, f64)>;

    /// Clear all embeddings.
    fn clear(&mut self);

    /// Get the number of embeddings.
    fn count(&self) -> usize;
}

// ══════════════════════════════════════════════════════════════════════
// CODE INDEX TRAIT
// ══════════════════════════════════════════════════════════════════════

/// A symbol in the code index.
#[derive(Debug, Clone)]
pub struct IndexedSymbol {
    /// Symbol name.
    pub name: String,
    /// Symbol kind.
    pub kind: SymbolKind,
    /// File path where defined.
    pub file_path: String,
    /// Line number.
    pub line: usize,
    /// Signature.
    pub signature: Option<String>,
}

/// Trait for code indexing and symbol search.
///
/// Code indexes enable fast symbol lookup across the project.
/// Used for go-to-definition, find references, and autocomplete.
pub trait CodeIndex: Send + Sync {
    /// Index a file's symbols.
    fn index_file(&mut self, path: &str, symbols: Vec<IndexedSymbol>);

    /// Search symbols by name.
    fn search_by_name(&self, query: &str) -> Vec<&IndexedSymbol>;

    /// Get all symbols in a file.
    fn get_by_file(&self, path: &str) -> Vec<&IndexedSymbol>;

    /// Clear the index.
    fn clear(&mut self);

    /// Get index statistics.
    fn stats(&self) -> IndexStats;
}

/// Statistics about a code index.
#[derive(Debug, Clone)]
pub struct IndexStats {
    /// Total number of indexed symbols.
    pub total_symbols: usize,
    /// Number of indexed files.
    pub total_files: usize,
    /// Symbols by kind.
    pub by_kind: HashMap<String, usize>,
}

// ══════════════════════════════════════════════════════════════════════
// AI PROVIDER TRAIT
// ══════════════════════════════════════════════════════════════════════

/// A message in a conversation.
#[derive(Debug, Clone)]
pub struct Message {
    /// Role (user, assistant, system).
    pub role: String,
    /// Message content.
    pub content: String,
}

/// Response from an AI provider.
#[derive(Debug, Clone)]
pub struct AiResponse {
    /// Generated content.
    pub content: String,
    /// Model used.
    pub model: String,
    /// Tokens used (input, output).
    pub tokens: (u32, u32),
    /// Whether the response was truncated.
    pub truncated: bool,
}

/// Trait for AI provider integration.
///
/// AI providers generate text responses from conversation context.
/// Implementations handle API calls, streaming, and error recovery.
///
/// # Example
///
/// ```rust
/// use idexal_engine::traits::{AiProvider, Message, AiResponse};
///
/// struct OpenAiProvider { api_key: String }
///
/// #[async_trait::async_trait]
/// impl AiProvider for OpenAiProvider {
///     fn name(&self) -> &str { "openai" }
///     async fn generate(&self, messages: &[Message], model: &str) -> Result<AiResponse, Box<dyn std::error::Error + Send + Sync>> {
///         // Call OpenAI API...
///         Ok(AiResponse { content: "Hello!".into(), model: model.into(), tokens: (10, 5), truncated: false })
///     }
/// }
/// ```
#[async_trait::async_trait]
pub trait AiProvider: Send + Sync {
    /// Provider name (e.g., "openai", "anthropic").
    fn name(&self) -> &str;

    /// Generate a response from conversation messages.
    async fn generate(
        &self,
        messages: &[Message],
        model: &str,
    ) -> Result<AiResponse, Box<dyn std::error::Error + Send + Sync>>;

    /// Stream a response (optional override).
    ///
    /// Default implementation calls `generate` and yields the full response.
    async fn stream(
        &self,
        messages: &[Message],
        model: &str,
    ) -> Result<Pin<Box<dyn Future<Output = Result<String, Box<dyn std::error::Error + Send + Sync>>> + Send>>, Box<dyn std::error::Error + Send + Sync>> {
        let response = self.generate(messages, model).await?;
        Ok(Box::pin(async move { Ok(response.content) }))
    }

    /// Check if the provider is available.
    async fn health_check(&self) -> bool {
        true
    }
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ── Parser Registry Tests ─────────────────────────────────────

    struct MockParser { lang: String, exts: Vec<String> }

    impl Parser for MockParser {
        fn language(&self) -> &str { &self.lang }
        fn file_extensions(&self) -> &[&str] {
            // Return static slice — for tests we leak
            Box::leak(self.exts.iter().map(|s| s.as_str()).collect::<Vec<_>>().into_boxed_slice())
        }
        fn parse(&self, _path: &Path, _content: &str) -> ParseResult<Vec<Symbol>> {
            Ok(vec![])
        }
    }

    #[test]
    fn parser_registry_finds_correct_parser() {
        let mut registry = ParserRegistry::new();
        registry.register(Box::new(MockParser { lang: "rust".into(), exts: vec!["rs".into()] }));
        registry.register(Box::new(MockParser { lang: "typescript".into(), exts: vec!["ts".into(), "tsx".into()] }));

        assert_eq!(registry.find_for_extension("rs").unwrap().language(), "rust");
        assert_eq!(registry.find_for_extension("ts").unwrap().language(), "typescript");
        assert!(registry.find_for_extension("py").is_none());
    }

    #[test]
    fn parser_registry_lists_languages() {
        let mut registry = ParserRegistry::new();
        registry.register(Box::new(MockParser { lang: "rust".into(), exts: vec!["rs".into()] }));
        registry.register(Box::new(MockParser { lang: "python".into(), exts: vec!["py".into()] }));

        let langs = registry.languages();
        assert!(langs.contains(&"rust"));
        assert!(langs.contains(&"python"));
    }

    // ── Symbol Tests ──────────────────────────────────────────────

    #[test]
    fn symbol_kind_display() {
        assert_eq!(SymbolKind::Function.to_string(), "function");
        assert_eq!(SymbolKind::Struct.to_string(), "struct");
        assert_eq!(SymbolKind::Trait.to_string(), "trait");
    }

    // ── Importance Tests ──────────────────────────────────────────

    #[test]
    fn importance_ordering() {
        assert!(Importance::Low < Importance::Medium);
        assert!(Importance::Medium < Importance::High);
        assert!(Importance::High < Importance::Critical);
    }

    // ── Symbol Tests ──────────────────────────────────────────────

    #[test]
    fn symbol_equality() {
        let s1 = Symbol {
            name: "main".into(),
            kind: SymbolKind::Function,
            line: 1,
            column: 0,
            file_path: "src/main.rs".into(),
            documentation: None,
            signature: Some("fn main()".into()),
        };
        let s2 = Symbol {
            name: "main".into(),
            kind: SymbolKind::Function,
            line: 1,
            column: 0,
            file_path: "src/main.rs".into(),
            documentation: None,
            signature: Some("fn main()".into()),
        };
        assert_eq!(s1, s2);
    }

    #[test]
    fn symbol_kind_all_variants_display() {
        let kinds = [
            SymbolKind::Function, SymbolKind::Struct, SymbolKind::Enum,
            SymbolKind::Trait, SymbolKind::Impl, SymbolKind::TypeAlias,
            SymbolKind::Const, SymbolKind::Module, SymbolKind::Interface,
            SymbolKind::Class, SymbolKind::Decorator,
        ];
        for kind in &kinds {
            assert!(!kind.to_string().is_empty());
        }
    }

    // ── ParserRegistry Edge Cases ─────────────────────────────────

    #[test]
    fn parser_can_parse_extension() {
        let parser = MockParser { lang: "rust".into(), exts: vec!["rs".into()] };
        assert!(parser.can_parse("rs"));
        assert!(!parser.can_parse("py"));
    }

    #[test]
    fn parser_registry_empty() {
        let registry = ParserRegistry::new();
        assert!(registry.find_for_extension("rs").is_none());
        assert!(registry.languages().is_empty());
    }

    // ── IndexStats Tests ──────────────────────────────────────────

    #[test]
    fn index_stats_creation() {
        let mut by_kind = HashMap::new();
        by_kind.insert("function".into(), 10);
        by_kind.insert("struct".into(), 5);

        let stats = IndexStats {
            total_symbols: 15,
            total_files: 3,
            by_kind,
        };

        assert_eq!(stats.total_symbols, 15);
        assert_eq!(stats.total_files, 3);
        assert_eq!(stats.by_kind["function"], 10);
    }

    // ── Embedding Tests ───────────────────────────────────────────

    #[test]
    fn embedding_creation() {
        let mut metadata = HashMap::new();
        metadata.insert("source".into(), "test".into());

        let embedding = Embedding {
            text: "hello world".into(),
            vector: vec![0.1, 0.2, 0.3],
            metadata,
        };

        assert_eq!(embedding.text, "hello world");
        assert_eq!(embedding.vector.len(), 3);
        assert_eq!(embedding.metadata["source"], "test");
    }

    // ── MemoryEntry Tests ─────────────────────────────────────────

    #[test]
    fn memory_entry_creation() {
        let entry = MemoryEntry {
            id: "test-id".into(),
            key: "user:settings:theme".into(),
            value: "dark".into(),
            category: "settings".into(),
            importance: Importance::Medium,
            tags: vec!["ui".into()],
            access_count: 0,
            created_at: chrono::Utc::now(),
            last_accessed: chrono::Utc::now(),
        };

        assert_eq!(entry.id, "test-id");
        assert_eq!(entry.importance, Importance::Medium);
        assert!(entry.tags.contains(&"ui".to_string()));
    }

    // ── Message and AiResponse Tests ──────────────────────────────

    #[test]
    fn message_creation() {
        let msg = Message {
            role: "user".into(),
            content: "Hello".into(),
        };
        assert_eq!(msg.role, "user");
    }

    #[test]
    fn ai_response_creation() {
        let resp = AiResponse {
            content: "Hi there!".into(),
            model: "gpt-4o".into(),
            tokens: (10, 5),
            truncated: false,
        };
        assert_eq!(resp.content, "Hi there!");
        assert_eq!(resp.tokens, (10, 5));
        assert!(!resp.truncated);
    }
}
