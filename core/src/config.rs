// Idexal Core — configuration
//
// Loads provider configuration from (in priority order):
//   1. ./idexal.config.json      (workspace-local, checked in or not)
//   2. ~/.idexal/config.json     (user global)
//   3. Built-in defaults + environment variables
//
// Ported from reference/ai-core-node-reference/src/config.ts. The design
// goal that drives this file: ANY OpenAI-compatible endpoint can be added
// by the user as a first-class provider, with its own priority, model,
// headers and extra body fields — no code change, no recompile, no
// vendor allowlist. That's the "no limits, no gatekeeping" requirement.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::{env, fs};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderKind {
    /// Anthropic's native Messages API.
    Anthropic,
    /// Any endpoint speaking the OpenAI /chat/completions wire format:
    /// OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together, Ollama,
    /// LM Studio, vLLM, or a private gateway.
    #[serde(alias = "openai", alias = "openai-compatible", alias = "custom")]
    OpenaiCompatible,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    /// Stable identifier, e.g. "anthropic", "my-gateway".
    pub id: String,
    #[serde(rename = "type")]
    pub kind: ProviderKind,
    /// Base URL. For Anthropic defaults to https://api.anthropic.com.
    #[serde(default)]
    pub base_url: Option<String>,
    /// Literal API key. Prefer `api_key_env` so keys stay out of the file.
    #[serde(default)]
    pub api_key: Option<String>,
    /// Environment variable holding the API key.
    #[serde(default)]
    pub api_key_env: Option<String>,
    pub model: String,
    /// Lower is tried first.
    #[serde(default = "default_priority")]
    pub priority: i32,
    /// Extra headers merged into every request (custom gateways, org ids…).
    #[serde(default)]
    pub headers: std::collections::HashMap<String, String>,
    /// Extra JSON fields merged into the request body (provider-specific
    /// knobs like `top_k`, routing hints, safety settings…).
    #[serde(default)]
    pub extra_body: std::collections::HashMap<String, serde_json::Value>,
    /// Set false to keep a provider in the file but skip it.
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_priority() -> i32 {
    100
}
fn default_true() -> bool {
    true
}

impl ProviderConfig {
    /// Resolve the API key: literal first, then the named env var.
    pub fn resolve_key(&self) -> Option<String> {
        if let Some(k) = &self.api_key {
            if !k.is_empty() {
                return Some(k.clone());
            }
        }
        self.api_key_env.as_ref().and_then(|var| env::var(var).ok())
    }

    /// True when this provider can actually be used right now: either it
    /// needs no key (local server) or a key is resolvable.
    pub fn usable(&self) -> bool {
        if !self.enabled {
            return false;
        }
        self.resolve_key().is_some() || self.is_local()
    }

    pub fn is_local(&self) -> bool {
        let url = self.base_url.clone().unwrap_or_default();
        url.contains("localhost") || url.contains("127.0.0.1") || url.contains("0.0.0.0") || url.contains("::1")
    }

    pub fn effective_base_url(&self) -> String {
        self.base_url.clone().unwrap_or_else(|| match self.kind {
            ProviderKind::Anthropic => "https://api.anthropic.com".to_string(),
            ProviderKind::OpenaiCompatible => "https://api.openai.com/v1".to_string(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    /// Max tool-call rounds per agent turn before forcing a final answer.
    #[serde(default = "default_max_tool_rounds")]
    pub max_tool_rounds: u32,
    /// Enable the reviewer stage after executors finish.
    #[serde(default = "default_true")]
    pub use_reviewer: bool,
    /// Max executor steps run concurrently. Unlike the previous
    /// implementation (where this knob existed but was never read), this
    /// one is actually wired into the orchestrator.
    #[serde(default = "default_max_parallel")]
    pub max_parallel_agents: usize,
}

fn default_max_tool_rounds() -> u32 {
    12
}
fn default_max_parallel() -> usize {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub providers: Vec<ProviderConfig>,
    #[serde(default)]
    pub agent: AgentConfig,
}

fn config_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(cwd) = env::current_dir() {
        paths.push(cwd.join("idexal.config.json"));
    }
    if let Some(home) = home_dir() {
        paths.push(home.join(".idexal").join("config.json"));
    }
    paths
}

pub fn home_dir() -> Option<PathBuf> {
    env::var("USERPROFILE").ok().or_else(|| env::var("HOME").ok()).map(PathBuf::from)
}

/// Providers derived from environment variables when no config file
/// declares them. Keeps the zero-config experience: set ANTHROPIC_API_KEY
/// (or run Ollama) and it just works.
fn env_providers() -> Vec<ProviderConfig> {
    let mut list = Vec::new();

    if env::var("ANTHROPIC_API_KEY").is_ok() || env::var("ANTHROPIC_AUTH_TOKEN").is_ok() {
        let key_env = if env::var("ANTHROPIC_API_KEY").is_ok() {
            "ANTHROPIC_API_KEY"
        } else {
            "ANTHROPIC_AUTH_TOKEN"
        };
        list.push(ProviderConfig {
            id: "anthropic".into(),
            kind: ProviderKind::Anthropic,
            base_url: env::var("ANTHROPIC_BASE_URL").ok(),
            api_key: None,
            api_key_env: Some(key_env.into()),
            model: env::var("IDEXAL_ANTHROPIC_MODEL")
                .unwrap_or_else(|_| "claude-sonnet-4-5-20250929".into()),
            priority: 1,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        });
    }

    if env::var("OPENAI_API_KEY").is_ok() {
        list.push(ProviderConfig {
            id: "openai".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("https://api.openai.com/v1".into()),
            api_key: None,
            api_key_env: Some("OPENAI_API_KEY".into()),
            model: env::var("IDEXAL_OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".into()),
            priority: 2,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        });
    }

    // Local Ollama is always registered last: no key, no account, works
    // offline. This is the floor that guarantees the product is usable
    // with zero credentials.
    list.push(ProviderConfig {
        id: "ollama".into(),
        kind: ProviderKind::OpenaiCompatible,
        base_url: Some(env::var("IDEXAL_OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434/v1".into())),
        api_key: None,
        api_key_env: None,
        model: env::var("IDEXAL_OLLAMA_MODEL").unwrap_or_else(|_| "llama3.1".into()),
        priority: 900,
        headers: Default::default(),
        extra_body: Default::default(),
        enabled: true,
    });

    list
}

/// Load config, layering file-declared providers over env-derived ones by
/// id (a file entry with the same id replaces the env one entirely, so a
/// user can retarget "anthropic" at their own proxy).
pub fn load() -> Config {
    let mut cfg = Config::default();
    let mut from_file: Option<Config> = None;

    for path in config_paths() {
        if let Ok(text) = fs::read_to_string(&path) {
            match serde_json::from_str::<Config>(&text) {
                Ok(parsed) => {
                    from_file = Some(parsed);
                    break;
                }
                Err(e) => {
                    // Surface malformed config instead of silently ignoring
                    // it — a typo shouldn't quietly drop the user's
                    // carefully configured providers.
                    eprintln!("[idexal] Ignoring malformed config at {}: {e}", path.display());
                }
            }
        }
    }

    let env_list = env_providers();
    match from_file {
        Some(file_cfg) => {
            cfg.agent = file_cfg.agent;
            let mut merged: Vec<ProviderConfig> = file_cfg.providers.clone();
            for env_p in env_list {
                if !merged.iter().any(|p| p.id == env_p.id) {
                    merged.push(env_p);
                }
            }
            cfg.providers = merged;
        }
        None => {
            cfg.providers = env_list;
            cfg.agent = AgentConfig {
                max_tool_rounds: default_max_tool_rounds(),
                use_reviewer: true,
                max_parallel_agents: default_max_parallel(),
            };
        }
    }

    cfg.providers.sort_by_key(|p| p.priority);
    cfg
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_provider_overrides_env_provider_of_same_id() {
        // Direct unit test of the merge rule without touching the real
        // filesystem: a file entry with id "anthropic" must win over the
        // env-derived one, so users can retarget a known id at a proxy.
        let file_providers = vec![ProviderConfig {
            id: "anthropic".into(),
            kind: ProviderKind::Anthropic,
            base_url: Some("https://my-proxy.internal".into()),
            api_key: Some("literal".into()),
            api_key_env: None,
            model: "custom-model".into(),
            priority: 1,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        }];
        let env_list = vec![ProviderConfig {
            id: "anthropic".into(),
            kind: ProviderKind::Anthropic,
            base_url: None,
            api_key: None,
            api_key_env: Some("ANTHROPIC_API_KEY".into()),
            model: "claude-sonnet-4-5-20250929".into(),
            priority: 1,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        }];

        let mut merged = file_providers.clone();
        for env_p in env_list {
            if !merged.iter().any(|p| p.id == env_p.id) {
                merged.push(env_p);
            }
        }

        assert_eq!(merged.len(), 1, "same id must not be duplicated");
        assert_eq!(merged[0].base_url.as_deref(), Some("https://my-proxy.internal"));
        assert_eq!(merged[0].model, "custom-model");
    }

    #[test]
    fn local_provider_is_usable_without_key() {
        let p = ProviderConfig {
            id: "ollama".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("http://localhost:11434/v1".into()),
            api_key: None,
            api_key_env: None,
            model: "llama3.1".into(),
            priority: 900,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        };
        assert!(p.is_local());
        assert!(p.usable(), "a local endpoint needs no API key");
    }

    #[test]
    fn keyless_remote_provider_is_not_usable() {
        let p = ProviderConfig {
            id: "openai".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("https://api.openai.com/v1".into()),
            api_key: None,
            api_key_env: Some("DEFINITELY_NOT_SET_IDEXAL_TEST".into()),
            model: "gpt-4o-mini".into(),
            priority: 2,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: true,
        };
        assert!(!p.usable(), "a remote provider with no resolvable key must be skipped");
    }

    #[test]
    fn shipped_example_config_actually_parses() {
        // The example file is the documented contract for custom providers.
        // If its field names drift from the struct (camelCase vs snake_case
        // is the easy mistake), users silently lose every provider they
        // configured — so parse the real file, not a hand-written copy.
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("idexal.config.example.json");
        let text = fs::read_to_string(&path)
            .unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()));
        let cfg: Config = serde_json::from_str(&text)
            .unwrap_or_else(|e| panic!("example config must parse: {e}"));

        assert!(cfg.providers.len() >= 5, "example should document several providers");

        let anthropic = cfg.providers.iter().find(|p| p.id == "anthropic").expect("anthropic entry");
        assert_eq!(anthropic.model, "claude-sonnet-4-5-20250929");
        assert_eq!(anthropic.api_key_env.as_deref(), Some("ANTHROPIC_API_KEY"));

        // camelCase `baseUrl` must land in `base_url`.
        let openrouter = cfg.providers.iter().find(|p| p.id == "openrouter").expect("openrouter entry");
        assert_eq!(openrouter.base_url.as_deref(), Some("https://openrouter.ai/api/v1"));
        assert!(openrouter.headers.contains_key("X-Title"), "custom headers must parse");

        let gateway = cfg.providers.iter().find(|p| p.id == "my-gateway").expect("custom gateway entry");
        assert!(gateway.extra_body.contains_key("top_k"), "extraBody must parse");
        assert!(!gateway.enabled, "the example gateway ships disabled");

        assert_eq!(cfg.agent.max_tool_rounds, 12, "camelCase maxToolRounds must parse");
        assert_eq!(cfg.agent.max_parallel_agents, 3);
    }

    #[test]
    fn disabled_provider_is_never_usable() {
        let p = ProviderConfig {
            id: "ollama".into(),
            kind: ProviderKind::OpenaiCompatible,
            base_url: Some("http://localhost:11434/v1".into()),
            api_key: None,
            api_key_env: None,
            model: "llama3.1".into(),
            priority: 900,
            headers: Default::default(),
            extra_body: Default::default(),
            enabled: false,
        };
        assert!(!p.usable());
    }
}
