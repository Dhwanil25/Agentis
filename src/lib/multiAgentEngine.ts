// ── Multi-Agent Orchestration Engine ──────────────────────────────────────────
// All 12 providers from Agentis Settings — exact model names on every agent.

export type AgentRole = 'orchestrator' | 'researcher' | 'analyst' | 'writer' | 'coder' | 'reviewer' | 'planner' | 'summarizer'
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error' | 'recalled'
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert'

export type LLMProvider =
  | 'anthropic' | 'openai' | 'google' | 'groq'
  | 'mistral' | 'deepseek' | 'openrouter' | 'cohere'
  | 'xai' | 'together' | 'ollama' | 'lmstudio'

export interface ProviderKeys {
  anthropic?: string
  openai?: string
  google?: string
  groq?: string
  mistral?: string
  deepseek?: string
  openrouter?: string
  cohere?: string
  xai?: string
  together?: string
  ollama?: string    // endpoint URL, default http://localhost:11434
  lmstudio?: string  // endpoint URL, default http://localhost:1234
}

// ── Provider metadata ──────────────────────────────────────────────────────────
export const PROVIDER_COLORS: Record<LLMProvider, string> = {
  anthropic:   '#f97316',
  openai:      '#10b981',
  google:      '#4285f4',
  groq:        '#f43f5e',
  mistral:     '#a855f7',
  deepseek:    '#06b6d4',
  openrouter:  '#8b5cf6',
  cohere:      '#eab308',
  xai:         '#e2e8f0',
  together:    '#fb923c',
  ollama:      '#64748b',
  lmstudio:    '#6366f1',
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  anthropic:  'Anthropic',
  openai:     'OpenAI',
  google:     'Google',
  groq:       'Groq',
  mistral:    'Mistral',
  deepseek:   'DeepSeek',
  openrouter: 'OpenRouter',
  cohere:     'Cohere',
  xai:        'xAI',
  together:   'Together',
  ollama:     'Ollama',
  lmstudio:   'LM Studio',
}

export const ROLE_COLORS: Record<AgentRole, string> = {
  orchestrator: '#f97316',
  researcher:   '#3b82f6',
  analyst:      '#06b6d4',
  writer:       '#10b981',
  coder:        '#eab308',
  reviewer:     '#ec4899',
  planner:      '#8b5cf6',
  summarizer:   '#64748b',
}

// ── Exact model names per provider per complexity ──────────────────────────────
// modelId = the exact API model string sent in the request
// label   = what's displayed on the canvas node
export const PROVIDER_MODELS: Record<LLMProvider, Record<TaskComplexity, { modelId: string; label: string; maxTokens: number }>> = {
  anthropic: {
    simple:  { modelId: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5',   maxTokens: 8096 },
    medium:  { modelId: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5',   maxTokens: 8096 },
    complex: { modelId: 'claude-sonnet-4-6',          label: 'claude-sonnet-4-6',  maxTokens: 8096 },
    expert:  { modelId: 'claude-opus-4-6',            label: 'claude-opus-4-6',    maxTokens: 8096 },
  },
  openai: {
    simple:  { modelId: 'gpt-4.1-nano', label: 'gpt-4.1-nano', maxTokens: 8096 },
    medium:  { modelId: 'gpt-4.1-mini', label: 'gpt-4.1-mini', maxTokens: 8096 },
    complex: { modelId: 'gpt-4.1',      label: 'gpt-4.1',      maxTokens: 8096 },
    expert:  { modelId: 'gpt-4.1',      label: 'gpt-4.1',      maxTokens: 8096 },
  },
  google: {
    simple:  { modelId: 'gemini-2.0-flash', label: 'gemini-2.0-flash', maxTokens: 8192 },
    medium:  { modelId: 'gemini-2.5-flash', label: 'gemini-2.5-flash', maxTokens: 8192 },
    complex: { modelId: 'gemini-2.5-pro',   label: 'gemini-2.5-pro',   maxTokens: 8192 },
    expert:  { modelId: 'gemini-2.5-pro',   label: 'gemini-2.5-pro',   maxTokens: 8192 },
  },
  groq: {
    simple:  { modelId: 'llama-3.1-8b-instant',    label: 'llama-3.1-8b-instant',    maxTokens: 8096 },
    medium:  { modelId: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', maxTokens: 8096 },
    complex: { modelId: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', maxTokens: 8096 },
    expert:  { modelId: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', maxTokens: 8096 },
  },
  mistral: {
    simple:  { modelId: 'mistral-small-latest', label: 'mistral-small-latest', maxTokens: 8096 },
    medium:  { modelId: 'mistral-small-latest', label: 'mistral-small-latest', maxTokens: 8096 },
    complex: { modelId: 'mistral-large-latest', label: 'mistral-large-latest', maxTokens: 8096 },
    expert:  { modelId: 'mistral-large-latest', label: 'mistral-large-latest', maxTokens: 8096 },
  },
  deepseek: {
    simple:  { modelId: 'deepseek-chat',     label: 'deepseek-chat',     maxTokens: 8096 },
    medium:  { modelId: 'deepseek-chat',     label: 'deepseek-chat',     maxTokens: 8096 },
    complex: { modelId: 'deepseek-chat',     label: 'deepseek-chat',     maxTokens: 8096 },
    expert:  { modelId: 'deepseek-reasoner', label: 'deepseek-reasoner', maxTokens: 8096 },
  },
  openrouter: {
    simple:  { modelId: 'meta-llama/llama-4-maverick', label: 'llama-4-maverick',  maxTokens: 8096 },
    medium:  { modelId: 'meta-llama/llama-4-maverick', label: 'llama-4-maverick',  maxTokens: 8096 },
    complex: { modelId: 'google/gemini-2.5-pro',       label: 'gemini-2.5-pro',    maxTokens: 8096 },
    expert:  { modelId: 'anthropic/claude-opus-4',     label: 'claude-opus-4',     maxTokens: 8096 },
  },
  cohere: {
    simple:  { modelId: 'command-r',      label: 'command-r',       maxTokens: 8096 },
    medium:  { modelId: 'command-r',      label: 'command-r',       maxTokens: 8096 },
    complex: { modelId: 'command-r-plus', label: 'command-r-plus',  maxTokens: 8096 },
    expert:  { modelId: 'command-r-plus', label: 'command-r-plus',  maxTokens: 8096 },
  },
  xai: {
    simple:  { modelId: 'grok-3-mini', label: 'grok-3-mini', maxTokens: 8096 },
    medium:  { modelId: 'grok-3-mini', label: 'grok-3-mini', maxTokens: 8096 },
    complex: { modelId: 'grok-3',      label: 'grok-3',      maxTokens: 8096 },
    expert:  { modelId: 'grok-3',      label: 'grok-3',      maxTokens: 8096 },
  },
  together: {
    simple:  { modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama-3.3-70B-Turbo', maxTokens: 8096 },
    medium:  { modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama-3.3-70B-Turbo', maxTokens: 8096 },
    complex: { modelId: 'meta-llama/Llama-3.1-405B-Instruct-Turbo', label: 'Llama-3.1-405B-Turbo', maxTokens: 8096 },
    expert:  { modelId: 'meta-llama/Llama-3.1-405B-Instruct-Turbo', label: 'Llama-3.1-405B-Turbo', maxTokens: 8096 },
  },
  ollama: {
    simple:  { modelId: 'llama3.2', label: 'llama3.2', maxTokens: 4096 },
    medium:  { modelId: 'llama3.2', label: 'llama3.2', maxTokens: 4096 },
    complex: { modelId: 'llama3.2', label: 'llama3.2', maxTokens: 4096 },
    expert:  { modelId: 'llama3.2', label: 'llama3.2', maxTokens: 4096 },
  },
  lmstudio: {
    simple:  { modelId: 'local-model', label: 'local-model', maxTokens: 4096 },
    medium:  { modelId: 'local-model', label: 'local-model', maxTokens: 4096 },
    complex: { modelId: 'local-model', label: 'local-model', maxTokens: 4096 },
    expert:  { modelId: 'local-model', label: 'local-model', maxTokens: 4096 },
  },
}

// ── Agent + state types ────────────────────────────────────────────────────────
export interface MAAgent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  complexity: TaskComplexity
  provider: LLMProvider
  modelLabel: string   // exact model name shown on canvas
  task: string
  output: string
  dependsOn: string[]
  x: number
  y: number
}

export interface MAMessage {
  id: string; fromId: string; toId: string; content: string; ts: number
}

export interface MAState {
  phase: 'idle' | 'planning' | 'executing' | 'synthesizing' | 'done' | 'error'
  agents: MAAgent[]
  messages: MAMessage[]
  finalOutput: string
  errorMsg: string
  totalAgents: number
}

export const INITIAL_MA_STATE: MAState = {
  phase: 'idle', agents: [], messages: [], finalOutput: '', errorMsg: '', totalAgents: 0,
}

export type MAUpdater = (fn: (prev: MAState) => MAState) => void

// ── Load all provider keys from Settings localStorage ──────────────────────────
// Reads the same `agentis_provider_{id}` keys that SettingsPage writes.
const SETTINGS_KEY_PREFIX = 'agentis_provider_'
const ALL_PROVIDERS: LLMProvider[] = [
  'anthropic', 'openai', 'google', 'groq', 'mistral', 'deepseek',
  'openrouter', 'cohere', 'xai', 'together', 'ollama', 'lmstudio',
]

export function loadAllProviderKeys(): ProviderKeys {
  const keys: ProviderKeys = {}
  for (const p of ALL_PROVIDERS) {
    const v = localStorage.getItem(`${SETTINGS_KEY_PREFIX}${p}`) ?? ''
    if (v) (keys as Record<string, string>)[p] = v
  }
  return keys
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeId() { return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function getAvailableProviders(keys: ProviderKeys): LLMProvider[] {
  const p: LLMProvider[] = []
  const localDefaults: Partial<Record<LLMProvider, string>> = {
    ollama:   'http://localhost:11434',
    lmstudio: 'http://localhost:1234',
  }
  for (const provider of ALL_PROVIDERS) {
    const val = (keys as Record<string, string>)[provider] || localDefaults[provider]
    if (val) p.push(provider)
  }
  return p.length ? p : ['anthropic']
}

// ── Streaming functions ────────────────────────────────────────────────────────

// Anthropic (custom SSE format)
async function streamAnthropic(
  modelId: string, system: string, userMsg: string, apiKey: string, maxTokens: number,
  onToken: (t: string) => void,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: modelId, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMsg }], stream: true }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (!res.body) throw new Error('No response body')
  let out = ''
  const reader = res.body.getReader(); const dec = new TextDecoder()
  outer: while (true) {
    const { done, value } = await reader.read(); if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim(); if (data === '[DONE]') break outer
      try {
        const ev = JSON.parse(data) as { type: string; delta?: { text?: string } }
        if (ev.type === 'content_block_delta' && ev.delta?.text) { out += ev.delta.text; onToken(ev.delta.text) }
      } catch { /* skip */ }
    }
  }
  return out
}

// Google Gemini (custom SSE)
async function streamGoogle(
  modelId: string, system: string, userMsg: string, apiKey: string, maxTokens: number,
  onToken: (t: string) => void,
): Promise<string> {
  const res = await fetch(`/google-proxy/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (!res.body) throw new Error('No response body')
  let out = ''
  const reader = res.body.getReader(); const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(line.slice(6)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
        const text = ev.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) { out += text; onToken(text) }
      } catch { /* skip */ }
    }
  }
  return out
}

// Cohere v2 (SSE with content-delta events)
async function streamCohere(
  modelId: string, system: string, userMsg: string, apiKey: string, maxTokens: number,
  onToken: (t: string) => void,
): Promise<string> {
  const res = await fetch('/cohere-proxy/v2/chat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId, stream: true, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (!res.body) throw new Error('No response body')
  let out = ''
  const reader = res.body.getReader(); const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(line.slice(6)) as { type?: string; delta?: { type?: string; delta?: { text?: string } } }
        if (ev.type === 'content-delta' && ev.delta?.delta?.text) {
          out += ev.delta.delta.text; onToken(ev.delta.delta.text)
        }
      } catch { /* skip */ }
    }
  }
  return out
}

// Ollama (NDJSON streaming)
async function streamOllama(
  modelId: string, system: string, userMsg: string, endpoint: string,
  onToken: (t: string) => void,
): Promise<string> {
  const base = endpoint.replace(/\/$/, '') || 'http://localhost:11434'
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId, stream: true,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (!res.body) throw new Error('No response body')
  let out = ''
  const reader = res.body.getReader(); const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.trim()) continue
      try {
        const ev = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
        if (ev.message?.content) { out += ev.message.content; onToken(ev.message.content) }
        if (ev.done) return out
      } catch { /* skip */ }
    }
  }
  return out
}

// Generic OpenAI-compatible SSE (OpenAI, Groq, Mistral, DeepSeek, xAI, Together, OpenRouter, LM Studio)
const OAI_PROXY: Partial<Record<LLMProvider, string>> = {
  openai:     '/openai-proxy',
  groq:       '/groq-proxy',
  mistral:    '/mistral-proxy',
  deepseek:   '/deepseek-proxy',
  xai:        '/xai-proxy',
  together:   '/together-proxy',
  openrouter: '/openrouter-proxy',
}

async function streamOpenAICompat(
  provider: LLMProvider, modelId: string, system: string, userMsg: string,
  apiKey: string, maxTokens: number, endpoint: string | undefined,
  onToken: (t: string) => void,
): Promise<string> {
  const base = provider === 'lmstudio'
    ? (endpoint?.replace(/\/$/, '') || 'http://localhost:1234')
    : (OAI_PROXY[provider] ?? '')

  const url = `${base}/v1/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://agentis.app'
    headers['X-Title'] = 'Agentis'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId, max_tokens: maxTokens, stream: true,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) throw new Error(`${PROVIDER_LABELS[provider]} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (!res.body) throw new Error('No response body')

  let out = ''
  const reader = res.body.getReader(); const dec = new TextDecoder()
  outer: while (true) {
    const { done, value } = await reader.read(); if (done) break
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim(); if (data === '[DONE]') break outer
      try {
        const ev = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
        const text = ev.choices?.[0]?.delta?.content
        if (text) { out += text; onToken(text) }
      } catch { /* skip */ }
    }
  }
  return out
}

// ── Unified streaming router ───────────────────────────────────────────────────
async function streamLLM(
  provider: LLMProvider, modelId: string, system: string, userMsg: string,
  keys: ProviderKeys, maxTokens: number, onToken: (t: string) => void,
): Promise<string> {
  const key = (keys as Record<string, string>)[provider] ?? ''
  switch (provider) {
    case 'anthropic': return streamAnthropic(modelId, system, userMsg, key, maxTokens, onToken)
    case 'google':    return streamGoogle(modelId, system, userMsg, key, maxTokens, onToken)
    case 'cohere':    return streamCohere(modelId, system, userMsg, key, maxTokens, onToken)
    case 'ollama':    return streamOllama(modelId, system, userMsg, key, onToken)
    default:          return streamOpenAICompat(provider, modelId, system, userMsg, key, maxTokens, key, onToken)
  }
}

// ── Provider failover + smart single-provider model selection ──────────────────
// Tries the assigned provider first. On failure (error or empty output) it falls
// over to the next available provider. The onOutputUpdate callback always receives
// the FULL accumulated string so the caller can replace the agent's output directly.
async function streamWithFailover(
  agent: MAAgent,
  system: string,
  userMsg: string,
  keys: ProviderKeys,
  availableProviders: LLMProvider[],
  onOutputUpdate: (fullOutput: string) => void,
): Promise<{ output: string; provider: LLMProvider; modelLabel: string }> {
  // Order: assigned provider first, then the rest (skip providers without keys)
  const tryOrder = [
    agent.provider,
    ...availableProviders.filter(p => p !== agent.provider),
  ]

  let lastError = ''

  for (let attempt = 0; attempt < tryOrder.length; attempt++) {
    const provider = tryOrder[attempt]
    const cfg = PROVIDER_MODELS[provider][agent.complexity]
    const isFallback = attempt > 0

    // Show a notice when switching providers
    let out = isFallback
      ? `↻ ${PROVIDER_LABELS[agent.provider]} unavailable — switching to ${PROVIDER_LABELS[provider]} (${cfg.label})\n\n`
      : ''

    if (isFallback) onOutputUpdate(out)

    try {
      await streamLLM(provider, cfg.modelId, system, userMsg, keys, cfg.maxTokens, delta => {
        out += delta
        onOutputUpdate(out)
      })

      // Treat suspiciously short output as a failure (e.g. Ollama model not loaded)
      const textContent = out.replace(/^↻[^\n]+\n\n/, '').trim()
      if (textContent.length < 20) {
        throw new Error(`Output too short (${textContent.length} chars) — model may not be loaded`)
      }

      return { output: out, provider, modelLabel: cfg.label }

    } catch (e) {
      lastError = String(e)
      console.warn(`[Agentis failover] ${PROVIDER_LABELS[provider]}/${cfg.label} failed for "${agent.name}": ${lastError}`)

      if (attempt < tryOrder.length - 1) {
        // Signal the switch in the output
        out += `\n⚠ ${PROVIDER_LABELS[provider]} failed: ${lastError.slice(0, 80)}\n`
        onOutputUpdate(out)
        await sleep(400) // brief pause before retrying
      }
    }
  }

  throw new Error(`All providers exhausted. Last error: ${lastError}`)
}

// ── Orchestrator + worker prompts ──────────────────────────────────────────────
function buildOrchestratorSystem(availableProviders: LLMProvider[]): string {
  const providerGuide = availableProviders.map(p => {
    const strengths: Record<LLMProvider, string> = {
      anthropic:  'reasoning, analysis, writing, code review',
      openai:     'structured output, broad knowledge, instruction following',
      google:     'factual lookup, multimodal, real-time knowledge',
      groq:       'ultra-fast inference, open-source models',
      mistral:    'multilingual, concise technical output, code',
      deepseek:   'math, coding, STEM reasoning at low cost',
      openrouter: 'wide model selection, cost routing',
      cohere:     'RAG, enterprise search, summarization',
      xai:        'real-time web access, current events',
      together:   'open-source models, fine-tuning, Llama variants',
      ollama:     'local inference, privacy, offline capability',
      lmstudio:   'local inference, custom models',
    }
    return `"${p}" (${PROVIDER_LABELS[p]}) — ${strengths[p]}`
  }).join('\n- ')

  return `You are an Orchestrator AI coordinating a team of specialized AI agents powered by multiple LLM providers.

Available providers:
- ${providerGuide}

Break the task into 2–12 agents based on real complexity. Assign each agent the best provider for their role and spread work across available providers for multi-model comparison.

For each agent:
- "complexity": simple | medium | complex | expert  (drives model tier selection)
- "provider": one of [${availableProviders.join(', ')}]
- "dependsOn": IDs of agents whose output this agent needs (empty = runs in parallel)

Return ONLY valid JSON, no markdown:

{
  "agents": [
    {
      "id": "a1",
      "role": "researcher",
      "name": "Market Researcher",
      "task": "Detailed specific task description",
      "complexity": "medium",
      "provider": "${availableProviders[0]}",
      "dependsOn": []
    }
  ]
}

Available roles: researcher, analyst, writer, coder, reviewer, planner, summarizer

Rules:
- Maximize parallel execution (minimize dependsOn chains)
- Spread agents across all available providers for multi-model comparison
${availableProviders.length === 1 ? `- SINGLE PROVIDER MODE (${PROVIDER_LABELS[availableProviders[0]]}): Use complexity tiers smartly — assign "simple" for fast lookup tasks (uses cheaper/faster model), "complex"/"expert" only when genuinely needed. This optimizes cost and speed within one provider.` : '- Spread agents across providers to leverage each provider\'s strengths'}
- Keep task descriptions specific and actionable`
}

function buildFollowUpOrchestratorSystem(availableProviders: LLMProvider[]): string {
  return `You are an Orchestrator managing a PERSISTENT agent universe. The universe has existing agents with completed work.

Available providers: [${availableProviders.join(', ')}]

Decide which existing agents to RECALL (reactivate with a new task building on prior work) and what NEW agents to spawn.

Return ONLY valid JSON:
{
  "reuse": [
    { "id": "a1", "newTask": "Extend your previous analysis to also address..." }
  ],
  "agents": [
    {
      "id": "fu_a1",
      "role": "analyst",
      "name": "Comparative Analyst",
      "task": "Compare findings from a1 in light of the new question",
      "complexity": "complex",
      "provider": "${availableProviders[0]}",
      "dependsOn": ["a1"]
    }
  ]
}

Rules: new agent IDs start with "fu_", new agents can dependsOn existing IDs, spread across providers`
}

function workerSystem(role: AgentRole, name: string, complexity: TaskComplexity, provider: LLMProvider, modelLabel: string): string {
  const verbosity: Record<TaskComplexity, string> = {
    simple:  'Be concise. Deliver the answer directly — no padding.',
    medium:  'Be thorough but efficient. Cover what matters without filler.',
    complex: 'Be comprehensive. Explore in depth, cover edge cases, structure clearly.',
    expert:  'Be exhaustive. Expert-level depth, nuance, and completeness.',
  }
  const tone = verbosity[complexity]
  const id = `${PROVIDER_LABELS[provider]}/${modelLabel}`

  const prompts: Record<AgentRole, string> = {
    orchestrator: buildOrchestratorSystem([provider]),
    planner:    `You are ${name}, a Planning Agent running on ${id}. Create actionable plans and structured breakdowns. ${tone} Plain text only.`,
    researcher: `You are ${name}, a Research Agent running on ${id}. Gather accurate, well-organized information. ${tone} Plain text only.`,
    analyst:    `You are ${name}, an Analysis Agent running on ${id}. Analyze data and context, identify patterns and insights. ${tone} Plain text only.`,
    writer:     `You are ${name}, a Writing Agent running on ${id}. Produce clear professional prose with numbered sections. ${tone} Plain text only — no markdown.`,
    coder:      `You are ${name}, a Code Agent running on ${id}. Write clean, well-commented, working code. ${tone} No markdown fences.`,
    reviewer:   `You are ${name}, a Review Agent running on ${id}. Critically evaluate work, identify strengths, weaknesses, improvements. ${tone} Plain text only.`,
    summarizer: `You are ${name}, a Summarizer Agent running on ${id}. Extract and condense the most important information. ${tone} Plain text only.`,
  }
  return prompts[role] ?? prompts.researcher
}

// ── Orbital layout ─────────────────────────────────────────────────────────────
function computePositions(workerCount: number, W: number, H: number): { x: number; y: number }[] {
  const cx = W / 2, cy = H / 2
  const positions: { x: number; y: number }[] = [{ x: cx, y: cy }]
  if (workerCount === 0) return positions
  const rings = [
    { max: 5,  radius: Math.min(W, H) * 0.24 },
    { max: 8,  radius: Math.min(W, H) * 0.38 },
    { max: 12, radius: Math.min(W, H) * 0.48 },
  ]
  let remaining = workerCount
  for (const ring of rings) {
    if (remaining <= 0) break
    const count = Math.min(remaining, ring.max)
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      positions.push({ x: cx + ring.radius * Math.cos(angle), y: cy + ring.radius * Math.sin(angle) })
    }
    remaining -= count
  }
  for (let i = positions.length - 1; i < workerCount; i++) {
    const angle = (2 * Math.PI * i) / workerCount
    positions.push({ x: cx + Math.min(W, H) * 0.52 * Math.cos(angle), y: cy + Math.min(W, H) * 0.52 * Math.sin(angle) })
  }
  return positions
}

// ── Internal plan types ────────────────────────────────────────────────────────
interface PlanAgent {
  id: string; role: string; name: string; task: string
  complexity?: string; provider?: string; dependsOn: string[]
}

function planAgentToMAAgent(p: PlanAgent, pos: { x: number; y: number }, availableProviders: LLMProvider[]): MAAgent {
  const complexity: TaskComplexity = (['simple', 'medium', 'complex', 'expert'].includes(p.complexity ?? ''))
    ? (p.complexity as TaskComplexity) : 'medium'
  const provider: LLMProvider = (p.provider && availableProviders.includes(p.provider as LLMProvider))
    ? (p.provider as LLMProvider) : availableProviders[0]
  const cfg = PROVIDER_MODELS[provider][complexity]
  const role: AgentRole = (p.role as AgentRole) in ROLE_COLORS ? (p.role as AgentRole) : 'researcher'
  return {
    id: p.id, name: p.name, role,
    status: 'idle', complexity, provider,
    modelLabel: cfg.label,
    task: p.task, output: '',
    dependsOn: Array.isArray(p.dependsOn) ? p.dependsOn : [],
    x: pos.x, y: pos.y,
  }
}

// ── Worker execution ──────────────────────────────────────────────────────────
async function executeWorkers(
  workers: MAAgent[],
  preloadedOutputs: Record<string, string>,
  allWorkerDefs: MAAgent[],
  keys: ProviderKeys,
  availableProviders: LLMProvider[],
  update: MAUpdater,
): Promise<Record<string, string>> {
  const outputs: Record<string, string> = { ...preloadedOutputs }
  const completed = new Set<string>(Object.keys(preloadedOutputs))
  const remaining = new Set(workers.map(w => w.id))

  while (remaining.size > 0) {
    const ready = workers.filter(w => remaining.has(w.id) && w.dependsOn.every(d => completed.has(d)))
    if (ready.length === 0) break

    await Promise.all(ready.map(async agent => {
      update(s => ({ ...s, agents: s.agents.map(a => a.id === agent.id ? { ...a, status: 'thinking' } : a) }))
      await sleep(150 + Math.random() * 250)

      const context = agent.dependsOn.map(d => {
        const w = allWorkerDefs.find(x => x.id === d)
        return w ? `[${w.name}]:\n${outputs[d] ?? '(pending)'}` : ''
      }).filter(Boolean).join('\n\n---\n\n')

      const userMsg = context ? `Your task: ${agent.task}\n\nContext from upstream agents:\n${context}` : agent.task
      const system = workerSystem(agent.role, agent.name, agent.complexity, agent.provider, PROVIDER_MODELS[agent.provider][agent.complexity].label)

      update(s => ({ ...s, agents: s.agents.map(a => a.id === agent.id ? { ...a, status: 'working' } : a) }))

      try {
        const result = await streamWithFailover(
          agent, system, userMsg, keys, availableProviders,
          fullOutput => {
            update(s => ({ ...s, agents: s.agents.map(a => a.id === agent.id ? { ...a, output: fullOutput } : a) }))
          },
        )

        // If failover switched providers, update the agent's provider + modelLabel in state
        if (result.provider !== agent.provider) {
          update(s => ({
            ...s,
            agents: s.agents.map(a => a.id === agent.id
              ? { ...a, provider: result.provider, modelLabel: result.modelLabel }
              : a
            ),
            messages: [...s.messages, {
              id: makeId(), fromId: 'orchestrator', toId: agent.id,
              content: `Switched ${agent.name} → ${PROVIDER_LABELS[result.provider]}/${result.modelLabel}`, ts: Date.now(),
            }],
          }))
        }

        outputs[agent.id] = result.output
        completed.add(agent.id); remaining.delete(agent.id)

        update(s => ({
          ...s,
          agents: s.agents.map(a => a.id === agent.id ? { ...a, status: 'done' } : a),
          messages: [...s.messages, {
            id: makeId(), fromId: agent.id, toId: 'orchestrator',
            content: `${agent.name} finished via ${PROVIDER_LABELS[result.provider]}`, ts: Date.now(),
          }],
        }))
      } catch (e) {
        // All providers exhausted
        update(s => ({ ...s, agents: s.agents.map(a => a.id === agent.id ? { ...a, status: 'error', output: String(e) } : a) }))
        completed.add(agent.id); remaining.delete(agent.id); return
      }

      const downstream = workers.filter(w => w.dependsOn.includes(agent.id))
      if (downstream.length > 0) {
        await sleep(150)
        update(s => ({
          ...s,
          messages: [...s.messages, ...downstream.map(d => ({
            id: makeId(), fromId: agent.id, toId: d.id,
            content: `${agent.name} → ${d.name}`, ts: Date.now(),
          }))],
        }))
      }
    }))
    await sleep(80)
  }
  return outputs
}

// ── Fresh task ─────────────────────────────────────────────────────────────────
export async function runMultiAgentTask(
  task: string,
  keys: ProviderKeys,
  canvasSize: { w: number; h: number },
  update: MAUpdater,
): Promise<void> {
  const ORCH = 'orchestrator'
  const { w: W, h: H } = canvasSize
  const availableProviders = getAvailableProviders(keys)

  update(() => ({
    ...INITIAL_MA_STATE, phase: 'planning',
    agents: [{ id: ORCH, name: 'Orchestrator', role: 'orchestrator', status: 'thinking', complexity: 'complex', provider: 'anthropic', modelLabel: 'claude-sonnet-4-6', task, output: '', dependsOn: [], x: W / 2, y: H / 2 }],
  }))

  let planRaw = ''
  try {
    await streamAnthropic('claude-sonnet-4-6', buildOrchestratorSystem(availableProviders), `Task: ${task}`, keys.anthropic ?? '', 4096,
      t => { planRaw += t; update(s => ({ ...s, agents: s.agents.map(a => a.id === ORCH ? { ...a, output: planRaw } : a) })) },
    )
  } catch (e) { update(s => ({ ...s, phase: 'error', errorMsg: String(e) })); return }

  let plan: { agents: PlanAgent[] }
  try {
    const clean = planRaw.replace(/```(?:json)?/g, '').trim()
    const si = clean.indexOf('{'), ei = clean.lastIndexOf('}')
    plan = JSON.parse(clean.slice(si, ei + 1)) as { agents: PlanAgent[] }
    if (!Array.isArray(plan.agents) || plan.agents.length === 0) throw new Error('empty')
  } catch { update(s => ({ ...s, phase: 'error', errorMsg: 'Orchestrator returned an invalid plan — please try again.' })); return }

  const positions = computePositions(plan.agents.length, W, H)
  const workers: MAAgent[] = plan.agents.map((p, i) => planAgentToMAAgent(p, positions[i + 1], availableProviders))

  update(s => ({
    ...s, phase: 'executing', totalAgents: workers.length + 1,
    agents: [
      { ...s.agents[0], status: 'done', output: `Plan ready — deploying ${workers.length} agents`, x: positions[0].x, y: positions[0].y },
      ...workers,
    ],
    messages: [...s.messages, ...workers.map(w => ({ id: makeId(), fromId: ORCH, toId: w.id, content: `Deploy ${w.name} [${w.modelLabel}]`, ts: Date.now() }))],
  }))

  await sleep(400)
  const outputs = await executeWorkers(workers, {}, workers, keys, availableProviders, update)

  update(s => ({
    ...s, phase: 'synthesizing',
    agents: s.agents.map(a => a.id === ORCH ? { ...a, status: 'working', output: 'Synthesizing all outputs...' } : a),
  }))

  const cleanOutput = (s: string) => s.replace(/^↻[^\n]*\n\n?/, '').replace(/\n⚠[^\n]*/g, '').trim()
  const synthInput = workers.map(w => `[${w.name}]:\n${cleanOutput(outputs[w.id] ?? '(no output)')}`).join('\n\n---\n\n')
  const synthPrompt = `Original task: "${task}"\n\nAgent research:\n${synthInput}\n\nUsing the research above, write a direct, comprehensive answer to the task.`

  let finalOutput = ''
  try {
    await streamAnthropic('claude-sonnet-4-6',
      'You are a synthesis agent. Using the agent research below, write a single direct, natural response that fully answers the original task. Do not mention agents, providers, models, or system routing. Write as if you researched this yourself. Plain prose.',
      synthPrompt, keys.anthropic ?? '', 8096,
      t => { finalOutput += t; update(s => ({ ...s, finalOutput })) },
    )
  } catch (e) { update(s => ({ ...s, phase: 'error', errorMsg: String(e) })); return }

  update(s => ({
    ...s, phase: 'done', finalOutput,
    messages: [...s.messages, { id: makeId(), fromId: ORCH, toId: 'user', content: 'Synthesis complete', ts: Date.now() }],
    agents: s.agents.map(a => a.id === ORCH ? { ...a, status: 'done', output: 'All agents complete' } : a),
  }))
}

// ── Follow-up: extend existing universe ────────────────────────────────────────
export async function runFollowUpTask(
  question: string,
  currentState: MAState,
  keys: ProviderKeys,
  canvasSize: { w: number; h: number },
  update: MAUpdater,
): Promise<void> {
  const ORCH = 'orchestrator'
  const { w: W, h: H } = canvasSize
  const availableProviders = getAvailableProviders(keys)

  const existingContext = currentState.agents
    .filter(a => a.id !== ORCH && a.output)
    .map(a => `Agent "${a.name}" (id: ${a.id}, role: ${a.role}, model: ${PROVIDER_LABELS[a.provider]}/${a.modelLabel}):\n${a.output.slice(0, 600)}`)
    .join('\n\n')
  const existingIds = currentState.agents.filter(a => a.id !== ORCH).map(a => a.id)

  update(s => ({
    ...s, phase: 'planning',
    agents: s.agents.map(a => a.id === ORCH ? { ...a, status: 'thinking', output: '' } : a),
  }))

  let planRaw = ''
  try {
    await streamAnthropic('claude-sonnet-4-6', buildFollowUpOrchestratorSystem(availableProviders),
      `Existing agents:\n${existingContext || '(none)'}\nExisting IDs: [${existingIds.join(', ')}]\n\nFollow-up: ${question}`,
      keys.anthropic ?? '', 4096,
      t => { planRaw += t; update(s => ({ ...s, agents: s.agents.map(a => a.id === ORCH ? { ...a, output: planRaw } : a) })) },
    )
  } catch (e) { update(s => ({ ...s, phase: 'error', errorMsg: String(e) })); return }

  interface FollowUpPlan { reuse?: { id: string; newTask: string }[]; agents?: PlanAgent[] }
  let plan: FollowUpPlan
  try {
    const clean = planRaw.replace(/```(?:json)?/g, '').trim()
    const si = clean.indexOf('{'), ei = clean.lastIndexOf('}')
    plan = JSON.parse(clean.slice(si, ei + 1)) as FollowUpPlan
  } catch { update(s => ({ ...s, phase: 'error', errorMsg: 'Follow-up orchestrator returned invalid plan.' })); return }

  const reuseList = plan.reuse ?? []
  const newPlanAgents = (plan.agents ?? []).filter(p => !existingIds.includes(p.id))
  const reuseMap = new Map(reuseList.map(r => [r.id, r.newTask]))

  const existingWorkerCount = currentState.agents.filter(a => a.id !== ORCH).length
  const allPositions = computePositions(existingWorkerCount + newPlanAgents.length, W, H)
  const newWorkers: MAAgent[] = newPlanAgents.map((p, i) =>
    planAgentToMAAgent(p, allPositions[existingWorkerCount + i + 1], availableProviders)
  )

  update(s => ({
    ...s, phase: 'executing', totalAgents: s.totalAgents + newWorkers.length,
    agents: [
      { ...s.agents.find(a => a.id === ORCH)!, status: 'done', output: `Follow-up: ${reuseList.length} recalled, ${newWorkers.length} new` },
      ...s.agents.filter(a => a.id !== ORCH).map(a => reuseMap.has(a.id) ? { ...a, status: 'recalled' as AgentStatus, task: reuseMap.get(a.id)! } : a),
      ...newWorkers,
    ],
    messages: [...s.messages,
      ...reuseList.map(r => ({ id: makeId(), fromId: ORCH, toId: r.id, content: `Recall ${r.id}`, ts: Date.now() })),
      ...newWorkers.map(w => ({ id: makeId(), fromId: ORCH, toId: w.id, content: `Deploy ${w.name} [${w.modelLabel}]`, ts: Date.now() })),
    ],
  }))

  await sleep(400)

  const preloadedOutputs: Record<string, string> = {}
  for (const a of currentState.agents) {
    if (a.id !== ORCH && a.output && !reuseMap.has(a.id)) preloadedOutputs[a.id] = a.output
  }

  const recalledWorkers = currentState.agents
    .filter(a => a.id !== ORCH && reuseMap.has(a.id))
    .map(a => ({ ...a, status: 'idle' as AgentStatus, task: reuseMap.get(a.id)! }))

  update(s => ({
    ...s,
    agents: s.agents.map(a => reuseMap.has(a.id) ? { ...a, status: 'idle' as AgentStatus } : a),
  }))

  const allWorkerDefs = [...currentState.agents.filter(a => a.id !== ORCH), ...newWorkers]
  const outputs = await executeWorkers([...recalledWorkers, ...newWorkers], preloadedOutputs, allWorkerDefs, keys, availableProviders, update)

  update(s => ({
    ...s, phase: 'synthesizing',
    agents: s.agents.map(a => a.id === ORCH ? { ...a, status: 'working', output: 'Synthesizing follow-up...' } : a),
  }))

  const allOutputs = { ...preloadedOutputs, ...outputs }
  const synthAgents = allWorkerDefs.filter(a => allOutputs[a.id])
  const cleanOutput = (s: string) => s.replace(/^↻[^\n]*\n\n?/, '').replace(/\n⚠[^\n]*/g, '').trim()
  const synthInput = synthAgents.map(w => `[${w.name}]:\n${cleanOutput(allOutputs[w.id])}`).join('\n\n---\n\n')

  let finalOutput = ''
  try {
    await streamAnthropic('claude-sonnet-4-6',
      'You are a synthesis agent. Using the research below, write a single direct, natural response that fully answers the follow-up question. Do not mention agents, providers, models, or system routing. Write as if you researched this yourself. Plain prose.',
      `Question: "${question}"\n\nResearch:\n${synthInput}`,
      keys.anthropic ?? '', 8096,
      t => { finalOutput += t; update(s => ({ ...s, finalOutput })) },
    )
  } catch (e) { update(s => ({ ...s, phase: 'error', errorMsg: String(e) })); return }

  update(s => ({
    ...s, phase: 'done', finalOutput,
    messages: [...s.messages, { id: makeId(), fromId: ORCH, toId: 'user', content: 'Follow-up complete', ts: Date.now() }],
    agents: s.agents.map(a => a.id === ORCH ? { ...a, status: 'done', output: 'Follow-up complete' } : a),
  }))
}
