# AGENTS.md — Non-Obvious Learnings

## Architecture

- **Panel wiring pattern**: Every new right-panel requires 4 edits in `App.tsx`: import, `RightPanel` union type, JSX rendering block, and keyboard shortcut. Missing any one breaks the panel.
- **`closePanel` stability**: Extract `const closePanel = () => setRightPanel(null)` once at component top. React useState setters are stable — this reference never changes and eliminates 55+ repeated closures.
- **SettingsPanel early return**: When `activeTab === 'ai'` returns a different JSX tree, the old tab's conditional (`activeTab === 'ai' && ...`) becomes dead code after the early return and causes TS2367 errors. Remove the dead branch.

## TypeScript Gotchas

- **`subscribe` return type**: If a service's `subscribe()` calls `Set.delete()` which returns `boolean`, the cleanup function `() => this.listeners.delete(listener)` returns `boolean` instead of `void`. React's `useEffect` expects `void | Destructor`. Fix: `return () => { this.listeners.delete(listener) }`.
- **Component name collision**: Don't name a component `Symbol` — it collides with JavaScript's built-in `Symbol`. Use `SymbolIcon` or a different name.
- **Dangling imports**: Some editors auto-add imports at the bottom of a file after the component export. Always verify imports are at the top — bottom imports cause confusing "used before defined" issues.

## Keyboard Shortcuts

- **Ctrl+Shift+letter conflicts are easy to introduce**: Each new panel gets a shortcut, but the letter space is finite. Before assigning, grep existing shortcuts for the same key combo. Duplicate bindings silently shadow (the first `if` wins).
- **Dead shortcut blocks**: A comment like `// Already taken by X, using Y instead` inside an empty `if` block is dead code. Remove it rather than leaving a misleading comment.

## Build & Test

- **Build command**: `cd freebuff-ide && npx vite build` — builds to `dist/`, outputs gzipped size.
- **Type check**: `cd freebuff-ide && npx tsc --noEmit` — fast, no output on success.
- **JS tests**: `cd freebuff-ide && npx vitest run` — 61 tests across contract.test.ts + integration-headless.test.ts.
- **Rust tests**: `cd freebuff-ide/rust-engine && cargo test` — 195 tests (182 unit + 10 integration + 3 doctests).
- **Rust clippy**: `cd freebuff-ide/rust-engine && cargo clippy --all-targets` — must be zero warnings.
- **Preview**: Vite dev server on port 5173 — use `preview_navigate` to verify, `preview_logs` for console errors.
- **CLI JSON support**: `stats`, `analyze`, `check`, `bench`, `version` support `--json`. `whoami` does NOT support `--json`.

## Project Conventions

- **Panel props**: All right-panel components accept `{ onClose: () => void }`. Some (like ChatPanel) also accept `onOpenSettings`.
- **Lucide icons**: All UI icons come from `lucide-react`. Don't introduce other icon libraries.
- **Component structure**: Each panel lives in its own directory under `src/components/`. File name matches component name (e.g., `CodeFormatter/CodeFormatterPanel.tsx`).
- **Mock data**: Panels use `MOCK_` prefixed constants for demo data. This is intentional — the IDE runs without a backend.
- **Breadcrumbs**: Must receive `filePath` from `useEditorStore` tabs, not `undefined`. Fixed in App.tsx.
- **Panel registry**: New panels must be added to `src/panels/panelRegistry.ts` — imports, type union, and registry entry.

## Rust Engine

- **Async CLI**: `main()` is `#[tokio::main]`. Commands doing file I/O use `JoinSet` (parallel reads) or `spawn_blocking` (CPU-bound like `analyze_current_dir`).
- **Release profile**: Has `panic = "abort"`, `lto = "fat"`, `codegen-units = 1`, `strip = true`.
- **Dead code in symbols.rs**: `extract_all_symbols`, `detect_language_from_path`, `get_symbol_emoji`, `sort_symbols_by_relevance` are `#[allow(dead_code)]` — they're utility functions for future CLI integration, not currently used outside tests.
- **vector_store metadata field**: The `metadata` field on `VectorEntry` is stored but never read — `#[expect(dead_code)]` with reason.
- **EngineState needs Default**: Clippy requires `impl Default` when a public `fn new()` exists on a struct.
- **Color constants in println!**: The `GREEN`, `RED` etc. constants are ANSI escape strings. Use `{GREEN}text{RESET}` format in `println!` — NOT string literals like `"{GREEN}text{RESET}"` which won't expand.
- **Integration tests location**: `rust-engine/tests/cli_integration.rs` — uses `Command::new(env!("CARGO_BIN_EXE_idexal"))` to test the binary as a black box.
- **async-trait crate**: Required for `#[async_trait]` on traits with async methods. Already in Cargo.toml.

## Test Consolidation

- **contract.test.ts vs contract-simplified.test.ts**: Were near-duplicates. Merged into single `contract.test.ts` (398 lines, 53 tests). Deleted `contract-simplified.test.ts`.
- **integration-headless.test.ts**: Removed structure tests that duplicated contract.test.ts (embedding/search/skill/AI provider counts). Kept only lifecycle tests (memory set→get→search→delete).
- **Table-driven tests**: Use `it.each(cases)` for same-assertion-different-input patterns — much more compact than individual `it` blocks.
