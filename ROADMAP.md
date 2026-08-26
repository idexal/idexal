# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done

- **IDE v1.2.0** — 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains,
  bundled skills (auto-load + inject), provider metadata in chat, 0 TS errors, 90 tests, CI,
  Windows Setup+Portable releases attached
- **CLI v1.2.0 "Agent Loop"** — `idexa do "<task>"` autonomous execution with
  permission gate (y/n/always, --auto, --readonly), headless `idexa -p`,
  session continuity (`--continue` / `--resume <id>`, auto-save),
  any OpenAI-compatible gateway via env, npm tarball release
- **Skills v1.1.0** — 118-skill library with auto-generated index
- **Website v0.9.0** — published (development intentionally deferred)

## 🔥 Now — Next release (IDE v1.3.0 / CLI v1.3.0)

### IDE v1.3.0 — "Real Tool Loop"
- [ ] IDE agents call the same tools as the CLI: read/write/edit files, run terminal commands
- [ ] Diff-preview panel before the agent writes; one-click rollback checkpoints
- [ ] @-context in chat (`@file`, `@folder`, `@symbol`, `@terminal`) feeding real file contents
- [ ] Skills marketplace panel (browse/install from idexal-skills)

### CLI v1.3.0 — "Deep Workspace"
- [ ] Workspace checkpointing: snapshot before edits, `idexa undo`
- [ ] Multi-file refactor tool with atomic apply/rollback
- [ ] Git hooks integration (pre-commit AI review)
- [ ] npm publish under `idexa-cli`

## ⏭️ Next — v1.4.0 targets

- MCP client in IDE & CLI (connect external tools)
- Local model support polish (Ollama/LM Studio auto-detect)
- IDE inline edit (Ctrl+K) like Cursor · tab-autocomplete via local models
- Voice input (Whisper local)
- Background agents watching files

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
