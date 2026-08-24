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
- **Tests**: `cd freebuff-ide && npx vitest run` — 27 contract tests in `src/__tests__/contract.test.ts`.
- **Preview**: Vite dev server on port 5173 — use `preview_navigate` to verify, `preview_logs` for console errors.

## Project Conventions

- **Panel props**: All right-panel components accept `{ onClose: () => void }`. Some (like ChatPanel) also accept `onOpenSettings`.
- **Lucide icons**: All UI icons come from `lucide-react`. Don't introduce other icon libraries.
- **Component structure**: Each panel lives in its own directory under `src/components/`. File name matches component name (e.g., `CodeFormatter/CodeFormatterPanel.tsx`).
- **Mock data**: Panels use `MOCK_` prefixed constants for demo data. This is intentional — the IDE runs without a backend.
