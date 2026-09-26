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
