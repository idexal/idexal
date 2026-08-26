# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done

- **IDE v2.4.0** — 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains,
  bundled skills (auto-load + inject + enable/disable + catalog browser + fetch-from-repo),
  @file + @folder/ context, checkpoints on every apply + one-click Undo,
  **Ctrl+K inline edit with streaming live preview** (token-by-token widget + Esc-cancel),
  per-hunk partial apply, tab-autocomplete via local models (Ollama/LM Studio) +
  **dedicated Autocomplete settings panel**, Terminal Agent panel live bridge,
  **voice input in Chat (🎙️ Web Speech live transcript + Whisper-ready) + Sync panel in Settings → Data**,
  0 TS errors, 90 tests, CI, Windows releases
- **CLI v2.4.0** — autonomous `idexa do` with permission gate, checkpoints & undo,
  atomic refactor, pre-commit AI review hook, headless `-p`, session continuity,
  `watch`, NDJSON bridge events + completions, `models` local detection,
  MCP client + tools invocation, **single-exec binary (3.8 MB) + `--files` scoped context + `idexa search <query>` workspace search**, npm-ready, 29 tests
- **Skills v1.1.0** — 118-skill library with auto-generated index
- **Website v0.9.0** — published (development intentionally deferred)

## 🔥 Now — Next release (v2.5.0)
### IDE v2.5.0
- [ ] Team skill packs
- [ ] Agent-to-agent protocol (IDE ↔ CLI live)

### CLI v2.5.0
- [ ] `idexa index` pre-built workspace index for faster `do`
- [ ] `idexa mcp tools --stream` NDJSON for long-running tools

## ⏭️ Next — v2.6.0 targets
- Team skill packs · Agent-to-agent protocol · Plugin store

## 🧊 Later — differentiators
- [ ] Cloud sync of sessions/settings across devices (local sync live; encrypted Gist backup next)
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
