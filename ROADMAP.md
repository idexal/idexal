# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done
- **IDE v2.6.0** — 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains,
  bundled skills (auto-load + inject + enable/disable + catalog browser + fetch-from-repo + Team Packs share/import/apply),
  @file + @folder/ context, checkpoints on every apply + Undo, Ctrl+K streaming live preview,
  per-hunk partial apply, tab-autocomplete + settings panel, Terminal Agent NDJSON bridge with Protocol v2 (delegate/progress/request/result/cancel) + Cancel,
  voice input + Sync panel, **multi-workspace tabs (pill bar, 8 recent, localStorage) + Plugin Store banner (70% revenue stub, Publish CTA)**,
  0 TS, 90 tests, CI, Windows releases
- **CLI v2.6.0** — autonomous `idexa do` with permission gate, checkpoints & undo, atomic refactor,
  hook, headless `-p`, session continuity, `watch`, NDJSON bridge + completions, `models` local detection,
  MCP client + tools invocation with --stream + --timeout, `search`, single binary (3.9 MB) + --files + `idexa index --watch` workspace cache,
  **`idexa ask` quick single-shot Q&A + `idexa do --index` auto-inject cached index summary**, npm-ready, 29 tests
- **Skills v1.1.0** — 118-skill library with auto-generated index
- **Website v0.9.0** — published (development intentionally deferred)

## 🔥 Now — Next release (v2.7.0)
### IDE v2.7.0
- [ ] Cloud sync live (encrypted Gist) — Settings→Data Sync now pushes to real Gist
- [ ] Plugin publish API (billing + verification)

### CLI v2.7.0
- [ ] `idexa plugins publish` registry + `idexa ask --stream` live streaming
- [ ] `idexa do --watch` auto-rebuild index integration

## ⏭️ Next — v2.8.0 targets
- On-device fine-tuned completion model · Agent-to-agent callbacks (CLI → IDE open_file/show_diff)

## 🧊 Later — differentiators
- [ ] Cloud sync of sessions/settings across devices (local sync live)
- [ ] Agent-to-agent protocol full callback (CLI → IDE open_file/show_diff)
- [ ] Plugin store with revenue share (banner live in 2.6)
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
