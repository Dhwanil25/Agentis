import type { WorkflowTemplate, NodeDefinition } from '@/types/templates'
import { SKILL_COLORS, DEFAULT_SKILL_COLOR } from '@/lib/colors'

interface Props {
  template: WorkflowTemplate
  onRun: () => void
  onBack: () => void
}

function computeTiers(nodes: NodeDefinition[]): NodeDefinition[][] {
  const tiers: NodeDefinition[][] = []
  const assigned = new Set<string>()
  let remaining = [...nodes]

  while (remaining.length > 0) {
    const tier = remaining.filter(n => n.dependsOn.every(id => assigned.has(id)))
    if (tier.length === 0) break
    tiers.push(tier)
    tier.forEach(n => assigned.add(n.id))
    remaining = remaining.filter(n => !assigned.has(n.id))
  }

  return tiers
}

export function WorkflowPreview({ template, onRun, onBack }: Props) {
  const tiers = computeTiers(template.nodeDefinitions)
  const totalNodes = template.nodeDefinitions.length

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>
          {template.icon} {template.name}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 6px' }}>
          {template.description}
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
          <span>~{template.estimatedMinutes} min</span>
          <span>{totalNodes} agents</span>
          <span>{tiers.length} execution phases</span>
        </div>
      </div>

      {/* DAG visualization */}
      <div style={{
        overflowX: 'auto',
        marginBottom: 24,
        padding: '20px 0',
        borderTop: '0.5px solid var(--border)',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
          {tiers.map((tier, tierIdx) => {
            // Group nodes by parallelGroup within the tier
            const groups = new Map<string, NodeDefinition[]>()
            tier.forEach(node => {
              const key = node.parallelGroup ?? `__solo_${node.id}`
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(node)
            })

            return (
              <div key={tierIdx} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from(groups.entries()).map(([groupKey, groupNodes]) => {
                    const isGroup = groupNodes.length > 1
                    return (
                      <div
                        key={groupKey}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: isGroup ? '8px' : '0',
                          borderRadius: isGroup ? 10 : 0,
                          border: isGroup ? '1px dashed var(--border)' : 'none',
                          position: 'relative',
                        }}
                      >
                        {isGroup && (
                          <div style={{
                            position: 'absolute',
                            top: -9,
                            left: 8,
                            fontSize: 9,
                            color: 'var(--muted)',
                            background: 'var(--bg)',
                            padding: '0 4px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}>
                            parallel
                          </div>
                        )}
                        {groupNodes.map(node => {
                          const color = SKILL_COLORS[node.skill] ?? DEFAULT_SKILL_COLOR
                          const hasCritiques = (node.critiques?.length ?? 0) > 0
                          return (
                            <div key={node.id} style={{ position: 'relative' }}>
                              {hasCritiques && (
                                <div style={{
                                  fontSize: 9,
                                  color: '#7C3AED',
                                  marginBottom: 2,
                                  letterSpacing: '0.03em',
                                }}>
                                  ↑ reviews previous
                                </div>
                              )}
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: `1px solid ${color.border}`,
                                background: color.bg,
                                minWidth: 130,
                                maxWidth: 160,
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '1px 7px',
                                  borderRadius: 20,
                                  border: `0.5px solid ${color.border}`,
                                  background: 'rgba(255,255,255,0.6)',
                                  color: color.text,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  marginBottom: 5,
                                }}>
                                  {node.skill}
                                </span>
                                <div style={{ fontSize: 12, fontWeight: 500, color: color.text, lineHeight: 1.3 }}>
                                  {node.title}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* Arrow between tiers */}
                {tierIdx < tiers.length - 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    color: 'var(--muted)',
                    fontSize: 18,
                    flexShrink: 0,
                    alignSelf: 'center',
                  }}>
                    →
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {template.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 11,
            padding: '2px 9px',
            borderRadius: 20,
            border: '0.5px solid var(--border)',
            color: 'var(--muted)',
            background: 'var(--surface)',
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Task prompt guide */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        fontSize: 12,
        color: 'var(--muted)',
        lineHeight: 1.6,
        marginBottom: 24,
      }}>
        <strong style={{ color: 'var(--fg)', display: 'block', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tip</strong>
        {template.taskPromptGuide}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onRun}>
          Run {totalNodes}-agent workflow →
        </button>
      </div>
    </div>
  )
}
