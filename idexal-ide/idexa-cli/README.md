# 🚀 Idexa CLI

**AI-Powered Development Assistant - Competing with Claude Code & Codex**

Idexa CLI is a powerful command-line tool that brings AI-assisted coding directly to your terminal. Write, analyze, generate, and debug code with the power of artificial intelligence.

## ✨ Features

- **Interactive AI Chat** - Have natural conversations about your code
- **Code Generation** - Generate code from natural language descriptions
- **Code Analysis** - Detect bugs, security issues, and improvements
- **Smart Context** - Automatically understand your project structure
- **Multi-Model Support** - Works with OpenAI, Anthropic, and local models
- **Agent System** - Create custom AI agents for specific tasks
- **Git Integration** - AI-powered commit messages and code review

## 📦 Installation

```bash
npm install -g idexa-cli
```

Or using yarn:
```bash
yarn global add idexa-cli
```

## 🚀 Quick Start

### 1. Initialize in your project
```bash
cd your-project
idexa init
```

### 2. Login to your account
```bash
idexa login
```

### 3. Start chatting with AI
```bash
idexa chat
```

## 📚 Commands

### Chat
Start an interactive AI coding session:
```bash
idexa chat
idexa chat "explain this codebase"
idexa chat -m gpt-4
```

### Analyze
Analyze your code for issues:
```bash
idexa analyze
idexa analyze ./src --type security
idexa analyze --fix
```

### Generate
Generate code from descriptions:
```bash
idexa generate "create a REST API endpoint"
idexa generate "add error handling" -l typescript -o utils.ts
```

### Test
Run tests with AI assistance:
```bash
idexa test
idexa test --coverage
idexa test --fix
```

### Context
Manage AI context:
```bash
idexa context --list
idexa context --add "src/**/*.ts"
idexa context --smart
```

### Agent
Create and run custom AI agents:
```bash
idexa agent list
idexa agent create code-reviewer
idexa agent run code-reviewer
```

### Config
Manage configuration:
```bash
idexa config list
idexa config set defaultModel gpt-4
idexa config get aiProvider
```

### Doctor
Check system compatibility:
```bash
idexa doctor
```

## ⚙️ Configuration

### Project Configuration (.idexa.json)
```json
{
  "name": "my-project",
  "aiProvider": {
    "type": "openai",
    "apiKey": "sk-..."
  },
  "defaultModel": "gpt-4",
  "features": {
    "autoContext": true,
    "streaming": true
  }
}
```

### Global Configuration (~/.idexa/config.json)
```json
{
  "user": {
    "email": "you@example.com",
    "plan": "pro"
  },
  "aiProvider": {
    "type": "openai"
  }
}
```

## 🤖 AI Providers

### OpenAI
```bash
idexa config set aiProvider.type openai
idexa config set aiProvider.apiKey sk-...
```

### Anthropic (Claude)
```bash
idexa config set aiProvider.type anthropic
idexa config set aiProvider.apiKey sk-ant-...
```

### Local (Ollama)
```bash
idexa config set aiProvider.type local
idexa config set aiProvider.baseUrl http://localhost:11434
```

### Custom Endpoint
```bash
idexa config set aiProvider.type custom
idexa config set aiProvider.baseUrl https://your-api.com
idexa config set aiProvider.apiKey your-key
```

## 🎯 Chat Commands

While in chat mode:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear conversation history |
| `/model` | Change AI model |
| `/context` | Show current context |
| `/add` | Add files to context |
| `/remove` | Remove files from context |
| `/history` | Show command history |
| `/save` | Save conversation |
| `/load` | Load conversation |
| `exit` | Exit chat |

## 🔧 Environment Variables

```bash
OPENAI_API_KEY=sk-...        # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-... # Anthropic API key
IDEXA_VERBOSE=true           # Enable verbose output
```

## 📁 Project Structure

```
your-project/
├── .idexa.json          # Project configuration
├── .idexa/
│   └── agents/          # Custom agents
├── src/
│   └── ...
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Links

- [GitHub](https://github.com/idexal/idexa-cli)
- [Documentation](https://idexa.com/docs)
- [Report Issues](https://github.com/idexal/idexa-cli/issues)

---

**Built with ❤️ by [Idexal](https://idexal.com)**
