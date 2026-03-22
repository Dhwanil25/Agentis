import { useState, useEffect } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'
import { SetupWizard, PROVIDER_SECTIONS } from '@/components/SetupWizard'

interface Agent {
  id: string
  name: string
  state: string
}

interface Props {
  apiKey: string
  engineRunning: boolean
  navigate: (page: string) => void
  onSaveApiKey?: (key: string) => void
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function detectProvider(key: string): { name: string; id: string } | null {
  if (!key) return null
  if (key.startsWith('sk-ant'))  return { id: 'anthropic',  name: 'Anthropic'     }
  if (key.startsWith('sk-'))     return { id: 'openai',     name: 'OpenAI'        }
  if (key.startsWith('gsk_'))    return { id: 'groq',       name: 'Groq'          }
  if (key.startsWith('AIza'))    return { id: 'google',     name: 'Google Gemini' }
  if (key.startsWith('xai-'))    return { id: 'xai',        name: 'xAI'           }
  if (key.startsWith('r8_'))     return { id: 'replicate',  name: 'Replicate'     }
  if (key.startsWith('hf_'))     return { id: 'huggingface',name: 'Hugging Face'  }
  if (key.startsWith('xoxb-'))   return { id: 'slack',      name: 'Slack'         }
  return { id: 'custom', name: 'Custom Provider' }
}

export function OverviewPage({ apiKey, engineRunning, navigate, onSaveApiKey }: Props) {
  const [agents, setAgents]   = useState<Agent[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [engineStart]         = useState<number>(Date.now())
  const [uptime, setUptime]   = useState('0s')
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => { setHistory(loadHistory()) }, [])

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
      else if (secs < 3600) setUptime(`${Math.floor(secs / 60)}m ${secs % 60}s`)
      else setUptime(`${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [engineRunning, engineStart])

  const runningAgents    = agents.filter(a => a.state === 'Running').length
  const hasApiKey        = !!apiKey
  const activeProvider   = detectProvider(apiKey)
  const tasksRun         = history.length
  const recentHistory    = [...history].reverse().slice(0, 5)

  // Total providers across all sections
  const totalProviders   = PROVIDER_SECTIONS.reduce((s: number, sec) => s + sec.providers.length, 0)

  // Getting started checklist
  const setupSteps = [
    { label: 'Configure an LLM provider',  done: hasApiKey,     action: () => setShowWizard(true) },
    { label: 'Start the Agentis Engine',   done: engineRunning, action: () => navigate('settings') },
    { label: 'Run your first task',        done: tasksRun > 0,  action: () => navigate('chat')     },
    { label: 'Browse workflow templates',  done: false,         action: () => navigate('workflows') },
  ]
  const checkCount  = setupSteps.filter(s => s.done).length
  const progressPct = Math.round((checkCount / setupSteps.length) * 100)

  // Popular providers for the badge strip — pick top 10 from Popular section
  const popularProviders = PROVIDER_SECTIONS[0]?.providers.slice(0, 10) ?? []

  if (showWizard) {
    return (
      <SetupWizard
        apiKey={apiKey}
        onClose={() => setShowWizard(false)}
        onSaveApiKey={(key) => { onSaveApiKey?.(key) }}
        navigate={(page) => { setShowWizard(false); navigate(page) }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="of-page-title">Overview</span>
          {engineRunning
            ? <span className="badge badge-green">Healthy</span>
            : <span className="badge badge-gray">Offline</span>
          }
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate('chat')} style={{ fontSize: 12 }}>New Chat</button>
          <button className="btn-secondary" onClick={() => navigate('workflows')} style={{ fontSize: 12 }}>Templates</button>
        </div>
      </div>

      <div className="of-page-content">

        {/* Getting Started */}
        <div className="card-accent" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>Getting Started</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{checkCount} of {setupSteps.length} steps complete</div>
            </div>
            <button className="btn-primary" onClick={() => setShowWizard(true)} style={{ fontSize: 12 }}>
              Setup Wizard
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {setupSteps.map((step, i) => (
              <button
                key={i}
                onClick={step.done ? undefined : step.action}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: step.done ? 'default' : 'pointer', textAlign: 'left', padding: '4px 0', fontFamily: 'var(--font-sans)' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${step.done ? 'var(--accent)' : 'var(--border)'}`, background: step.done ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {step.done && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 12, color: step.done ? 'var(--fg)' : 'var(--muted)', textDecoration: !step.done ? 'underline' : 'none', textDecorationColor: 'transparent' }}
                  onMouseEnter={e => { if (!step.done) (e.target as HTMLElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => { if (!step.done) (e.target as HTMLElement).style.color = 'var(--muted)' }}
                >
                  {step.label}
                </span>
                {step.done && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--accent)', fontWeight: 600 }}>DONE</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Main stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
          {[
            { label: 'Agents Running', value: runningAgents.toString(),         accent: runningAgents > 0 },
            { label: 'Tasks Run',      value: tasksRun.toString(),              accent: false },
            { label: 'Tokens Used',    value: '0',                              accent: false },
            { label: 'Uptime',         value: engineRunning ? uptime : '--',    accent: engineRunning },
          ].map(stat => (
            <div key={stat.label} className="of-stat-card">
              <div className="of-stat-value" style={{ color: stat.accent ? 'var(--accent)' : undefined }}>{stat.value}</div>
              <div className="of-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Providers Available', value: totalProviders.toString() },
            { label: 'Provider Active',     value: activeProvider ? '1' : '0' },
            { label: 'Templates',           value: '6'  },
            { label: 'Skills',              value: '9'  },
            { label: 'Tool Calls',          value: '0'  },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Two column: providers + system health */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* LLM Providers */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>LLM Providers</span>
              <button onClick={() => setShowWizard(true)} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 }}>
                + Add provider
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {popularProviders.map(p => {
                const isActive = p.id === activeProvider?.id
                return (
                  <span
                    key={p.id}
                    className={isActive ? 'badge badge-accent' : 'badge badge-gray'}
                    style={{ fontSize: 10, cursor: 'pointer' }}
                    onClick={() => setShowWizard(true)}
                  >
                    {p.name}
                    {isActive && ' ✓'}
                  </span>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {totalProviders} providers available &middot; {activeProvider ? `${activeProvider.name} active` : 'none configured'}
            </div>
          </div>

          {/* System Health */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              System Health
            </div>
            {[
              { label: 'Status',    value: engineRunning ? 'Running' : 'Offline', color: engineRunning ? 'var(--green)' : 'var(--muted)' },
              { label: 'Version',   value: 'v0.1.0',                              color: 'var(--fg)' },
              { label: 'Provider',  value: activeProvider?.name ?? 'Not set',     color: activeProvider ? 'var(--fg)' : 'var(--muted)' },
              { label: 'Model',     value: activeProvider?.id === 'anthropic' ? 'claude-sonnet-4-6' : activeProvider ? 'default' : '--', color: 'var(--fg)', mono: true },
              { label: 'Agents',    value: `${agents.length} total`,              color: 'var(--fg)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.label}</span>
                <span style={{ fontSize: 12, color: row.color, fontFamily: row.mono ? 'var(--font-mono)' : undefined }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('chat')} style={{ fontSize: 12 }}>New Chat</button>
          <button className="btn-secondary" onClick={() => navigate('workflows')} style={{ fontSize: 12 }}>Browse Templates</button>
          <button className="btn-secondary" onClick={() => navigate('settings')} style={{ fontSize: 12 }}>Configure Engine</button>
          <button className="btn-secondary" onClick={() => navigate('logs')} style={{ fontSize: 12 }}>View Logs</button>
          <button className="btn-secondary" onClick={() => navigate('channels')} style={{ fontSize: 12 }}>Add Channel</button>
        </div>

        {/* Recent Activity */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Activity</span>
            {recentHistory.length > 0 && (
              <button onClick={() => navigate('logs')} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 }}>
                View all
              </button>
            )}
          </div>
          {recentHistory.length === 0 ? (
            <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
              No activity yet.{' '}
              <button onClick={() => navigate('chat')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', padding: 0, textDecoration: 'underline' }}>
                Start a conversation
              </button>
            </div>
          ) : (
            recentHistory.map((entry, i) => (
              <div
                key={entry.id}
                style={{ padding: '10px 14px', borderBottom: i < recentHistory.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span className={entry.status === 'completed' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9 }}>
                  {entry.status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.task}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{formatDateTime(entry.ts)}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
