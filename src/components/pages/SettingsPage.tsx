import { useState, useEffect } from 'react'
import { getPbUrl, setPbUrl, checkPbHealth, syncLocalStorageToPb } from '@/lib/pb'
import { loadMemories, type MemoryEntry } from '@/lib/memory'
import { PROVIDER_MODELS, type LLMProvider } from '@/lib/multiAgentEngine'

type SettingsTab = 'providers' | 'models' | 'config' | 'security' | 'network' | 'budget' | 'system' | 'migration' | 'database' | 'memory'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
}

interface Model {
  id: string
  name: string
  provider: string
  type: string
  context: string
  inputCost: string
  outputCost: string
  status: 'AVAILABLE' | 'NEEDS KEY' | 'UNAVAILABLE'
}

// localStorage keys for provider API keys
const PROVIDER_KEY_PREFIX = 'agentis_provider_'

function loadProviderKey(id: string): string {
  return localStorage.getItem(`${PROVIDER_KEY_PREFIX}${id}`) ?? ''
}

function saveProviderKey(id: string, key: string): void {
  if (key) localStorage.setItem(`${PROVIDER_KEY_PREFIX}${id}`, key)
  else localStorage.removeItem(`${PROVIDER_KEY_PREFIX}${id}`)
}

interface Provider {
  id: string
  name: string
  models: number
  placeholder: string
  keyPrefix?: string       // expected key prefix for validation (e.g. 'sk-')
  endpoint?: string        // local providers use endpoint instead of key
  docsUrl: string
  description: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'anthropic', name: 'Anthropic', models: 4,
    placeholder: 'sk-ant-api03-...', keyPrefix: 'sk-',
    docsUrl: 'https://console.anthropic.com',
    description: 'Claude Opus, Sonnet, Haiku — frontier to fast',
  },
  {
    id: 'openai', name: 'OpenAI', models: 8,
    placeholder: 'sk-proj-...', keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-4.1, o4-mini, GPT-4o and more',
  },
  {
    id: 'google', name: 'Google AI', models: 4,
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Gemini 2.5 Pro, Flash, and experimental models',
  },
  {
    id: 'groq', name: 'Groq', models: 6,
    placeholder: 'gsk_...', keyPrefix: 'gsk_',
    docsUrl: 'https://console.groq.com/keys',
    description: 'Llama, Mixtral, Gemma — ultra-fast inference',
  },
  {
    id: 'mistral', name: 'Mistral AI', models: 5,
    placeholder: '...',
    docsUrl: 'https://console.mistral.ai/api-keys',
    description: 'Mistral Large, Small, Codestral, Nemo',
  },
  {
    id: 'deepseek', name: 'DeepSeek', models: 3,
    placeholder: 'sk-...',  keyPrefix: 'sk-',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    description: 'DeepSeek V3, R1 — top reasoning at low cost',
  },
  {
    id: 'openrouter', name: 'OpenRouter', models: 200,
    placeholder: 'sk-or-v1-...', keyPrefix: 'sk-or-',
    docsUrl: 'https://openrouter.ai/keys',
    description: '200+ models via single API — pay per use',
  },
  {
    id: 'cohere', name: 'Cohere', models: 3,
    placeholder: '...',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    description: 'Command R+, Command R — enterprise RAG',
  },
  {
    id: 'xai', name: 'xAI (Grok)', models: 3,
    placeholder: 'xai-...',  keyPrefix: 'xai-',
    docsUrl: 'https://console.x.ai',
    description: 'Grok 3, Grok 3 Mini — real-time web access',
  },
  {
    id: 'together', name: 'Together AI', models: 50,
    placeholder: '...',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    description: 'Open source models — Llama, Qwen, Mistral',
  },
  {
    id: 'ollama', name: 'Ollama', models: 0,
    placeholder: 'http://localhost:11434',
    endpoint: 'http://localhost:11434',
    docsUrl: 'https://ollama.ai',
    description: 'Run any model locally — no API key needed',
  },
  {
    id: 'lmstudio', name: 'LM Studio', models: 0,
    placeholder: 'http://localhost:1234',
    endpoint: 'http://localhost:1234',
    docsUrl: 'https://lmstudio.ai',
    description: 'Local model server with OpenAI-compatible API',
  },
]

const ALL_MODELS: Omit<Model, 'status'>[] = [
  // Anthropic
  { id: 'claude-opus-4-6',    name: 'Claude Opus 4.6',    provider: 'anthropic', type: 'FRONTIER',  context: '200K', inputCost: '$15.00', outputCost: '$75.00' },
  { id: 'claude-sonnet-4-6',  name: 'Claude Sonnet 4.6',  provider: 'anthropic', type: 'SMART',     context: '200K', inputCost: '$3.00',  outputCost: '$15.00' },
  { id: 'claude-haiku-4-5',   name: 'Claude Haiku 4.5',   provider: 'anthropic', type: 'FAST',      context: '200K', inputCost: '$0.80',  outputCost: '$4.00'  },
  // OpenAI
  { id: 'gpt-4.1',            name: 'GPT-4.1',            provider: 'openai',    type: 'FRONTIER',  context: '1M',   inputCost: '$2.00',  outputCost: '$8.00'  },
  { id: 'gpt-4.1-mini',       name: 'GPT-4.1 Mini',       provider: 'openai',    type: 'SMART',     context: '1M',   inputCost: '$0.40',  outputCost: '$1.60'  },
  { id: 'gpt-4.1-nano',       name: 'GPT-4.1 Nano',       provider: 'openai',    type: 'FAST',      context: '1M',   inputCost: '$0.10',  outputCost: '$0.40'  },
  { id: 'gpt-4o',             name: 'GPT-4o',             provider: 'openai',    type: 'SMART',     context: '128K', inputCost: '$2.50',  outputCost: '$10.00' },
  { id: 'o4-mini',            name: 'o4-mini',            provider: 'openai',    type: 'REASONING', context: '200K', inputCost: '$1.10',  outputCost: '$4.40'  },
  { id: 'o3',                 name: 'o3',                 provider: 'openai',    type: 'REASONING', context: '200K', inputCost: '$10.00', outputCost: '$40.00' },
  // Google
  { id: 'gemini-2.5-pro',     name: 'Gemini 2.5 Pro',     provider: 'google',    type: 'FRONTIER',  context: '1M',   inputCost: '$1.25',  outputCost: '$10.00' },
  { id: 'gemini-2.5-flash',   name: 'Gemini 2.5 Flash',   provider: 'google',    type: 'FAST',      context: '1M',   inputCost: '$0.15',  outputCost: '$0.60'  },
  { id: 'gemini-2.0-flash',   name: 'Gemini 2.0 Flash',   provider: 'google',    type: 'FAST',      context: '1M',   inputCost: '$0.10',  outputCost: '$0.40'  },
  // Groq
  { id: 'llama-3.3-70b',      name: 'Llama 3.3 70B',      provider: 'groq',      type: 'OPEN',      context: '128K', inputCost: '$0.59',  outputCost: '$0.79'  },
  { id: 'llama-3.1-8b',       name: 'Llama 3.1 8B',       provider: 'groq',      type: 'FAST',      context: '128K', inputCost: '$0.05',  outputCost: '$0.08'  },
  { id: 'mixtral-8x7b',       name: 'Mixtral 8x7B',       provider: 'groq',      type: 'SMART',     context: '32K',  inputCost: '$0.24',  outputCost: '$0.24'  },
  { id: 'gemma2-9b',          name: 'Gemma 2 9B',          provider: 'groq',      type: 'FAST',      context: '8K',   inputCost: '$0.20',  outputCost: '$0.20'  },
  // Mistral
  { id: 'mistral-large-2',    name: 'Mistral Large 2',    provider: 'mistral',   type: 'FRONTIER',  context: '128K', inputCost: '$2.00',  outputCost: '$6.00'  },
  { id: 'mistral-small-3',    name: 'Mistral Small 3.1',  provider: 'mistral',   type: 'SMART',     context: '128K', inputCost: '$0.10',  outputCost: '$0.30'  },
  { id: 'codestral',          name: 'Codestral',          provider: 'mistral',   type: 'CODE',      context: '256K', inputCost: '$0.30',  outputCost: '$0.90'  },
  { id: 'mistral-nemo',       name: 'Mistral Nemo',       provider: 'mistral',   type: 'FAST',      context: '128K', inputCost: '$0.15',  outputCost: '$0.15'  },
  // DeepSeek
  { id: 'deepseek-v3',        name: 'DeepSeek V3',        provider: 'deepseek',  type: 'SMART',     context: '128K', inputCost: '$0.27',  outputCost: '$1.10'  },
  { id: 'deepseek-r1',        name: 'DeepSeek R1',        provider: 'deepseek',  type: 'REASONING', context: '128K', inputCost: '$0.55',  outputCost: '$2.19'  },
  // OpenRouter
  { id: 'or-auto',            name: 'Auto (best price)',  provider: 'openrouter', type: 'SMART',    context: '200K', inputCost: 'varies', outputCost: 'varies' },
  { id: 'or-llama-maverick',  name: 'Llama 4 Maverick',  provider: 'openrouter', type: 'FRONTIER', context: '1M',   inputCost: '$0.18',  outputCost: '$0.60'  },
  { id: 'or-gemini-flash',    name: 'Gemini 2.5 Flash',  provider: 'openrouter', type: 'FAST',     context: '1M',   inputCost: '$0.15',  outputCost: '$0.60'  },
  // Cohere
  { id: 'command-r-plus',     name: 'Command R+',         provider: 'cohere',    type: 'FRONTIER',  context: '128K', inputCost: '$2.50',  outputCost: '$10.00' },
  { id: 'command-r',          name: 'Command R',          provider: 'cohere',    type: 'SMART',     context: '128K', inputCost: '$0.15',  outputCost: '$0.60'  },
  // xAI
  { id: 'grok-3',             name: 'Grok 3',             provider: 'xai',       type: 'FRONTIER',  context: '131K', inputCost: '$3.00',  outputCost: '$15.00' },
  { id: 'grok-3-mini',        name: 'Grok 3 Mini',        provider: 'xai',       type: 'FAST',      context: '131K', inputCost: '$0.30',  outputCost: '$0.50'  },
  // Together AI
  { id: 'together-llama-3',   name: 'Llama 3.1 405B',     provider: 'together',  type: 'OPEN',      context: '128K', inputCost: '$3.50',  outputCost: '$3.50'  },
  { id: 'together-qwen-2.5',  name: 'Qwen 2.5 72B',       provider: 'together',  type: 'SMART',     context: '32K',  inputCost: '$0.90',  outputCost: '$0.90'  },
  // Local
  { id: 'ollama-llama3',      name: 'Llama 3 (local)',    provider: 'ollama',    type: 'LOCAL',     context: '8K',   inputCost: '$0.00',  outputCost: '$0.00'  },
  { id: 'ollama-mistral',     name: 'Mistral (local)',    provider: 'ollama',    type: 'LOCAL',     context: '32K',  inputCost: '$0.00',  outputCost: '$0.00'  },
  { id: 'ollama-deepseek',    name: 'DeepSeek (local)',   provider: 'ollama',    type: 'LOCAL',     context: '32K',  inputCost: '$0.00',  outputCost: '$0.00'  },
  { id: 'lmstudio-local',     name: 'LM Studio (local)',  provider: 'lmstudio',  type: 'LOCAL',     context: '32K',  inputCost: '$0.00',  outputCost: '$0.00'  },
]

const CONFIG_SECTIONS = [
  { key: 'a2x', label: 'A2X', description: 'Agent-to-agent communication protocol settings' },
  { key: 'browser', label: 'Browser', description: 'Browser hand configuration and security settings' },
  { key: 'channels', label: 'Channels', description: 'Default channel routing and notification preferences' },
  { key: 'default_model', label: 'Default Model', description: 'Fallback model used when no specific model is requested' },
  { key: 'extensions', label: 'Extensions', description: 'Extension loading paths and security policies' },
  { key: 'general', label: 'General', description: 'Core runtime behavior and startup configuration' },
  { key: 'memory', label: 'Memory', description: 'Agent memory retention, search, and eviction policies' },
  { key: 'network', label: 'Network', description: 'P2P networking, peer discovery, and firewall rules' },
  { key: 'vault', label: 'Vault', description: 'Secrets management and credential storage' },
  { key: 'web', label: 'Web', description: 'Web server bind address, TLS, and CORS settings' },
]

const SECURITY_CORE = [
  { name: 'Path Traversal Prevention', desc: 'Blocks attempts to read files outside allowed directories' },
  { name: 'SSRF Protection', desc: 'Prevents server-side request forgery to internal networks' },
  { name: 'Capability-Based Access Control', desc: 'Agents only receive the tools they explicitly need' },
  { name: 'Privilege Escalation Prevention', desc: 'Sub-agents cannot inherit parent agent permissions' },
  { name: 'Subprocess Environment Isolation', desc: 'Child processes run with stripped-down environments' },
  { name: 'Security Headers', desc: 'CSP, HSTS, X-Frame-Options enforced on all responses' },
]

const SECURITY_CONTROLS = [
  { name: 'API Rate Limiting', desc: 'Configurable per-IP and per-agent request rate caps' },
  { name: 'WebSocket Connection Limits', desc: 'Maximum concurrent WS connections per client' },
  { name: 'Bearer Token Authentication', desc: 'JWT-based auth for all administrative API routes' },
]

const STATUS_COLOR = {
  AVAILABLE: { bg: 'rgba(29,158,117,0.1)', border: 'rgba(29,158,117,0.3)', text: '#1D9E75' },
  'NEEDS KEY': { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', text: '#f97316' },
  UNAVAILABLE: { bg: 'rgba(255,255,255,0.05)', border: 'var(--border)', text: 'var(--muted)' },
}

export function SettingsPage({ apiKey, onApiKeyChange }: Props) {
  const [tab, setTab] = useState<SettingsTab>('providers')
  // Load all saved provider keys from localStorage on mount
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(PROVIDERS.map(p => [p.id, loadProviderKey(p.id)]))
  )
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [modelSearch, setModelSearch] = useState('')
  const [modelProvider, setModelProvider] = useState('all')
  const [pbUrl, setPbUrlState] = useState(getPbUrl)
  const [pbStatus, setPbStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [pbMsg, setPbMsg] = useState('')
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [memorySearch, setMemorySearch] = useState('')

  useEffect(() => {
    if (tab === 'memory') setMemories(loadMemories().reverse())
  }, [tab])

  useEffect(() => {
    const handler = () => { if (tab === 'memory') setMemories(loadMemories().reverse()) }
    window.addEventListener('agentis_memory_update', handler)
    return () => window.removeEventListener('agentis_memory_update', handler)
  }, [tab])

  // Derive configured providers from saved keys
  const configuredProviders = new Set(
    PROVIDERS
      .filter(p => p.endpoint ? true : !!inputs[p.id])
      .map(p => p.id)
  )

  const handleSave = async (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId)
    if (!provider) return
    const value = (inputs[providerId] ?? '').trim()

    // Save to localStorage
    saveProviderKey(providerId, value)

    // If anthropic, also update app state + engine
    if (providerId === 'anthropic' && value.startsWith('sk-')) {
      onApiKeyChange(value)
      fetch('/agentis/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: value }),
      }).catch(() => { /* silent */ })
    }

    setSaved(s => ({ ...s, [providerId]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [providerId]: false })), 2000)
  }

  const handleTest = async (providerId: string) => {
    const value = (inputs[providerId] ?? '').trim()
    if (!value) return
    setTesting(s => ({ ...s, [providerId]: true }))
    setTestResult(s => ({ ...s, [providerId]: { ok: false, msg: '' } }))

    try {
      let ok = false
      let msg = ''

      if (providerId === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': value, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        })
        ok = res.ok; msg = ok ? 'Valid key — Anthropic API accessible' : `Error ${res.status}`
      } else if (providerId === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${value}` },
        })
        ok = res.ok; msg = ok ? 'Valid key — OpenAI API accessible' : `Error ${res.status}`
      } else if (providerId === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${value}`)
        ok = res.ok; msg = ok ? 'Valid key — Google AI accessible' : `Error ${res.status}`
      } else if (providerId === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${value}` },
        })
        ok = res.ok; msg = ok ? 'Valid key — Groq API accessible' : `Error ${res.status}`
      } else if (providerId === 'ollama') {
        const res = await fetch(`${value}/api/tags`)
        ok = res.ok; msg = ok ? 'Ollama server reachable' : 'Cannot reach Ollama server'
      } else if (providerId === 'lmstudio') {
        const res = await fetch(`${value}/v1/models`)
        ok = res.ok; msg = ok ? 'LM Studio server reachable' : 'Cannot reach LM Studio server'
      } else {
        ok = true; msg = 'Key saved (test not available for this provider yet)'
      }

      setTestResult(s => ({ ...s, [providerId]: { ok, msg } }))
    } catch (e) {
      setTestResult(s => ({ ...s, [providerId]: { ok: false, msg: e instanceof Error ? e.message : 'Request failed' } }))
    } finally {
      setTesting(s => ({ ...s, [providerId]: false }))
    }
  }

  const handleRemove = (providerId: string) => {
    saveProviderKey(providerId, '')
    setInputs(s => ({ ...s, [providerId]: '' }))
    setTestResult(s => ({ ...s, [providerId]: { ok: false, msg: '' } }))
    if (providerId === 'anthropic') onApiKeyChange('')
  }

  const maskedKey = (key: string) => key ? key.slice(0, 8) + '...' + key.slice(-4) : ''

  const handlePbSave = async () => {
    const url = pbUrl.trim().replace(/\/$/, '')
    setPbUrl(url)
    setPbStatus('checking')
    setPbMsg('')
    const { ok, version } = await checkPbHealth()
    if (ok) {
      setPbStatus('ok')
      setPbMsg(`Connected — PocketBase ${version}`)
    } else {
      setPbStatus('error')
      setPbMsg('Could not reach PocketBase. Check the URL and that the server is running.')
    }
  }

  const handlePbSync = async () => {
    setSyncStatus('Syncing...')
    const result = await syncLocalStorageToPb()
    setSyncStatus(`Synced: ${result.memories} memories, ${result.analytics} analytics records, ${result.sessions} sessions`)
    setTimeout(() => setSyncStatus(null), 6000)
  }

  // ── Migration helpers ──────────────────────────────────────────────────────
  const [migrateStatus, setMigrateStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showPathForm, setShowPathForm] = useState(false)
  const [clawPath, setClawPath] = useState('~/.openclaw')
  const [openfangPath, setOpenfangPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [detecting, setDetecting] = useState(false)
  interface DetectResult { path: string; agents: number; channels: number; memories: number; files: number }
  const [detected, setDetected] = useState<DetectResult | null>(null)
  const [migrating, setMigrating] = useState(false)

  const handleAutoDetect = async () => {
    setDetecting(true)
    setDetected(null)
    setMigrateStatus(null)
    try {
      const res = await fetch('/agentis/migrate/detect', { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data = await res.json() as DetectResult
        if (data.path) {
          setDetected(data)
          setClawPath(data.path)
        } else {
          setMigrateStatus({ ok: false, msg: 'OpenClaw installation not found. Try "Enter Path Manually" to specify the directory.' })
        }
      } else {
        setMigrateStatus({ ok: false, msg: 'Engine could not detect OpenClaw. Try "Enter Path Manually".' })
      }
    } catch {
      // Engine not running — fall back to manual path form pre-filled with default
      setClawPath('~/.openclaw')
      setOpenfangPath('')
      setShowPathForm(true)
      setMigrateStatus({ ok: false, msg: 'Engine not reachable — enter your paths below and click Scan Directory once the engine is running.' })
    } finally {
      setDetecting(false)
    }
  }

  const handleMigrateDetected = async () => {
    if (!detected) return
    setMigrating(true)
    setMigrateStatus(null)
    try {
      const dst = openfangPath.trim() || '~/.openfang'
      const res = await fetch('/agentis/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: detected.path, target: dst }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) {
        const data = await res.json() as { agents?: number; channels?: number; memories?: number; files?: number }
        setMigrateStatus({ ok: true, msg: `Migration complete — ${data.agents ?? 0} agents, ${data.channels ?? 0} channels, ${data.memories ?? 0} memory entries, ${data.files ?? 0} workspace files transferred.` })
        setDetected(null)
      } else {
        setMigrateStatus({ ok: false, msg: `Migration failed: ${await res.text()}` })
      }
    } catch {
      setMigrateStatus({ ok: false, msg: 'Engine not reachable during migration.' })
    } finally {
      setMigrating(false)
    }
  }

  const handleScanDirectory = async () => {
    setScanning(true)
    setMigrateStatus(null)
    const src = clawPath.trim() || '~/.openclaw'
    const dst = openfangPath.trim() || '~/.openfang'
    try {
      const res = await fetch('/agentis/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src, target: dst }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json() as { agents?: number; channels?: number; memories?: number; files?: number }
        setMigrateStatus({
          ok: true,
          msg: `Migration complete — ${data.agents ?? 0} agents, ${data.channels ?? 0} channels, ${data.memories ?? 0} memory entries, ${data.files ?? 0} workspace files transferred to ${dst}.`,
        })
        setShowPathForm(false)
      } else {
        const text = await res.text()
        setMigrateStatus({ ok: false, msg: `Engine error: ${text || res.statusText}` })
      }
    } catch {
      // Engine not running — show what would happen
      setMigrateStatus({
        ok: false,
        msg: `Engine not reachable. When running, this will: scan ${src} for agent.yaml files, convert tools, merge channel configs, and copy workspace files to ${dst}.`,
      })
    } finally {
      setScanning(false)
    }
  }

  const handleExportAll = () => {
    const snapshot: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.startsWith('agentis_')) snapshot[k] = localStorage.getItem(k) ?? ''
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      version: '0.1',
      localStorage: snapshot,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentis-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'providers', label: 'Providers' },
    { id: 'models', label: 'Models' },
    { id: 'memory', label: 'Memory' },
    { id: 'database', label: 'Database' },
    { id: 'config', label: 'Config' },
    { id: 'security', label: 'Security' },
    { id: 'network', label: 'Network' },
    { id: 'budget', label: 'Budget' },
    { id: 'system', label: 'System' },
    { id: 'migration', label: 'Migration' },
  ]

  // Compute dynamic model status based on which providers have keys
  const MODELS: Model[] = ALL_MODELS.map(m => {
    const isLocal = m.provider === 'ollama' || m.provider === 'lmstudio'
    const hasProviderKey = configuredProviders.has(m.provider)
    const status: Model['status'] = isLocal || hasProviderKey ? 'AVAILABLE' : 'NEEDS KEY'
    return { ...m, status }
  })

  const filteredModels = MODELS.filter(m => {
    if (modelProvider !== 'all' && m.provider !== modelProvider) return false
    if (modelSearch && !m.name.toLowerCase().includes(modelSearch.toLowerCase())) return false
    return true
  })

  const uniqueProviders = Array.from(new Set(ALL_MODELS.map(m => m.provider)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Settings</span>
      </div>

      <div className="of-page-content">
        {/* Tab bar */}
        <div className="tab-bar" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Providers */}
        {tab === 'providers' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              {configuredProviders.size} of {PROVIDERS.length} providers configured.
              Keys are stored in your browser's localStorage and never sent to any third party.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {PROVIDERS.map(provider => {
                const isLocal = !!provider.endpoint
                const savedKey = inputs[provider.id] ?? ''
                const isConfigured = isLocal || !!savedKey
                const result = testResult[provider.id]

                return (
                  <div
                    key={provider.id}
                    className="card"
                    style={{
                      padding: '14px',
                      border: isConfigured ? '1px solid rgba(99,102,241,0.35)' : undefined,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isConfigured ? 'var(--accent)' : 'var(--fg)' }}>
                        {provider.name}
                      </span>
                      {isConfigured ? (
                        <span className="badge badge-green" style={{ fontSize: 9 }}>CONFIGURED</span>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>NOT SET</span>
                      )}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
                      {provider.description}
                    </div>

                    {/* Saved key preview */}
                    {savedKey && (
                      <div style={{
                        marginBottom: 8, padding: '4px 8px',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span>{maskedKey(savedKey)}</span>
                        <button
                          onClick={() => handleRemove(provider.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: 0 }}
                        >
                          remove
                        </button>
                      </div>
                    )}

                    {/* Input */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                      <input
                        type={isLocal ? 'text' : 'password'}
                        placeholder={provider.placeholder}
                        value={inputs[provider.id] ?? ''}
                        onChange={e => setInputs(s => ({ ...s, [provider.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && void handleSave(provider.id)}
                        style={{ flex: 1, fontSize: 11, padding: '5px 8px', fontFamily: 'var(--font-mono)' }}
                      />
                      <button
                        className="btn-primary"
                        onClick={() => void handleSave(provider.id)}
                        disabled={!inputs[provider.id]?.trim()}
                        style={{ fontSize: 10, padding: '5px 10px', whiteSpace: 'nowrap' }}
                      >
                        {saved[provider.id] ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    {/* Test + Docs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        className="btn-ghost"
                        onClick={() => void handleTest(provider.id)}
                        disabled={testing[provider.id] || !inputs[provider.id]?.trim()}
                        style={{ fontSize: 10, padding: '3px 8px' }}
                      >
                        {testing[provider.id] ? 'Testing...' : 'Test'}
                      </button>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        Get key →
                      </a>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>
                        {provider.models > 0 ? `${provider.models} models` : 'local'}
                      </span>
                    </div>

                    {/* Test result */}
                    {result?.msg && (
                      <div style={{
                        marginTop: 6, fontSize: 10, padding: '4px 8px', borderRadius: 4,
                        background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: result.ok ? '#10b981' : '#ef4444',
                      }}>
                        {result.msg}
                      </div>
                    )}

                    {/* Model recommendations */}
                    {PROVIDER_MODELS[provider.id as LLMProvider] && (
                      <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>
                          Models Agentis selects
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {(
                            [
                              { tier: 'simple',  label: 'Fast',    color: '#10b981' },
                              { tier: 'complex', label: 'Smart',   color: '#6366f1' },
                              { tier: 'expert',  label: 'Expert',  color: '#f97316' },
                            ] as const
                          ).map(({ tier, label, color }) => {
                            const m = PROVIDER_MODELS[provider.id as LLMProvider][tier]
                            return (
                              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 600, color, minWidth: 38,
                                  background: `${color}18`, borderRadius: 3, padding: '1px 5px',
                                }}>
                                  {label}
                                </span>
                                <span style={{ fontSize: 10, color: isConfigured ? 'var(--fg)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                                  {m.label}
                                </span>
                                {!isConfigured && (
                                  <span style={{ fontSize: 9, color: '#f97316', marginLeft: 'auto' }}>needs key</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Models */}
        {tab === 'models' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <input
                placeholder="Search models..."
                value={modelSearch}
                onChange={e => setModelSearch(e.target.value)}
                style={{ width: 240, fontSize: 12 }}
              />
              <select
                value={modelProvider}
                onChange={e => setModelProvider(e.target.value)}
                style={{ fontSize: 12, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', cursor: 'pointer' }}
              >
                <option value="all">All Providers</option>
                {uniqueProviders.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 80px 80px 90px 90px 90px',
                padding: '8px 14px',
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                gap: 8,
              }}>
                {['Model', 'Provider', 'Type', 'Context', 'Input/M', 'Output/M', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {filteredModels.map((m, i) => {
                const sc = STATUS_COLOR[m.status]
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 80px 80px 90px 90px 90px',
                      padding: '9px 14px',
                      gap: 8,
                      borderBottom: i < filteredModels.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.provider}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{m.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.context}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{m.inputCost}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{m.outputCost}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                      background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      display: 'inline-block',
                    }}>
                      {m.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Config */}
        {tab === 'config' && (
          <div>
            <div style={{ padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Runtime configuration is managed by the Agentis Engine. Changes take effect after engine restart.
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {CONFIG_SECTIONS.map((section, i) => (
                <div
                  key={section.key}
                  style={{
                    padding: '12px 14px',
                    borderBottom: i < CONFIG_SECTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{section.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{section.key}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{section.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security */}
        {tab === 'security' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Core Protections</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {SECURITY_CORE.map(item => (
                  <div key={item.name} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{item.name}</span>
                      <span className="badge badge-green" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>VERIFY ON</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Configurable Controls</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {SECURITY_CONTROLS.map(item => (
                  <div key={item.name} className="card" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{item.name}</span>
                      <span className="badge badge-orange" style={{ fontSize: 9 }}>CONFIGURABLE</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Network */}
        {tab === 'network' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Peer Networking (P2P)</div>
              <div className="card" style={{ padding: '16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>P2P Network</span>
                  <span className="badge badge-gray" style={{ fontSize: 9 }}>DISABLED</span>
                </div>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)' }}>0</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connected Peers</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)' }}>0</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Peers</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  No peers connected. Add peers via the engine config to enable distributed agent networking.
                </div>
              </div>
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>A2A External Agents</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  Connect to external Agent-to-Agent endpoints. Agentis can relay tasks to remote agents via the A2A protocol.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="https://agent.example.com/a2a"
                    style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  />
                  <button className="btn-primary" style={{ fontSize: 12, padding: '6px 16px', whiteSpace: 'nowrap' }}>
                    Discover
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget */}
        {tab === 'budget' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="of-section-label">Budget and Spending Limits</div>
              <button className="btn-secondary" style={{ fontSize: 12 }}>Edit Limits</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'HOURLY', value: '$0.0000' },
                { label: 'DAILY', value: '$0.0000' },
                { label: 'MONTHLY', value: '$0.0000' },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Zero (unset) limits impose no cap. Set a non-zero limit to automatically pause agents when spending exceeds the threshold.
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Top Spenders (Today)</div>
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No spending recorded today</div>
              </div>
            </div>
          </div>
        )}

        {/* System */}
        {tab === 'system' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'VERSION', value: '0.1.0' },
                { label: 'PLATFORM', value: 'macOS' },
                { label: 'UPTIME', value: '--' },
                { label: 'AGENTS', value: '0' },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Default Model</div>
              <div className="card" style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)' }}>
                anthropic : claude-sonnet-4-20250514
              </div>
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Runtime</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {[
                  ['Platform', 'macOS'],
                  ['Architecture', 'aarch64'],
                  ['API Listen', '127.0.0.1:4200'],
                  ['Log Level', 'info'],
                  ['Network', 'Disabled'],
                  ['API Key Status', apiKey.startsWith('sk-') ? 'Configured' : 'Not set'],
                ].map(([label, value], i, arr) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Database */}
        {tab === 'database' && (
          <div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              PocketBase replaces localStorage for memory, analytics, and sessions — giving you persistent storage that survives browser clears and works across devices and deployments.
            </div>

            {/* Connection */}
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>PocketBase Connection</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    value={pbUrl}
                    onChange={e => setPbUrlState(e.target.value)}
                    placeholder="https://your-pb.fly.dev  or  http://localhost:8090"
                    onKeyDown={e => e.key === 'Enter' && void handlePbSave()}
                    style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => void handlePbSave()}
                    disabled={!pbUrl.trim()}
                    style={{ fontSize: 12, padding: '6px 16px', whiteSpace: 'nowrap' }}
                  >
                    {pbStatus === 'checking' ? 'Checking...' : 'Save & Test'}
                  </button>
                  {getPbUrl() && (
                    <button
                      className="btn-ghost"
                      onClick={() => { setPbUrl(''); setPbUrlState(''); setPbStatus('idle'); setPbMsg('') }}
                      style={{ fontSize: 12, color: '#ef4444' }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {pbMsg && (
                  <div style={{
                    fontSize: 12, padding: '6px 10px', borderRadius: 6,
                    background: pbStatus === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${pbStatus === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: pbStatus === 'ok' ? '#10b981' : '#ef4444',
                  }}>
                    {pbMsg}
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                    background: pbStatus === 'ok' ? '#10b981' : pbStatus === 'checking' ? '#f59e0b' : 'var(--border)',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {pbStatus === 'ok' ? 'PocketBase connected — data is being synced' :
                     pbStatus === 'checking' ? 'Checking connection...' :
                     getPbUrl() ? 'URL saved (not yet tested)' : 'Not configured — using localStorage only'}
                  </span>
                </div>
              </div>
            </div>

            {/* Collections schema */}
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Required Collections</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {[
                  { name: 'memories', fields: 'agent_id (text), key (text), value (text), source (text), ts (number)' },
                  { name: 'analytics', fields: 'model, persona, task (text), input_tokens, output_tokens, step_count (number), cost (number), ts (number)' },
                  { name: 'sessions', fields: 'persona, task, mode, status (text), ts (number)' },
                ].map((col, i, arr) => (
                  <div key={col.name} style={{
                    padding: '11px 14px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>
                      {col.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{col.fields}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                Create these in your PocketBase admin at <span style={{ fontFamily: 'var(--font-mono)' }}>your-url/_/</span> — all collections should be set to <strong>public API rules</strong> (no auth required) for now.
              </div>
            </div>

            {/* Sync existing data */}
            {getPbUrl() && (
              <div style={{ marginBottom: 20 }}>
                <div className="of-section-label" style={{ marginBottom: 12 }}>One-Time Data Migration</div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                    Upload your existing localStorage data (memories, analytics, sessions) to PocketBase. Run this once after connecting.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn-primary"
                      onClick={() => void handlePbSync()}
                      style={{ fontSize: 12 }}
                    >
                      Migrate localStorage → PocketBase
                    </button>
                    {syncStatus && (
                      <span style={{ fontSize: 12, color: syncStatus.startsWith('Synced') ? '#10b981' : 'var(--muted)' }}>
                        {syncStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Deployment guide */}
            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Deployment Guide</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    {
                      step: '1',
                      title: 'Deploy PocketBase to Fly.io (free)',
                      code: 'fly launch --name agentis-db --image ghcr.io/pocketbase/pocketbase\nfly volumes create pb_data --size 1\nfly deploy',
                    },
                    {
                      step: '2',
                      title: 'Create collections in admin UI',
                      code: 'https://agentis-db.fly.dev/_/\n# Create: memories, analytics, sessions\n# Set API rules to public (no auth)',
                    },
                    {
                      step: '3',
                      title: 'Deploy Agentis frontend to Vercel',
                      code: 'npm run build\nnpx vercel --prod\n# Or connect your GitHub repo in vercel.com',
                    },
                    {
                      step: '4',
                      title: 'Connect Agentis to PocketBase',
                      code: '# Paste your Fly.io URL above:\nhttps://agentis-db.fly.dev',
                    },
                  ].map(item => (
                    <div key={item.step}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{item.step}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{item.title}</span>
                      </div>
                      <div style={{
                        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--muted)', whiteSpace: 'pre', lineHeight: 1.7,
                      }}>
                        {item.code}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Memory */}
        {tab === 'memory' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="of-section-label">Agent Memory ({memories.length} entries)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Search memories..."
                  value={memorySearch}
                  onChange={e => setMemorySearch(e.target.value)}
                  style={{ fontSize: 12, padding: '4px 10px', width: 180 }}
                />
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    if (!confirm('Clear all agent memory? This cannot be undone.')) return
                    localStorage.removeItem('agentis_memory')
                    setMemories([])
                    window.dispatchEvent(new CustomEvent('agentis_memory_update'))
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
            {memories.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
                No memories stored yet. Memories are saved when agents complete tasks in the Agent Universe and you click "Save to Memory".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memories
                  .filter(m => !memorySearch || m.key.includes(memorySearch) || m.value.toLowerCase().includes(memorySearch.toLowerCase()) || m.agentId.includes(memorySearch))
                  .map(m => (
                    <div key={m.id} className="card" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {m.agentId}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{m.key}</span>
                        <span style={{
                          marginLeft: 'auto', fontSize: 9, padding: '1px 6px', borderRadius: 8,
                          background: m.source === 'manual' ? 'var(--accent)22' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${m.source === 'manual' ? 'var(--accent)44' : 'var(--border)'}`,
                          color: m.source === 'manual' ? 'var(--accent)' : 'var(--muted)', fontWeight: 600,
                        }}>
                          {m.source}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                          {new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Migration */}
        {tab === 'migration' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Migrate from OpenClaw</div>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                  Migrate from OpenClaw
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
                  Seamlessly transfer your agents, memory, workspace files, and channel configurations from OpenClaw to OpenFang.
                </div>
                <div style={{ marginBottom: 16 }}>
                  {[
                    'Converts agent.yaml to agent.toml with proper capabilities',
                    'Maps tools (read_file → file_read, execute_command → shell_exec, etc.)',
                    'Merges channel configs into config.toml',
                    'Copies workspace files and memory data',
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 0', paddingLeft: 16, position: 'relative', lineHeight: 1.6 }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>→</span>
                      {item}
                    </div>
                  ))}
                </div>
                {!showPathForm ? (
                  <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: detected ? 14 : 0 }}>
                      <button className="btn-primary" style={{ fontSize: 13 }} disabled={detecting} onClick={() => void handleAutoDetect()}>
                        {detecting ? 'Scanning disk...' : 'Auto-Detect OpenClaw'}
                      </button>
                      <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => { setShowPathForm(true); setMigrateStatus(null); setDetected(null) }}>
                        Enter Path Manually
                      </button>
                    </div>

                    {/* Detection result */}
                    {detected && (
                      <div style={{
                        marginTop: 12, border: '1px solid rgba(99,102,241,0.4)',
                        borderRadius: 8, padding: '14px 16px', background: 'rgba(99,102,241,0.06)',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>
                          OpenClaw found at {detected.path}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                          {[
                            { label: 'Agents',   value: detected.agents },
                            { label: 'Channels', value: detected.channels },
                            { label: 'Memories', value: detected.memories },
                            { label: 'Files',    value: detected.files },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'center', padding: '8px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>{value}</div>
                              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn-primary" style={{ fontSize: 13 }} disabled={migrating} onClick={() => void handleMigrateDetected()}>
                            {migrating ? 'Migrating...' : 'Migrate Now'}
                          </button>
                          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setDetected(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    border: '1px solid var(--accent)', borderRadius: 10,
                    padding: '20px', background: 'var(--surface)',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 18 }}>
                      Specify OpenClaw Path
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                        OpenClaw Home Directory
                      </div>
                      <input
                        value={clawPath}
                        onChange={e => setClawPath(e.target.value)}
                        placeholder="~/.openclaw"
                        style={{ width: '100%', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '10px 12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                        OpenFang Target Directory
                      </div>
                      <input
                        value={openfangPath}
                        onChange={e => setOpenfangPath(e.target.value)}
                        placeholder="~/.openfang (default)"
                        style={{ width: '100%', fontSize: 13, fontFamily: 'var(--font-mono)', padding: '10px 12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 13 }}
                        disabled={scanning}
                        onClick={() => void handleScanDirectory()}
                      >
                        {scanning ? 'Scanning...' : 'Scan Directory'}
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 13 }}
                        onClick={() => { setShowPathForm(false); setMigrateStatus(null) }}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {migrateStatus && (
                  <div style={{
                    marginTop: 10, fontSize: 11, padding: '6px 10px', borderRadius: 6,
                    background: migrateStatus.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${migrateStatus.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: migrateStatus.ok ? '#10b981' : '#ef4444',
                    lineHeight: 1.5,
                  }}>
                    {migrateStatus.msg}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Data Export</div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  Export all your Agentis data — provider keys, memories, analytics, sessions, and settings — as a portable JSON backup you can re-import later.
                </div>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={handleExportAll}>
                  Export All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
