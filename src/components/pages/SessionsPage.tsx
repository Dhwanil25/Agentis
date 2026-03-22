import { useState, useEffect } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'
import { loadMemories, addMemory, deleteMemory, clearAgentMemories } from '@/lib/memory'
import type { MemoryEntry } from '@/lib/memory'

interface Props {
  engineRunning: boolean
  navigate: (page: string) => void
}

const PERSONA_IDS = ['dev', 'writer', 'analyst', 'researcher', 'browser']

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function SessionsPage({ engineRunning, navigate }: Props) {
  const [tab,           setTab]           = useState<'sessions' | 'memory'>('sessions')
  const [history,       setHistory]       = useState<HistoryEntry[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('dev')
  const [memories,      setMemories]      = useState<MemoryEntry[]>([])
  const [newKey,        setNewKey]        = useState('')
  const [newValue,      setNewValue]      = useState('')
  const [addingNew,     setAddingNew]     = useState(false)

  useEffect(() => { setHistory(loadHistory()) }, [])

  useEffect(() => {
    // Keep engineRunning in scope for potential future use
    void engineRunning
  }, [engineRunning])

  const refreshMemories = () => setMemories(loadMemories())

  useEffect(() => {
    refreshMemories()
    const handler = () => refreshMemories()
    window.addEventListener('agentis_memory_update', handler)
    return () => window.removeEventListener('agentis_memory_update', handler)
  }, [])

  const agentMemories = memories.filter(m => m.agentId === selectedAgent)

  const handleAddMemory = () => {
    if (!newKey.trim() || !newValue.trim()) return
    addMemory({ agentId: selectedAgent, key: newKey.trim(), value: newValue.trim(), ts: Date.now(), source: 'manual' })
    setNewKey('')
    setNewValue('')
    setAddingNew(false)
  }

  const sessions = [...history].reverse()

  // All personas that have memory
  const agentsWithMemory = PERSONA_IDS.filter(id => memories.some(m => m.agentId === id))
  const allAgentIds = [...new Set([...agentsWithMemory, ...PERSONA_IDS])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Sessions</span>
      </div>

      <div className="of-page-content">
        <div className="tab-bar">
          <button className={`tab-btn${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>
            Sessions ({history.length})
          </button>
          <button className={`tab-btn${tab === 'memory' ? ' active' : ''}`} onClick={() => setTab('memory')}>
            Memory ({memories.length})
          </button>
        </div>

        {/* ── Sessions tab ── */}
        {tab === 'sessions' && (
          <div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
              Each row is a task run. Sessions are stored locally and automatically tracked after each completed conversation.
            </div>

            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
                  No sessions yet. Start a conversation to see it here.
                </div>
                <button className="btn-primary" onClick={() => navigate('chat')}>Start Chatting</button>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {sessions.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '11px 14px',
                      borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.task.length > 90 ? entry.task.slice(0, 90) + '…' : entry.task}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10 }}>
                        <span style={{ textTransform: 'capitalize' }}>{entry.persona}</span>
                        <span>{entry.mode}</span>
                        <span>{timeAgo(entry.ts)}</span>
                        <span style={{ color: 'var(--muted)', opacity: 0.5 }}>{formatDateTime(entry.ts)}</span>
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

        {/* ── Memory tab ── */}
        {tab === 'memory' && (
          <div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
              Persistent memory across sessions. Auto-saved from completed tasks (source: auto) or manually added. Agents use this context in future conversations.
            </div>

            {/* Agent selector + controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Persona</label>
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                style={{ fontSize: 12, maxWidth: 180 }}
              >
                {allAgentIds.map(id => (
                  <option key={id} value={id}>
                    {id} {memories.filter(m => m.agentId === id).length > 0
                      ? `(${memories.filter(m => m.agentId === id).length})`
                      : ''}
                  </option>
                ))}
              </select>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {agentMemories.length > 0 && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, color: '#ef4444' }}
                    onClick={() => { if (confirm(`Clear all memory for "${selectedAgent}"?`)) clearAgentMemories(selectedAgent) }}
                  >
                    Clear all
                  </button>
                )}
                <button
                  className="btn-primary"
                  style={{ fontSize: 11 }}
                  onClick={() => setAddingNew(s => !s)}
                >
                  {addingNew ? 'Cancel' : '+ Add memory'}
                </button>
              </div>
            </div>

            {/* Add memory form */}
            {addingNew && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8,
                padding: 14, marginBottom: 12,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Key</label>
                    <input
                      value={newKey}
                      onChange={e => setNewKey(e.target.value)}
                      placeholder="user_preference"
                      style={{ width: '100%', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Value</label>
                    <input
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      placeholder="Prefers TypeScript with strict mode enabled"
                      style={{ width: '100%', fontSize: 12 }}
                      onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                    />
                  </div>
                </div>
                <button
                  className="btn-primary"
                  disabled={!newKey.trim() || !newValue.trim()}
                  onClick={handleAddMemory}
                  style={{ fontSize: 12 }}
                >
                  Save
                </button>
              </div>
            )}

            {/* Memory entries */}
            {agentMemories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                  No memory for <strong>{selectedAgent}</strong> yet.
                  <br />
                  Memory is auto-saved after each completed task, or you can add entries manually.
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {agentMemories.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '11px 14px',
                      borderBottom: i < agentMemories.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                          {m.key}
                        </span>
                        <span style={{
                          fontSize: 8, padding: '1px 5px', borderRadius: 3,
                          background: m.source === 'auto' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${m.source === 'auto' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'}`,
                          color: m.source === 'auto' ? '#6366f1' : '#10b981',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {m.source}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>{timeAgo(m.ts)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.55 }}>
                        {m.value.length > 200 ? m.value.slice(0, 200) + '…' : m.value}
                      </div>
                    </div>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, color: '#ef4444', flexShrink: 0, padding: '2px 8px' }}
                      onClick={() => deleteMemory(m.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
