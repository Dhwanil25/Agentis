import { useState, useEffect, useRef, useCallback } from 'react'
import { requestApproval } from '@/lib/approvals'

// ── Types ─────────────────────────────────────────────────────────────────────

type HandTab = 'available' | 'active' | 'browser' | 'clip' | 'load' | 'researcher' | 'collector' | 'predictor'
type HandStatus = 'READY' | 'WRITE-MASKED' | 'INACTIVE'
type PinchTabStatus = 'checking' | 'connected' | 'disconnected'
type RunStatus = 'idle' | 'running' | 'done' | 'error' | 'stopped'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Hand {
  id: string
  name: string
  description: string
  status: HandStatus
  tools: string[]
  tab: HandTab
}

interface AgentStep {
  id: string
  tool: string
  input: Record<string, unknown>
  output: string
  status: StepStatus
  ts: number
}

interface AgentRun {
  id: string
  task: string
  status: RunStatus
  steps: AgentStep[]
  result: string
  instanceId: string | null
  tabId: string | null
  startTs: number
  currentUrl: string
  screenshot: string | null
}

interface PinchTabInfo {
  status: PinchTabStatus
  version: string
  instanceCount: number
  endpoint: string
  instanceId: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const HANDS: Hand[] = [
  {
    id: 'browser',
    name: 'Browser Hand',
    description: 'Full web browsing capability via PinchTab. Navigate pages, click elements, fill forms, and extract content — uses accessibility tree refs for precise element targeting.',
    status: 'READY',
    tools: ['navigate', 'snapshot', 'read', 'click', 'fill', 'screenshot'],
    tab: 'browser',
  },
  {
    id: 'clip',
    name: 'Clip Hand',
    description: 'Read and write clipboard content. Copy structured data between agents and external applications.',
    status: 'WRITE-MASKED',
    tools: ['read', 'write'],
    tab: 'clip',
  },
  {
    id: 'collector',
    name: 'Collector Hand',
    description: 'Gather and aggregate text from multiple URLs using PinchTab, then synthesize with Claude.',
    status: 'READY',
    tools: ['open_tab', 'read_text', 'synthesize'],
    tab: 'collector',
  },
  {
    id: 'load',
    name: 'Load Hand',
    description: 'Load and parse files, documents, PDFs, CSVs, and structured data into agent context.',
    status: 'READY',
    tools: ['file_read', 'parse_csv', 'parse_json', 'copy'],
    tab: 'load',
  },
  {
    id: 'predictor',
    name: 'Predictor Hand',
    description: 'Run inference and prediction tasks. Classify inputs, forecast outcomes, and score probabilities.',
    status: 'READY',
    tools: ['classify', 'predict', 'score', 'rank'],
    tab: 'predictor',
  },
  {
    id: 'researcher',
    name: 'Researcher Hand',
    description: 'Deep web research with automatic source verification, citation extraction, and synthesis.',
    status: 'READY',
    tools: ['browser_navigate', 'browser_read', 'synthesize'],
    tab: 'researcher',
  },
  {
    id: 'trading',
    name: 'Trading Hand',
    description: 'Market data access, price monitoring, portfolio tracking, and trade signal generation.',
    status: 'INACTIVE',
    tools: ['price', 'portfolio', 'signal', 'alert'],
    tab: 'available',
  },
  {
    id: 'twitter',
    name: 'Twitter Hand',
    description: 'Read and post to Twitter/X. Monitor mentions, schedule tweets, and track engagement.',
    status: 'INACTIVE',
    tools: ['read', 'post', 'reply', 'search'],
    tab: 'available',
  },
]

const STATUS_COLOR: Record<HandStatus, { bg: string; border: string; text: string }> = {
  'READY':        { bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.4)', text: '#1D9E75' },
  'WRITE-MASKED': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', text: '#f97316' },
  'INACTIVE':     { bg: 'rgba(255,255,255,0.04)', border: 'var(--border)', text: 'var(--muted)' },
}

const TOOL_COLORS: Record<string, string> = {
  browser_navigate:   '#6366f1',
  browser_snapshot:   '#8b5cf6',
  browser_read:       '#0ea5e9',
  browser_click:      '#f59e0b',
  browser_fill:       '#10b981',
  browser_screenshot: '#ec4899',
}

const EXAMPLE_TASKS = [
  'Find the top 5 AI news stories on Hacker News today and summarize them',
  'Go to github.com/trending and list the top 10 trending repositories',
  'Search for "best React state management 2025" on Google and compare results',
  'Go to news.ycombinator.com, find a post about AI agents, and summarize the comments',
]

const RESEARCHER_EXAMPLE_TASKS = [
  'Research the current state of AI agents in 2025',
  'Compare the top 3 vector databases: Pinecone, Weaviate, Chroma',
  'Find recent news about PocketBase and summarize key updates',
  'What are the best open-source LLM inference servers in 2025?',
]

// ── PinchTab localStorage key ─────────────────────────────────────────────────

const PT_TOKEN_KEY = 'agentis_pinchtab_token'

function getPtToken(): string {
  return localStorage.getItem(PT_TOKEN_KEY) ?? ''
}

// ── Real PinchTab HTTP API ────────────────────────────────────────────────────

const PT_BASE = '/pinchtab'

async function ptFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = getPtToken()
  return fetch(`${PT_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
    signal: AbortSignal.timeout(12000),
  })
}

async function ptHealth(): Promise<{ ok: boolean; instanceId: string; version: string }> {
  try {
    const token = getPtToken()
    if (!token) return { ok: false, instanceId: '', version: '' }
    const res = await ptFetch('/health')
    if (!res.ok) return { ok: false, instanceId: '', version: '' }
    const data = await res.json() as {
      status?: string
      version?: string
      instances?: number
      defaultInstance?: { id: string; status: string }
    }
    const instanceId = data.defaultInstance?.id ?? ''
    return { ok: data.status === 'ok', instanceId, version: data.version ?? 'unknown' }
  } catch {
    return { ok: false, instanceId: '', version: '' }
  }
}

async function ptOpenTab(instanceId: string, url: string): Promise<string> {
  const res = await ptFetch(`/instances/${instanceId}/tabs/open`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Failed to open tab: ${res.status} ${text}`)
  }
  const data = await res.json() as { tabId: string; title?: string; url?: string }
  return data.tabId
}

async function ptSnapshot(tabId: string): Promise<string> {
  const res = await ptFetch(`/tabs/${tabId}/snapshot?filter=interactive`)
  if (!res.ok) throw new Error(`Snapshot failed: ${res.statusText}`)
  const data = await res.json() as {
    count: number
    nodes: Array<{ ref: string; role: string; name: string; depth?: number }>
  }
  if (!data.nodes?.length) return 'No interactive elements found on page. Try scrolling or waiting for the page to load.'
  const lines = data.nodes.map(n => `[${n.ref}] ${n.role}: ${n.name}`)
  return `Interactive elements (${data.count} total — use ref IDs for click/fill):\n${lines.join('\n')}`
}

async function ptText(tabId: string): Promise<string> {
  const res = await ptFetch(`/tabs/${tabId}/text`)
  if (!res.ok) throw new Error(`Read failed: ${res.statusText}`)
  const data = await res.json() as {
    text?: string
    title?: string
    url?: string
    truncated?: boolean
  }
  const header = `Title: ${data.title ?? '(untitled)'}\nURL: ${data.url ?? ''}\n\n`
  const body = data.text ?? '(empty page)'
  return header + body + (data.truncated ? '\n\n[content truncated by server]' : '')
}

async function ptClick(tabId: string, ref: string): Promise<string> {
  const res = await ptFetch(`/tabs/${tabId}/action`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'click', ref }),
  })
  if (!res.ok) throw new Error(`Click failed: ${res.statusText}`)
  const data = await res.json() as { success?: boolean; result?: unknown }
  return data.success ? `Clicked element [${ref}] successfully` : `Click on [${ref}] may not have worked`
}

async function ptFill(tabId: string, ref: string, value: string): Promise<string> {
  const res = await ptFetch(`/tabs/${tabId}/action`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'fill', ref, value }),
  })
  if (!res.ok) throw new Error(`Fill failed: ${res.statusText}`)
  const data = await res.json() as { success?: boolean }
  const preview = value.length > 40 ? value.slice(0, 40) + '…' : value
  return data.success ? `Filled [${ref}] with "${preview}"` : `Fill on [${ref}] may not have worked`
}

async function ptScreenshot(tabId: string): Promise<string> {
  const res = await ptFetch(`/tabs/${tabId}/screenshot`)
  if (!res.ok) throw new Error(`Screenshot failed: ${res.statusText}`)
  const data = await res.json() as { base64?: string }
  return data.base64 ?? ''
}

// ── Browser tool definitions for Claude ──────────────────────────────────────

const BROWSER_TOOLS = [
  {
    name: 'browser_navigate',
    description: 'Navigate the browser to a URL. Opens the page in a browser tab. Use full URLs including https://. After navigating, use browser_snapshot to see interactive elements, or browser_read to get page text.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The full URL to navigate to (include https://)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_snapshot',
    description: 'Get all interactive elements on the current page as an accessibility tree. Returns elements with ref IDs (e0, e1, e2...). ALWAYS call this before browser_click or browser_fill to find the right ref ID. Do not guess ref IDs.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_read',
    description: 'Read the full text content of the current page. Returns page title, URL, and all visible text. Use this to extract information, find links, or check page content.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element using its ref ID from browser_snapshot. Always call browser_snapshot first to get valid ref IDs. Do not guess or invent ref IDs.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'The ref ID from browser_snapshot output (e.g., "e0", "e5", "e12")' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'browser_fill',
    description: 'Type text into an input field or textarea using its ref ID from browser_snapshot. Call browser_snapshot first to find the ref ID of the input. After filling, you may need to click a submit button.',
    input_schema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'The ref ID of the input element from browser_snapshot' },
        value: { type: 'string', description: 'The text to type into the input field' },
      },
      required: ['ref', 'value'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Capture a screenshot of the current page. The image will be displayed in the UI. Use this to visually verify the current state of the browser before and after actions.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
]

// ── Model config ─────────────────────────────────────────────────────────────
const LOOP_MODEL  = 'claude-haiku-4-5-20251001'
const FINAL_MODEL = 'claude-sonnet-4-6'
const HISTORY_RESULT_LIMIT = 600

// ── Claude tool-use message types ────────────────────────────────────────────

interface ClaudeTextBlock {
  type: 'text'
  text: string
}

interface ClaudeToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

type ClaudeBlock = ClaudeTextBlock | ClaudeToolUseBlock

interface ClaudeResponse {
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  content: ClaudeBlock[]
}

interface MessageParam {
  role: 'user' | 'assistant'
  content: string | ClaudeBlock[] | ToolResultContent[]
}

interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

// ── Shared Claude API helper ──────────────────────────────────────────────────

async function callClaudeAPI(
  apiKey: string,
  model: string,
  messages: MessageParam[],
  tools?: unknown[],
  onRetry?: (msg: string) => void,
): Promise<ClaudeResponse> {
  const MAX_RETRIES = 4
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        ...(tools ? { tools } : {}),
        messages,
      }),
    })

    if (res.status === 429) {
      if (attempt === MAX_RETRIES - 1) throw new Error(`Rate limit hit after ${MAX_RETRIES} retries.`)
      const waitMs = Math.pow(2, attempt + 1) * 1500
      onRetry?.(`Rate limited — retrying in ${waitMs / 1000}s… (attempt ${attempt + 1}/${MAX_RETRIES})`)
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Claude API error: ${res.status} — ${err}`)
    }
    return await res.json() as ClaudeResponse
  }
  throw new Error('Max retries exceeded')
}

// ── useBrowserAgent hook ──────────────────────────────────────────────────────

function useBrowserAgent(apiKey: string) {
  const [ptInfo, setPtInfo] = useState<PinchTabInfo>({
    status: 'checking',
    version: '',
    instanceCount: 0,
    endpoint: 'localhost:9867',
    instanceId: '',
  })
  const [run, setRun] = useState<AgentRun | null>(null)
  const abortRef = useRef(false)
  const tabIdRef = useRef<string>('')

  useEffect(() => {
    let mounted = true
    const poll = async () => {
      const h = await ptHealth()
      if (mounted) {
        setPtInfo(prev => ({
          ...prev,
          status: h.ok ? 'connected' : 'disconnected',
          version: h.version,
          instanceId: h.instanceId || prev.instanceId,
          instanceCount: h.ok ? 1 : 0,
        }))
      }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  const repoll = useCallback(() => {
    setPtInfo(prev => ({ ...prev, status: 'checking' }))
    ptHealth().then(h => {
      setPtInfo(prev => ({
        ...prev,
        status: h.ok ? 'connected' : 'disconnected',
        version: h.version,
        instanceId: h.instanceId || prev.instanceId,
        instanceCount: h.ok ? 1 : 0,
      }))
    })
  }, [])

  const addStep = useCallback((step: Omit<AgentStep, 'id' | 'ts'>) => {
    const full: AgentStep = {
      ...step,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts: Date.now(),
    }
    setRun(prev => prev ? { ...prev, steps: [...prev.steps, full] } : prev)
    return full.id
  }, [])

  const updateStep = useCallback((id: string, patch: Partial<AgentStep>) => {
    setRun(prev => {
      if (!prev) return prev
      return { ...prev, steps: prev.steps.map(s => s.id === id ? { ...s, ...patch } : s) }
    })
  }, [])

  const executeTool = useCallback(async (
    name: string,
    input: Record<string, unknown>,
    instanceId: string,
    requireApproval: boolean,
  ): Promise<string> => {
    const tabId = tabIdRef.current

    const WRITE_TOOLS = ['browser_click', 'browser_fill']
    if (requireApproval && WRITE_TOOLS.includes(name)) {
      const desc = name === 'browser_click'
        ? `Click element [${input.ref}] on ${tabId ? 'current page' : 'browser'}`
        : `Fill [${input.ref}] with "${String(input.value).slice(0, 60)}"`
      const approved = await requestApproval({
        agentId: 'browser',
        agentName: 'Browser Agent',
        action: name.replace('browser_', '').toUpperCase(),
        description: desc,
        risk: 'medium',
        timeoutMs: 5 * 60_000,
      })
      if (!approved) return `Action rejected by user: ${name}`
    }

    switch (name) {
      case 'browser_navigate': {
        const url = input.url as string
        const newTabId = await ptOpenTab(instanceId, url)
        tabIdRef.current = newTabId
        setRun(prev => prev ? { ...prev, tabId: newTabId, currentUrl: url } : prev)
        await new Promise(r => setTimeout(r, 1800))
        return `Navigated to ${url}`
      }
      case 'browser_snapshot': {
        if (!tabId) return 'No tab open yet. Call browser_navigate first to open a URL.'
        return ptSnapshot(tabId)
      }
      case 'browser_read': {
        if (!tabId) return 'No tab open yet. Call browser_navigate first to open a URL.'
        const text = await ptText(tabId)
        return text.length > 6000 ? text.slice(0, 6000) + '\n\n[... content truncated to 6000 chars ...]' : text
      }
      case 'browser_click': {
        if (!tabId) return 'No tab open yet. Call browser_navigate first to open a URL.'
        const result = await ptClick(tabId, input.ref as string)
        await new Promise(r => setTimeout(r, 1000))
        return result
      }
      case 'browser_fill': {
        if (!tabId) return 'No tab open yet. Call browser_navigate first to open a URL.'
        return ptFill(tabId, input.ref as string, input.value as string)
      }
      case 'browser_screenshot': {
        if (!tabId) return 'No tab open yet. Call browser_navigate first to open a URL.'
        const base64 = await ptScreenshot(tabId)
        if (base64) {
          setRun(prev => prev ? { ...prev, screenshot: base64 } : prev)
          return 'Screenshot captured and displayed in the Result panel.'
        }
        return 'Screenshot could not be captured.'
      }
      default:
        return `Unknown tool: ${name}`
    }
  }, [])

  const start = useCallback(async (task: string, requireApproval = false) => {
    if (!apiKey.startsWith('sk-') || ptInfo.status !== 'connected') return

    const instanceId = ptInfo.instanceId
    if (!instanceId) {
      setRun({
        id: `${Date.now()}`,
        task,
        status: 'error',
        steps: [],
        result: 'No PinchTab instance found. Make sure PinchTab server is running and the token is correct.',
        instanceId: null,
        tabId: null,
        startTs: Date.now(),
        currentUrl: '',
        screenshot: null,
      })
      return
    }

    abortRef.current = false
    tabIdRef.current = ''

    setRun({
      id: `${Date.now()}`,
      task,
      status: 'running',
      steps: [],
      result: '',
      instanceId,
      tabId: null,
      startTs: Date.now(),
      currentUrl: '',
      screenshot: null,
    })

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: `You are an autonomous browser agent. Complete this task using the browser tools:\n\n${task}\n\nIMPORTANT WORKFLOW:\n1. Start with browser_navigate to open a URL\n2. Use browser_snapshot to see interactive elements and their ref IDs (e0, e1, e2...)\n3. Use browser_click or browser_fill with the exact ref IDs from the snapshot\n4. Use browser_read to extract page text and information\n5. Use browser_screenshot to visually check the page state\n\nCRITICAL: NEVER guess or invent ref IDs. Always call browser_snapshot first to get current refs.\n\nFORMATTING RULES for your final answer:\n- No markdown: no **, no __, no ##, no bullet dashes\n- No emojis\n- Use plain numbered lists (1. 2. 3.) for ordered items\n- Use clean indentation and line breaks for structure\n- Write in a professional, concise tone\n\nWhen you have enough information, provide a comprehensive final answer without using more tools.`,
      },
    ]

    const compressHistory = (msgs: MessageParam[]): MessageParam[] =>
      msgs.map(msg => {
        if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg
        return {
          ...msg,
          content: (msg.content as ToolResultContent[]).map(block => {
            if (block.type !== 'tool_result') return block
            const c = block.content
            if (c.length <= HISTORY_RESULT_LIMIT) return block
            return { ...block, content: c.slice(0, HISTORY_RESULT_LIMIT) + '\n[...truncated]' }
          }),
        }
      })

    const callClaude = async (model: string, msgs: MessageParam[], useTools: boolean): Promise<ClaudeResponse> =>
      callClaudeAPI(apiKey, model, compressHistory(msgs), useTools ? BROWSER_TOOLS : undefined,
        (msg) => setRun(prev => prev ? { ...prev, result: msg } : prev))

    let iterations = 0
    const MAX_ITERATIONS = 25

    try {
      while (iterations < MAX_ITERATIONS && !abortRef.current) {
        iterations++
        const isLastIteration = iterations >= MAX_ITERATIONS
        const data = await callClaude(LOOP_MODEL, messages, true)

        if (abortRef.current) break

        if (data.stop_reason === 'end_turn' || isLastIteration) {
          const finalData = await callClaude(FINAL_MODEL, [
            ...messages,
            { role: 'assistant', content: data.content },
            {
              role: 'user',
              content: 'You have finished browsing. Write your final answer now based on everything you have gathered. Follow the formatting rules strictly.',
            },
          ], false)
          const text = finalData.content.find((b): b is ClaudeTextBlock => b.type === 'text')?.text ?? ''
          setRun(prev => prev ? { ...prev, status: 'done', result: text } : prev)
          break
        }

        if (data.stop_reason === 'tool_use') {
          const toolUseBlocks = data.content.filter((b): b is ClaudeToolUseBlock => b.type === 'tool_use')
          const toolResults: ToolResultContent[] = []

          for (const block of toolUseBlocks) {
            if (abortRef.current) break

            const stepId = addStep({
              tool: block.name,
              input: block.input,
              output: '',
              status: 'running',
            })

            let output = ''
            let stepStatus: StepStatus = 'done'

            try {
              output = await executeTool(block.name, block.input, instanceId, requireApproval)
            } catch (err) {
              output = `Error: ${err instanceof Error ? err.message : String(err)}`
              stepStatus = 'error'
            }

            updateStep(stepId, { output, status: stepStatus })
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: output })
          }

          messages.push({ role: 'assistant', content: data.content })
          messages.push({ role: 'user', content: toolResults })
        }
      }

      if (iterations >= MAX_ITERATIONS) {
        setRun(prev => prev ? {
          ...prev,
          status: 'done',
          result: 'Reached maximum tool iterations (25). Here is the information gathered so far from the browser session.',
        } : prev)
      }
    } catch (err) {
      setRun(prev => prev ? {
        ...prev,
        status: 'error',
        result: err instanceof Error ? err.message : String(err),
      } : prev)
    }
  }, [apiKey, ptInfo, addStep, updateStep, executeTool])

  const stop = useCallback(() => {
    abortRef.current = true
    setRun(prev => prev && prev.status === 'running' ? { ...prev, status: 'stopped' } : prev)
  }, [])

  const clear = useCallback(() => {
    abortRef.current = true
    tabIdRef.current = ''
    setRun(null)
  }, [])

  return { ptInfo, run, start, stop, clear, repoll }
}

// ── Step trace item ───────────────────────────────────────────────────────────

function StepItem({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(false)
  const color = TOOL_COLORS[step.tool] ?? 'var(--accent)'
  const label = step.tool.replace('browser_', '')

  const inputSummary = (() => {
    const v = Object.values(step.input)
    if (v.length === 0) return ''
    const s = String(v[0])
    return s.length > 60 ? s.slice(0, 60) + '…' : s
  })()

  return (
    <div
      style={{
        borderLeft: `2px solid ${color}`,
        paddingLeft: 10,
        marginBottom: 6,
        cursor: step.output ? 'pointer' : 'default',
      }}
      onClick={() => step.output && setExpanded(e => !e)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: step.status === 'running' ? '#f59e0b'
            : step.status === 'done' ? '#10b981'
            : step.status === 'error' ? '#ef4444'
            : 'var(--muted)',
          animation: step.status === 'running' ? 'pulse 1s infinite' : undefined,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
          {label}
        </span>
        {inputSummary && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {inputSummary}
          </span>
        )}
        {step.output && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      {expanded && step.output && (
        <div style={{
          marginTop: 6,
          padding: '6px 8px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'pre-wrap',
          maxHeight: 200,
          overflow: 'auto',
          lineHeight: 1.5,
        }}>
          {step.output.length > 800 ? step.output.slice(0, 800) + '\n…' : step.output}
        </div>
      )}
    </div>
  )
}

// ── PinchTab token config ─────────────────────────────────────────────────────

function TokenConfig({ onSaved }: { onSaved: () => void }) {
  const [token, setToken] = useState(getPtToken())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem(PT_TOKEN_KEY, token.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 600)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 40px', gap: 16, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        🔑
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Configure PinchTab Token</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 400, lineHeight: 1.7 }}>
        PinchTab uses a Bearer token for authentication. Find your token in{' '}
        <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '1px 5px', borderRadius: 3 }}>
          ~/.pinchtab/config.json
        </code>
      </div>

      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)',
        textAlign: 'left', maxWidth: 440, width: '100%',
      }}>
        # Install (avoids sudo permission errors):<br />
        npm install -g pinchtab --prefix ~/.npm-global<br /><br />
        # Start the server:<br />
        ~/.npm-global/bin/pinchtab server<br /><br />
        # Get your token:<br />
        cat ~/.pinchtab/config.json
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, textAlign: 'left' }}>
          Bearer Token
        </label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste your PinchTab token here"
          onKeyDown={e => e.key === 'Enter' && token.trim() && handleSave()}
          style={{ width: '100%', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 10 }}
        />
        <button
          className="btn-primary"
          disabled={!token.trim()}
          onClick={handleSave}
          style={{ width: '100%', fontSize: 13, padding: '9px' }}
        >
          {saved ? '✓ Saved' : 'Save Token & Connect'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 440, lineHeight: 1.6 }}>
        Token is stored in your browser's localStorage and never sent anywhere except your local PinchTab server.
      </div>
    </div>
  )
}

// ── PinchTab status bar ───────────────────────────────────────────────────────

function PinchTabBar({ info, onConfigToken }: { info: PinchTabInfo; onConfigToken: () => void }) {
  const dotColor =
    info.status === 'connected' ? '#10b981' :
    info.status === 'checking'  ? '#f59e0b' :
    '#64748b'

  const hasToken = !!getPtToken()

  return (
    <div style={{
      padding: '7px 20px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 11,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>PinchTab</span>
      <span style={{ color: 'var(--muted)' }}>
        {!hasToken
          ? 'Token required'
          : info.status === 'checking'  ? 'Connecting…'
          : info.status === 'connected' ? `Connected · ${info.endpoint}`
          : 'Not reachable · is pinchtab server running?'}
      </span>
      {info.status === 'connected' && info.version && (
        <span className="badge badge-gray" style={{ fontSize: 9 }}>v{info.version}</span>
      )}
      {info.status === 'connected' && info.instanceId && (
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
          {info.instanceId}
        </span>
      )}
      <button
        className="btn-ghost"
        onClick={onConfigToken}
        style={{ marginLeft: info.status === 'connected' ? 8 : 'auto', fontSize: 10, padding: '2px 8px' }}
      >
        {hasToken ? 'Change token' : 'Set token →'}
      </button>
    </div>
  )
}

// ── Disconnected state (shared by browser-dependent panels) ───────────────────

function PinchTabDisconnected({ repoll, onConfigToken }: { repoll: () => void; onConfigToken: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 40px', gap: 16, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        🌐
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>PinchTab server not reachable</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380, lineHeight: 1.7 }}>
        Token is set but the server isn't responding. Make sure PinchTab is running on localhost:9867.
      </div>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)',
      }}>
        # Install (avoids sudo permission errors)<br />
        npm install -g pinchtab --prefix ~/.npm-global<br /><br />
        # Start the server<br />
        ~/.npm-global/bin/pinchtab server
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-primary" onClick={repoll} style={{ fontSize: 13, padding: '8px 20px' }}>
          Retry Connection
        </button>
        <button className="btn-secondary" onClick={onConfigToken} style={{ fontSize: 13, padding: '8px 20px' }}>
          Change Token
        </button>
      </div>
    </div>
  )
}

// ── Browser Agent panel ───────────────────────────────────────────────────────

function BrowserAgentPanel({ apiKey, ptInfo, onConfigToken, repoll }: {
  apiKey: string
  ptInfo: PinchTabInfo
  onConfigToken: () => void
  repoll: () => void
}) {
  const { run, start, stop, clear } = useBrowserAgent(apiKey)
  const [task,            setTask]            = useState('')
  const [requireApproval, setRequireApproval] = useState(false)
  const [showScreenshot,  setShowScreenshot]  = useState(true)
  const traceRef = useRef<HTMLDivElement>(null)

  // Broadcast run status so the Sidebar can show a live indicator
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agentis_hands_status', { detail: { running: run?.status === 'running' } }))
  }, [run?.status])

  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight
    }
  }, [run?.steps.length])

  const handleRun = () => {
    if (task.trim()) start(task.trim(), requireApproval)
  }

  const elapsed = run ? Math.floor((Date.now() - run.startTs) / 1000) : 0

  if (!getPtToken()) {
    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TokenConfig onSaved={repoll} />
      </div>
    )
  }

  if (ptInfo.status === 'disconnected') {
    return <PinchTabDisconnected repoll={repoll} onConfigToken={onConfigToken} />
  }

  if (ptInfo.status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--muted)', fontSize: 13 }}>
        Connecting to PinchTab…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Task input */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && run?.status !== 'running' && handleRun()}
            placeholder="Give the browser agent a task… e.g. 'Find the top 5 AI stories on HN today'"
            disabled={run?.status === 'running'}
            style={{ flex: 1, fontSize: 13, padding: '9px 12px', fontFamily: 'var(--font-sans)' }}
          />
          {run?.status === 'running' ? (
            <button
              className="btn-secondary"
              onClick={stop}
              style={{ fontSize: 13, padding: '0 16px', flexShrink: 0, color: '#ef4444', borderColor: '#ef4444' }}
            >
              Stop
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={!task.trim() || !apiKey.startsWith('sk-')}
              onClick={handleRun}
              style={{ fontSize: 13, padding: '0 20px', flexShrink: 0 }}
            >
              Run
            </button>
          )}
          {run && run.status !== 'running' && (
            <button
              className="btn-secondary"
              onClick={clear}
              style={{ fontSize: 13, padding: '0 12px', flexShrink: 0 }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => setRequireApproval(s => !s)}
              style={{
                width: 28, height: 16, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                background: requireApproval ? '#f59e0b' : 'var(--border)',
                position: 'relative', transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: requireApproval ? 14 : 2,
                transition: 'left 0.15s',
              }} />
            </div>
            <span style={{ fontSize: 11, color: requireApproval ? '#f59e0b' : 'var(--muted)' }}>
              Approve write actions
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => setShowScreenshot(s => !s)}
              style={{
                width: 28, height: 16, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                background: showScreenshot ? '#6366f1' : 'var(--border)',
                position: 'relative', transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: showScreenshot ? 14 : 2,
                transition: 'left 0.15s',
              }} />
            </div>
            <span style={{ fontSize: 11, color: showScreenshot ? '#6366f1' : 'var(--muted)' }}>
              Show screenshots
            </span>
          </div>
        </div>

        {!run && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {EXAMPLE_TASKS.map(ex => (
              <button
                key={ex}
                onClick={() => setTask(ex)}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  textAlign: 'left',
                }}
              >
                {ex.slice(0, 55)}{ex.length > 55 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main area: trace + result */}
      {run ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.4fr', overflow: 'hidden' }}>

          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Action Trace
              </span>
              <span className="badge badge-gray" style={{ fontSize: 9 }}>{run.steps.length} steps</span>
              {run.status === 'running' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#f59e0b' }}>⏱ {elapsed}s</span>
              )}
              {(run.status === 'done' || run.status === 'stopped') && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981' }}>✓ {elapsed}s</span>
              )}
              {run.status === 'error' && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ef4444' }}>✗ Error</span>
              )}
            </div>

            <div ref={traceRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
              {run.steps.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingTop: 8 }}>
                  Starting browser session…
                </div>
              ) : (
                run.steps.map(step => <StepItem key={step.id} step={step} />)
              )}
              {run.status === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Claude is thinking…</span>
                </div>
              )}
            </div>

            {(run.instanceId || run.tabId) && (
              <div style={{
                padding: '6px 14px', borderTop: '1px solid var(--border)',
                fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {run.instanceId && <span>inst: {run.instanceId.slice(0, 16)}</span>}
                {run.tabId && <span style={{ marginLeft: 8 }}>tab: {run.tabId.slice(0, 8)}…</span>}
                {run.currentUrl && (
                  <div style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.currentUrl.length > 50 ? run.currentUrl.slice(0, 50) + '…' : run.currentUrl}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid var(--border)',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Result
              </span>
              {run.screenshot && (
                <span className="badge badge-accent" style={{ fontSize: 9 }}>Screenshot captured</span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {run.screenshot && showScreenshot && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Last Screenshot
                  </div>
                  <img
                    src={`data:image/jpeg;base64,${run.screenshot}`}
                    alt="Browser screenshot"
                    style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', display: 'block' }}
                  />
                </div>
              )}
              {run.status === 'running' && !run.result && (
                <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.7 }}>
                  Browser agent is working…<br />
                  <span style={{ fontSize: 11 }}>The final answer will appear here when complete.</span>
                </div>
              )}
              {run.status === 'error' && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, padding: 12, fontSize: 12, color: '#ef4444', lineHeight: 1.6,
                }}>
                  <strong>Error:</strong> {run.result}
                </div>
              )}
              {run.result && run.status !== 'error' && (
                <div style={{
                  fontSize: 13, color: 'var(--fg)', lineHeight: 1.85,
                  whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
                }}>
                  {run.result
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/__(.*?)__/g, '$1')
                    .replace(/^#{1,6}\s+/gm, '')
                    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
                    .trim()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, color: 'var(--muted)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            🌐
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Browser Agent ready</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 380, lineHeight: 1.7 }}>
            Type a task above. Claude will autonomously navigate the web using PinchTab's accessibility tree API.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            {(['navigate', 'snapshot', 'read', 'click', 'fill', 'screenshot'] as const).map(t => (
              <span key={t} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: 'var(--surface)', border: `1px solid ${TOOL_COLORS[`browser_${t}`] ?? 'var(--border)'}`,
                color: TOOL_COLORS[`browser_${t}`] ?? 'var(--muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                {t}
              </span>
            ))}
          </div>
          {ptInfo.instanceId && (
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              Instance: {ptInfo.instanceId}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Clip Hand panel ───────────────────────────────────────────────────────────

function ClipPanel() {
  const [readResult, setReadResult] = useState('')
  const [readError, setReadError] = useState('')
  const [writeText, setWriteText] = useState('')
  const [writeCopied, setWriteCopied] = useState(false)

  const handleRead = async () => {
    try {
      setReadError('')
      const text = await navigator.clipboard.readText()
      setReadResult(text)
    } catch (err) {
      setReadError(`Could not read clipboard: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleWrite = async () => {
    if (!writeText.trim()) return
    try {
      await navigator.clipboard.writeText(writeText)
      setWriteCopied(true)
      setTimeout(() => setWriteCopied(false), 1500)
    } catch (err) {
      alert(`Could not write to clipboard: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, overflow: 'hidden' }}>

        {/* Read panel */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Read Clipboard
            </span>
            <button
              className="btn-primary"
              onClick={handleRead}
              style={{ fontSize: 11, padding: '4px 12px' }}
            >
              Read
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {readError && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6, padding: 10, fontSize: 12, color: '#ef4444', marginBottom: 10,
              }}>
                {readError}
              </div>
            )}
            {readResult ? (
              <pre style={{
                fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6,
              }}>
                {readResult}
              </pre>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingTop: 8 }}>
                Click "Read" to pull current clipboard content into view.
              </div>
            )}
          </div>
          {readResult && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{readResult.length} chars</span>
            </div>
          )}
        </div>

        {/* Write panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Write to Clipboard
            </span>
            <button
              className="btn-primary"
              disabled={!writeText.trim()}
              onClick={handleWrite}
              style={{ fontSize: 11, padding: '4px 12px' }}
            >
              {writeCopied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
            <textarea
              value={writeText}
              onChange={e => setWriteText(e.target.value)}
              placeholder="Type or paste content here to copy it to the clipboard…"
              style={{
                flex: 1, resize: 'none', fontSize: 12, fontFamily: 'var(--font-mono)',
                padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)', lineHeight: 1.6,
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{writeText.length} chars</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Load Hand panel ───────────────────────────────────────────────────────────

interface LoadedFile {
  name: string
  size: number
  type: string
  content: string
  rows?: string[][]
}

function LoadPanel() {
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const raw = e.target?.result as string
      let content = raw
      let rows: string[][] | undefined

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(raw)
          content = JSON.stringify(parsed, null, 2)
        } catch {
          content = raw
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = raw.split('\n').filter(l => l.trim())
        rows = lines.slice(0, 10).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
        content = raw
      }

      setLoadedFile({
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop()?.toUpperCase() ?? 'TXT',
        content,
        rows,
      })
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleCopy = async () => {
    if (!loadedFile) return
    await navigator.clipboard.writeText(loadedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fmtSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Drop zone */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '24px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            background: dragging ? 'rgba(99,102,241,0.06)' : 'transparent',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>
            Drop a file here or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Supports .txt, .md, .json, .csv
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      {/* Output */}
      {loadedFile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* File meta */}
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8', fontFamily: 'var(--font-mono)',
            }}>
              {loadedFile.type}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{loadedFile.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtSize(loadedFile.size)}</span>
            <button
              className="btn-secondary"
              onClick={handleCopy}
              style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px' }}
            >
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>

          {/* CSV table preview */}
          {loadedFile.rows && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 8 }}>
                CSV Preview (first 10 rows)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <tbody>
                    {loadedFile.rows.map((row, i) => (
                      <tr key={i} style={{ background: i === 0 ? 'var(--surface)' : 'transparent' }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{
                            padding: '4px 10px',
                            border: '1px solid var(--border)',
                            color: i === 0 ? 'var(--fg)' : 'var(--muted)',
                            fontWeight: i === 0 ? 600 : 400,
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <pre style={{
              fontSize: 11, color: 'var(--fg)', fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.6,
            }}>
              {loadedFile.content}
            </pre>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', fontSize: 13, fontStyle: 'italic',
        }}>
          No file loaded yet
        </div>
      )}
    </div>
  )
}

// ── Researcher Hand panel ─────────────────────────────────────────────────────

function ResearcherPanel({ apiKey, ptInfo, onConfigToken, repoll }: {
  apiKey: string
  ptInfo: PinchTabInfo
  onConfigToken: () => void
  repoll: () => void
}) {
  const { run, start, stop, clear } = useBrowserAgent(apiKey)
  const [task, setTask] = useState('')
  const traceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight
  }, [run?.steps.length])

  const handleRun = () => {
    if (!task.trim()) return
    const researchTask = `You are a research agent. Your goal is to research the following topic thoroughly and produce a structured report with numbered sources.

Topic: ${task}

RESEARCH WORKFLOW:
1. Identify 3-5 authoritative sources to visit
2. Navigate to each source using browser_navigate
3. Use browser_read to extract key information from each page
4. After visiting all sources, synthesize the information

OUTPUT FORMAT (strict):
- Start with a 2-3 sentence summary
- Use numbered sections for key findings
- End with a "Sources" section listing each URL you visited with a 1-line description
- No markdown formatting, no emojis, plain text only`

    start(researchTask, false)
  }

  const elapsed = run ? Math.floor((Date.now() - run.startTs) / 1000) : 0

  if (!getPtToken()) {
    return <div style={{ flex: 1, overflowY: 'auto' }}><TokenConfig onSaved={repoll} /></div>
  }
  if (ptInfo.status === 'disconnected') {
    return <PinchTabDisconnected repoll={repoll} onConfigToken={onConfigToken} />
  }
  if (ptInfo.status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--muted)', fontSize: 13 }}>
        Connecting to PinchTab…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={task}
            onChange={e => setTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && run?.status !== 'running' && handleRun()}
            placeholder="Enter a research topic…"
            disabled={run?.status === 'running'}
            style={{ flex: 1, fontSize: 13, padding: '9px 12px', fontFamily: 'var(--font-sans)' }}
          />
          {run?.status === 'running' ? (
            <button className="btn-secondary" onClick={stop}
              style={{ fontSize: 13, padding: '0 16px', flexShrink: 0, color: '#ef4444', borderColor: '#ef4444' }}>
              Stop
            </button>
          ) : (
            <button className="btn-primary" disabled={!task.trim() || !apiKey.startsWith('sk-')} onClick={handleRun}
              style={{ fontSize: 13, padding: '0 20px', flexShrink: 0 }}>
              Research
            </button>
          )}
          {run && run.status !== 'running' && (
            <button className="btn-secondary" onClick={clear} style={{ fontSize: 13, padding: '0 12px', flexShrink: 0 }}>
              Clear
            </button>
          )}
        </div>
        {!run && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {RESEARCHER_EXAMPLE_TASKS.map(ex => (
              <button key={ex} onClick={() => setTask(ex)} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4,
                background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
              }}>
                {ex.slice(0, 55)}{ex.length > 55 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {run ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.4fr', overflow: 'hidden' }}>
          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '8px 14px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Research Steps
              </span>
              <span className="badge badge-gray" style={{ fontSize: 9 }}>{run.steps.length} steps</span>
              {run.status === 'running' && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#f59e0b' }}>⏱ {elapsed}s</span>}
              {(run.status === 'done' || run.status === 'stopped') && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981' }}>✓ {elapsed}s</span>}
            </div>
            <div ref={traceRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
              {run.steps.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingTop: 8 }}>Starting research…</div>
              ) : (
                run.steps.map(step => <StepItem key={step.id} step={step} />)
              )}
              {run.status === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Researching…</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Research Report
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {run.status === 'running' && !run.result && (
                <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.7 }}>
                  Visiting sources and gathering information…<br />
                  <span style={{ fontSize: 11 }}>The report will appear here when complete.</span>
                </div>
              )}
              {run.status === 'error' && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, padding: 12, fontSize: 12, color: '#ef4444', lineHeight: 1.6,
                }}>
                  <strong>Error:</strong> {run.result}
                </div>
              )}
              {run.result && run.status !== 'error' && (
                <div style={{
                  fontSize: 13, color: 'var(--fg)', lineHeight: 1.85,
                  whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
                }}>
                  {run.result
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/__(.*?)__/g, '$1')
                    .replace(/^#{1,6}\s+/gm, '')
                    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
                    .trim()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            🔍
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Researcher ready</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 380, lineHeight: 1.7 }}>
            Enter a research topic above. Claude will visit multiple sources and produce a structured report with citations.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Collector Hand panel ──────────────────────────────────────────────────────

function CollectorPanel({ apiKey, ptInfo, onConfigToken, repoll }: {
  apiKey: string
  ptInfo: PinchTabInfo
  onConfigToken: () => void
  repoll: () => void
}) {
  const [urls, setUrls] = useState('')
  const [status, setStatus] = useState<'idle' | 'collecting' | 'synthesizing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [collected, setCollected] = useState<Array<{ url: string; text: string }>>([])
  const [synthesis, setSynthesis] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  const handleCollect = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
    if (!urlList.length) return

    abortRef.current = false
    setStatus('collecting')
    setProgress({ current: 0, total: urlList.length })
    setCollected([])
    setSynthesis('')
    setError('')

    const results: Array<{ url: string; text: string }> = []

    try {
      for (let i = 0; i < urlList.length; i++) {
        if (abortRef.current) break
        setProgress({ current: i + 1, total: urlList.length })
        const url = urlList[i]

        const tabId = await ptOpenTab(ptInfo.instanceId, url)
        await new Promise(r => setTimeout(r, 2000))
        const text = await ptText(tabId)
        const trimmed = text.length > 4000 ? text.slice(0, 4000) + '\n[truncated]' : text
        results.push({ url, text: trimmed })
        setCollected([...results])
      }

      if (abortRef.current) {
        setStatus('idle')
        return
      }

      setStatus('synthesizing')

      const combinedContext = results.map((r, i) =>
        `--- Source ${i + 1}: ${r.url} ---\n${r.text}`
      ).join('\n\n')

      const messages: MessageParam[] = [
        {
          role: 'user',
          content: `You have collected text from ${results.length} URLs. Synthesize the content into a structured summary with source attribution per section.

${combinedContext}

INSTRUCTIONS:
- Write a cohesive summary that combines insights from all sources
- For each key point, attribute it to the relevant source (use "Source 1", "Source 2", etc.)
- End with a "Sources" section listing each URL
- No markdown, no emojis, plain text with numbered sections`,
        },
      ]

      const data = await callClaudeAPI(apiKey, FINAL_MODEL, messages)
      const text = data.content.find((b): b is ClaudeTextBlock => b.type === 'text')?.text ?? ''
      setSynthesis(text)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const handleStop = () => { abortRef.current = true; setStatus('idle') }
  const handleClear = () => { setStatus('idle'); setCollected([]); setSynthesis(''); setError('') }

  if (!getPtToken()) {
    return <div style={{ flex: 1, overflowY: 'auto' }}><TokenConfig onSaved={repoll} /></div>
  }
  if (ptInfo.status === 'disconnected') {
    return <PinchTabDisconnected repoll={repoll} onConfigToken={onConfigToken} />
  }
  if (ptInfo.status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--muted)', fontSize: 13 }}>
        Connecting to PinchTab…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* URL input */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
            URLs to collect (one per line)
          </label>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            disabled={status === 'collecting' || status === 'synthesizing'}
            placeholder={'https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3'}
            rows={4}
            style={{
              width: '100%', resize: 'vertical', fontSize: 12,
              fontFamily: 'var(--font-mono)', padding: '8px 10px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--fg)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status === 'collecting' || status === 'synthesizing' ? (
            <button className="btn-secondary" onClick={handleStop}
              style={{ fontSize: 13, padding: '7px 16px', color: '#ef4444', borderColor: '#ef4444' }}>
              Stop
            </button>
          ) : (
            <button className="btn-primary"
              disabled={!urls.trim() || !apiKey.startsWith('sk-')}
              onClick={handleCollect}
              style={{ fontSize: 13, padding: '7px 20px' }}>
              Collect & Synthesize
            </button>
          )}
          {(status === 'done' || status === 'error') && (
            <button className="btn-secondary" onClick={handleClear} style={{ fontSize: 13, padding: '7px 12px' }}>
              Clear
            </button>
          )}
          {(status === 'collecting' || status === 'synthesizing') && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {status === 'collecting'
                ? `Collecting ${progress.current} / ${progress.total}…`
                : 'Synthesizing with Claude…'}
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.4fr', overflow: 'hidden' }}>
        {/* Collected sources */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Collected ({collected.length})
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            {collected.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingTop: 8 }}>
                {status === 'idle' ? 'Enter URLs and click Collect.' : 'Fetching pages…'}
              </div>
            ) : (
              collected.map((c, i) => (
                <div key={i} style={{
                  marginBottom: 10, padding: '8px 10px',
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', marginBottom: 4, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    Source {i + 1}: {c.url}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>
                    {c.text.slice(0, 200)}{c.text.length > 200 ? '…' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Synthesis */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Synthesis
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {status === 'synthesizing' && !synthesis && (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                Synthesizing collected content with Claude…
              </div>
            )}
            {status === 'error' && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 6, padding: 12, fontSize: 12, color: '#ef4444', lineHeight: 1.6,
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            {synthesis && (
              <div style={{
                fontSize: 13, color: 'var(--fg)', lineHeight: 1.85,
                whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)',
              }}>
                {synthesis
                  .replace(/\*\*(.*?)\*\*/g, '$1')
                  .replace(/^#{1,6}\s+/gm, '')
                  .trim()}
              </div>
            )}
            {status === 'idle' && !synthesis && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                The synthesized summary will appear here after collection.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Predictor Hand panel ──────────────────────────────────────────────────────

type PredictCategory = 'Sentiment' | 'Topic' | 'Intent' | 'Language' | 'Spam/Ham' | 'Custom'

interface PredictResult {
  label: string
  confidence: number
  explanation: string
}

function PredictorPanel({ apiKey }: { apiKey: string }) {
  const [inputText, setInputText] = useState('')
  const [category, setCategory] = useState<PredictCategory>('Sentiment')
  const [customCategories, setCustomCategories] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<PredictResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handlePredict = async () => {
    if (!inputText.trim() || !apiKey.startsWith('sk-')) return
    setStatus('running')
    setResult(null)
    setErrorMsg('')

    let categoryDesc = ''
    if (category === 'Custom') {
      const cats = customCategories.split('\n').map(c => c.trim()).filter(Boolean)
      categoryDesc = `Custom categories: ${cats.join(', ')}`
    } else {
      const presets: Record<PredictCategory, string> = {
        Sentiment: 'Positive, Negative, or Neutral',
        Topic: 'Technology, Politics, Sports, Entertainment, Business, Science, Health, Other',
        Intent: 'Question, Statement, Request, Opinion, Command',
        Language: 'English, Spanish, French, German, Chinese, Japanese, Arabic, Portuguese, Other',
        'Spam/Ham': 'Spam or Ham (legitimate)',
        Custom: '',
      }
      categoryDesc = `Categories: ${presets[category]}`
    }

    const prompt = `Classify the following text.

Classification task: ${category}
${categoryDesc}

Text to classify:
"""
${inputText}
"""

Respond with EXACTLY this JSON format (no other text):
{
  "label": "<the category label>",
  "confidence": <integer 0-100>,
  "explanation": "<1-2 sentence explanation>"
}`

    try {
      const messages: MessageParam[] = [{ role: 'user', content: prompt }]
      const data = await callClaudeAPI(apiKey, LOOP_MODEL, messages)
      const text = data.content.find((b): b is ClaudeTextBlock => b.type === 'text')?.text ?? ''

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse classification response')
      const parsed = JSON.parse(jsonMatch[0]) as PredictResult
      setResult(parsed)
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Input area */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
            Text to classify
          </label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={status === 'running'}
            placeholder="Enter text to classify…"
            rows={4}
            style={{
              width: '100%', resize: 'vertical', fontSize: 13,
              fontFamily: 'var(--font-sans)', padding: '9px 12px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--fg)', lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
              Category type
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as PredictCategory)}
              disabled={status === 'running'}
              style={{
                width: '100%', fontSize: 12, padding: '8px 10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)',
              }}
            >
              {(['Sentiment', 'Topic', 'Intent', 'Language', 'Spam/Ham', 'Custom'] as PredictCategory[]).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            className="btn-primary"
            disabled={!inputText.trim() || !apiKey.startsWith('sk-') || status === 'running'}
            onClick={handlePredict}
            style={{ fontSize: 13, padding: '8px 24px', flexShrink: 0 }}
          >
            {status === 'running' ? 'Predicting…' : 'Predict'}
          </button>
        </div>

        {category === 'Custom' && (
          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
              Custom categories (one per line)
            </label>
            <textarea
              value={customCategories}
              onChange={e => setCustomCategories(e.target.value)}
              disabled={status === 'running'}
              placeholder={'Category A\nCategory B\nCategory C'}
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontSize: 12,
                fontFamily: 'var(--font-mono)', padding: '8px 10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--fg)',
              }}
            />
          </div>
        )}
      </div>

      {/* Result area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {status === 'idle' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12, color: 'var(--muted)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              📊
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Predictor ready</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 340, lineHeight: 1.7 }}>
              Enter text and choose a category type. Claude Haiku will classify it instantly with a confidence score.
            </div>
          </div>
        )}

        {status === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#f59e0b',
              display: 'inline-block',
            }} />
            Classifying with Claude Haiku…
          </div>
        )}

        {status === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: 14, fontSize: 12, color: '#ef4444', lineHeight: 1.6,
          }}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {status === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
            {/* Label card */}
            <div style={{
              padding: '20px 24px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
                {category} Classification
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                {result.label}
              </div>

              {/* Confidence bar */}
              <div style={{ marginTop: 12, marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>Confidence</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)' }}>{result.confidence}%</span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'var(--bg)', border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${result.confidence}%`,
                    background: result.confidence >= 80 ? '#10b981' : result.confidence >= 50 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              padding: '14px 16px',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 6 }}>
                Explanation
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.7 }}>
                {result.explanation}
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={() => { setStatus('idle'); setResult(null) }}
              style={{ fontSize: 12, padding: '7px 16px', alignSelf: 'flex-start' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main HandsPage ────────────────────────────────────────────────────────────

interface Props {
  apiKey: string
}

export function HandsPage({ apiKey }: Props) {
  const [tab, setTab] = useState<HandTab>('available')
  const [active, setActive] = useState<Set<string>>(new Set())
  const [showTokenConfig, setShowTokenConfig] = useState(false)
  const { ptInfo, repoll } = useBrowserAgent(apiKey)

  const toggle = (id: string) =>
    setActive(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const activeHands = HANDS.filter(h => active.has(h.id))

  const handleActivate = (hand: Hand) => {
    const isActive = active.has(hand.id)
    toggle(hand.id)
    if (!isActive && hand.tab !== 'available') {
      setTab(hand.tab)
    }
  }

  const handleConfigToken = () => {
    setShowTokenConfig(true)
    setTab('browser')
  }

  // Tabs that are shown only when the respective hand is active
  const allDynamicTabs: Array<{ id: HandTab; label: string; handId: string; dot?: string }> = [
    { id: 'browser' as HandTab, label: 'Browser Agent', handId: 'browser', dot: ptInfo.status === 'connected' ? '#10b981' : '#64748b' },
    { id: 'clip' as HandTab, label: 'Clip', handId: 'clip' },
    { id: 'load' as HandTab, label: 'Load', handId: 'load' },
    { id: 'researcher' as HandTab, label: 'Researcher', handId: 'researcher' },
    { id: 'collector' as HandTab, label: 'Collector', handId: 'collector' },
    { id: 'predictor' as HandTab, label: 'Predictor', handId: 'predictor' },
  ]
  const dynamicTabs = allDynamicTabs.filter(t => active.has(t.handId))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Hands</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 10 }}>
          Autonomous capability packs for agents
        </span>
      </div>

      <PinchTabBar info={ptInfo} onConfigToken={handleConfigToken} />

      <div style={{ padding: '0 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="tab-bar" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button className={`tab-btn${tab === 'available' ? ' active' : ''}`} onClick={() => setTab('available')}>
            Available ({HANDS.length})
          </button>
          <button className={`tab-btn${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
            Active ({active.size})
          </button>
          {dynamicTabs.map(dt => (
            <button
              key={dt.id}
              className={`tab-btn${tab === dt.id ? ' active' : ''}`}
              onClick={() => { setTab(dt.id); if (dt.id === 'browser') setShowTokenConfig(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {dt.dot && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: dt.dot, display: 'inline-block', flexShrink: 0,
                }} />
              )}
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {tab === 'browser' && (
          showTokenConfig
            ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <TokenConfig onSaved={() => { setShowTokenConfig(false); repoll() }} />
              </div>
            )
            : (
              <BrowserAgentPanel
                apiKey={apiKey}
                ptInfo={ptInfo}
                onConfigToken={handleConfigToken}
                repoll={repoll}
              />
            )
        )}

        {tab === 'clip' && <ClipPanel />}

        {tab === 'load' && <LoadPanel />}

        {tab === 'researcher' && (
          <ResearcherPanel
            apiKey={apiKey}
            ptInfo={ptInfo}
            onConfigToken={handleConfigToken}
            repoll={repoll}
          />
        )}

        {tab === 'collector' && (
          <CollectorPanel
            apiKey={apiKey}
            ptInfo={ptInfo}
            onConfigToken={handleConfigToken}
            repoll={repoll}
          />
        )}

        {tab === 'predictor' && <PredictorPanel apiKey={apiKey} />}

        {tab === 'available' && (
          <div className="of-page-content">
            <div className="of-info-banner" style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Hands — Curated Autonomous Capability Packages</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                Activate hands to give agents expanded capabilities. Browser Hand connects to PinchTab for real web access.
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {HANDS.map(hand => {
                const sc = STATUS_COLOR[hand.status]
                const isActive = active.has(hand.id)
                const isBrowser = hand.id === 'browser'
                return (
                  <div
                    key={hand.id}
                    className="card"
                    style={{
                      padding: '14px 16px',
                      border: isBrowser && ptInfo.status === 'connected'
                        ? '1px solid rgba(99,102,241,0.4)'
                        : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{hand.name}</span>
                        {isBrowser && ptInfo.status === 'connected' && (
                          <span className="badge badge-accent" style={{ fontSize: 9 }}>PinchTab</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 4,
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      }}>
                        {hand.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10 }}>
                      {hand.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {hand.tools.map(t => (
                        <span key={t} style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 4,
                          background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      className={isActive ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => handleActivate(hand)}
                      style={{ fontSize: 12, padding: '6px 16px' }}
                    >
                      {isActive ? 'Deactivate' : hand.tab !== 'available' ? 'Activate & Open' : 'Activate'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'active' && (
          <div className="of-page-content">
            {activeHands.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 20px', gap: 12,
              }}>
                <div style={{ fontSize: 32, opacity: 0.2 }}>—</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>No active hands</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
                  Activate a hand from the Available tab to give agents expanded capabilities.
                </div>
                <button className="btn-primary" onClick={() => setTab('available')} style={{ marginTop: 4, fontSize: 13 }}>
                  Browse Hands
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {activeHands.map(hand => {
                  const sc = STATUS_COLOR[hand.status]
                  return (
                    <div key={hand.id} className="card" style={{
                      padding: '14px 16px',
                      border: '1px solid var(--accent)',
                      background: 'rgba(var(--accent-rgb, 99,102,241),0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{hand.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: 4,
                          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                        }}>
                          {hand.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10 }}>
                        {hand.description}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {hand.tab !== 'available' && (
                          <button
                            className="btn-primary"
                            onClick={() => setTab(hand.tab)}
                            style={{ fontSize: 12, padding: '6px 16px' }}
                          >
                            Open
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() => toggle(hand.id)}
                          style={{ fontSize: 12, padding: '6px 16px' }}
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
