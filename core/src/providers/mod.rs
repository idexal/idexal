// Idexal Core — provider registry & fallback engine
//
// Ported from reference/ai-core-node-reference/src/providers/registry.ts:
// providers are tried in priority order; a failure moves to the next one.
// Unlike the reference, health/cooldown state lives in the registry struct
// so repeated failures within one session skip a known-bad provider
// instead of paying its timeout on every turn.

pub mod anthropic;
pub mod openai_compat;
pub mod types;

use crate::config::{Config, ProviderConfig, ProviderKind};
use crate::usage::{CallRecord, Usage};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use types::{Delta, Message, ToolDefinition, Turn};

/// Public wrapper so binaries/front ends can reuse the same UTF-8-safe
/// truncation without duplicating the char-boundary handling.
pub fn truncate_public(s: &str, max: usize) -> String {
    truncate(s, max)
}

pub(crate) fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        let mut cut = max;
        while cut > 0 && !s.is_char_boundary(cut) {
            cut -= 1;
        }
        format!("{}…", &s[..cut])
    }
}

/// Per-provider failure tracking. A provider that fails goes into cooldown
/// with an exponentially growing window (capped), so a dead endpoint stops
/// costing a timeout on every single turn.
#[derive(Default)]
struct Health {
    consecutive_failures: u32,
    cooling_until: Option<Instant>,
}

const BASE_COOLDOWN: Duration = Duration::from_secs(15);
const MAX_COOLDOWN: Duration = Duration::from_secs(300);

pub struct Registry {
    providers: Vec<ProviderConfig>,
    health: HashMap<String, Health>,
    /// Optional because the ledger is a product concern, not an engine one:
    /// tests and one-off runs build a registry without touching the user's
    /// database.
    usage: Option<Usage>,
    task_id: Option<String>,
}

#[derive(Debug)]
pub struct TurnOutcome {
    pub turn: Turn,
    pub provider_id: String,
}

impl Registry {
    pub fn from_config(cfg: &Config) -> Self {
        let providers = cfg.providers.iter().filter(|p| p.usable()).cloned().collect();
        Self { providers, health: HashMap::new(), usage: None, task_id: None }
    }

    /// Attach a usage ledger so every attempt through this registry is
    /// recorded. `task_id` is the session the calls belong to, when there
    /// is one, so spend can later be attributed to a conversation.
    pub fn with_usage(mut self, usage: Usage, task_id: Option<String>) -> Self {
        self.usage = Some(usage);
        self.task_id = task_id;
        self
    }

    /// Append one attempt to the ledger. The registry is the only place
    /// that knows all four of provider, model, latency and outcome, which
    /// is why recording lives here rather than in the agent loop.
    ///
    /// Write errors are swallowed on purpose: a bookkeeping failure must
    /// never be the reason a model call fails.
    fn log_call(&self, provider: &ProviderConfig, turn: Option<&Turn>, error: Option<&str>, latency_ms: u64) {
        let Some(usage) = &self.usage else { return };
        // A provider that reported nothing is stored as zero tokens; the
        // call itself still counts, and its latency is still real.
        let counts = turn.and_then(|t| t.usage).unwrap_or_default();
        let _ = usage.record(&CallRecord {
            provider_id: &provider.id,
            model: &provider.model,
            input_tokens: counts.input_tokens,
            output_tokens: counts.output_tokens,
            latency_ms,
            ok: error.is_none(),
            error,
            task_id: self.task_id.as_deref(),
        });
    }

    pub fn provider_ids(&self) -> Vec<String> {
        self.providers.iter().map(|p| p.id.clone()).collect()
    }

    pub fn is_empty(&self) -> bool {
        self.providers.is_empty()
    }

    fn in_cooldown(&self, id: &str) -> bool {
        self.health
            .get(id)
            .and_then(|h| h.cooling_until)
            .map(|until| Instant::now() < until)
            .unwrap_or(false)
    }

    fn record_failure(&mut self, id: &str) {
        let entry = self.health.entry(id.to_string()).or_default();
        entry.consecutive_failures += 1;
        // Exponential backoff on the cooldown window: 15s, 30s, 60s… capped
        // at 5 minutes. The reference implementation tracked the failure
        // count but always used a flat 30s — this actually uses it.
        let factor = 1u32 << entry.consecutive_failures.min(5).saturating_sub(1);
        let window = (BASE_COOLDOWN * factor).min(MAX_COOLDOWN);
        entry.cooling_until = Some(Instant::now() + window);
    }

    fn record_success(&mut self, id: &str) {
        let entry = self.health.entry(id.to_string()).or_default();
        entry.consecutive_failures = 0;
        entry.cooling_until = None;
    }

    /// Run one turn through the fallback chain. `on_provider` fires for each
    /// provider actually attempted; `on_delta` streams text/tool-calls from
    /// whichever provider succeeds.
    pub async fn stream_turn<FP: FnMut(&str), FD: FnMut(Delta)>(
        &mut self,
        messages: &[Message],
        tools: &[ToolDefinition],
        mut on_provider: FP,
        mut on_delta: FD,
    ) -> Result<TurnOutcome, Vec<String>> {
        let mut errors = Vec::new();
        let candidates: Vec<ProviderConfig> = self.providers.clone();
        // A provider is attempted at most once per call. Without this, a
        // provider that fails in pass 1 is put into cooldown by
        // record_failure and would then be picked up again by pass 2,
        // doubling both the latency and the reported errors.
        let mut attempted: std::collections::HashSet<String> = std::collections::HashSet::new();

        // First pass: providers not in cooldown. Second pass: the ones that
        // were skipped for being in cooldown, so a fully-cooled-down set
        // still gets a try rather than failing with "no providers" while
        // the user waits.
        for allow_cooling in [false, true] {
            for p in &candidates {
                if attempted.contains(&p.id) {
                    continue;
                }
                if !allow_cooling && self.in_cooldown(&p.id) {
                    continue;
                }
                attempted.insert(p.id.clone());
                on_provider(&p.id);
                let started = Instant::now();
                let result = match p.kind {
                    ProviderKind::Anthropic => {
                        anthropic::stream_turn(p, messages, tools, &mut on_delta).await
                    }
                    ProviderKind::OpenaiCompatible => {
                        openai_compat::stream_turn(p, messages, tools, &mut on_delta).await
                    }
                };
                let latency_ms = started.elapsed().as_millis() as u64;
                match result {
                    Ok(turn) => {
                        self.record_success(&p.id);
                        self.log_call(p, Some(&turn), None, latency_ms);
                        return Ok(TurnOutcome { turn, provider_id: p.id.clone() });
                    }
                    Err(e) => {
                        self.record_failure(&p.id);
                        // Failures are logged too: they cost real latency
                        // and they are what makes a provider look unhealthy
                        // on the usage page.
                        self.log_call(p, None, Some(&e), latency_ms);
                        errors.push(format!("{}: {e}", p.id));
                    }
                }
            }
        }

        if errors.is_empty() {
            errors.push("no usable providers configured".to_string());
        }
        Err(errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::ProviderKind;

    fn cfg_with(ids: &[(&str, i32)]) -> Config {
        Config {
            providers: ids
                .iter()
                .map(|(id, prio)| ProviderConfig {
                    id: (*id).into(),
                    kind: ProviderKind::OpenaiCompatible,
                    base_url: Some("http://localhost:11434/v1".into()),
                    api_key: None,
                    api_key_env: None,
                    model: "m".into(),
                    priority: *prio,
                    headers: Default::default(),
                    extra_body: Default::default(),
                    enabled: true,
                })
                .collect(),
            agent: Default::default(),
        }
    }

    #[test]
    fn registry_keeps_only_usable_providers() {
        let mut cfg = cfg_with(&[("local", 1)]);
        cfg.providers.push(ProviderConfig {
            id: "remote-nokey".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("https://api.example.com/v1".into()),
            api_key: None,
            api_key_env: Some("IDEXAL_TEST_MISSING_KEY".into()),
            model: "m".into(),
            priority: 2,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        });
        let reg = Registry::from_config(&cfg);
        assert_eq!(reg.provider_ids(), vec!["local".to_string()]);
    }

    #[test]
    fn cooldown_grows_with_consecutive_failures() {
        let cfg = cfg_with(&[("a", 1)]);
        let mut reg = Registry::from_config(&cfg);
        reg.record_failure("a");
        let first = reg.health.get("a").unwrap().cooling_until.unwrap();
        reg.record_failure("a");
        let second = reg.health.get("a").unwrap().cooling_until.unwrap();
        assert!(second > first, "second failure must cool down longer");
        reg.record_success("a");
        assert!(reg.health.get("a").unwrap().cooling_until.is_none());
        assert_eq!(reg.health.get("a").unwrap().consecutive_failures, 0);
    }

    #[tokio::test]
    async fn each_provider_is_attempted_at_most_once_per_turn() {
        // Regression: a provider failing in pass 1 enters cooldown, and the
        // cooldown pass would then retry it — doubling latency and errors.
        // Both providers here point at a dead local port so both fail fast.
        let cfg = Config {
            providers: vec![
                ProviderConfig {
                    id: "a".into(),
                    kind: ProviderKind::OpenaiCompatible,
                    base_url: Some("http://127.0.0.1:1/v1".into()),
                    api_key: None,
                    api_key_env: None,
                    model: "m".into(),
                    priority: 1,
                    headers: Default::default(),
                    extra_body: Default::default(),
                    enabled: true,
                },
                ProviderConfig {
                    id: "b".into(),
                    kind: ProviderKind::OpenaiCompatible,
                    base_url: Some("http://127.0.0.1:2/v1".into()),
                    api_key: None,
                    api_key_env: None,
                    model: "m".into(),
                    priority: 2,
                    headers: Default::default(),
                    extra_body: Default::default(),
                    enabled: true,
                },
            ],
            agent: Default::default(),
        };
        let mut reg = Registry::from_config(&cfg);
        let mut attempts: Vec<String> = Vec::new();
        let result = reg
            .stream_turn(
                &[Message::user("hi")],
                &[],
                |p| attempts.push(p.to_string()),
                |_| {},
            )
            .await;

        assert!(result.is_err());
        assert_eq!(attempts, vec!["a".to_string(), "b".to_string()], "each provider exactly once");
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 2, "one error per provider, not duplicated");
    }

    #[tokio::test]
    async fn every_attempt_reaches_the_usage_ledger() {
        // Both providers point at dead local ports, so this exercises the
        // failure path end to end: two attempts, two rows, both marked
        // failed and attributed to the session that made them.
        let path = std::env::temp_dir().join(format!("idexal-usage-registry-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let mut cfg = cfg_with(&[("a", 1), ("b", 2)]);
        cfg.providers[0].base_url = Some("http://127.0.0.1:1/v1".into());
        cfg.providers[1].base_url = Some("http://127.0.0.1:2/v1".into());
        let ledger = crate::usage::Usage::open(Some(path.clone())).unwrap();
        let mut reg = Registry::from_config(&cfg).with_usage(ledger, Some("sess-1".into()));

        let result = reg.stream_turn(&[Message::user("hi")], &[], |_| {}, |_| {}).await;
        assert!(result.is_err());

        let ledger = crate::usage::Usage::open(Some(path.clone())).unwrap();
        let totals = ledger.totals().unwrap();
        assert_eq!(totals.calls, 2, "one row per attempted provider");
        assert_eq!(totals.failed, 2);
        let recent = ledger.recent(10).unwrap();
        assert!(recent.iter().all(|r| r.error.is_some()), "a failure must carry its message");

        drop(reg);
        drop(ledger);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn logging_without_a_ledger_is_a_no_op() {
        // The engine must not require the ledger: an unwritable home
        // directory degrades to "no stats", never to "no agent".
        let cfg = cfg_with(&[("a", 1)]);
        let reg = Registry::from_config(&cfg);
        assert!(reg.usage.is_none());
        reg.log_call(&cfg.providers[0], None, Some("boom"), 5);
    }

    #[test]
    fn truncate_respects_utf8_boundaries() {
        // Arabic text: cutting mid-codepoint would panic on a naive slice.
        let s = "مرحبا بالعالم من Idexal";
        let out = truncate(s, 10);
        assert!(out.ends_with('…'));
        assert!(out.len() <= 11 + 3);
    }
}
