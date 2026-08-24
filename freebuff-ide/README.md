# 🚀 Freebuff IDE

**Professional Multi-Agent AI-Powered Development Environment**

A cutting-edge IDE built with Rust and Electron, featuring multiple AI agents that collaborate to help you write, review, debug, and architect code.

## ✨ Features

### 🤖 Multi-Agent System
- **Code Agent**: Writes, edits, and refactors code with best practices
- **Review Agent**: Reviews code for quality, security, and performance
- **Debug Agent**: Finds and fixes bugs with systematic debugging
- **Architect Agent**: Plans system architecture and design patterns
- **Test Agent**: Writes comprehensive tests and test strategies

### 🧠 Intelligent Memory
- **Project Memory**: Understands your codebase structure
- **Conversation Memory**: Maintains context across sessions
- **Code Index**: Fast symbol search and navigation
- **Vector Store**: Semantic similarity search

### 📝 Professional Editor
- **Monaco Editor**: Same engine as VS Code
- **Multi-tab Support**: Work with multiple files
- **Split View**: Side-by-side editing
- **Syntax Highlighting**: 50+ languages
- **IntelliSense**: Smart code completion

### 🖥️ Integrated Terminal
- **Multiple Sessions**: Run several terminals
- **Command History**: Access previous commands
- **Real PTY**: Full terminal emulation

### 🎨 Modern UI
- **Dark Theme**: Easy on the eyes
- **Resizable Panels**: Customize your workspace
- **Keyboard Shortcuts**: Power user friendly
- **Command Palette**: Quick access to all features

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Monaco Editor** - Code editing
- **Lucide React** - Icons

### Backend
- **Rust** - High-performance engine
- **NAPI-RS** - Node.js bindings
- **Tree-sitter** - Code parsing
- **Tokio** - Async runtime
- **Dashmap** - Concurrent data structures

### Desktop
- **Electron** - Desktop app framework
- **Vite** - Build tool
- **TypeScript** - Type safety

## 📦 Installation

### Prerequisites
- Node.js 18+
- Rust toolchain
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Rust Engine

```bash
# Build Rust engine
npm run build:rust

# Or manually
cd rust-engine
cargo build --release
```

## 🎯 Usage

### Opening Files
- Press `⌘O` (Mac) or `Ctrl+O` (Windows/Linux)
- Use the File Explorer in the sidebar
- Drag and drop files

### AI Agents
1. Open the AI Chat panel (`⌘⇧A`)
2. Select an agent from the dropdown
3. Type your request
4. Get intelligent responses

### Keyboard Shortcuts
- `⌘K` - Command Palette
- `⌘B` - Toggle Sidebar
- `⌘`` - Toggle Terminal
- `⌘⇧A` - Toggle AI Chat
- `⌘S` - Save File
- `⌘⇧P` - Command Palette (VS Code style)

## 🏗️ Architecture

```
freebuff-ide/
├── electron/           # Electron main process
├── rust-engine/        # Rust backend engine
│   ├── src/
│   │   ├── agent/      # Multi-agent system
│   │   ├── memory/     # Memory management
│   │   └── parser/     # Code parsing
│   └── Cargo.toml
├── src/               # React UI
│   ├── components/    # UI components
│   ├── stores/        # State management
│   ├── hooks/         # Custom hooks
│   └── utils/         # Utilities
└── package.json
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file:
```env
# AI Provider Configuration
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# IDE Settings
DEFAULT_THEME=dark
AUTO_SAVE=true
```

### Settings
Access settings via Command Palette or `⌘,`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Monaco Editor team
- Electron team
- Rust community
- All contributors

---

**Built with ❤️ using Rust + Electron + React**
