//! Multi-agent system for Idexal IDE
//!
//! This module implements a sophisticated multi-agent architecture where
//! specialized agents collaborate to handle different aspects of software development.

pub mod orchestrator;
pub mod code_agent;
pub mod review_agent;
pub mod debug_agent;
pub mod architect;
pub mod test_agent;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use thiserror::Error;

// ── Newtype IDs ───────────────────────────────────────────────────────

/// Unique task identifier — newtype over `Uuid` prevents accidental swaps
/// with other ID-bearing strings (`agent_type`, `session_id`, etc.).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TaskId(pub String);

impl TaskId {
    /// Generate a new random task ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4().to_string())
    }
}

impl Default for TaskId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for TaskId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl From<String> for TaskId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

// ── Agent types ───────────────────────────────────────────────────────

/// Agent types available in the system.
///
/// This enum is `#[non_exhaustive]` — new variants may be added in minor
/// releases without breaking downstream code.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[non_exhaustive]
#[serde(rename_all = "snake_case")]
pub enum AgentType {
    Code,
    Review,
    Debug,
    Architect,
    Test,
    Orchestrator,
}

impl std::fmt::Display for AgentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Code => write!(f, "Code"),
            Self::Review => write!(f, "Review"),
            Self::Debug => write!(f, "Debug"),
            Self::Architect => write!(f, "Architect"),
            Self::Test => write!(f, "Test"),
            Self::Orchestrator => write!(f, "Orchestrator"),
        }
    }
}

/// Agent status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[non_exhaustive]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Idle,
    Thinking,
    Executing,
    Completed,
    Error,
}

/// Task assigned to an agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: TaskId,
    pub agent_type: AgentType,
    pub description: String,
    pub context: HashMap<String, String>,
    pub priority: u8,
    pub created_at: DateTime<Utc>,
    pub status: AgentStatus,
}

/// Agent response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub task_id: TaskId,
    pub agent_type: AgentType,
    pub status: AgentStatus,
    pub result: Option<String>,
    pub error: Option<String>,
    pub thinking_process: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

// ── Error type ────────────────────────────────────────────────────────

/// Agent error types.
#[derive(Error, Debug)]
#[non_exhaustive]
pub enum AgentError {
    #[error("agent not found: {0}")]
    NotFound(String),

    #[error("agent is busy: {0}")]
    Busy(String),

    #[error("task failed: {0}")]
    TaskFailed(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("internal error: {0}")]
    Internal(String),
}

// ── Agent trait (native async fn — no async_trait macro) ──────────────

/// Trait for all agents.
///
/// Uses native `async fn` in traits (stable since Rust 1.75).
/// Implementors must be `Send + Sync` to work with `Arc<dyn Agent>`.
pub trait Agent: Send + Sync {
    /// Get agent type.
    fn agent_type(&self) -> AgentType;

    /// Get agent name.
    fn name(&self) -> &str;

    /// Get agent description.
    fn description(&self) -> &str;

    /// Get agent capabilities.
    fn capabilities(&self) -> Vec<String>;

    /// Process a task asynchronously.
    fn process_task(&self, task: AgentTask) -> Pin<Box<dyn Future<Output = Result<AgentResponse, AgentError>> + Send>>;

    /// Get system prompt.
    fn system_prompt(&self) -> &str;
}

// ── Helpers ───────────────────────────────────────────────────────────

/// Create a new agent task with a random ID.
pub fn create_task(
    agent_type: AgentType,
    description: String,
    context: HashMap<String, String>,
    priority: u8,
) -> AgentTask {
    AgentTask {
        id: TaskId::new(),
        agent_type,
        description,
        context,
        priority,
        created_at: Utc::now(),
        status: AgentStatus::Idle,
    }
}

/// Get default system prompt for agent type.
pub fn get_system_prompt(agent_type: &AgentType) -> &'static str {
    match agent_type {
        AgentType::Code => {
            "You are an expert software engineer specializing in writing high-quality, clean code. \
             You follow best practices, design patterns, and write maintainable, efficient code. \
             Always consider code readability, error handling, performance, and security."
        }
        AgentType::Review => {
            "You are an expert code reviewer with deep knowledge of software engineering best practices. \
             Analyze code for quality, security, performance, and provide constructive feedback."
        }
        AgentType::Debug => {
            "You are an expert debugger with systematic problem-solving skills. \
             Analyze errors, identify root causes, and provide fixes with explanations."
        }
        AgentType::Architect => {
            "You are a senior software architect with expertise in system design. \
             Plan scalable, maintainable architectures with appropriate design patterns."
        }
        AgentType::Test => {
            "You are a testing expert who writes comprehensive, reliable tests. \
             Cover happy paths, edge cases, and follow AAA pattern."
        }
        AgentType::Orchestrator => {
            "You are the orchestrator agent that coordinates other agents. \
             Analyze tasks, break them down, and delegate to specialized agents."
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    // ── TaskId ────────────────────────────────────────────────────────

    #[test]
    fn task_id_new_is_unique() {
        let a = TaskId::new();
        let b = TaskId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn task_id_display() {
        let id = TaskId("abc-123".into());
        assert_eq!(id.to_string(), "abc-123");
    }

    #[test]
    fn task_id_from_string() {
        let id: TaskId = "test-id".to_string().into();
        assert_eq!(id.0, "test-id");
    }

    #[test]
    fn task_id_default_generates_uuid() {
        let id = TaskId::default();
        assert!(!id.0.is_empty());
        // UUID v4 format: 8-4-4-4-12
        assert_eq!(id.0.chars().filter(|c| *c == '-').count(), 4);
    }

    #[test]
    fn task_id_serde_roundtrip() {
        let id = TaskId::new();
        let json = serde_json::to_string(&id).unwrap();
        let back: TaskId = serde_json::from_str(&json).unwrap();
        assert_eq!(id, back);
    }

    // ── AgentType ─────────────────────────────────────────────────────

    #[test]
    fn agent_type_display() {
        assert_eq!(AgentType::Code.to_string(), "Code");
        assert_eq!(AgentType::Review.to_string(), "Review");
        assert_eq!(AgentType::Debug.to_string(), "Debug");
        assert_eq!(AgentType::Architect.to_string(), "Architect");
        assert_eq!(AgentType::Test.to_string(), "Test");
        assert_eq!(AgentType::Orchestrator.to_string(), "Orchestrator");
    }

    #[test]
    fn agent_type_serde_snake_case() {
        let json = serde_json::to_string(&AgentType::Code).unwrap();
        assert_eq!(json, "\"code\"");
        let back: AgentType = serde_json::from_str("\"review\"").unwrap();
        assert_eq!(back, AgentType::Review);
    }

    #[test]
    fn agent_type_serde_roundtrip_all_variants() {
        let variants = [
            AgentType::Code,
            AgentType::Review,
            AgentType::Debug,
            AgentType::Architect,
            AgentType::Test,
            AgentType::Orchestrator,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: AgentType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    // ── AgentStatus ───────────────────────────────────────────────────

    #[test]
    fn agent_status_serde_snake_case() {
        let json = serde_json::to_string(&AgentStatus::Thinking).unwrap();
        assert_eq!(json, "\"thinking\"");
    }

    #[test]
    fn agent_status_serde_roundtrip() {
        for status in [AgentStatus::Idle, AgentStatus::Executing, AgentStatus::Completed, AgentStatus::Error] {
            let json = serde_json::to_string(&status).unwrap();
            let back: AgentStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(status, back);
        }
    }

    // ── AgentError ────────────────────────────────────────────────────

    #[test]
    fn agent_error_messages_are_lowercase() {
        let cases = [
            (AgentError::NotFound("foo".into()), "agent not found: foo"),
            (AgentError::Busy("bar".into()), "agent is busy: bar"),
            (AgentError::TaskFailed("baz".into()), "task failed: baz"),
            (AgentError::InvalidInput("qux".into()), "invalid input: qux"),
            (AgentError::Internal("err".into()), "internal error: err"),
        ];
        for (err, expected) in cases {
            assert_eq!(err.to_string(), expected);
        }
    }

    #[test]
    fn agent_error_is_display() {
        // Verify the Error trait works
        let err = AgentError::NotFound("x".into());
        let display = format!("{err}");
        assert!(display.starts_with("agent not found"));
    }

    // ── create_task ───────────────────────────────────────────────────

    #[test]
    fn create_task_sets_fields_correctly() {
        let mut ctx = HashMap::new();
        ctx.insert("file".into(), "main.rs".into());

        let task = create_task(AgentType::Code, "implement feature".into(), ctx.clone(), 5);

        assert_eq!(task.agent_type, AgentType::Code);
        assert_eq!(task.description, "implement feature");
        assert_eq!(task.context.get("file").unwrap(), "main.rs");
        assert_eq!(task.priority, 5);
        assert_eq!(task.status, AgentStatus::Idle);
        assert!(!task.id.0.is_empty());
    }

    #[test]
    fn create_task_generates_unique_ids() {
        let a = create_task(AgentType::Code, "a".into(), HashMap::new(), 1);
        let b = create_task(AgentType::Code, "a".into(), HashMap::new(), 1);
        assert_ne!(a.id, b.id);
    }

    // ── get_system_prompt ─────────────────────────────────────────────

    #[test]
    fn get_system_prompt_returns_non_empty_for_all_variants() {
        let variants = [
            AgentType::Code,
            AgentType::Review,
            AgentType::Debug,
            AgentType::Architect,
            AgentType::Test,
            AgentType::Orchestrator,
        ];
        for v in variants {
            let prompt = get_system_prompt(&v);
            assert!(!prompt.is_empty(), "prompt for {v:?} should not be empty");
        }
    }

    // ── AgentTask serde ───────────────────────────────────────────────

    #[test]
    fn agent_task_serde_roundtrip() {
        let task = create_task(AgentType::Debug, "fix bug".into(), HashMap::new(), 3);
        let json = serde_json::to_string(&task).unwrap();
        let back: AgentTask = serde_json::from_str(&json).unwrap();
        assert_eq!(task.id, back.id);
        assert_eq!(task.agent_type, back.agent_type);
        assert_eq!(task.description, back.description);
        assert_eq!(task.priority, back.priority);
    }

    // ── AgentResponse serde ───────────────────────────────────────────

    #[test]
    fn agent_response_serde_roundtrip() {
        let resp = AgentResponse {
            task_id: TaskId::new(),
            agent_type: AgentType::Code,
            status: AgentStatus::Completed,
            result: Some("done".into()),
            error: None,
            thinking_process: vec!["step 1".into()],
            created_at: Utc::now(),
            completed_at: Some(Utc::now()),
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: AgentResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(resp.task_id, back.task_id);
        assert_eq!(resp.result, back.result);
        assert_eq!(resp.thinking_process, back.thinking_process);
    }
}
