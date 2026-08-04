// Idexal Core — usage & cost ledger
//
// One row per model call: which provider served it, which model, how many
// tokens, how long it took, and whether it worked. The providers already
// receive these numbers from the APIs and used to throw them away, so the
// product had nothing real to show on a usage page — only guesses.
//
// Stored in the same SQLite file as memory and sessions: one database to
// back up, and usage is memory of a numeric kind.

use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// Milliseconds, like the session store. Calls land in bursts (a tool round
/// is several calls a second apart at most) and second granularity makes
/// ordering inside a burst arbitrary.
fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

const DAY_MS: i64 = 86_400_000;

/// Per-1M-token prices in USD as (model-name prefix, input, output).
///
/// These are ESTIMATES and they go stale: vendors change prices and ship new
/// model ids far faster than this table gets edited. Nothing in the engine
/// depends on them — they exist so the usage page can show an order of
/// magnitude rather than a blank. Treat a number here as "roughly, as of
/// when someone last looked", never as billing.
const PRICES: &[(&str, f64, f64)] = &[
    // Anthropic
    ("claude-opus-4", 15.0, 75.0),
    ("claude-sonnet-4", 3.0, 15.0),
    ("claude-haiku-4", 1.0, 5.0),
    ("claude-3-7-sonnet", 3.0, 15.0),
    ("claude-3-5-sonnet", 3.0, 15.0),
    ("claude-3-5-haiku", 0.8, 4.0),
    ("claude-3-opus", 15.0, 75.0),
    ("claude-3-haiku", 0.25, 1.25),
    // OpenAI
    ("gpt-4o-mini", 0.15, 0.6),
    ("gpt-4o", 2.5, 10.0),
    ("gpt-4.1-mini", 0.4, 1.6),
    ("gpt-4.1-nano", 0.1, 0.4),
    ("gpt-4.1", 2.0, 8.0),
    ("gpt-4-turbo", 10.0, 30.0),
    ("gpt-3.5-turbo", 0.5, 1.5),
    ("o4-mini", 1.1, 4.4),
    ("o3-mini", 1.1, 4.4),
    ("o3", 2.0, 8.0),
    // Others commonly reached through an OpenAI-compatible endpoint
    ("deepseek-reasoner", 0.55, 2.19),
    ("deepseek-chat", 0.27, 1.1),
    ("mistral-large", 2.0, 6.0),
    ("mistral-small", 0.2, 0.6),
    ("gemini-2.5-pro", 1.25, 10.0),
    ("gemini-2.5-flash", 0.3, 2.5),
    ("gemini-2.0-flash", 0.1, 0.4),
];

/// Longest matching prefix wins rather than table order, so `gpt-4o-mini`
/// can never be silently billed at the `gpt-4o` rate — a 16x error that
/// would be invisible on the usage page.
fn price_for(model: &str) -> Option<(f64, f64)> {
    // OpenRouter-style ids are "vendor/model"; price on the model part.
    let name = model.rsplit('/').next().unwrap_or(model).to_lowercase();
    PRICES
        .iter()
        .filter(|(prefix, _, _)| name.starts_with(prefix))
        .max_by_key(|(prefix, _, _)| prefix.len())
        .map(|(_, input, output)| (*input, *output))
}

/// `None` means "no price is known for this model", which is deliberately
/// different from zero. Unknown models are stored with cost 0 so the cost
/// column only ever sums prices we actually have — a made-up rate for an
/// unrecognised model would put fabricated dollars in front of the user,
/// and for the common unknown case (a local Ollama / LM Studio / vLLM
/// model) the true cost really is nothing.
pub fn estimate_cost(model: &str, input_tokens: u64, output_tokens: u64) -> Option<f64> {
    let (input_price, output_price) = price_for(model)?;
    Some(
        (input_tokens as f64 / 1_000_000.0) * input_price
            + (output_tokens as f64 / 1_000_000.0) * output_price,
    )
}

/// One model call as the caller knows it, before it is priced and stamped.
pub struct CallRecord<'a> {
    pub provider_id: &'a str,
    pub model: &'a str,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub latency_ms: u64,
    pub ok: bool,
    pub error: Option<&'a str>,
    /// The session/task this call belonged to, when there is one.
    pub task_id: Option<&'a str>,
}

#[derive(Debug, Default, Clone)]
pub struct Totals {
    pub calls: i64,
    pub failed: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
    pub avg_latency_ms: f64,
    /// The "favourite model" the usage page shows: most-used by SUCCESSFUL
    /// call count. Failures are excluded deliberately — telling a user
    /// their favourite model is one that has only ever returned 401 is
    /// worse than showing nothing.
    pub top_model: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProviderTotals {
    pub provider_id: String,
    pub calls: i64,
    pub failed: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone)]
pub struct CallSummary {
    pub id: i64,
    pub provider_id: String,
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
    pub latency_ms: i64,
    pub ok: bool,
    pub error: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone)]
pub struct DayBucket {
    /// UTC date, `YYYY-MM-DD`.
    pub day: String,
    pub calls: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_usd: f64,
}

pub struct Usage {
    conn: Connection,
}

impl Usage {
    /// Open (and migrate) the ledger at `~/.idexal/memory.db`, or an
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

    /// Indexes cover exactly the two access patterns: `recent`/`daily` scan
    /// by time, `per_provider` groups by provider. Nothing queries by model
    /// or task_id yet, so neither gets an index it would only pay for.
    fn migrate(&self) -> Result<(), String> {
        self.conn
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS usage_calls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_id TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER NOT NULL DEFAULT 0,
                    output_tokens INTEGER NOT NULL DEFAULT 0,
                    cost_usd REAL NOT NULL DEFAULT 0,
                    latency_ms INTEGER NOT NULL DEFAULT 0,
                    ok INTEGER NOT NULL DEFAULT 1,
                    error TEXT,
                    task_id TEXT,
                    created_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_calls(created_at);
                CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_calls(provider_id);",
            )
            .map_err(|e| format!("usage migration failed: {e}"))
    }

    pub fn record(&self, call: &CallRecord) -> Result<i64, String> {
        self.insert(call, now_ms())
    }

    /// The cost is priced and frozen at write time on purpose: this is a
    /// ledger, so editing PRICES later must not silently rewrite what past
    /// months appear to have cost.
    fn insert(&self, call: &CallRecord, created_at: i64) -> Result<i64, String> {
        let cost = estimate_cost(call.model, call.input_tokens, call.output_tokens).unwrap_or(0.0);
        self.conn
            .execute(
                "INSERT INTO usage_calls
                    (provider_id, model, input_tokens, output_tokens, cost_usd,
                     latency_ms, ok, error, task_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    call.provider_id,
                    call.model,
                    call.input_tokens as i64,
                    call.output_tokens as i64,
                    cost,
                    call.latency_ms as i64,
                    call.ok as i64,
                    call.error,
                    call.task_id,
                    created_at,
                ],
            )
            .map_err(|e| format!("usage record failed: {e}"))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn totals(&self) -> Result<Totals, String> {
        let mut totals = self
            .conn
            .query_row(
                "SELECT COUNT(*),
                        COALESCE(SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END), 0),
                        COALESCE(SUM(input_tokens), 0),
                        COALESCE(SUM(output_tokens), 0),
                        COALESCE(SUM(cost_usd), 0.0),
                        COALESCE(AVG(latency_ms), 0.0)
                 FROM usage_calls",
                [],
                |r| {
                    Ok(Totals {
                        calls: r.get(0)?,
                        failed: r.get(1)?,
                        input_tokens: r.get(2)?,
                        output_tokens: r.get(3)?,
                        cost_usd: r.get(4)?,
                        avg_latency_ms: r.get(5)?,
                        top_model: None,
                    })
                },
            )
            .map_err(|e| format!("usage totals failed: {e}"))?;

        totals.top_model = self
            .conn
            .query_row(
                "SELECT model FROM usage_calls WHERE ok = 1
                 GROUP BY model ORDER BY COUNT(*) DESC, model LIMIT 1",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok();
        Ok(totals)
    }

    /// Busiest provider first — that is the order the usage page renders.
    pub fn per_provider(&self) -> Result<Vec<ProviderTotals>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT provider_id,
                        COUNT(*),
                        COALESCE(SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END), 0),
                        COALESCE(SUM(input_tokens), 0),
                        COALESCE(SUM(output_tokens), 0),
                        COALESCE(SUM(cost_usd), 0.0)
                 FROM usage_calls
                 GROUP BY provider_id
                 ORDER BY COUNT(*) DESC, provider_id",
            )
            .map_err(|e| format!("per_provider prepare failed: {e}"))?;
        let rows = stmt
            .query_map([], |r| {
                Ok(ProviderTotals {
                    provider_id: r.get(0)?,
                    calls: r.get(1)?,
                    failed: r.get(2)?,
                    input_tokens: r.get(3)?,
                    output_tokens: r.get(4)?,
                    cost_usd: r.get(5)?,
                })
            })
            .map_err(|e| format!("per_provider query failed: {e}"))?;
        Ok(rows.flatten().collect())
    }

    /// Newest first. `id` breaks ties because two calls can share a
    /// millisecond when providers answer in parallel.
    pub fn recent(&self, limit: usize) -> Result<Vec<CallSummary>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, provider_id, model, input_tokens, output_tokens, cost_usd,
                        latency_ms, ok, error, created_at
                 FROM usage_calls ORDER BY created_at DESC, id DESC LIMIT ?1",
            )
            .map_err(|e| format!("recent prepare failed: {e}"))?;
        let rows = stmt
            .query_map(params![limit as i64], |r| {
                Ok(CallSummary {
                    id: r.get(0)?,
                    provider_id: r.get(1)?,
                    model: r.get(2)?,
                    input_tokens: r.get(3)?,
                    output_tokens: r.get(4)?,
                    cost_usd: r.get(5)?,
                    latency_ms: r.get(6)?,
                    ok: r.get::<_, i64>(7)? != 0,
                    error: r.get(8)?,
                    created_at: r.get(9)?,
                })
            })
            .map_err(|e| format!("recent query failed: {e}"))?;
        Ok(rows.flatten().collect())
    }

    /// Per-day token counts for the activity chart, oldest bucket first.
    ///
    /// A rolling window of `days * 24h` back from now, bucketed by UTC
    /// date. Days with no calls are absent rather than zero-filled — the
    /// chart knows its own axis and a gap is not the same as a value.
    pub fn daily(&self, days: u32) -> Result<Vec<DayBucket>, String> {
        let cutoff = now_ms() - (days.max(1) as i64) * DAY_MS;
        let mut stmt = self
            .conn
            .prepare(
                "SELECT date(created_at / 1000, 'unixepoch') AS day,
                        COUNT(*),
                        COALESCE(SUM(input_tokens), 0),
                        COALESCE(SUM(output_tokens), 0),
                        COALESCE(SUM(cost_usd), 0.0)
                 FROM usage_calls
                 WHERE created_at >= ?1
                 GROUP BY day
                 ORDER BY day",
            )
            .map_err(|e| format!("daily prepare failed: {e}"))?;
        let rows = stmt
            .query_map(params![cutoff], |r| {
                Ok(DayBucket {
                    day: r.get(0)?,
                    calls: r.get(1)?,
                    input_tokens: r.get(2)?,
                    output_tokens: r.get(3)?,
                    cost_usd: r.get(4)?,
                })
            })
            .map_err(|e| format!("daily query failed: {e}"))?;
        Ok(rows.flatten().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(tag: &str) -> PathBuf {
        std::env::temp_dir().join(format!("idexal-usage-{}-{}.db", tag, std::process::id()))
    }

    fn open(tag: &str) -> (Usage, PathBuf) {
        let path = temp_db(tag);
        let _ = std::fs::remove_file(&path);
        (Usage::open(Some(path.clone())).unwrap(), path)
    }

    fn call<'a>(provider: &'a str, model: &'a str, input: u64, output: u64) -> CallRecord<'a> {
        CallRecord {
            provider_id: provider,
            model,
            input_tokens: input,
            output_tokens: output,
            latency_ms: 100,
            ok: true,
            error: None,
            task_id: None,
        }
    }

    #[test]
    fn recording_and_totals_round_trip() {
        let (u, path) = open("totals");
        u.record(&call("anthropic", "claude-sonnet-4-5-20250929", 1_000, 500)).unwrap();
        u.record(&CallRecord { latency_ms: 300, ..call("anthropic", "claude-sonnet-4-5-20250929", 2_000, 1_000) })
            .unwrap();

        let t = u.totals().unwrap();
        assert_eq!(t.calls, 2);
        assert_eq!(t.failed, 0);
        assert_eq!(t.input_tokens, 3_000);
        assert_eq!(t.output_tokens, 1_500);
        assert_eq!(t.avg_latency_ms, 200.0, "avg of 100ms and 300ms");
        assert_eq!(t.top_model.as_deref(), Some("claude-sonnet-4-5-20250929"));
        // 3000 in @ $3/1M + 1500 out @ $15/1M = 0.009 + 0.0225
        assert!((t.cost_usd - 0.0315).abs() < 1e-9, "got {}", t.cost_usd);

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn parallel_writers_do_not_lose_records() {
        // The multi-agent path runs executors on separate tasks, and a
        // rusqlite Connection cannot be shared, so each opens its own handle
        // onto the same file. SQLite serializes writers with a lock, and a
        // connection that finds the lock held would give up immediately if
        // no busy timeout were set — rusqlite sets one (5s) on every open,
        // so the contention resolves by waiting. This test pins that down,
        // because losing it would be silent: record() drops its error on
        // purpose so the ledger can never fail a turn, and a parallel run
        // would simply under-report its own spend.
        let path = temp_db("parallel");
        let _ = std::fs::remove_file(&path);
        const WRITERS: usize = 6;
        const EACH: usize = 25;

        let handles: Vec<_> = (0..WRITERS)
            .map(|w| {
                let path = path.clone();
                std::thread::spawn(move || {
                    let u = Usage::open(Some(path)).unwrap();
                    for _ in 0..EACH {
                        u.record(&call(&format!("p{w}"), "gpt-4o-mini", 10, 5)).unwrap();
                    }
                })
            })
            .collect();
        for h in handles {
            h.join().expect("writer thread panicked");
        }

        let u = Usage::open(Some(path.clone())).unwrap();
        assert_eq!(u.totals().unwrap().calls, (WRITERS * EACH) as i64);

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn totals_of_an_empty_ledger_are_zero_not_an_error() {
        // AVG() over no rows is NULL in SQLite; without COALESCE this would
        // fail to decode and the usage page would show an error instead of
        // "nothing yet".
        let (u, path) = open("empty");
        let t = u.totals().unwrap();
        assert_eq!(t.calls, 0);
        assert_eq!(t.cost_usd, 0.0);
        assert_eq!(t.avg_latency_ms, 0.0);
        assert!(t.top_model.is_none());
        assert!(u.per_provider().unwrap().is_empty());
        assert!(u.recent(10).unwrap().is_empty());

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn usage_is_aggregated_per_provider() {
        let (u, path) = open("perprov");
        u.record(&call("anthropic", "claude-sonnet-4", 100, 50)).unwrap();
        u.record(&call("openai", "gpt-4o-mini", 200, 100)).unwrap();
        u.record(&call("openai", "gpt-4o-mini", 300, 150)).unwrap();

        let rows = u.per_provider().unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].provider_id, "openai", "busiest provider first");
        assert_eq!(rows[0].calls, 2);
        assert_eq!(rows[0].input_tokens, 500);
        assert_eq!(rows[0].output_tokens, 250);

        let anthropic = rows.iter().find(|r| r.provider_id == "anthropic").unwrap();
        assert_eq!(anthropic.calls, 1);
        assert_eq!(anthropic.input_tokens, 100, "providers must not bleed into each other");

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn failed_calls_are_counted_separately_but_still_recorded() {
        // A failed call still costs latency and is what makes a provider
        // look unhealthy, so it must be stored — just not confused with a
        // successful one.
        let (u, path) = open("failed");
        u.record(&call("openai", "gpt-4o", 100, 50)).unwrap();
        u.record(&CallRecord {
            ok: false,
            error: Some("HTTP 429: rate limited"),
            input_tokens: 0,
            output_tokens: 0,
            ..call("openai", "gpt-4o", 0, 0)
        })
        .unwrap();

        let t = u.totals().unwrap();
        assert_eq!(t.calls, 2, "failures are part of the call count");
        assert_eq!(t.failed, 1);
        assert_eq!(t.input_tokens, 100, "a failure contributes no tokens");

        // A model only reached through failures is nobody's favourite.
        let (only_failures, fail_path) = open("allfailed");
        only_failures
            .record(&CallRecord { ok: false, error: Some("HTTP 401"), ..call("openai", "gpt-4o", 0, 0) })
            .unwrap();
        assert!(only_failures.totals().unwrap().top_model.is_none());
        drop(only_failures);
        let _ = std::fs::remove_file(&fail_path);

        let per = u.per_provider().unwrap();
        assert_eq!(per[0].calls, 2);
        assert_eq!(per[0].failed, 1);

        let recent = u.recent(10).unwrap();
        assert_eq!(recent.len(), 2);
        let failure = recent.iter().find(|r| !r.ok).unwrap();
        assert_eq!(failure.error.as_deref(), Some("HTTP 429: rate limited"));

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn daily_buckets_calls_by_day_and_drops_anything_older_than_the_window() {
        let (u, path) = open("daily");
        let now = now_ms();
        u.insert(&call("openai", "gpt-4o-mini", 10, 5), now).unwrap();
        u.insert(&call("openai", "gpt-4o-mini", 20, 10), now).unwrap();
        u.insert(&call("openai", "gpt-4o-mini", 100, 50), now - 2 * DAY_MS).unwrap();
        // Far outside any window asked for below.
        u.insert(&call("openai", "gpt-4o-mini", 999, 999), now - 60 * DAY_MS).unwrap();

        let week = u.daily(7).unwrap();
        assert_eq!(week.len(), 2, "two distinct days inside the window: {week:?}");
        // Oldest first, so a chart can plot left-to-right without sorting.
        assert!(week[0].day < week[1].day);
        assert_eq!(week[0].calls, 1);
        assert_eq!(week[0].input_tokens, 100);
        assert_eq!(week[1].calls, 2, "same-day calls collapse into one bucket");
        assert_eq!(week[1].input_tokens, 30);
        assert_eq!(week[1].output_tokens, 15);

        let today = u.daily(1).unwrap();
        assert_eq!(today.len(), 1, "a 1-day window excludes the 2-day-old call");

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn cost_is_estimated_for_a_known_model_and_withheld_for_an_unknown_one() {
        // 1M in + 1M out on Sonnet pricing = $3 + $15.
        let known = estimate_cost("claude-sonnet-4-5-20250929", 1_000_000, 1_000_000).unwrap();
        assert!((known - 18.0).abs() < 1e-9, "got {known}");

        // Unknown must be None, not a fabricated number: the usage page
        // would otherwise show invented dollars for a private gateway.
        assert!(estimate_cost("my-private-model-7b", 1_000_000, 1_000_000).is_none());

        // …and an unknown model is still recorded, with its tokens intact.
        let (u, path) = open("cost");
        u.record(&call("my-gateway", "my-private-model-7b", 5_000, 2_000)).unwrap();
        let t = u.totals().unwrap();
        assert_eq!(t.input_tokens, 5_000);
        assert_eq!(t.cost_usd, 0.0, "unpriced models contribute nothing to spend");

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn the_longest_matching_price_prefix_wins() {
        // Regression guard: with plain table-order matching, "gpt-4o-mini"
        // matches the "gpt-4o" row first and gets billed ~16x too much.
        let mini = estimate_cost("gpt-4o-mini", 1_000_000, 0).unwrap();
        let full = estimate_cost("gpt-4o-2024-08-06", 1_000_000, 0).unwrap();
        assert!(mini < full, "mini {mini} must be cheaper than {full}");
        assert!((mini - 0.15).abs() < 1e-9);

        // OpenRouter-style vendor-prefixed ids must price on the model part.
        let routed = estimate_cost("anthropic/claude-3-5-haiku-20241022", 1_000_000, 0).unwrap();
        assert!((routed - 0.8).abs() < 1e-9, "got {routed}");
    }

    #[test]
    fn recent_returns_the_newest_calls_first() {
        let (u, path) = open("recent");
        let now = now_ms();
        u.insert(&call("a", "gpt-4o", 1, 1), now - 3_000).unwrap();
        u.insert(&call("b", "gpt-4o", 2, 2), now - 2_000).unwrap();
        u.insert(&call("c", "gpt-4o", 3, 3), now - 1_000).unwrap();

        let rows = u.recent(2).unwrap();
        assert_eq!(rows.len(), 2, "limit is honoured");
        assert_eq!(rows[0].provider_id, "c");
        assert_eq!(rows[1].provider_id, "b");

        drop(u);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn the_ledger_shares_the_database_with_memory_and_sessions() {
        // All three stores open ~/.idexal/memory.db. If usage's migration
        // collided with theirs, adding usage tracking would take long-term
        // memory down with it.
        let path = temp_db("shared");
        let _ = std::fs::remove_file(&path);

        let mem = crate::memory::Memory::open(Some(path.clone())).unwrap();
        mem.remember(crate::memory::MemoryKind::Fact, "the core is written in rust", None).unwrap();
        let u = Usage::open(Some(path.clone())).unwrap();
        u.record(&call("anthropic", "claude-sonnet-4", 10, 5)).unwrap();

        assert_eq!(mem.count().unwrap(), 1, "memory survives the usage migration");
        assert_eq!(u.totals().unwrap().calls, 1);

        drop(u);
        drop(mem);
        let _ = std::fs::remove_file(&path);
    }
}
