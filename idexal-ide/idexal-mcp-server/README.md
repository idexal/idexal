# Idexal MCP Server

A Model Context Protocol (MCP) server for Idexal IDE - providing code analysis, file operations, and AI-powered code generation tools.

## Features

### Code Analysis Tools
- **analyze_code**: Analyze code complexity, metrics, and suggestions
- **find_code_issues**: Find potential bugs, anti-patterns, and code smells
- **suggest_refactor**: Suggest refactoring improvements

### File Operation Tools
- **read_file**: Read file contents with optional line range
- **search_files**: Search for files by name pattern
- **search_content**: Search for text patterns in files
- **diff_files**: Compare two files and show differences

### Code Generation Tools
- **generate_function**: Generate a function based on description and signature
- **generate_tests**: Generate unit tests for a function or module

### Project Info Tools
- **get_project_info**: Get project structure and metadata
- **list_dependencies**: List project dependencies

### Prompts
- **code-review**: Review code for best practices and issues
- **explain-code**: Explain what code does in detail
- **refactor-suggestions**: Get refactoring suggestions for code

## Installation

```bash
cd idexal-mcp-server
cargo build --release
```

## Usage

### Stdio Transport (Default)

```bash
cargo run
```

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "idexal-mcp": {
      "command": "/path/to/idexal-mcp-server/target/release/idexal-mcp-server",
      "args": []
    }
  }
}
```

### With Idexal IDE

The MCP server can be integrated into Idexal IDE for enhanced code analysis and generation capabilities.

## Tools

### analyze_code

Analyze code for complexity, issues, and suggestions.

```json
{
  "code": "fn main() {\n    println!(\"Hello\");\n}",
  "language": "rust"
}
```

Returns metrics like lines, functions, complexity score, and suggestions.

### find_code_issues

Find potential bugs, anti-patterns, and code smells.

```json
{
  "code": "function example() {\n    // TODO: Fix this\n    console.log('debug');\n}",
  "language": "javascript"
}
```

Returns issues by severity (error, warning, info).

### read_file

Read file contents with optional line range.

```json
{
  "path": "src/main.rs",
  "start_line": 1,
  "end_line": 50
}
```

### search_files

Search for files by name pattern.

```json
{
  "pattern": ".*\\.rs$",
  "directory": "./src",
  "max_results": 100
}
```

### generate_function

Generate a function based on description and signature.

```json
{
  "name": "calculate_sum",
  "description": "Calculate the sum of two numbers",
  "language": "rust",
  "parameters": [
    {"name": "a", "type": "i32"},
    {"name": "b", "type": "i32"}
  ],
  "return_type": "i32"
}
```

### generate_tests

Generate unit tests for a function or module.

```json
{
  "code": "fn add(a: i32, b: i32) -> i32 {\n    a + b\n}",
  "language": "rust",
  "test_framework": "built-in"
}
```

## Supported Languages

- **Rust**: Full support including complexity analysis
- **TypeScript/JavaScript**: Full support with type checking suggestions
- **Python**: Full support with best practices detection
- **Go, Java, C++**: Basic support

## Development

### Run Tests

```bash
cargo test
```

### Run with Logging

```bash
RUST_LOG=debug cargo run
```

### Build Release

```bash
cargo build --release
```

## Architecture

```
idexal-mcp-server/
├── src/
│   ├── main.rs          # Entry point
│   ├── handler.rs       # MCP handler with tool router
│   ├── state.rs         # Shared state management
│   ├── tools/
│   │   ├── mod.rs       # Tools module
│   │   ├── code_analysis.rs  # Code analysis tools
│   │   ├── file_ops.rs       # File operation tools
│   │   ├── code_gen.rs       # Code generation tools
│   │   └── project.rs        # Project info tools
│   ├── prompts/         # Prompt implementations
│   └── resources/       # Resource implementations
└── tests/
    └── integration_test.rs
```

## License

MIT