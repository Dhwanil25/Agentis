import { useState } from 'react'

type SettingsTab = 'providers' | 'models' | 'config' | 'security' | 'network' | 'budget' | 'system' | 'migration'

interface Props {
  apiKey: string
  onApiKeyChange: (key: string) => void
}

interface Provider {
  id: string
  name: string
  models: number
  placeholder: string
  available: boolean
  endpoint?: string
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

const PROVIDERS: Provider[] = [
  { id: 'anthropic', name: 'Anthropic', models: 4, placeholder: 'sk-ant-...', available: true },
  { id: 'openai', name: 'OpenAI', models: 6, placeholder: 'sk-...', available: false },
  { id: 'google', name: 'Google', models: 3, placeholder: 'AIza...', available: false },
  { id: 'groq', name: 'Groq', models: 4, placeholder: 'gsk_...', available: false },
  { id: 'cohere', name: 'Cohere', models: 2, placeholder: '...', available: false },
  { id: 'mistral', name: 'Mistral AI', models: 3, placeholder: '...', available: false },
  { id: 'deepseek', name: 'DeepSeek', models: 3, placeholder: '...', available: false },
  { id: 'openrouter', name: 'OpenRouter', models: 100, placeholder: 'sk-or-...', available: false },
  { id: 'ollama', name: 'Ollama (Local)', models: 5, placeholder: 'http://localhost:11434', available: false, endpoint: 'http://localhost:11434' },
  { id: 'lmstudio', name: 'LM Studio', models: 0, placeholder: 'http://localhost:1234', available: false, endpoint: 'http://localhost:1234' },
  { id: 'awsbedrock', name: 'AWS Bedrock', models: 8, placeholder: 'access key...', available: false },
  { id: 'azure', name: 'Azure OpenAI', models: 4, placeholder: 'key...', available: false },
]

const MODELS: Model[] = [
  { id: 'claude-opus-4', name: 'Claude Opus 4.6', provider: 'anthropic', type: 'FRONTIER', context: '200K', inputCost: '$15.00', outputCost: '$75.00', status: 'AVAILABLE' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4.6', provider: 'anthropic', type: 'SMART', context: '200K', inputCost: '$3.00', outputCost: '$15.00', status: 'AVAILABLE' },
  { id: 'claude-haiku-4', name: 'Claude Haiku 4.5', provider: 'anthropic', type: 'FAST', context: '200K', inputCost: '$0.80', outputCost: '$4.00', status: 'AVAILABLE' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', type: 'FRONTIER', context: '128K', inputCost: '$10.00', outputCost: '$30.00', status: 'NEEDS KEY' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', type: 'SMART', context: '128K', inputCost: '$0.40', outputCost: '$1.60', status: 'NEEDS KEY' },
  { id: 'o4-mini', name: 'o4-mini', provider: 'openai', type: 'REASONING', context: '128K', inputCost: '$1.10', outputCost: '$4.40', status: 'NEEDS KEY' },
  { id: 'gemini-2-pro', name: 'Gemini 2.5 Pro', provider: 'google', type: 'FRONTIER', context: '1M', inputCost: '$7.00', outputCost: '$21.00', status: 'NEEDS KEY' },
  { id: 'gemini-2-flash', name: 'Gemini 2.5 Flash', provider: 'google', type: 'FAST', context: '1M', inputCost: '$0.30', outputCost: '$2.50', status: 'NEEDS KEY' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'deepseek', type: 'SMART', context: '128K', inputCost: '$0.14', outputCost: '$0.28', status: 'NEEDS KEY' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'deepseek', type: 'REASONING', context: '128K', inputCost: '$0.55', outputCost: '$2.19', status: 'NEEDS KEY' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'groq', type: 'OPEN', context: '128K', inputCost: '$0.59', outputCost: '$0.79', status: 'NEEDS KEY' },
  { id: 'mistral-large', name: 'Mistral Large 2', provider: 'mistral', type: 'SMART', context: '128K', inputCost: '$2.00', outputCost: '$6.00', status: 'NEEDS KEY' },
  { id: 'mistral-ollama', name: 'Mistral (Ollama)', provider: 'ollama', type: 'LOCAL', context: '32K', inputCost: '$0.00', outputCost: '$0.00', status: 'AVAILABLE' },
  { id: 'deepseek-ollama', name: 'DeepSeek (Ollama)', provider: 'ollama', type: 'LOCAL', context: '32K', inputCost: '$0.00', outputCost: '$0.00', status: 'AVAILABLE' },
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
  const [inputs, setInputs] = useState<Record<string, string>>({ anthropic: '' })
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [configMsg, setConfigMsg] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const [modelProvider, setModelProvider] = useState('all')

  const handleSave = async (providerId: string) => {
    if (providerId !== 'anthropic') return
    const key = inputs[providerId] ?? ''
    if (!key.startsWith('sk-')) return
    onApiKeyChange(key)
    try {
      await fetch('/agentis/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      })
      setSaved(s => ({ ...s, [providerId]: true }))
      setConfigMsg('API key saved. Engine will restart.')
      setTimeout(() => { setSaved(s => ({ ...s, [providerId]: false })); setConfigMsg(null) }, 3000)
    } catch {
      setConfigMsg('Failed to save. Check that the engine is running.')
    }
  }

  const hasKey = apiKey.startsWith('sk-')
  const maskedKey = hasKey ? apiKey.slice(0, 12) + '...' + apiKey.slice(-4) : ''

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'providers', label: 'Providers' },
    { id: 'models', label: 'Models' },
    { id: 'config', label: 'Config' },
    { id: 'security', label: 'Security' },
    { id: 'network', label: 'Network' },
    { id: 'budget', label: 'Budget' },
    { id: 'system', label: 'System' },
    { id: 'migration', label: 'Migration' },
  ]

  const filteredModels = MODELS.filter(m => {
    if (modelProvider !== 'all' && m.provider !== modelProvider) return false
    if (modelSearch && !m.name.toLowerCase().includes(modelSearch.toLowerCase())) return false
    return true
  })

  const uniqueProviders = Array.from(new Set(MODELS.map(m => m.provider)))

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {PROVIDERS.map(provider => {
                const isAnthropic = provider.id === 'anthropic'
                const isAvailable = isAnthropic && hasKey
                return (
                  <div key={provider.id} className={isAvailable ? 'card-orange' : 'card'} style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isAvailable ? 'var(--orange)' : 'var(--fg)' }}>
                        {provider.name}
                      </span>
                      {isAvailable ? (
                        <span className="badge badge-green" style={{ fontSize: 9 }}>CONFIGURED</span>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>NOT CONFIGURED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                      {provider.endpoint
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{provider.endpoint}</span>
                        : `${provider.models} model${provider.models !== 1 ? 's' : ''} available`}
                    </div>
                    {isAnthropic && hasKey && (
                      <div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                        {maskedKey}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="password"
                        placeholder={isAnthropic ? provider.placeholder : 'Coming soon'}
                        value={inputs[provider.id] ?? ''}
                        onChange={e => setInputs(s => ({ ...s, [provider.id]: e.target.value }))}
                        disabled={!isAnthropic}
                        style={{ flex: 1, fontSize: 12, padding: '6px 10px', fontFamily: 'var(--font-mono)', opacity: isAnthropic ? 1 : 0.5 }}
                      />
                      <button
                        className="btn-primary"
                        onClick={() => void handleSave(provider.id)}
                        disabled={!isAnthropic || !((inputs[provider.id] ?? '').startsWith('sk-'))}
                        style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        {saved[provider.id] ? 'Saved' : 'Configure'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {configMsg && (
              <div style={{ padding: '8px 12px', background: 'var(--orange-bg)', border: '1px solid var(--orange-border)', borderRadius: 6, fontSize: 12, color: 'var(--orange)' }}>
                {configMsg}
              </div>
            )}
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
            <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.06)', border: '1px solid var(--orange-border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
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

        {/* Migration */}
        {tab === 'migration' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Migrate from OpenChar</div>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 12 }}>
                  Auto-detect and migrate your existing OpenChar configuration
                </div>
                <div style={{ marginBottom: 16 }}>
                  {[
                    'Detects your profile from memory, workspace files, and channel configurations',
                    'Maps tools and capabilities to Agentis equivalents',
                    'Migrates channel configs into settings files',
                    'Preserves conversation history and agent memory',
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '4px 0', paddingLeft: 16, position: 'relative', lineHeight: 1.6 }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--muted)' }}>-</span>
                      {item}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-primary" style={{ fontSize: 13 }}>Auto-Detect OpenChar</button>
                  <button className="btn-secondary" style={{ fontSize: 13 }}>Enter Path Manually</button>
                </div>
              </div>
            </div>

            <div>
              <div className="of-section-label" style={{ marginBottom: 12 }}>Data Export</div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                  Export all your Agentis data — sessions, history, skills, and settings — as a portable JSON archive.
                </div>
                <button className="btn-secondary" style={{ fontSize: 12 }}>Export All Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
