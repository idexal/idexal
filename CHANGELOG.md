# Changelog — Idexal (Ecosystem)

## [2.8.0] — 2026-08-26

**IDE 2.8.0 “Callbacks + On-Device”** + **CLI 2.8.0 “Watch + Real Publish”**

- **IDE**: Protocol v2 callbacks live (`ide_open_file`/`ide_show_diff` via NDJSON `request`), `onDeviceModelService` distilled n-gram + optional transformers WASM (offline ghost-text fallback Ollama → LM Studio → on-device), Settings → Tab Autocomplete → On-Device panel (`onDeviceEnabled`/`onDeviceModel` in `idexal-settings`), `open-file` IPC accepts path + `show-diff` IPC, `preload` exposes `idexaCancel`/`showDiff`
- **CLI**: `do --watch` (chokidar 1200ms debounce, auto `.idexa/index.json` rebuild, `⚡ Change detected`), `ask --index --stream` fully wired, `plugins publish` real `npm publish --access public` with staging fallback, new tools `ide_open_file`/`ide_show_diff` for bridge callbacks
- **Build**: CLI PE 37.8MB + tgz 218K, IDE Setup 95M + Portable 95M + Zip 128M + asar 26M; `vite 20s` + `90/90` + `29/29`; hotfix 2.7.1 clean-install retained

## [2.7.1] — 2026-08-26 — HOTFIX: standalone binary + clean-install

### Fixed
- **CLI v2.7.1** hotfix: binaries/idexa-win-x64.exe was a JS text file with .exe extension — failed on clean Windows without Node. Now a real PE32+ via pkg (Node 18 embedded, 37.8MB). Verified: file PE32+ and timeout 12 --help passes. 29/29 tests.
- **IDE v2.7.1** hotfix: electron-builder omitted electron-updater/electron-is-dev — app never opened on fresh machines (MODULE_NOT_FOUND). Fixed files + asarUnpack **.node/.dll/.exe + public/** + zip target (Idexal-IDE-2.7.1-Windows-x64.zip 128M fallback for SmartScreen). Verified: vite + 90/90 + Setup 95M + Portable 95M + Zip 128M + app.asar 26M; win-unpacked stays alive 12s.

## [2.7.0] — 2026-08-26

### Changed
- **IDE v2.7.0** released: cloud sync live (encrypted Gist, token input + Sync/Pull, XOR→AES-ready) + marketplace publish form (pluginStoreService staging, 70% share); Windows installers attached
- **CLI v2.7.0** released: `idexa ask --stream` live streaming + `idexa plugins publish <path>` staging (manifest validation, --dry-run, 70% share); 29 tests, tarball (214K) + binary (3.9MB) attached

## [2.6.0] — 2026-08-26

### Changed
- **IDE v2.6.0** released: multi-workspace tabs (pill bar, 8 recent, `workspaceTabsService`) + Plugin Store banner (70% revenue stub, Publish CTA); Windows installers attached
- **CLI v2.6.0** released: `idexa ask` single-shot Q&A (--model/--json) + `idexa do --index` workspace-index auto-injection; 29 tests, tarball (212K) + binary (3.9MB) attached

## [2.5.0] — 2026-08-26

### Changed
- **IDE v2.5.0** released: Team Skill Packs (share/import/apply) + Agent Protocol v2 (typed envelope + Cancel); Windows installers attached
- **CLI v2.5.0** released: `idexa index` workspace cache (--refresh/--json/--watch) + `mcp tools --stream/--timeout`; 29 tests, tarball + binary attached

## [2.4.0] — 2026-08-26

### Changed
- **IDE v2.4.0** released: 🎙️ voice input in Chat (Web Speech live transcript + Whisper-ready) + Sync panel in Settings → Data; Windows installers attached
- **CLI v2.4.0** released: `idexa search <query>` workspace search (ripgrep + fallback) + binary refresh; 29 tests, tarball + binary attached

## [2.3.0] — 2026-08-26

### Changed
- **IDE v2.3.0 "Streaming Inline Edit"** released: Ctrl+K now streams token-by-token
  with live preview widget + Autocomplete settings panel; Windows installers attached
- **CLI v2.3.0** released: single-exec binary (3.8 MB) + `--files` scoped context;
  29 tests, tarball + binary attached

## [2.2.0] — 2026-08-26

### Changed
- **IDE v2.2.0 "Local Autocomplete"** released: ghost-text tab-completion via
  Ollama/LM Studio, fully private; Windows installers attached
- **CLI v2.2.0** released: `mcp tools` list + direct invocation; 29 tests,
  tarball attached

## [2.1.0] — 2026-08-26

### Changed
- **IDE v2.1.0 "Per-Hunk Apply"** released: partial diff apply via line
  selection; Windows installers attached
- **CLI v2.1.0** released: npm publish readiness verified; tarball attached

## [2.0.0] — 2026-08-26

### Changed
- **IDE v2.0.0 "One Platform"** released: skills catalog browser with
  one-click install; Windows installers attached
- **CLI v2.0.0 "Registry"** released: MCP tools surfaced to the agent loop;
  npm registry metadata; 29 tests, tarball attached

### Milestone
The IDE and CLI now ship as ONE platform — same agent, same tools, same
skills, connected by the NDJSON bridge.

## [1.9.0] — 2026-08-26

### Changed
- **IDE v1.9.0 "Skills Fetch"** released: install any skill from the
  idexal-skills repo by id, instantly; Windows installers attached
- **CLI v1.9.0 "MCP Client"** released: `mcp connect/list/remove` with
  validated JSON-RPC stdio connections; 29 tests, tarball attached

### Added
- ROADMAP re-baselined: v2.0.0 = IDE "One Platform" + CLI "Registry"

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
