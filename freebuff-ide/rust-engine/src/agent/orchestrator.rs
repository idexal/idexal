//! Orchestrator Agent - Coordinates multiple agents for complex tasks

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
    
    /// Register an agent with the orchestrator
    pub fn register_agent(&self, agent: Arc<dyn Agent>) {
        let agent_type = agent.agent_type();
        self.agents.insert(agent_type, agent);
        log::info!("Registered agent: {}", agent_type);
    }
    
    /// Get a registered agent by type
    pub fn get_agent(&self, agent_type: &AgentType) -> Option<Arc<dyn Agent>> {
        self.agents.get(agent_type).map(|a| a.value().clone())
    }
    
    /// Decompose a complex task into subtasks
    fn decompose_task(&self, task: &AgentTask) -> Vec<AgentTask> {
        let mut subtasks = Vec::new();
        
        match task.agent_type {
            AgentType::Orchestrator => {
                // Analyze the task and determine which agents should handle it
                let description = task.description.to_lowercase();
                
                if description.contains("code") || description.contains("implement") || description.contains("write") {
                    subtasks.push(create_task(
                        AgentType::Code,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
                
                if description.contains("review") || description.contains("check") || description.contains("analyze") {
                    subtasks.push(create_task(
                        AgentType::Review,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
                
                if description.contains("bug") || description.contains("error") || description.contains("fix") {
                    subtasks.push(create_task(
                        AgentType::Debug,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
                
                if description.contains("architecture") || description.contains("design") || description.contains("plan") {
                    subtasks.push(create_task(
                        AgentType::Architect,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
                
                if description.contains("test") || description.contains("spec") {
                    subtasks.push(create_task(
                        AgentType::Test,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
                
                // If no specific agent matched, assign to Code agent
                if subtasks.is_empty() {
                    subtasks.push(create_task(
                        AgentType::Code,
                        task.description.clone(),
                        task.context.clone(),
                        task.priority,
                    ));
                }
            }
            _ => {
                // Direct task to specified agent
                subtasks.push(task.clone());
            }
        }
        
        subtasks
    }
    
    /// Execute a task by routing it to the appropriate agent(s)
    pub async fn execute_task(&self, task: AgentTask) -> Result<AgentResponse, AgentError> {
        log::info!("Executing task: {} for agent: {}", task.description, task.agent_type);
        
        let subtasks = self.decompose_task(&task);
        let mut all_results = Vec::new();
        
        for subtask in subtasks {
            let agent = self.get_agent(&subtask.agent_type)
                .ok_or_else(|| AgentError::NotFound(subtask.agent_type.to_string()))?;
            
            let response = agent.process_task(subtask).await?;
            all_results.push(response);
        }
        
        // Combine results
        let combined_result = all_results.iter()
            .filter_map(|r| r.result.as_ref())
            .cloned()
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");
        
        let combined_thinking = all_results.iter()
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
    
    /// Get statistics about registered agents
    pub fn get_stats(&self) -> serde_json::Value {
        let agent_count = self.agents.len();
        let queue_size = self.task_queue.read().len();
        
        serde_json::json!({
            "agent_count": agent_count,
            "queue_size": queue_size,
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
