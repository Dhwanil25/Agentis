<div align="center">

<br />

<img src="public/favicon.png" alt="Agentis" width="96" />

<h1>AGENTIS</h1>

<p><strong>Open-source multi-agent AI platform. Deploy fleets of AI agents across 12 LLM providers — watch them think, collaborate, and deliver in real time.</strong></p>

<br />

[![Version](https://img.shields.io/badge/version-0.2.0-orange?style=flat-square)](https://github.com/Dhwanil25/Agentis/releases/tag/v0.2.0)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

<br />

<img src="public/agentis-hero.png" alt="Agentis Agent Universe" width="860" style="border-radius:12px" />

<br /><br />

</div>

---

## What is Agentis?

Agentis is a **browser-native multi-agent AI platform**. You describe a task — Agentis spawns a coordinated team of specialized AI agents across multiple LLM providers, visualises their live thinking on an animated canvas, and synthesizes everything into one clean answer.

**No backend. No Docker. No infra.** Clone, `npm install`, go.

```
You → "Research the competitive landscape for AI coding tools"

Agentis orchestrator plans:
  ├── Researcher   (claude-sonnet-4-6   · Anthropic) → market sizing, key players
  ├── Analyst      (gemini-2.5-flash    · Google)    → feature comparison matrix
  ├── Coder        (gpt-4.1-mini        · OpenAI)    → API/SDK landscape
  └── Reviewer     (llama-3.3-70b       · Groq)      → fact-check & critique

                        ↓ ~45 seconds

          One comprehensive, synthesized report.
```

---

## Features

### 🌌 Agent Universe
- **Live animated canvas** — agents spawn as orbiting nodes, spin while working, send visible messages to each other
- **12 LLM providers simultaneously** — mix Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, OpenRouter, Cohere, xAI, Together, Ollama, LM Studio in one run
- **Exact model names on every node** — `claude-sonnet-4-6`, `gpt-4.1-mini`, `gemini-2.5-flash`
- **Smart tier selection** — orchestrator assigns `simple → fast model`, `complex → frontier model` per task
- **Auto-failover** — when a provider goes down mid-task, agents switch to the next available one automatically, zero data loss
- **Persistent universe** — follow-up questions recall relevant old agents and add new ones; knowledge compounds across turns

### 🧠 Synthesis Engine
- Orchestrator plans agent topology, delegates subtasks, then merges all outputs
- Final answer is a clean direct response — no meta-commentary about which agent said what
- Export as **Markdown**, **plain text**, or **save key insights to persistent memory**

### ⚙️ Settings
- **Providers** — configure all 12 providers with live connection testing + model recommendations per complexity tier
- **Models** — browse all available models with pricing, context window, and availability status
- **Memory** — searchable viewer for all stored agent memories across sessions
- **Migration** — one-click OpenClaw → OpenFang migration (auto-detect, YAML→TOML conversion, tool remapping)
- **Database** — optional PocketBase sync for team memory sharing

---

## Supported Providers

| Provider | Best Models | Strength |
|---|---|---|
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 | Reasoning, writing, long context |
| **OpenAI** | GPT-4.1, GPT-4.1 Mini, o4-mini | Code, structured output, tools |
| **Google** | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash | 1M context, multimodal |
| **Groq** | Llama 3.3 70B, 3.1 8B, Mixtral | Fastest inference on the planet |
| **Mistral** | Large 2, Small 3.1, Codestral | European data, code generation |
| **DeepSeek** | V3, R1 Reasoner | Math, logic, best cost/quality ratio |
| **OpenRouter** | 200+ models | Single API for everything |
| **Cohere** | Command R+, Command R | Enterprise RAG, retrieval |
| **xAI** | Grok 3, Grok 3 Mini | Real-time web knowledge |
| **Together AI** | Llama 405B, Qwen 2.5 72B | Best open-source models |
| **Ollama** | Any model you pull | Local, private, free |
| **LM Studio** | Any GGUF model | Local GUI + OpenAI-compatible API |

---

## Getting Started

### Prerequisites
- Node.js 18+
- At least one API key (or Ollama running locally — free)

### Install & run

```bash
git clone https://github.com/Dhwanil25/Agentis.git
cd Agentis
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), paste any API key, and launch your first universe.

### Optional: skip the key gate

```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (React + Vite)                   │
│                                                                  │
│   UniversePage  ──────►  multiAgentEngine.ts                     │
│         │                       │                                │
│         │                ┌──────▼───────┐                        │
│         │                │ Orchestrator  │  claude-sonnet-4-6    │
│         │                └──────┬───────┘                        │
│         │                       │  JSON plan                     │
│         │          ┌────────────┼────────────┐                   │
│         │          ▼            ▼            ▼                   │
│         │     Worker A      Worker B      Worker C               │
│         │   Groq/llama    Gemini/flash   GPT-4.1-mini            │
│         │   researcher     analyst        coder                  │
│         │          │            │            │                   │
│         │          └────────────┼────────────┘                   │
│         │                       │  outputs                       │
│         │                ┌──────▼───────┐                        │
│         └───────────────►│  Synthesis   │  claude-sonnet-4-6    │
│                           └─────────────┘                        │
│                                                                  │
│  Vite proxy routes → 12 provider APIs (CORS-free streaming)      │
│  localStorage + PocketBase (opt.) → memory, keys, history        │
└──────────────────────────────────────────────────────────────────┘
```

### Key files

| File | Purpose |
|---|---|
| `src/lib/multiAgentEngine.ts` | Orchestration, streaming, provider failover, synthesis |
| `src/components/pages/UniversePage.tsx` | Canvas rendering, agent cards, post-analysis panel |
| `src/components/pages/SettingsPage.tsx` | All 12 providers, model browser, memory, migration UI |
| `src/lib/memory.ts` | Persistent memory — localStorage + optional PocketBase |
| `vite-plugin-agentis.ts` | Vite middleware: engine daemon, migration endpoints |
| `vite.config.ts` | Proxy routes for all 12 provider APIs |

---

## Project Structure

```
agentis/
├── public/
│   ├── favicon.png              # App icon
│   └── agentis-hero.png         # Hero image
├── src/
│   ├── components/
│   │   ├── pages/
│   │   │   ├── UniversePage.tsx # Multi-agent canvas + controls
│   │   │   ├── SettingsPage.tsx # Providers, models, memory, migration
│   │   │   ├── ChatPage.tsx     # Single-agent chat
│   │   │   ├── WorkflowsPage.tsx
│   │   │   ├── SchedulerPage.tsx
│   │   │   └── ...              # Analytics, Logs, Sessions, etc.
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   ├── multiAgentEngine.ts  # Core engine
│   │   ├── memory.ts            # Memory layer
│   │   ├── pb.ts                # PocketBase integration
│   │   └── claude.ts            # Anthropic streaming
│   └── hooks/
│       └── useAgent.ts          # Agent state machine
├── vite-plugin-agentis.ts       # Engine plugin + migration endpoints
├── vite.config.ts               # 12 provider proxies
└── index.html
```

---

## Migrating from OpenClaw

Go to **Settings → Migration** and click **Auto-Detect OpenClaw**.

Agentis scans `~/.openclaw` on disk and shows you exactly what it found. Click **Migrate Now** to:

- Convert `agent.yaml` → `agent.toml` with proper capabilities
- Remap tools: `read_file → file_read`, `execute_command → shell_exec`, `http_request → http_fetch`, etc.
- Merge channel configs into `config.toml`
- Copy workspace files and memory data to `~/.openfang`

Or use **Enter Path Manually** to specify a custom source directory.

---

## Roadmap

- [ ] Agent-to-agent direct messaging (A2X protocol)
- [ ] Scheduled workflows (cron-style agent runs)
- [ ] Browser hand — agents that can browse the web
- [ ] Shareable agent universes (export + replay)
- [ ] Native desktop app (Tauri)

---

## Contributing

PRs welcome. Please open an issue first for large changes.

```bash
npm run dev    # start dev server
npm run build  # production build
npm run lint   # ESLint check
```

---

## Changelog

### v0.2.0 — March 2026
- Multi-provider Agent Universe (12 providers, exact model names on canvas)
- Provider auto-failover — silent switch when a provider goes down
- Persistent universe — follow-up questions extend the existing agent graph
- Model recommendations in Settings → Providers
- Memory viewer in Settings → Memory
- OpenClaw migration with real filesystem scanning + YAML→TOML conversion
- 9 new Vite proxy routes for all external providers
- New favicon and hero image

### v0.1.0 — Initial release
- Streaming pipeline agent with Claude API
- Skill-based persona orchestration
- Sidebar navigation, Overview, Analytics, Logs pages
- Three.js landing page

---

## License

MIT © [Dhwanil25](https://github.com/Dhwanil25)

---

<div align="center">

**If Agentis is useful to you, please give it a star ⭐**

Built with React · TypeScript · Vite

</div>
