# Architecture

A guide to the Agentis codebase for contributors and developers building on top of it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Database | IndexedDB via Dexie.js |
| 3D Visualization | Three.js |
| Styling | CSS custom properties (no framework) |
| LLM Streaming | Native `fetch` with `ReadableStream` |

---

## Directory Structure

```
agentis/
├── src/
│   ├── components/
│   │   ├── pages/          # One file per page/screen
│   │   └── *.tsx           # Shared UI components
│   ├── hooks/
│   │   └── useAgent.ts     # Core agent execution hook
│   ├── lib/
│   │   ├── db.ts           # IndexedDB schema (Dexie)
│   │   ├── memory.ts       # Agent memory system
│   │   ├── analytics.ts    # Token usage tracking
│   │   ├── claude.ts       # Pipeline builder + streaming
│   │   ├── engine.ts       # Workflow execution engine
│   │   ├── multiAgentEngine.ts  # Multi-agent orchestration
│   │   ├── agentSkills.ts  # skills.sh integration
│   │   ├── approvals.ts    # Approval request system
│   │   ├── chatHistory.ts  # Session persistence
│   │   └── colors.ts       # Agent role color palette
│   ├── data/
│   │   └── templates.ts    # Workflow template definitions
│   ├── types/              # Shared TypeScript types
│   └── App.tsx             # Root component + routing
├── docs/                   # This documentation
├── public/                 # Static assets
├── vite.config.ts          # Vite + proxy configuration
├── vite-plugin-agentis.ts  # Engine daemon plugin
└── SKILL.md                # Agentis skill for skills.sh
```

---

## Key Files

### `src/lib/multiAgentEngine.ts`

The core orchestration engine. Handles:
- Provider selection and failover across 12 LLM APIs
- Per-role system prompt construction with skill injection
- Streaming responses with token counting
- Parallel agent execution with phase tracking

Key function: `workerSystem(role, providerKey, model)` → returns a system prompt for that role.

### `src/lib/claude.ts`

The single-agent pipeline builder. Handles:
- Persona definitions (dev, writer, analyst, researcher, browser)
- Multi-step pipeline construction from a task
- Tool definitions for browser automation
- Streaming with step-level progress updates

### `src/lib/engine.ts`

The workflow execution engine for template-based runs. Handles:
- Node dependency resolution
- Parallel group execution
- Artifact extraction from outputs

### `src/lib/db.ts`

IndexedDB schema definition using Dexie:

```typescript
memories:  'id, agentId, key, ts, importance, category, lastAccessed, [agentId+key]'
analytics: 'id, ts, model, persona'
sessions:  'id, ts, persona'
```

### `src/hooks/useAgent.ts`

React hook that orchestrates a full agent run:
- Calls `buildPipeline()` → `runAgentStreaming()`
- Tracks per-step status updates via streaming callbacks
- Auto-saves task memory on completion
- Records token usage to analytics

### `vite.config.ts`

All external API calls are proxied through Vite to bypass CORS:

| Proxy path | Target |
|---|---|
| `/anthropic` | `api.anthropic.com` |
| `/openai-proxy` | `api.openai.com` |
| `/google-proxy` | `generativelanguage.googleapis.com` |
| `/github-raw` | `raw.githubusercontent.com` |
| `/github-api` | `api.github.com` |
| `/skills-sh` | `skills.sh` |
| `/agentis-proxy` | Engine daemon (default: `localhost:4200`) |
| `/pinchtab` | PinchTab service (`localhost:9867`) |
| *(+ 8 more)* | All other LLM providers |

---

## Data Flow — Single Agent Run

```
User submits task
    │
    ▼
useAgent.execute(task, personaId)
    │
    ▼
buildPipeline(task, personaId)  →  PipelineStep[]
    │
    ▼
runAgentStreaming(task, pipeline, apiKey, onChunk)
    │
    ├── For each step: POST /anthropic/v1/messages (streaming)
    ├── Stream chunks → update pipeline step output in state
    └── On all_done:
            ├── autoSaveTaskMemory()   →  db.memories
            └── addUsageRecord()       →  db.analytics
```

## Data Flow — Multi-Agent Universe Run

```
User submits task
    │
    ▼
multiAgentEngine.runMultiAgent(task, config)
    │
    ├── Phase 1: Orchestrator plans breakdown
    ├── Phase 2: Parallel agent execution
    │       ├── Researcher (provider A)
    │       ├── Analyst    (provider B)
    │       ├── Coder      (provider C)
    │       └── Writer     (provider A, failover)
    └── Phase 3: Summarizer synthesizes all outputs
            │
            ▼
        Final output stream
```

---

## Adding a New LLM Provider

1. Add the provider to `PROVIDER_MODELS` in `src/lib/multiAgentEngine.ts`
2. Add a proxy entry in `vite.config.ts`
3. Add the provider card to `PROVIDERS` in `src/components/pages/SettingsPage.tsx`
4. Handle the API format in the streaming function in `src/lib/multiAgentEngine.ts`

---

## Adding a New Page

1. Create `src/components/pages/YourPage.tsx`
2. Add it to the navigation in `src/App.tsx`
3. Add a sidebar entry

---

## Environment Variables

```bash
VITE_OPENFANG_URL=http://localhost:4200   # Engine daemon URL (optional)
VITE_OPENFANG_PORT=4200                  # Engine daemon port (optional)
ANTHROPIC_API_KEY=sk-ant-...             # Passed to engine daemon (optional)
```

All other provider keys are configured through the UI and stored in `localStorage`.

---

## Contributing

- Fork the repo
- Create a branch: `git checkout -b feat/your-feature`
- Make changes + ensure `npx tsc --noEmit` passes with zero errors
- Open a PR against `main`

See `CONTRIBUTING.md` for the full guide.
