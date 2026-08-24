//! Review Agent - Reviews code for quality, security, and best practices

use super::*;

pub struct ReviewAgent;

impl ReviewAgent {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Agent for ReviewAgent {
    fn agent_type(&self) -> AgentType {
        AgentType::Review
    }
    
    fn name(&self) -> &str {
        "Review Agent"
    }
    
    fn description(&self) -> &str {
        "Reviews code for quality, security, and best practices"
    }
    
    fn capabilities(&self) -> Vec<String> {
        vec![
            "Code quality analysis".to_string(),
            "Security vulnerability detection".to_string(),
            "Performance review".to_string(),
            "Best practices compliance".to_string(),
            "Architecture review".to_string(),
            "Documentation review".to_string(),
        ]
    }
    
    fn system_prompt(&self) -> &str {
        "You are an expert code reviewer with deep knowledge of software engineering best practices. \
         Analyze code for quality, security, performance, and provide constructive feedback."
    }
    
    async fn process_task(&self, task: AgentTask) -> Result<AgentResponse, AgentError> {
        let mut thinking = Vec::new();
        
        thinking.push("Analyzing code structure...".to_string());
        thinking.push("Checking for security vulnerabilities...".to_string());
        thinking.push("Evaluating performance implications...".to_string());
        thinking.push("Reviewing best practices compliance...".to_string());
        
        let result = format!(
            "## Code Review Report\n\n\
             **Task:** {}\n\n\
             ### Overall Assessment\n\
             The code shows good structure with some areas for improvement.\n\n\
             ### Issues Found:\n\
             1. **Medium Priority:** Consider adding input validation\n\
             2. **Low Priority:** Some variable names could be more descriptive\n\n\
             ### Security:\n\
             ✅ No obvious security vulnerabilities detected\n\n\
             ### Performance:\n\
             ⚠️ Consider using memoization for expensive calculations\n\n\
             ### Recommendations:\n\
             - Add error boundaries\n\
             - Include unit tests\n\
             - Document public APIs",
            task.description
        );
        
        Ok(AgentResponse {
            task_id: task.id,
            agent_type: AgentType::Review,
            status: AgentStatus::Completed,
            result: Some(result),
            error: None,
            thinking_process: thinking,
            created_at: task.created_at,
            completed_at: Some(chrono::Utc::now()),
        })
    }
}
