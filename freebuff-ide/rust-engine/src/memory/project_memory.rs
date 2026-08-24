//! Project memory module - understands codebase structure

use super::*;

pub struct ProjectMemory {
    context: Option<ProjectContext>,
}

impl ProjectMemory {
    pub fn new() -> Self {
        Self { context: None }
    }
    
    /// Set project context
    pub fn set_context(&mut self, context: ProjectContext) {
        self.context = Some(context);
    }
    
    /// Get current project context
    pub fn get_context(&self) -> Option<&ProjectContext> {
        self.context.as_ref()
    }
    
    /// Add a symbol to the project
    pub fn add_symbol(&mut self, symbol: CodeSymbol) {
        if let Some(ref mut ctx) = self.context {
            ctx.symbols.push(symbol);
        }
    }
    
    /// Get symbols by name
    pub fn get_symbols_by_name(&self, name: &str) -> Vec<&CodeSymbol> {
        self.context.as_ref()
            .map(|ctx| {
                ctx.symbols.iter()
                    .filter(|s| s.name.to_lowercase().contains(&name.to_lowercase()))
                    .collect()
            })
            .unwrap_or_default()
    }
    
    /// Get symbols by file
    pub fn get_symbols_by_file(&self, file_path: &str) -> Vec<&CodeSymbol> {
        self.context.as_ref()
            .map(|ctx| {
                ctx.symbols.iter()
                    .filter(|s| s.file_path == file_path)
                    .collect()
            })
            .unwrap_or_default()
    }
    
    /// Get project summary
    pub fn get_summary(&self) -> String {
        match &self.context {
            Some(ctx) => {
                format!(
                    "Project: {}\nDescription: {}\nLanguages: {}\nFrameworks: {}\nSymbols: {}",
                    ctx.name,
                    ctx.description,
                    ctx.languages.join(", "),
                    ctx.frameworks.join(", "),
                    ctx.symbols.len()
                )
            }
            None => "No project loaded".to_string(),
        }
    }
}

impl Default for ProjectMemory {
    fn default() -> Self {
        Self::new()
    }
}
