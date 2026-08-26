//! Integration tests for the idexal CLI binary.
//!
//! These tests exercise the CLI as a black box, verifying output format
//! and exit behavior without inspecting internal state.

use std::process::Command;

fn idexal() -> Command {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_idexal"));
    cmd.current_dir(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap());
    cmd
}

#[test]
fn version_outputs_json_with_flag() {
    let output = idexal().args(["version", "--json"]).output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let v: serde_json::Value = serde_json::from_str(&stdout).unwrap();
    assert!(v["version"].as_str().is_some());
}

#[test]
fn help_outputs_all_commands() {
    let output = idexal().arg("help").output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    // Core commands must appear
    for cmd in ["chat", "analyze", "search", "stats", "check", "tree", "serve"] {
        assert!(stdout.contains(cmd), "help should mention '{cmd}'");
    }
}

#[test]
fn stats_json_has_required_fields() {
    let output = idexal().args(["stats", "--json"]).output().unwrap();
    assert!(output.status.success());
    let v: serde_json::Value = serde_json::from_str(&String::from_utf8_lossy(&output.stdout)).unwrap();
    assert!(v["name"].as_str().is_some());
    assert!(v["files"].as_u64().is_some());
    assert!(v["symbols"].as_u64().is_some());
}

#[test]
fn analyze_outputs_project_name() {
    let output = idexal().arg("analyze").output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Project:"));
}

#[test]
fn check_returns_health_percentage() {
    let output = idexal().arg("check").output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("checks passed"));
}

#[test]
fn check_json_has_passed_total() {
    let output = idexal().args(["check", "--json"]).output().unwrap();
    assert!(output.status.success());
    let v: serde_json::Value = serde_json::from_str(&String::from_utf8_lossy(&output.stdout)).unwrap();
    assert!(v["passed"].as_u64().is_some());
    assert!(v["total"].as_u64().is_some());
    assert!(v["checks"].as_array().is_some());
}

#[test]
fn tree_depth_limit_works() {
    let output = idexal().args(["tree", "--depth=0"]).output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    // depth=0 means only root
    assert!(!stdout.contains("├──"), "depth=0 should not show children");
}

#[test]
fn whoami_shows_system_info() {
    let output = idexal().arg("whoami").output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("System Info"));
    assert!(stdout.contains("OS:"));
    assert!(stdout.contains("Arch:"));
}

#[test]
fn unknown_command_exits_nonzero() {
    let output = idexal().arg("nonexistent-command").output().unwrap();
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("unknown command"));
}

#[test]
fn bench_outputs_timing() {
    let output = idexal().args(["bench", "--iterations=10"]).output().unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Benchmark") || stdout.contains("ms"));
}
