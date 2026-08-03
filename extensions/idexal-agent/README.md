# Idexal Agent

Idexal's own chat participant for VS Code — **independent of GitHub Copilot**.

Ask `@idexal` anything in the chat panel and a fleet of agents (planner →
executors → reviewer) works through the task with tools, streaming the answer
live while a **visual task list** tracks each step.

## Features

- **`@idexal` chat participant** — built on the stable `vscode.chat` API, no
  Copilot dependency. Invoke it with `@idexal <task>`.
- **Multi-agent orchestration** — powered by the Idexal AI Core: planning,
  parallel execution, tool calls (read/write files, run commands, search),
  and an automatic reviewer.
- **Live streaming** — tokens stream into the chat as they're produced, with
  provider-switch and tool-call progress events.
- **Visual task list** — a dedicated view (Idexal icon in the Activity Bar)
  shows the plan steps with `pending / running / done / failed` status that
  updates live. Cancel from the view title bar.
- **Multi-provider fallback** — Anthropic, OpenAI, OpenRouter, Groq, Ollama
  (local), LM Studio, any OpenAI-compatible endpoint, or the free built-in
  **Idexal Cloud** gateway. Providers fail over automatically.
- **Long-term memory** — previous sessions inform future tasks; semantic
  recall via embeddings when available.

## How it works

The extension spawns the **Idexal AI Core** as a child process:

```
node <ai-core>/src/cli.ts stream "<task>"   →  NDJSON events on stdout
```

`plan` / `step-status` events update the task tree; `delta` events stream
into the chat; `done` / `error` conclude the response. Everything runs
locally — no cloud round-trips unless you configure the Idexal Cloud gateway.

## Setup

1. **Install the AI Core** (or point the extension at a checkout):
   - `$IDEXAL_AI_CORE` environment variable (path to `src/cli.ts` or its folder), or
   - the `idexal.aiCorePath` setting, or
   - a `idexal/ai-core` folder next to this extension (dev layout).
2. **Node ≥ 22.6** on PATH (or `$IDEXAL_NODE` / the `idexal.nodePath` setting).
3. **Configure a provider** in `~/.idexal/config.json` or via environment
   variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …). With no keys, the
   free **Idexal Cloud** tier is tried first when nothing else is usable, and
   a local Ollama server is picked up automatically.

## Development

```sh
# From the repo root, compile the extension
npm run compile-client          # compiles all extensions including this one
# or just this one:
cd extensions/idexal-agent && npm run compile
```

Run the extension host with F5 (or `npm run watch` + the Extension
Development Host) and open the chat panel to try `@idexal`.
