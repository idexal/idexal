// Idexal Core — long-term memory
//
// Persistent SQLite store so agents carry knowledge across sessions:
// facts learned, decisions made, user preferences, and session summaries.
// Schema ported from
// reference/ai-core-node-reference/src/memory/sqliteStore.ts.
//
// Retrieval is lexical (keyword overlap + recency boost). Semantic recall
// via embeddings is a later milestone; the schema already reserves the
// table so adding it won't require a migration of existing rows.

use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MemoryKind {
    Fact,
    Decision,
    Preference,
    Session,
}

impl MemoryKind {
    pub fn as_str(self) -> &'static str {
        match self {
            MemoryKind::Fact => "fact",
            MemoryKind::Decision => "decision",
            MemoryKind::Preference => "preference",
            MemoryKind::Session => "session",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "fact" => Some(MemoryKind::Fact),
            "decision" => Some(MemoryKind::Decision),
            "preference" => Some(MemoryKind::Preference),
            "session" => Some(MemoryKind::Session),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct MemoryRecord {
    pub id: i64,
    pub kind: String,
    pub content: String,
    pub project: Option<String>,
    pub created_at: i64,
}

pub struct Memory {
    conn: Connection,
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

/// Tokenize for the lexical index: lowercase, split on anything that isn't
/// alphanumeric, drop 1-char noise. Unicode-aware so Arabic content is
/// indexed as words rather than one blob.
fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.chars().count() > 1)
        .map(|t| t.to_string())
        .collect()
}

impl Memory {
    /// Open (and migrate) the store at `~/.idexal/memory.db`, or an
    /// explicit path — tests pass a temp file.
    pub fn open(path: Option<PathBuf>) -> Result<Self, String> {
        let path = match path {
            Some(p) => p,
            None => {
                let home = crate::config::home_dir().ok_or("cannot resolve home directory")?;
                let dir = home.join(".idexal");
                std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
                dir.join("memory.db")
            }
        };
        let conn = Connection::open(&path).map_err(|e| format!("cannot open {}: {e}", path.display()))?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    /// Schema is deliberately identical to the previous Node implementation
    /// (`type`, not `kind`; `last_accessed_at NOT NULL`) so an existing
    /// ~/.idexal/memory.db keeps working and its memories carry forward
    /// instead of being orphaned by the rewrite.
    fn migrate(&self) -> Result<(), String> {
        self.conn
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    project TEXT,
                    created_at INTEGER NOT NULL,
                    last_accessed_at INTEGER NOT NULL,
                    access_count INTEGER NOT NULL DEFAULT 0,
                    keywords TEXT NOT NULL DEFAULT ''
                );
                CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
                CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project);
                CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

                CREATE TABLE IF NOT EXISTS memory_embeddings (
                    memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
                    dimension INTEGER NOT NULL,
                    model TEXT,
                    vector TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                );",
            )
            .map_err(|e| format!("migration failed: {e}"))
    }

    pub fn remember(
        &self,
        kind: MemoryKind,
        content: &str,
        project: Option<&str>,
    ) -> Result<i64, String> {
        let keywords = tokenize(content).join(" ");
        let now = now_secs();
        self.conn
            .execute(
                "INSERT INTO memories (type, content, project, keywords, created_at, last_accessed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![kind.as_str(), content, project, keywords, now, now],
            )
            .map_err(|e| format!("remember failed: {e}"))?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Lexical recall: score by keyword overlap with a recency boost, then
    /// return the top `limit`. Bumps access stats for what it returns so
    /// frequently-useful memories can be prioritized later.
    pub fn recall(&self, query: &str, project: Option<&str>, limit: usize) -> Result<Vec<MemoryRecord>, String> {
        let query_tokens = tokenize(query);
        if query_tokens.is_empty() {
            return Ok(Vec::new());
        }

        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, type, content, project, keywords, created_at FROM memories
                 WHERE (?1 IS NULL OR project IS NULL OR project = ?1)",
            )
            .map_err(|e| format!("recall prepare failed: {e}"))?;

        let rows = stmt
            .query_map(params![project], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            })
            .map_err(|e| format!("recall query failed: {e}"))?;

        let now = now_secs();
        let mut scored: Vec<(f64, MemoryRecord)> = Vec::new();
        for row in rows.flatten() {
            let (id, kind, content, proj, keywords, created_at) = row;
            let stored: Vec<&str> = keywords.split_whitespace().collect();
            if stored.is_empty() {
                continue;
            }
            let overlap = query_tokens.iter().filter(|t| stored.contains(&t.as_str())).count();
            if overlap == 0 {
                continue;
            }
            let base = overlap as f64 / query_tokens.len() as f64;
            // Recency boost decaying over a week, matching the reference
            // implementation's weighting.
            let age_days = ((now - created_at) as f64 / 86_400.0).max(0.0);
            let recency = (1.0 - (age_days / 7.0)).max(0.0) * 0.3;
            scored.push((
                base + recency,
                MemoryRecord { id, kind, content, project: proj, created_at },
            ));
        }

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(limit);

        let ids: Vec<i64> = scored.iter().map(|(_, r)| r.id).collect();
        for id in &ids {
            let _ = self.conn.execute(
                "UPDATE memories SET last_accessed_at = ?1, access_count = access_count + 1 WHERE id = ?2",
                params![now, id],
            );
        }

        Ok(scored.into_iter().map(|(_, r)| r).collect())
    }

    pub fn count(&self) -> Result<i64, String> {
        self.conn
            .query_row("SELECT COUNT(*) FROM memories", [], |r| r.get(0))
            .map_err(|e| format!("count failed: {e}"))
    }

    /// Render recalled memories as a system-prompt block. Returns None when
    /// nothing is relevant, so the prompt isn't padded with an empty header.
    pub fn context_block(&self, query: &str, project: Option<&str>, limit: usize) -> Option<String> {
        let records = self.recall(query, project, limit).ok()?;
        if records.is_empty() {
            return None;
        }
        let mut out = String::from("## ذاكرة طويلة المدى (من جلسات سابقة)\n");
        for r in records {
            out.push_str(&format!("- [{}] {}\n", r.kind, r.content));
        }
        Some(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(tag: &str) -> PathBuf {
        std::env::temp_dir().join(format!("idexal-mem-{}-{}.db", tag, std::process::id()))
    }

    #[test]
    fn remembers_and_recalls_by_keyword() {
        let path = temp_db("recall");
        let _ = std::fs::remove_file(&path);
        let mem = Memory::open(Some(path.clone())).unwrap();

        mem.remember(MemoryKind::Fact, "The build command is cargo build --release", None).unwrap();
        mem.remember(MemoryKind::Fact, "Coffee is a beverage unrelated to anything", None).unwrap();

        let hits = mem.recall("what is the build command", None, 5).unwrap();
        assert!(!hits.is_empty(), "expected a lexical match");
        assert!(hits[0].content.contains("cargo build"), "best match should be the build fact");

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn recall_returns_nothing_when_no_keywords_overlap() {
        let path = temp_db("nomatch");
        let _ = std::fs::remove_file(&path);
        let mem = Memory::open(Some(path.clone())).unwrap();
        mem.remember(MemoryKind::Fact, "deployment uses docker compose", None).unwrap();

        let hits = mem.recall("zzzz qqqq", None, 5).unwrap();
        assert!(hits.is_empty());

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn arabic_content_is_tokenized_as_words() {
        // Regression guard: a naive ASCII-only tokenizer would index Arabic
        // text as a single unsplittable blob, making recall impossible for
        // the project's primary language.
        let tokens = tokenize("أمر البناء هو cargo build");
        assert!(tokens.contains(&"البناء".to_string()), "Arabic words must tokenize: {tokens:?}");
        assert!(tokens.contains(&"cargo".to_string()));

        let path = temp_db("arabic");
        let _ = std::fs::remove_file(&path);
        let mem = Memory::open(Some(path.clone())).unwrap();
        mem.remember(MemoryKind::Preference, "المستخدم يفضل الردود بالعربية", None).unwrap();
        let hits = mem.recall("بأي لغة يفضل المستخدم الردود", None, 5).unwrap();
        assert!(!hits.is_empty(), "Arabic recall must work");

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn context_block_is_none_when_nothing_relevant() {
        let path = temp_db("block");
        let _ = std::fs::remove_file(&path);
        let mem = Memory::open(Some(path.clone())).unwrap();
        assert!(mem.context_block("anything", None, 5).is_none());

        mem.remember(MemoryKind::Decision, "we chose rust for the core engine", None).unwrap();
        let block = mem.context_block("why rust for the core", None, 5).unwrap();
        assert!(block.contains("rust"));
        assert!(block.contains("decision"));

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn opens_a_database_created_by_the_previous_node_implementation() {
        // Regression: the first Rust schema used `kind` where the shipped
        // Node store used `type`. Against a fresh temp DB every test
        // passed, but opening a REAL pre-existing ~/.idexal/memory.db
        // failed at migration ("no such column: kind") and took long-term
        // memory down completely. This recreates the legacy schema
        // verbatim so that can't regress.
        let path = temp_db("legacy");
        let _ = std::fs::remove_file(&path);
        {
            let legacy = Connection::open(&path).unwrap();
            legacy
                .execute_batch(
                    "CREATE TABLE memories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        type TEXT NOT NULL,
                        content TEXT NOT NULL,
                        project TEXT,
                        created_at INTEGER NOT NULL,
                        last_accessed_at INTEGER NOT NULL,
                        access_count INTEGER NOT NULL DEFAULT 0,
                        keywords TEXT NOT NULL DEFAULT ''
                    );
                    CREATE TABLE memory_embeddings (
                        memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
                        dimension INTEGER NOT NULL,
                        model TEXT,
                        vector TEXT NOT NULL,
                        updated_at INTEGER NOT NULL
                    );",
                )
                .unwrap();
            legacy
                .execute(
                    "INSERT INTO memories (type, content, project, created_at, last_accessed_at, keywords)
                     VALUES ('fact', 'legacy memory about deployment pipeline', NULL, 1, 1, 'legacy memory about deployment pipeline')",
                    [],
                )
                .unwrap();
        }

        let mem = Memory::open(Some(path.clone())).expect("must open a legacy database");
        assert_eq!(mem.count().unwrap(), 1, "pre-existing memories must survive");

        let hits = mem.recall("deployment pipeline", None, 5).unwrap();
        assert!(!hits.is_empty(), "legacy rows must be recallable");

        // And new writes must still work against the legacy table.
        mem.remember(MemoryKind::Fact, "new memory written by the rust core", None).unwrap();
        assert_eq!(mem.count().unwrap(), 2);

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn project_scoped_memories_do_not_leak_across_projects() {
        let path = temp_db("scope");
        let _ = std::fs::remove_file(&path);
        let mem = Memory::open(Some(path.clone())).unwrap();
        mem.remember(MemoryKind::Fact, "alpha uses webpack bundler", Some("alpha")).unwrap();
        mem.remember(MemoryKind::Fact, "beta uses vite bundler", Some("beta")).unwrap();

        let hits = mem.recall("which bundler", Some("alpha"), 5).unwrap();
        assert!(hits.iter().all(|h| h.project.as_deref() != Some("beta")), "beta memories must not surface for alpha");

        drop(mem);
        let _ = std::fs::remove_file(&path);
    }
}
