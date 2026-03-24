import { type MAState, ROLE_COLORS } from '@/lib/multiAgentEngine'

interface Props {
  state: MAState
}

const TOOL_COLORS: Record<string, string> = {
  web_search:       '#3b82f6',
  llm_call:         '#8b5cf6',
  browser_navigate: '#22d3ee',
  browser_snapshot: '#06b6d4',
  browser_read:     '#0891b2',
  browser_click:    '#0e7490',
  browser_fill:     '#155e75',
}
function toolColor(tool: string) { return TOOL_COLORS[tool] ?? '#64748b' }

export function TimelinePanel({ state }: Props) {
  const { agents, phase } = state
  const toolCalls = state.toolCalls ?? []

  const activeAgents = agents.filter(a => a.startTs)
  if (phase === 'idle' || activeAgents.length === 0) return null

  const now = Date.now()
  const allStart = activeAgents.map(a => a.startTs!)
  const allEnd   = [
    ...activeAgents.filter(a => a.endTs).map(a => a.endTs!),
    ...toolCalls.filter(tc => tc.endTs).map(tc => tc.endTs!),
    now,
  ]
  const minTs = Math.min(...allStart)
  const maxTs = Math.max(...allEnd, minTs + 1000)
  const range  = maxTs - minTs || 1

  const pct = (ts: number) => ((ts - minTs) / range) * 100

  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid var(--border)',
      background: 'rgba(8,8,24,0.7)',
      padding: '8px 14px 10px',
      maxHeight: 160,
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        Timeline
      </div>

      {activeAgents.map(agent => {
        const color   = ROLE_COLORS[agent.role] ?? '#6366f1'
        const left    = pct(agent.startTs!)
        const width   = agent.endTs ? pct(agent.endTs) - left : 100 - left
        const agentTcs = toolCalls.filter(tc => tc.agentId === agent.id && tc.startTs)

        return (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            {/* Agent name label */}
            <div style={{
              width: 76, flexShrink: 0,
              fontSize: 9, fontWeight: 700, color,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {agent.name}
            </div>

            {/* Track */}
            <div style={{ flex: 1, height: 14, position: 'relative', background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
              {/* Agent activity bar */}
              <div style={{
                position: 'absolute', top: 2, height: 10, borderRadius: 2,
                left: `${left}%`, width: `${Math.max(width, 1)}%`,
                background: color + '55', border: `1px solid ${color}44`,
                transition: 'width 0.4s ease',
              }} />

              {/* Tool call markers */}
              {agentTcs.map(tc => {
                const tcLeft  = pct(tc.startTs)
                const tcWidth = tc.endTs ? Math.max(pct(tc.endTs) - tcLeft, 0.5) : 1
                return (
                  <div
                    key={tc.id}
                    title={`${tc.tool}: ${tc.label}`}
                    style={{
                      position: 'absolute', top: 1, height: 12,
                      left: `${tcLeft}%`, width: `${Math.max(tcWidth, 0.8)}%`,
                      minWidth: 3, borderRadius: 1,
                      background: toolColor(tc.tool),
                      opacity: tc.status === 'running' ? 1 : 0.75,
                    }}
                  />
                )
              })}
            </div>

            {/* Duration */}
            <div style={{ width: 32, flexShrink: 0, fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
              {agent.endTs
                ? `${((agent.endTs - agent.startTs!) / 1000).toFixed(1)}s`
                : `${((now - agent.startTs!) / 1000).toFixed(0)}s`}
            </div>
          </div>
        )
      })}

      {/* Tool color legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        {Object.entries(TOOL_COLORS).map(([tool, color]) => (
          <div key={tool} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              {tool.replace('browser_', '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
