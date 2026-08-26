# CLI Commands Reference

**Document Type:** Reference (Information-oriented)
**Audience:** Developers and power users using the command-line interface
**Goal:** Complete reference for all `idexal` CLI commands

---

## Installation

### From Source
```bash
# Build the Rust engine
cd rust-engine
cargo build --release

# The binary is at:
# rust-engine/target/release/idexal
```

### From Release
Download the latest release from [GitHub Releases](https://github.com/idexal/idexa-cli/releases).

---

## Usage

```bash
idexal [command] [options]
```

---

## Commands

### `idexal about`

Display information about Idexal IDE and its creators.

**Usage:**
```bash
idexal about
idexal about --json    # Machine-readable JSON output
```

**Output:**
```
┌─────────────────────────────────────────┐
│           IDEXAL IDE                    │
│         Professional AI IDE             │
├─────────────────────────────────────────┤
│ Founder: Zakariae Lahbabi              │
│ Website: zakariaelahbabi.com           │
│ Email: info@zakariaelahbabi.com        │
├─────────────────────────────────────────┤
│ GitHub: github.com/idexal              │
│ IDE: github.com/idexal/idexal-ide      │
│ CLI: github.com/idexal/idexa-cli       │
└─────────────────────────────────────────┘
```

---

### `idexal serve`

Start the Idexal IDE development server.

**Usage:**
```bash
idexal serve                    # Start on default port
idexal serve --port 3000        # Start on specific port
idexal serve --host 0.0.0.0     # Bind to all interfaces
```

**Options:**
| Option | Description | Default |
|---|---|---|
| `--port, -p` | Port to listen on | `5173` |
| `--host, -h` | Host to bind to | `localhost` |
| `--open, -o` | Open browser automatically | `false` |

---

### `idexal open`

Open a project directory in the IDE.

**Usage:**
```bash
idexal open                    # Open current directory
idexal open /path/to/project   # Open specific directory
idexal open .                  # Open current directory
```

**Options:**
| Option | Description |
|---|---|
| `<path>` | Path to project directory (defaults to cwd) |

---

### `idexal chat`

Start an interactive AI chat session.

**Usage:**
```bash
idexal chat                          # Interactive mode
idexal chat "explain this code"      # Single message
idexal chat --model gpt-4            # Use specific model
```

**Options:**
| Option | Description | Default |
|---|---|---|
| `--model, -m` | AI model to use | Config default |
| `--provider, -p` | AI provider | Config default |
| `--stream` | Stream responses | `true` |

---

### `idexal index`

Index the current project for AI-assisted search.

**Usage:**
```bash
idexal index                # Index current directory
idexal index --rebuild      # Force rebuild index
```

**Options:**
| Option | Description |
|---|---|
| `--rebuild` | Force rebuild the entire index |
| `--exclude <patterns>` | Exclude file patterns |

---

### `idexal config`

Manage IDE configuration.

**Usage:**
```bash
idexal config list                    # Show all settings
idexal config get <key>               # Get a setting
idexal config set <key> <value>       # Set a setting
idexal config reset                   # Reset to defaults
```

**Examples:**
```bash
idexal config set theme dark
idexal config get editor.fontSize
idexal config set ai.provider openai
```

---

### `idexal update`

Check for and install updates.

**Usage:**
```bash
idexal update check         # Check for updates
idexal update install       # Install latest version
```

---

## Global Options

| Option | Description |
|---|---|
| `--help, -h` | Show help for command |
| `--version, -v` | Show version number |
| `--verbose` | Enable verbose output |
| `--quiet, -q` | Suppress output |

---

## Configuration Files

The CLI reads configuration from:

| File | Purpose |
|---|---|
| `~/.idexal/config.json` | User-level configuration |
| `.idexal/config.json` | Project-level configuration |
| `~/.idexal/keybindings.json` | Custom keybindings |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `IDEXAL_API_KEY` | Default API key | — |
| `IDEXAL_MODEL` | Default model | — |
| `IDEXAL_PROVIDER` | Default provider | — |
| `IDEXAL_PORT` | Default serve port | `5173` |
| `IDEXAL_LOG_LEVEL` | Log verbosity | `info` |

---

*Document: Reference — CLI Commands*
*Audience: Developers using the CLI*