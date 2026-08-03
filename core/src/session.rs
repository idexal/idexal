// Idexal Core — conversation sessions
//
// Without this a "follow-up" is a brand-new agent with no idea what just
// happened. Sessions persist the message history so a second turn
// continues the same conversation — including the assistant's tool calls
// and their results, which is what lets the model reason about work it
// already did.
//
// Stored in the same SQLite file as long-term memory: one database, one
// place to back up, and sessions are conceptually memory of a narrower
// kind.

use crate::providers::types::{Message, Role, ToolCall};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Sessions {
    conn: Connection,
}

/// Milliseconds, not seconds: sessions are created and touched in quick
/// succession, and second granularity makes "most recently used" ordering
/// a coin flip between anything that happened in the same second.
fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

fn role_str(role: Role) -> &'static str {
    match role {
        Role::System => "system",
        Role::User => "user",
        Role::Assistant => "assistant",
    }
}

fn role_from(s: &str) -> Role {
    match s {
        "system" => Role::System,
        "assistant" => Role::Assistant,
        _ => Role::User,
    }
}

impl Sessions {
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

    fn migrate(&self) -> Result<(), String> {
        self.conn
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    project TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS session_messages (
                    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                    seq INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tool_calls TEXT,
                    tool_call_id TEXT,
                    PRIMARY KEY (session_id, seq)
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);",
            )
            .map_err(|e| format!("session migration failed: {e}"))
    }

    pub fn ensure(&self, id: &str, title: &str, project: Option<&str>) -> Result<(), String> {
        let now = now_ms();
        self.conn
            .execute(
                "INSERT INTO sessions (id, title, project, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?4)
                 ON CONFLICT(id) DO UPDATE SET updated_at = ?4",
                params![id, title, project, now],
            )
            .map_err(|e| format!("ensure session failed: {e}"))?;
        Ok(())
    }

    /// Full history for a session, in order. The system prompt is NOT
    /// stored — it is regenerated per run so prompt improvements apply to
    /// existing conversations instead of being frozen at creation.
    pub fn history(&self, id: &str) -> Result<Vec<Message>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT role, content, tool_calls, tool_call_id
                 FROM session_messages WHERE session_id = ?1 ORDER BY seq",
            )
            .map_err(|e| format!("history prepare failed: {e}"))?;
        let rows = stmt
            .query_map(params![id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            })
            .map_err(|e| format!("history query failed: {e}"))?;

        let mut out = Vec::new();
        for row in rows.flatten() {
            let (role, content, tool_calls_json, tool_call_id) = row;
            let tool_calls: Vec<ToolCall> = tool_calls_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            out.push(Message { role: role_from(&role), content, tool_calls, tool_call_id });
        }
        Ok(out)
    }

    /// Append messages, continuing the existing sequence.
    pub fn append(&self, id: &str, messages: &[Message]) -> Result<(), String> {
        let mut next: i64 = self
            .conn
            .query_row("SELECT COALESCE(MAX(seq), -1) + 1 FROM session_messages WHERE session_id = ?1", params![id], |r| {
                r.get(0)
            })
            .unwrap_or(0);

        for m in messages {
            // System messages are regenerated per run, never replayed.
            if m.role == Role::System {
                continue;
            }
            let tool_calls = if m.tool_calls.is_empty() {
                None
            } else {
                serde_json::to_string(&m.tool_calls).ok()
            };
            self.conn
                .execute(
                    "INSERT INTO session_messages (session_id, seq, role, content, tool_calls, tool_call_id)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![id, next, role_str(m.role), m.content, tool_calls, m.tool_call_id],
                )
                .map_err(|e| format!("append failed: {e}"))?;
            next += 1;
        }

        self.conn
            .execute("UPDATE sessions SET updated_at = ?1 WHERE id = ?2", params![now_ms(), id])
            .map_err(|e| format!("touch session failed: {e}"))?;
        Ok(())
    }

    pub fn list(&self, limit: usize) -> Result<Vec<(String, String, i64)>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, title, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?1")
            .map_err(|e| format!("list prepare failed: {e}"))?;
        let rows = stmt
            .query_map(params![limit as i64], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
            })
            .map_err(|e| format!("list query failed: {e}"))?;
        Ok(rows.flatten().collect())
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("DELETE FROM session_messages WHERE session_id = ?1", params![id])
            .map_err(|e| format!("delete messages failed: {e}"))?;
        self.conn
            .execute("DELETE FROM sessions WHERE id = ?1", params![id])
            .map_err(|e| format!("delete session failed: {e}"))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(tag: &str) -> PathBuf {
        std::env::temp_dir().join(format!("idexal-sess-{}-{}.db", tag, std::process::id()))
    }

    #[test]
    fn history_round_trips_including_tool_calls() {
        // Tool calls and their results must survive: without them a
        // follow-up turn cannot reason about work the agent already did.
        let path = temp_db("roundtrip");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("s1", "first task", None).unwrap();

        let calls = vec![ToolCall { id: "c1".into(), name: "read_file".into(), arguments: r#"{"path":"a"}"#.into() }];
        s.append(
            "s1",
            &[
                Message::user("read a"),
                Message::assistant("looking", calls.clone()),
                Message::tool_result("c1", "file contents"),
                Message::assistant("done", vec![]),
            ],
        )
        .unwrap();

        let history = s.history("s1").unwrap();
        assert_eq!(history.len(), 4);
        assert_eq!(history[1].tool_calls.len(), 1);
        assert_eq!(history[1].tool_calls[0].name, "read_file");
        assert_eq!(history[2].tool_call_id.as_deref(), Some("c1"));

        drop(s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn appending_twice_continues_the_sequence() {
        let path = temp_db("append");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("s1", "t", None).unwrap();
        s.append("s1", &[Message::user("one")]).unwrap();
        s.append("s1", &[Message::user("two")]).unwrap();

        let history = s.history("s1").unwrap();
        assert_eq!(history.len(), 2, "second append must not overwrite the first");
        assert_eq!(history[0].content, "one");
        assert_eq!(history[1].content, "two");

        drop(s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn system_messages_are_not_persisted() {
        // The system prompt is regenerated per run, so replaying a stored
        // one would freeze old wording into every future turn.
        let path = temp_db("system");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("s1", "t", None).unwrap();
        s.append(
            "s1",
            &[
                Message { role: Role::System, content: "old prompt".into(), tool_calls: vec![], tool_call_id: None },
                Message::user("hi"),
            ],
        )
        .unwrap();

        let history = s.history("s1").unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].role, Role::User);

        drop(s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn sessions_are_isolated_from_each_other() {
        let path = temp_db("isolate");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("a", "A", None).unwrap();
        s.ensure("b", "B", None).unwrap();
        s.append("a", &[Message::user("secret-a")]).unwrap();
        s.append("b", &[Message::user("secret-b")]).unwrap();

        let a = s.history("a").unwrap();
        assert_eq!(a.len(), 1);
        assert_eq!(a[0].content, "secret-a");

        drop(s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn delete_removes_a_session_and_its_messages() {
        let path = temp_db("delete");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("s1", "t", None).unwrap();
        s.append("s1", &[Message::user("x")]).unwrap();
        s.delete("s1").unwrap();
        assert!(s.history("s1").unwrap().is_empty());
        assert!(s.list(10).unwrap().iter().all(|(id, _, _)| id != "s1"));

        drop(s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn list_orders_by_most_recently_updated() {
        let path = temp_db("order");
        let _ = std::fs::remove_file(&path);
        let s = Sessions::open(Some(path.clone())).unwrap();
        s.ensure("old", "older", None).unwrap();
        s.ensure("new", "newer", None).unwrap();
        // Touch "old" so it becomes the most recent.
        s.append("old", &[Message::user("bump")]).unwrap();

        let listed = s.list(10).unwrap();
        assert_eq!(listed.first().map(|(id, _, _)| id.as_str()), Some("old"));

        drop(s);
        let _ = std::fs::remove_file(&path);
    }
}
