import type { WorkflowNode } from '@/types/workflow'

interface Props {
  node: WorkflowNode
  isSelected: boolean
  onClick: () => void
  compact?: boolean
}

export function NodeCard({ node, isSelected, onClick, compact = false }: Props) {
  const isRunning = node.status === 'running'
  const isDone = node.status === 'done'
  const isError = node.status === 'error'
  const isPending = node.status === 'pending'

  const wordCount = isDone && node.output ? node.output.split(/\s+/).filter(Boolean).length : 0

  const statusIcon = () => {
    if (isDone) return <span style={{ color: '#1D9E75', fontSize: 12 }}>✓</span>
    if (isError) return <span style={{ color: '#E24B4A', fontSize: 12 }}>✕</span>
    if (isRunning) return (
      <span style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: node.skillColor.border,
        animation: 'pulse 1.2s ease-in-out infinite',
      }} />
    )
    return <span style={{ color: 'var(--border)', fontSize: 12 }}>○</span>
  }

  if (compact) {
    return (
      <>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
        <button
          onClick={onClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            border: isSelected ? `1px solid ${node.skillColor.border}` : '1px solid transparent',
            background: isSelected ? node.skillColor.bg : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            opacity: isPending ? 0.45 : 1,
            transition: 'all 0.15s',
          }}
        >
          <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {statusIcon()}
          </div>
          <span style={{
            padding: '1px 7px',
            borderRadius: 20,
            border: `0.5px solid ${node.skillColor.border}`,
            background: node.skillColor.bg,
            color: node.skillColor.text,
            fontSize: 10,
            fontWeight: 500,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            {node.skill}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.title}
            </div>
            {isRunning && (
              <div style={{ fontSize: 10, color: node.skillColor.text, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.thinking}
              </div>
            )}
            {isDone && wordCount > 0 && (
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{wordCount} words</div>
            )}
          </div>
        </button>
      </>
    )
  }

  // Full card mode (used in workflow preview)
  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      <div
        onClick={onClick}
        style={{
          padding: '12px 14px',
          borderRadius: 10,
          border: isSelected
            ? `1.5px solid ${node.skillColor.border}`
            : `0.5px solid var(--border)`,
          background: isSelected ? node.skillColor.bg : 'var(--surface)',
          cursor: 'pointer',
          opacity: isPending ? 0.5 : 1,
          transition: 'all 0.2s',
          minWidth: 140,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusIcon()}
          </div>
          <span style={{
            padding: '1px 7px',
            borderRadius: 20,
            border: `0.5px solid ${node.skillColor.border}`,
            background: node.skillColor.bg,
            color: node.skillColor.text,
            fontSize: 10,
            fontWeight: 500,
          }}>
            {node.skill}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{node.title}</div>
        {isRunning && (
          <div style={{ fontSize: 11, color: node.skillColor.text, fontStyle: 'italic', marginTop: 4 }}>
            {node.thinking}
          </div>
        )}
      </div>
    </>
  )
}
