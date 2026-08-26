# Development Environment Setup

**Document Type:** Tutorial (Learning-oriented)
**Audience:** Contributors and developers building Idexal IDE from source
**Goal:** Set up a complete development environment and run the IDE locally

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime |
| **npm** | 10+ | Package manager |
| **Rust** | 1.77+ | Rust engine compilation |
| **Cargo** | 1.77+ | Rust package manager |
| **Git** | 2.40+ | Version control |

### Optional Tools

| Tool | Purpose |
|---|---|
| **Python 3.12+** | Building installer bitmaps |
| **sharp** | Image processing for installer assets |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/idexal/idexal-ide.git
cd idexal-ide
```

---

## Step 2: Install Node.js Dependencies

```bash
npm install
```

This installs:
- React, Monaco Editor, xterm.js (UI)
- Electron (desktop runtime)
- Tailwind CSS (styling)
- Vitest (testing)
- electron-builder (packaging)

---

## Step 3: Install Rust Toolchain

If you don't have Rust installed:

```bash
# Install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH (Linux/macOS)
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

---

## Step 4: Build the Rust Engine

```bash
cd rust-engine
cargo build --release
cd ..
```

This compiles:
- **Parser module** — Tree-sitter based code parsing
- **Vector store** — Semantic search with embeddings
- **Code index** — Full-text code indexing

The build takes 2-5 minutes on first run.

---

## Step 5: Start Development Server

### Full Stack (Recommended)

```bash
npm run dev
```

This starts:
1. Vite dev server (hot reload)
2. Electron window (auto-connects to Vite)

### Frontend Only

```bash
npm run vite
```

Opens the IDE in your browser at `http://localhost:5173`.

---

## Step 6: Verify the Setup

1. The IDE should open in a new window
2. Check that the **Welcome Tab** renders correctly
3. Open the **AI Chat** panel and verify the provider list loads
4. Open the **Terminal** and verify it responds to commands
5. Run the test suite:

```bash
npm test
```

All tests should pass (53+ tests).

---

## Project Structure

```
idexal-ide/
├── electron/              # Electron main process
│   ├── src/
│   │   ├── main.ts       # Entry point
│   │   ├── preload.ts    # IPC bridge
│   │   └── updater.ts    # Auto-updater
│   └── tsconfig.json
├── src/                   # React renderer
│   ├── components/        # UI components
│   ├── services/          # Business logic
│   ├── stores/            # Zustand state
│   ├── hooks/             # React hooks
│   └── styles/            # CSS/Tailwind
├── rust-engine/           # Rust NAPI-RS engine
│   ├── src/
│   │   ├── lib.rs        # Entry point
│   │   ├── parser/       # Code parsing
│   │   └── vector_store/ # Semantic search
│   └── Cargo.toml
├── bin/                   # CLI entry points
├── build/                 # Build assets (icons, NSIS)
├── docs/                  # Documentation
└── package.json
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start full development stack |
| `npm run vite` | Start Vite dev server only |
| `npm test` | Run test suite |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint checking |
| `npm run dist:win` | Build Windows installer |
| `npm run dist:mac` | Build macOS DMG |
| `npm run dist:linux` | Build Linux packages |

---

## IDE Configuration for Development

### VS Code

Install recommended extensions:
- ESLint
- Tailwind CSS IntelliSense
- rust-analyzer
- ESLint

### WebStorm/WebStorm

- Enable TypeScript service
- Configure ESLint integration
- Set up Tailwind CSS support

---

## Troubleshooting

### Rust build fails

```bash
# Update Rust toolchain
rustup update

# Clean and rebuild
cd rust-engine
cargo clean
cargo build --release
```

### Vite dev server won't start

```bash
# Kill any existing processes on port 5173
lsof -ti:5173 | xargs kill -9

# Try again
npm run vite
```

### Electron window is blank

1. Ensure Vite dev server is running
2. Check that `localhost:5173` is accessible
3. Try restarting both servers

### Tests failing

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm test
```

---

## Next Steps

- [Architecture Overview](../explanation/architecture.md) — Understand the system design
- [API Reference](../reference/api.md) — IPC channels and services
- [Contributing Guidelines](../how-to/contributing.md) — How to contribute

---

*Document: Tutorial — Development Environment Setup*
*Audience: Contributors and developers*