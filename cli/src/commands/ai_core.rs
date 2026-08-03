/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//! Bridge from the Rust CLI to the Idexal AI Core (Node/TypeScript).
//!
//! The AI Core (`idexal/ai-core/src/cli.ts`) is a zero-dependency Node 22.6+
//! engine: multi-provider with automatic fallback, custom providers, long-term
//! memory, and multi-agent orchestration. This module maps `idexal run`,
//! `idexal ai`, and the bare `idexal agent` command onto that engine by
//! locating the Node binary and the AI Core entrypoint, then spawning them
//! with inherited stdio so the experience is indistinguishable from a native
//! command.
//!
//! ## Binding map (Rust → Node)
//!
//! ```text
//! idexal run "<task>"           →  node <ai-core>/src/cli.ts run "<task>"
//! idexal agent                  →  node <ai-core>/src/cli.ts agent
//! idexal ai providers           →  node <ai-core>/src/cli.ts providers
//! idexal ai list-providers      →  node <ai-core>/src/cli.ts list-providers  (alias of providers; --json = machine-readable)
//! idexal ai memory              →  node <ai-core>/src/cli.ts memory
//! idexal ai config              →  node <ai-core>/src/cli.ts config
//! idexal ai usage               →  node <ai-core>/src/cli.ts usage  (per-provider cost report)
//! idexal ai add-provider        →  node <ai-core>/src/cli.ts add-provider  (interactive wizard)
//! idexal ai edit-provider <id>  →  node <ai-core>/src/cli.ts edit-provider <id>  (wizard pre-filled from config)
//! idexal ai remove-provider <id>→  node <ai-core>/src/cli.ts remove-provider <id>  (safe delete with confirmation)
//! idexal ai setup               →  node <ai-core>/src/cli.ts setup  (first-run provider probe + config)
//! idexal ai compat              →  node <ai-core>/src/cli.ts compat  (Claude Code interop status)
//! idexal ai compat migrate      →  node <ai-core>/src/cli.ts compat migrate  (import ~/.claude memory)
//! idexal ai help                →  node <ai-core>/src/cli.ts help
//! ```
//!
//! The AI Core is also published as a global `idexal-ai` command (npm bin
//! in idexal/ai-core/package.json → bin/idexal-ai.js launcher).
//!
//! Resolution order for the AI Core entrypoint:
//!   1. `$IDEXAL_AI_CORE` — absolute path to `cli.ts` or its directory.
//!   2. `<repo-root>/idexal/ai-core/src/cli.ts`, discovered relative to the
//!      current working directory (walking up).
//!   3. Same path relative to the current executable (works when the CLI is
//!      invoked from inside the checkout).
//!
//! Resolution for Node:
//!   1. `$IDEXAL_NODE` — absolute path to a Node binary.
//!   2. `node` (or `node.exe` on Windows) resolved from `$PATH`.
//!
//! Inside tasks, agents can also drive real long-running commands through
//! the Agent Terminal: `terminal_start` / `terminal_output` / `terminal_send`
//! / `terminal_stop` tools spawn background processes (dev servers, watchers),
//! stream their live output as NDJSON, accept interactive input, and are
//! killed automatically when a task ends.

use std::path::{Path, PathBuf};
use std::process::Stdio;

use tokio::process::Command;

use crate::constants::APPLICATION_NAME;
use crate::util::errors::{wrap, AnyError};

use super::args::{AiArgs, RunArgs};
use super::CommandContext;

/// Repo-relative path of the AI Core CLI entrypoint.
const AI_CORE_RELATIVE: &str = "idexal/ai-core/src/cli.ts";

/// Env var override pointing at the AI Core `cli.ts` (or its parent dir).
const ENV_AI_CORE: &str = "IDEXAL_AI_CORE";
/// Env var override pointing at the Node binary to use.
const ENV_NODE: &str = "IDEXAL_NODE";

/// Executes `idexal run "<task>"` by spawning the AI Core with the `run`
/// subcommand. The task words are joined with spaces so both
/// `idexal run "one two"` and `idexal run one two` behave the same.
pub async fn run(ctx: CommandContext, args: RunArgs) -> Result<i32, AnyError> {
	let task = args.task.join(" ");
	if task.trim().is_empty() {
		ctx.log.result(format!(
			"Usage: {APPLICATION_NAME} run \"<task>\"  (e.g. `{APPLICATION_NAME} run \"refactor the build\"`)"
		));
		return Ok(1);
	}

	let node = resolve_node()?;
	let cli = resolve_ai_core_cli()?;
	debug!(ctx.log, "spawning AI Core: {} {} run {:?}", node.display(), cli.display(), task);

	spawn_ai_core(&node, &cli, &["run", task.as_str()]).await
}

/// Executes the bare `idexal agent` command (no subcommand) by launching the
/// interactive AI Core agent session. Note: `idexal agent host/ps/stop/kill/logs`
/// keep their existing AHP meaning — only the bare invocation is remapped.
pub async fn agent(ctx: CommandContext) -> Result<i32, AnyError> {
	let node = resolve_node()?;
	let cli = resolve_ai_core_cli()?;
	debug!(ctx.log, "spawning AI Core: {} {} agent", node.display(), cli.display());

	spawn_ai_core(&node, &cli, &["agent"]).await
}

/// Executes `idexal ai <subcommand...>` as a pass-through to the AI Core's
/// subcommands (providers, memory, config, help).
pub async fn ai(ctx: CommandContext, args: AiArgs) -> Result<i32, AnyError> {
	let node = resolve_node()?;
	let cli = resolve_ai_core_cli()?;
	debug!(
		ctx.log,
		"spawning AI Core: {} {} {}",
		node.display(),
		cli.display(),
		args.args.join(" ")
	);

	let argv: Vec<&str> = args.args.iter().map(String::as_str).collect();
	if argv.is_empty() {
		ctx.log.result(format!(
			"Usage: {APPLICATION_NAME} ai <providers|list-providers|memory|config|usage|add-provider|edit-provider|remove-provider|setup|compat|help>"
		));
		return Ok(1);
	}

	spawn_ai_core(&node, &cli, &argv).await
}

/// Spawns `node <cli> <args...>` with inherited stdio and returns the child's
/// exit code. stdin is inherited so interactive sessions (readline) work.
async fn spawn_ai_core(node: &Path, cli: &Path, args: &[&str]) -> Result<i32, AnyError> {
	let mut cmd = Command::new(node);
	cmd.arg(cli);
	cmd.args(args);
	cmd.stdin(Stdio::inherit());
	cmd.stdout(Stdio::inherit());
	cmd.stderr(Stdio::inherit());

	let status = cmd
		.status()
		.await
		.map_err(|e| wrap(e, format!("failed to spawn {} (is Node.js installed?)", node.display())))?;

	Ok(status.code().unwrap_or(1))
}

/// Resolves the Node binary: `$IDEXAL_NODE` first, then `node`/`node.exe` on
/// `$PATH`.
fn resolve_node() -> Result<PathBuf, AnyError> {
	if let Some(p) = std::env::var_os(ENV_NODE) {
		let path = PathBuf::from(p);
		if path.is_file() {
			return Ok(path);
		}
		return Err(wrap(
			format!("{ENV_NODE} is set but does not point to a file: {}", path.display()),
			"invalid Node override",
		));
	}

	let bin = if cfg!(windows) { "node.exe" } else { "node" };
	if let Some(paths) = std::env::var_os("PATH") {
		for dir in std::env::split_paths(&paths) {
			let candidate = dir.join(bin);
			if candidate.is_file() {
				return Ok(candidate);
			}
		}
	}

	Err(wrap(
		"Node.js >= 22.6 is required to run the Idexal AI Core. Install it or set IDEXAL_NODE.",
		"Node not found",
	))
}

/// Resolves the AI Core entrypoint `cli.ts`. Order: `$IDEXAL_AI_CORE`, then
/// walk up from the cwd, then walk up from the current executable.
fn resolve_ai_core_cli() -> Result<PathBuf, AnyError> {
	if let Some(p) = std::env::var_os(ENV_AI_CORE) {
		let path = PathBuf::from(p);
		if path.is_file() {
			return Ok(path);
		}
		let in_dir = path.join(AI_CORE_RELATIVE);
		if in_dir.is_file() {
			return Ok(in_dir);
		}
		return Err(wrap(
			format!(
				"{ENV_AI_CORE} is set but neither {} nor {} exists",
				path.display(),
				in_dir.display()
			),
			"invalid AI Core override",
		));
	}

	if let Ok(cwd) = std::env::current_dir() {
		if let Some(found) = search_upward(&cwd) {
			return Ok(found);
		}
	}

	if let Ok(exe) = std::env::current_exe() {
		if let Some(dir) = exe.parent() {
			if let Some(found) = search_upward(dir) {
				return Ok(found);
			}
		}
	}

	Err(wrap(
		format!(
			"Could not find the Idexal AI Core ({AI_CORE_RELATIVE}). Run from the repo checkout or set {ENV_AI_CORE}."
		),
		"AI Core not found",
	))
}

/// Walks up from `start` looking for `<start>/idexal/ai-core/src/cli.ts`.
fn search_upward(start: &Path) -> Option<PathBuf> {
	let mut dir = Some(start);
	while let Some(d) = dir {
		let candidate = d.join(AI_CORE_RELATIVE);
		if candidate.is_file() {
			return Some(candidate);
		}
		dir = d.parent();
	}
	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;

	#[test]
	fn search_upward_finds_entrypoint_in_repo_layout() {
		let dir = tempfile::tempdir().unwrap();
		let cli = dir.path().join(AI_CORE_RELATIVE);
		fs::create_dir_all(cli.parent().unwrap()).unwrap();
		fs::write(&cli, "#!/usr/bin/env node\n").unwrap();

		// Walking up from a deeply nested cwd finds the entrypoint.
		let nested = dir.path().join("a").join("b").join("c");
		fs::create_dir_all(&nested).unwrap();
		let found = search_upward(&nested).expect("should find cli.ts");
		assert_eq!(found, cli);

		// Walking up from a sibling directory does not find it.
		let sibling = dir.path().join("other");
		fs::create_dir_all(&sibling).unwrap();
		assert!(search_upward(&sibling).is_none());
	}

	#[test]
	fn search_upward_returns_none_when_absent() {
		let dir = tempfile::tempdir().unwrap();
		assert!(search_upward(dir.path()).is_none());
	}

	#[test]
	fn resolve_ai_core_cli_honors_env_override_file() {
		let dir = tempfile::tempdir().unwrap();
		let custom = dir.path().join("custom-cli.ts");
		fs::write(&custom, "#!/usr/bin/env node\n").unwrap();

		unsafe {
			std::env::set_var(ENV_AI_CORE, &custom);
		}
		let resolved = resolve_ai_core_cli().expect("should resolve from env file");
		assert_eq!(resolved, custom);
	}

	#[test]
	fn resolve_ai_core_cli_honors_env_override_dir() {
		let dir = tempfile::tempdir().unwrap();
		let cli = dir.path().join(AI_CORE_RELATIVE);
		fs::create_dir_all(cli.parent().unwrap()).unwrap();
		fs::write(&cli, "#!/usr/bin/env node\n").unwrap();

		unsafe {
			std::env::set_var(ENV_AI_CORE, dir.path());
		}
		let resolved = resolve_ai_core_cli().expect("should resolve from env dir");
		assert_eq!(resolved, cli);
	}

	#[test]
	fn resolve_ai_core_cli_rejects_bad_override() {
		let dir = tempfile::tempdir().unwrap();
		unsafe {
			std::env::set_var(ENV_AI_CORE, dir.path().join("missing"));
		}
		assert!(resolve_ai_core_cli().is_err());
	}

	#[test]
	fn resolve_node_honors_env_override() {
		let dir = tempfile::tempdir().unwrap();
		let fake = dir.path().join("fake-node");
		fs::write(&fake, "").unwrap();

		unsafe {
			std::env::set_var(ENV_NODE, &fake);
		}
		let resolved = resolve_node().expect("should resolve from env");
		assert_eq!(resolved, fake);

		unsafe {
			std::env::set_var(ENV_NODE, dir.path().join("nope"));
		}
		assert!(resolve_node().is_err());
	}
}
