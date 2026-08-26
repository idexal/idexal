# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done (v1.1.0 — current)

- [x] IDE: 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains
- [x] IDE: bundled skills library — auto-load, browse, inject into agent prompts
- [x] IDE: 0 TS errors · 90 unit tests · CI
- [x] CLI: chat/generate/analyze/agent commands · MCP + plugins · 26 tests
- [x] Skills: 118-skill library with auto-generated index
- [x] 4 standalone repositories published + umbrella overview

## 🔥 Now — Next release (IDE v1.2.0 / CLI v1.2.0)

### IDE v1.2.0 — "Agent Mode"
- [ ] Real tool-loop agents: read/write files, run terminal commands, edit code with diff preview
- [ ] Agent checkpointing: snapshot workspace before edits, one-click rollback
- [ ] @-context in chat (`@file`, `@folder`, `@symbol`, `@terminal`) feeding real file contents
- [ ] Skills marketplace panel (browse/install from idexal-skills)
- [ ] Windows/macOS/Linux installers published as GitHub Release v1.2.0

### CLI v1.2.0 — "Claude Code parity"
- [ ] Interactive REPL session with persistent context + `/slash` commands
- [ ] Tool loop: shell exec, file patching, search — permission-gated
- [ ] Session save/resume (`idexa session continue`)
- [ ] Headless mode: `idexa -p "task"` for scripting/CI
- [ ] npm publish → `npm i -g idexa-cli` actually works

## ⏭️ Next — v1.3.0 targets

### Both
- [ ] MCP client in IDE & CLI (connect external tools)
- [ ] Local model support polish (Ollama/LM Studio auto-detect)

### IDE
- [ ] Inline edit (Ctrl+K) like Cursor
- [ ] Tab-autocomplete via local models
- [ ] Multi-file diff review before agent applies changes
- [ ] Voice input (Whisper local)

### CLI
- [ ] Background agents watching files
- [ ] Git hooks integration (pre-commit AI review)

## 🧊 Later — differentiators

- [ ] Cloud sync of sessions/settings across devices
- [ ] Team skill packs (share curated skills per org)
- [ ] Agent-to-agent protocol (IDE ↔ CLI collaboration)
- [ ] Plugin store with revenue share
- [ ] On-device fine-tuned completion model

## 🌐 Website (last priority)

- [ ] Docs site generation from repo markdown
- [ ] Download pages wired to GitHub Releases API
- [ ] v1.0 launch when IDE+CLI reach feature parity goals

---

## 📋 Definition of done (every release)

1. Version bumped in `package.json` (+ tag `vX.Y.Z`)
2. `CHANGELOG.md` updated with dated entry
3. `npx tsc --noEmit` = 0 errors · tests green · build succeeds
4. Installable artifacts attached to the GitHub Release
5. Docs/README updated to match reality
