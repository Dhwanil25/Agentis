# Agentis — Multi-Agent Orchestration Platform

Agentis is a browser-native multi-agent AI platform. Instead of a single AI model answering a question, Agentis deploys a coordinated team of specialized agents — researcher, analyst, coder, writer, reviewer, planner — across multiple LLM providers simultaneously, then synthesizes their outputs into one cohesive answer.

## Core Concepts

### Agent Roles
Every agent has a role that determines its system prompt and behavior:
- **orchestrator** — plans the task, assigns roles, manages dependencies, synthesizes final output
- **researcher** — gathers information, uses web search (Tavily), fetches external data
- **analyst** — processes data, identifies patterns, draws conclusions
- **coder** — writes, reviews, and debugs code
- **writer** — drafts structured prose, reports, documentation
- **reviewer** — critiques and validates outputs from other agents
- **planner** — breaks complex goals into structured steps
- **summarizer** — condenses long outputs into key insights
- **browser** — autonomously navigates and interacts with live web pages

### Task Complexity Tiers
Complexity drives model selection per provider:
- **simple** → fast/cheap models (Haiku, Flash, Llama-8B)
- **medium** → balanced models
- **complex** → capable models (Sonnet, Gemini Pro, Llama-70B)
- **expert** → best-in-class (Opus, Gemini 2.5 Pro, Llama-405B)

### Orchestration Flow
1. **Planning**: Orchestrator receives task, produces JSON agent plan with roles, complexity, providers, and `dependsOn` arrays
2. **Execution**: Agents with no dependencies run in parallel; others wait for upstream agents to complete (topological order)
3. **Synthesis**: Orchestrator merges all agent outputs into a final answer
4. **Follow-Up (Persistent Universe)**: Subsequent questions reactivate relevant prior agents and spawn new ones — knowledge compounds across turns

### Provider Support (12 total)
Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, OpenRouter, Cohere, xAI, Together AI, Ollama, LM Studio

All provider calls go through Vite dev-server proxy routes to bypass CORS. In production, route through your own server-side proxy.

### Smart Failover
If a provider fails mid-stream, `streamWithFailover()` automatically switches to the next available provider, carrying accumulated output forward with zero data loss.

## Architecture

### Key Files
```
src/lib/multiAgentEngine.ts   — Core orchestration engine (planning, execution, synthesis)
src/lib/analytics.ts          — Token/cost tracking per agent
src/lib/memory.ts             — Persistent memory across sessions
src/components/pages/UniversePage.tsx — Main UI: canvas, controls, output
src/components/FlowGraph.tsx  — Canvas renderer: hexagonal nodes, bezier edges, particle flow
src/components/TimelinePanel.tsx — Timeline of agent activity with tool call markers
vite.config.ts                — Proxy routes for all 12 providers
vite-plugin-agentis.ts        — Vite middleware for engine endpoints
```

### Core TypeScript Types
```typescript
type AgentRole = 'orchestrator' | 'researcher' | 'analyst' | 'writer' | 'coder' | 'reviewer' | 'planner' | 'summarizer' | 'browser'
type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error' | 'recalled'
type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert'
type LLMProvider = 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'deepseek' | 'openrouter' | 'cohere' | 'xai' | 'together' | 'ollama' | 'lmstudio'

interface MAAgent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  complexity: TaskComplexity
  provider: LLMProvider
  modelLabel: string
  task: string
  output: string
  dependsOn: string[]   // IDs of agents this one waits for
  x: number; y: number  // canvas position
  startTs?: number; endTs?: number
  tokensIn?: number; tokensOut?: number
  costUsd?: number
}

interface MAState {
  phase: 'idle' | 'planning' | 'executing' | 'synthesizing' | 'done' | 'error'
  agents: MAAgent[]
  messages: MAMessage[]
  toolCalls: MAToolCall[]
  finalOutput: string
  totalCostUsd: number
}
```

## Development Patterns

### Adding a New LLM Provider
1. Add the provider to `LLMProvider` type in `multiAgentEngine.ts`
2. Add model tiers (simple/medium/complex/expert) to the provider model map
3. Add a streaming function `streamNewProvider(...)` following the existing pattern — accumulate chunks, track tokens, call `onChunk` callback
4. Register a Vite proxy route in `vite.config.ts`
5. Add key validation in `SetupWizard.tsx` using the proxy route

### Adding a New Agent Role
1. Add role to `AgentRole` type
2. Add a system prompt for the role in the `ROLE_PROMPTS` map in `multiAgentEngine.ts`
3. Add a node color for the role in `FlowGraph.tsx`
4. The orchestrator will automatically assign the role when planning tasks

### Extending the Analytics System
Usage records are written via `addUsageRecord()` in `src/lib/analytics.ts`. Each record captures:
```typescript
{ ts, model, persona, task, inputTokens, outputTokens, cost, stepCount }
```
Read aggregated stats with `loadSummary()`. Records are stored in localStorage.

### Token Tracking
- **Anthropic**: Tokens arrive in SSE events (`message_start` for input, `message_delta` for output) — exact counts
- **Other providers**: Parse `usage` field from streaming response if present; otherwise estimate

### Vite Proxy Pattern
All provider calls use path-based proxying:
```typescript
// vite.config.ts
'/anthropic': { target: 'https://api.anthropic.com', changeOrigin: true, rewrite: p => p.replace(/^\/anthropic/, '') },
'/openai-proxy': { target: 'https://api.openai.com', changeOrigin: true, rewrite: p => p.replace(/^\/openai-proxy/, '') },
```
This keeps API keys in the browser (localStorage) without exposing them via CORS preflight failures.

## Common Tasks

### Running Agentis locally
```bash
npm install
npm run dev
# Open http://localhost:5173
# Add at least one provider API key in Settings
```

### Running a multi-agent task programmatically
```typescript
import { runMultiAgentTask } from '@/lib/multiAgentEngine'

const result = await runMultiAgentTask({
  task: 'Analyze the competitive landscape for AI coding tools',
  availableProviders: ['anthropic', 'openai'],
  onStateChange: (state) => console.log(state.phase, state.agents.length),
})
console.log(result.finalOutput)
```

### Building a follow-up (persistent Universe)
```typescript
const updatedState = await runFollowUpTask({
  task: 'Now focus on pricing strategies',
  previousState: existingMAState,
  availableProviders: ['anthropic'],
  onStateChange: (state) => updateUI(state),
})
```

## Design Principles
- **Browser-native first**: No backend required. All orchestration runs client-side with Vite proxy for CORS.
- **Stream everything**: All LLM calls use SSE streaming for real-time visualization and low time-to-first-token.
- **Provider-agnostic**: Abstract streaming differences behind a unified interface so agents don't care which model they run on.
- **Dependency DAG**: Express agent dependencies as `dependsOn` arrays; engine handles topological execution automatically.
- **Fail forward**: Failover at the streaming layer means users never see a broken run — the task completes even if one provider goes down.
- **Visual transparency**: Every agent, dependency, token count, and tool call is visible. Users understand exactly what happened and why.
