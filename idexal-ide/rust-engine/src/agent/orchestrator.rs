//! Orchestrator Agent — Coordinates multiple agents for complex tasks

use super::*;
use std::sync::Arc;
use parking_lot::RwLock;
use dashmap::DashMap;

pub struct Orchestrator {
    agents: DashMap<AgentType, Arc<dyn Agent>>,
    task_queue: RwLock<Vec<AgentTask>>,
}

impl Orchestrator {
    pub fn new() -> Self {
        Self {
            agents: DashMap::new(),
            task_queue: RwLock::new(Vec::new()),
        }
    }

    /// Register an agent with the orchestrator.
    pub fn register_agent(&self, agent: Arc<dyn Agent>) {
        let agent_type = agent.agent_type();
        tracing::info!(agent_type = %agent_type, "registered agent");
        self.agents.insert(agent_type, agent);
    }

    /// Get a registered agent by type.
    pub fn get_agent(&self, agent_type: &AgentType) -> Option<Arc<dyn Agent>> {
        self.agents.get(agent_type).map(|a| a.value().clone())
    }

    /// Decompose a complex task into subtasks.
    fn decompose_task(&self, task: &AgentTask) -> Vec<AgentTask> {
        match task.agent_type {
            AgentType::Orchestrator => {
                let desc = task.description.to_lowercase();
                let mut subtasks = Vec::new();

                if desc.contains("code") || desc.contains("implement") || desc.contains("write") {
                    subtasks.push(create_task(AgentType::Code, task.description.clone(), task.context.clone(), task.priority));
                }
                if desc.contains("review") || desc.contains("check") || desc.contains("analyze") {
                    subtasks.push(create_task(AgentType::Review, task.description.clone(), task.context.clone(), task.priority));
                }
                if desc.contains("bug") || desc.contains("error") || desc.contains("fix") {
                    subtasks.push(create_task(AgentType::Debug, task.description.clone(), task.context.clone(), task.priority));
                }
                if desc.contains("architecture") || desc.contains("design") || desc.contains("plan") {
                    subtasks.push(create_task(AgentType::Architect, task.description.clone(), task.context.clone(), task.priority));
                }
                if desc.contains("test") || desc.contains("spec") {
                    subtasks.push(create_task(AgentType::Test, task.description.clone(), task.context.clone(), task.priority));
                }

                if subtasks.is_empty() {
                    subtasks.push(create_task(AgentType::Code, task.description.clone(), task.context.clone(), task.priority));
                }

                subtasks
            }
            _ => vec![task.clone()],
        }
    }

    /// Execute a task by routing it to the appropriate agent(s).
    pub async fn execute_task(&self, task: AgentTask) -> Result<AgentResponse, AgentError> {
        tracing::info!(
            task_id = %task.id,
            agent_type = %task.agent_type,
            description = %task.description,
            "executing task",
        );

        let subtasks = self.decompose_task(&task);
        let mut all_results = Vec::with_capacity(subtasks.len());

        for subtask in subtasks {
            let agent = self
                .get_agent(&subtask.agent_type)
                .ok_or_else(|| AgentError::NotFound(subtask.agent_type.to_string()))?;

            let response = agent.process_task(subtask).await?;
            all_results.push(response);
        }

        let combined_result = all_results
            .iter()
            .filter_map(|r| r.result.as_ref())
            .cloned()
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");

        let combined_thinking = all_results
            .iter()
            .flat_map(|r| r.thinking_process.clone())
            .collect();

        Ok(AgentResponse {
            task_id: task.id,
            agent_type: task.agent_type,
            status: AgentStatus::Completed,
            result: Some(combined_result),
            error: None,
            thinking_process: combined_thinking,
            created_at: task.created_at,
            completed_at: Some(chrono::Utc::now()),
        })
    }

    /// Get statistics about registered agents.
    pub fn get_stats(&self) -> serde_json::Value {
        serde_json::json!({
            "agent_count": self.agents.len(),
            "queue_size": self.task_queue.read().len(),
            "agents": self.agents.iter()
                .map(|entry| entry.key().to_string())
                .collect::<Vec<_>>(),
        })
    }
}

impl Default for Orchestrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::code_agent::CodeAgent;

    #[test]
    fn new_creates_empty_orchestrator() {
        let orch = Orchestrator::new();
        let stats = orch.get_stats();
        assert_eq!(stats["agent_count"], 0);
    }

    #[test]
    fn register_and_get_agent() {
        let orch = Orchestrator::new();
        orch.register_agent(Arc::new(CodeAgent::new()));
        assert!(orch.get_agent(&AgentType::Code).is_some());
        assert!(orch.get_agent(&AgentType::Review).is_none());
    }

    #[test]
    fn get_stats_lists_agents() {
        let orch = Orchestrator::new();
        orch.register_agent(Arc::new(CodeAgent::new()));
        let stats = orch.get_stats();
        assert_eq!(stats["agent_count"], 1);
        let agents = stats["agents"].as_array().unwrap();
        assert!(agents.iter().any(|a| a == "Code"));
    }

    #[tokio::test]
    async fn execute_code_task_with_registered_agent() {
        let orch = Orchestrator::new();
        orch.register_agent(Arc::new(CodeAgent::new()));

        let task = create_task(AgentType::Code, "write a function".into(), HashMap::new(), 1);
        let response = orch.execute_task(task).await.unwrap();

        assert_eq!(response.status, AgentStatus::Completed);
        assert!(response.result.is_some());
        assert!(!response.thinking_process.is_empty());
    }

    #[tokio::test]
    async fn execute_orchestrator_task_routes_to_code_agent() {
        let orch = Orchestrator::new();
        orch.register_agent(Arc::new(CodeAgent::new()));

        // Orchestrator task with "implement" keyword should route to Code agent
        let task = create_task(AgentType::Orchestrator, "implement the parser".into(), HashMap::new(), 1);
        let response = orch.execute_task(task).await.unwrap();

        assert_eq!(response.status, AgentStatus::Completed);
        assert!(response.result.is_some());
    }

    #[tokio::test]
    async fn execute_task_returns_error_for_missing_agent() {
        let orch = Orchestrator::new();
        // No agents registered

        let task = create_task(AgentType::Code, "do something".into(), HashMap::new(), 1);
        let result = orch.execute_task(task).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AgentError::NotFound(agent) => assert_eq!(agent, "Code"),
            other => panic!("expected NotFound, got {other:?}"),
        }
    }
}
