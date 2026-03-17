import { useState } from 'react'
import type { WorkflowNode } from '@/types/workflow'
import type { Artifact } from '@/types/artifacts'
import { ArtifactViewer } from './ArtifactViewer'
import { downloadArtifactBundle } from '@/lib/download'

type Tab = 'files' | 'trace' | 'summary'

interface Props {
  nodes: WorkflowNode[]
  artifacts: Artifact[]
  onReset: () => void
}

export function OutputScreen({ nodes, artifacts, onReset }: Props) {
  const [tab, setTab] = useState<Tab>(artifacts.length > 0 ? 'files' : 'trace')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalWords = nodes.reduce((sum, n) => sum + (n.output ? n.output.split(/\s+/).filter(Boolean).length : 0), 0)

  const handleDownload = () => {
    downloadArtifactBundle(artifacts, 'agentis-output')
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px' }}>Done</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          {nodes.length} agents · {artifacts.length} files · ~{totalWords.toLocaleString()} words
        </p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {([
          { id: 'files' as Tab, label: `Files (${artifacts.length})` },
          { id: 'trace' as Tab, label: 'Agent Trace' },
          { id: 'summary' as Tab, label: 'Summary' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Files tab */}
      {tab === 'files' && (
        <ArtifactViewer artifacts={artifacts} onDownloadAll={handleDownload} />
      )}

      {/* Trace tab */}
      {tab === 'trace' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nodes.map(node => {
            const isExpanded = expandedId === node.id
            const wordCount = node.output ? node.output.split(/\s+/).filter(Boolean).length : 0
            const hasCritiques = (node.critiques?.length ?? 0) > 0

            return (
              <div key={node.id} style={{
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--surface)',
              }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : node.id)}
                  disabled={node.status === 'pending' || !node.output}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    cursor: node.output ? 'pointer' : 'default',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: `1.5px solid ${node.status === 'done' ? '#1D9E75' : 'var(--border)'}`,
                    background: node.status === 'done' ? '#1D9E75' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: node.status === 'done' ? '#fff' : 'var(--muted)',
                    flexShrink: 0,
                  }}>
                    {node.status === 'done' ? '✓' : '○'}
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
                  }}>
                    {node.skill}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>
                    {node.title}
                  </span>
                  {hasCritiques && (
                    <span style={{ fontSize: 10, color: '#7C3AED', flexShrink: 0 }}>↑ reviews previous</span>
                  )}
                  {wordCount > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{wordCount} words</span>
                  )}
                  {node.output && (
                    <span style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}>▾</span>
                  )}
                </button>

                {isExpanded && node.output && (
                  <div style={{
                    borderTop: '0.5px solid var(--border)',
                    padding: '14px 16px',
                    fontSize: 12,
                    lineHeight: 1.75,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--fg)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 400,
                    overflowY: 'auto',
                    background: 'var(--bg)',
                  }}>
                    {node.output}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <div>
          <div style={{
            padding: '20px 24px',
            borderRadius: 12,
            border: '0.5px solid var(--border)',
            background: 'var(--surface)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 16 }}>
              ✓ Workflow complete
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--fg)' }}>{nodes.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agents</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--fg)' }}>{artifacts.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--fg)' }}>{totalWords.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Words</div>
              </div>
            </div>

            {artifacts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Files produced
                </div>
                {artifacts.map(a => (
                  <div key={a.id} style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)', padding: '2px 0' }}>
                    {a.filename}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                What was built
              </div>
              {nodes.filter(n => n.status === 'done').map(node => (
                <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, color: 'var(--fg)' }}>
                  <span style={{ color: '#1D9E75', fontSize: 11 }}>✓</span>
                  <span style={{
                    padding: '0px 6px',
                    borderRadius: 20,
                    border: `0.5px solid ${node.skillColor.border}`,
                    background: node.skillColor.bg,
                    color: node.skillColor.text,
                    fontSize: 10,
                    fontWeight: 500,
                  }}>{node.skill}</span>
                  <span>{node.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <button className="btn-secondary" onClick={onReset}>Start over</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Powered by Agentis + Claude API</span>
      </div>
    </div>
  )
}
