# Idexal

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./logo_idexal/dark_logo_idexal.png" />
    <img src="./logo_idexal/light_logo_idexal.png" alt="Idexal" width="360" />
  </picture>
</div>
<p align="center">
  <a href="https://idexal.com">idexal.com</a> ·
  <a href="https://github.com/idexal/idexal">GitHub</a> ·
  <a href="https://github.com/idexal/idexal/issues">Issues</a> ·
  <a href="mailto:contact@idexal.com">contact@idexal.com</a>
</p>
<p align="center">
  <a href="README.md">简体中文</a> | English
</p>

Idexal is an AI coding workspace with desktop, browser, and terminal interfaces. This repository contains the clients, backend services, shared UI, and Agent CLI and runtime source code.

## Updates

- 2026-9-26: Updated to Idexal v3.16.8: the repository has a runnable test entry for the first time — `pnpm test:unit`, now wired into `pnpm verify:pre-push`. It uses Node's built-in `node:test` plus the `tsx` already in the repo, so no new dependency was added. In doing so it revived four test files that had never been executed (`packages/services/test/` ×3, `packages/ui/test/` ×1); the UI one fails with `Cannot find package '@/lib'` when run standalone because it depends on its own package's tsconfig `paths` aliases while tsx only honours one config from the launch directory, so the runner groups tests by the nearest package tsconfig and passes `TSX_TSCONFIG_PATH` per group. Six files / 33 cases now run. The first new cases pin model failure classification and the retry budget, because model fallback can only read the classifier's structured `reason` and `retryable` fields — if that mapping is ever changed, the trigger matrix has to fail here immediately rather than silently switching models in production. Test files live next to source so they are type-checked, while a new `tsconfig.build.json` keeps them out of shipped output (measured: without it `dist/model/` gains 6 test artifacts). The gate's discrimination was tested, not assumed: mis-mapping 529, changing default retries 10→5, injecting a type error into a test, and adding a guaranteed-fail case each produced a failing exit; finding zero test files is also a failure rather than "no tests, so pass". Separately, a Windows-only non-reproducible gate was fixed: `core.autocrlf` expanded the LF-committed `ar.ts` into CRLF on checkout, so `pnpm fmt:check` failed on a file with zero changes while `git status` reported it clean — `.gitattributes` now pins `text eol=lf` for `*.ts`/`*.tsx` (same reasoning as the existing `*.mjs` rule), and `--renormalize` measurably touched only the 3 files changed here. This release did not build the desktop output or launch the app, so the renderer and installer remain unverified surfaces.
- 2026-9-26: Updated to Idexal v3.16.7: locale-table consistency is now a repository gate. `scripts/check-i18n.mjs` is wired into `pnpm verify:pre-push` and blocks duplicate keys, orphan keys (a key present in a translation but missing from `en-US`), empty translated values, `{placeholder}` sets that differ from English, `ar`/`fr` coverage asymmetry, and CJK characters mixed into Arabic strings — a dropped `{time}` renders the literal to the user and the type checker cannot see it. The script no longer counts keys with a regex: it evaluates the tables as modules in a sandbox and self-checks that the parser actually reached hyphenated and non-ASCII keys, since that blind spot is what made three earlier releases publish wrong coverage figures (5859/208/317/371; the real values are 5872/386). All six checks were proven to discriminate by injecting a real defect each, then restored. The heuristic leftover-English-word scan is deliberately **not** a hard gate — French cognates produce 38 false positives across ~380 keys, and a mandatory check people need to silence is worse than an advisory one. Also recorded: 4 empty values in `en-US` need a product decision (two look like intentionally empty suffixes, two look like missing copy).
- 2026-9-26: Updated to Idexal v3.16.6: the seven places in the desktop main process where the app's **own** copy only recognised `zh-CN`/`en-US` now use exhaustive `Record<Locale, Copy>` lookup — the same in-repo pattern as `desktopMenu.ts` — covering the forced-update dialog and every string in the update progress window, the architecture-mismatch prompt, the quit confirmation, the embedded browser's `alert`/`confirm` buttons and source label, the open-external-folder confirmation, and the no-installable-update notice. Adding a language now fails at compile time instead of silently falling back to English. Also fixed a brand leftover: the quit dialog said `"Quit Z Code?"`, which the repo-wide rename had missed because that dialog only appears when quitting with running sessions. A full re-sweep leaves only 3 occurrences of `Z Code`, all in the `X-Title` request header sent to the model gateway (`User-Agent`/`HTTP-Referer` there are already Idexal) — that is a machine-visible contract possibly keyed by upstream limits, so it was **not** changed here and needs a decision. Three button arrays are ordered by machine contract (`defaultId`/`cancelId` index into them) and each is now pinned with a comment: reordering to match local convention would make the default action "open an untrusted folder". The update progress window's HTML gained the `dir` attribute it was missing. Because `packages/desktop/src/main` is outside `pnpm typecheck` and carries an 87-error baseline, verification compares error **identities** against HEAD: still 87, zero new — and the comparison was proven to discriminate, since renaming `fr` to `fr1` immediately raised `TS2353` and a missing import was caught the same way. One item deliberately left alone: the Windows "Idexal is controlling your computer" indicator binds its text to a hand-written pixel width with `nowrap` + `overflow: hidden`, so guessing an Arabic width would trade a missing translation for clipped text — Arabic and French users currently see English there, recorded as a known gap that needs a live measurement.
- 2026-9-26: Updated to Idexal v3.16.5: adds `docs/improvement-proposals.md` — proposals tied to code with `file:line` evidence, each labelled [already exists] / [confirmed missing] / [defect found], covering the test and CI gap, real keychain-backed credentials, model/provider fallback, how far custom models can be configured, ICU plurals, offline buffering, and three-platform installers with signing. The confirmed finding on fallback: the model layer only retries **within the same model** (11 attempts by default, classified across 429/529/5xx/timeout/stream-idle/context-exceeded with `retryAfterMs`), and **no code path ever calls a different model after one fails** — so the proposal adds a "should we switch" dimension to the existing classifier, resolves the candidate chain through the provider layer's current executable/selectable gates, and draws a hard line: never replay once a tool has executed. The doc also lists what **not** to rebuild — observability is already complete (ARMS RUM + scrubbing + crashReporter + ANR/freeze + React error bridge + feedback with zipped logs), and skill toggling plus personal plugin sources already exist. While writing it I swept for hard-coded languages and found 6+ more places in the desktop main process where the app's **own** copy only knows zh/en: the forced-update dialog (including "do not close the app"), the quit confirmation, the embedded browser's native alert/confirm buttons, and the "Idexal is controlling your computer" security indicator (whose text is coupled to a hand-written pixel width) — and `packages/desktop/src/main` is not covered by `pnpm typecheck`, so no gate would ever flag it. Recorded as the top-priority phase. The RTL physical-utility figure also moves from "≥400 in 197 files" to a measured 743 occurrences in 250 files, with logical-property usage confirmed at 0 (all 30 `start-N` hits are grid line names).
- 2026-9-26: Updated to Idexal v3.16.4: fixes a defect I left behind when I changed the language set — the crash screen (`ErrorBoundary`) hard-coded its accepted languages to `zh-CN`/`en-US` and picked between only those two full tables, so a user who had chosen Arabic or French got English on a crash (or Chinese if their OS language is zh), on a screen whose entire content is "retry / reload / view diagnostics" — exactly where misreading causes bad actions. It now goes through the shared language resolution and the same fallback chain, the 11 `appError.*` keys are translated (ar/fr at 386 keys), and the app-level card declares `dir` so an Arabic crash screen lays out RTL. This also corrects the figures published in the last three releases: the real counts are `en-US` 5872 and `ar`/`fr` 386 (6.57%). They were low because my own check counted keys with a regex whose character class omitted hyphens and non-ASCII, silently skipping 17 keys — a guard cannot report on what its parser cannot reach, so the checks now load the module and read `Object.keys`. The RTL physical-utility figure moves from "≥400 in 197 files" to a measured 743 occurrences in 250 files, and logical-property usage is confirmed at 0 (the 30 `start-N` hits are all grid line names). Adds `docs/improvement-proposals.md`: proposals tied to code with file:line evidence, including model/provider fallback (confirmed: today there is only same-model retry, and no code path ever switches to another model after a failure), real keychain-backed credentials, the test and CI gap, and ICU plurals. The crash screen's actual render is still the one thing no automation covers, because the user's dev instance holds `out/`.
- 2026-9-26: Updated to Idexal v3.16.3: the high-traffic parts of the conversation view are translated — composer placeholder and drag hint, all 6 categories of the `@` mention palette (files, plugins, skills, sessions, whiteboards, loading) with their empty and search states, the error banner (copy, expand, retry, report, no model available), the context-usage popover, reasoning level and quota-reset reminders. Arabic and French reached 371 keys each (see the v3.16.4 correction for the real figure). The key collector is now generic: it scans the real `id/titleId/labelId` literals in components and keeps only the untranslated ones. The v3.16.2 lesson that "keys filled in is not values correct" is now a fixed step — the scan runs right after each batch, and this time all 9 hits were French cognates or deliberately kept technical names. As with 3.16.2 there is no live render verification: an isolated dev instance `rmSync`s the same `out/` the user's instance is watching, and these popovers have never been measured in RTL.
- 2026-9-26: Updated to Idexal v3.16.2: the Settings page is translated — nav group headings plus 16 section titles, 66 labels in General and 22 in Appearance — taking Arabic and French from 208 to 317 keys each with the key sets aligned one-for-one. Keys are now collected by scanning the `id:` literals that actually appear in the components instead of guessing by prefix. This also fixes three value-level defects in the earlier shell translations: a French string left the English word `anything` mid-sentence and dropped its second half, and two Arabic strings for "Resets" were ungrammatical. Two new string checks were added and each was proven to fail on constructed bad data: placeholder sets must match English exactly, and no duplicate or orphan keys. Note this release has no live render verification — Settings only mounts in the desktop renderer, and starting another isolated instance runs `pre-dev`, which `rmSync`s the very `out/` directory the user's running dev instance is watching. So the RTL geometry of the Arabic settings page remains unmeasured.
- 2026-9-26: Updated to Idexal v3.16.1: the Windows wizard installer now shows our own prompts in Arabic, English and French (previously only the error text was Chinese, so English and French users hit a step they could not read), plus three-language `installerLanguages`, branded header/sidebar bitmaps and "uninstall keeps user data". Two NSIS constraints were confirmed by compiling: language constants must use numeric IDs, and the script must carry a UTF-8 BOM. Full template-integrated compilation is still pending. The Arabic and French app shell is also translated now (each locale grew from 59 to 208 keys, with identical key sets), and a live check in Arabic found no English left in the sidebar, title bar, task list or composer. This also retracts a v3.16.0 claim that "~400 physical spacing utilities leave components laid out for LTR" — that was inferred from a count, not observed; measuring geometry in the same viewport shows the shell already mirrors correctly, and the real gap was translation coverage. Physical utilities still need a component-by-component review — see docs/i18n-rtl.md.
- 2026-9-26: Updated to Idexal v3.16.0: the app languages are now Arabic, English and French, with RTL layout support (`dir`/`lang` derived from the language, Arabic flows right-to-left). Chinese is no longer the default and no longer appears in the language switcher or the Settings dropdown; `zh-CN` stays in the type and validation for one release so existing `setting.json` files keep parsing, and removing it entirely needs a separate migration. Untranslated strings fall back to English, so translation can proceed surface by surface.
- 2026-9-26: Updated to Idexal v3.15.22: the sign-in screen no longer offers the Z.ai / BigModel account-connection buttons. They are replaced by a single disabled placeholder with no link — `Subscriptions coming soon` — until the subscription portal is ready; `Use API key` remains the only working path today. The placeholder label is localized for both app languages.
- 2026-9-26: Updated to Idexal v3.15.21: measured that idexal.com is in fact live (an earlier assumption was wrong) and pointed the public share page's download entry at the official domain; the in-app Docs menu is unchanged because the site currently serves only its root — /docs and friends return 404.
- 2026-9-26: Updated to Idexal v3.15.20: audited the published releases (tags and releases match 1:1, naming and states consistent) and recorded the real gap — no release carries a downloadable artifact — along with why the existing unsigned `_TEST` installer can't simply be attached.
- 2026-9-26: Updated to Idexal v3.15.19: end-to-end testing of the production build in a real browser showed the previous prefers-color-scheme icon selection never actually took effect (a light OS plus the app's default dark theme put dark strokes on a dark tab), so the icon is now chosen by the app theme in the bootstrap script, verified in both directions.
- 2026-9-26: Updated to Idexal v3.15.18, fixing the web browser tab icon using the wrong brand variant: it embedded the light-mode artwork (dark strokes on a transparent background) while the app declares a dark color scheme, so the logo's main stroke blended into the tab bar and the mark looked broken. Dark and light variants are now served per system color scheme.
- 2026-9-26: Updated to Idexal v3.15.17, splitting leftover brand-domain strings into "endpoints consumed by programs — keep" versus "links clicked by people — pending a decision", locating two places where the public share page download button and the in-app Docs menu still point at the upstream domain, and explaining why rewriting them before idexal.com is live would only trade a branding problem for a broken link.
- 2026-9-26: Updated to Idexal v3.15.16, covering the three-step first-run onboarding (occupation / UI mode / preferences) and the packaged runtime dependency closure: all three steps carry Idexal branding with zero text overlaps, zero out-of-bounds blocks and zero exceptions, and the hero reuses the same brand component as the startup splash; 75 closure modules are present in app.asar with none missing, confirmed with both a positive and a negative control. Also corrected an earlier wrong conclusion that the packaged and dev builds share a config directory.
- 2026-9-26: Updated to Idexal v3.15.15, verifying a freshly built Windows package on real hardware (exe resources report Idexal Preview / Idexal / 3.15.14; at runtime the brand bitmap, window title, placeholder text and model namespace are all Idexal) and recording that reading version resources mid-build returns Electron defaults.
- 2026-9-26: Updated to Idexal v3.15.14, confirming via a read-only measurement of the real desktop window (1536×824, conversation 691px) that the 3.15.13 mount-time collapse cannot misfire on desktop.
- 2026-9-26: Updated to Idexal v3.15.13, fixing the mobile-web cold-start case where the Send button was clipped off-screen and unreachable — the narrow-screen collapse only ran on resize and never on mount — and correcting the previous two entries that misjudged it as a design gap.
- 2026-9-26: Updated to Idexal v3.15.12, root-causing the 390px composer defect (isMobileViewport is a dead prop; CollapsedRail is never rendered by the shell) and correcting the wrong assumptions in the previous entry.
- 2026-9-26: Updated to Idexal v3.15.11, recording the measured mobile-web defect where the composer's Send button is clipped off-screen and unreachable at 390px, with two candidate fixes pending product alignment, plus the passing light-theme and onboarding walkthrough checks.
- 2026-9-26: Updated to Idexal v3.15.10, adding the desktop cold-boot regression check for the 3.15.9 hook fix and recording that the Provider Runtime CDN refresh failure is an environment limit.
- 2026-9-26: Updated to Idexal v3.15.9, fixing an OnboardingDialog subtree crash caused by a hook-count change when workspacePath resolves asynchronously on web, and removing internal wiring jargon from the browser tab title.
- 2026-9-26: Updated to Idexal v3.15.8, fixing brand bitmaps disagreeing with the applied theme when App theme is System (white logo on a light page); bitmap choice now subscribes to the .dark class only.

- 2026-9-26: Updated to Idexal v3.15.7, fixing the dark-theme draft page where the full-strength brand watermark sat under the greeting and made it unreadable; the fade no longer branches on theme.

- 2026-9-26: Updated to Idexal v3.15.6, replacing brand-consistency claims with pixel-level provenance: UI bitmaps diff 0.000 against the official assets, and the Windows icon is confirmed same-origin with the official master after padding normalization.
- 2026-9-26: Updated to Idexal v3.15.5, with pixel-level proof that the Windows exe and the NSIS installer ship the official brand icon and Idexal file identity, plus the measured reason the About window keeps no wordmark.
- 2026-9-26: Updated to Idexal v3.15.4, fixing the 3.15.3 startup-overlay crash caused by reading the store outside its provider, and giving the wordmark its intrinsic aspect ratio.
- 2026-9-26: Updated to Idexal v3.15.3, placing the official wordmark on the in-app startup overlay and fixing brand bitmap light/dark selection so it follows the app theme instead of the OS preference.
- 2026-9-26: Updated to Idexal v3.15.2, documenting the brand-visual acceptance criteria and known non-branding issues.
- 2026-9-26: Updated to Idexal v3.15.1, fixing `pnpm dev:web` failing to start on Windows due to shell quoting.
- 2026-9-26: Updated to Idexal v3.15.0, completing the full rebrand from the upstream ZCode project to Idexal. See [CHANGELOG.md](CHANGELOG.md) for the full record.
- 2026-9-23: Updated to Idexal v3.14.3.

## Setup

Install Git, Node.js **24.14.0**, and pnpm **10.33.2**. [mise.toml](mise.toml) is the source of truth for tool versions. Run all development and packaging commands below from the repository root.

```bash
pnpm bootstrap
```

`pnpm bootstrap` installs workspace dependencies, prepares local desktop runtime assets, and runs `build:bootstrap`.

The Agent CLI and runtime source code lives in [apps/idexal-cli/](apps/idexal-cli/) as a regular directory included when you clone this repository. No separate checkout or Git submodule initialization is required.

Additional setup and build commands:

| Command                        | Purpose                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                 | Install dependencies                                                                                                                |
| `pnpm prepare:desktop-runtime` | Prepare desktop runtime assets, including remote assets by default                                                                  |
| `pnpm prepare:remote-assets`   | Prepare remote runtime assets separately                                                                                            |
| `pnpm bootstrap:with-remote`   | Set up dependencies and local and remote assets, then build the relevant packages sequentially; skip the desktop application bundle |
| `pnpm build`                   | Recursively run each workspace package's build script, including its asset preparation steps                                        |

The default `bootstrap` skips remote asset preparation and is suitable for local desktop development. Run the corresponding preparation command when working with remote workspaces or validating remote distribution assets.

## Development and Usage

### Desktop

```bash
pnpm dev:desktop

# Use the test environment
pnpm dev:desktop:test
```

`pnpm dev:desktop` defaults to `pnpm dev:desktop:prod` and uses production service configuration. The startup script prepares local runtime assets, builds the desktop Agent, then starts Electron and source watchers.

Set `IDEXAL_DATA_BASE_DIR` to use a separate development data directory. For example, on macOS / Linux:

```bash
IDEXAL_DATA_BASE_DIR="$HOME/.idexal-dev-home" pnpm dev:desktop:test
```

### Remote Features (SSH/WSL)

Run `pnpm bootstrap:with-remote` first to prepare remote assets (mock-cdn), then `pnpm dev:desktop`. When connecting to a remote project, choose the "download locally, then upload" asset option. Development assets come from the local `packages/desktop/mock-cdn` directory and local build outputs, are uploaded to the remote host over SFTP, and never hit the CDN.

### Web Development

Use development mode when editing Web or backend source code:

```bash
pnpm dev:web

# Set the backend workspace (macOS / Linux)
IDEXAL_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

This starts both the Web development server (default: `http://localhost:5173`) and the backend (default: `http://localhost:3030`). Open the Web development server in your browser. `/ws` and general `/api` requests are proxied to the local backend; `/api/v1/oauth/token` is proxied separately to the configured product service.

After changing Agent source code, run `pnpm --filter @idexal/cli... build` and restart the service. To validate the complete distribution, extract and run it as described under Packaging → Idexal CLI distribution below.

### Idexal CLI distribution

The command-line distribution includes the TUI, Web client, and Agent behind one `idexal` command. With no arguments it starts the TUI; a leading `--web` starts Web mode; all other arguments go to the existing Agent CLI. Both modes run locally without Electron.

```bash
# Start the terminal UI by default
idexal

# Start the Web interface
idexal --web

# Set the project and port without opening a browser automatically
idexal --web --workspace /path/to/project --port 3030 --no-open

# Show CLI or Web options
idexal --help
idexal --web --help
```

In Web mode, it uses the current directory as the workspace, listens on `127.0.0.1` without token authentication by default, selects an available port, and opens a browser. Use the URL printed in the terminal and press `Ctrl+C` to stop the service. For LAN access, use `--host 0.0.0.0`; listening on a non-local address generates an access token by default. Use the token-bearing URL printed in the terminal. Set a token with `--token`, or disable token authentication with `--no-token`.

When starting the general Web service's HTTP entry directly, configure API/WebSocket authentication with `IDEXAL_SERVER_AUTH_TOKEN`. When creating the service programmatically, use the `authToken` option.

See Packaging below for build instructions. `pnpm build:idexal` only creates the distribution; it does not replace an existing `idexal` on `PATH`. If the command still points to an older installation or another checkout, check it with `command -v idexal` on macOS / Linux or `where.exe idexal` on Windows.

### CLI Source Development

Use the source entry when developing the TUI or Agent:

```bash
pnpm --filter @idexal/cli dev --help
pnpm --filter @idexal/cli dev

# Build the CLI and its workspace dependencies
pnpm --filter @idexal/cli... build
node apps/idexal-cli/packages/cli/dist/idexal.cjs --help
```

This entry runs the Agent CLI directly and does not handle the distribution's `--web` switch. Use `pnpm dev:web` for Web development, or the extracted `bin/idexal.mjs` shown below to test the unified command.

## Configuration

The root [.env.example](.env.example) provides sample service URLs and build configuration. Copy it to `.env` as needed and place local overrides in `.env.local`. Select the Desktop development environment with `dev:desktop:test` or `dev:desktop:prod`.

| Setting                               | Purpose                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `IDEXAL_DATA_BASE_DIR`                | Base directory for application data, stored under its `.idexal/` subdirectory           |
| `IDEXAL_SERVER_WORKSPACE`             | Workspace path for the Web backend                                                      |
| `IDEXAL_BUILTIN_PROVIDER_CONFIG_FILE` | Path to a local provider configuration file; uses the built-in configuration when unset |
| `IDEXAL_DIST_BASE_URL`                | Download base URL used by the CLI distribution installer                                |

Runtime variables can be set explicitly in the environment of the startup command. See [config/README.md](config/README.md) for the default configuration shipped with the client.

## Packaging

The root [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) is the source of truth for third-party notices. Declaration materials — component inventories, upstream license texts, bundled Node runtimes, and native-search archives — live in [third-party/](third-party/); `scripts/generate-third-party-notices.mjs` produces the notices and `scripts/third-party-notices.mjs` reads them during packaging and distribution checks.

### Desktop

```bash
pnpm bundle:desktop

# Set the target platform and CPU architecture
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

The default target is macOS arm64, and the default output directory is `packages/desktop/dist/`. `--os` accepts `mac`, `win`, or `linux`; `--arch` accepts `x64` or `arm64`. Packaging and signing require the tools and configuration for the target platform.

Installation: open the generated DMG and drag Idexal into "Applications". Local builds are unsigned, so macOS may block the first launch. If it does, run:

```bash
sudo xattr -rd com.apple.quarantine /Applications/Idexal.app
```

### Idexal CLI distribution

Run `pnpm build:idexal` to build the CLI/TUI, backend, and Web client, collect the TUI native libraries, workers, and runtime dependencies, then assemble the distribution. Running the distribution still requires Node.js; use the version specified in `mise.toml`.

Before packaging, set the download base URL with `IDEXAL_DIST_BASE_URL` in `.env`, `.env.local`, or the process environment, or pass it through `--base-url`. The URL below is a placeholder; replace it with your hosting URL when publishing:

```bash
pnpm build:idexal --base-url https://downloads.example.com/idexal/

# When IDEXAL_DIST_BASE_URL is already configured
pnpm build:idexal

# Repackage existing Agent, backend, and Web build outputs
pnpm build:idexal --skip-build

# Show options for the version, output directory, and more
pnpm build:idexal --help
```

The version defaults to the root `package.json` version. Output is written to `dist/idexal/`:

- `releases/<version>/idexal-<version>.tar.gz`: runtime package.
- `releases/<version>/sha256.txt`: checksum file.
- `latest.json` and `install.sh`: version index and installer.

Upload the entire directory to the configured download base URL. The installer downloads the runtime package from that URL, installs it to `~/.idexal/runtime` by default, and creates the `idexal` command in `~/.local/bin`. Override these directories with `IDEXAL_DIST_HOME` and `IDEXAL_DIST_BIN_DIR`, respectively.

Existing Lite users should switch to the new build command, environment variables, and installer. Installation does not remove old Lite directories or migrate/delete session data.

To test a packaged build locally, extract and run it directly without uploading or installing it:

```bash
idexal_version=$(node -p "require('./dist/idexal/latest.json').version")
mkdir -p dist/idexal/debug
tar -xzf "dist/idexal/releases/$idexal_version/idexal-$idexal_version.tar.gz" \
  -C dist/idexal/debug
# Start the TUI by default
node dist/idexal/debug/idexal/bin/idexal.mjs

# Start Web mode
node dist/idexal/debug/idexal/bin/idexal.mjs --web \
  --workspace "$PWD" --port 3030 --no-open
```

Open `http://127.0.0.1:3030` to validate the complete flow, with one backend serving the Web pages and running the Agent. The port must be available; if `pnpm dev:web` is already running, choose another `--port`.

## Repository Structure

| Directory                                            | Responsibility                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/desktop`                                   | Electron Main, Host, Renderer, and desktop packaging                                    |
| `packages/web`                                       | Web client                                                                              |
| `packages/server`                                    | HTTP / WebSocket services and remote connections                                        |
| `packages/idexal-server-cli`                         | Standalone server startup and process management                                        |
| `packages/ui`                                        | Shared React components, hooks, and Zustand state                                       |
| `packages/services`                                  | Business services and persistence                                                       |
| `packages/shared`, `packages/rpc`, `packages/client` | Shared protocols and types, RPC framework, and Agent client SDK                         |
| `packages/provider`, `packages/provider-node`        | Common provider capabilities and Node implementations                                   |
| `apps/idexal-cli`                                    | Agent CLI, TUI, runtime, and tools                                                      |
| `scripts`, `config`, `third-party`                   | Build and maintenance scripts, built-in configuration, and third-party notice materials |

## Project Notice

See [NOTICE.md](NOTICE.md) for feature and promotion scope, maintenance policy, execution and data risks, licensing, and third-party copyright information.

For product, deployment, and business questions, contact <contact@idexal.com>. For usage problems, prefer [GitHub Issues](https://github.com/idexal/idexal/issues).
