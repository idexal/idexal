# Multi-Agent AI System

**Document Type:** Explanation (Understanding-oriented)
**Audience:** Users and developers understanding the AI architecture
**Goal:** Explain how multiple AI agents collaborate in Idexal IDE

---

## Overview

Idexal IDE features a **multi-agent AI system** where specialized agents collaborate to assist developers. Unlike simple chatbots, these agents have distinct capabilities, can hand off tasks, and work together on complex problems.

---

## Agent Types

### Core Agents

| Agent | Specialization | Use Cases |
|---|---|---|
| **Code Agent** | General coding | Writing functions, refactoring, explanations |
| **Review Agent** | Code quality | Code review, best practices, suggestions |
| **Debug Agent** | Bug detection | Finding bugs, error analysis, fixes |
| **Architect Agent** | System design | Architecture, patterns, scalability |
| **Test Agent** | Testing | Unit tests, integration tests, coverage |
| **DevOps Agent** | Operations | CI/CD, deployment, infrastructure |
| **Security Agent** | Security | Vulnerability detection, hardening |
| **Performance Agent** | Optimization | Profiling, bottlenecks, improvements |

---

## How It Works

### 1. User Request

When you ask a question or request help:

```
User: "Fix the memory leak in the WebSocket handler"
```

### 2. Agent Orchestration

The **Orchestrator** analyzes the request and routes it to the most appropriate agent:

```
Orchestrator: "This is a debugging task → Debug Agent"
```

### 3. Agent Execution

The selected agent works on the task:

```
Debug Agent:
1. Analyzes the WebSocket handler code
2. Identifies the memory leak (event listener not removed)
3. Proposes a fix
4. Generates the corrected code
```

### 4. Collaboration (If Needed)

For complex tasks, agents can collaborate:

```
Debug Agent: "Found the leak, but the fix affects the API surface"
    ↓
Architect Agent: "Review the API implications"
    ↓
Code Agent: "Implement the fix with backward compatibility"
```

### 5. Response

The combined result is presented to the user with:
- The solution
- Explanation of the problem
- Any related considerations

---

## Agent Communication

Agents communicate through a shared context:

```
┌─────────────────────────────────────┐
│         Shared Context              │
│  ┌─────────┐ ┌─────────────────┐   │
│  │ Current │ │   Conversation  │   │
│  │  File   │ │     History     │   │
│  └─────────┘ └─────────────────┘   │
│  ┌─────────┐ ┌─────────────────┐   │
│  │ Project │ │    Selected     │   │
│  │  Config │ │     Code        │   │
│  └─────────┘ └─────────────────┘   │
└─────────────────────────────────────┘
         ↑           ↑
    ┌────┴───┐   ┌───┴────┐
    │ Debug  │   │ Archi- │
    │ Agent  │   │ tect   │
    │        │   │ Agent  │
    └────────┘   └────────┘
```

### Context Fields

| Field | Purpose |
|---|---|
| `currentFile` | The file being edited |
| `selectedCode` | Highlighted code block |
| `projectType` | Language, framework, etc. |
| `conversationHistory` | Previous messages |
| `workspaceRoot` | Project root directory |

---

## Agent Selection Logic

The Orchestrator uses a simple heuristic:

1. **Keyword analysis** — "bug", "error", "fix" → Debug Agent
2. **Code context** — Editing a test file → Test Agent
3. **User preference** — Previously selected agent
4. **Fallback** — Code Agent (general purpose)

### Example Routing

| User Message | Selected Agent |
|---|---|
| "Explain this function" | Code Agent |
| "Review my pull request" | Review Agent |
| "Why is this slow?" | Performance Agent |
| "Add authentication" | Architect Agent |
| "Write unit tests" | Test Agent |
| "Deploy to production" | DevOps Agent |
| "Check for SQL injection" | Security Agent |

---

## Custom Agents

You can define custom agents in `.idexal/agents/`:

```json
{
  "name": "Documentation Agent",
  "description": "Writes and maintains documentation",
  "systemPrompt": "You are a technical writer specializing in software documentation...",
  "capabilities": ["write-docs", "update-readme", "generate-api-docs"],
  "model": "gpt-4"
}
```

### Agent Definition Fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Agent display name |
| `description` | string | What the agent does |
| `systemPrompt` | string | Agent's personality and rules |
| `capabilities` | string[] | What the agent can do |
| `model` | string | Preferred AI model |

---

## Performance Considerations

### Token Usage

Each agent interaction consumes tokens. The system optimizes by:
- Reusing context across agents
- Caching common patterns
- Limiting context to relevant code

### Latency

Agent selection adds ~100ms overhead. For simple requests, the Code Agent is used directly without orchestration.

---

## Future Directions

### Planned Enhancements

1. **Agent Teams** — Multiple agents working in parallel
2. **Learning Agents** — Agents that improve from feedback
3. **Domain Specialists** — Agents trained on specific codebases
4. **Autonomous Agents** — Agents that can plan and execute multi-step tasks

---

*Document: Explanation — Multi-Agent AI System*
*Audience: Users and developers*
*Last updated: August 2026*