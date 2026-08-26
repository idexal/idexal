# Idexal IDE Execution Plan

**Created:** August 25, 2026
**Goal:** Complete high-impact features to compete with Claude Code and Codex
**Status:** In Progress

---

## Phase 1: Complete Font Awesome Icon Migration

**Objective:** Migrate all remaining ~80 components from lucide-react to react-icons/fa

### Tasks
- [ ] 1.1 Audit all components using lucide-react
- [ ] 1.2 Create mapping of lucide → FA icon equivalents
- [ ] 1.3 Migrate Settings components (AIProviderSettings, EmbeddingSettings, SearchProviderSettings)
- [ ] 1.4 Migrate AI components (AgentThinking, Analytics, CodeReview)
- [ ] 1.5 Migrate Git components (GitAdvancedPanel, GitBlamePanel, GitHistoryPanel, GitStaging)
- [ ] 1.6 Migrate remaining Layout components (Breadcrumb, EditorArea)
- [ ] 1.7 Migrate utility components (Search, Debug, Notifications)
- [ ] 1.8 Remove lucide-react dependency from package.json
- [ ] 1.9 Verify TypeScript + Vite build + tests

**Estimated effort:** 30 minutes
**Risk:** Low — mechanical replacement

---

## Phase 2: Light Theme with Toggle

**Objective:** Add a professional light theme variant with brand-colored palette

### Tasks
- [ ] 2.1 Define light theme CSS variables in globals.css
- [ ] 2.2 Update tailwind.config.js with light theme colors
- [ ] 2.3 Add theme toggle button to TitleBar
- [ ] 2.4 Persist theme preference in settingsStore
- [ ] 2.5 Apply theme switching to all brand-colored components
- [ ] 2.6 Test dark/light switching in live preview
- [ ] 2.7 Verify TypeScript + build + tests

**Estimated effort:** 45 minutes
**Risk:** Medium — need to ensure all colors work in both modes

---

## Phase 3: Multi-Cursor and Column Selection

**Objective:** Enable advanced Monaco editor features

### Tasks
- [ ] 3.1 Enable multi-cursor in MonacoEditor.tsx configuration
- [ ] 3.2 Enable column selection mode
- [ ] 3.3 Add keyboard shortcuts documentation
- [ ] 3.4 Test multi-cursor in live preview
- [ ] 3.5 Verify TypeScript + build + tests

**Estimated effort:** 15 minutes
**Risk:** Low — Monaco has built-in support

---

## Verification Checklist

After each phase:
- [ ] TypeScript: `npx tsc --noEmit` — 0 errors
- [ ] Build: `npx vite build` — success
- [ ] Tests: `npx vitest run` — all passing
- [ ] Live preview: IDE renders correctly

---

## Success Criteria

| Metric | Target |
|---|---|
| lucide-react imports | 0 remaining |
| Theme toggle | Working dark/light switch |
| Multi-cursor | Enabled in editor |
| TypeScript errors | 0 |
| Test pass rate | 100% |
| Build time | < 15 seconds |
