import { useState, useEffect } from 'react'
import {
  loadUsageRecords, getAnalyticsSummary, clearUsageRecords,
  formatCost, formatTokens,
} from '@/lib/analytics'
import type { UsageRecord, AnalyticsSummary } from '@/lib/analytics'

type AnalyticsTab = 'summary' | 'by-model' | 'by-agent' | 'costs'

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function MiniBar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  )
}

export function AnalyticsPage() {
  const [tab, setTab]           = useState<AnalyticsTab>('summary')
  const [records, setRecords]   = useState<UsageRecord[]>([])
  const [summary, setSummary]   = useState<AnalyticsSummary | null>(null)

  const refresh = () => {
    const r = loadUsageRecords()
    setRecords(r)
    setSummary(getAnalyticsSummary(r))
  }

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('agentis_analytics_update', handler)
    return () => window.removeEventListener('agentis_analytics_update', handler)
  }, [])

  const hasData = records.length > 0
  const recent  = [...records].reverse().slice(0, 20)

  const topStats = [
    { label: 'Input Tokens',   value: hasData ? formatTokens(summary?.totalInputTokens  ?? 0) : '0'     },
    { label: 'Output Tokens',  value: hasData ? formatTokens(summary?.totalOutputTokens ?? 0) : '0'     },
    { label: 'Estimated Cost', value: hasData ? formatCost(summary?.totalCost ?? 0)            : '$0.00' },
    { label: 'API Calls',      value: hasData ? String(summary?.apiCalls ?? 0)                 : '0'     },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Analytics</span>
        {hasData && (
          <button
            className="btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => { if (confirm('Clear all analytics data?')) { clearUsageRecords(); refresh() } }}
          >
            Clear Data
          </button>
        )}
      </div>

      <div className="of-page-content">
        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {topStats.map(stat => (
            <div key={stat.label} className="of-stat-card">
              <div className="of-stat-value">{stat.value}</div>
              <div className="of-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {([
            { id: 'summary'  as const, label: 'Summary'  },
            { id: 'by-model' as const, label: 'By Model' },
            { id: 'by-agent' as const, label: 'By Agent' },
            { id: 'costs'    as const, label: 'Costs'    },
          ]).map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Summary ── */}
        {tab === 'summary' && (
          <div>
            {!hasData ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>No data yet</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                  Token usage and costs will appear here once you run tasks in Chat or Workflows.
                </div>
              </div>
            ) : (
              <>
                {/* Token breakdown */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Token Breakdown</span>
                  </div>
                  <table className="of-table">
                    <tbody>
                      {[
                        ['INPUT TOKENS',  formatTokens(summary?.totalInputTokens  ?? 0)],
                        ['OUTPUT TOKENS', formatTokens(summary?.totalOutputTokens ?? 0)],
                        ['TOTAL TOKENS',  formatTokens(summary?.totalTokens       ?? 0)],
                        ['TOTAL COST',    formatCost(summary?.totalCost           ?? 0)],
                        ['API CALLS',     String(summary?.apiCalls               ?? 0)],
                      ].map(([metric, value]) => (
                        <tr key={metric}>
                          <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em', width: 160 }}>{metric}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Daily activity (last 14 days) */}
                {summary && summary.daily.length > 1 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Daily Activity</span>
                    </div>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(() => {
                        const maxTokens = Math.max(...summary.daily.map(d => d.tokens), 1)
                        return summary.daily.map(d => (
                          <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 60, flexShrink: 0 }}>
                              {new Date(d.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <MiniBar pct={(d.tokens / maxTokens) * 100} />
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 50, textAlign: 'right', flexShrink: 0 }}>
                              {formatTokens(d.tokens)}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', width: 50, textAlign: 'right', flexShrink: 0 }}>
                              {formatCost(d.cost)}
                            </span>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Recent runs */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent Runs</span>
                  </div>
                  <table className="of-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Agent</th>
                        <th>Tokens</th>
                        <th>Cost</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map(r => (
                        <tr key={r.id}>
                          <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.task.length > 50 ? r.task.slice(0, 50) + '…' : r.task}
                          </td>
                          <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.persona}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(r.inputTokens + r.outputTokens)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{formatCost(r.cost)}</td>
                          <td style={{ color: 'var(--muted)', fontSize: 11 }}>{formatDateTime(r.ts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── By Model ── */}
        {tab === 'by-model' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {!hasData || !summary || Object.keys(summary.byModel).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No model data yet. Run tasks to see usage by model.</div>
              </div>
            ) : (
              <table className="of-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Calls</th>
                    <th>Input Tokens</th>
                    <th>Output Tokens</th>
                    <th>Cost</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byModel).map(([model, data]) => (
                    <tr key={model}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{model}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{data.calls}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(data.inputTokens)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(data.outputTokens)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{formatCost(data.cost)}</td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MiniBar pct={summary.totalCost > 0 ? (data.cost / summary.totalCost) * 100 : 0} />
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                            {summary.totalCost > 0 ? Math.round((data.cost / summary.totalCost) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── By Agent ── */}
        {tab === 'by-agent' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {!hasData || !summary || Object.keys(summary.byPersona).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No agent data yet. Run tasks to see usage by agent persona.</div>
              </div>
            ) : (
              <table className="of-table">
                <thead>
                  <tr>
                    <th>Agent Persona</th>
                    <th>Calls</th>
                    <th>Total Tokens</th>
                    <th>Cost</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byPersona).map(([persona, data]) => (
                    <tr key={persona}>
                      <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{persona}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{data.calls}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(data.tokens)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{formatCost(data.cost)}</td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MiniBar pct={summary.totalCost > 0 ? (data.cost / summary.totalCost) * 100 : 0} color='#10b981' />
                          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                            {summary.totalCost > 0 ? Math.round((data.cost / summary.totalCost) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Costs ── */}
        {tab === 'costs' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Cost Summary</span>
              </div>
              {!hasData || !summary ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No cost data yet.</div>
              ) : (
                <table className="of-table">
                  <thead>
                    <tr><th>Model</th><th>Input</th><th>Output</th><th>Total Cost</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byModel).map(([model, data]) => (
                      <tr key={model}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{model}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(data.inputTokens)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{formatTokens(data.outputTokens)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>{formatCost(data.cost)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 600, color: 'var(--fg)' }}>Total</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatTokens(summary.totalInputTokens)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatTokens(summary.totalOutputTokens)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{formatCost(summary.totalCost)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Daily cost chart */}
            {summary && summary.daily.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Daily Cost</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(() => {
                    const maxCost = Math.max(...summary.daily.map(d => d.cost), 0.0001)
                    return summary.daily.map(d => (
                      <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 60, flexShrink: 0 }}>
                          {new Date(d.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <MiniBar pct={(d.cost / maxCost) * 100} color='var(--accent)' />
                        <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', width: 55, textAlign: 'right', flexShrink: 0 }}>
                          {formatCost(d.cost)}
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}

            {/* Pricing reference */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--fg)' }}>Pricing reference:</strong>{' '}
              claude-sonnet-4 $3/M in · $15/M out &nbsp;·&nbsp;
              claude-haiku-4-5 $0.80/M in · $4/M out &nbsp;·&nbsp;
              claude-opus-4 $15/M in · $75/M out
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
