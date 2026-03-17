import { useState } from 'react'

export type PluginId = 'web' | 'claude-code' | 'vscode' | 'cursor' | 'api'

interface Plugin {
  id: PluginId
  icon: string
  label: string
  description: string
  tags: string[]
  available: boolean
  setupSteps?: string[]
  installCmd?: string
}

const PLUGINS: Plugin[] = [
  {
    id: 'web',
    icon: '⬡',
    label: 'Agentis Web',
    description: 'Run multi-agent workflows directly in your browser. Stream output live, browse artifacts, and download files.',
    tags: ['Templates', 'Live streaming', 'Artifact viewer'],
    available: true,
  },
  {
    id: 'claude-code',
    icon: '◈',
    label: 'Claude Code',
    description: 'Export any workflow as a job bundle. Claude Code reads the plan, places the files, runs tests, and opens a PR.',
    tags: ['Export to zip', 'CLAUDE.md', 'Auto PR'],
    available: true,
    installCmd: 'bash agentis-job/execute.sh',
    setupSteps: [
      'Complete a workflow in Agentis Web',
      'Click "Export to Claude Code" on the output screen',
      'Unzip the download into your project root',
      'Run the execute script — Claude Code handles the rest',
    ],
  },
  {
    id: 'vscode',
    icon: '◧',
    label: 'VS Code',
    description: 'Run Agentis workflows from the command palette. Results appear inline in your editor.',
    tags: ['Extension', 'Command palette', 'Inline output'],
    available: false,
  },
  {
    id: 'cursor',
    icon: '⌥',
    label: 'Cursor',
    description: "Trigger full multi-agent pipelines from Cursor's AI panel. Works with your existing codebase context.",
    tags: ['AI panel', 'Codebase aware', 'Auto-apply'],
    available: false,
  },
  {
    id: 'api',
    icon: '⟨⟩',
    label: 'REST API / SDK',
    description: 'Embed Agentis workflows into your own apps. Trigger pipelines, stream results, and receive structured artifacts.',
    tags: ['TypeScript SDK', 'Webhooks', 'Streaming'],
    available: false,
  },
]

interface Props {
  onContinue: (plugin: PluginId) => void
}

export function PluginScreen({ onContinue }: Props) {
  const [selected, setSelected] = useState<PluginId | null>(null)
  const selectedPlugin = PLUGINS.find(p => p.id === selected)

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Where will you use Agentis?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px' }}>
        Pick your integration. You can always switch later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10, marginBottom: 20 }}>
        {PLUGINS.map(plugin => {
          const isSelected = selected === plugin.id
          return (
            <button
              key={plugin.id}
              onClick={() => plugin.available && setSelected(plugin.id)}
              disabled={!plugin.available}
              style={{
                padding: '16px',
                borderRadius: 12,
                border: isSelected
                  ? '1.5px solid var(--fg)'
                  : '0.5px solid var(--border)',
                background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                cursor: plugin.available ? 'pointer' : 'default',
                textAlign: 'left',
                transition: 'all 0.15s',
                opacity: plugin.available ? 1 : 0.45,
                position: 'relative',
              }}
            >
              {!plugin.available && (
                <span style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  padding: '2px 6px',
                  borderRadius: 6,
                }}>
                  Soon
                </span>
              )}

              <div style={{ fontSize: 22, marginBottom: 10, color: isSelected ? 'var(--fg)' : 'var(--muted)' }}>
                {plugin.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>
                {plugin.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
                {plugin.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {plugin.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '2px 7px',
                      borderRadius: 20,
                      background: isSelected ? 'var(--bg)' : 'var(--bg)',
                      border: '0.5px solid var(--border)',
                      color: 'var(--muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Claude Code setup callout */}
      {selected === 'claude-code' && selectedPlugin?.setupSteps && (
        <div style={{
          padding: '16px 18px',
          borderRadius: 12,
          border: '0.5px solid #0F6E56',
          background: '#E1F5EE',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#085041', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            How it works
          </div>
          <ol style={{ paddingLeft: 16, margin: 0 }}>
            {selectedPlugin.setupSteps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: '#0F6E56', lineHeight: 1.7, marginBottom: 2 }}>
                {step}
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.6)', border: '0.5px solid #8ECFBE', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#085041' }}>
            {selectedPlugin.installCmd}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {selected ? `Using ${selectedPlugin?.label}` : 'Select an integration to continue'}
        </span>
        <button
          className="btn-primary"
          disabled={!selected}
          onClick={() => selected && onContinue(selected)}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
