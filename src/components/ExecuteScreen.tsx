import { useState, useEffect } from 'react'
import type { WorkflowNode } from '@/types/workflow'
import { NodeCard } from './NodeCard'

interface Props {
  nodes: WorkflowNode[]
  loading: boolean
  error: string | null
}

export function ExecuteScreen({ nodes, loading, error }: Props) {
  const [selectedId, setSelectedId] = useState<string>('')

  // Auto-select the running node
  useEffect(() => {
    const running = nodes.find(n => n.status === 'running')
    if (running) setSelectedId(running.id)
  }, [nodes])

  const selectedNode = nodes.find(n => n.id === selectedId)
  const doneCount = nodes.filter(n => n.status === 'done').length
  const totalCount = nodes.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // Group consecutive nodes by parallelGroup for sidebar display
  const sidebarGroups: Array<{ group: string | null; nodes: WorkflowNode[] }> = []
  for (const node of nodes) {
    const g = node.parallelGroup ?? null
    const last = sidebarGroups[sidebarGroups.length - 1]
    if (last && last.group === g && g !== null) {
      last.nodes.push(node)
    } else {
      sidebarGroups.push({ group: g, nodes: [node] })
    }
  }

  return (
    <div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
            {loading ? 'Agent running…' : error ? 'Agent stopped' : 'Workflow complete'}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{doneCount}/{totalCount} steps</span>
        </div>
        <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: error ? '#E24B4A' : '#1D9E75',
            borderRadius: 99,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: '#FCEBEB',
          border: '0.5px solid #F09595',
          color: '#A32D2D',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Split panel */}
      <div className="split-panel">
        {/* Sidebar */}
        <div className="split-panel-sidebar">
          {sidebarGroups.map((group, gi) => (
            <div key={gi}>
              {group.group && group.nodes.length > 1 && (
                <div style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '4px 10px 2px',
                }}>
                  ⟐ parallel
                </div>
              )}
              <div style={{
                borderLeft: group.group && group.nodes.length > 1 ? '2px solid var(--border)' : 'none',
                paddingLeft: group.group && group.nodes.length > 1 ? 8 : 0,
                marginLeft: group.group && group.nodes.length > 1 ? 6 : 0,
                marginBottom: 4,
              }}>
                {group.nodes.map(node => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedId === node.id}
                    onClick={() => setSelectedId(node.id)}
                    compact
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Main streaming panel */}
        <div className="split-panel-main" style={{ padding: '4px 0' }}>
          {selectedNode ? (
            <>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '2px 9px',
                  borderRadius: 20,
                  border: `0.5px solid ${selectedNode.skillColor.border}`,
                  background: selectedNode.skillColor.bg,
                  color: selectedNode.skillColor.text,
                  fontSize: 11,
                  fontWeight: 500,
                }}>
                  {selectedNode.skill}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>
                  {selectedNode.title}
                </span>
              </div>
              <div>
                {selectedNode.output}
                {selectedNode.status === 'running' && (
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 14,
                    background: selectedNode.skillColor.border,
                    marginLeft: 2,
                    animation: 'blink 0.8s step-end infinite',
                    verticalAlign: 'text-bottom',
                  }} />
                )}
              </div>
              {selectedNode.status === 'pending' && (
                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Waiting for dependencies…</div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              Select a node from the sidebar to view its output.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
