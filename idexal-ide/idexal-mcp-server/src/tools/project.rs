use rmcp::model::Parameters;
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ProjectInfoParams {
    pub directory: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DependenciesParams {
    pub directory: Option<String>,
}

pub async fn get_project_info(params: Parameters<ProjectInfoParams>) -> Result<String, String> {
    let p = params.inner();
    let dir = p.directory.unwrap_or_else(|| ".".to_string());
    
    let mut info = serde_json::json!({
        "directory": dir,
        "files": {},
        "languages": {},
        "total_files": 0,
        "total_size": 0
    });
    
    let mut total_files = 0;
    let mut total_size = 0u64;
    let mut languages: std::collections::HashMap<String, (usize, u64)> = std::collections::HashMap::new();
    
    for entry in WalkDir::new(&dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        // Skip hidden files and common non-source directories
        let path = entry.path().to_string_lossy();
        if path.contains("/.") || path.contains("/node_modules/") || path.contains("/target/") {
            continue;
        }
        
        let name = entry.file_name().to_string_lossy().to_string();
        let ext = Path::new(&name)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());
        
        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        
        total_files += 1;
        total_size += size;
        
        let lang = get_language_from_ext(&ext);
        let entry = languages.entry(lang).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += size;
    }
    
    // Convert to serializable format
    let langs: std::collections::HashMap<String, serde_json::Value> = languages.iter()
        .map(|(lang, (count, size))| {
            (lang.clone(), serde_json::json!({
                "files": count,
                "size": size,
                "size_formatted": format_size(*size)
            }))
        })
        .collect();
    
    info["languages"] = serde_json::json!(langs);
    info["total_files"] = serde_json::json!(total_files);
    info["total_size"] = serde_json::json!(total_size);
    info["total_size_formatted"] = serde_json::json!(format_size(total_size));
    
    // Check for common project files
    let mut project_files = Vec::new();
    if Path::new("Cargo.toml").exists() { project_files.push("Cargo.toml (Rust)"); }
    if Path::new("package.json").exists() { project_files.push("package.json (Node.js)"); }
    if Path::new("pyproject.toml").exists() { project_files.push("pyproject.toml (Python)"); }
    if Path::new("go.mod").exists() { project_files.push("go.mod (Go)"); }
    if Path::new("pom.xml").exists() { project_files.push("pom.xml (Java)"); }
    
    info["project_files"] = serde_json::json!(project_files);
    
    Ok(serde_json::to_string_pretty(&info).unwrap_or_default())
}

pub async fn list_dependencies(params: Parameters<DependenciesParams>) -> Result<String, String> {
    let p = params.inner();
    let dir = p.directory.unwrap_or_else(|| ".".to_string());
    
    let mut dependencies = Vec::new();
    
    // Check for Cargo.toml (Rust)
    let cargo_path = Path::new(&dir).join("Cargo.toml");
    if cargo_path.exists() {
        let content = std::fs::read_to_string(&cargo_path)
            .map_err(|e| format!("Failed to read Cargo.toml: {}", e))?;
        
        // Simple parsing - look for [dependencies] section
        let mut in_deps = false;
        for line in content.lines() {
            if line.trim() == "[dependencies]" {
                in_deps = true;
                continue;
            }
            if line.starts_with('[') && in_deps {
                in_deps = false;
                continue;
            }
            if in_deps && !line.trim().is_empty() && !line.trim().starts_with('#') {
                if let Some(name) = line.split('=').next() {
                    let name = name.trim().to_string();
                    dependencies.push(serde_json::json!({
                        "name": name,
                        "type": "rust",
                        "source": "cargo"
                    }));
                }
            }
        }
    }
    
    // Check for package.json (Node.js)
    let package_path = Path::new(&dir).join("package.json");
    if package_path.exists() {
        let content = std::fs::read_to_string(&package_path)
            .map_err(|e| format!("Failed to read package.json: {}", e))?;
        
        if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(deps) = pkg["dependencies"].as_object() {
                for name in deps.keys() {
                    dependencies.push(serde_json::json!({
                        "name": name,
                        "type": "node",
                        "source": "npm"
                    }));
                }
            }
            if let Some(dev_deps) = pkg["devDependencies"].as_object() {
                for name in dev_deps.keys() {
                    dependencies.push(serde_json::json!({
                        "name": name,
                        "type": "node",
                        "source": "npm",
                        "dev": true
                    }));
                }
            }
        }
    }
    
    // Check for requirements.txt or pyproject.toml (Python)
    let requirements_path = Path::new(&dir).join("requirements.txt");
    if requirements_path.exists() {
        let content = std::fs::read_to_string(&requirements_path)
            .map_err(|e| format!("Failed to read requirements.txt: {}", e))?;
        
        for line in content.lines() {
            let line = line.trim();
            if !line.is_empty() && !line.starts_with('#') && !line.starts_with('-') {
                let name = line.split(|c: char| c == '=' || c == '>' || c == '<' || c == '!')
                    .next()
                    .unwrap_or(line)
                    .trim()
                    .to_string();
                dependencies.push(serde_json::json!({
                    "name": name,
                    "type": "python",
                    "source": "pip"
                }));
            }
        }
    }
    
    let result = serde_json::json!({
        "directory": dir,
        "total_dependencies": dependencies.len(),
        "dependencies": dependencies
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

fn get_language_from_ext(ext: &str) -> String {
    match ext {
        "rs" => "Rust".to_string(),
        "ts" | "tsx" => "TypeScript".to_string(),
        "js" | "jsx" => "JavaScript".to_string(),
        "py" => "Python".to_string(),
        "go" => "Go".to_string(),
        "java" => "Java".to_string(),
        "rb" => "Ruby".to_string(),
        "cpp" | "cc" | "cxx" => "C++".to_string(),
        "c" | "h" => "C".to_string(),
        "cs" => "C#".to_string(),
        "swift" => "Swift".to_string(),
        "kt" => "Kotlin".to_string(),
        "vue" => "Vue".to_string(),
        "svelte" => "Svelte".to_string(),
        "html" | "htm" => "HTML".to_string(),
        "css" | "scss" | "less" => "CSS".to_string(),
        "json" => "JSON".to_string(),
        "yaml" | "yml" => "YAML".to_string(),
        "toml" => "TOML".to_string(),
        "md" | "markdown" => "Markdown".to_string(),
        "sql" => "SQL".to_string(),
        "sh" | "bash" => "Shell".to_string(),
        _ => "Other".to_string(),
    }
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = 1024 * KB;
    const GB: u64 = 1024 * MB;
    
    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}