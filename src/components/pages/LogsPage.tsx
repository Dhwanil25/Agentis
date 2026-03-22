import { useState, useEffect, useRef } from 'react'
import { loadHistory } from '@/components/DashboardScreen'
import type { HistoryEntry } from '@/components/DashboardScreen'

interface LogEntry {
  line: string
  ts: number
  level?: 'INFO' | 'WARN' | 'ERROR'
}

// Parse engine log lines: "18:08:47 INFO [AgentSpawn] name=assistant, parent=None"
interface ParsedLog {
  raw: string
  time: string        // HH:MM:SS from the line, or fallback
  level: 'INFO' | 'WARN' | 'ERROR'
  category: string    // [AgentSpawn] → "AgentSpawn"
  message: string     // everything after the category
}

const LOG_RE = /^(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|ERROR|DEBUG)\s+(?:\[([^\]]+)\]\s*)?(.*)$/i

function parseLine(entry: LogEntry): ParsedLog {
  const m = LOG_RE.exec(entry.line)
  if (m) {
    const lvl = (m[2].toUpperCase()) as 'INFO' | 'WARN' | 'ERROR'
    return {
      raw: entry.line,
      time: m[1],
      level: lvl === 'DEBUG' as unknown as 'INFO' ? 'INFO' : lvl,
      category: m[3] ?? '',
      message: m[4] ?? '',
    }
  }
  // Fallback: no structured format
  const u = entry.line.toUpperCase()
  const level: 'INFO' | 'WARN' | 'ERROR' =
    u.includes('ERROR') || u.includes('FAIL') ? 'ERROR' :
    u.includes('WARN') ? 'WARN' : 'INFO'
  const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return { raw: entry.line, time, level, category: '', message: entry.line }
}

type LogsTab = 'live' | 'audit'

const LEVEL_COLOR: Record<string, string> = {
  INFO:  '#4ade80',
  WARN:  '#f97316',
  ERROR: '#f87171',
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function LogsPage() {
  const [tab, setTab] = useState<LogsTab>('live')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [auditFilter, setAuditFilter] = useState('All Actions')
  const logsRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Keep pausedRef in sync so SSE callback sees latest value without re-subscribing
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    const es = new EventSource('/agentis/logs')
    es.onmessage = e => {
      if (pausedRef.current) return
      try {
        const entry = JSON.parse(e.data as string) as LogEntry
        setLogs(prev => [...prev.slice(-1999), entry])
      } catch { /* ignore malformed */ }
    }
    return () => es.close()
  }, []) // connect once — no re-subscription on pause/resume

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScrollRef.current && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => { setHistory(loadHistory()) }, [])

  const handleScroll = () => {
    if (!logsRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = logsRef.current
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40
  }

  const filteredLogs = logs
    .map(e => ({ entry: e, parsed: parseLine(e) }))
    .filter(({ parsed }) => {
      if (filter !== 'All' && parsed.level !== filter) return false
      if (search && !parsed.raw.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

  const clearLogs = () => setLogs([])

  const exportLogs = () => {
    const content = filteredLogs.map(({ parsed }) => parsed.raw).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `agentis-logs-${Date.now()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with controls inline */}
      <div className="of-page-header" style={{ gap: 12, flexWrap: 'wrap' }}>
        <span className="of-page-title" style={{ marginRight: 'auto' }}>Logs</span>

        {tab === 'live' && (<>
          {/* LIVE indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot" style={{ background: paused ? 'var(--muted)' : '#4ade80', animation: paused ? 'none' : 'pulse-dot 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: paused ? 'var(--muted)' : '#4ade80', letterSpacing: '0.08em' }}>
              {paused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>

          {/* Level filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '5px 10px', fontSize: 12, height: 30, minWidth: 70 }}
          >
            {['All', 'INFO', 'WARN', 'ERROR'].map(l => <option key={l}>{l}</option>)}
          </select>

          {/* Search */}
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, fontSize: 12, padding: '5px 10px', height: 30 }}
          />

          {/* Buttons */}
          <button className="btn-ghost" onClick={() => setPaused(p => !p)} style={{ fontSize: 12, height: 30, padding: '0 12px' }}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn-ghost" onClick={clearLogs} style={{ fontSize: 12, height: 30, padding: '0 12px' }}>Clear</button>
          <button className="btn-ghost" onClick={exportLogs} style={{ fontSize: 12, height: 30, padding: '0 12px' }}>Export</button>

          {/* Auto-scroll toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => { autoScrollRef.current = !autoScrollRef.current }}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', position: 'relative', padding: 0, flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, right: 2, width: 16, height: 16,
                borderRadius: '50%', background: '#fff',
              }} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Auto-scroll</span>
          </div>
        </>)}
      </div>

      <div className="of-page-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
          {(['live', 'audit'] as LogsTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--fg)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: tab === t ? 500 : 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.12s',
                marginBottom: -1,
              }}
            >
              {t === 'live' ? 'Live' : 'Audit Trail'}
            </button>
          ))}
        </div>

        {tab === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '12px 24px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{filteredLogs.length} lines</div>

            {/* Terminal log stream */}
            <div
              ref={logsRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#0a0a0a',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                padding: '10px 0',
              }}
            >
              {filteredLogs.length === 0 ? (
                <div style={{ padding: '16px 16px', color: '#444', fontSize: 12 }}>
                  {logs.length === 0
                    ? '-- Waiting for engine activity --'
                    : '-- No matching log entries --'}
                </div>
              ) : (
                filteredLogs.map(({ parsed }, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 0,
                      padding: '1px 16px',
                      lineHeight: 1.7,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {/* Time */}
                    <span style={{ color: '#555', flexShrink: 0, marginRight: 10, userSelect: 'none' }}>
                      {parsed.time}
                    </span>
                    {/* Level */}
                    <span style={{
                      color: LEVEL_COLOR[parsed.level],
                      flexShrink: 0,
                      marginRight: 10,
                      fontWeight: 600,
                      minWidth: 36,
                    }}>
                      {parsed.level}
                    </span>
                    {/* Category */}
                    {parsed.category && (
                      <span style={{ color: 'var(--accent)', flexShrink: 0, marginRight: 8 }}>
                        [{parsed.category}]
                      </span>
                    )}
                    {/* Message */}
                    <span style={{ color: '#d4d4d4', wordBreak: 'break-all' }}>
                      {parsed.message || parsed.raw}
                    </span>
                  </div>
                ))
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
