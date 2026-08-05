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
use std::path::{Path, PathBuf};
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

/// Which project a memory belongs to.
///
/// This used to be the *current directory's* name, which quietly made the
/// store useless: an agent working in `idexal/core` filed its memories
/// under "core", and the same user at the repository root searched for
/// "idexal" and found none of them. Every subdirectory and every scratch
/// folder became its own island.
///
/// The repository root is the identity a developer actually means by "this
/// project", so walk up for `.git` first. Only when there is no repository
/// at all does the directory's own name stand in.
pub fn project_for(cwd: &Path) -> Option<String> {
    let mut dir = Some(cwd);
    while let Some(d) = dir {
        if d.join(".git").exists() {
            return d.file_name().map(|n| n.to_string_lossy().to_string());
        }
        dir = d.parent();
    }
    cwd.file_name().map(|n| n.to_string_lossy().to_string())
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

/// Fold the spellings of a word that Arabic writes several ways.
///
/// Without this, recall is exact-match only and the store's claim to
/// support Arabic is hollow: `الإعدادات` and `الاعدادات` are the same word
/// to a reader and two unrelated tokens to a string comparison. Diacritics
/// are optional in ordinary writing, alef carries four forms, and final
/// ة/ه and ى/ي are written interchangeably.
fn normalize(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter(|c| {
            // Tashkeel (fatha…sukun, dagger alef) and tatweel are
            // decoration; they change nothing about which word this is.
            !matches!(*c, '\u{064B}'..='\u{0652}' | '\u{0670}' | '\u{0640}')
        })
        .map(|c| match c {
            'أ' | 'إ' | 'آ' | 'ٱ' => 'ا',
            'ة' => 'ه',
            'ى' => 'ي',
            'ؤ' => 'و',
            'ئ' => 'ي',
            other => other,
        })
        .collect()
}

/// Arabic attaches the article and conjunctions to the front of a word and
/// inflects the back, so `المزودين` and `مزود` share no characters at either
/// end. Longest affix first, and never cut below a 3-character stem —
/// shorter than that stops being the same word.
const PREFIXES: [&str; 10] = ["وبال", "فبال", "بال", "كال", "فال", "وال", "لل", "ال", "و", "ب"];
const SUFFIXES: [&str; 11] = ["اتها", "ياته", "ات", "ان", "ين", "ون", "ية", "ها", "هم", "هن", "نا"];
const MIN_STEM: usize = 3;

fn stem(token: &str) -> String {
    let mut s = token.to_string();
    for prefix in PREFIXES {
        if s.starts_with(prefix) && s.chars().count() - prefix.chars().count() >= MIN_STEM {
            s = s[prefix.len()..].to_string();
            break;
        }
    }
    for suffix in SUFFIXES {
        if s.ends_with(suffix) && s.chars().count() - suffix.chars().count() >= MIN_STEM {
            s.truncate(s.len() - suffix.len());
            break;
        }
    }
    // English plurals, the one inflection worth the same treatment.
    if s.len() > MIN_STEM + 1 && s.ends_with('s') && !s.ends_with("ss") {
        s.pop();
    }
    s
}

/// One word reduced to the form both the index and a query agree on.
/// Idempotent, which is what lets it be applied to keywords that were
/// written before it existed.
fn fold(token: &str) -> String {
    stem(&normalize(token))
}

/// Tokenize for the lexical index: normalize spelling, split on anything
/// that isn't alphanumeric, drop 1-char noise, then reduce each word to its
/// stem so an inflected query still finds what was stored.
fn tokenize(text: &str) -> Vec<String> {
    normalize(text)
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| t.chars().count() > 1)
        .map(fold)
        .filter(|t| !t.is_empty())
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
            // Stored keywords are re-folded on read rather than trusted as
            // written. Rows indexed before normalization and stemming
            // existed hold raw words, and comparing a folded query against
            // them would quietly lose every memory the user already had.
            // fold() is idempotent, so new rows are unaffected.
            // Split on whitespace *and* commas: the previous Node store
            // joined keywords with commas, so a whitespace-only split saw
            // "always,use,tabs" as one token that matched nothing. Every
            // memory carried over from that store was unreachable.
            let stored: Vec<String> = keywords
                .split(|c: char| c.is_whitespace() || c == ',')
                .filter(|t| !t.is_empty())
                .map(fold)
                .collect();
            if stored.is_empty() {
                continue;
            }
            let overlap = query_tokens.iter().filter(|t| stored.contains(t)).count();
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
    /// Move every memory from one project label to another.
    ///
    /// Memories written before `project_for` looked for the repository root
    /// carry whatever folder was current at the time — `core`, `src`, a
    /// scratch directory. Which of those belong to which project is not
    /// something the store can infer, and guessing would silently merge
    /// unrelated work. So it is an explicit command the user runs, not a
    /// migration that happens to their data behind their back.
    pub fn rescope(&self, from: &str, to: &str) -> Result<usize, String> {
        let changed = self
            .conn
            .execute("UPDATE memories SET project = ?2 WHERE project = ?1", params![from, to])
            .map_err(|e| format!("rescope failed: {e}"))?;
        Ok(changed)
    }

    /// Every project label in the store, with how many memories each holds —
    /// so a user can see where their memories actually went before moving
    /// any of them.
    pub fn projects(&self) -> Result<Vec<(Option<String>, i64)>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT project, COUNT(*) FROM memories GROUP BY project ORDER BY COUNT(*) DESC")
            .map_err(|e| format!("projects prepare failed: {e}"))?;
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, Option<String>>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| format!("projects query failed: {e}"))?;
        Ok(rows.flatten().collect())
    }

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
    fn a_subdirectory_belongs_to_the_same_project_as_its_repository_root() {
        // The bug this replaces: the project was the *current directory's*
        // name, so an agent working in `idexal/core` filed memories under
        // "core" while the user at the root searched "idexal" and found
        // nothing. Measured on a real store — every memory was stranded
        // under whichever folder happened to be current.
        let root = std::env::temp_dir().join(format!("idexal-proj-{}", std::process::id()));
        let nested = root.join("core").join("src");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&nested).unwrap();
        std::fs::create_dir_all(root.join(".git")).unwrap();

        let expected = root.file_name().unwrap().to_string_lossy().to_string();
        assert_eq!(project_for(&root).as_deref(), Some(expected.as_str()));
        assert_eq!(
            project_for(&nested).as_deref(),
            Some(expected.as_str()),
            "a subdirectory must resolve to the repository, not to itself"
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn a_folder_outside_any_repository_still_gets_a_name() {
        // No .git anywhere up the tree: fall back to the folder itself
        // rather than returning nothing and scoping memories to "global".
        let solo = std::env::temp_dir().join(format!("idexal-solo-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&solo);
        std::fs::create_dir_all(&solo).unwrap();
        assert_eq!(project_for(&solo), solo.file_name().map(|n| n.to_string_lossy().to_string()));
        let _ = std::fs::remove_dir_all(&solo);
    }

    #[test]
    fn comma_separated_keywords_from_the_previous_store_still_match() {
        // The Node implementation joined keywords with commas. Splitting on
        // whitespace alone turned "always,use,tabs" into one token that
        // matched nothing, so every memory carried over from it was
        // unreachable — confirmed on the real database.
        let path = temp_db("comma-keywords");
        let _ = std::fs::remove_file(&path);
        let m = Memory::open(Some(path.clone())).unwrap();
        m.conn
            .execute(
                "INSERT INTO memories (type, content, project, keywords, created_at, last_accessed_at)
                 VALUES ('fact', 'Always use tabs.', NULL, 'always,use,tabs', ?1, ?1)",
                params![now_secs()],
            )
            .unwrap();

        let hits = m.recall("tabs", None, 5).unwrap();
        assert!(!hits.is_empty(), "comma-joined keywords must still be searchable");
        assert_eq!(hits[0].content, "Always use tabs.");

        drop(m);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn arabic_spelling_variants_fold_to_the_same_token() {
        // Diacritics are optional and alef has four written forms, so the
        // same word arrives spelled several ways depending on who typed it.
        assert_eq!(fold("الإعدادات"), fold("الاعدادات"));
        assert_eq!(fold("مُزَوِّد"), fold("مزود"));
        assert_eq!(fold("مكتبة"), fold("مكتبه"));
        assert_eq!(fold("مصطفى"), fold("مصطفي"));
    }

    #[test]
    fn arabic_prefixes_and_suffixes_are_stripped_to_a_shared_stem() {
        // The article and conjunctions attach to the word, so an inflected
        // query and a bare stored word share no characters at either end.
        let stem_of = |w: &str| fold(w);
        assert_eq!(stem_of("المزودين"), stem_of("مزود"));
        assert_eq!(stem_of("والملفات"), stem_of("ملف"));
        assert_eq!(stem_of("بالذاكرة"), stem_of("ذاكره"));
    }

    #[test]
    fn stemming_never_eats_a_short_word() {
        // Over-stemming is worse than none: it collides unrelated words.
        // Nothing may be cut below three characters.
        for word in ["ولد", "بيت", "الف", "علم"] {
            assert!(fold(word).chars().count() >= 3, "{word} -> {}", fold(word));
        }
        // And an English word that merely ends in the same letters is safe.
        assert_eq!(fold("class"), "class", "ss is not a plural");
    }

    #[test]
    fn an_inflected_arabic_query_finds_what_was_stored_plainly() {
        // The whole point, end to end: the user writes a sentence, later
        // asks about it in a different grammatical form, and still finds it.
        let path = temp_db("arabic-recall");
        let _ = std::fs::remove_file(&path);
        let m = Memory::open(Some(path.clone())).unwrap();
        m.remember(MemoryKind::Decision, "قررنا استخدام مزود محلي للحفاظ على الخصوصية", None)
            .unwrap();

        let hits = m.recall("ما رأيك في المزودين المحليين؟", None, 5).unwrap();
        assert!(!hits.is_empty(), "an inflected query must still recall the decision");
        assert!(hits[0].content.contains("مزود محلي"));

        drop(m);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn memories_written_before_stemming_existed_are_still_found() {
        // Keywords already in the user's database were indexed raw. Recall
        // folds them on read, so upgrading must not orphan them.
        let path = temp_db("legacy-keywords");
        let _ = std::fs::remove_file(&path);
        let m = Memory::open(Some(path.clone())).unwrap();
        // Written the way the old tokenizer would have: unnormalized, unstemmed.
        m.conn
            .execute(
                "INSERT INTO memories (type, content, project, keywords, created_at, last_accessed_at)
                 VALUES ('fact', 'المشروع يستخدم الإعدادات المحلية', NULL, 'المشروع يستخدم الإعدادات المحلية', ?1, ?1)",
                params![now_secs()],
            )
            .unwrap();

        let hits = m.recall("اعدادات", None, 5).unwrap();
        assert!(!hits.is_empty(), "a pre-existing memory must survive the upgrade");

        drop(m);
        let _ = std::fs::remove_file(&path);
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
        //
        // The expected token changed from `البناء` to `بناء` when stemming
        // was added — deliberately. What this test protects is that Arabic
        // is split into words at all; which normalized form a word settles
        // on is the stemmer's business, and is covered by its own tests.
        let tokens = tokenize("أمر البناء هو cargo build");
        assert!(tokens.contains(&"بناء".to_string()), "Arabic words must tokenize: {tokens:?}");
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
