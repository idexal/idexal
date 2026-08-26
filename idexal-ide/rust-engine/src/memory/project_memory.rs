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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_context() -> ProjectContext {
        ProjectContext {
            root_path: "/home/user/project".into(),
            name: "TestProject".into(),
            description: "A test project".into(),
            languages: vec!["rust".into(), "typescript".into()],
            frameworks: vec!["tokio".into(), "react".into()],
            symbols: vec![
                create_code_symbol("main".into(), SymbolType::Function, "src/main.rs".into(), 1, 0, "fn main()".into()),
                create_code_symbol("Config".into(), SymbolType::Struct, "src/config.rs".into(), 5, 0, "struct Config".into()),
            ],
            last_indexed: Utc::now(),
        }
    }

    #[test]
    fn new_has_no_context() {
        let mem = ProjectMemory::new();
        assert!(mem.get_context().is_none());
        assert_eq!(mem.get_summary(), "No project loaded");
    }

    #[test]
    fn set_and_get_context() {
        let mut mem = ProjectMemory::new();
        let ctx = test_context();
        mem.set_context(ctx);
        assert!(mem.get_context().is_some());
        assert_eq!(mem.get_context().unwrap().name, "TestProject");
    }

    #[test]
    fn add_symbol() {
        let mut mem = ProjectMemory::new();
        mem.set_context(test_context());
        mem.add_symbol(create_code_symbol("helper".into(), SymbolType::Function, "src/util.rs".into(), 10, 0, "fn helper()".into()));
        assert_eq!(mem.get_context().unwrap().symbols.len(), 3);
    }

    #[test]
    fn get_symbols_by_name() {
        let mut mem = ProjectMemory::new();
        mem.set_context(test_context());
        let found = mem.get_symbols_by_name("config");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "Config");
    }

    #[test]
    fn get_symbols_by_file() {
        let mut mem = ProjectMemory::new();
        mem.set_context(test_context());
        let found = mem.get_symbols_by_file("src/main.rs");
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "main");
    }

    #[test]
    fn get_summary_includes_project_info() {
        let mut mem = ProjectMemory::new();
        mem.set_context(test_context());
        let summary = mem.get_summary();
        assert!(summary.contains("TestProject"));
        assert!(summary.contains("rust"));
        assert!(summary.contains("tokio"));
    }
}
