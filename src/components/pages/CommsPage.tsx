import { useState, useEffect } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'

interface Agent {
  id: string
  name: string
  state: string
  ready: boolean
}

interface Props {
  engineRunning: boolean
}

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export function CommsPage({ engineRunning }: Props) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [events, setEvents] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setEvents(loadHistory().reverse().slice(0, 20))
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

  const agentStateColor = (state: string) => {
    if (state === 'Running') return 'var(--green)'
    if (state === 'Terminated') return 'var(--red)'
    return 'var(--accent)'
  }

  const eventStatusBadge = (entry: HistoryEntry) => {
    if (entry.status === 'error') return { label: 'ERROR', cls: 'badge-red' }
    if (entry.status === 'completed') return { label: 'DONE', cls: 'badge-green' }
    return { label: 'RUNNING', cls: 'badge-orange' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Comms</span>
      </div>

      <div className="of-page-content">
        {/* Agent Topology */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Agent Topology</span>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {agents.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {engineRunning ? 'No agents running. Start a task to spawn agents.' : 'Engine not running. Start the engine to see agents.'}
              </div>
            ) : (
              agents.map((agent, i) => (
                <div
                  key={agent.id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span
                    className="dot"
                    style={{ background: agentStateColor(agent.state), width: 8, height: 8 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{agent.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {agent.id.slice(0, 18)}...
                    </div>
                  </div>
                  <span className={agent.state === 'Running' ? 'badge badge-green' : agent.state === 'Terminated' ? 'badge badge-red' : 'badge badge-orange'} style={{ fontSize: 9 }}>
                    {agent.state.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: agent.ready ? 'var(--green)' : 'var(--muted)' }}>
                    {agent.ready ? 'Ready' : 'Not ready'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Event Feed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Live Event Feed</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="dot" style={{ background: 'var(--green)', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', letterSpacing: '0.04em' }}>LIVE</span>
            </div>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>{events.length} events</span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {events.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No events yet. Run tasks to see live agent events here.
              </div>
            ) : (
              events.map((entry, i) => {
                const badge = eventStatusBadge(entry)
                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                      {timeAgo(entry.ts)}
                    </span>
                    <span className={`badge ${badge.cls}`} style={{ fontSize: 9, flexShrink: 0 }}>{badge.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.persona} — {entry.task.length > 50 ? entry.task.slice(0, 50) + '...' : entry.task}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
