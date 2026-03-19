import { useState, useEffect } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'

interface Agent {
  id: string
  name: string
  state: string
}

interface Props {
  apiKey: string
  engineRunning: boolean
  navigate: (page: string) => void
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function OverviewPage({ apiKey, engineRunning, navigate }: Props) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [engineStart] = useState<number>(Date.now())
  const [uptime, setUptime] = useState('0s')

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    if (!engineRunning) { setAgents([]); return }
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis-proxy/api/agents', { signal: AbortSignal.timeout(3000) })
        if (res.ok && active) setAgents(await res.json() as Agent[])
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { active = false; clearInterval(id) }
  }, [engineRunning])

  useEffect(() => {
    if (!engineRunning) return
    const tick = () => {
      const secs = Math.floor((Date.now() - engineStart) / 1000)
      if (secs < 60) setUptime(`${secs}s`)
      else if (secs < 3600) setUptime(`${Math.floor(secs / 60)}m`)
      else setUptime(`${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [engineRunning, engineStart])

  const runningAgents = agents.filter(a => a.state === 'Running').length
  const hasApiKey = apiKey.startsWith('sk-')
  const tasksRun = history.length
  const checkedItems = [
    hasApiKey,
    engineRunning,
    tasksRun > 0,
    false, // browse templates - always pending
  ]
  const checkCount = checkedItems.filter(Boolean).length
  const progressPct = Math.round((checkCount / checkedItems.length) * 100)

  const providers = [
    { name: 'ANTHROPIC', active: hasApiKey },
    { name: 'OPENAI', active: false },
    { name: 'GOOGLE', active: false },
    { name: 'COHERE', active: false },
    { name: 'MISTRAL', active: false },
    { name: 'GROQ', active: false },
  ]

  const recentHistory = [...history].reverse().slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="of-page-title">Overview</span>
          {engineRunning && <span className="badge badge-green">Healthy</span>}
        </div>
      </div>

      <div className="of-page-content">

        {/* Getting started card */}
        <div className="card-orange" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>Getting Started</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{checkCount} of {checkedItems.length} steps complete</div>
            </div>
            <button className="btn-primary" onClick={() => navigate('settings')} style={{ fontSize: 12 }}>
              Setup Wizard
            </button>
          </div>
          <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--orange)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Configure an LLM provider', done: hasApiKey },
              { label: 'Start the Agentis Engine', done: engineRunning },
              { label: 'Run your first task', done: tasksRun > 0 },
              { label: 'Browse workflow templates', done: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: `1.5px solid ${item.done ? 'var(--orange)' : 'var(--border)'}`,
                  background: item.done ? 'var(--orange)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 9,
                  color: '#fff',
                }}>
                  {item.done ? 'OK' : ''}
                </div>
                <span style={{ fontSize: 13, color: item.done ? 'var(--fg)' : 'var(--muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Agents Running', value: runningAgents.toString() },
            { label: 'Tokens Used', value: '0' },
            { label: 'Total Cost', value: '$0.00' },
            { label: 'Uptime', value: engineRunning ? uptime : '--' },
          ].map(stat => (
            <div key={stat.label} className="of-stat-card">
              <div className="of-stat-value">{stat.value}</div>
              <div className="of-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Tasks Run', value: tasksRun.toString() },
            { label: 'Templates', value: '6' },
            { label: 'Skills', value: '9' },
            { label: 'Tool Calls', value: '0' },
            { label: 'Providers', value: '1' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* LLM Providers */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              LLM Providers
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {providers.map(p => (
                <span
                  key={p.name}
                  className={p.active ? 'badge badge-orange' : 'badge badge-gray'}
                  style={{ fontSize: 10 }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              System Health
            </div>
            {[
              ['Status', engineRunning ? 'OK' : 'Offline', engineRunning ? 'var(--green)' : 'var(--muted)'],
              ['Version', 'v0.1.0', 'var(--fg)'],
              ['Provider', 'Anthropic', 'var(--fg)'],
              ['Model', 'claude-sonnet-4', 'var(--fg)'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 12, color: color as string, fontFamily: label === 'Model' ? 'var(--font-mono)' : undefined }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn-secondary" onClick={() => navigate('chat')} style={{ fontSize: 12 }}>New Chat</button>
          <button className="btn-secondary" onClick={() => navigate('workflows')} style={{ fontSize: 12 }}>Browse Templates</button>
          <button className="btn-secondary" onClick={() => navigate('settings')} style={{ fontSize: 12 }}>Configure Engine</button>
        </div>

        {/* Recent Activity */}
        {recentHistory.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Activity</span>
            </div>
            {recentHistory.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '10px 14px',
                borderBottom: i < recentHistory.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span className={entry.status === 'completed' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9 }}>
                  {entry.status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg)', flex: 1 }}>
                  {entry.task.length > 60 ? entry.task.slice(0, 60) + '...' : entry.task}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatDateTime(entry.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
