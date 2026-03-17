import { useState } from 'react'
import type { Artifact, ArtifactType } from '@/types/artifacts'
import { copyToClipboard } from '@/lib/download'

const TYPE_ICONS: Record<ArtifactType, string> = {
  'code-file':    '📄',
  'file-tree':    '🗂️',
  'openapi-spec': '🌐',
  'markdown-doc': '📋',
  'config-file':  '⚙️',
  'test-suite':   '🧪',
  'dockerfile':   '🐳',
  'diagram':      '📊',
}

interface Props {
  artifacts: Artifact[]
  onDownloadAll: () => void
}

function getDir(filename: string): string {
  const parts = filename.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
}

export function ArtifactViewer({ artifacts, onDownloadAll }: Props) {
  const [selectedId, setSelectedId] = useState<string>(artifacts[0]?.id ?? '')
  const [copied, setCopied] = useState(false)

  const selected = artifacts.find(a => a.id === selectedId)

  // Group by directory
  const groups = new Map<string, Artifact[]>()
  for (const artifact of artifacts) {
    const dir = getDir(artifact.filename)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir)!.push(artifact)
  }

  if (artifacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 14 }}>No files extracted yet.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>View the full agent output in the Trace tab.</div>
      </div>
    )
  }

  const handleCopy = async () => {
    if (!selected) return
    await copyToClipboard(selected.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {artifacts.length} file{artifacts.length !== 1 ? 's' : ''} extracted
        </span>
        <button
          className="btn-secondary"
          onClick={onDownloadAll}
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          ↓ Download all files
        </button>
      </div>

      <div className="artifact-layout">
        {/* File tree */}
        <div className="artifact-tree">
          {Array.from(groups.entries()).map(([dir, files]) => (
            <div key={dir} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 8px',
                marginBottom: 4,
              }}>
                {dir}
              </div>
              {files.map(artifact => {
                const filename = artifact.filename.split('/').pop() ?? artifact.filename
                return (
                  <div
                    key={artifact.id}
                    onClick={() => setSelectedId(artifact.id)}
                    className={`artifact-tree-item${selectedId === artifact.id ? ' selected' : ''}`}
                  >
                    <span style={{ flexShrink: 0 }}>{TYPE_ICONS[artifact.type] ?? '📄'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {filename}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Content viewer */}
        <div>
          {selected ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                    {selected.filename}
                  </span>
                  {selected.language && (
                    <span style={{
                      fontSize: 10,
                      padding: '1px 7px',
                      borderRadius: 20,
                      background: 'var(--surface-2)',
                      border: '0.5px solid var(--border)',
                      color: 'var(--muted)',
                    }}>
                      {selected.language}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '0.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: copied ? '#1D9E75' : 'var(--muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'color 0.15s',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                padding: '16px 18px',
                fontSize: 12,
                lineHeight: 1.75,
                fontFamily: 'var(--font-mono)',
                color: 'var(--fg)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 440,
                overflowY: 'auto',
              }}>
                {selected.content}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
              Select a file to view its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
