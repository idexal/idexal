//! Test Agent - Writes comprehensive tests and test strategies

use super::*;

pub struct TestAgent;

impl TestAgent {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl Agent for TestAgent {
    fn agent_type(&self) -> AgentType {
        AgentType::Test
    }
    
    fn name(&self) -> &str {
        "Test Agent"
    }
    
    fn description(&self) -> &str {
        "Writes comprehensive tests and test strategies"
    }
    
    fn capabilities(&self) -> Vec<String> {
        vec![
            "Unit test creation".to_string(),
            "Integration test design".to_string(),
            "Test strategy planning".to_string(),
            "Mock/stub generation".to_string(),
            "Edge case identification".to_string(),
            "Test coverage analysis".to_string(),
        ]
    }
    
    fn system_prompt(&self) -> &str {
        "You are a testing expert who writes comprehensive, reliable tests. \
         Cover happy paths, edge cases, and follow AAA pattern."
    }
    
    async fn process_task(&self, task: AgentTask) -> Result<AgentResponse, AgentError> {
        let mut thinking = Vec::new();
        
        thinking.push("Analyzing code to test...".to_string());
        thinking.push("Identifying test scenarios...".to_string());
        thinking.push("Generating test cases...".to_string());
        thinking.push("Creating mock implementations...".to_string());
        
        let result = format!(
            "## Test Strategy\n\n\
             **Task:** {}\n\n\
             ### Test Coverage Plan\n\
             ```typescript\n\
             describe('DataProcessor', () => {{\n\
               describe('processData', () => {{\n\
                 it('should handle valid input correctly', () => {{\n\
                   // Arrange\n\
                   const input = createTestData();\n\
                   \n\
                   // Act\n\
                   const result = processData(input);\n\
                   \n\
                   // Assert\n\
                   expect(result).toBeDefined();\n\
                   expect(result.status).toBe('processed');\n\
                 }});\n\
                 \n\
                 it('should throw error for invalid input', () => {{\n\
                   expect(() => processData(null)).toThrow();\n\
                 }});\n\
                 \n\
                 it('should handle edge cases', () => {{\n\
                   const edgeCase = createEdgeCaseData();\n\
                   const result = processData(edgeCase);\n\
                   expect(result).toBeDefined();\n\
                 }});\n\
               }});\n\
             }});\n\
             ```\n\n\
             ### Test Types to Include:\n\
             1. Unit tests (80%)\n\
             2. Integration tests (15%)\n\
             3. E2E tests (5%)\n\n\
             ### Mocking Strategy:\n\
             - External APIs: Mock all HTTP calls\n\
             - Database: Use in-memory database\n\
             - File System: Mock file operations",
            task.description
        );
        
        Ok(AgentResponse {
            task_id: task.id,
            agent_type: AgentType::Test,
            status: AgentStatus::Completed,
            result: Some(result),
            error: None,
            thinking_process: thinking,
            created_at: task.created_at,
            completed_at: Some(chrono::Utc::now()),
        })
    }
}
