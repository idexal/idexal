# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done

- **IDE v1.8.0** — 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains,
  bundled skills (auto-load + inject + enable/disable), @file + @folder/ context,
  checkpoints on every apply + one-click Undo, Ctrl+K inline edit,
  **Terminal Agent panel consuming the CLI bridge live**,
  0 TS errors, 90 tests, CI, Windows releases
- **CLI v1.8.0 "Depth"** — autonomous `idexa do` with permission gate,
  checkpoints & undo, atomic refactor, pre-commit AI review hook, headless `-p`,
  session continuity, `watch` background agent, NDJSON bridge events + completions,
  **`idexa models` local runtime detection (Ollama/LM Studio) with `--use` switching**, 29 tests
- **Skills v1.1.0** — 118-skill library with auto-generated index
- **Website v0.9.0** — published (development intentionally deferred)

## 🔥 Now — Next release (v1.9.0)

### IDE v1.9.0
- [ ] Skills marketplace: fetch new skills from idexal-skills repo on demand
- [ ] Per-hunk apply in DiffViewer

### CLI v1.9.0
- [ ] MCP client support (`idexa mcp connect <server>`)
- [ ] npm publish under `idexa-cli`

## ⏭️ Next — v2.0.0 targets

- Tab-autocomplete via local models · Voice input (Whisper local)
- Cloud sync of sessions/settings · Team skill packs

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
