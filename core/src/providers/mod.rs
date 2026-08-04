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
use std::sync::{Arc, Mutex};
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
/// Public only because it appears in `SharedHealth`; the fields stay
/// private, so callers can pass the map around but not edit a cooldown.
#[derive(Default, Clone, Copy)]
pub struct Health {
    consecutive_failures: u32,
    cooling_until: Option<Instant>,
}

/// Health shared between the registries of one multi-agent run.
///
/// Each agent needs its own `Registry` (a rusqlite handle cannot cross into
/// a spawned executor), but health is knowledge about the outside world, not
/// per-agent state. Keeping it private meant a dead provider was rediscovered
/// by every agent: one measured run against a real gateway attempted a
/// broken provider **seven times**, once per agent, each paying the full
/// round trip.
///
/// A plain `std::sync::Mutex` is right here: every critical section is a map
/// lookup, and it is never held across an await.
pub type SharedHealth = Arc<Mutex<HashMap<String, Health>>>;

pub fn new_shared_health() -> SharedHealth {
    Arc::new(Mutex::new(HashMap::new()))
}

const BASE_COOLDOWN: Duration = Duration::from_secs(15);
const MAX_COOLDOWN: Duration = Duration::from_secs(300);

/// A per-task override of which provider and model to use.
///
/// Pinning deliberately turns **off** fallback. Falling back is the right
/// default when the user expressed no preference, but once they have named
/// a provider, silently rerouting to a different one is the wrong answer —
/// someone who pins a local Ollama is often doing it precisely so their
/// code never leaves the machine, and "the local one was down so I sent it
/// to a cloud API" is not a recoverable mistake.
///
/// A model name is meaningless outside the provider that serves it, so a
/// model pinned on its own pins the highest-priority provider with it.
#[derive(Debug, Clone, Default)]
pub struct Pin {
    pub provider: Option<String>,
    pub model: Option<String>,
}

impl Pin {
    pub fn is_empty(&self) -> bool {
        self.provider.is_none() && self.model.is_none()
    }
}

pub struct Registry {
    providers: Vec<ProviderConfig>,
    health: SharedHealth,
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
        Self { providers, health: new_shared_health(), usage: None, task_id: None }
    }

    /// Apply a per-task pin, reducing the registry to the single chosen
    /// provider (see [`Pin`] for why fallback is dropped rather than kept).
    ///
    /// An unknown id is an error, not a silent fall-through to the default:
    /// a typo that quietly ran on a different provider than the one asked
    /// for is exactly the surprise pinning exists to prevent.
    pub fn pinned(mut self, pin: &Pin) -> Result<Self, String> {
        if pin.is_empty() {
            return Ok(self);
        }
        let index = match &pin.provider {
            Some(id) => self.providers.iter().position(|p| &p.id == id).ok_or_else(|| {
                let available = self.provider_ids();
                if available.is_empty() {
                    format!("no usable provider to pin to '{id}'")
                } else {
                    format!("no usable provider with id '{id}' (available: {})", available.join(", "))
                }
            })?,
            // Highest priority: config order is the priority order.
            None => 0,
        };
        if self.providers.is_empty() {
            return Err("no usable provider to pin a model to".into());
        }
        let mut chosen = self.providers.remove(index);
        if let Some(model) = &pin.model {
            chosen.model = model.clone();
        }
        self.providers = vec![chosen];
        Ok(self)
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

    /// Share this registry's health with another. Every agent in a
    /// multi-agent run gets its own Registry but the same view of which
    /// providers are currently dead.
    pub fn with_shared_health(mut self, health: SharedHealth) -> Self {
        self.health = health;
        self
    }

    /// A poisoned lock means another thread panicked mid-update. The map is
    /// still structurally sound and this is advisory data, so recovering the
    /// guard beats taking the whole run down over a cooldown timestamp.
    fn health(&self) -> std::sync::MutexGuard<'_, HashMap<String, Health>> {
        self.health.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn in_cooldown(&self, id: &str) -> bool {
        self.health()
            .get(id)
            .and_then(|h| h.cooling_until)
            .map(|until| Instant::now() < until)
            .unwrap_or(false)
    }

    fn record_failure(&mut self, id: &str) {
        let mut health = self.health();
        let entry = health.entry(id.to_string()).or_default();
        entry.consecutive_failures += 1;
        // Exponential backoff on the cooldown window: 15s, 30s, 60s… capped
        // at 5 minutes. The reference implementation tracked the failure
        // count but always used a flat 30s — this actually uses it.
        let factor = 1u32 << entry.consecutive_failures.min(5).saturating_sub(1);
        let window = (BASE_COOLDOWN * factor).min(MAX_COOLDOWN);
        entry.cooling_until = Some(Instant::now() + window);
    }

    fn record_success(&mut self, id: &str) {
        let mut health = self.health();
        let entry = health.entry(id.to_string()).or_default();
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
    fn a_dead_provider_discovered_by_one_agent_is_known_to_the_next() {
        // The multi-agent path gives every agent its own Registry. Before
        // health was shared, each one rediscovered the same dead provider:
        // a real run attempted a broken provider seven times, once per
        // agent, each paying a full round trip.
        let cfg = cfg_with(&[("a", 1), ("b", 2)]);
        let shared = new_shared_health();

        let mut planner = Registry::from_config(&cfg).with_shared_health(shared.clone());
        planner.record_failure("a");

        let executor = Registry::from_config(&cfg).with_shared_health(shared.clone());
        assert!(executor.in_cooldown("a"), "the second agent must not rediscover it");
        assert!(!executor.in_cooldown("b"), "a healthy provider stays available");

        // And recovery propagates the same way, or a provider that came back
        // would stay shunned for the rest of the run.
        let mut reviewer = Registry::from_config(&cfg).with_shared_health(shared.clone());
        reviewer.record_success("a");
        assert!(!executor.in_cooldown("a"));
    }

    #[test]
    fn registries_that_do_not_share_health_stay_independent() {
        // The single-agent path builds one registry per process; nothing
        // should leak between unrelated registries just because health
        // became shareable.
        let cfg = cfg_with(&[("a", 1)]);
        let mut first = Registry::from_config(&cfg);
        first.record_failure("a");
        let second = Registry::from_config(&cfg);
        assert!(!second.in_cooldown("a"));
    }

    #[test]
    fn an_empty_pin_leaves_the_registry_and_its_fallback_alone() {
        let reg = Registry::from_config(&cfg_with(&[("a", 1), ("b", 2)])).pinned(&Pin::default()).unwrap();
        assert_eq!(reg.provider_ids(), vec!["a", "b"]);
    }

    #[test]
    fn pinning_a_provider_drops_the_others_so_no_fallback_can_reroute_the_task() {
        // The point of a pin: someone who names their local provider must
        // not have the task quietly sent somewhere else when it is down.
        let reg = Registry::from_config(&cfg_with(&[("a", 1), ("b", 2), ("c", 3)]))
            .pinned(&Pin { provider: Some("b".into()), model: None })
            .unwrap();
        assert_eq!(reg.provider_ids(), vec!["b"]);
    }

    #[test]
    fn pinning_an_unknown_provider_fails_and_names_the_ones_that_exist() {
        // `err()` rather than `unwrap_err()`: Registry owns a SQLite handle
        // and is deliberately not Debug.
        let err = Registry::from_config(&cfg_with(&[("a", 1), ("b", 2)]))
            .pinned(&Pin { provider: Some("typo".into()), model: None })
            .err()
            .expect("an unknown id must not silently succeed");
        assert!(err.contains("typo"), "{err}");
        assert!(err.contains('a') && err.contains('b'), "should list what is available: {err}");
    }

    #[test]
    fn a_pinned_model_overrides_only_the_pinned_provider() {
        let reg = Registry::from_config(&cfg_with(&[("a", 1), ("b", 2)]))
            .pinned(&Pin { provider: Some("b".into()), model: Some("some-other-model".into()) })
            .unwrap();
        assert_eq!(reg.providers.len(), 1);
        assert_eq!(reg.providers[0].id, "b");
        assert_eq!(reg.providers[0].model, "some-other-model");
    }

    #[test]
    fn a_model_pinned_alone_takes_the_highest_priority_provider_with_it() {
        // A model name has no meaning apart from the provider serving it,
        // so pinning one necessarily pins a provider too.
        let reg = Registry::from_config(&cfg_with(&[("a", 1), ("b", 2)]))
            .pinned(&Pin { provider: None, model: Some("m2".into()) })
            .unwrap();
        assert_eq!(reg.provider_ids(), vec!["a"]);
        assert_eq!(reg.providers[0].model, "m2");
    }

    #[test]
    fn pinning_a_model_with_no_usable_provider_is_an_error_not_a_panic() {
        // `remove(0)` on an empty vec would panic; this is the guard.
        let reg = Registry::from_config(&cfg_with(&[]));
        assert!(reg.pinned(&Pin { provider: None, model: Some("m2".into()) }).is_err(), "must not panic");
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
        let first = reg.health().get("a").unwrap().clone().cooling_until.unwrap();
        reg.record_failure("a");
        let second = reg.health().get("a").unwrap().clone().cooling_until.unwrap();
        assert!(second > first, "second failure must cool down longer");
        reg.record_success("a");
        assert!(reg.health().get("a").unwrap().clone().cooling_until.is_none());
        assert_eq!(reg.health().get("a").unwrap().clone().consecutive_failures, 0);
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
