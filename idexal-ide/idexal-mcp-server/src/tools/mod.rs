pub mod code_analysis;
pub mod file_ops;
pub mod code_gen;
pub mod project;

// Re-export parameter types
pub use code_analysis::{AnalyzeCodeParams, FindIssuesParams, RefactorParams};
pub use file_ops::{ReadFileParams, SearchFilesParams, SearchContentParams, DiffFilesParams};
pub use code_gen::{GenerateFunctionParams, GenerateTestsParams};
pub use project::{ProjectInfoParams, DependenciesParams};