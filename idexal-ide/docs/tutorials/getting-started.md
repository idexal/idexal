# Getting Started with Idexal IDE

**Document Type:** Tutorial (Learning-oriented)
**Audience:** New users with basic development experience
**Goal:** Install Idexal IDE, configure an AI provider, and complete your first AI-assisted coding task

---

## Prerequisites

Before you begin, ensure you have:

- **Windows 10/11**, **macOS 12+**, or **Ubuntu 20.04+**
- An internet connection (for AI features)
- A text editor or IDE experience (helpful but not required)

---

## Step 1: Download and Install

### Windows

1. Download the installer from [releases](https://github.com/idexal/idexal-ide/releases)
2. Run `Idexal-IDE-1.0.0-Windows-x64.exe`
3. Follow the installation wizard:
   - Choose installation directory
   - Select components (Desktop Shortcut, Start Menu)
   - Click **Install**
4. Launch Idexal IDE from your desktop or Start Menu

### macOS

1. Download the `.dmg` file from [releases](https://github.com/idexal/idexal-ide/releases)
2. Open the disk image
3. Drag **Idexal IDE** to your Applications folder
4. Launch from Applications or Spotlight

### Linux

**AppImage (recommended):**
```bash
chmod +x Idexal-IDE-1.0.0-Linux-x64.AppImage
./Idexal-IDE-1.0.0-Linux-x64.AppImage
```

**Debian/Ubuntu:**
```bash
sudo dpkg -i Idexal-IDE-1.0.0-Linux-x64.deb
```

**Fedora/RHEL:**
```bash
sudo rpm -i Idexal-IDE-1.0.0-Linux-x64.rpm
```

---

## Step 2: First Launch

When you first launch Idexal IDE, you'll see the **Welcome Screen** with:

- **Quick Actions** — Open File, New File, Open Folder
- **AI Chat Panel** — Ready to assist with coding tasks
- **Welcome Tour** — Interactive guide to key features

---

## Step 3: Configure an AI Provider

To use AI features, connect to an AI provider:

### Option A: Custom Gateway (Recommended)

If you have access to an OpenAI-compatible API:

1. Open the AI Chat panel (click the **AI** button in the title bar)
2. Click **Settings** (gear icon)
3. Enter your API endpoint and key
4. Select a model from the dropdown

### Option B: OpenAI

1. Go to **Settings** → **AI Providers**
2. Select **OpenAI**
3. Enter your API key (`sk-...`)
4. Choose a model (GPT-4 recommended)

### Option C: Anthropic

1. Go to **Settings** → **AI Providers**
2. Select **Anthropic**
3. Enter your API key (`sk-ant-...`)
4. Choose a model (Claude 3 Opus recommended)

---

## Step 4: Open a Project

1. Click **Open Folder** or press `Ctrl+O` / `⌘O`
2. Navigate to your project directory
3. Click **Select Folder**

The file explorer will populate with your project's file tree.

---

## Step 5: Your First AI-Assisted Task

Let's try asking the AI to explain some code:

1. Open a source file (e.g., `index.ts`)
2. Select a function or block of code
3. Open the AI Chat panel (`Ctrl+Shift+A`)
4. Type: **"Explain this code"**
5. Press **Enter**

The AI will analyze the selected code and provide an explanation.

---

## Step 6: Explore Key Features

### Command Palette
Press `Ctrl+K` / `⌘K` to open the Command Palette. This gives you quick access to all IDE commands.

### Terminal
Press `Ctrl+`` to toggle the built-in terminal. It supports:
- Multiple tabs
- Full xterm.js emulation
- Shell integration

### Git Integration
Click the **Git** icon in the Activity Bar to:
- View changes
- Stage and commit files
- Switch branches
- View commit history

### AI Agents
The AI Chat panel includes specialized agents:
- **Code Agent** — General coding assistance
- **Review Agent** — Code review and quality
- **Debug Agent** — Bug detection and fixes
- **Architect Agent** — System design guidance

---

## Next Steps

- [Configure AI Providers](../how-to/configure-ai-providers.md) — Set up multiple AI providers
- [Customize Keybindings](../how-to/customize-keybindings.md) — Configure keyboard shortcuts
- [CLI Usage](../reference/cli-commands.md) — Use the command-line interface
- [Architecture Overview](../explanation/architecture.md) — Understand how the IDE works

---

## Troubleshooting

### AI features not working
- Check that an AI provider is configured in Settings
- Verify your API key is correct
- Ensure you have internet connectivity

### Terminal not opening
- Try restarting the IDE
- Check that your shell is installed and accessible

### File explorer not updating
- Click the **Refresh** button in the explorer panel
- Check file permissions

---

*Document: Tutorial — Getting Started with Idexal IDE*
*Audience: New users*