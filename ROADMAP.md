# 🗺️ Idexal Master Roadmap

> **Mission:** become the strongest open competitor to Claude Code, Codex & Antigravity.
> Desktop IDE + CLI are the core. Website comes last.

**Versioning policy:** every update = new version number (SemVer `MAJOR.MINOR.PATCH`)
recorded in each repo's `CHANGELOG.md` + a GitHub Release with installable artifacts.

---

## ✅ Done
- **IDE v2.7.1** — hotfix: clean-install packaging (asarUnpack + missing deps + zip) — app now opens on fresh Windows (MODULE_NOT_FOUND fixed), Setup 95M + Portable 95M + Zip 128M fallback + app.asar 26M, 90/90, live launch verified (win-unpacked stays 12s)
- **CLI v2.7.1** — hotfix: real PE32+ binary via pkg (37.8MB, Node 18 embedded) — runs on clean Windows without Node (was JS text), 29/29, live --help/--version/ask --help verified
- **IDE v2.8.0** — callbacks live (CLI `ide_open_file`/`ide_show_diff` → IDE `open-file`/`show-diff` IPC), on-device distilled n-gram ghost-text (Ollama → LM Studio → on-device fallback) + Settings On-Device panel (toggle + model `distilled-350M/1B/Xenova` + badge), vite 20s, 90/90
- **CLI v2.8.0** — `do --watch` (chokidar 1200ms debounce, auto-index rebuild, live `⚡` cycles, `await Promise` keep-alive) + `ask --index --stream` combo, `plugins publish` real `npm publish --access public` with staging fallback, tools `ide_open_file`/`ide_show_diff`, PE 37.8MB + tgz 218K, 29/29
- **IDE v2.9.0** — AES-GCM sync (PBKDF2 100k, 12-byte IV, hasLocalChanges/conflict), billing live (verify/purchase 70%, Stripe stub, My Plugins panel), Settings Billing card, vite 21s, 90/90
- **CLI v2.9.0** — modelRouter auto (`ask`/`do --model auto` with router print), collab rooms (`create/join/list/leave` file-based `~/.idexa/collab`, live tail), PE 37.8MB + tgz 225K, 29/29
- **IDE v2.7.0** — 90 panels, multi-agent orchestrator, multi-provider AI + fallback chains,
  bundled skills (auto-load + inject + enable/disable + catalog browser + fetch-from-repo + Team Packs share/import/apply),
  @file + @folder/ context, checkpoints on every apply + Undo, Ctrl+K streaming live preview,
  per-hunk partial apply, tab-autocomplete + settings panel, Terminal Agent NDJSON bridge with Protocol v2 (delegate/progress/request/result/cancel) + Cancel,
  voice input + cloud sync live (Gist encrypted XOR→AES-ready, token input + Sync now/Pull & restore + gist URL), **plugin publish in marketplace (inline form → pluginStoreService staging, 70% share)**,
  multi-workspace tabs, 0 TS, 90 tests, CI, Windows releases
- **CLI v2.7.0** — autonomous `idexa do` with permission gate, checkpoints & undo, atomic refactor,
  hook, headless `-p`, session continuity, `watch`, NDJSON bridge + completions, `models` local detection,
  MCP client + tools invocation with --stream + --timeout, `search`, single binary (3.9 MB) + --files + `idexa index --watch`,
  `idexa ask` + `do --index`, **`ask --stream` live streaming + `plugins publish <path>` staging (70% share, --dry-run)**,
  npm-ready, 29 tests
- **Skills v1.1.0** — 118-skill library with auto-generated index
- **Website v0.9.0** — published (development intentionally deferred)

## ✅ Shipped — v2.8.0 (2026-08-26)
### IDE v2.8.0
- [x] Agent-to-agent callbacks live (CLI → IDE open_file/show_diff via Protocol v2)
- [x] On-device fine-tuned completion model (distilled local ghost-text)

### CLI v2.8.0
- [x] `idexa do --watch` auto-rebuild index + `ask --index --stream` combo
- [x] `idexa plugins publish` → real npm registry push (billing `npm publish --access public`)

## ✅ Shipped — v2.9.0 (2026-08-26)
- Plugin store billing live (Stripe payouts) + verification · Cloud sync AES-GCM + conflict merge · Multi-model router `ask --model auto`

## 🔥 Now — Next release (v2.10.0)
- Multi-workspace ghost-text ensemble + Yjs CRDT polish + Plugin payouts live (real Stripe webhook)

## ⏭️ Next — v2.9.0 targets
- Collab Yjs polish · `idexa collab` multi-agent room

## 🧊 Later — differentiators
- [ ] Cloud sync conflict resolution across devices
- [ ] Plugin store revenue payouts live
- [ ] On-device model fine-tuning pipeline

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
