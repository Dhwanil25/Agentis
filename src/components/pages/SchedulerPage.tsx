import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScheduleType = 'interval' | 'daily'
type SchedulerTab = 'jobs' | 'history'

interface ScheduledJob {
  id: string
  name: string
  task: string
  persona: string
  scheduleType: ScheduleType
  intervalMinutes?: number
  dailyTime?: string        // "HH:MM"
  enabled: boolean
  lastRun?: number
  nextRun?: number
  createdAt: number
  runCount: number
}

interface RunRecord {
  id: string
  jobId: string
  jobName: string
  task: string
  persona: string
  ts: number
  trigger: 'manual' | 'scheduled'
}

interface Props {
  execute: (task: string, personaId: string) => void
  navigate: (page: string) => void
  reset: () => void
  agentRunning: boolean
}

// ── Storage ───────────────────────────────────────────────────────────────────

const JOBS_KEY    = 'agentis_scheduler_jobs'
const HISTORY_KEY = 'agentis_scheduler_history'

function loadJobs(): ScheduledJob[] {
  try { return JSON.parse(localStorage.getItem(JOBS_KEY) ?? '[]') as ScheduledJob[] }
  catch { return [] }
}

function saveJobs(jobs: ScheduledJob[]): void {
  try { localStorage.setItem(JOBS_KEY, JSON.stringify(jobs)) }
  catch { /* ignore */ }
}

function loadRunHistory(): RunRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as RunRecord[]
    // Filter out records from old schema (pre-v2) that lack required fields
    return raw.filter(r => r.id && r.jobName && r.trigger)
  } catch { return [] }
}

function migrateStorage(): void {
  // Clear old-format jobs and history that would crash the new schema
  try {
    const jobs = JSON.parse(localStorage.getItem(JOBS_KEY) ?? '[]') as ScheduledJob[]
    const valid = jobs.filter(j => j.id && j.name && j.scheduleType)
    if (valid.length !== jobs.length) localStorage.setItem(JOBS_KEY, JSON.stringify(valid))
  } catch { localStorage.removeItem(JOBS_KEY) }

  try {
    const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as RunRecord[]
    const valid = hist.filter(r => r.id && r.jobName && r.trigger)
    if (valid.length !== hist.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(valid))
  } catch { localStorage.removeItem(HISTORY_KEY) }
}

function saveRunHistory(recs: RunRecord[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(recs.slice(-200))) }
  catch { /* ignore */ }
}

function computeNextRun(job: ScheduledJob, fromTs = Date.now()): number {
  if (job.scheduleType === 'interval') {
    return fromTs + (job.intervalMinutes ?? 60) * 60_000
  }
  const [hh, mm] = (job.dailyTime ?? '09:00').split(':').map(Number)
  const d = new Date(fromTs)
  d.setHours(hh, mm, 0, 0)
  if (d.getTime() <= fromTs) d.setDate(d.getDate() + 1)
  return d.getTime()
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeUntil(ts: number): string {
  const ms = ts - Date.now()
  if (ms < 0) return 'overdue'
  const m = Math.floor(ms / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `in ${d}d ${h % 24}h`
  if (h > 0)  return `in ${h}h ${m % 60}m`
  if (m > 0)  return `in ${m}m`
  return 'in <1m'
}

// ── New Job form ──────────────────────────────────────────────────────────────

const PERSONAS = [
  { id: 'dev',        label: 'Developer'  },
  { id: 'writer',     label: 'Writer'     },
  { id: 'analyst',    label: 'Analyst'    },
  { id: 'researcher', label: 'Researcher' },
]

const INTERVAL_OPTIONS = [
  { label: 'Every 15 minutes', value: 15   },
  { label: 'Every 30 minutes', value: 30   },
  { label: 'Every hour',       value: 60   },
  { label: 'Every 4 hours',    value: 240  },
  { label: 'Every 12 hours',   value: 720  },
  { label: 'Every 24 hours',   value: 1440 },
]

function NewJobForm({ onSave, onCancel }: { onSave: (job: ScheduledJob) => void; onCancel: () => void }) {
  const [name,         setName]         = useState('')
  const [task,         setTask]         = useState('')
  const [persona,      setPersona]      = useState('dev')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('interval')
  const [intervalMins, setIntervalMins] = useState(60)
  const [dailyTime,    setDailyTime]    = useState('09:00')

  const valid = name.trim() && task.trim()

  const handleSave = () => {
    if (!valid) return
    const now = Date.now()
    const job: ScheduledJob = {
      id: `${now}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      task: task.trim(),
      persona,
      scheduleType,
      intervalMinutes: scheduleType === 'interval' ? intervalMins : undefined,
      dailyTime:       scheduleType === 'daily'    ? dailyTime    : undefined,
      enabled: true,
      createdAt: now,
      runCount: 0,
    }
    job.nextRun = computeNextRun(job, now)
    onSave(job)
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--accent)',
      borderRadius: 8,
      padding: 16,
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>New Scheduled Job</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Job Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Daily digest…"
            style={{ width: '100%', fontSize: 12 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Agent Persona</label>
          <select value={persona} onChange={e => setPersona(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
            {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Task</label>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Summarise the top HN stories today and list them in bullet points…"
          rows={3}
          style={{ width: '100%', fontSize: 12, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Schedule Type</label>
          <select
            value={scheduleType}
            onChange={e => setScheduleType(e.target.value as ScheduleType)}
            style={{ width: '100%', fontSize: 12 }}
          >
            <option value="interval">Recurring interval</option>
            <option value="daily">Daily at time</option>
          </select>
        </div>
        <div>
          {scheduleType === 'interval' ? (
            <>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Interval</label>
              <select
                value={intervalMins}
                onChange={e => setIntervalMins(Number(e.target.value))}
                style={{ width: '100%', fontSize: 12 }}
              >
                {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Time (24h)</label>
              <input
                type="time"
                value={dailyTime}
                onChange={e => setDailyTime(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
              />
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 6, fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--fg)' }}>Preview: </strong>
        {scheduleType === 'interval'
          ? `Run every ${intervalMins >= 60
              ? `${intervalMins / 60}h`
              : `${intervalMins}m`} · next run ${timeUntil(computeNextRun({
                id: '', name: '', task: '', persona: '', scheduleType, intervalMinutes: intervalMins,
                enabled: true, createdAt: Date.now(), runCount: 0,
              }))}`
          : `Run daily at ${dailyTime} · next run ${timeUntil(computeNextRun({
              id: '', name: '', task: '', persona: '', scheduleType, dailyTime,
              enabled: true, createdAt: Date.now(), runCount: 0,
            }))}`
        }
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" disabled={!valid} onClick={handleSave} style={{ fontSize: 12 }}>
          Save Job
        </button>
        <button className="btn-ghost" onClick={onCancel} style={{ fontSize: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SchedulerPage({ execute, navigate, reset, agentRunning }: Props) {
  const [tab,        setTab]        = useState<SchedulerTab>('jobs')
  const [jobs,       setJobs]       = useState<ScheduledJob[]>(() => { migrateStorage(); return loadJobs() })
  const [runHistory, setRunHistory] = useState<RunRecord[]>(loadRunHistory)
  const [showNew,    setShowNew]    = useState(false)
  const [lastFired,  setLastFired]  = useState<string | null>(null) // job name that last fired

  const executeRef = useRef(execute)
  executeRef.current = execute

  // Persist jobs on change
  useEffect(() => { saveJobs(jobs) }, [jobs])

  // Scheduler tick — check every 30s if any jobs are due
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      setJobs(prev => {
        let changed = false
        const next = prev.map(job => {
          if (!job.enabled || !job.nextRun || job.nextRun > now) return job
          changed = true

          // Record the trigger
          const rec: RunRecord = {
            id: `${now}-${Math.random().toString(36).slice(2)}`,
            jobId: job.id, jobName: job.name,
            task: job.task, persona: job.persona,
            ts: now, trigger: 'scheduled',
          }
          setRunHistory(h => { const updated = [...h, rec]; saveRunHistory(updated); return updated })
          setLastFired(job.name)

          // Fire: navigate to Chat and execute so user can see output + stop it
          navigate('chat')
          setTimeout(() => {
            reset()
            executeRef.current(job.task, job.persona)
          }, 150)

          return {
            ...job,
            lastRun: now,
            runCount: job.runCount + 1,
            nextRun: computeNextRun(job, now),
          }
        })
        return changed ? next : prev
      })
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [navigate, reset])

  const fireJob = (job: ScheduledJob, trigger: 'manual' | 'scheduled') => {
    const rec: RunRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      jobId: job.id, jobName: job.name,
      task: job.task, persona: job.persona,
      ts: Date.now(), trigger,
    }
    setRunHistory(h => { const updated = [...h, rec]; saveRunHistory(updated); return updated })
    setJobs(prev => prev.map(j => j.id === job.id ? {
      ...j, lastRun: Date.now(), runCount: j.runCount + 1, nextRun: computeNextRun(j),
    } : j))

    // Navigate to Chat so the user sees streaming output and can stop it
    navigate('chat')
    setTimeout(() => {
      reset()
      execute(job.task, job.persona)
    }, 150)
  }

  const addJob = (job: ScheduledJob) => {
    setJobs(prev => [...prev, job])
    setShowNew(false)
  }

  const toggleJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id
      ? { ...j, enabled: !j.enabled, nextRun: !j.enabled ? computeNextRun(j) : j.nextRun }
      : j
    ))
  }

  const deleteJob = (id: string) => {
    if (!confirm('Delete this job?')) return
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const recentHistory = [...runHistory].reverse().slice(0, 50)
  const enabledJobs   = jobs.filter(j => j.enabled)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Scheduler</span>
        <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setShowNew(s => !s)}>
          {showNew ? 'Cancel' : '+ New Job'}
        </button>
      </div>

      <div className="of-page-content">

        {/* Agent running banner */}
        {agentRunning && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', marginBottom: 14,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>
              Agent is running
              {lastFired ? ` — job "${lastFired}" triggered` : ''}
            </span>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, marginLeft: 'auto', color: 'var(--accent)' }}
              onClick={() => navigate('chat')}
            >
              View in Chat →
            </button>
          </div>
        )}

        {/* Last fired notification */}
        {!agentRunning && lastFired && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px', marginBottom: 14,
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 12, color: '#10b981' }}>
              ✓ Job "{lastFired}" completed — result is in Chat
            </span>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, marginLeft: 'auto', color: 'var(--accent)' }}
              onClick={() => navigate('chat')}
            >
              View in Chat →
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, color: 'var(--muted)', padding: '2px 6px' }}
              onClick={() => setLastFired(null)}
            >
              ×
            </button>
          </div>
        )}

        {showNew && <NewJobForm onSave={addJob} onCancel={() => setShowNew(false)} />}

        {/* Summary row */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Total Jobs',    value: String(jobs.length)         },
              { label: 'Active',        value: String(enabledJobs.length)  },
              { label: 'Total Runs',    value: String(runHistory.length)   },
            ].map(s => (
              <div key={s.label} className="of-stat-card" style={{ flex: 1, padding: '10px 14px' }}>
                <div className="of-stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                <div className="of-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tab-bar">
          <button className={`tab-btn${tab === 'jobs' ? ' active' : ''}`} onClick={() => setTab('jobs')}>
            Jobs ({jobs.length})
          </button>
          <button className={`tab-btn${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
            Run History ({runHistory.length})
          </button>
        </div>

        {/* ── Jobs tab ── */}
        {tab === 'jobs' && (
          <>
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>No scheduled jobs</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 20px' }}>
                  Create a job to run agent tasks automatically. When a job fires, Agentis opens Chat so you can see the live output and stop it if needed.
                </div>
                <button className="btn-primary" onClick={() => setShowNew(true)}>Create Scheduled Job</button>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {jobs.map((job, i) => (
                  <div
                    key={job.id}
                    style={{
                      padding: '13px 14px',
                      borderBottom: i < jobs.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: job.enabled ? 1 : 0.55,
                    }}
                  >
                    {/* Enable toggle */}
                    <div
                      title={job.enabled ? 'Disable job' : 'Enable job'}
                      onClick={() => toggleJob(job.id)}
                      style={{
                        width: 30, height: 17, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                        background: job.enabled ? 'var(--accent)' : 'var(--border)',
                        position: 'relative', transition: 'background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 13, height: 13, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, left: job.enabled ? 15 : 2,
                        transition: 'left 0.15s',
                      }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{job.name}</span>
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)',
                          background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)',
                          textTransform: 'uppercase',
                        }}>{job.persona}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.task.length > 80 ? job.task.slice(0, 80) + '…' : job.task}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--fg)', fontWeight: 500 }}>
                          {job.scheduleType === 'interval'
                            ? `Every ${(job.intervalMinutes ?? 60) >= 60 ? `${(job.intervalMinutes ?? 60) / 60}h` : `${job.intervalMinutes}m`}`
                            : `Daily at ${job.dailyTime}`}
                        </span>
                        {job.enabled && job.nextRun && (
                          <span>Next: <strong style={{ color: 'var(--fg)' }}>{timeUntil(job.nextRun)}</strong></span>
                        )}
                        {job.lastRun && (
                          <span>Last run: {formatDateTime(job.lastRun)}</span>
                        )}
                        <span>{job.runCount} run{job.runCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 11, padding: '5px 12px' }}
                        onClick={() => fireJob(job, 'manual')}
                      >
                        ▶ Run now
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '5px 10px', color: '#ef4444' }}
                        onClick={() => deleteJob(job.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="of-table">
              <thead>
                <tr>
                  <th>Job Name</th>
                  <th>Task</th>
                  <th>Persona</th>
                  <th>Triggered</th>
                  <th>Trigger</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                      No run history yet. Use "Run now" or wait for a scheduled job to fire.
                    </td>
                  </tr>
                ) : recentHistory.map(rec => {
                  const trigger = rec.trigger ?? 'manual'
                  const task    = rec.task    ?? '—'
                  const persona = rec.persona ?? '—'
                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 500 }}>{rec.jobName ?? '—'}</td>
                      <td style={{ color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.length > 45 ? task.slice(0, 45) + '…' : task}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'capitalize' }}>{persona}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 11 }}>{formatDateTime(rec.ts)}</td>
                      <td>
                        <span className={trigger === 'manual' ? 'badge badge-gray' : 'badge badge-accent'} style={{ fontSize: 9 }}>
                          {trigger.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {recentHistory.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11, color: '#ef4444' }}
                  onClick={() => { if (confirm('Clear run history?')) { setRunHistory([]); saveRunHistory([]) } }}
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
