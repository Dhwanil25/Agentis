import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type EngineState =
  | 'idle' | 'downloading' | 'building' | 'starting' | 'running'
  | 'restarting' | 'error' | 'stopped' | 'not_installed' | 'needs_api_key' | 'unknown'

interface EngineStatus {
  state: EngineState
  message: string
  port: number
  binPath?: string
}

interface Agent {
  id: string
  name: string
  state: string
  ready: boolean
}

interface LogEntry {
  line: string
  ts: number
}

export interface HistoryEntry {
  id: string
  ts: number
  persona: string
  task: string
  mode: string
  status: 'completed' | 'error'
}

type Tab = 'overview' | 'agents' | 'activity' | 'history' | 'configure'

interface Props {
  apiKey: string
  onNewTask: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<EngineState, string> = {
  running:       'Running',
  starting:      'Starting',
  restarting:    'Restarting',
  downloading:   'Downloading',
  building:      'Building',
  needs_api_key: 'Needs API key',
  error:         'Error',
  stopped:       'Stopped',
  not_installed: 'Not installed',
  idle:          'Idle',
  unknown:       'Connecting',
}

const STATE_COLOR: Record<EngineState, string> = {
  running:       '#1D9E75',
  starting:      '#3B82F6',
  restarting:    '#F59E0B',
  downloading:   '#3B82F6',
  building:      '#3B82F6',
  needs_api_key: '#F59E0B',
  error:         '#E24B4A',
  stopped:       '#6B7280',
  not_installed: '#CA8A04',
  idle:          '#6B7280',
  unknown:       '#6B7280',
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const HISTORY_KEY = 'agentis_history'

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch { return [] }
}

export function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-100)))
  } catch { /* ignore */ }
}

export function addHistoryEntry(entry: HistoryEntry) {
  const existing = loadHistory()
  saveHistory([...existing, entry])
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardScreen({ apiKey, onNewTask }: Props) {
  const [tab, setTab]               = useState<Tab>('overview')
  const [status, setStatus]         = useState<EngineStatus>({ state: 'unknown', message: 'Connecting...', port: 4200 })
  const [agents, setAgents]         = useState<Agent[]>([])
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [keySent, setKeySent]       = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [restarting, setRestarting] = useState<string | null>(null)
  const [configMsg, setConfigMsg]   = useState<string | null>(null)
  const logsRef = useRef<HTMLDivElement>(null)

  // ── Poll engine status ────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis/status', { signal: AbortSignal.timeout(2000) })
        if (res.ok && active) setStatus(await res.json() as EngineStatus)
      } catch {
        if (active) setStatus(s => ({ ...s, state: 'error', message: 'Engine not reachable. Is Vite running?' }))
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => { active = false; clearInterval(id) }
  }, [])

  // ── Auto-send API key when daemon needs it ────────────────────────────────
  useEffect(() => {
    if (status.state !== 'needs_api_key') return
    if (!apiKey.startsWith('sk-') || keySent) return
    setKeySent(true)
    fetch('/agentis/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }).catch(() => setKeySent(false))
  }, [status.state, apiKey, keySent])

  // ── Poll agents when engine is running ────────────────────────────────────
  useEffect(() => {
    if (status.state !== 'running') { setAgents([]); return }
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis-proxy/api/agents', { signal: AbortSignal.timeout(3000) })
        if (res.ok && active) setAgents(await res.json() as Agent[])
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { active = false; clearInterval(id) }
  }, [status.state])

  // ── Subscribe to SSE log stream ───────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource('/agentis/logs')
    es.onmessage = e => {
      try {
        const entry = JSON.parse(e.data as string) as LogEntry
        setLogs(prev => [...prev.slice(-499), entry])
      } catch { /* malformed */ }
    }
    return () => es.close()
  }, [])

  // ── Auto-scroll activity log ──────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'activity' && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs, tab])

  // ── Load history from localStorage ───────────────────────────────────────
  useEffect(() => {
    setHistory(loadHistory())
    const onStorage = () => setHistory(loadHistory())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRestartAgent = async (agentId: string) => {
    setRestarting(agentId)
    try {
      await fetch(`/agentis-proxy/api/agents/${agentId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    } finally {
      setRestarting(null)
    }
  }

  const handleApplyKey = async () => {
    if (!apiKeyInput.startsWith('sk-')) return
    try {
      await fetch('/agentis/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      })
      setApiKeyInput('')
      setKeySent(false)
      setConfigMsg('API key applied. Engine restarting...')
      setTimeout(() => setConfigMsg(null), 4000)
    } catch {
      setConfigMsg('Failed to apply API key.')
    }
  }

  const clearHistory = () => {
    saveHistory([])
    setHistory([])
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const isRunning     = status.state === 'running'
  const stateColor    = STATE_COLOR[status.state] ?? '#6B7280'
  const stateLabel    = STATE_LABEL[status.state] ?? status.state
  const runningAgents = agents.filter(a => a.state === 'Running').length

  // ── Layout ────────────────────────────────────────────────────────────────

  const sidebarStyle: React.CSSProperties = {
    width: 200,
    flexShrink: 0,
    borderRight: '0.5px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
  }

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '9px 20px',
    textAlign: 'left',
    background: active ? 'rgba(255,255,255,0.05)' : 'none',
    border: 'none',
    borderLeft: `2px solid ${active ? 'var(--fg)' : 'transparent'}`,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? 'var(--fg)' : 'var(--muted)',
    transition: 'all 0.12s',
    letterSpacing: '-0.01em',
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: 16,
  }

  const card: React.CSSProperties = {
    border: '0.5px solid var(--border)',
    borderRadius: 10,
    background: 'var(--surface)',
    overflow: 'hidden',
  }

  const tableHeader: React.CSSProperties = {
    padding: '9px 16px',
    borderBottom: '0.5px solid var(--border)',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    gap: 0,
  }

  const thStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  }

  function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
    return (
      <span style={{
        display: 'inline-block',
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 560 }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div style={sidebarStyle}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 8, letterSpacing: '-0.01em' }}>
            Agentis Engine
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <StatusDot color={stateColor} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{stateLabel}</span>
          </div>
          {isRunning && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              port {status.port} · {runningAgents} agent{runningAgents !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div style={{ paddingTop: 8, flex: 1 }}>
          {(['overview', 'agents', 'activity', 'history', 'configure'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={navBtnStyle(tab === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid var(--border)' }}>
          <button
            onClick={onNewTask}
            style={{
              width: '100%', padding: '9px 0',
              borderRadius: 8,
              border: '0.5px solid var(--fg)',
              background: 'var(--fg)',
              color: 'var(--bg)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            New Task
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            <div style={sectionLabel}>Overview</div>

            {/* Status row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Status', value: stateLabel, extra: <StatusDot color={stateColor} /> },
                { label: 'Port', value: status.port.toString(), mono: true },
                { label: 'Agents', value: agents.length.toString() },
              ].map(({ label, value, extra, mono }) => (
                <div key={label} style={{ ...card, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {extra}
                    <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message */}
            <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Engine Message
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {status.message}
              </div>
            </div>

            {/* Not installed instructions */}
            {status.state === 'not_installed' && (
              <div style={{ border: '0.5px solid #CA8A04', borderRadius: 10, padding: '16px 18px', marginBottom: 16, background: 'rgba(202,138,4,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CA8A04', marginBottom: 10 }}>
                  Setup Required
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.6 }}>
                  Build the engine binary from source once — Agentis manages it automatically after that.
                </p>
                <pre style={{ margin: 0, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', lineHeight: 1.9, overflowX: 'auto' }}>
{`git clone https://github.com/RightNow-AI/openfang /tmp/openfang
cd /tmp/openfang && cargo build --release -p openfang-cli
cp target/release/openfang ${status.binPath ?? './bin/openfang'}`}
                </pre>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 0' }}>
                  After placing the binary, restart the dev server.
                </p>
              </div>
            )}

            {/* Recent log preview */}
            {logs.length > 0 && (
              <div style={card}>
                <div style={tableHeader}>
                  <span style={thStyle}>Recent Logs</span>
                  <button
                    onClick={() => setTab('activity')}
                    style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    View all
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6 }}>
                  {logs.slice(-12).map((entry, i) => (
                    <div key={i} style={{ padding: '3px 16px', borderBottom: i < 11 ? '0.5px solid var(--border)' : 'none', display: 'flex', gap: 14 }}>
                      <span style={{ color: 'var(--muted)', flexShrink: 0, userSelect: 'none' }}>{formatTime(entry.ts)}</span>
                      <span style={{ color: 'var(--fg)', wordBreak: 'break-all' }}>{entry.line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AGENTS ─────────────────────────────────────────────────────────── */}
        {tab === 'agents' && (
          <div>
            <div style={sectionLabel}>Agents</div>

            {!isRunning ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 8 }}>
                Engine is not running. Start the engine to manage agents.
              </div>
            ) : agents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 8 }}>
                No agents registered yet.
              </div>
            ) : (
              <div style={card}>
                <div style={{ ...tableHeader, display: 'grid', gridTemplateColumns: '1fr 110px 80px 110px' }}>
                  {['Name', 'State', 'Ready', 'Actions'].map(h => (
                    <span key={h} style={thStyle}>{h}</span>
                  ))}
                </div>
                {agents.map((agent, i) => {
                  const agentColor =
                    agent.state === 'Running'    ? '#1D9E75' :
                    agent.state === 'Terminated' ? '#E24B4A' : '#F59E0B'
                  return (
                    <div
                      key={agent.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px 80px 110px',
                        alignItems: 'center',
                        padding: '13px 16px',
                        borderBottom: i < agents.length - 1 ? '0.5px solid var(--border)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{agent.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {agent.id.slice(0, 14)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <StatusDot color={agentColor} />
                        <span style={{ fontSize: 12, color: 'var(--fg)' }}>{agent.state}</span>
                      </div>
                      <div style={{ fontSize: 12, color: agent.ready ? '#1D9E75' : '#E24B4A' }}>
                        {agent.ready ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <button
                          onClick={() => handleRestartAgent(agent.id)}
                          disabled={restarting === agent.id}
                          style={{
                            padding: '4px 12px', borderRadius: 6,
                            border: '0.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--fg)',
                            fontSize: 11, cursor: restarting === agent.id ? 'not-allowed' : 'pointer',
                            opacity: restarting === agent.id ? 0.5 : 1,
                          }}
                        >
                          {restarting === agent.id ? 'Restarting...' : 'Restart'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY ───────────────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>Live Activity</div>
            <div
              ref={logsRef}
              style={{
                flex: 1,
                minHeight: 400,
                ...card,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.7,
                overflowY: 'auto',
              }}
            >
              {logs.length === 0 ? (
                <div style={{ padding: '20px 16px', color: 'var(--muted)' }}>
                  No activity yet. Send a task to the engine to see live output here.
                </div>
              ) : (
                logs.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '2px 16px',
                      borderBottom: '0.5px solid var(--border)',
                      display: 'flex',
                      gap: 14,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', flexShrink: 0, userSelect: 'none' }}>
                      {formatTime(entry.ts)}
                    </span>
                    <span style={{ color: 'var(--fg)', wordBreak: 'break-all' }}>{entry.line}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY ────────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={sectionLabel}>Task History</div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16 }}
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', paddingTop: 8 }}>
                No tasks yet. Complete your first task to see it here.
              </div>
            ) : (
              <div style={card}>
                <div style={{ ...tableHeader, display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px' }}>
                  {['Task', 'Persona', 'Mode', 'Status'].map(h => (
                    <span key={h} style={thStyle}>{h}</span>
                  ))}
                </div>
                {[...history].reverse().map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 90px 90px 80px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < history.length - 1 ? '0.5px solid var(--border)' : 'none',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 3 }}>
                        {entry.task.length > 80 ? entry.task.slice(0, 80) + '...' : entry.task}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatDateTime(entry.ts)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{entry.persona}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{entry.mode}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot color={entry.status === 'completed' ? '#1D9E75' : '#E24B4A'} size={6} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIGURE ──────────────────────────────────────────────────────── */}
        {tab === 'configure' && (
          <div>
            <div style={sectionLabel}>Configure</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
              {/* API Key */}
              <div style={card}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
                    Anthropic API Key
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      placeholder="sk-ant-..."
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleApplyKey() }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8,
                        border: '0.5px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => void handleApplyKey()}
                      disabled={!apiKeyInput.startsWith('sk-')}
                      style={{
                        padding: '8px 16px', borderRadius: 8,
                        border: '0.5px solid var(--fg)',
                        background: 'var(--fg)', color: 'var(--bg)',
                        fontSize: 12, fontWeight: 500,
                        cursor: !apiKeyInput.startsWith('sk-') ? 'not-allowed' : 'pointer',
                        opacity: !apiKeyInput.startsWith('sk-') ? 0.4 : 1,
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {configMsg && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{configMsg}</div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.6 }}>
                    Applying a new key restarts the engine and clears existing sessions.
                  </p>
                </div>
              </div>

              {/* Engine Info */}
              <div style={card}>
                <div style={tableHeader}>
                  <span style={thStyle}>Engine Info</span>
                </div>
                {[
                  ['State',   stateLabel],
                  ['Port',    status.port.toString()],
                  ['Model',   'claude-sonnet-4-20250514'],
                  ['Binary',  status.binPath ?? './bin/openfang'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      padding: '10px 16px', borderBottom: '0.5px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)', maxWidth: 260, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
