// Idexal Core — agent tools
//
// Ported from reference/ai-core-node-reference/src/tools/tools.ts. Same
// boundary-aware path check (root + separator, not a naive prefix match) so
// a sibling directory like `../proj-evil/x` cannot escape a root named
// `proj` just because the string starts with "proj".

use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

const MAX_OUTPUT: usize = 20_000;

/// Directories never worth walking: huge, generated, and never what the
/// agent is looking for.
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "out", "build", ".next",
    ".cache", "vendor", "__pycache__", ".venv", "venv",
];

/// Files larger than this are skipped when searching: they're almost
/// always build output or binaries, and reading them would blow the
/// time budget for no benefit.
const MAX_SEARCH_FILE_BYTES: u64 = 1_500_000;

/// Cap on how much a single search returns, so one broad pattern can't
/// flood the model's context.
const MAX_MATCHES: usize = 200;

fn truncate_output(s: String) -> String {
    if s.len() <= MAX_OUTPUT {
        s
    } else {
        let cut = s.len() - MAX_OUTPUT;
        format!("{}\n… [truncated {cut} chars]", &s[..MAX_OUTPUT])
    }
}

/// Resolve `rel` against `cwd` and verify the result stays inside `cwd`.
/// Returns `None` if it escapes.
pub fn resolve_inside_root(cwd: &Path, rel: &str) -> Option<PathBuf> {
    let root = dunce_canonicalize_best_effort(cwd);
    let candidate = root.join(rel);
    let abs = dunce_canonicalize_best_effort(&candidate);
    let sep_prefixed = {
        let mut r = root.clone();
        r.push(""); // ensures a trailing separator when displayed/compared
        r
    };
    if abs == root || abs.starts_with(&sep_prefixed) {
        Some(candidate)
    } else {
        None
    }
}

/// `fs::canonicalize` requires the path to exist; fall back to a plain
/// `absolute`-style join for paths that don't exist yet (e.g. a file the
/// agent is about to create with write_file).
fn dunce_canonicalize_best_effort(p: &Path) -> PathBuf {
    fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf())
}

pub struct ToolResult {
    pub ok: bool,
    pub output: String,
}

/// JSON-Schema definitions advertised to the model. Kept next to the
/// handlers so a tool can never be advertised without an implementation.
pub fn definitions() -> Vec<crate::providers::types::ToolDefinition> {
    use crate::providers::types::ToolDefinition;
    use serde_json::json;
    vec![
        ToolDefinition {
            name: "read_file".into(),
            description: "Read a UTF-8 text file from the workspace and return its contents.".into(),
            input_schema: json!({
                "type": "object",
                "properties": { "path": { "type": "string", "description": "Path relative to the workspace root" } },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "write_file".into(),
            description: "Create or overwrite a file in the workspace with the given content.".into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Path relative to the workspace root" },
                    "content": { "type": "string", "description": "Full file content" }
                },
                "required": ["path", "content"]
            }),
        },
        ToolDefinition {
            name: "list_dir".into(),
            description: "List the entries of a directory in the workspace. Directories end with '/'.".into(),
            input_schema: json!({
                "type": "object",
                "properties": { "path": { "type": "string", "description": "Directory path relative to the workspace root; use '.' for the root" } },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "edit_file".into(),
            description: "Replace an exact string in a file. Prefer this over write_file for changes to existing files — it edits in place instead of rewriting the whole file. The 'old' string must appear exactly once; include surrounding context to make it unique.".into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Path relative to the workspace root" },
                    "old": { "type": "string", "description": "Exact text to replace — must match once, whitespace included" },
                    "new": { "type": "string", "description": "Replacement text" }
                },
                "required": ["path", "old", "new"]
            }),
        },
        ToolDefinition {
            name: "search_files".into(),
            description: "Search file contents by regular expression across the workspace. Returns path:line: text. Use this to find code before reading or editing it.".into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "pattern": { "type": "string", "description": "Regular expression to search for" },
                    "glob": { "type": "string", "description": "Optional path filter, e.g. '*.rs' or 'src/'" }
                },
                "required": ["pattern"]
            }),
        },
        ToolDefinition {
            name: "find_files".into(),
            description: "Find files whose path contains the given text (or extension, e.g. '*.rs'). Cheaper than search_files when you only need to locate a file.".into(),
            input_schema: json!({
                "type": "object",
                "properties": { "pattern": { "type": "string", "description": "Substring or extension to match in the path" } },
                "required": ["pattern"]
            }),
        },
        ToolDefinition {
            name: "run_command".into(),
            description: "Run a shell command in the workspace and return its combined stdout/stderr.".into(),
            input_schema: json!({
                "type": "object",
                "properties": { "command": { "type": "string", "description": "The shell command to execute" } },
                "required": ["command"]
            }),
        },
    ]
}

/// Read-only subset, used by review-style runs where the agent must not
/// modify anything. Mirrors the reference implementation's readOnlyTools().
pub fn read_only_definitions() -> Vec<crate::providers::types::ToolDefinition> {
    definitions()
        .into_iter()
        .filter(|d| matches!(d.name.as_str(), "read_file" | "list_dir" | "search_files" | "find_files"))
        .collect()
}

/// Execute a tool call by name with JSON-encoded arguments.
pub fn dispatch(cwd: &Path, name: &str, arguments: &str) -> ToolResult {
    let args: serde_json::Value = serde_json::from_str(arguments).unwrap_or(serde_json::Value::Null);
    let get = |key: &str| -> String {
        args.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string()
    };

    match name {
        "read_file" => {
            let p = get("path");
            if p.is_empty() {
                return ToolResult { ok: false, output: "read_file requires 'path'".into() };
            }
            read_file(cwd, &p)
        }
        "write_file" => {
            let p = get("path");
            if p.is_empty() {
                return ToolResult { ok: false, output: "write_file requires 'path'".into() };
            }
            write_file(cwd, &p, &get("content"))
        }
        "list_dir" => {
            let p = get("path");
            list_dir(cwd, if p.is_empty() { "." } else { &p })
        }
        "edit_file" => {
            let p = get("path");
            if p.is_empty() {
                return ToolResult { ok: false, output: "edit_file requires 'path'".into() };
            }
            edit_file(cwd, &p, &get("old"), &get("new"))
        }
        "search_files" => {
            let pattern = get("pattern");
            if pattern.is_empty() {
                return ToolResult { ok: false, output: "search_files requires 'pattern'".into() };
            }
            let glob = get("glob");
            search_files(cwd, &pattern, if glob.is_empty() { None } else { Some(glob.as_str()) })
        }
        "find_files" => {
            let pattern = get("pattern");
            if pattern.is_empty() {
                return ToolResult { ok: false, output: "find_files requires 'pattern'".into() };
            }
            find_files(cwd, &pattern)
        }
        "run_command" => {
            let c = get("command");
            if c.is_empty() {
                return ToolResult { ok: false, output: "run_command requires 'command'".into() };
            }
            run_command(cwd, &c)
        }
        other => ToolResult { ok: false, output: format!("unknown tool: {other}") },
    }
}

fn escaped(rel: &str) -> ToolResult {
    ToolResult { ok: false, output: format!("Path escapes workspace: {rel}") }
}

pub fn read_file(cwd: &Path, rel: &str) -> ToolResult {
    let Some(abs) = resolve_inside_root(cwd, rel) else { return escaped(rel) };
    match fs::read_to_string(&abs) {
        Ok(content) => ToolResult { ok: true, output: truncate_output(content) },
        Err(e) => ToolResult { ok: false, output: format!("read_file failed: {e}") },
    }
}

pub fn write_file(cwd: &Path, rel: &str, content: &str) -> ToolResult {
    let Some(abs) = resolve_inside_root(cwd, rel) else { return escaped(rel) };
    if let Some(parent) = abs.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return ToolResult { ok: false, output: format!("write_file failed (mkdir): {e}") };
        }
    }
    match fs::write(&abs, content) {
        Ok(()) => ToolResult { ok: true, output: format!("Wrote {} bytes to {rel}", content.len()) },
        Err(e) => ToolResult { ok: false, output: format!("write_file failed: {e}") },
    }
}

pub fn list_dir(cwd: &Path, rel: &str) -> ToolResult {
    let Some(abs) = resolve_inside_root(cwd, rel) else { return escaped(rel) };
    match fs::read_dir(&abs) {
        Ok(entries) => {
            let mut names: Vec<String> = Vec::new();
            for entry in entries.flatten() {
                let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                let name = entry.file_name().to_string_lossy().to_string();
                names.push(if is_dir { format!("{name}/") } else { name });
            }
            names.sort();
            ToolResult { ok: true, output: truncate_output(names.join("\n")) }
        }
        Err(e) => ToolResult { ok: false, output: format!("list_dir failed: {e}") },
    }
}

/// Should this directory entry be walked at all?
fn walkable(entry: &walkdir::DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    if entry.file_type().is_dir() {
        return !SKIP_DIRS.contains(&name.as_ref()) && !name.starts_with('.');
    }
    true
}

/// Search file contents by regular expression, returning `path:line: text`
/// hits. The workspace equivalent of grep — without it the agent has to
/// guess filenames, which is the single biggest quality gap versus a real
/// coding assistant.
pub fn search_files(cwd: &Path, pattern: &str, glob: Option<&str>) -> ToolResult {
    let re = match Regex::new(pattern) {
        Ok(r) => r,
        Err(e) => return ToolResult { ok: false, output: format!("invalid regex: {e}") },
    };
    // `glob` here is a simple extension/substring filter rather than full
    // glob syntax: it covers "*.rs" and "src/" style narrowing, which is
    // what models actually ask for, without a glob dependency.
    let filter = glob.map(|g| g.trim_start_matches('*').to_string());

    let mut out = String::new();
    let mut matches = 0usize;
    let mut truncated = false;

    for entry in WalkDir::new(cwd).into_iter().filter_entry(walkable).flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let rel = path.strip_prefix(cwd).unwrap_or(path).to_string_lossy().replace('\\', "/");
        if let Some(f) = &filter {
            if !rel.contains(f.as_str()) {
                continue;
            }
        }
        if entry.metadata().map(|m| m.len() > MAX_SEARCH_FILE_BYTES).unwrap_or(false) {
            continue;
        }
        // Binary files read as invalid UTF-8; skipping them silently is
        // right — the agent asked for text.
        let Ok(content) = fs::read_to_string(path) else { continue };
        for (i, line) in content.lines().enumerate() {
            if !re.is_match(line) {
                continue;
            }
            if matches >= MAX_MATCHES {
                truncated = true;
                break;
            }
            let shown = if line.len() > 240 { &line[..240] } else { line };
            out.push_str(&format!("{rel}:{}: {}\n", i + 1, shown.trim_end()));
            matches += 1;
        }
        if truncated {
            break;
        }
    }

    if matches == 0 {
        return ToolResult { ok: true, output: format!("no matches for /{pattern}/") };
    }
    if truncated {
        out.push_str(&format!("… stopped at {MAX_MATCHES} matches — narrow the pattern or pass a glob\n"));
    }
    ToolResult { ok: true, output: truncate_output(out) }
}

/// Find files whose path contains `pattern` (substring, or `*.ext`).
/// Cheaper than search_files when the agent only needs to locate a file.
pub fn find_files(cwd: &Path, pattern: &str) -> ToolResult {
    let needle = pattern.trim_start_matches('*');
    let mut hits: Vec<String> = Vec::new();
    for entry in WalkDir::new(cwd).into_iter().filter_entry(walkable).flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let rel = path.strip_prefix(cwd).unwrap_or(path).to_string_lossy().replace('\\', "/");
        if rel.contains(needle) {
            hits.push(rel);
            if hits.len() >= MAX_MATCHES {
                break;
            }
        }
    }
    if hits.is_empty() {
        return ToolResult { ok: true, output: format!("no files matching '{pattern}'") };
    }
    hits.sort();
    ToolResult { ok: true, output: truncate_output(hits.join("\n")) }
}

/// Replace an exact string in a file — a surgical edit rather than a whole
/// file rewrite.
///
/// `old` must appear EXACTLY once. Zero matches means the model's idea of
/// the file is stale; multiple matches mean the edit is ambiguous and
/// could hit the wrong site. Both are refused with an explanation the
/// model can act on, which is far safer than guessing — and far cheaper
/// than making it re-emit an entire file to change one line.
pub fn edit_file(cwd: &Path, rel: &str, old: &str, new: &str) -> ToolResult {
    let Some(abs) = resolve_inside_root(cwd, rel) else { return escaped(rel) };
    if old.is_empty() {
        return ToolResult { ok: false, output: "edit_file requires a non-empty 'old' string".into() };
    }
    if old == new {
        return ToolResult { ok: false, output: "'old' and 'new' are identical — nothing to do".into() };
    }
    let content = match fs::read_to_string(&abs) {
        Ok(c) => c,
        Err(e) => return ToolResult { ok: false, output: format!("edit_file failed to read {rel}: {e}") },
    };

    let count = content.matches(old).count();
    if count == 0 {
        return ToolResult {
            ok: false,
            output: format!("'old' not found in {rel} — read the file again; it may have changed"),
        };
    }
    if count > 1 {
        return ToolResult {
            ok: false,
            output: format!(
                "'old' appears {count} times in {rel} — include more surrounding context so it matches exactly once"
            ),
        };
    }

    let updated = content.replacen(old, new, 1);
    match fs::write(&abs, &updated) {
        Ok(()) => {
            let before = content.lines().count();
            let after = updated.lines().count();
            ToolResult {
                ok: true,
                output: format!("edited {rel} ({before} → {after} lines)"),
            }
        }
        Err(e) => ToolResult { ok: false, output: format!("edit_file failed to write {rel}: {e}") },
    }
}

/// Runs a shell command with the same trust model as Claude Code's Bash
/// tool: the model decides what to run, no allow/deny list. Intentional,
/// not an oversight — see reference/ai-core-node-reference/src/tools/tools.ts.
pub fn run_command(cwd: &Path, command: &str) -> ToolResult {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", command]).current_dir(cwd).output()
    } else {
        Command::new("sh").args(["-c", command]).current_dir(cwd).output()
    };
    match output {
        Ok(out) => {
            let mut combined = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr);
            if !stderr.is_empty() {
                combined.push_str("\n--- stderr ---\n");
                combined.push_str(&stderr);
            }
            ToolResult { ok: out.status.success(), output: truncate_output(combined) }
        }
        Err(e) => ToolResult { ok: false, output: format!("run_command failed to spawn: {e}") },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn sibling_prefix_bypass_is_blocked() {
        let tmp = env::temp_dir().join(format!("idexal-test-{}", std::process::id()));
        let root = tmp.join("proj");
        let evil = tmp.join("proj-evil");
        fs::create_dir_all(&root).unwrap();
        fs::create_dir_all(&evil).unwrap();
        fs::write(evil.join("secret.txt"), "leak").unwrap();

        // "../proj-evil/secret.txt" must NOT resolve inside "proj" just
        // because the string "proj-evil" starts with "proj".
        let result = resolve_inside_root(&root, "../proj-evil/secret.txt");
        assert!(result.is_none(), "sibling-prefix path must be rejected");

        fs::remove_dir_all(&tmp).ok();
    }

    #[test]
    fn plain_relative_path_is_allowed() {
        let tmp = env::temp_dir().join(format!("idexal-test2-{}", std::process::id()));
        fs::create_dir_all(&tmp).unwrap();
        let result = resolve_inside_root(&tmp, "sub/file.txt");
        assert!(result.is_some());
        fs::remove_dir_all(&tmp).ok();
    }

    fn scratch(tag: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("idexal-tools-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn edit_file_refuses_an_ambiguous_match() {
        // Two identical occurrences: editing either could be the wrong one,
        // so the tool must refuse rather than guess.
        let dir = scratch("ambiguous");
        fs::write(dir.join("a.rs"), "let x = 1;\nlet x = 1;\n").unwrap();
        let r = edit_file(&dir, "a.rs", "let x = 1;", "let x = 2;");
        assert!(!r.ok, "ambiguous edit must be refused");
        assert!(r.output.contains("2 times"), "message should say how many: {}", r.output);
        // And the file must be untouched.
        assert_eq!(fs::read_to_string(dir.join("a.rs")).unwrap(), "let x = 1;\nlet x = 1;\n");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn edit_file_refuses_a_stale_match() {
        let dir = scratch("stale");
        fs::write(dir.join("a.rs"), "fn main() {}\n").unwrap();
        let r = edit_file(&dir, "a.rs", "fn other() {}", "fn changed() {}");
        assert!(!r.ok);
        assert!(r.output.contains("not found"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn edit_file_applies_a_unique_match() {
        let dir = scratch("unique");
        fs::write(dir.join("a.rs"), "fn main() {\n    println!(\"old\");\n}\n").unwrap();
        let r = edit_file(&dir, "a.rs", "println!(\"old\")", "println!(\"new\")");
        assert!(r.ok, "{}", r.output);
        assert!(fs::read_to_string(dir.join("a.rs")).unwrap().contains("\"new\""));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn edit_file_cannot_escape_the_workspace() {
        let dir = scratch("escape");
        let r = edit_file(&dir, "../outside.txt", "a", "b");
        assert!(!r.ok);
        assert!(r.output.contains("escapes"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_files_finds_matches_with_line_numbers() {
        let dir = scratch("search");
        fs::write(dir.join("one.rs"), "fn alpha() {}\nfn beta() {}\n").unwrap();
        fs::write(dir.join("two.txt"), "alpha appears here too\n").unwrap();
        let r = search_files(&dir, r"fn \w+", None);
        assert!(r.ok);
        assert!(r.output.contains("one.rs:1:"), "expected line-numbered hit: {}", r.output);
        assert!(!r.output.contains("two.txt"), "regex should not match the txt file");
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_files_honours_the_glob_filter() {
        let dir = scratch("glob");
        fs::write(dir.join("keep.rs"), "target\n").unwrap();
        fs::write(dir.join("skip.md"), "target\n").unwrap();
        let r = search_files(&dir, "target", Some("*.rs"));
        assert!(r.output.contains("keep.rs"));
        assert!(!r.output.contains("skip.md"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_reports_an_invalid_regex_instead_of_panicking() {
        let dir = scratch("badre");
        let r = search_files(&dir, "([unclosed", None);
        assert!(!r.ok);
        assert!(r.output.contains("invalid regex"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn search_skips_generated_directories() {
        // Walking node_modules/target would dominate the time budget and
        // return matches the agent never wants.
        let dir = scratch("skipdirs");
        fs::create_dir_all(dir.join("node_modules")).unwrap();
        fs::write(dir.join("node_modules").join("dep.js"), "needle\n").unwrap();
        fs::write(dir.join("src.js"), "needle\n").unwrap();
        let r = search_files(&dir, "needle", None);
        assert!(r.output.contains("src.js"));
        assert!(!r.output.contains("node_modules"), "must not walk node_modules: {}", r.output);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn find_files_matches_by_extension() {
        let dir = scratch("find");
        fs::create_dir_all(dir.join("sub")).unwrap();
        fs::write(dir.join("sub").join("mod.rs"), "").unwrap();
        fs::write(dir.join("readme.md"), "").unwrap();
        let r = find_files(&dir, "*.rs");
        assert!(r.output.contains("sub/mod.rs"), "got: {}", r.output);
        assert!(!r.output.contains("readme.md"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn read_only_toolset_excludes_every_mutating_tool() {
        let names: Vec<String> = read_only_definitions().into_iter().map(|d| d.name).collect();
        for forbidden in ["write_file", "edit_file", "run_command"] {
            assert!(!names.contains(&forbidden.to_string()), "{forbidden} must not be offered read-only");
        }
        assert!(names.contains(&"search_files".to_string()), "review mode still needs search");
    }

    #[test]
    fn write_then_read_round_trip() {
        let tmp = env::temp_dir().join(format!("idexal-test3-{}", std::process::id()));
        fs::create_dir_all(&tmp).unwrap();
        let w = write_file(&tmp, "hello.txt", "hello idexal");
        assert!(w.ok, "{}", w.output);
        let r = read_file(&tmp, "hello.txt");
        assert!(r.ok);
        assert_eq!(r.output, "hello idexal");
        fs::remove_dir_all(&tmp).ok();
    }
}
