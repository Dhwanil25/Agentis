import { useState } from 'react'

type AnalyticsTab = 'summary' | 'by-model' | 'by-agent' | 'costs'

export function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('summary')

  const topStats = [
    { label: 'Total Tokens', value: '0' },
    { label: 'Estimated Cost', value: '$0.00' },
    { label: 'API Calls', value: '0' },
    { label: 'Tool Calls', value: '0' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Analytics</span>
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
            { id: 'summary' as const, label: 'Summary' },
            { id: 'by-model' as const, label: 'By Model' },
            { id: 'by-agent' as const, label: 'By Agent' },
            { id: 'costs' as const, label: 'Costs' },
          ]).map(t => (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Token Breakdown</span>
              </div>
              <table className="of-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['INPUT TOKENS', '0'],
                    ['OUTPUT TOKENS', '0'],
                    ['TOTAL COST', '$0.00'],
                    ['API CALLS', '0'],
                    ['TOOL CALLS', '0'],
                  ].map(([metric, value]) => (
                    <tr key={metric}>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em' }}>{metric}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fg)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                Analytics data will appear here once you start running tasks. Token usage, costs, and performance metrics are tracked per session.
              </div>
            </div>
          </div>
        )}

        {tab === 'by-model' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No model data available yet. Run tasks to see usage by model.</div>
          </div>
        )}

        {tab === 'by-agent' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No agent data available yet. Run tasks to see usage by agent persona.</div>
          </div>
        )}

        {tab === 'costs' && (
          <div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Cost Summary</span>
              </div>
              <table className="of-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--muted)' }}>Anthropic</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>claude-sonnet-4</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>0</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange)' }}>$0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(249,115,22,0.05)', border: '1px solid var(--orange-border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              Pricing: claude-sonnet-4 at $3/M input tokens, $15/M output tokens.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
