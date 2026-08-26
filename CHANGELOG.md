# Changelog — Idexal (Ecosystem)

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
