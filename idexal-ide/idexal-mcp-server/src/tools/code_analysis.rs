use rmcp::model::Parameters;
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct AnalyzeCodeParams {
    pub code: String,
    pub language: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct FindIssuesParams {
    pub code: String,
    pub language: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct RefactorParams {
    pub code: String,
    pub language: String,
    pub goals: Option<String>,
}

pub async fn analyze_code(params: Parameters<AnalyzeCodeParams>) -> Result<String, String> {
    let p = params.inner();
    let lines = p.code.lines().count();
    let chars = p.code.len();
    
    // Count functions, structs, etc.
    let function_count = p.code.matches("fn ").count() + p.code.matches("function ").count();
    let struct_count = p.code.matches("struct ").count() + p.code.matches("class ").count();
    let comment_lines = p.code.lines().filter(|l| l.trim().starts_with("//") || l.trim().starts_with("#")).count();
    
    // Estimate complexity
    let complexity = estimate_complexity(&p.code);
    
    let analysis = serde_json::json!({
        "language": p.language,
        "metrics": {
            "lines": lines,
            "characters": chars,
            "functions": function_count,
            "structs_classes": struct_count,
            "comment_lines": comment_lines,
            "comment_ratio": if lines > 0 { (comment_lines as f64 / lines as f64 * 100.0).round() } else { 0.0 }
        },
        "complexity": {
            "cyclomatic": complexity.cyclomatic,
            "nesting_depth": complexity.max_nesting,
            "score": complexity.score()
        },
        "suggestions": generate_suggestions(&p.code, &p.language, &complexity)
    });
    
    Ok(serde_json::to_string_pretty(&analysis).unwrap_or_default())
}

pub async fn find_issues(params: Parameters<FindIssuesParams>) -> Result<String, String> {
    let p = params.inner();
    let mut issues = Vec::new();
    
    // Check for common issues
    let lines: Vec<&str> = p.code.lines().enumerate().collect();
    
    for (line_num, line) in lines {
        let line = *line;
        
        // TODO/FIXME/HACK comments
        if line.contains("TODO") || line.contains("FIXME") || line.contains("HACK") {
            issues.push(serde_json::json!({
                "line": line_num + 1,
                "severity": "warning",
                "type": "todo",
                "message": "Contains TODO/FIXME/HACK comment",
                "line_content": line.trim()
            }));
        }
        
        // Empty catch blocks
        if line.contains("catch") && line.contains("{}") {
            issues.push(serde_json::json!({
                "line": line_num + 1,
                "severity": "warning",
                "type": "empty_catch",
                "message": "Empty catch block"
            }));
        }
        
        // Console.log in production
        if line.contains("console.log") || line.contains("println!") {
            issues.push(serde_json::json!({
                "line": line_num + 1,
                "severity": "info",
                "type": "debug_output",
                "message": "Debug output statement found"
            }));
        }
        
        // Hardcoded credentials
        if line.contains("password") && line.contains("=") && !line.contains("env") {
            issues.push(serde_json::json!({
                "line": line_num + 1,
                "severity": "error",
                "type": "security",
                "message": "Possible hardcoded credential"
            }));
        }
        
        // Long lines
        if line.len() > 120 {
            issues.push(serde_json::json!({
                "line": line_num + 1,
                "severity": "info",
                "type": "style",
                "message": format!("Line exceeds 120 characters ({} chars)", line.len())
            }));
        }
    }
    
    let result = serde_json::json!({
        "total_issues": issues.len(),
        "by_severity": {
            "error": issues.iter().filter(|i| i["severity"] == "error").count(),
            "warning": issues.iter().filter(|i| i["severity"] == "warning").count(),
            "info": issues.iter().filter(|i| i["severity"] == "info").count(),
        },
        "issues": issues
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

pub async fn suggest_refactor(params: Parameters<RefactorParams>) -> Result<String, String> {
    let p = params.inner();
    let mut suggestions = Vec::new();
    
    let lines: Vec<&str> = p.code.lines().collect();
    
    // Check for long functions
    let mut function_start = None;
    let mut brace_count = 0;
    
    for (i, line) in lines.iter().enumerate() {
        if line.contains("fn ") || line.contains("function ") {
            function_start = Some(i);
            brace_count = 0;
        }
        
        brace_count += line.matches('{').count() as i32 - line.matches('}').count() as i32;
        
        if function_start.is_some() && brace_count == 0 && i > 0 {
            let func_len = i - function_start.unwrap();
            if func_len > 30 {
                suggestions.push(serde_json::json!({
                    "type": "extract_function",
                    "severity": "suggestion",
                    "line_range": [function_start.unwrap() + 1, i + 1],
                    "message": format!("Function is {} lines long. Consider breaking it into smaller functions.", func_len)
                }));
            }
            function_start = None;
        }
    }
    
    // Check for duplicated code patterns
    let mut line_hashes: std::collections::HashMap<String, Vec<usize>> = std::collections::HashMap::new();
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.len() > 20 {
            line_hashes.entry(trimmed.to_string()).or_default().push(i + 1);
        }
    }
    
    for (line, line_numbers) in &line_hashes {
        if line_numbers.len() > 2 {
            suggestions.push(serde_json::json!({
                "type": "duplicated_code",
                "severity": "suggestion",
                "line_numbers": line_numbers,
                "message": format!("Line '{}' appears {} times. Consider extracting to a function.", line.trim(), line_numbers.len())
            }));
        }
    }
    
    // Check for deeply nested code
    let mut max_depth = 0;
    let mut current_depth = 0;
    
    for line in &lines {
        current_depth += line.matches('{').count() as usize;
        current_depth = current_depth.saturating_sub(line.matches('}').count());
        max_depth = max_depth.max(current_depth);
    }
    
    if max_depth > 4 {
        suggestions.push(serde_json::json!({
            "type": "deep_nesting",
            "severity": "suggestion",
            "max_depth": max_depth,
            "message": "Code has deep nesting (4+ levels). Consider using early returns or extracting functions."
        }));
    }
    
    let result = serde_json::json!({
        "total_suggestions": suggestions.len(),
        "goals": p.goals.unwrap_or_else(|| "general improvement".to_string()),
        "suggestions": suggestions
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

struct ComplexityAnalysis {
    cyclomatic: u32,
    max_nesting: usize,
}

impl ComplexityAnalysis {
    fn score(&self) -> String {
        let score = self.cyclomatic + (self.max_nesting as u32 / 2);
        match score {
            0..=5 => "low".to_string(),
            6..=15 => "medium".to_string(),
            16..=30 => "high".to_string(),
            _ => "very high".to_string(),
        }
    }
}

fn estimate_complexity(code: &str) -> ComplexityAnalysis {
    let mut cyclomatic = 1; // Base complexity
    
    for line in code.lines() {
        // Count decision points
        if line.contains("if ") || line.contains("else if ") {
            cyclomatic += 1;
        }
        if line.contains("match ") || line.contains("switch ") {
            cyclomatic += 1;
        }
        if line.contains("for ") || line.contains("while ") {
            cyclomatic += 1;
        }
        if line.contains("&&") || line.contains("||") {
            cyclomatic += 1;
        }
    }
    
    // Calculate max nesting
    let mut max_nesting = 0;
    let mut current_nesting = 0;
    
    for line in code.lines() {
        current_nesting += line.matches('{').count();
        max_nesting = max_nesting.max(current_nesting);
        current_nesting = current_nesting.saturating_sub(line.matches('}').count());
    }
    
    ComplexityAnalysis {
        cyclomatic,
        max_nesting,
    }
}

fn generate_suggestions(code: &str, language: &str, complexity: &ComplexityAnalysis) -> Vec<serde_json::Value> {
    let mut suggestions = Vec::new();
    
    if complexity.cyclomatic > 10 {
        suggestions.push(serde_json::json!({
            "type": "complexity",
            "message": "High cyclomatic complexity. Consider breaking down into smaller functions."
        }));
    }
    
    if complexity.max_nesting > 4 {
        suggestions.push(serde_json::json!({
            "type": "nesting",
            "message": "Deep nesting detected. Consider using early returns or guard clauses."
        }));
    }
    
    let line_count = code.lines().count();
    if line_count > 100 {
        suggestions.push(serde_json::json!({
            "type": "size",
            "message": format!("File is {} lines. Consider splitting into modules.", line_count)
        }));
    }
    
    // Language-specific suggestions
    match language {
        "rust" => {
            if code.contains("unwrap()") {
                suggestions.push(serde_json::json!({
                    "type": "error_handling",
                    "message": "Found unwrap() calls. Consider using proper error handling with ? operator."
                }));
            }
            if code.contains("clone()") && !code.contains("// Intentional clone") {
                suggestions.push(serde_json::json!({
                    "type": "performance",
                    "message": "Found clone() calls. Consider borrowing instead if ownership isn't needed."
                }));
            }
        }
        "typescript" | "javascript" => {
            if code.contains("any") && language == "typescript" {
                suggestions.push(serde_json::json!({
                    "type": "type_safety",
                    "message": "Found 'any' type. Consider using more specific types."
                }));
            }
            if code.contains("var ") {
                suggestions.push(serde_json::json!({
                    "type": "modernization",
                    "message": "Found 'var' declarations. Consider using 'const' or 'let'."
                }));
            }
        }
        "python" => {
            if code.contains("except:") || code.contains("except Exception:") {
                suggestions.push(serde_json::json!({
                    "type": "error_handling",
                    "message": "Bare except clause. Consider catching specific exceptions."
                }));
            }
        }
        _ => {}
    }
    
    suggestions
}