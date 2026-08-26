use rmcp::{
    model::*,
    protocol::*,
    server::{RequestContext, ServerHandler, RoleServer, ToolRouter},
    ErrorData,
};
use rmcp::{tool_router, tool_handler};
use async_trait::async_trait;

use crate::state::ServerState;
use crate::tools;

pub struct McpHandler {
    state: ServerState,
    tool_router: ToolRouter,
}

#[tool_router]
impl McpHandler {
    // ============================================
    // Code Analysis Tools
    // ============================================
    
    #[tool(
        name = "analyze_code",
        description = "Analyze code for complexity, issues, and suggestions",
        annotations(read_only_hint = true)
    )]
    async fn analyze_code(params: Parameters<tools::AnalyzeCodeParams>) -> Result<String, String> {
        tools::code_analysis::analyze_code(params).await
    }
    
    #[tool(
        name = "find_code_issues",
        description = "Find potential bugs, anti-patterns, and code smells",
        annotations(read_only_hint = true)
    )]
    async fn find_code_issues(params: Parameters<tools::FindIssuesParams>) -> Result<String, String> {
        tools::code_analysis::find_issues(params).await
    }
    
    #[tool(
        name = "suggest_refactor",
        description = "Suggest refactoring improvements for code",
        annotations(read_only_hint = true)
    )]
    async fn suggest_refactor(params: Parameters<tools::RefactorParams>) -> Result<String, String> {
        tools::code_analysis::suggest_refactor(params).await
    }
    
    // ============================================
    // File Operation Tools
    // ============================================
    
    #[tool(
        name = "read_file",
        description = "Read file contents with optional line range",
        annotations(read_only_hint = true)
    )]
    async fn read_file(params: Parameters<tools::ReadFileParams>) -> Result<String, String> {
        tools::file_ops::read_file(params).await
    }
    
    #[tool(
        name = "search_files",
        description = "Search for files by name pattern",
        annotations(read_only_hint = true)
    )]
    async fn search_files(params: Parameters<tools::SearchFilesParams>) -> Result<String, String> {
        tools::file_ops::search_files(params).await
    }
    
    #[tool(
        name = "search_content",
        description = "Search for text patterns in files",
        annotations(read_only_hint = true)
    )]
    async fn search_content(params: Parameters<tools::SearchContentParams>) -> Result<String, String> {
        tools::file_ops::search_content(params).await
    }
    
    #[tool(
        name = "diff_files",
        description = "Compare two files and show differences",
        annotations(read_only_hint = true)
    )]
    async fn diff_files(params: Parameters<tools::DiffFilesParams>) -> Result<String, String> {
        tools::file_ops::diff_files(params).await
    }
    
    // ============================================
    // Code Generation Tools
    // ============================================
    
    #[tool(
        name = "generate_function",
        description = "Generate a function based on description and signature",
        annotations(read_only_hint = true, idempotent_hint = true)
    )]
    async fn generate_function(params: Parameters<tools::GenerateFunctionParams>) -> Result<String, String> {
        tools::code_gen::generate_function(params).await
    }
    
    #[tool(
        name = "generate_tests",
        description = "Generate unit tests for a function or module",
        annotations(read_only_hint = true, idempotent_hint = true)
    )]
    async fn generate_tests(params: Parameters<tools::GenerateTestsParams>) -> Result<String, String> {
        tools::code_gen::generate_tests(params).await
    }
    
    // ============================================
    // Project Info Tools
    // ============================================
    
    #[tool(
        name = "get_project_info",
        description = "Get project structure and metadata",
        annotations(read_only_hint = true)
    )]
    async fn get_project_info(params: Parameters<tools::ProjectInfoParams>) -> Result<String, String> {
        tools::project::get_project_info(params).await
    }
    
    #[tool(
        name = "list_dependencies",
        description = "List project dependencies",
        annotations(read_only_hint = true)
    )]
    async fn list_dependencies(params: Parameters<tools::DependenciesParams>) -> Result<String, String> {
        tools::project::list_dependencies(params).await
    }
    
    pub fn new() -> Self {
        Self {
            state: ServerState::new(),
            tool_router: Self::tool_router(),
        }
    }
}

#[tool_handler]
#[async_trait]
impl ServerHandler for McpHandler {
    async fn list_prompts(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListPromptsResult, ErrorData> {
        let prompts = vec![
            Prompt {
                name: "code-review".to_string(),
                description: Some("Review code for best practices and issues".to_string()),
                arguments: Some(vec![
                    PromptArgument {
                        name: "code".to_string(),
                        description: Some("The code to review".to_string()),
                        required: Some(true),
                    },
                    PromptArgument {
                        name: "language".to_string(),
                        description: Some("Programming language (rust, typescript, python)".to_string()),
                        required: Some(true),
                    },
                ]),
            },
            Prompt {
                name: "explain-code".to_string(),
                description: Some("Explain what code does in detail".to_string()),
                arguments: Some(vec![
                    PromptArgument {
                        name: "code".to_string(),
                        description: Some("The code to explain".to_string()),
                        required: Some(true),
                    },
                ]),
            },
            Prompt {
                name: "refactor-suggestions".to_string(),
                description: Some("Get refactoring suggestions for code".to_string()),
                arguments: Some(vec![
                    PromptArgument {
                        name: "code".to_string(),
                        description: Some("The code to refactor".to_string()),
                        required: Some(true),
                    },
                    PromptArgument {
                        name: "goals".to_string(),
                        description: Some("Refactoring goals (readability, performance, etc.)".to_string()),
                        required: Some(false),
                    },
                ]),
            },
        ];
        
        Ok(ListPromptsResult { prompts })
    }
    
    async fn get_prompt(
        &self,
        request: GetPromptRequestParam,
        _context: RequestContext<RoleServer>,
    ) -> Result<GetPromptResult, ErrorData> {
        let args = request.arguments.as_ref();
        
        match request.name.as_str() {
            "code-review" => {
                let code = args
                    .and_then(|a| a.get("code"))
                    .ok_or_else(|| ErrorData::invalid_params("code required"))?;
                let language = args
                    .and_then(|a| a.get("language"))
                    .unwrap_or(&"unknown".to_string());
                
                Ok(GetPromptResult {
                    description: Some("Code review prompt".to_string()),
                    messages: vec![
                        PromptMessage::user(format!(
                            "Please review this {} code for best practices, potential bugs, and improvements:\n\n```{}\n{}\n```",
                            language, language, code
                        )),
                    ],
                })
            }
            "explain-code" => {
                let code = args
                    .and_then(|a| a.get("code"))
                    .ok_or_else(|| ErrorData::invalid_params("code required"))?;
                
                Ok(GetPromptResult {
                    description: Some("Code explanation prompt".to_string()),
                    messages: vec![
                        PromptMessage::user(format!(
                            "Please explain what this code does in detail, including its purpose, how it works, and any important considerations:\n\n```\n{}\n```",
                            code
                        )),
                    ],
                })
            }
            "refactor-suggestions" => {
                let code = args
                    .and_then(|a| a.get("code"))
                    .ok_or_else(|| ErrorData::invalid_params("code required"))?;
                let goals = args
                    .and_then(|a| a.get("goals"))
                    .unwrap_or(&"general improvement".to_string());
                
                Ok(GetPromptResult {
                    description: Some("Refactoring suggestions prompt".to_string()),
                    messages: vec![
                        PromptMessage::user(format!(
                            "Please suggest refactoring improvements for this code with focus on {}:\n\n```\n{}\n```",
                            goals, code
                        )),
                    ],
                })
            }
            _ => Err(ErrorData::invalid_params("Unknown prompt")),
        }
    }
    
    async fn list_resources(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListResourcesResult, ErrorData> {
        let resources = vec![
            Resource {
                uri: "idexal://project/structure".to_string(),
                name: "Project Structure".to_string(),
                description: Some("Shows the project directory structure".to_string()),
                mime_type: Some("text/plain".to_string()),
            },
            Resource {
                uri: "idexal://project/config".to_string(),
                name: "Project Configuration".to_string(),
                description: Some("Shows project configuration files".to_string()),
                mime_type: Some("application/json".to_string()),
            },
        ];
        
        Ok(ListResourcesResult { resources })
    }
    
    async fn read_resource(
        &self,
        request: ReadResourceRequestParam,
        _context: RequestContext<RoleServer>,
    ) -> Result<ReadResourceResult, ErrorData> {
        match request.uri.as_str() {
            "idexal://project/structure" => {
                let output = std::process::Command::new("find")
                    .args([".", "-type", "f", "-name", "*.rs", "-o", "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.json"])
                    .output()
                    .unwrap_or_default();
                
                let content = String::from_utf8_lossy(&output.stdout).to_string();
                
                Ok(ReadResourceResult {
                    contents: vec![
                        ResourceContents::text(content)
                            .with_uri(request.uri)
                            .with_mime_type("text/plain"),
                    ],
                })
            }
            "idexal://project/config" => {
                let content = std::fs::read_to_string("Cargo.toml")
                    .or_else(|_| std::fs::read_to_string("package.json"))
                    .unwrap_or_else(|_| "{}".to_string());
                
                Ok(ReadResourceResult {
                    contents: vec![
                        ResourceContents::text(content)
                            .with_uri(request.uri)
                            .with_mime_type("application/json"),
                    ],
                })
            }
            _ => Err(ErrorData::invalid_params("Unknown resource")),
        }
    }
}