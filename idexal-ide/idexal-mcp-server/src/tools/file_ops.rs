use rmcp::model::Parameters;
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use std::path::Path;
use walkdir::WalkDir;
use regex::Regex;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReadFileParams {
    pub path: String,
    pub start_line: Option<usize>,
    pub end_line: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SearchFilesParams {
    pub pattern: String,
    pub directory: Option<String>,
    pub max_results: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SearchContentParams {
    pub query: String,
    pub directory: Option<String>,
    pub file_pattern: Option<String>,
    pub max_results: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DiffFilesParams {
    pub file1: String,
    pub file2: String,
}

pub async fn read_file(params: Parameters<ReadFileParams>) -> Result<String, String> {
    let p = params.inner();
    
    let content = std::fs::read_to_string(&p.path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let lines: Vec<&str> = content.lines().collect();
    let start = p.start_line.unwrap_or(1).saturating_sub(1);
    let end = p.end_line.unwrap_or(lines.len());
    
    let selected: Vec<String> = lines[start..end.min(lines.len())]
        .iter()
        .enumerate()
        .map(|(i, line)| format!("{}: {}", start + i + 1, line))
        .collect();
    
    let result = serde_json::json!({
        "path": p.path,
        "total_lines": lines.len(),
        "showing_lines": format!("{}-{}", start + 1, end.min(lines.len())),
        "content": selected.join("\n")
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

pub async fn search_files(params: Parameters<SearchFilesParams>) -> Result<String, String> {
    let p = params.inner();
    let dir = p.directory.unwrap_or_else(|| ".".to_string());
    let max_results = p.max_results.unwrap_or(50);
    
    let re = Regex::new(&p.pattern)
        .map_err(|e| format!("Invalid pattern: {}", e))?;
    
    let mut matches = Vec::new();
    
    for entry in WalkDir::new(&dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        if matches.len() >= max_results {
            break;
        }
        
        let path = entry.path().to_string_lossy().to_string();
        let name = entry.file_name().to_string_lossy().to_string();
        
        if re.is_match(&name) || re.is_match(&path) {
            let metadata = entry.metadata().ok();
            matches.push(serde_json::json!({
                "path": path,
                "name": name,
                "size": metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                "modified": metadata
                    .and_then(|m| m.modified().ok())
                    .map(|t| format!("{:?}", t))
                    .unwrap_or_default()
            }));
        }
    }
    
    let result = serde_json::json!({
        "directory": dir,
        "pattern": p.pattern,
        "total_matches": matches.len(),
        "files": matches
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

pub async fn search_content(params: Parameters<SearchContentParams>) -> Result<String, String> {
    let p = params.inner();
    let dir = p.directory.unwrap_or_else(|| ".".to_string());
    let max_results = p.max_results.unwrap_or(100);
    
    let re = Regex::new(&p.query)
        .map_err(|e| format!("Invalid query: {}", e))?;
    
    let file_pattern = p.file_pattern
        .map(|pat| Regex::new(&pat).ok())
        .flatten();
    
    let mut matches = Vec::new();
    
    for entry in WalkDir::new(&dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        if matches.len() >= max_results {
            break;
        }
        
        let path = entry.path();
        
        // Skip binary files and common non-text files
        let name = path.file_name().to_string_lossy().to_string();
        if name.ends_with(".png") || name.ends_with(".jpg") || name.ends_with(".exe") || name.ends_with(".dll") {
            continue;
        }
        
        // Check file pattern filter
        if let Some(ref fp) = file_pattern {
            if !fp.is_match(&name) {
                continue;
            }
        }
        
        if let Ok(content) = std::fs::read_to_string(path) {
            for (line_num, line) in content.lines().enumerate() {
                if re.is_match(line) {
                    matches.push(serde_json::json!({
                        "file": path.to_string_lossy(),
                        "line": line_num + 1,
                        "content": line.trim(),
                        "match": re.find(line).map(|m| m.as_str()).unwrap_or("")
                    }));
                    
                    if matches.len() >= max_results {
                        break;
                    }
                }
            }
        }
    }
    
    let result = serde_json::json!({
        "query": p.query,
        "directory": dir,
        "total_matches": matches.len(),
        "matches": matches
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

pub async fn diff_files(params: Parameters<DiffFilesParams>) -> Result<String, String> {
    let p = params.inner();
    
    let content1 = std::fs::read_to_string(&p.file1)
        .map_err(|e| format!("Failed to read {}: {}", p.file1, e))?;
    
    let content2 = std::fs::read_to_string(&p.file2)
        .map_err(|e| format!("Failed to read {}: {}", p.file2, e))?;
    
    let diff = similar::TextDiff::from_lines(&content1, &content2);
    
    let mut changes = Vec::new();
    
    for op in diff.ops() {
        match op {
            similar::DiffOp::Delete { .. } => {
                for del in op.iter_removed_lines() {
                    changes.push(serde_json::json!({
                        "type": "delete",
                        "line": del.old_index().map(|i| i + 1).unwrap_or(0),
                        "content": del.old_str().trim()
                    }));
                }
            }
            similar::DiffOp::Insert { .. } => {
                for ins in op.iter_added_lines() {
                    changes.push(serde_json::json!({
                        "type": "insert",
                        "line": ins.new_index().map(|i| i + 1).unwrap_or(0),
                        "content": ins.new_str().trim()
                    }));
                }
            }
            similar::DiffOp::Replace { .. } => {
                for del in op.iter_removed_lines() {
                    changes.push(serde_json::json!({
                        "type": "delete",
                        "line": del.old_index().map(|i| i + 1).unwrap_or(0),
                        "content": del.old_str().trim()
                    }));
                }
                for ins in op.iter_added_lines() {
                    changes.push(serde_json::json!({
                        "type": "insert",
                        "line": ins.new_index().map(|i| i + 1).unwrap_or(0),
                        "content": ins.new_str().trim()
                    }));
                }
            }
            _ => {}
        }
    }
    
    let result = serde_json::json!({
        "file1": p.file1,
        "file2": p.file2,
        "total_changes": changes.len(),
        "changes": changes
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}