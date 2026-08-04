// Idexal Core — agent tools
//
// Ported from reference/ai-core-node-reference/src/tools/tools.ts. Same
// boundary-aware path check (root + separator, not a naive prefix match) so
// a sibling directory like `../proj-evil/x` cannot escape a root named
// `proj` just because the string starts with "proj".

use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::Duration;
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
            description: "Run any shell command in the workspace and return its combined stdout/stderr. This is a real shell on the user's machine: build tools, package managers, git, scripts, and launching applications (a browser, an editor, a dev server) are all in scope — not only commands that print text.".into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "The shell command to execute" },
                    "background": {
                        "type": "boolean",
                        "description": "Start it and return at once, without waiting or capturing output. Required for anything that does not exit on its own: a GUI application, a dev server, a watcher. Waiting on those never returns."
                    },
                    "timeoutSeconds": {
                        "type": "integer",
                        "description": "How long to wait before killing it (default 120, max 900). Raise it for a long build or test suite."
                    }
                },
                "required": ["command"]
            }),
        },
        ToolDefinition {
            name: "delegate".into(),
            description: "Hand a self-contained sub-task to a subagent that runs its own tool loop and returns a summary. Use for work that needs several steps of its own — not for a single tool call you could make yourself.".into(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "task": { "type": "string", "description": "The precise sub-task for the subagent" },
                    "context": { "type": "string", "description": "Short relevant context: paths already found, decisions already made" }
                },
                "required": ["task"]
            }),
        },
    ]
}

/// Name of the delegation tool. It is deliberately NOT executed by
/// `dispatch`: delegation re-enters the async agent loop, which a
/// synchronous dispatcher cannot do. `agent::run` intercepts it first.
pub const DELEGATE: &str = "delegate";

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
            // Models are inconsistent about JSON key casing, and a missed
            // `background` here means a hang rather than a wrong answer.
            let background = args
                .get("background")
                .or_else(|| args.get("detached"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let timeout = args
                .get("timeoutSeconds")
                .or_else(|| args.get("timeout_seconds"))
                .and_then(|v| v.as_u64());
            run_command(cwd, &c, background, timeout)
        }
        // Guard rail: if delegation ever reaches the synchronous dispatcher
        // it means the agent loop failed to intercept it. Fail loudly with
        // an actionable message instead of silently reporting "unknown
        // tool", which would send the model chasing a phantom.
        DELEGATE => ToolResult {
            ok: false,
            output: "delegate is handled by the agent loop, not the tool dispatcher — this is a bug".into(),
        },
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
    // Best-effort: a workspace we cannot snapshot into (read-only, full
    // disk) must not block the edit — that would make the agent useless
    // for the sake of an undo the user may never invoke.
    let _ = crate::checkpoint::take(cwd, rel);
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

    // Snapshot only once the edit is known to be valid: refusing an
    // ambiguous or stale edit leaves the file untouched, so a snapshot
    // there would be noise in the undo history.
    let _ = crate::checkpoint::take(cwd, rel);

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
/// Tell the model which machine it is actually driving.
///
/// Without this it guesses, and the guess is Unix: on Windows, "open a
/// browser" produced `google-chrome &` — a command that exists on neither
/// this shell nor this OS. It lives here, next to run_command, because it
/// describes that tool's environment and both the single agent and the
/// orchestrator's executors need it.
pub fn platform_note(cwd: &Path) -> String {
    let (os, shell_name, hint) = if cfg!(target_os = "windows") {
        (
            "Windows",
            "cmd.exe",
            "Use Windows commands: `dir`, `type`, `where`, `start \"\" <app>`, `taskkill`. \
             Paths use backslashes. `&&` chains commands, but a trailing `&` does NOT put one \
             in the background — pass \"background\": true instead.",
        )
    } else if cfg!(target_os = "macos") {
        ("macOS", "sh", "Use POSIX commands. `open -a <app>` launches an application.")
    } else {
        ("Linux", "sh", "Use POSIX commands. `xdg-open <target>` launches the default application.")
    };
    format!("\n\nEnvironment: {os}, shell {shell_name}, workspace {}.\n{hint}", cwd.display())
}

/// How long a foreground command may run before it is killed. Long enough
/// for a real build or test suite, short enough that a hung command costs
/// minutes rather than the whole session.
const DEFAULT_TIMEOUT_SECS: u64 = 120;
const MAX_TIMEOUT_SECS: u64 = 900;

fn shell(command: &str) -> Command {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", command]);
        c
    };
    cmd.stdin(Stdio::null());
    cmd
}

/// Kill a process **and everything it started**. Killing only the shell
/// leaves its children running and, worse, still holding the pipes this
/// tool is waiting on.
fn kill_tree(pid: u32) {
    if cfg!(target_os = "windows") {
        let _ = Command::new("taskkill").args(["/PID", &pid.to_string(), "/T", "/F"]).output();
    } else {
        let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
    }
}

/// Start a command and return immediately, without waiting for it.
///
/// This exists because waiting is not merely slow for some commands, it
/// never ends: `.output()` waits for the pipes to close, and a launched GUI
/// app or dev server inherits those pipes and holds them open for as long
/// as it lives. Launching a browser used to hang the agent until the
/// browser was closed. Detaching the stdio is what actually fixes it —
/// there is nothing left to inherit.
fn run_detached(cwd: &Path, command: &str) -> ToolResult {
    let mut child = match shell(command)
        .current_dir(cwd)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => return ToolResult { ok: false, output: format!("run_command failed to spawn: {e}") },
    };
    let pid = child.id();

    // Spawning succeeds even when the command does not exist — the shell
    // starts, then fails. Reporting that as "started" is worse than useless:
    // the model goes on believing the browser opened. A short grace period
    // catches the immediate failures without delaying anything real.
    std::thread::sleep(Duration::from_millis(400));
    match child.try_wait() {
        Ok(Some(status)) if !status.success() => ToolResult {
            ok: false,
            output: format!(
                "Command exited immediately with {status}: {command}\n\
                 Output was not captured because it ran in the background. \
                 The command may not exist on this system — check the name, \
                 or run it in the foreground to see the error."
            ),
        },
        Ok(Some(_)) => ToolResult { ok: true, output: format!("Ran and exited cleanly: {command}") },
        _ => ToolResult {
            ok: true,
            output: format!(
                "Started in the background (pid {pid}) and still running. \
                 Output is not captured; run it in the foreground if you need to read it."
            ),
        },
    }
}

pub fn run_command(cwd: &Path, command: &str, background: bool, timeout_secs: Option<u64>) -> ToolResult {
    if background {
        return run_detached(cwd, command);
    }
    let limit = Duration::from_secs(timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS).min(MAX_TIMEOUT_SECS));

    let child = match shell(command).current_dir(cwd).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn() {
        Ok(c) => c,
        Err(e) => return ToolResult { ok: false, output: format!("run_command failed to spawn: {e}") },
    };
    // The pid is captured before the child moves into the waiting thread:
    // on timeout it is the only handle left to kill the tree with.
    let pid = child.id();

    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(child.wait_with_output());
    });

    match rx.recv_timeout(limit) {
        Ok(Ok(out)) => {
            let mut combined = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr);
            if !stderr.is_empty() {
                combined.push_str("\n--- stderr ---\n");
                combined.push_str(&stderr);
            }
            ToolResult { ok: out.status.success(), output: truncate_output(combined) }
        }
        Ok(Err(e)) => ToolResult { ok: false, output: format!("run_command failed: {e}") },
        Err(_) => {
            kill_tree(pid);
            ToolResult {
                ok: false,
                output: format!(
                    "Command timed out after {}s and was killed: {command}\n\
                     If it is meant to keep running (a server, a watcher, a GUI app), \
                     call run_command again with \"background\": true.",
                    limit.as_secs()
                ),
            }
        }
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
    fn a_command_that_never_finishes_is_killed_instead_of_hanging_the_agent() {
        // Before the timeout existed this blocked forever: `.output()` waits
        // for the pipes to close, so one `npm run dev` froze the whole turn.
        let tmp = env::temp_dir();
        let sleeper = if cfg!(target_os = "windows") { "ping -t 127.0.0.1" } else { "sleep 600" };
        let started = std::time::Instant::now();
        let r = run_command(&tmp, sleeper, false, Some(2));
        assert!(!r.ok, "a killed command is a failure, not a silent success");
        assert!(r.output.contains("timed out"), "the model must be told why: {}", r.output);
        assert!(r.output.contains("background"), "and told the way out: {}", r.output);
        assert!(started.elapsed().as_secs() < 30, "took {:?}", started.elapsed());
    }

    #[test]
    fn a_background_command_returns_at_once_even_though_it_keeps_running() {
        // The real failure this guards: a launched GUI app inherits the
        // pipes and holds them open, so waiting never returns even though
        // the command itself "finished". Detached stdio is the fix — this
        // must come back immediately, not after the child dies.
        let tmp = env::temp_dir();
        let sleeper = if cfg!(target_os = "windows") { "ping -n 30 127.0.0.1" } else { "sleep 30" };
        let started = std::time::Instant::now();
        let r = run_command(&tmp, sleeper, true, None);
        assert!(r.ok, "{}", r.output);
        assert!(r.output.contains("pid"), "the pid is the only handle the user gets: {}", r.output);
        assert!(started.elapsed().as_secs() < 10, "took {:?}", started.elapsed());
    }

    #[test]
    fn a_background_command_that_does_not_exist_is_reported_as_a_failure() {
        // Spawning succeeds even for a nonexistent command — the shell
        // starts, then fails. Calling that "started" left the model
        // believing the browser had opened.
        let r = run_command(&env::temp_dir(), "definitely-not-a-real-command-xyz", true, None);
        assert!(!r.ok, "should not claim success: {}", r.output);
        assert!(r.output.contains("exited immediately"), "{}", r.output);
    }

    #[test]
    fn the_platform_note_names_this_machines_shell() {
        let note = platform_note(Path::new("/tmp/x"));
        let expected = if cfg!(target_os = "windows") { "cmd.exe" } else { "sh" };
        assert!(note.contains(expected), "{note}");
        assert!(note.contains("/tmp/x") || note.contains("\\tmp\\x"), "{note}");
    }

    #[test]
    fn a_normal_command_still_returns_its_output() {
        let r = run_command(&env::temp_dir(), "echo idexal-ok", false, None);
        assert!(r.ok, "{}", r.output);
        assert!(r.output.contains("idexal-ok"), "{}", r.output);
    }

    #[test]
    fn background_is_read_from_the_arguments_in_either_casing() {
        // A missed `background` flag is a hang, not a wrong answer, so both
        // spellings models actually emit are accepted.
        let tmp = env::temp_dir();
        let sleeper = if cfg!(target_os = "windows") { "ping -n 30 127.0.0.1" } else { "sleep 30" };
        for args in [
            format!(r#"{{"command":"{sleeper}","background":true}}"#),
            format!(r#"{{"command":"{sleeper}","detached":true}}"#),
        ] {
            let started = std::time::Instant::now();
            let r = dispatch(&tmp, "run_command", &args);
            assert!(r.ok, "{args} -> {}", r.output);
            assert!(started.elapsed().as_secs() < 10, "{args} took {:?}", started.elapsed());
        }
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
