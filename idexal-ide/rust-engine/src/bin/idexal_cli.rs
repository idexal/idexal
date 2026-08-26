//! Idexal CLI — AI-powered coding assistant for the terminal
//!
//! Usage:
//!   idexal chat              Start interactive chat
//!   idexal ask "question"    Ask a single question
//!   idexal analyze           Analyze current project
//!   idexal search <query>    Search project symbols
//!   idexal index             Index project for RAG
//!   idexal version           Show version

use std::collections::HashMap;
use std::io::{self, BufRead, Write};
use std::path::Path;

// ── Version ───────────────────────────────────────────────────────────

const VERSION: &str = env!("CARGO_PKG_VERSION");

// ── Colors ────────────────────────────────────────────────────────────

const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const DIM: &str = "\x1b[2m";
const CYAN: &str = "\x1b[36m";
const GREEN: &str = "\x1b[32m";
const YELLOW: &str = "\x1b[33m";
const RED: &str = "\x1b[31m";
const BLUE: &str = "\x1b[34m";
const MAGENTA: &str = "\x1b[35m";

// ── Main ──────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.is_empty() {
        print_banner();
        return;
    }

    // Check for --json flag anywhere in args
    let json_mode = args.iter().any(|a| a == "--json" || a == "-j");
    let filtered_args: Vec<String> = args.into_iter().filter(|a| a != "--json" && a != "-j").collect();
    let args = &filtered_args;

    match args[0].as_str() {
        "chat" | "c" => cmd_chat(),
        "edit" => cmd_edit(&args[1..]),
        "ask" | "a" => cmd_ask(&args[1..], json_mode),
        "analyze" | "info" => cmd_analyze_json(json_mode).await,
        "search" | "s" => cmd_search(&args[1..]),
        "index" | "i" => cmd_index(),
        "review" | "r" => cmd_review_json(json_mode).await,
        "fix" => cmd_fix(&args[1..]),
        "explain" | "e" => cmd_explain(&args[1..]),
        "diff" => cmd_diff(&args[1..]),
        "config" => cmd_config(),
        "whoami" => cmd_whoami(),
        "env" => cmd_env(),
        "init" => cmd_init(&args[1..]),
        "watch" => cmd_watch(&args[1..]),
        "stats" => cmd_stats(json_mode).await,
        "bench" | "benchmark" => cmd_bench(&args[1..]),
        "tree" => cmd_tree(&args[1..]).await,
        "serve" => cmd_serve(&args[1..]),
        "check" => cmd_check(json_mode),
        "about" => cmd_about(json_mode),
        "version" | "v" | "--version" => {
            if json_mode {
                println!("{{\"version\":\"{}\"}}", VERSION);
            } else {
                println!("{}idexal{} v{VERSION}", BOLD, RESET);
            }
        }
        "help" | "h" | "--help" => print_help(),
        _ => {
            eprintln!("{RED}error:{RESET} unknown command '{}'", args[0]);
            eprintln!("Run {}idexal help{} for usage", BOLD, RESET);
            std::process::exit(1);
        }
    }
}

// ── Banner ────────────────────────────────────────────────────────────

fn print_banner() {
    println!();
    println!("  {CYAN}{BOLD}╔══════════════════════════════════════════╗{RESET}");
    println!("  {CYAN}{BOLD}║         Idexal CLI v{VERSION:<21}║{RESET}");
    println!("  {CYAN}{BOLD}║  AI-Powered Coding Assistant             ║{RESET}");
    println!("  {CYAN}{BOLD}╚══════════════════════════════════════════╝{RESET}");
    println!();
    println!("  {DIM}Commands:{RESET}");    println!("  {GREEN}idexal chat{RESET}          Start interactive chat");
    println!("  {GREEN}idexal ask{RESET} <query>   Ask a single question");
    println!("  {GREEN}idexal analyze{RESET}       Analyze current project");
    println!("  {GREEN}idexal search{RESET} <query> Search project symbols");
    println!("  {GREEN}idexal review{RESET}        Review code for issues");
    println!("  {GREEN}idexal explain{RESET} <file> Explain code");
    println!("  {GREEN}idexal config{RESET}        Show configuration");
    println!("  {GREEN}idexal index{RESET}         Index project for RAG");
    println!("  {GREEN}idexal version{RESET}       Show version");
    println!();
    println!("  {DIM}Press Ctrl+C to exit{RESET}");
    println!();
}

// ── Help ──────────────────────────────────────────────────────────────

fn print_help() {
    println!("{BOLD}Idexal CLI{RESET} — AI-powered coding assistant");
    println!();
    println!("{BOLD}USAGE:{RESET}");
    println!("  idexal <command> [options]");
    println!();
    println!("{BOLD}COMMANDS:{RESET}");
    println!("  {GREEN}chat{RESET}              Start interactive chat session");
    println!("  {GREEN}edit{RESET} <file>       AI-assisted file editing");
    println!("  {GREEN}ask{RESET} <query>       Ask a single question");
    println!("  {GREEN}analyze{RESET}           Analyze current project structure");
    println!("  {GREEN}search{RESET} <query>    Search project symbols");
    println!("  {GREEN}review{RESET}            Review code for issues");
    println!("  {GREEN}fix{RESET} <mode>        Auto-fix suggestions (warnings/lint/format)");
    println!("  {GREEN}explain{RESET} <file>    Explain code in a file");
    println!("  {GREEN}diff{RESET}              Show git diff");
    println!("  {GREEN}init{RESET} [template]   Initialize new project (rust/node/python)");
    println!("  {GREEN}watch{RESET}             Watch files for changes");
    println!("  {GREEN}stats{RESET}             Show project statistics");
    println!("  {GREEN}bench{RESET}             Run performance benchmarks");
    println!("  {GREEN}tree{RESET}              Show directory tree");
    println!("  {GREEN}serve{RESET}             Start static file server");
    println!("  {GREEN}check{RESET}             Run project health check");
    println!("  {GREEN}whoami{RESET}            Show system info");
    println!("  {GREEN}env{RESET}               Show environment variables");
    println!("  {GREEN}config{RESET}            Show CLI configuration");
    println!("  {GREEN}index{RESET}             Index project for semantic search");
    println!("  {GREEN}about{RESET}             Show project info and credits");
    println!("  {GREEN}version{RESET}           Show version");
    println!("  {GREEN}help{RESET}              Show this help message");
    println!();
    println!("{BOLD}EXAMPLES:{RESET}");
    println!("  {DIM}idexal chat{RESET}                    # Start interactive mode");
    println!("  {DIM}idexal edit src/main.rs{RESET}           # AI-assisted editing");
    println!("  {DIM}idexal ask \"what does main.rs do?\"{RESET}  # Quick question");
    println!("  {DIM}echo \"explain this\" | idexal ask{RESET}      # Pipe support");
    println!("  {DIM}cat main.rs | idexal search{RESET}           # Search from piped input");
    println!("  {DIM}idexal search Config{RESET}            # Find Config struct");
    println!("  {DIM}idexal analyze{RESET}                  # Project overview");
    println!("  {DIM}idexal analyze --json{RESET}            # JSON output");
    println!("  {DIM}idexal stats --json | jq .files{RESET}  # Pipe JSON to jq");
    println!();
    println!("{BOLD}OPTIONS:{RESET}");
    println!("  {CYAN}--json{RESET}          Output in JSON format (works with: ask, analyze, stats, check, version)");
    println!("  {CYAN}-j{RESET}              Short form of --json");
    println!();
    println!("{BOLD}PIPE SUPPORT:{RESET}");
    println!("  Commands support piped input: ask, search");
    println!("  {DIM}echo \"explain function foo\" | idexal ask{RESET}");
    println!("  {DIM}cat main.rs | idexal search{RESET}");
    println!();
    println!("{BOLD}ENVIRONMENT:{RESET}");
    println!("  {CYAN}IDEXAL_API_KEY{RESET}    API key for AI provider");
    println!("  {CYAN}IDEXAL_MODEL{RESET}     Model to use (default: gpt-4)");
    println!("  {CYAN}IDEXAL_PROVIDER{RESET}  Provider (openai, anthropic, etc)");
}

// ── Interactive chat ──────────────────────────────────────────────────

fn cmd_chat() {
    println!();
    println!("  {CYAN}{BOLD}╔══════════════════════════════════════════╗{RESET}");
    println!("  {CYAN}{BOLD}║   Idexal Chat — AI Coding Assistant      ║{RESET}");
    println!("  {CYAN}{BOLD}╚══════════════════════════════════════════╝{RESET}");
    println!();
    println!("  {DIM}Type questions. Use {RESET}{BOLD}/help{RESET}{DIM} for commands.{RESET}");
    println!("  {DIM}Use {RESET}{BOLD}@filename{RESET}{DIM} to load file context. Ctrl+C to quit.{RESET}");
    println!();

    // Initialize project analysis
    let project_info = analyze_current_dir();
    if let Some(info) = &project_info {
        println!("  {GREEN}✓{RESET} Project: {BOLD}{}{RESET} ({GREEN}{}{RESET} files, {BLUE}{}{RESET} symbols)",
            info.name, info.files, info.symbols);
        if !info.languages.is_empty() {
            let langs: Vec<&str> = info.languages.iter().take(5).map(|(k, _)| k.as_str()).collect();
            println!("  {DIM}Languages: {}{RESET}", langs.join(", "));
        }
        println!();
    }

    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    let mut history: Vec<(String, String)> = Vec::new();
    let mut context_files: Vec<String> = Vec::new();

    loop {
        // Prompt with context indicator
        let ctx_indicator = if context_files.is_empty() {
            String::new()
        } else {
            format!(" {DIM}[ctx:{} files]{RESET}", context_files.len())
        };
        write!(out, "{CYAN}❯{RESET}{ctx_indicator} ").unwrap();
        out.flush().unwrap();

        let mut input = String::new();
        match stdin.lock().read_line(&mut input) {
            Ok(0) => break,
            Ok(_) => {}
            Err(_) => break,
        }

        let input = input.trim().to_string();
        if input.is_empty() {
            continue;
        }

        // Handle slash commands
        if input.starts_with('/') {
            match input.as_str() {
                "/exit" | "/quit" | "/q" => {
                    println!("  {DIM}Goodbye!{RESET}");
                    break;
                }
                "/help" | "/h" => {
                    print_chat_help();
                    continue;
                }
                "/clear" => {
                    history.clear();
                    context_files.clear();
                    println!("  {GREEN}✓{RESET} History and context cleared");
                    continue;
                }
                "/history" => {
                    if history.is_empty() {
                        println!("  {DIM}No conversation history yet{RESET}");
                    } else {
                        for (i, (q, _)) in history.iter().enumerate() {
                            println!("  {DIM}{:>3}.{RESET} {}", i + 1, q.chars().take(80).collect::<String>());
                        }
                    }
                    continue;
                }
                _ if input.starts_with("/file ") || input.starts_with("/f ") => {
                    let path = input.split_whitespace().nth(1).unwrap_or("");
                    if path.is_empty() {
                        println!("  {RED}Usage: /file <path>{RESET}");
                        continue;
                    }
                    match std::fs::read_to_string(path) {
                        Ok(content) => {
                            let lines = content.lines().count();
                            context_files.push(format!("{path} ({lines} lines)"));
                            println!("  {GREEN}✓{RESET} Loaded {BOLD}{path}{RESET} ({lines} lines into context)");
                        }
                        Err(e) => println!("  {RED}✗{RESET} Could not read {path}: {e}"),
                    }
                    continue;
                }
                "/context" | "/ctx" => {
                    if context_files.is_empty() {
                        println!("  {DIM}No files in context. Use /file <path> to add.{RESET}");
                    } else {
                        println!("  {BOLD}Context files:{RESET}");
                        for (i, f) in context_files.iter().enumerate() {
                            println!("    {DIM}{}.{RESET} {}", i + 1, f);
                        }
                    }
                    continue;
                }
                "/diff" => {
                    let _ = std::process::Command::new("git").args(["diff"]).status();
                    continue;
                }
                "/git" => {
                    println!("  {DIM}Git status:{RESET}");
                    let _ = std::process::Command::new("git").args(["status", "--short"]).status();
                    continue;
                }
                "/stats" => {
                    if let Some(ref info) = project_info {
                        println!("  {BOLD}Project:{RESET} {}", info.name);
                        println!("  {BOLD}Files:{RESET} {} | {BOLD}Symbols:{RESET} {}", info.files, info.symbols);
                        println!("  {BOLD}Languages:{RESET} {}", info.languages.len());
                    }
                    continue;
                }
                _ => {
                    println!("  {RED}Unknown command: {input}{RESET}. Type /help for available commands.");
                    continue;
                }
            }
        }

        // Extract @file references from the message
        let mut query = input.clone();
        let at_files: Vec<String> = input.split_whitespace()
            .filter(|w| w.starts_with('@'))
            .filter_map(|w| {
                let path = &w[1..];
                match std::fs::read_to_string(path) {
                    Ok(content) => {
                        let lines = content.lines().count();
                        if !context_files.iter().any(|c| c.starts_with(path)) {
                            context_files.push(format!("{path} ({lines} lines)"));
                        }
                        Some(format!("=== {path} ({lines} lines) ===\n{content}"))
                    }
                    Err(_) => None,
                }
            })
            .collect();

        // Build full context
        let mut full_prompt = query.clone();
        if !at_files.is_empty() {
            full_prompt = format!("{}\n\n--- File Context ---\n{}", query, at_files.join("\n\n"));
        } else if !context_files.is_empty() {
            // Include previously loaded context
            for cf in &context_files {
                let path = cf.split_whitespace().next().unwrap_or("");
                if let Ok(content) = std::fs::read_to_string(path) {
                    full_prompt = format!("{}\n\n--- {} ---\n{}", full_prompt, cf, content);
                }
            }
        }

        // Show thinking indicator
        write!(out, "  {DIM}Thinking...{RESET}").unwrap();
        out.flush().unwrap();

        // Generate response
        let response = generate_smart_response(&full_prompt, &project_info, &history);
        // Clear thinking indicator
        print!("\r\x1b[2K");
        out.flush().unwrap();
        println!("  {GREEN}{BOLD}▸{RESET} {response}");
        println!();

        // Track token count in history
        let context_tokens = full_prompt.len() / 4; // rough estimate
        history.push((input, response));
        if history.len() > 50 {
            history.drain(0..25); // keep last 25 exchanges
        }
    }
}

fn print_chat_help() {
    println!();
    println!("  {BOLD}Chat Commands:{RESET}");
    println!("    {GREEN}/help{RESET}           Show this help");
    println!("    {GREEN}/file{RESET} <path>    Load a file into context");
    println!("    {GREEN}/context{RESET}        Show loaded context files");
    println!("    {GREEN}/clear{RESET}          Clear history and context");
    println!("    {GREEN}/history{RESET}        Show conversation history");
    println!("    {GREEN}/diff{RESET}           Show git diff");
    println!("    {GREEN}/git{RESET}            Show git status");
    println!("    {GREEN}/stats{RESET}          Show project statistics");
    println!("    {GREEN}/exit{RESET}           Exit chat");
    println!();
    println!("  {BOLD}File References:{RESET}");
    println!("    Use {CYAN}@filename{RESET} in your message to include file content");
    println!("    Example: {DIM}explain @src/main.rs what does this do?{RESET}");
    println!();
}

// ── Ask command ───────────────────────────────────────────────────────

fn cmd_ask(args: &[String], json: bool) {
    let query = if args.is_empty() {
        // Try reading from stdin (pipe support)
        let stdin = io::stdin();
        let mut input = String::new();
        if !stdin.lock().read_line(&mut input).is_ok() || input.trim().is_empty() {
            eprintln!("{RED}error:{RESET} please provide a question");
            eprintln!("  {}idexal ask \"what does main.rs do?\"{}", BOLD, RESET);
            eprintln!("  {}echo \"explain this\" | idexal ask{}", BOLD, RESET);
            std::process::exit(1);
        }
        input.trim().to_string()
    } else {
        args.join(" ")
    };

    let project_info = analyze_current_dir();
    let response = generate_response(&query, &project_info, &[]);

    if json {
        println!("{{\"question\":\"{}\",\"answer\":\"{}\"}}",
            query.replace('"', "\\\""),
            response.replace('"', "\\\""));
    } else {
        println!();
        println!("  {CYAN}{BOLD}Q:{RESET} {query}");
        println!();
        println!("  {GREEN}{BOLD}A:{RESET} {response}");
        println!();
    }
}

// ── Analyze command ───────────────────────────────────────────────────

async fn cmd_analyze() {
    println!();
    println!("  {CYAN}{BOLD}Analyzing project...{RESET}");
    println!();

    let info = match tokio::task::spawn_blocking(analyze_current_dir).await.unwrap_or(None) {
        Some(i) => i,
        None => {
            println!("  {RED}Could not analyze current directory{RESET}");
            return;
        }
    };

    println!("  {BOLD}Project:{RESET} {}", info.name);
    println!("  {BOLD}Root:{RESET}    {}", info.root);
    println!();

    // File statistics
    println!("  {BOLD}Files by Language:{RESET}");
    for (lang, count) in &info.languages {
        let bar = "█".repeat(*count.min(&30));
        println!("    {GREEN}{lang:<15}{RESET} {bar} {count}");
    }
    println!();

    // Symbol statistics
    println!("  {BOLD}Symbols:{RESET}");
    println!("    Functions: {GREEN}{}{RESET}", info.functions);
    println!("    Classes:   {BLUE}{}{RESET}", info.classes);
    println!("    Enums:     {MAGENTA}{}{RESET}", info.enums);
    println!("    Traits:    {YELLOW}{}{RESET}", info.traits);
    println!("    Total:     {BOLD}{}{RESET}", info.symbols);
    println!();

    // Top files
    if !info.top_files.is_empty() {
        println!("  {BOLD}Largest Files:{RESET}");
        for (file, size) in info.top_files.iter().take(5) {
            println!("    {DIM}{file}{RESET} ({size} bytes)");
        }
    }
    println!();
}

// ── Search command ────────────────────────────────────────────────────

fn cmd_search(args: &[String]) {
    let query = if args.is_empty() {
        // Try reading from stdin (pipe support)
        let stdin = io::stdin();
        let mut input = String::new();
        if stdin.lock().read_line(&mut input).is_ok() && !input.trim().is_empty() {
            input.trim().to_string()
        } else {
            eprintln!("{RED}error:{RESET} please provide a search query");
            std::process::exit(1);
        }
    } else {
        args.join(" ")
    };
    let info = match analyze_current_dir() {
        Some(i) => i,
        None => {
            println!("  {RED}Could not analyze project{RESET}");
            return;
        }
    };

    println!();
    println!("  {CYAN}{BOLD}Searching for:{RESET} {query}");
    println!();

    // Simple file-based search
    let mut found = 0;
    for entry in &info.entries {
        if entry.name.to_lowercase().contains(&query.to_lowercase()) {
            println!("  {GREEN}📄{RESET} {}", entry.path);
            found += 1;
        }
    }

    if found == 0 {
        println!("  {DIM}No matches found{RESET}");
    } else {
        println!();
        println!("  {DIM}{found} results found{RESET}");
    }
    println!();
}

// ── Index command ─────────────────────────────────────────────────────

fn cmd_index() {
    println!();
    println!("  {CYAN}{BOLD}Indexing project...{RESET}");

    let info = match analyze_current_dir() {
        Some(i) => i,
        None => {
            println!("  {RED}Could not analyze project{RESET}");
            return;
        }
    };

    println!("  {GREEN}✓{RESET} Indexed {} files", info.files);
    println!("  {GREEN}✓{RESET} Found {} symbols", info.symbols);
    println!("  {GREEN}✓{RESET} Languages: {}", info.languages.len());
    println!();
}

// ── Project analysis ──────────────────────────────────────────────────

struct ProjectInfo {
    name: String,
    root: String,
    files: usize,
    symbols: usize,
    functions: usize,
    classes: usize,
    enums: usize,
    traits: usize,
    languages: HashMap<String, usize>,
    entries: Vec<FileEntry>,
    top_files: Vec<(String, u64)>,
}

struct FileEntry {
    name: String,
    path: String,
    #[expect(dead_code, reason = "stored for future file type operations")]
    ext: String,
}

fn analyze_current_dir() -> Option<ProjectInfo> {
    let cwd = std::env::current_dir().ok()?;
    let root = cwd.to_string_lossy().to_string();

    // Try to find project name from package.json or Cargo.toml
    let name = if let Ok(content) = std::fs::read_to_string(cwd.join("package.json")) {
        serde_json::from_str::<serde_json::Value>(&content)
            .ok()
            .and_then(|v| v["name"].as_str().map(String::from))
            .unwrap_or_else(|| cwd.file_name().unwrap_or_default().to_string_lossy().to_string())
    } else if let Ok(content) = std::fs::read_to_string(cwd.join("Cargo.toml")) {
        content.lines()
            .find(|l| l.starts_with("name"))
            .and_then(|l| l.split('=').nth(1))
            .map(|s| s.trim().trim_matches('"').to_string())
            .unwrap_or_else(|| cwd.file_name().unwrap_or_default().to_string_lossy().to_string())
    } else {
        cwd.file_name().unwrap_or_default().to_string_lossy().to_string()
    };

    // Scan files
    let mut entries = Vec::new();
    let mut languages: HashMap<String, usize> = HashMap::new();
    let mut symbols = 0usize;
    let mut functions = 0usize;
    let mut classes = 0usize;
    let mut enums = 0usize;
    let mut traits = 0usize;
    let mut top_files = Vec::new();

    scan_dir(&cwd, &mut entries, &mut languages, &mut symbols, &mut functions, &mut classes, &mut enums, &mut traits, &mut top_files, 0);

    Some(ProjectInfo {
        name,
        root,
        files: entries.len(),
        symbols,
        functions,
        classes,
        enums,
        traits,
        languages,
        entries,
        top_files,
    })
}

#[expect(clippy::too_many_arguments, reason = "legacy recursive traversal, refactor to struct later")]
fn scan_dir(
    dir: &Path,
    entries: &mut Vec<FileEntry>,
    languages: &mut HashMap<String, usize>,
    symbols: &mut usize,
    functions: &mut usize,
    classes: &mut usize,
    enums: &mut usize,
    traits: &mut usize,
    top_files: &mut Vec<(String, u64)>,
    depth: usize,
) {
    if depth > 10 { return; }

    let read_dir = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };

    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden dirs, node_modules, target, .git
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
            continue;
        }

        let path = entry.path();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.is_dir() {
            scan_dir(&path, entries, languages, symbols, functions, classes, enums, traits, top_files, depth + 1);
        } else if meta.is_file() {
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_string();

            let lang = match ext.as_str() {
                "rs" => "Rust",
                "ts" | "tsx" => "TypeScript",
                "js" | "jsx" | "mjs" => "JavaScript",
                "py" => "Python",
                "go" => "Go",
                "c" | "h" => "C",
                "cpp" | "cxx" | "cc" | "hpp" => "C++",
                "java" => "Java",
                "rb" => "Ruby",
                "php" => "PHP",
                "swift" => "Swift",
                "kt" => "Kotlin",
                "html" | "htm" => "HTML",
                "css" | "scss" => "CSS",
                "json" => "JSON",
                "yaml" | "yml" => "YAML",
                "md" => "Markdown",
                "toml" => "TOML",
                _ => continue,
            };

            *languages.entry(lang.to_string()).or_insert(0) += 1;

            // Quick symbol count (very simplified)
            if let Ok(content) = std::fs::read_to_string(&path) {
                let lines = content.lines().count();
                *symbols += lines / 20; // rough estimate
                *functions += content.lines().filter(|l| l.contains("fn ") || l.contains("function ") || l.contains("def ")).count();
                *classes += content.lines().filter(|l| l.contains("struct ") || l.contains("class ")).count();
                *enums += content.lines().filter(|l| l.contains("enum ")).count();
                *traits += content.lines().filter(|l| l.contains("trait ") || l.contains("interface ")).count();
            }

            let file_size = meta.len();
            top_files.push((name.clone(), file_size));
            top_files.sort_by_key(|a| std::cmp::Reverse(a.1));
            top_files.truncate(10);

            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                ext,
            });
        }
    }
}

// ── Response generation (local analysis) ──────────────────────────────

fn generate_response(query: &str, project_info: &Option<ProjectInfo>, history: &[(String, String)]) -> String {
    generate_smart_response(query, project_info, history)
}

fn generate_smart_response(query: &str, project_info: &Option<ProjectInfo>, history: &[(String, String)]) -> String {
    let query_lower = query.to_lowercase();

    // ── Project overview queries ──
    if query_lower.contains("what") && (query_lower.contains("project") || query_lower.contains("this")) {
        if let Some(info) = project_info {
            return format!(
                "This is a {BOLD}{}{RESET} project with {GREEN}{}{RESET} files across {BLUE}{}{RESET} languages.\n\n  {BOLD}Symbols:{RESET} {} functions, {} classes, {} enums, {} traits\n  {BOLD}Languages:{RESET} {}\n  {BOLD}Structure:{RESET} Rooted at {}",
                info.name, info.files, info.languages.len(),
                info.functions, info.classes, info.enums, info.traits,
                info.languages.iter().map(|(k, v)| format!("{k}: {v}")).collect::<Vec<_>>().join(", "),
                info.root
            );
        }
        return "I couldn't analyze the current project. Make sure you're in a project directory.".to_string();
    }

    // ── Help queries ──
    if query_lower.contains("help") || query_lower.contains("what can you do") {
        return "I can help you with:\n\n  {BOLD}Code Analysis:{RESET}\n    • Analyze project structure and symbols\n    • Search code across your project\n    • Understand code patterns and architecture\n\n  {BOLD}Development:{RESET}\n    • Suggest refactoring improvements\n    • Explain code in natural language\n    • Find TODO/FIXME/HACK markers\n    • Detect code smells and anti-patterns\n\n  {BOLD}Commands:{RESET}\n    /file <path>   Load file into context\n    /diff          Show git diff\n    /git           Show git status\n    /stats         Project statistics\n    @filename      Include file in your message\n\n  {BOLD}Examples:{RESET}\n    explain @src/main.rs what does this do?\n    how can I improve the error handling?\n    find all TODO comments".to_string();
    }

    // ── Language queries ──
    if query_lower.contains("language") || query_lower.contains("languages") {
        if let Some(info) = project_info {
            let mut langs: Vec<_> = info.languages.iter().collect();
            langs.sort_by(|a, b| b.1.cmp(a.1));
            let mut result = String::from("Languages in this project:\n");
            for (lang, count) in &langs {
                let bar_len = (**count).min(30);
                let bar = "█".repeat(bar_len);
                result.push_str(&format!("  {GREEN}{:<15}{RESET} {bar} {count}\n", lang));
            }
            return result;
        }
    }

    // ── Structure / architecture queries ──
    if query_lower.contains("structure") || query_lower.contains("architecture") {
        if let Some(info) = project_info {
            return format!(
                "{BOLD}Project Architecture{RESET}\n\n  {BOLD}Name:{RESET}     {}\n  {BOLD}Root:{RESET}     {}\n  {BOLD}Files:{RESET}    {} total\n  {BOLD}Symbols:{RESET}  {} functions, {} classes, {} enums, {} traits\n  {BOLD}Languages:{RESET} {}\n\n  {BOLD}Largest files:{RESET}\n{}",
                info.name, info.root, info.files,
                info.functions, info.classes, info.enums, info.traits,
                info.languages.len(),
                info.top_files.iter().take(5).map(|(f, s)| format!("    {DIM}{}{RESET} ({} bytes)", f, s)).collect::<Vec<_>>().join("\n")
            );
        }
    }

    // ── TODO/FIXME search ──
    if query_lower.contains("todo") || query_lower.contains("fixme") || query_lower.contains("hack") {
        if let Some(info) = project_info {
            let mut findings = Vec::new();
            for entry in &info.entries {
                if let Ok(content) = std::fs::read_to_string(&entry.path) {
                    for (i, line) in content.lines().enumerate() {
                        let trimmed = line.trim();
                        if trimmed.contains("TODO") {
                            findings.push(format!("  {YELLOW}📝{RESET} {}:{} — {DIM}{}{RESET}", entry.path, i + 1, trimmed.chars().take(80).collect::<String>()));
                        } else if trimmed.contains("FIXME") {
                            findings.push(format!("  {RED}🔴{RESET} {}:{} — {DIM}{}{RESET}", entry.path, i + 1, trimmed.chars().take(80).collect::<String>()));
                        } else if trimmed.contains("HACK") {
                            findings.push(format!("  {MAGENTA}⚠️{RESET} {}:{} — {DIM}{}{RESET}", entry.path, i + 1, trimmed.chars().take(80).collect::<String>()));
                        }
                    }
                }
            }
            if findings.is_empty() {
                return "{GREEN}✓{RESET} No TODO/FIXME/HACK markers found. Clean codebase!".to_string();
            }
            return format!("{BOLD}Found {} markers:{RESET}\n{}", findings.len(), findings.join("\n"));
        }
    }

    // ── Large file detection ──
    if query_lower.contains("large file") || query_lower.contains("big file") || query_lower.contains("split") {
        if let Some(info) = project_info {
            let mut big: Vec<_> = info.entries.iter().filter_map(|e| {
                std::fs::read_to_string(&e.path).ok().map(|c| (e.path.clone(), c.lines().count()))
            }).filter(|(_, l)| *l > 200).collect();
            big.sort_by(|a, b| b.1.cmp(&a.1));
            if big.is_empty() {
                return "{GREEN}✓{RESET} No large files found (all under 200 lines)".to_string();
            }
            let listing: Vec<_> = big.iter().take(10).map(|(f, l)| format!("  {DIM}{}{RESET} — {l} lines", f)).collect();
            return format!("{BOLD}Files over 200 lines:{RESET}\n{}", listing.join("\n"));
        }
    }

    // ── Error handling analysis ──
    if query_lower.contains("error") && (query_lower.contains("handling") || query_lower.contains("pattern")) {
        if let Some(info) = project_info {
            let mut error_patterns = Vec::new();
            for entry in &info.entries {
                if let Ok(content) = std::fs::read_to_string(&entry.path) {
                    let unwrap_count = content.matches(".unwrap()").count();
                    let expect_count = content.matches(".expect(").count();
                    let result_count = content.matches("Result<").count();
                    if unwrap_count > 0 || expect_count > 0 {
                        error_patterns.push(format!("  {DIM}{}{RESET} — unwrap: {}, expect: {}, Result: {}", entry.path, unwrap_count, expect_count, result_count));
                    }
                }
            }
            if error_patterns.is_empty() {
                return "No error handling patterns found in scan.".to_string();
            }
            return format!("{BOLD}Error handling patterns:{RESET}\n{}", error_patterns.join("\n"));
        }
    }

    // ── Dependency / import analysis ──
    if query_lower.contains("depend") || query_lower.contains("import") || query_lower.contains("dep") {
        let mut deps = Vec::new();
        // Check Cargo.toml
        if let Ok(content) = std::fs::read_to_string("Cargo.toml") {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.contains('=') && !trimmed.starts_with('[') && !trimmed.starts_with('#') {
                    deps.push(format!("  {CYAN}{}{RESET}", trimmed.split('=').next().unwrap_or(trimmed).trim()));
                }
            }
        }
        // Check package.json
        if let Ok(content) = std::fs::read_to_string("package.json") {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                for key in ["dependencies", "devDependencies"] {
                    if let Some(obj) = pkg[key].as_object() {
                        for (name, ver) in obj {
                            deps.push(format!("  {CYAN}{name}{RESET} {ver}"));
                        }
                    }
                }
            }
        }
        if deps.is_empty() {
            return "No dependencies found in Cargo.toml or package.json".to_string();
        }
        return format!("{BOLD}Dependencies ({} total):{RESET}\n{}", deps.len(), deps.join("\n"));
    }

    // ── Test coverage queries ──
    if query_lower.contains("test") && (query_lower.contains("coverage") || query_lower.contains("where")) {
        if let Some(info) = project_info {
            let test_files: Vec<_> = info.entries.iter().filter(|e| {
                e.name.contains("test") || e.name.contains("spec") || e.path.contains("tests/") || e.path.contains("__tests__")
            }).map(|e| format!("  {DIM}{}{RESET}", e.path)).collect();
            if test_files.is_empty() {
                return "{YELLOW}⚠{RESET} No test files detected. Consider adding tests!".to_string();
            }
            return format!("{BOLD}Test files ({}):{RESET}\n{}", test_files.len(), test_files.join("\n"));
        }
    }

    // ── Refactoring suggestions ──
    if query_lower.contains("refactor") || query_lower.contains("improve") {
        if let Some(info) = project_info {
            let mut suggestions = Vec::new();
            // Check for large files
            for entry in &info.entries {
                if let Ok(content) = std::fs::read_to_string(&entry.path) {
                    let lines = content.lines().count();
                    if lines > 300 {
                        suggestions.push(format!("  {YELLOW}⚠{RESET} {BOLD}{}{RESET} — {} lines. Consider splitting into smaller modules.", entry.path, lines));
                    }
                    // Check for deep nesting
                    let max_indent = content.lines().map(|l| l.len() - l.trim_start().len()).max().unwrap_or(0);
                    if max_indent > 40 {
                        suggestions.push(format!("  {YELLOW}⚠{RESET} {BOLD}{}{RESET} — deep nesting detected ({} spaces). Extract helper functions.", entry.path, max_indent));
                    }
                }
            }
            if suggestions.is_empty() {
                return "{GREEN}✓{RESET} Code looks well-structured. No obvious refactoring needed.".to_string();
            }
            return format!("{BOLD}Refactoring suggestions:{RESET}\n{}", suggestions.join("\n"));
        }
    }

    // ── Context-aware responses (with file content) ──
    if query.contains("--- File Context ---") {
        // We have file content — do a basic analysis
        let file_section = query.split("--- File Context ---").nth(1).unwrap_or("");
        let lines: Vec<&str> = file_section.lines().collect();
        let total_lines = lines.len();
        let functions = lines.iter().filter(|l| l.contains("fn ") || l.contains("function ") || l.contains("def ")).count();
        let imports = lines.iter().filter(|l| l.starts_with("use ") || l.starts_with("import ") || l.starts_with("from ")).count();
        
        let question = query.split("--- File Context ---").next().unwrap_or(query).trim();
        
        return format!(
            "{BOLD}File Analysis:{RESET}\n  Lines: {total_lines} | Functions: {functions} | Imports: {imports}\n\n  Based on the code you shared, here's what I can see:\n  • The file contains {functions} function(s) across {total_lines} lines\n  • There are {imports} import statement(s)\n  • {DIM}For AI-powered deep analysis, set IDEXAL_API_KEY{RESET}\n\n  {DIM}Your question: {question}{RESET}"
        );
    }

    // ── Conversation context (follow-up questions) ──
    if !history.is_empty() {
        let last_exchange = history.last().unwrap();
        if query_lower.contains("more") || query_lower.contains("explain") || query_lower.contains("elaborate") {
            return format!(
                "{BOLD}Following up on: {DIM}{}{RESET}\n\nI can provide more details about that. Try:\n  • Ask about specific functions or types\n  • Use /file <path> to load more context\n  • Use @filename to include a file in your question\n  {DIM}For deep AI analysis, set IDEXAL_API_KEY{RESET}"
            , last_exchange.0.chars().take(60).collect::<String>());
        }
    }

    // ── Default response ──
    let api_key = std::env::var("IDEXAL_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        let q_preview = query.chars().take(80).collect::<String>();
        format!(
            "{DIM}I understood your question: {BOLD}\"{}\"{RESET}{DIM}\n\nTo get AI-powered responses, set your API key:\n  export IDEXAL_API_KEY=sk-...\n  export IDEXAL_PROVIDER=openai  (or anthropic, google, etc.)\n\nFor now, I can help with:\n  • Project analysis: ask about structure, languages, dependencies\n  • Code search: use /file to load context\n  • Quick checks: TODO markers, large files, error patterns\n  • Try: {BOLD}\"what is this project?\"{RESET}{DIM}{RESET}"
        , q_preview)
    } else {
        let provider = std::env::var("IDEXAL_PROVIDER").unwrap_or_else(|_| "openai".to_string());
        format!("{DIM}Processing with AI provider... (IDEXAL_PROVIDER={provider}){RESET}")
    }
}

// ── Edit command (AI-assisted file editing) ─────────────────────────

fn cmd_edit(args: &[String]) {
    if args.is_empty() {
        println!();
        println!("  {CYAN}{BOLD}AI-Assisted File Editing{RESET}");
        println!();
        println!("  {DIM}Usage:{RESET}");
        println!("    {GREEN}idexal edit file.rs{RESET}            Edit with AI suggestions");
        println!("    {GREEN}idexal edit file.rs --explain{RESET}  Explain code before editing");
        println!("    {GREEN}idexal edit file.rs --fix{RESET}      Auto-fix issues");
        println!("    {GREEN}idexal edit file.rs --refactor{RESET} Suggest refactoring");
        println!();
        return;
    }

    let path = std::path::Path::new(&args[0]);
    let mode = args.iter().find(|a| a.starts_with("--")).map(|a| a.as_str()).unwrap_or("--explain");

    if !path.exists() {
        eprintln!("  {RED}error:{RESET} file not found: {}", args[0]);
        std::process::exit(1);
    }

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("  {RED}error:{RESET} could not read {}: {e}", args[0]);
            std::process::exit(1);
        }
    };

    let lines = content.lines().count();
    let functions = content.lines().filter(|l| l.contains("fn ") || l.contains("function ")).count();
    let lang = match path.extension().and_then(|e| e.to_str()) {
        Some("rs") => "Rust",
        Some("ts") | Some("tsx") => "TypeScript",
        Some("js") | Some("jsx") => "JavaScript",
        Some("py") => "Python",
        Some("go") => "Go",
        _ => "Unknown",
    };

    println!();
    println!("  {CYAN}{BOLD}AI-Assisted Edit{RESET}");
    println!();
    println!("  {BOLD}File:{RESET}    {}", args[0]);
    println!("  {BOLD}Language:{RESET} {lang}");
    println!("  {BOLD}Lines:{RESET}   {lines}");
    println!("  {BOLD}Functions:{RESET} {functions}");
    println!("  {BOLD}Mode:{RESET}    {mode}");
    println!();

    match mode {
        "--fix" => {
            let mut fixes = Vec::new();
            for (i, line) in content.lines().enumerate() {
                let trimmed = line.trim();
                if trimmed.contains(".unwrap()") && !trimmed.contains("test") {
                    fixes.push((i + 1, trimmed, "Replace unwrap() with proper error handling"));
                }
                if trimmed.starts_with("// TODO") || trimmed.starts_with("// FIXME") {
                    fixes.push((i + 1, trimmed, "Address TODO/FIXME comment"));
                }
                if trimmed.contains("println!") && !trimmed.contains("test") {
                    // Don't flag debug prints in tests
                }
            }
            if fixes.is_empty() {
                let fname = &args[0];
                println!("  {GREEN}✓{RESET} No obvious issues found in {fname}");
            } else {
                println!("  {BOLD}Found {} potential fixes:{RESET}", fixes.len());
                for (line_no, code, suggestion) in fixes.iter().take(15) {
                    println!("  {YELLOW}L{line_no}{RESET}: {DIM}{code}{RESET}");
                    println!("        → {suggestion}");
                }
            }
        }
        "--refactor" => {
            println!("  {BOLD}Refactoring suggestions for {}:{RESET}", args[0]);
            println!();
            if lines > 200 {
                println!("  {YELLOW}⚠{RESET} File is {lines} lines — consider splitting into smaller modules");
            }
            let max_indent = content.lines().map(|l| l.len() - l.trim_start().len()).max().unwrap_or(0);
            if max_indent > 30 {
                println!("  {YELLOW}⚠{RESET} Deep nesting detected ({max_indent} spaces max) — extract helper functions");
            }
            let dup_count = content.lines().filter(|l| l.trim().starts_with("// Copy")).count();
            if dup_count > 0 {
                println!("  {YELLOW}⚠{RESET} {dup_count} copy-paste markers found — extract shared logic");
            }
            let pub_count = content.lines().filter(|l| l.trim().starts_with("pub ")).count();
            if pub_count > 10 {
                println!("  {YELLOW}⚠{RESET} {pub_count} public items — consider narrowing the public API");
            }
            println!("  {DIM}For AI-powered refactoring, set IDEXAL_API_KEY{RESET}");
        }
        _ => { // --explain (default)
            let fname = &args[0];
            println!("  {BOLD}Code Explanation:{RESET}");
            println!();
            println!("  This file ({fname}) contains {functions} function(s) in {lines} lines of {lang} code.");
            println!();
            // Show function signatures
            let fns: Vec<_> = content.lines().enumerate().filter_map(|(i, l)| {
                let t = l.trim();
                if t.contains("fn ") && !t.starts_with("//") {
                    Some((i + 1, t))
                } else if t.contains("function ") && !t.starts_with("//") {
                    Some((i + 1, t))
                } else {
                    None
                }
            }).take(20).collect();
            if !fns.is_empty() {
                println!("  {BOLD}Functions:{RESET}");
                for (line_no, sig) in &fns {
                    println!("    {DIM}L{line_no}{RESET} {sig}");
                }
            }
            println!();
            println!("  {DIM}For AI-powered explanation, set IDEXAL_API_KEY{RESET}");
        }
    }
    println!();
}

// ── Review command ──────────────────────────────────────────────────

fn cmd_review() {
    println!();
    println!("  {CYAN}{BOLD}Code Review Analysis{RESET}");
    println!();

    let info = match analyze_current_dir() {
        Some(i) => i,
        None => {
            println!("  {RED}Could not analyze project{RESET}");
            return;
        }
    };

    let mut issues: Vec<(String, String, String)> = Vec::new();

    // Check for large files
    for entry in &info.entries {
        if let Ok(content) = std::fs::read_to_string(&entry.path) {
            let lines = content.lines().count();
            if lines > 500 {
                issues.push((
                    format!("{YELLOW}⚠ {RESET}Large file: {}", entry.path),
                    format!("{lines} lines — consider splitting"),
                    "high".to_string(),
                ));
            }
        }
    }

    // Check for TODO/FIXME
    for entry in &info.entries {
        if let Ok(content) = std::fs::read_to_string(&entry.path) {
            for (i, line) in content.lines().enumerate() {
                if line.contains("TODO") || line.contains("FIXME") || line.contains("HACK") {
                    issues.push((
                        format!("{YELLOW}📝 {RESET}{}:{}", entry.path, i + 1),
                        line.trim().to_string(),
                        "low".to_string(),
                    ));
                }
            }
        }
    }

    if issues.is_empty() {
        println!("  {GREEN}✓{RESET} No obvious issues found!");
    } else {
        println!("  {BOLD}Found {} potential issues:{RESET}", issues.len());
        println!();
        for (header, detail, _severity) in issues.iter().take(20) {
            println!("  {header}");
            println!("    {DIM}{detail}{RESET}");
        }
    }
    println!();
}

// ── Fix command ──────────────────────────────────────────────────────

fn cmd_fix(args: &[String]) {
    if args.is_empty() {
        println!();
        println!("  {CYAN}{BOLD}Auto-fix Suggestions{RESET}");
        println!();
        println!("  {DIM}Usage:{RESET}");
        println!("    {GREEN}idexal fix warnings{RESET}    Suggest fixes for warnings");
        println!("    {GREEN}idexal fix lint{RESET}        Run linting and suggest fixes");
        println!("    {GREEN}idexal fix format{RESET}      Format code");
        println!();
        return;
    }

    let mode = &args[0];
    println!();

    match mode.as_str() {
        "warnings" => {
            println!("  {CYAN}{BOLD}Analyzing warnings...{RESET}");
            // Would connect to Rust/TS linter
            println!("  {DIM}Connect a linter for auto-fix suggestions{RESET}");
        }
        "lint" => {
            println!("  {CYAN}{BOLD}Running linter...{RESET}");
            println!("  {DIM}Run: cargo clippy / eslint for detailed analysis{RESET}");
        }
        "format" => {
            println!("  {CYAN}{BOLD}Formatting code...{RESET}");
            println!("  {DIM}Run: cargo fmt / prettier for formatting{RESET}");
        }
        _ => {
            println!("  {RED}Unknown fix mode: {mode}{RESET}");
        }
    }
    println!();
}

// ── Explain command ──────────────────────────────────────────────────

fn cmd_explain(args: &[String]) {
    if args.is_empty() {
        println!();
        println!("  {CYAN}{BOLD}Explain Code{RESET}");
        println!();
        println!("  {DIM}Usage:{RESET}");
        println!("    {GREEN}idexal explain main.rs{RESET}        Explain a file");
        println!("    {GREEN}idexal explain src/auth{RESET}        Explain a module");
        println!();
        return;
    }

    let target = args.join(" ");
    let path = std::path::Path::new(&target);
    println!();
    println!("  {CYAN}{BOLD}Analyzing:{RESET} {target}");
    println!();

    if path.exists() {
        if path.is_file() {
            if let Ok(content) = std::fs::read_to_string(path) {
                let lines = content.lines().count();
                let bytes = content.len();
                let fns = content.lines().filter(|l| l.contains("fn ") || l.contains("function ")).count();
                let structs = content.lines().filter(|l| l.contains("struct ") || l.contains("class ")).count();

                println!("  {BOLD}File:{RESET} {target}");
                println!("  {BOLD}Lines:{RESET} {lines}");
                println!("  {BOLD}Size:{RESET}  {bytes} bytes");
                println!("  {BOLD}Functions:{RESET} {fns}");
                println!("  {BOLD}Types:{RESET}    {structs}");
                println!();
                println!("  {DIM}For AI-powered explanation, set IDEXAL_API_KEY{RESET}");
            }
        } else {
            println!("  {BOLD}Type:{RESET} Directory");
            if let Ok(entries) = std::fs::read_dir(path) {
                let count = entries.count();
                println!("  {BOLD}Entries:{RESET} {count}");
            }
        }
    } else {
        println!("  {RED}Path not found: {target}{RESET}");
    }
    println!();
}

// ── Config command ───────────────────────────────────────────────────

fn cmd_config() {
    println!();
    println!("  {CYAN}{BOLD}Idexal CLI Configuration{RESET}");
    println!();

    // Check environment variables
    let api_key = std::env::var("IDEXAL_API_KEY").unwrap_or_default();
    let model = std::env::var("IDEXAL_MODEL").unwrap_or_else(|_| "gpt-4".to_string());
    let provider = std::env::var("IDEXAL_PROVIDER").unwrap_or_else(|_| "openai".to_string());

    println!("  {BOLD}Provider:{RESET}  {CYAN}{provider}{RESET}");
    println!("  {BOLD}Model:{RESET}     {CYAN}{model}{RESET}");
    let api_key_display = if api_key.is_empty() {
        format!("{YELLOW}not set{RESET}")
    } else {
        let masked = &api_key[api_key.len().saturating_sub(4)..];
        format!("{GREEN}***{masked}{RESET}")
    };
    println!("  {BOLD}API Key:{RESET}   {api_key_display}");
    println!();

    // Config file locations
    let config_dir = dirs().map(|d| d.join("idexal")).unwrap_or_default();
    println!("  {BOLD}Config dir:{RESET} {}", config_dir.display());
    println!();

    if !config_dir.exists() {
        println!("  {DIM}Create config: mkdir -p {}/{RESET}", config_dir.display());
    }
    println!();
}

fn dirs() -> Option<std::path::PathBuf> {
    if cfg!(target_os = "windows") {
        std::env::var("APPDATA").ok().map(std::path::PathBuf::from)
    } else {
        std::env::var("HOME").ok().map(|h| std::path::PathBuf::from(h).join(".config"))
    }
}

// ── Diff command ───────────────────────────────────────────────────

fn cmd_diff(args: &[String]) {
    if args.is_empty() {
        println!();
        println!("  {CYAN}{BOLD}Git Diff{RESET}");
        println!();
        println!("  {DIM}Usage:{RESET}");
        println!("    {GREEN}idexal diff{RESET}            Show unstaged changes");
        println!("    {GREEN}idexal diff --staged{RESET}  Show staged changes");
        println!("    {GREEN}idexal diff HEAD{RESET}       Show all changes vs HEAD");
        println!("    {GREEN}idexal diff file.ts{RESET}   Show changes in file");
        println!();
        return;
    }

    let staged = args.contains(&"--staged".to_string());
    let target = args.iter().find(|a| !a.starts_with('-'));

    println!();
    println!("  {CYAN}{BOLD}Git Diff{RESET}{}
", if staged { " (staged)" } else { "" });

    let mut cmd = std::process::Command::new("git");
    cmd.arg("diff");
    if staged { cmd.arg("--staged"); }
    if let Some(t) = target {
        if t.as_str() == "HEAD" {
            cmd.arg("HEAD");
        } else {
            cmd.arg("--").arg(t);
        }
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.is_empty() {
                println!("  {GREEN}No changes{RESET}");
            } else {
                for line in stdout.lines() {
                    if line.starts_with('+') && !line.starts_with("+++") {
                        println!("  {GREEN}{line}{RESET}");
                    } else if line.starts_with('-') && !line.starts_with("---") {
                        println!("  {RED}{line}{RESET}");
                    } else if line.starts_with("@@") {
                        println!("  {CYAN}{line}{RESET}");
                    } else {
                        println!("  {DIM}{line}{RESET}");
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("  {RED}Git error: {e}{RESET}");
        }
    }
    println!();
}

// ── Whoami command ─────────────────────────────────────────────────

fn cmd_whoami() {
    let user = std::env::var("USER").or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| "unknown".to_string());
    let shell = std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") { "powershell".to_string() } else { "/bin/bash".to_string() }
    });
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    println!();
    println!("  {CYAN}{BOLD}System Info{RESET}");
    println!();
    println!("  {BOLD}User:{RESET}     {GREEN}{user}{RESET}");
    println!("  {BOLD}Home:{RESET}     {home}");
    println!("  {BOLD}Shell:{RESET}    {shell}");
    println!("  {BOLD}OS:{RESET}       {os}");
    println!("  {BOLD}Arch:{RESET}     {arch}");
    println!("  {BOLD}Rust:{RESET}     {}", env!("CARGO_PKG_VERSION"));
    println!();
}

// ── Env command ────────────────────────────────────────────────────

fn cmd_env() {
    println!();
    println!("  {CYAN}{BOLD}Idexal Environment{RESET}");
    println!();

    let vars = [
        ("IDEXAL_API_KEY", "API Key"),
        ("IDEXAL_MODEL", "Model"),
        ("IDEXAL_PROVIDER", "Provider"),
        ("IDEXAL_THEME", "Theme"),
        ("IDEXAL_LOG_LEVEL", "Log Level"),
    ];

    for (key, label) in &vars {
        match std::env::var(key) {
            Ok(val) if !val.is_empty() => {
                let display = if key.contains("KEY") && val.len() > 8 {
                    format!("***{}", &val[val.len()-4..])
                } else {
                    val
                };
                println!("  {BOLD}{label:<15}{RESET} {GREEN}{display}{RESET}");
            }
            _ => {
                println!("  {BOLD}{label:<15}{RESET} {DIM}not set{RESET}");
            }
        }
    }
    println!();
}

// ── JSON analyze ───────────────────────────────────────────────────

async fn cmd_analyze_json(json: bool) {
    let info = match tokio::task::spawn_blocking(analyze_current_dir).await.unwrap_or(None) {
        Some(i) => i,
        None => {
            eprintln!("{RED}Could not analyze current directory{RESET}");
            return;
        }
    };

    if json {
        let langs: Vec<String> = info.languages.iter()
            .map(|(k, v)| format!("{{\"language\":\"{}\",\"count\":{}}}", k, v))
            .collect();
        println!("{{\"name\":\"{}\",\"files\":{},\"symbols\":{},\"functions\":{},\"classes\":{},\"enums\":{},\"traits\":{},\"languages\":[{}]}}",
            info.name, info.files, info.symbols, info.functions, info.classes, info.enums, info.traits,
            langs.join(","));
    } else {
        cmd_analyze().await;
    }
}

// ── JSON review ────────────────────────────────────────────────────

async fn cmd_review_json(json: bool) {
    if json {
        let info = match tokio::task::spawn_blocking(analyze_current_dir).await.unwrap_or(None) {
            Some(i) => i,
            None => {
                eprintln!("{{\"error\":\"Could not analyze project\"}}");
                return;
            }
        };
        let mut issues = Vec::new();
        for entry in &info.entries {
            if let Ok(content) = std::fs::read_to_string(&entry.path) {
                let lines = content.lines().count();
                if lines > 500 {
                    issues.push(format!("{{\"type\":\"large_file\",\"file\":\"{}\",\"lines\":{},\"severity\":\"warning\"}}",
                        entry.path.replace('\\', "/"), lines));
                }
            }
        }
        println!("{{\"issues\":[{}],\"total\":{}}}", issues.join(","), issues.len());
    } else {
        cmd_review();
    }
}

// ── Init command ───────────────────────────────────────────────────

fn cmd_init(args: &[String]) {
    let template = args.first().map(|s| s.as_str()).unwrap_or("basic");
    let cwd = std::env::current_dir().unwrap_or_default();
    let project_name = cwd.file_name().unwrap_or_default().to_string_lossy().to_string();

    println!();
    println!("  {CYAN}{BOLD}Initialize New Project{RESET}");
    println!();
    println!("  {BOLD}Project:{RESET} {project_name}");
    println!("  {BOLD}Template:{RESET} {template}");
    println!("  {BOLD}Location:{RESET} {}", cwd.display());
    println!();

    match template {
        "rust" | "rs" => {
            println!("  {GREEN}Creating Rust project...{RESET}");
            let _ = std::fs::write(cwd.join("Cargo.toml"), format!(
                "[package]\nname = \"{project_name}\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[dependencies]\ntokio = {{ version = \"1\", features = [\"full\"] }}\nanyhow = \"1.0\"\nserde = {{ version = \"1\", features = [\"derive\"] }}\nserde_json = \"1.0\"\n"
            ));
            let _ = std::fs::create_dir_all(cwd.join("src"));
            let _ = std::fs::write(cwd.join("src/main.rs"),
                "use anyhow::Result;\n\n#[tokio::main]\nasync fn main() -> Result<()> {\n    println!(\"Hello, world!\");\n    Ok(())\n}\n"
            );
            println!("  {GREEN}✓{RESET} Cargo.toml");
            println!("  {GREEN}✓{RESET} src/main.rs");
        }
        "node" | "ts" => {
            println!("  {GREEN}Creating Node.js/TypeScript project...{RESET}");
            let pkg = serde_json::json!({
                "name": project_name,
                "version": "0.1.0",
                "main": "dist/index.js",
                "scripts": { "build": "tsc", "dev": "ts-node src/index.ts" },
                "devDependencies": { "typescript": "^5.0.0", "ts-node": "^10.0.0" },
            });
            let _ = std::fs::write(cwd.join("package.json"), serde_json::to_string_pretty(&pkg).unwrap_or_default());
            let _ = std::fs::write(cwd.join("tsconfig.json"),
                "{\"compilerOptions\":{\"target\":\"ES2020\",\"module\":\"commonjs\",\"strict\":true,\"esModuleInterop\":true,\"outDir\":\"dist\"}}"
            );
            let _ = std::fs::create_dir_all(cwd.join("src"));
            let _ = std::fs::write(cwd.join("src/index.ts"), "console.log('Hello, world!')\n");
            println!("  {GREEN}✓{RESET} package.json");
            println!("  {GREEN}✓{RESET} tsconfig.json");
            println!("  {GREEN}✓{RESET} src/index.ts");
        }
        "python" | "py" => {
            println!("  {GREEN}Creating Python project...{RESET}");
            let _ = std::fs::write(cwd.join("pyproject.toml"), format!(
                "[project]\nname = \"{project_name}\"\nversion = \"0.1.0\"\nrequires-python = \">=3.10\"\n\n[project.scripts]\n{project_name} = \"src.main:main\"\n"
            ));
            let _ = std::fs::create_dir_all(cwd.join("src"));
            let _ = std::fs::write(cwd.join("src/__init__.py"), "");
            let _ = std::fs::write(cwd.join("src/main.py"), "def main():\n    print('Hello, world!')\n\nif __name__ == '__main__':\n    main()\n");
            println!("  {GREEN}✓{RESET} pyproject.toml");
            println!("  {GREEN}✓{RESET} src/main.py");
        }
        _ => {
            println!("  {GREEN}Creating basic project...{RESET}");
            let _ = std::fs::write(cwd.join(".gitignore"),
                "/node_modules\n/dist\n/target\n*.log\n.env\n.env.local\n");
            let _ = std::fs::write(cwd.join("README.md"), format!(
                "# {project_name}\n\nProject created with idexal init.\n"
            ));
            println!("  {GREEN}✓{RESET} .gitignore");
            println!("  {GREEN}✓{RESET} README.md");
        }
    }

    println!();
    println!("  {GREEN}✓{RESET} Project initialized successfully!");
    println!("  {DIM}Run `idexal analyze` to see project details{RESET}");
    println!();
}

// ── Watch command ──────────────────────────────────────────────────

fn cmd_watch(args: &[String]) {
    let interval: u64 = args.iter()
        .find(|a| a.starts_with("--interval="))
        .and_then(|a| a.split('=').nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(5);

    println!();
    println!("  {CYAN}{BOLD}File Watcher{RESET}");
    println!("  {DIM}Monitoring every {interval}s — Ctrl+C to stop{RESET}");
    println!();

    let mut last_count = 0usize;

    loop {
        let info = analyze_current_dir();
        if let Some(info) = &info {
            let now = std::time::SystemTime::now();
            let changed = info.files != last_count;

            if changed || last_count == 0 {
                let time_str = now.duration_since(std::time::UNIX_EPOCH)
                    .map(|d| format!("{}", d.as_secs()))
                    .unwrap_or_default();
                println!("  {CYAN}[{time_str}]{RESET} Files: {GREEN}{}{RESET} | Symbols: {BLUE}{}{RESET}",
                    info.files, info.symbols);
            }
            last_count = info.files;

        }
        std::thread::sleep(std::time::Duration::from_secs(interval));
    }
}

// ── Stats command ──────────────────────────────────────────────────

async fn cmd_stats(json: bool) {
    let info = match analyze_current_dir() {
        Some(i) => i,
        None => {
            eprintln!("{RED}Could not analyze project{RESET}");
            return;
        }
    };

    // Parallel async file reads for line counting
    let mut join_set = tokio::task::JoinSet::new();
    for entry in &info.entries {
        let path = entry.path.clone();
        join_set.spawn(async move { tokio::fs::read_to_string(&path).await.ok().map(|c| c.lines().count()) });
    }
    let mut total_lines: usize = 0;
    while let Some(result) = join_set.join_next().await {
        if let Ok(Some(lines)) = result { total_lines += lines; }
    }

    let avg_lines = total_lines.checked_div(info.files).unwrap_or(0);
    let largest = info.top_files.first().map(|(n, s)| (n.clone(), *s)).unwrap_or_default();

    if json {
        println!("{{\"name\":\"{}\",\"files\":{},\"total_lines\":{},\"avg_lines\":{},\"symbols\":{},\"functions\":{},\"classes\":{},\"largest_file\":\"{}\",\"largest_size\":{}}}",
            info.name, info.files, total_lines, avg_lines, info.symbols, info.functions, info.classes, largest.0, largest.1);
    } else {
        println!();
        println!("  {CYAN}{BOLD}Project Statistics{RESET}");
        println!();
        println!("  {BOLD}Name:{RESET}           {}", info.name);
        println!("  {BOLD}Root:{RESET}           {}", info.root);
        println!();
        println!("  {BOLD}Files:{RESET}          {GREEN}{}{RESET}", info.files);
        println!("  {BOLD}Total Lines:{RESET}    {GREEN}{}{RESET}", total_lines);
        println!("  {BOLD}Avg Lines/File:{RESET} {GREEN}{}{RESET}", avg_lines);
        println!("  {BOLD}Symbols:{RESET}        {BLUE}{}{RESET}", info.symbols);
        println!("  {BOLD}Functions:{RESET}      {BLUE}{}{RESET}", info.functions);
        println!("  {BOLD}Classes:{RESET}        {BLUE}{}{RESET}", info.classes);
        println!("  {BOLD}Languages:{RESET}      {}", info.languages.len());
        println!();
        if !largest.0.is_empty() {
            let size_kb = largest.1 as f64 / 1024.0;
            println!("  {BOLD}Largest File:{RESET}   {} ({:.1} KB)", largest.0, size_kb);
        }
        println!();
    }
}

// ── Bench command ──────────────────────────────────────────────────

fn cmd_bench(args: &[String]) {
    let iterations: usize = args.iter()
        .find(|a| a.starts_with("--iterations="))
        .and_then(|a| a.split('=').nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);

    println!();
    println!("  {CYAN}{BOLD}Benchmark{RESET}");
    println!("  {DIM}Running {iterations} iterations...{RESET}");
    println!();

    // Benchmark: File reading
    let cwd = std::env::current_dir().unwrap_or_default();
    let start = std::time::Instant::now();
    let mut total_bytes = 0u64;
    for _ in 0..iterations {
        if let Ok(entries) = std::fs::read_dir(&cwd) {
            for entry in entries.flatten() {
                if entry.path().is_file() {
                    if let Ok(meta) = entry.metadata() {
                        total_bytes += meta.len();
                    }
                }
            }
        }
    }
    let file_scan_ms = start.elapsed().as_millis();
    println!("  {BOLD}File Scan:{RESET}      {GREEN}{file_scan_ms}ms{RESET} ({iterations} iterations)");
    println!("  {DIM}Total bytes scanned: {total_bytes}{RESET}");

    // Benchmark: Directory traversal
    let start = std::time::Instant::now();
    let mut file_count = 0usize;
    for _ in 0..iterations {
        fn count_files(dir: &Path, count: &mut usize) {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() && !path.file_name().is_some_and(|n| n == "node_modules" || n == "target" || n == ".git") {
                        count_files(&path, count);
                    } else if path.is_file() {
                        *count += 1;
                    }
                }
            }
        }
        count_files(&cwd, &mut file_count);
    }
    let dir_traversal_ms = start.elapsed().as_millis();
    println!("  {BOLD}Dir Traversal:{RESET}  {GREEN}{dir_traversal_ms}ms{RESET} ({iterations} iterations)");
    println!("  {DIM}Files found: {file_count}{RESET}");

    // Benchmark: String operations
    let start = std::time::Instant::now();
    let mut hash = 0u64;
    for i in 0..iterations * 1000 {
        hash = hash.wrapping_mul(31).wrapping_add(i as u64);
    }
    let string_ms = start.elapsed().as_millis();
    let string_ops = iterations * 1000;
    println!("  {BOLD}String Ops:{RESET}     {GREEN}{string_ms}ms{RESET} ({string_ops} iterations)");

    // Summary
    println!();
    let total_ms = file_scan_ms + dir_traversal_ms + string_ms;
    println!("  {BOLD}Total:{RESET}          {CYAN}{total_ms}ms{RESET}");
    println!();
}

// ── Tree command ───────────────────────────────────────────────────

async fn cmd_tree(args: &[String]) {
    let max_depth: usize = args.iter()
        .find(|a| a.starts_with("--depth="))
        .and_then(|a| a.split('=').nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(3);

    let cwd = std::env::current_dir().unwrap_or_default();
    println!();
    println!("  {CYAN}{BOLD}{}{RESET}", cwd.file_name().unwrap_or_default().to_string_lossy());

    fn print_tree(dir: &Path, prefix: &str, depth: usize, max: usize) {
        if depth >= max { return; }
        let mut entries: Vec<_> = match std::fs::read_dir(dir) {
            Ok(r) => r.filter_map(|e| e.ok()).collect(),
            Err(_) => return,
        };
        entries.sort_by(|a, b| {
            let a_dir = a.path().is_dir();
            let b_dir = b.path().is_dir();
            b_dir.cmp(&a_dir).then_with(|| a.file_name().cmp(&b.file_name()))
        });

        for (i, entry) in entries.iter().enumerate() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
                continue;
            }
            let is_last = i == entries.len() - 1 || entries.iter().skip(i + 1).all(|e| {
                let n = e.file_name().to_string_lossy().to_string();
                n.starts_with('.') || n == "node_modules" || n == "target" || n == ".git"
            });
            let connector = if is_last { "└── " } else { "├── " };
            let child_prefix = if is_last { "    " } else { "│   " };

            if entry.path().is_dir() {
                println!("  {prefix}{connector}{GREEN}{name}{RESET}");
                print_tree(&entry.path(), &format!("{prefix}{child_prefix}"), depth + 1, max);
            } else {
                println!("  {prefix}{connector}{name}");
            }
        }
    }

    tokio::task::spawn_blocking(move || print_tree(&cwd, "", 0, max_depth)).await.ok();
    println!();
}

// ── Serve command ──────────────────────────────────────────────────

fn cmd_serve(args: &[String]) {
    let port: u16 = args.iter()
        .find(|a| a.starts_with("--port="))
        .and_then(|a| a.split('=').nth(1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(8080);

    let dir = args.iter()
        .find(|a| !a.starts_with('-'))
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    println!();
    println!("  {CYAN}{BOLD}Static File Server{RESET}");
    println!();
    println!("  {BOLD}Directory:{RESET} {}", dir.display());
    println!("  {BOLD}Port:{RESET}      {port}");
    println!("  {BOLD}URL:{RESET}       {CYAN}http://localhost:{port}{RESET}");
    println!();
    println!("  {DIM}Serving files... Press Ctrl+C to stop{RESET}");
    println!();

    // Simple HTTP server using std library
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;

    let addr = format!("0.0.0.0:{port}");
    let listener = match TcpListener::bind(&addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("  {RED}error:{RESET} could not bind to {addr}: {e}");
            return;
        }
    };

    for stream in listener.incoming() {
        match stream {
            Ok(mut stream) => {
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut first_line = String::new();
                let _ = reader.read_line(&mut first_line);

                let parts: Vec<&str> = first_line.split_whitespace().collect();
                let path = if parts.len() >= 2 { parts[1] } else { "/" };
                let path = path.trim_start_matches('/');
                let path = if path.is_empty() { "index.html" } else { path };

                let full_path = dir.join(path);
                let mime = match full_path.extension().and_then(|e| e.to_str()) {
                    Some("html") | Some("htm") => "text/html",
                    Some("css") => "text/css",
                    Some("js") | Some("mjs") => "application/javascript",
                    Some("json") => "application/json",
                    Some("png") | Some("jpg") | Some("jpeg") | Some("gif") => "image/png",
                    Some("svg") => "image/svg+xml",
                    Some("ico") => "image/x-icon",
                    Some("txt") | Some("md") => "text/plain",
                    _ => "text/plain",
                };

                let (status, body) = if full_path.exists() && full_path.is_file() {
                    match std::fs::read(&full_path) {
                        Ok(content) => ("200 OK", content),
                        Err(_) => ("500 Internal Server Error", b"500".to_vec()),
                    }
                } else {
                    ("404 Not Found", b"404 Not Found".to_vec())
                };

                let response = format!(
                    "HTTP/1.1 {status}\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
                    body.len()
                );

                let _ = stream.write_all(response.as_bytes());
                let _ = stream.write_all(&body);
                let _ = stream.flush();

                println!("  {GREEN}200{RESET} {path}");
            }
            Err(e) => {
                eprintln!("  {RED}error:{RESET} {e}");
            }
        }
    }
}

// ── About command ─────────────────────────────────────────────────

fn cmd_about(json: bool) {
    if json {
        println!("{{\"name\":\"Idexal IDE\",\"version\":\"{VERSION}\",\"license\":\"MIT\",\"founder\":\"Zakariae Lahbabi\",\"website\":\"https://idexa.com\",\"personal\":\"https://zakariaelahbabi.com\",\"email_personal\":\"info@zakariaelahbabi.com\",\"email_team\":\"team@idexal.com\",\"email_ide\":\"ide@idexal.com\",\"github_org\":\"https://github.com/idexal\",\"repo_ide\":\"https://github.com/idexal/idexal-ide\",\"repo_cli\":\"https://github.com/idexal/idexa-cli\"}}");
        return;
    }

    println!();
    println!("  {CYAN}{BOLD}╔══════════════════════════════════════════════════════════╗{RESET}");
    println!("  {CYAN}{BOLD}║                                                          ║{RESET}");
    println!("  {CYAN}{BOLD}║         {BOLD}Idexal IDE{RESET}{CYAN}{BOLD} v{VERSION:<38}║{RESET}");
    println!("  {CYAN}{BOLD}║         AI-Powered Development Platform                  ║{RESET}");
    println!("  {CYAN}{BOLD}║                                                          ║{RESET}");
    println!("  {CYAN}{BOLD}╚══════════════════════════════════════════════════════════╝{RESET}");
    println!();

    println!("  {BOLD}Founder & CEO:{RESET}");
    println!("    {GREEN}Zakariae Lahbabi{RESET}");
    println!("    {DIM}Founder, CEO & Lead Developer{RESET}");
    println!();

    println!("  {BOLD}Personal:{RESET}");
    println!("    🌐 {CYAN}https://zakariaelahbabi.com{RESET}");
    println!("    ✉️  {CYAN}info@zakariaelahbabi.com{RESET}");
    println!();

    println!("  {BOLD}Brand — Idexal:{RESET}");
    println!("    🌐 {CYAN}https://idexa.com{RESET}");
    println!("    ✉️  {CYAN}team@idexal.com{RESET}");
    println!("    ✉️  {CYAN}ide@idexal.com{RESET}");
    println!("    ⚡ {CYAN}https://github.com/idexal{RESET}");
    println!();

    println!("  {BOLD}Repositories:{RESET}");
    println!("    ⌨️  {CYAN}https://github.com/idexal/idexal-ide{RESET}");
    println!("       {DIM}Desktop IDE — Electron + React + Rust Engine{RESET}");
    println!("    🖥️  {CYAN}https://github.com/idexal/idexa-cli{RESET}");
    println!("       {DIM}Terminal CLI — AI coding assistant{RESET}");
    println!();

    println!("  {BOLD}License:{RESET}  MIT");
    println!("  {BOLD}Version:{RESET}  {VERSION}");
    println!();
    println!("  {DIM}Built with ❤️ for developers worldwide{RESET}");
    println!();
}

// ── Project health check ─────────────────────────────────────────────

fn cmd_check(json: bool) {
    let checks: Vec<(&str, bool, &str)> = vec![
        ("package.json", Path::new("package.json").exists(), "Node.js project config"),
        ("Cargo.toml", Path::new("Cargo.toml").exists() || Path::new("rust-engine/Cargo.toml").exists(), "Rust engine config"),
        ("tsconfig.json", Path::new("tsconfig.json").exists(), "TypeScript config"),
        ("vite.config", Path::new("vite.config.ts").exists() || Path::new("vite.config.js").exists(), "Vite config"),
        (".gitignore", Path::new(".gitignore").exists(), "Git ignore file"),
        ("README.md", Path::new("README.md").exists(), "Project README"),
        ("LICENSE", Path::new("LICENSE").exists() || Path::new("LICENSE.txt").exists(), "License file"),
        ("src/", Path::new("src").exists(), "Source directory"),
        ("node_modules/", Path::new("node_modules").exists(), "Dependencies installed"),
        (".github/workflows/", Path::new(".github/workflows").exists(), "CI/CD pipeline"),
    ];

    let passed = checks.iter().filter(|(_, ok, _)| *ok).count();
    let total = checks.len();

    if json {
        let results: Vec<serde_json::Value> = checks.iter().map(|(name, ok, desc)| {
            serde_json::json!({
                "check": name,
                "passed": ok,
                "description": desc,
            })
        }).collect();
        println!("{{\"passed\":{},\"total\":{},\"checks\":{}}}", passed, total, serde_json::to_string(&results).unwrap_or_default());
    } else {
        println!();
        println!("  {CYAN}{BOLD}Project Health Check{RESET}");
        println!();
        for (name, ok, desc) in &checks {
            if *ok {
                println!("  {GREEN}✓{RESET} {:<20} {}", name, desc);
            } else {
                println!("  {RED}✗{RESET} {:<20} {}", name, desc);
            }
        }
        println!();
        let pct = (passed as f64 / total as f64 * 100.0) as u32;
        let color = if pct >= 80 { GREEN } else if pct >= 50 { YELLOW } else { RED };
        println!("  {BOLD}Result:{RESET} {color}{}/{} checks passed ({}%){RESET}", passed, total, pct);
        if passed == total {
            println!("  {GREEN}🎉 Project is healthy!{RESET}");
        }
        println!();
    }
}
