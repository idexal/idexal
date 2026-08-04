// Idexal Core — edit checkpoints
//
// An autonomous agent editing real files needs an undo that does not depend
// on the user having committed first. Before any tool writes to a file, the
// previous contents are snapshotted here; `restore` puts them back.
//
// Deliberately NOT git-based: the whole point is to work in a dirty tree,
// in a directory that may not be a repository at all, without touching the
// user's index or stash. Those are theirs, not ours.
//
// Snapshots live under `.idexal/checkpoints/` inside the workspace, so they
// travel with the project and a user can delete them with one folder.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Files larger than this are not snapshotted. Undo for a 10 MB generated
/// file is worth less than the disk and latency it costs on every edit.
const MAX_SNAPSHOT_BYTES: u64 = 2_000_000;

fn now_ms() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
}

fn checkpoint_dir(cwd: &Path) -> PathBuf {
    cwd.join(".idexal").join("checkpoints")
}

/// Encode a workspace-relative path as a single flat filename.
///
/// Separators become `%2F` and an existing `%` becomes `%25`, so the
/// encoding is unambiguous: without escaping the escape character, the
/// distinct paths `a/b` and `a%2Fb` would collide on one snapshot file and
/// restoring either would silently write the wrong content.
fn encode_path(rel: &str) -> String {
    let mut out = String::with_capacity(rel.len() + 8);
    for ch in rel.chars() {
        match ch {
            '%' => out.push_str("%25"),
            '/' | '\\' => out.push_str("%2F"),
            _ => out.push(ch),
        }
    }
    out
}

fn decode_path(encoded: &str) -> String {
    encoded.replace("%2F", "/").replace("%25", "%")
}

#[derive(Debug, Clone)]
pub struct Snapshot {
    /// Workspace-relative path of the file this snapshot restores.
    pub path: String,
    /// Milliseconds since the epoch.
    pub taken_at: u128,
    /// False when the file did not exist before the edit, so restoring
    /// means deleting it rather than writing content back.
    pub existed: bool,
}

/// Snapshot a file before it is modified.
///
/// Returns `Ok(None)` when no snapshot was taken for a legitimate reason
/// (file too large). Errors are for real failures the caller should know
/// about — but note the tools treat checkpointing as best-effort: failing
/// to snapshot must never block the edit itself, or a read-only
/// `.idexal` directory would make the agent useless.
pub fn take(cwd: &Path, rel: &str) -> Result<Option<Snapshot>, String> {
    let abs = cwd.join(rel);
    let existed = abs.is_file();

    if existed {
        let size = fs::metadata(&abs).map(|m| m.len()).unwrap_or(0);
        if size > MAX_SNAPSHOT_BYTES {
            return Ok(None);
        }
    }

    let dir = checkpoint_dir(cwd);
    fs::create_dir_all(&dir).map_err(|e| format!("cannot create checkpoint dir: {e}"))?;

    let taken_at = now_ms();
    let stem = format!("{taken_at}-{}", encode_path(rel));

    if existed {
        let content = fs::read(&abs).map_err(|e| format!("cannot read {rel}: {e}"))?;
        fs::write(dir.join(format!("{stem}.snap")), content)
            .map_err(|e| format!("cannot write snapshot: {e}"))?;
    } else {
        // A marker with no content: restoring a file that did not exist
        // means removing it, not writing an empty file.
        fs::write(dir.join(format!("{stem}.new")), b"")
            .map_err(|e| format!("cannot write snapshot marker: {e}"))?;
    }

    Ok(Some(Snapshot { path: rel.to_string(), taken_at, existed }))
}

/// Every snapshot in the workspace, newest first.
pub fn list(cwd: &Path) -> Vec<Snapshot> {
    let dir = checkpoint_dir(cwd);
    let Ok(entries) = fs::read_dir(&dir) else { return Vec::new() };

    let mut out: Vec<Snapshot> = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let (stem, existed) = if let Some(s) = name.strip_suffix(".snap") {
            (s, true)
        } else if let Some(s) = name.strip_suffix(".new") {
            (s, false)
        } else {
            continue;
        };
        // `<millis>-<encoded path>`; the path may itself contain '-', so
        // split only on the first one.
        let Some((ts, encoded)) = stem.split_once('-') else { continue };
        let Ok(taken_at) = ts.parse::<u128>() else { continue };
        out.push(Snapshot { path: decode_path(encoded), taken_at, existed });
    }
    out.sort_by(|a, b| b.taken_at.cmp(&a.taken_at));
    out
}

/// Restore the most recent snapshot of `rel`, or of every file when `rel`
/// is None. Returns the paths actually restored.
///
/// The snapshot is **consumed**. That is what makes repeated undo walk
/// backwards through a run instead of returning to the same state forever:
/// each call steps back one edit, like an editor's undo stack.
pub fn restore(cwd: &Path, rel: Option<&str>) -> Result<Vec<String>, String> {
    let dir = checkpoint_dir(cwd);
    let all = list(cwd);

    // Newest-first, so the first entry seen per path is the one to restore.
    let mut seen: Vec<String> = Vec::new();
    let mut restored: Vec<String> = Vec::new();

    for snap in all {
        if let Some(target) = rel {
            if snap.path != target {
                continue;
            }
        }
        if seen.contains(&snap.path) {
            continue;
        }
        seen.push(snap.path.clone());

        let abs = cwd.join(&snap.path);
        let stem = format!("{}-{}", snap.taken_at, encode_path(&snap.path));

        if snap.existed {
            let data = fs::read(dir.join(format!("{stem}.snap")))
                .map_err(|e| format!("cannot read snapshot for {}: {e}", snap.path))?;
            if let Some(parent) = abs.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("cannot recreate dir: {e}"))?;
            }
            fs::write(&abs, data).map_err(|e| format!("cannot restore {}: {e}", snap.path))?;
        } else if abs.exists() {
            // The file was created by the agent; undoing means removing it.
            fs::remove_file(&abs).map_err(|e| format!("cannot remove {}: {e}", snap.path))?;
        }

        // Consume the snapshot so the next undo steps further back rather
        // than restoring this same state again.
        let suffix = if snap.existed { "snap" } else { "new" };
        let _ = fs::remove_file(dir.join(format!("{stem}.{suffix}")));

        restored.push(snap.path.clone());
    }

    Ok(restored)
}

/// Delete every snapshot. Used once the user is satisfied with a run.
pub fn clear(cwd: &Path) -> Result<usize, String> {
    let dir = checkpoint_dir(cwd);
    let Ok(entries) = fs::read_dir(&dir) else { return Ok(0) };
    let mut removed = 0usize;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".snap") || name.ends_with(".new") {
            if fs::remove_file(entry.path()).is_ok() {
                removed += 1;
            }
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn scratch(tag: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("idexal-ckpt-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn restores_previous_contents_of_an_edited_file() {
        let dir = scratch("edit");
        fs::write(dir.join("a.txt"), "original").unwrap();

        take(&dir, "a.txt").unwrap();
        fs::write(dir.join("a.txt"), "agent overwrote this").unwrap();

        let restored = restore(&dir, Some("a.txt")).unwrap();
        assert_eq!(restored, vec!["a.txt".to_string()]);
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "original");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn restoring_a_file_the_agent_created_deletes_it() {
        // Writing an empty file back would leave litter behind and, worse,
        // could shadow something the build expects to be absent.
        let dir = scratch("created");
        take(&dir, "new.txt").unwrap();
        fs::write(dir.join("new.txt"), "agent made this").unwrap();

        restore(&dir, Some("new.txt")).unwrap();
        assert!(!dir.join("new.txt").exists(), "a created file must be removed, not blanked");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn repeated_undo_walks_back_through_successive_edits() {
        // Undo must behave like an editor's undo stack: each call steps
        // back one edit. If snapshots were not consumed, the second undo
        // would restore the same state as the first and the user could
        // never reach what they had before the run started.
        let dir = scratch("repeat");
        fs::write(dir.join("a.txt"), "v0").unwrap();

        take(&dir, "a.txt").unwrap();
        fs::write(dir.join("a.txt"), "v1").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(3));
        take(&dir, "a.txt").unwrap();
        fs::write(dir.join("a.txt"), "v2").unwrap();

        restore(&dir, Some("a.txt")).unwrap();
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "v1", "first undo → one step back");

        restore(&dir, Some("a.txt")).unwrap();
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "v0", "second undo → the pre-run state");

        // Nothing left to undo, and that is not an error.
        assert!(restore(&dir, Some("a.txt")).unwrap().is_empty());
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "v0");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn restore_all_covers_every_touched_file() {
        let dir = scratch("all");
        fs::write(dir.join("a.txt"), "A").unwrap();
        fs::write(dir.join("b.txt"), "B").unwrap();

        take(&dir, "a.txt").unwrap();
        take(&dir, "b.txt").unwrap();
        fs::write(dir.join("a.txt"), "broken").unwrap();
        fs::write(dir.join("b.txt"), "broken").unwrap();

        let restored = restore(&dir, None).unwrap();
        assert_eq!(restored.len(), 2);
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "A");
        assert_eq!(fs::read_to_string(dir.join("b.txt")).unwrap(), "B");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn nested_paths_survive_encoding() {
        let dir = scratch("nested");
        fs::create_dir_all(dir.join("src").join("deep")).unwrap();
        fs::write(dir.join("src/deep/mod.rs"), "original").unwrap();

        take(&dir, "src/deep/mod.rs").unwrap();
        fs::write(dir.join("src/deep/mod.rs"), "changed").unwrap();

        restore(&dir, Some("src/deep/mod.rs")).unwrap();
        assert_eq!(fs::read_to_string(dir.join("src/deep/mod.rs")).unwrap(), "original");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn a_literal_percent_in_a_path_cannot_collide_with_an_encoded_separator() {
        // Without escaping '%', the paths "a/b" and "a%2Fb" would encode
        // to the same filename and restoring either would write the other's
        // content. This is the reason encode_path escapes '%' first.
        assert_ne!(encode_path("a/b"), encode_path("a%2Fb"));
        assert_eq!(decode_path(&encode_path("a/b")), "a/b");
        assert_eq!(decode_path(&encode_path("a%2Fb")), "a%2Fb");
    }

    #[test]
    fn clear_removes_every_snapshot() {
        let dir = scratch("clear");
        fs::write(dir.join("a.txt"), "A").unwrap();
        take(&dir, "a.txt").unwrap();
        assert_eq!(list(&dir).len(), 1);

        let removed = clear(&dir).unwrap();
        assert_eq!(removed, 1);
        assert!(list(&dir).is_empty());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn listing_an_untouched_workspace_is_empty_not_an_error() {
        let dir = scratch("empty");
        assert!(list(&dir).is_empty());
        assert_eq!(clear(&dir).unwrap(), 0);
        assert!(restore(&dir, None).unwrap().is_empty());
        fs::remove_dir_all(&dir).ok();
    }
}
