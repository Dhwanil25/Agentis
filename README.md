# Agentis

An open-source AI agent powered by composable skills, inspired by [obra/superpowers](https://github.com/obra/superpowers) and the Claude API.

Any person — developer, writer, analyst, marketer, student, or founder — can use Agentis to get high-quality, role-specific AI output through a skill-orchestration layer that assembles the right expert context for every task.

---

## How it works

```
User picks a persona → Skill graph is built → Prompt assembled → Claude API → Output
```

Each **skill** (Planner, Coder, Writer, Analyst, etc.) injects a focused system prompt fragment into the Claude API call. The agent chains them in sequence, so the model behaves like a specialist — not a generic chatbot.

This is the core idea from `obra/superpowers`: small, composable, opinionated "skills" stacked together produce dramatically better output than a single monolithic prompt.

---

## Stack

- **React 18 + Vite + TypeScript** — fast, type-safe frontend
- **Claude API** (`claude-sonnet-4-20250514`) — the reasoning engine
- **Vercel** — zero-config deployment

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/agentis.git
cd agentis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your key at [console.anthropic.com](https://console.anthropic.com).

> **Note:** If you leave `VITE_ANTHROPIC_API_KEY` empty, the app will show an API key input screen at runtime — safe for public deployment.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. On first deploy, add your env var:

```bash
vercel env add VITE_ANTHROPIC_API_KEY
```

### Option B — Vercel dashboard

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add `VITE_ANTHROPIC_API_KEY` under **Environment Variables**
5. Click **Deploy**

---

## Project structure

```
agentis/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ExecuteAndOutput.tsx   # Step 4 + 5 screens
│   │   ├── PersonaScreen.tsx      # Step 1 — who are you?
│   │   ├── SkillGraphScreen.tsx   # Step 3 — skill orchestration
│   │   ├── SkillPill.tsx          # Reusable skill badge
│   │   ├── StepIndicator.tsx      # Progress bar
│   │   └── TaskScreen.tsx         # Step 2 — what do you need?
│   ├── data/
│   │   ├── personas.ts            # 6 personas + suggestions
│   │   └── skills.ts              # Skill definitions + colors
│   ├── hooks/
│   │   └── useAgent.ts            # State machine for agent flow
│   ├── lib/
│   │   └── claude.ts              # Anthropic API wrapper
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   ├── App.tsx                    # Root component + routing
│   ├── index.css                  # Global design tokens + styles
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts              # Vite env types
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Adding your own skills

Edit `src/data/skills.ts` to add a new skill:

```ts
myskill: {
  id: 'myskill',
  label: 'My Skill',
  description: 'Does something specific',
  color: { bg: '#E1F5EE', border: '#0F6E56', text: '#085041' },
},
```

Then reference it in a persona inside `src/data/personas.ts`:

```ts
skills: ['planner', 'myskill', 'reviewer'],
```

The system prompt in `src/lib/claude.ts` auto-assembles from whichever skills are active.

---

## Adding your own persona

Edit `src/data/personas.ts`:

```ts
{
  id: 'designer',
  label: 'Designer',
  icon: '◈',
  description: 'UI, UX, design systems',
  skills: ['planner', 'writer', 'reviewer'],
  suggestions: [
    'Write a design system token spec for a fintech product',
    'Create a UX audit checklist for a mobile onboarding flow',
  ],
},
```

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

---

## License

MIT
