use rmcp::model::Parameters;
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GenerateFunctionParams {
    pub name: String,
    pub description: String,
    pub language: String,
    pub parameters: Option<Vec<ParameterDef>>,
    pub return_type: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GenerateTestsParams {
    pub code: String,
    pub language: String,
    pub test_framework: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct ParameterDef {
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
}

pub async fn generate_function(params: Parameters<GenerateFunctionParams>) -> Result<String, String> {
    let p = params.inner();
    
    let params_str = p.parameters
        .as_ref()
        .map(|params| {
            params.iter()
                .map(|param| format!("{}: {}", param.name, param.r#type))
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    
    let return_str = p.return_type
        .as_deref()
        .map(|r| format!(" -> {}", r))
        .unwrap_or_default();
    
    let body = match p.language.as_str() {
        "rust" => generate_rust_function(&p.name, &params_str, &return_str, &p.description),
        "typescript" | "javascript" => generate_typescript_function(&p.name, &params_str, &return_str, &p.description),
        "python" => generate_python_function(&p.name, &p.parameters, &p.return_type, &p.description),
        _ => format!("// Function generation not supported for language: {}", p.language),
    };
    
    let result = serde_json::json!({
        "language": p.language,
        "name": p.name,
        "description": p.description,
        "code": body
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

pub async fn generate_tests(params: Parameters<GenerateTestsParams>) -> Result<String, String> {
    let p = params.inner();
    
    let tests = match p.language.as_str() {
        "rust" => generate_rust_tests(&p.code, &p.test_framework),
        "typescript" | "javascript" => generate_typescript_tests(&p.code, &p.test_framework),
        "python" => generate_python_tests(&p.code, &p.test_framework),
        _ => format!("// Test generation not supported for language: {}", p.language),
    };
    
    let result = serde_json::json!({
        "language": p.language,
        "framework": p.test_framework.unwrap_or_else(|| "default".to_string()),
        "tests": tests
    });
    
    Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
}

fn generate_rust_function(name: &str, params: &str, return_str: &str, description: &str) -> String {
    format!(r#"/// {}
pub fn {}({}){} {{
    // TODO: Implement function body
    todo!()
}}"#, description, name, params, return_str)
}

fn generate_typescript_function(name: &str, params: &str, return_str: &str, description: &str) -> String {
    format!(r#"/**
 * {}
 */
function {}({}){} {{
  // TODO: Implement function body
  throw new Error('Not implemented');
}}"#, description, name, params, return_str)
}

fn generate_python_function(name: &str, params: &Option<Vec<ParameterDef>>, return_type: &Option<String>, description: &str) -> String {
    let params_str = params
        .as_ref()
        .map(|p| {
            p.iter()
                .map(|param| {
                    let type_hint = format!(": {}", param.r#type);
                    format!("{}{}", param.name, type_hint)
                })
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    
    let return_str = return_type
        .as_ref()
        .map(|r| format!(" -> {}", r))
        .unwrap_or_default();
    
    format!(r#""""
{}
"""
def {}({}){}:
    # TODO: Implement function body
    raise NotImplementedError("Not implemented")
"#, description, name, params_str, return_str)
}

fn generate_rust_tests(code: &str, _framework: &Option<String>) -> String {
    // Extract function names from code
    let functions: Vec<&str> = code.lines()
        .filter_map(|line| {
            if line.contains("fn ") {
                let start = line.find("fn ")? + 3;
                let end = line[start..].find('(')?;
                Some(&line[start..start+end])
            } else {
                None
            }
        })
        .collect();
    
    if functions.is_empty() {
        return r#"#[cfg(test)]
mod tests {
    #[test]
    fn test_example() {
        assert!(true);
    }
}"#.to_string();
    }
    
    let tests: Vec<String> = functions.iter().map(|func| {
        format!(r#"    #[test]
    fn test_{}() {{
        // TODO: Implement test
        assert!(true);
    }}"#, func)
    }).collect();
    
    format!(r#"#[cfg(test)]
mod tests {{
{}
}}"#, tests.join("\n\n"))
}

fn generate_typescript_tests(code: &str, framework: &Option<String>) -> String {
    let fw = framework.as_deref().unwrap_or("vitest");
    
    let functions: Vec<&str> = code.lines()
        .filter_map(|line| {
            if line.contains("function ") || line.contains("const ") && line.contains("=>") {
                let start = line.find("function ").or_else(|| line.find("const "))? + if line.contains("function ") { 9 } else { 6 };
                let end = line[start..].find('(')?;
                Some(&line[start..start+end].trim())
            } else {
                None
            }
        })
        .collect();
    
    if functions.is_empty() {
        return format!(r#"import {{ describe, it, expect }} from '{}';

describe('example', () => {{
  it('should work', () => {{
    expect(true).toBe(true);
  }});
}});"#, fw);
    }
    
    let tests: Vec<String> = functions.iter().map(|func| {
        format!(r#"  it('should handle {}', () => {{
    // TODO: Implement test
    expect(true).toBe(true);
  }});"#, func)
    }).collect();
    
    format!(r#"import {{ describe, it, expect }} from '{}';

describe('module', () => {{
{}
}});"#, fw, tests.join("\n\n"))
}

fn generate_python_tests(code: &str, framework: &Option<String>) -> String {
    let fw = framework.as_deref().unwrap_or("pytest");
    
    let functions: Vec<&str> = code.lines()
        .filter_map(|line| {
            if line.contains("def ") && !line.contains("__") {
                let start = line.find("def ")? + 4;
                let end = line[start..].find('(')?;
                Some(&line[start..start+end])
            } else {
                None
            }
        })
        .collect();
    
    if functions.is_empty() {
        return format!(r#"import pytest

def test_example():
    """Test example."""
    assert True
"#);
    }
    
    let tests: Vec<String> = functions.iter().map(|func| {
        format!(r#"def test_{}():
    """Test {} function."""
    # TODO: Implement test
    assert True
"#, func, func)
    }).collect();
    
    tests.join("\n")
}