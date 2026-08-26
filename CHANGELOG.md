# Changelog — Idexal (Ecosystem)

## [1.8.0] — 2026-08-26

### Changed
- **IDE v1.8.0 "Wire the Bridge"** released: Terminal Agent panel runs the
  idexa CLI live with real-time progress; Windows installers attached
- **CLI v1.8.0 "Depth"** released: `idexa models` local runtime detection
  (Ollama/LM Studio) with `--use` switching; 29 tests, tarball attached

### Added
- The IDE↔CLI bridge is live — one platform, one agent, everywhere

## [1.7.0] — 2026-08-26

### Changed
- **IDE v1.7.0 "Inline Edit"** released: Cursor-style Ctrl+K in-editor AI
  editing with Accept/Reject bar; Windows installers attached
- **CLI v1.7.0 "Bridge"** released: NDJSON event protocol (`--json-events`)
  + shell completions; 29 tests, npm tarball attached

### Added
- ROADMAP re-baselined: v1.8.0 = IDE "Wire the Bridge" + CLI "Depth"

## [1.6.0] — 2026-08-26

### Changed
- **IDE v1.6.0 "Skills Marketplace"** released: enable/disable toggles with
  persistence in the Skills browser; Windows installers attached
- **CLI v1.6.0 "Polish"** released: resumable agent sessions
  (`do --continue` / `--resume <id>`); 29 tests, npm tarball attached

### Added
- ROADMAP re-baselined: v1.7.0 = IDE "Inline" + CLI "Bridge"

## [1.5.0] — 2026-08-26

### Changed
- **IDE v1.5.0 "Diff Review + @folder"** released: folder context expansion,
  checkpoints on every Apply path; Windows installers attached
- **CLI v1.5.0 "Ship"** released: atomic `idexa refactor` (all-or-nothing),
  `idexa hook install` pre-commit AI review; 29 tests, npm tarball attached

### Added
- ROADMAP re-baselined: v1.6.0 = IDE "Marketplace" + CLI "Polish"

## [1.4.0] — 2026-08-26

### Changed
- **IDE v1.4.0 "Agent Does + Undo"** released: checkpoints before every applied
  action + one-click Undo button in chat; Windows installers attached
- **CLI v1.4.0 "Reach"** released: `idexa watch` background agent (debounced,
  ext-filtered, read-only default), 29 tests passing, npm tarball attached

### Added
- ROADMAP re-baselined: v1.5.0 = IDE "Diff Review" + CLI "Ship"

## [1.3.0] — 2026-08-26

### Changed
- **IDE v1.3.0 "@-Context"** released: @file references pull real file contents
  into agent context; Windows Setup+Portable installers attached
- **CLI v1.3.0 "Deep Workspace"** released: checkpoints & `idexa undo`,
  29 tests passing, npm tarball attached

### Added
- ROADMAP re-baselined: v1.4.0 = IDE "Agent Does" + CLI "Reach"

## [1.2.0] — 2026-08-26

### Changed
- **IDE v1.2.0 "Agent Transparency"** released: provider metadata in chat,
  bounded skill injection, Windows Setup+Portable installers attached
- **CLI v1.2.0 "Agent Loop"** released: autonomous `idexa do` with permission gate,
  headless `idexa -p`, session continuity (`--continue`/`--resume`), gateway env config

### Added
- ROADMAP.md re-baselined: v1.3.0 targets are IDE "Real Tool Loop" and CLI "Deep Workspace"

## [1.1.0] — 2026-08-26

### Changed
- Repository restructured: the monorepo was split into **4 standalone repos**:
  - [idexal-ide](https://github.com/idexal/idexal-ide) v1.1.0
  - [idexal-cli](https://github.com/idexal/idexal-cli) v1.1.0
  - [idexal-skills](https://github.com/idexal/idexal-skills) v1.1.0
  - [idexal-website](https://github.com/idexal/idexal-website) v0.9.0
- This repository is now the ecosystem overview (umbrella)

### Added
- Ecosystem README with quick-start per component and roadmap
- Continuous development master plan: `ROADMAP.md`

[Unreleased]: https://github.com/idexal/idexal/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/idexal/idexal/releases/tag/v1.1.0
