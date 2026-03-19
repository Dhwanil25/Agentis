import { useState, useEffect } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'

interface Agent {
  id: string
  name: string
  state: string
}

interface Props {
  engineRunning: boolean
  navigate: (page: string) => void
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function SessionsPage({ engineRunning, navigate }: Props) {
  const [tab, setTab] = useState<'sessions' | 'memory'>('sessions')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  useEffect(() => {
    if (!engineRunning) { setAgents([]); return }
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis-proxy/api/agents', { signal: AbortSignal.timeout(3000) })
        if (res.ok && active) {
          const data = await res.json() as Agent[]
          setAgents(data)
          if (data.length > 0 && !selectedAgent) setSelectedAgent(data[0].id)
        }
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { active = false; clearInterval(id) }
  }, [engineRunning, selectedAgent])

  const sessions = [...history].reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Sessions</span>
      </div>

      <div className="of-page-content">
        <div className="tab-bar">
          <button className={`tab-btn${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>Sessions</button>
          <button className={`tab-btn${tab === 'memory' ? ' active' : ''}`} onClick={() => setTab('memory')}>Memory</button>
        </div>

        {tab === 'sessions' && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Conversation Sessions are stored locally and represent each task you have run with an Agentis persona.
            </div>

            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
                  No sessions yet. Start a conversation to see it here.
                </div>
                <button className="btn-primary" onClick={() => navigate('chat')}>
                  Start Chatting
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {sessions.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '12px 14px',
                      borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.task.length > 80 ? entry.task.slice(0, 80) + '...' : entry.task}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {entry.persona} · {entry.mode} · {formatDateTime(entry.ts)}
                      </div>
                    </div>
                    <span className={entry.status === 'completed' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9, flexShrink: 0 }}>
                      {entry.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'memory' && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Agent Memory stores context between sessions, allowing agents to retain information across conversations. Memory is currently in-memory only.
            </div>

            {agents.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Select Agent</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  style={{ width: '100%', maxWidth: 280 }}
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {!engineRunning
                  ? 'Engine is not running. Start the engine to view agent memory.'
                  : agents.length === 0
                  ? 'No agents running. Run a task to create an agent with memory.'
                  : 'No memory entries for this agent yet.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
