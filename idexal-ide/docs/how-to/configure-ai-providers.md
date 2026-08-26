# How to Configure AI Providers

**Document Type:** How-to Guide (Problem-oriented)
**Audience:** Users who want to set up AI-powered features
**Goal:** Successfully configure one or more AI providers for code assistance

---

## Overview

Idexal IDE supports multiple AI providers. You can configure one or several, and switch between them as needed.

### Supported Providers

| Provider | Models | Auth |
|---|---|---|
| **Custom Gateway** | Any OpenAI-compatible model | API Key |
| **OpenAI** | GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 | API Key |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | API Key |
| **Local (Ollama)** | Any locally-hosted model | None |

---

## Option 1: Custom Gateway

This is the recommended option if you have access to an OpenAI-compatible API endpoint.

### Steps

1. Open **Settings** (`Ctrl+,` / `⌘,`)
2. Click **AI Providers**
3. Select **Custom Gateway**
4. Enter:
   - **Endpoint URL**: `http://your-server:port/v1`
   - **API Key**: Your authentication key
5. Click **Fetch Models** to load available models
6. Select a default model from the dropdown
7. Click **Save Settings**

### Example Configuration

```
Endpoint: http://localhost:20128/v1
API Key: sk-abe6a69fb904d1d4-641e8b-7a6e4185
Default Model: auto/best-coding
```

---

## Option 2: OpenAI

### Steps

1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Open **Settings** → **AI Providers**
3. Select **OpenAI (GPT-4)**
4. Paste your API key
5. Select a model:
   - **GPT-4** — Best quality, slower
   - **GPT-4 Turbo** — Fast with good quality
   - **GPT-4o** — Multimodal, fastest
   - **GPT-3.5 Turbo** — Budget option
6. Click **Save Settings**

---

## Option 3: Anthropic

### Steps

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. Open **Settings** → **AI Providers**
3. Select **Anthropic (Claude)**
4. Paste your API key
5. Select a model:
   - **Claude 3 Opus** — Most capable
   - **Claude 3 Sonnet** — Balanced
   - **Claude 3 Haiku** — Fastest
6. Click **Save Settings**

---

## Option 4: Local Models (Ollama)

### Prerequisites

Install Ollama:
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com
```

### Steps

1. Start Ollama:
   ```bash
   ollama serve
   ```

2. Pull a model:
   ```bash
   ollama pull codellama
   ```

3. Open **Settings** → **AI Providers**
4. Select **Local Model (Ollama)**
5. Enter:
   - **API URL**: `http://localhost:11434`
   - **Model Name**: `codellama` (or your model name)
6. Click **Save Settings**

---

## Switching Between Providers

1. Open the AI Chat panel
2. Click the **Settings** (gear) icon
3. Click **Switch Provider**
4. Select the desired provider from the list

---

## Testing Your Configuration

1. Open the AI Chat panel (`Ctrl+Shift+A`)
2. Type: **"Hello, what model are you?"**
3. Press **Enter**

If configured correctly, you should see a response from the AI.

---

## Troubleshooting

### "No AI provider configured"
- Ensure you've saved your settings
- Check that the provider is enabled

### Connection refused
- Verify the API endpoint URL
- Check that the service is running
- Ensure no firewall is blocking the connection

### Invalid API key
- Regenerate your API key in the provider's dashboard
- Ensure no extra whitespace in the key

### Model not found
- Verify the model name matches exactly
- Check that the model is available on your account

---

*Document: How-to Guide — Configure AI Providers*
*Audience: Users setting up AI features*