<div align="center">

# ⚡ Idexal

**The open AI development platform — a strong alternative to Claude Code & Codex**

Desktop IDE for every platform · Custom CLI terminal · 118 bundled agent skills

[![Website](https://img.shields.io/badge/web-idexal.com-34d399)](https://idexal.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

</div>

---

## 🧭 The Ecosystem

| Repository | What it is | Status |
|---|---|---|
| 🖥️ [**idexal-ide**](https://github.com/idexal/idexal-ide) | Multi-agent AI desktop IDE — Electron + React + Monaco + Rust engine. 90 panels, multi-provider AI with fallback chains, full git suite, collaboration. | ![active](https://img.shields.io/badge/status-active-34d399) |
| 💻 [**idexal-cli**](https://github.com/idexal/idexal-cli) | `idexa` — AI-powered terminal assistant. Chat, generate, analyze & review code from the command line. | ![active](https://img.shields.io/badge/status-active-34d399) |
| 🧩 [**idexal-skills**](https://github.com/idexal/idexal-skills) | 118+ production-ready agent skills (SKILL.md), loaded automatically by Idexal agents. | ![active](https://img.shields.io/badge/status-active-34d399) |
| 🌐 [**idexal-website**](https://github.com/idexal/idexal-website) | Official website & documentation — idexal.com. | ![wip](https://img.shields.io/badge/status-wip-fbbf24) |

## 🚀 Quick Start

### Desktop IDE

```bash
git clone https://github.com/idexal/idexal-ide.git
cd idexal-ide && npm install
npm run dev        # develop
npm run dist:win   # or dist:mac / dist:linux
```

### Terminal CLI

```bash
npm install -g idexa-cli
idexa init && idexa chat
```

## 🗺️ Roadmap

- **IDE** — plugin marketplace, remote workspaces, AI agent teams
- **CLI** — session resume, MCP tool marketplace, headless agent mode
- **Skills** — community contributions, versioned skill packs
- **Platform** — cloud sync, team sharing

## 📄 License

MIT © [Zakariae Lahbabi](https://github.com/lahbabidev)
