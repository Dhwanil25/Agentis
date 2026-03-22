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
│   │   │   ├── UniversePage.tsx     ← multi-agent canvas (main feature)
│   │   │   ├── SettingsPage.tsx     ← providers, models, memory, migration
│   │   │   ├── ChatPage.tsx
│   │   │   ├── WorkflowsPage.tsx
│   │   │   └── ...
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   ├── multiAgentEngine.ts      ← orchestration, streaming, failover
│   │   ├── memory.ts                ← localStorage + PocketBase memory
│   │   └── pb.ts                   ← PocketBase integration
│   └── hooks/
│       └── useAgent.ts              ← agent state machine
├── vite-plugin-agentis.ts           ← engine daemon + /agentis/* middleware
├── vite.config.ts                   ← provider proxy routes
└── public/
```

The most important file is `src/lib/multiAgentEngine.ts`. Understanding it unlocks most meaningful contributions.

---

## Adding an Agent Role

1. Open `src/lib/multiAgentEngine.ts`
2. Add your role to the `AgentRole` type:
   ```ts
   export type AgentRole = '...' | 'designer' | 'lawyer'
   ```
3. Add a colour to `ROLE_COLORS`:
   ```ts
   designer: '#ec4899',
   lawyer:   '#6366f1',
   ```
The orchestrator automatically picks from all available roles — no other changes needed.

---

## Adding a Provider

1. Add the provider ID to `LLMProvider` type in `multiAgentEngine.ts`
2. Add entries to `PROVIDER_COLORS`, `PROVIDER_LABELS`, and `PROVIDER_MODELS`
3. Add a streaming function (see `streamOpenAICompat` for the pattern — most providers are OpenAI-compatible)
4. Add a Vite proxy route in `vite.config.ts`
5. Add the provider entry to `PROVIDERS` array in `SettingsPage.tsx`

---

## Good First Issues

If you're new to the codebase, these are well-scoped and clearly documented:

- [#1 — Add more agent roles](https://github.com/Dhwanil25/Agentis/issues/1)
- [#2 — Dark / light theme toggle](https://github.com/Dhwanil25/Agentis/issues/2)
- [#3 — Keyboard shortcut to launch universe](https://github.com/Dhwanil25/Agentis/issues/3)

---

## Questions

Open a [GitHub Discussion](https://github.com/Dhwanil25/Agentis/discussions) or comment on the relevant issue. We're happy to help you get oriented.
