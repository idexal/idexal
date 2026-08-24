//! Multi-agent system for Freebuff IDE
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
use uuid::Uuid;
use chrono::{DateTime, Utc};
use thiserror::Error;

/// Agent types available in the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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
            AgentType::Code => write!(f, "Code"),
            AgentType::Review => write!(f, "Review"),
            AgentType::Debug => write!(f, "Debug"),
            AgentType::Architect => write!(f, "Architect"),
            AgentType::Test => write!(f, "Test"),
            AgentType::Orchestrator => write!(f, "Orchestrator"),
        }
    }
}

/// Agent status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgentStatus {
    Idle,
    Thinking,
    Executing,
    Completed,
    Error,
}

/// Task assigned to an agent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub agent_type: AgentType,
    pub description: String,
    pub context: HashMap<String, String>,
    pub priority: u8,
    pub created_at: DateTime<Utc>,
    pub status: AgentStatus,
}

/// Agent response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub task_id: String,
    pub agent_type: AgentType,
    pub status: AgentStatus,
    pub result: Option<String>,
    pub error: Option<String>,
    pub thinking_process: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Agent error types
#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Agent not found: {0}")]
    NotFound(String),
    
    #[error("Agent is busy: {0}")]
    Busy(String),
    
    #[error("Task failed: {0}")]
    TaskFailed(String),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Trait for all agents
#[async_trait::async_trait]
pub trait Agent: Send + Sync {
    /// Get agent type
    fn agent_type(&self) -> AgentType;
    
    /// Get agent name
    fn name(&self) -> &str;
    
    /// Get agent description
    fn description(&self) -> &str;
    
    /// Get agent capabilities
    fn capabilities(&self) -> Vec<String>;
    
    /// Process a task
    async fn process_task(&self, task: AgentTask) -> Result<AgentResponse, AgentError>;
    
    /// Get system prompt
    fn system_prompt(&self) -> &str;
}

/// Create a new agent task
pub fn create_task(
    agent_type: AgentType,
    description: String,
    context: HashMap<String, String>,
    priority: u8,
) -> AgentTask {
    AgentTask {
        id: Uuid::new_v4().to_string(),
        agent_type,
        description,
        context,
        priority,
        created_at: Utc::now(),
        status: AgentStatus::Idle,
    }
}

/// Get default system prompt for agent type
pub fn get_system_prompt(agent_type: &AgentType) -> String {
    match agent_type {
        AgentType::Code => {
            "You are an expert software engineer specializing in writing high-quality, clean code. \
             You follow best practices, design patterns, and write maintainable, efficient code. \
             Always consider code readability, error handling, performance, and security."
                .to_string()
        }
        AgentType::Review => {
            "You are an expert code reviewer with deep knowledge of software engineering best practices. \
             Analyze code for quality, security, performance, and provide constructive feedback."
                .to_string()
        }
        AgentType::Debug => {
            "You are an expert debugger with systematic problem-solving skills. \
             Analyze errors, identify root causes, and provide fixes with explanations."
                .to_string()
        }
        AgentType::Architect => {
            "You are a senior software architect with expertise in system design. \
             Plan scalable, maintainable architectures with appropriate design patterns."
                .to_string()
        }
        AgentType::Test => {
            "You are a testing expert who writes comprehensive, reliable tests. \
             Cover happy paths, edge cases, and follow AAA pattern."
                .to_string()
        }
        AgentType::Orchestrator => {
            "You are the orchestrator agent that coordinates other agents. \
             Analyze tasks, break them down, and delegate to specialized agents."
                .to_string()
        }
    }
}
