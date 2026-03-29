# Getting Started with Agentis

> Deploy fleets of specialized AI agents across 12 LLM providers simultaneously.

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- At least one LLM provider API key (see [Providers](./providers.md))

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dhwanil25/Agentis.git
cd Agentis

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## First Run

When you open Agentis for the first time, you'll see a setup prompt asking for an API key.

**Minimum to get started:** An Anthropic API key (`sk-ant-...`).

1. Go to **Settings → Providers**
2. Paste your Anthropic API key
3. Click **Save**

That's it. You can now run tasks in **Chat** and **Universe**.

---

## Running Your First Task

### Option A — Chat (single agent)

1. Click **Chat** in the sidebar
2. Select a persona (e.g., `dev`, `analyst`, `writer`)
3. Type a task and press Enter

The agent will run a multi-step pipeline and stream the output live.

### Option B — Universe (multi-agent)

1. Click **Universe** in the sidebar
2. Type a complex task (e.g., *"Research the top 5 AI coding tools and write a comparison report"*)
3. Click **Launch**

Multiple specialized agents spawn in parallel — each working a different angle, then synthesizing into one output.

---

## Adding More Providers

Agentis supports 12 LLM providers. Each one is optional. See [Providers](./providers.md) for keys and setup.

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy anywhere static files are served — Vercel, Netlify, Cloudflare Pages, or self-hosted nginx.

---

## Next Steps

| Topic | Doc |
|---|---|
| Multi-agent system | [universe.md](./universe.md) |
| All 12 providers | [providers.md](./providers.md) |
| Persistent memory | [memory.md](./memory.md) |
| Skills system | [skills.md](./skills.md) |
| Workflow templates | [workflows.md](./workflows.md) |
| Codebase architecture | [architecture.md](./architecture.md) |
