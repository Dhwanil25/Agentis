# Contributing to Agentis

We appreciate your interest in making Agentis better. This document covers everything you need to go from idea to merged pull request.

---

## Before You Start

- **Search first.** Check [open issues](https://github.com/Dhwanil25/Agentis/issues) and [pull requests](https://github.com/Dhwanil25/Agentis/pulls) before starting work. Someone may already be on it.
- **Open an issue first** for non-trivial changes. A quick discussion upfront saves everyone time.
- **Small PRs merge faster.** If you're building something large, split it into stages.

---

## Ways to Contribute

| | What | How |
|---|---|---|
| 🐛 | Fix a bug | Open a [Bug Report](https://github.com/Dhwanil25/Agentis/issues/new?template=bug_report.md) |
| 💡 | Propose a feature | Open a [Feature Request](https://github.com/Dhwanil25/Agentis/issues/new?template=feature_request.md) |
| 🔧 | Write code | Fork → branch → PR |
| 📖 | Improve docs | Edit README or inline comments |
| 🌍 | Add a provider | See [Adding a Provider](#adding-a-provider) |
| 🎨 | Add an agent role | See [Adding an Agent Role](#adding-an-agent-role) |

---

## Development Setup

### Requirements

- **Node.js** 18 or later
- **npm** 9 or later
- At least one LLM provider API key, or [Ollama](https://ollama.ai) running locally (free)

### Steps

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/Agentis.git
cd Agentis

npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment

```bash
# Optional — skips the API key gate on startup
cp .env.example .env.local
# Add: VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## Workflow

```
fork → clone → branch → commit → push → pull request
```

```bash
# Always branch from main
git checkout main && git pull
git checkout -b fix/ollama-error-message

# Make your changes, then:
npm run lint          # must pass
git add -p            # stage intentionally
git commit -m "fix: show model name in ollama failover error"
git push origin fix/ollama-error-message
```

Then open a PR against `main` on GitHub.

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org). This keeps the changelog clean and makes `git log` actually readable.

```
<type>: <short summary in present tense, lowercase>
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no behaviour change |
| `style` | Formatting, whitespace |
| `perf` | Performance improvement |
| `test` | Tests |
| `chore` | Build, deps, config |

**Examples**

```
feat: add designer and lawyer agent roles
fix: ollama failover shows attempted model name
docs: add provider setup guide to README
refactor: extract streamWithFailover into separate module
```

---

## Pull Request Guidelines

### Title

Follow the same convention as commits: `feat: add token cost tracker`

### Description

Your PR description should answer:
1. What does this change do?
2. Why is it needed? (link the issue)
3. How did you test it?
4. Any screenshots for UI changes?

### Checklist before submitting

- [ ] `npm run lint` passes with no errors
- [ ] The Agent Universe launches and completes a run end-to-end
- [ ] No API keys, secrets, or personal data in the diff
- [ ] New behaviour is covered by the description / screenshots

### Review process

- PRs are reviewed within a few days
- We may request changes — this is normal, not a rejection
- Once approved, a maintainer will merge

---

## Project Structure

```
agentis/
├── src/
│   ├── components/
│   │   ├── pages/
│   │   │   ├── UniversePage.tsx     ← multi-agent universe UI, sessions sidebar, chat history
│   │   │   ├── SettingsPage.tsx     ← providers, models, memory, data export/import
│   │   │   ├── ChatPage.tsx         ← single-agent chat interface
│   │   │   ├── WorkflowsPage.tsx    ← saved workflow editor and runner
│   │   │   ├── AnalyticsPage.tsx    ← usage analytics
│   │   │   ├── LogsPage.tsx         ← agent run logs
│   │   │   ├── SessionsPage.tsx     ← saved sessions browser
│   │   │   ├── SchedulerPage.tsx    ← scheduled task runner
│   │   │   ├── HandsPage.tsx        ← computer-use / browser automation
│   │   │   ├── ChannelsPage.tsx     ← webhook / notification channels
│   │   │   ├── ApprovalsPage.tsx    ← human-in-the-loop approvals queue
│   │   │   ├── CommsPage.tsx        ← agent communication log
│   │   │   └── SkillsPage.tsx       ← skill browser
│   │   ├── Universe3D.tsx           ← Three.js 3D agent universe renderer
│   │   ├── Sidebar.tsx              ← main navigation sidebar
│   │   ├── SetupWizard.tsx          ← first-run API key + provider setup
│   │   └── ...                      ← supporting UI components
│   ├── lib/
│   │   ├── multiAgentEngine.ts      ← orchestration, streaming, failover (core file)
│   │   ├── chatHistory.ts           ← localStorage persistence for universe sessions
│   │   ├── testProviderKey.ts       ← per-provider API key validation
│   │   ├── memory.ts                ← localStorage + PocketBase memory store
│   │   ├── claude.ts                ← single-agent Claude streaming client
│   │   ├── engine.ts                ← single-agent task engine
│   │   ├── analytics.ts             ← usage tracking helpers
│   │   ├── artifacts.ts             ← artifact creation and management
│   │   ├── approvals.ts             ← approval queue helpers
│   │   └── pb.ts                    ← PocketBase client integration
│   ├── hooks/
│   │   └── useAgent.ts              ← agent state machine hook
│   ├── data/
│   │   ├── templates.ts             ← built-in task templates
│   │   ├── skills.ts                ← skill definitions
│   │   └── personas.ts              ← agent persona presets
│   └── types/                       ← shared TypeScript interfaces
├── vite.config.ts                   ← provider proxy routes (one per LLM provider)
└── public/                          ← static assets
```

The most important file is `src/lib/multiAgentEngine.ts`. Understanding it unlocks most meaningful contributions.

---

## Adding an Agent Role

A role defines how an agent thinks and what it specialises in. There are **4 places** to update in `src/lib/multiAgentEngine.ts`:

### 1. Add the role to the `AgentRole` type

```ts
export type AgentRole =
  'orchestrator' | 'researcher' | 'analyst' | 'writer' |
  'coder' | 'reviewer' | 'planner' | 'summarizer' |
  'designer' | 'lawyer'   // ← add here
```

### 2. Add a colour to `ROLE_COLORS`

The colour is used for the agent's 3D node glow, the Team tab dot, and the agent card border.

```ts
export const ROLE_COLORS: Record<AgentRole, string> = {
  // ...existing roles...
  designer: '#ec4899',
  lawyer:   '#6366f1',
}
```

### 3. Add a system prompt in `workerSystem()`

This is the **most important step** — it defines how the agent actually thinks and responds. Without it TypeScript will error and the role silently falls back to `researcher` behaviour.

```ts
const prompts: Record<AgentRole, string> = {
  // ...existing roles...
  designer: `You are ${name}, a Design Agent running on ${id}. Focus on UX, visual structure, user flows, and design principles. ${tone} Plain text only.`,
  lawyer:   `You are ${name}, a Legal Agent running on ${id}. Analyse legal risks, contracts, compliance, and regulatory implications. ${tone} Plain text only.`,
}
```

The `${tone}` variable is automatically set based on the agent's complexity tier (`simple` → concise, `expert` → exhaustive).

### 4. Add the role name to the orchestrator's role list

The orchestrator is an LLM — it only knows about roles that are listed in its system prompt. Find the line in `buildOrchestratorSystem()` and append your role:

```ts
// Before:
Available roles: researcher, analyst, writer, coder, reviewer, planner, summarizer

// After:
Available roles: researcher, analyst, writer, coder, reviewer, planner, summarizer, designer, lawyer
```

Without this step the orchestrator will never assign the new role regardless of the task.

### Verify

Run the app, launch a task that would naturally call for your new role (e.g. "design a landing page" for `designer`), and confirm the agent node appears with the correct colour in the 3D universe and the correct model label in the Team tab.

---

## Adding a Provider

A provider is an LLM backend (API or local) that agents can be assigned to. Changes span three files:

### 1. `src/lib/multiAgentEngine.ts`

- Add the provider ID to the `LLMProvider` union type
- Add entries to `PROVIDER_COLORS`, `PROVIDER_LABELS`, and `PROVIDER_MODELS` (one model per complexity tier: `simple`, `medium`, `complex`, `expert`)
- Add a streaming function. Most providers are OpenAI-compatible — copy `streamOpenAICompat` and add a proxy path to `OAI_PROXY`. For custom formats, see `streamGoogle` (SSE) or `streamOllama` (NDJSON) as examples
- Add a strengths description for the provider inside `buildOrchestratorSystem()` so the orchestrator knows when to route work to it

### 2. `vite.config.ts`

Add a proxy route so the browser can reach the provider's API without CORS issues:

```ts
'/your-provider-proxy': {
  target: 'https://api.yourprovider.com',
  changeOrigin: true,
  rewrite: path => path.replace(/^\/your-provider-proxy/, ''),
},
```

### 3. `src/lib/testProviderKey.ts`

Add a case to `testProviderKey()` so users can validate their key from the Providers panel:

```ts
case 'yourprovider':
  res = await fetch('/your-provider-proxy/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  })
  break
```

Use a lightweight, read-only endpoint (e.g. `GET /v1/models`) that consumes no tokens and returns 401/403 on a bad key.

### 4. `src/components/pages/SettingsPage.tsx`

Add the provider to the `PROVIDERS` array so it appears in the Settings UI with its input field and placeholder.

---

## Good First Issues

If you're new to the codebase, these are well-scoped and clearly documented:

- [#1 — Add more agent roles](https://github.com/Dhwanil25/Agentis/issues/1)
- [#2 — Dark / light theme toggle](https://github.com/Dhwanil25/Agentis/issues/2)
- [#3 — Keyboard shortcut to launch universe](https://github.com/Dhwanil25/Agentis/issues/3)

---

## Questions

Open a [GitHub Discussion](https://github.com/Dhwanil25/Agentis/discussions) or comment on the relevant issue. We're happy to help you get oriented.
