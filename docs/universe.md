# Agent Universe

The Universe is Agentis's multi-agent orchestration system. Give it a task and it spawns a fleet of specialized agents that each work a different angle, then synthesize into a single output.

---

## How It Works

```
Task input
    │
    ▼
Orchestrator plans the breakdown
    │
    ├── Researcher ──── gathers facts, sources
    ├── Analyst ─────── interprets data
    ├── Coder ───────── writes implementation
    ├── Writer ──────── drafts content
    ├── Reviewer ────── critiques output
    └── Summarizer ──── synthesizes everything
            │
            ▼
        Final output
```

Agents run in parallel where possible and hand off to each other when dependencies exist.

---

## Agent Roles

| Role | What it does |
|---|---|
| **Orchestrator** | Plans the task, assigns work to other agents |
| **Researcher** | Searches and gathers information |
| **Analyst** | Interprets data, identifies patterns |
| **Coder** | Writes complete, production-ready code |
| **Writer** | Drafts copy, reports, documentation |
| **Reviewer** | Critiques and improves outputs |
| **Planner** | Breaks down complex goals into steps |
| **Summarizer** | Condenses and synthesizes across agents |
| **Browser** | Navigates web pages (requires PinchTab — see below) |

---

## Running a Task

1. Open **Universe** in the sidebar
2. Type your task
3. Click **Launch**

The visualization shows each agent as a hexagonal node. Colors indicate status:
- **Pulsing** — thinking / working
- **Solid** — output complete
- **Dim** — waiting for dependency

---

## Configuring Agent Providers

Each agent role can be assigned a specific provider and model.

Go to **Settings → System** to configure which model each role uses. For example:
- Researcher → Groq (fast, free)
- Coder → Claude Sonnet 4.6 (best quality)
- Writer → GPT-4o

If the assigned provider fails, Agentis automatically falls back to any other configured provider.

---

## Web Search

To enable web search in Universe tasks:

1. Get a Tavily API key from [tavily.com](https://tavily.com)
2. Go to Settings → Providers → Tavily
3. Paste your key

Agents with the Researcher role will automatically use it when the task requires current information.

---

## Memory Integration

After a Universe run completes, click **Save to Memory** to persist the output. Future runs will have context from previous tasks for that agent role.

See [Memory](./memory.md) for details.

---

## Skills

Assign skills from the skills.sh registry to specific agent roles to give them domain-specific knowledge. For example, assign the "Frontend Design" skill to the Coder role.

See [Skills](./skills.md) for details.

---

## Browser Agent

> **Requires PinchTab** — an external browser automation service.

The Browser agent role can navigate web pages, click elements, fill forms, and extract content.

To enable it:

```bash
# Install PinchTab
npm install -g pinchtab --prefix ~/.npm-global

# Start the server
~/.npm-global/bin/pinchtab server

# Get your token
cat ~/.pinchtab/config.json
```

Then go to **Hands → Configure PinchTab Token** and paste the token.

Without PinchTab, browser tasks will return an error message — all other agent roles continue working normally.

---

## Coming Soon

- **Agent-to-agent messaging** — agents communicating directly mid-task without waiting for synthesis
- **Custom agent topologies** — define your own agent graph (who talks to whom)
- **Persistent agent sessions** — agents that remember context across multiple Universe runs without manual "Save to Memory"
- **Agent approval gates** — pause execution at a defined step and wait for human review before continuing
