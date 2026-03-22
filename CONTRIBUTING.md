# Contributing to Agentis

👋 Thanks for your interest in contributing! Agentis is an open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation, and ideas.

Please take a moment to read this guide before opening an issue or submitting a pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Your First Contribution](#your-first-contribution)
- [Development Setup](#development-setup)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Project Structure](#project-structure)
- [Commit Style](#commit-style)

---

## Code of Conduct

Be kind. We're all here to build something great together. Disrespectful or exclusionary behaviour will not be tolerated.

---

## Ways to Contribute

| Type | How |
|---|---|
| 🐛 Bug report | Open an issue using the Bug Report template |
| 💡 Feature idea | Open an issue using the Feature Request template |
| 🔧 Code contribution | Fork → branch → PR |
| 📖 Documentation | Edit the README or add inline docs |
| 🧪 Testing | Try things, report rough edges |
| ⭐ Spread the word | Star the repo, share it |

---

## Reporting Bugs

Before opening a bug report:
- Search [existing issues](https://github.com/Dhwanil25/Agentis/issues) to avoid duplicates
- Check you're on the latest version (`git pull`)

When reporting, include:
- What you did
- What you expected to happen
- What actually happened
- Browser + OS
- Console errors (open DevTools → Console)

---

## Requesting Features

Before opening a feature request:
- Check the [roadmap issues](https://github.com/Dhwanil25/Agentis/issues?q=label%3Aenhancement) — it may already be planned
- If it's a large change, open a discussion first so we can align before you invest time

---

## Your First Contribution

New to open source? Start with issues labelled [`good first issue`](https://github.com/Dhwanil25/Agentis/issues?q=label%3A%22good+first+issue%22) — they're scoped to single files with clear instructions.

Good starting points:
- [#1 — Add more agent roles](https://github.com/Dhwanil25/Agentis/issues/1)
- [#2 — Dark / light theme toggle](https://github.com/Dhwanil25/Agentis/issues/2)
- [#3 — Keyboard shortcut to launch universe](https://github.com/Dhwanil25/Agentis/issues/3)

---

## Development Setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Agentis.git
cd Agentis

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
# → http://localhost:5173

# 4. Create a branch for your change
git checkout -b feat/my-feature
```

You'll need at least one LLM API key to test the Agent Universe. Anthropic, OpenAI, Google, or a free local [Ollama](https://ollama.ai) setup all work.

### Lint before you push

```bash
npm run lint
```

---

## Pull Request Guidelines

- **One PR per feature or fix** — keep changes focused
- **Reference the issue** — include `Closes #N` in your PR description
- **Test your change** — make sure the universe runs, the UI renders, no console errors
- **Keep diffs clean** — avoid reformatting unrelated code
- **Screenshots welcome** — for UI changes, before/after screenshots help a lot

### PR title format

```
feat: add designer agent role
fix: ollama failover shows model name in error
docs: update provider table in README
refactor: simplify executeWorkers signature
```

---

## Project Structure

```
src/
├── components/
│   ├── pages/
│   │   ├── UniversePage.tsx    # Multi-agent canvas — main feature
│   │   ├── SettingsPage.tsx    # Providers, models, memory, migration
│   │   └── ...                 # Other pages
│   └── Sidebar.tsx
├── lib/
│   ├── multiAgentEngine.ts     # Core orchestration + streaming
│   ├── memory.ts               # Persistent memory layer
│   └── pb.ts                   # PocketBase integration (optional)
└── hooks/
    └── useAgent.ts             # Agent state machine

vite-plugin-agentis.ts          # Engine daemon + /agentis/* endpoints
vite.config.ts                  # 12 provider proxy routes
```

The most impactful file is `src/lib/multiAgentEngine.ts` — understanding it unlocks most contributions.

---

## Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     new feature
fix:      bug fix
docs:     documentation only
refactor: code change that doesn't fix a bug or add a feature
style:    formatting, whitespace
chore:    build, deps, config
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/Dhwanil25/Agentis/discussions) or drop a comment on any issue. We're happy to help.
