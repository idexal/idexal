// Idexal Core — agent tools
//
// Ported from reference/ai-core-node-reference/src/tools/tools.ts. Same
// boundary-aware path check (root + separator, not a naive prefix match) so
// a sibling directory like `../proj-evil/x` cannot escape a root named
// `proj` just because the string starts with "proj".

use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

const MAX_OUTPUT: usize = 20_000;

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
