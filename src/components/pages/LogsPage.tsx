import { useState, useEffect, useRef } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'

interface LogEntry {
  line: string
  ts: number
  level?: 'INFO' | 'WARN' | 'ERROR'
}

type LogsTab = 'live' | 'audit'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function LogsPage() {
  const [tab, setTab] = useState<LogsTab>('live')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [auditFilter, setAuditFilter] = useState('All Actions')
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource('/agentis/logs')
    es.onmessage = e => {
      if (paused) return
      try {
        const entry = JSON.parse(e.data as string) as LogEntry
        setLogs(prev => [...prev.slice(-999), entry])
      } catch { /* ignore */ }
    }
    return () => es.close()
  }, [paused])

  useEffect(() => {
    if (!paused && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs, paused])

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const levelColor: Record<string, string> = {
    INFO: 'var(--blue)',
    WARN: 'var(--orange)',
    ERROR: 'var(--red)',
  }

  const detectLevel = (line: string): 'INFO' | 'WARN' | 'ERROR' => {
    const u = line.toUpperCase()
    if (u.includes('ERROR') || u.includes('FAIL')) return 'ERROR'
    if (u.includes('WARN')) return 'WARN'
    return 'INFO'
  }

  const filteredLogs = logs.filter(entry => {
    const level = entry.level ?? detectLevel(entry.line)
    if (filter !== 'All' && level !== filter) return false
    if (search && !entry.line.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const clearLogs = () => setLogs([])

  const exportLogs = () => {
    const content = filteredLogs.map(e => `[${formatTime(e.ts)}] ${e.line}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentis-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Logs</span>
      </div>

      <div className="of-page-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div className="tab-bar">
            <button className={`tab-btn${tab === 'live' ? ' active' : ''}`} onClick={() => setTab('live')}>Live</button>
            <button className={`tab-btn${tab === 'audit' ? ' active' : ''}`} onClick={() => setTab('audit')}>Audit Trail</button>
          </div>
        </div>

        {tab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '0 24px 16px' }}>
            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="dot"
                  style={{ background: paused ? 'var(--muted)' : 'var(--green)', animation: paused ? 'none' : 'pulse-dot 2s infinite' }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: paused ? 'var(--muted)' : 'var(--green)', letterSpacing: '0.04em' }}>
                  {paused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 11, height: 28 }}
              >
                {['All', 'INFO', 'WARN', 'ERROR'].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <input
                placeholder="Search logs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '5px 10px', height: 28 }}
              />
              <button className="btn-ghost" onClick={() => setPaused(p => !p)} style={{ fontSize: 11, height: 28, padding: '0 10px' }}>
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn-ghost" onClick={clearLogs} style={{ fontSize: 11, height: 28, padding: '0 10px' }}>Clear</button>
              <button className="btn-ghost" onClick={exportLogs} style={{ fontSize: 11, height: 28, padding: '0 10px' }}>Export</button>
            </div>

            {/* Log stream */}
            <div
              ref={logsRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '20px 14px', color: 'var(--muted)', fontSize: 12 }}>
                  {logs.length === 0 ? 'No log entries yet. Engine activity will appear here.' : 'No matching log entries.'}
                </div>
              ) : (
                filteredLogs.map((entry, i) => {
                  const level = entry.level ?? detectLevel(entry.line)
                  return (
                    <div key={i} className="of-log-row" style={{ alignItems: 'flex-start' }}>
                      <span className="of-log-ts">{formatTime(entry.ts)}</span>
                      <span
                        className="badge"
                        style={{
                          background: `${levelColor[level]}18`,
                          color: levelColor[level],
                          border: `1px solid ${levelColor[level]}40`,
                          fontSize: 9,
                          padding: '1px 5px',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {level}
                      </span>
                      <span className="of-log-msg">{entry.line}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 16px' }}>
            <div className="of-info-banner">
              <span style={{ fontWeight: 600 }}>Tamper-Evident Audit Trail</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                All agent actions are recorded locally. Export for compliance review.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select
                value={auditFilter}
                onChange={e => setAuditFilter(e.target.value)}
                style={{ padding: '5px 8px', fontSize: 12 }}
              >
                {['All Actions', 'Chat', 'Workflow', 'Error'].map(a => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="of-table" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th style={{ width: 130 }}>Timestamp</th>
                    <th style={{ width: 80 }}>Agent</th>
                    <th style={{ width: 70 }}>Action</th>
                    <th>Detail</th>
                    <th style={{ width: 80 }}>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 12px' }}>
                        No audit entries yet. Run tasks to create an audit trail.
                      </td>
                    </tr>
                  ) : (
                    [...history].reverse()
                      .filter(e => auditFilter === 'All Actions' || e.mode === auditFilter.toLowerCase() || (auditFilter === 'Error' && e.status === 'error'))
                      .map((entry, i) => (
                        <tr key={entry.id}>
                          <td style={{ color: 'var(--muted)', fontSize: 11 }}>{i + 1}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{formatDateTime(entry.ts)}</td>
                          <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{entry.persona}</td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: 9 }}>
                              {entry.mode.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.task.length > 50 ? entry.task.slice(0, 50) + '...' : entry.task}
                          </td>
                          <td>
                            <span className={entry.status === 'completed' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9 }}>
                              {entry.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
