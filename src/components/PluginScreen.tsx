import { useState, useEffect } from 'react'

export type PluginId = 'web' | 'claude-code' | 'vscode' | 'cursor' | 'api' | 'openfang'

interface Plugin {
  id: PluginId
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
    label: 'Agentis Web',
    description: 'Run multi-agent workflows directly in your browser. Stream output live, browse artifacts, and download files.',
    tags: ['Templates', 'Live streaming', 'Artifact viewer'],
    available: true,
  },
  {
    id: 'claude-code',
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
    id: 'openfang',
    label: 'Agentis Engine',
    description: 'Route tasks through the local Agentis Engine daemon for autonomous execution with full tool access and memory.',
    tags: ['Autonomous', 'Tool use', 'Memory'],
    available: true,
    setupSteps: [
      'Engine binary is auto-managed — no manual setup required',
      'Enter your Anthropic API key to start the engine automatically',
      'Send any task — the engine uses web search, file ops, and more',
      'Monitor live activity in the Agentis dashboard',
    ],
  },
  {
    id: 'vscode',
    label: 'VS Code',
    description: 'Run Agentis workflows from the command palette. Results appear inline in your editor.',
    tags: ['Extension', 'Command palette', 'Inline output'],
    available: false,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    description: "Trigger full multi-agent pipelines from Cursor's AI panel. Works with your existing codebase context.",
    tags: ['AI panel', 'Codebase aware', 'Auto-apply'],
    available: false,
  },
  {
    id: 'api',
    label: 'REST API / SDK',
    description: 'Embed Agentis workflows into your own apps. Trigger pipelines, stream results, and receive structured artifacts.',
    tags: ['TypeScript SDK', 'Webhooks', 'Streaming'],
    available: false,
  },
]

interface Props {
  apiKey?: string
  onContinue: (plugin: PluginId, openfangUrl?: string) => void
}

export function PluginScreen({ apiKey, onContinue }: Props) {
  const [selected, setSelected]   = useState<PluginId | null>(null)
  const [openfangUrl]             = useState('http://localhost:4200')
  const [daemonState, setDaemonState] = useState<{
    state: string
    message: string
    binPath?: string
  }>({ state: 'unknown', message: 'Checking engine...' })
  const [keySent, setKeySent]     = useState(false)
  const selectedPlugin            = PLUGINS.find(p => p.id === selected)

  // Poll engine status via Vite middleware (no separate port needed)
  useEffect(() => {
    if (selected !== 'openfang') return
    let active = true

    const poll = async () => {
      try {
        const res = await fetch('/agentis/status', { signal: AbortSignal.timeout(2000) })
        if (res.ok && active) {
          const data = await res.json() as { state: string; message: string; binPath?: string }
          setDaemonState(data)
        }
      } catch {
        if (active) setDaemonState({ state: 'error', message: 'Engine not reachable. Is the dev server running?' })
      }
    }

    poll()
    const id = setInterval(poll, 2000)
    return () => { active = false; clearInterval(id) }
  }, [selected])

  // Auto-send API key when engine needs it
  useEffect(() => {
    if (daemonState.state !== 'needs_api_key') return
    if (!apiKey?.startsWith('sk-') || keySent) return
    setKeySent(true)
    fetch('/agentis/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }).catch(() => setKeySent(false))
  }, [daemonState.state, apiKey, keySent])

  const isReady        = daemonState.state === 'running'
  const isNotInstalled = daemonState.state === 'not_installed'
  const needsKey       = daemonState.state === 'needs_api_key'

  const stateColor =
    isReady        ? '#1D9E75' :
    isNotInstalled ? '#CA8A04' :
    daemonState.state === 'error' ? '#E24B4A' : '#F59E0B'

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Where will you use Agentis?
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px' }}>
        Pick your integration. You can switch later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10, marginBottom: 20 }}>
        {PLUGINS.map(plugin => {
          const isSelected  = selected === plugin.id
          const isEngine    = plugin.id === 'openfang'
          const accentColor = isEngine ? '#1D9E75' : 'var(--fg)'
          return (
            <button
              key={plugin.id}
              onClick={() => plugin.available && setSelected(plugin.id)}
              disabled={!plugin.available}
              style={{
                padding: 16,
                borderRadius: 12,
                border: isSelected
                  ? `1.5px solid ${accentColor}`
                  : '0.5px solid var(--border)',
                background: isSelected
                  ? isEngine ? 'rgba(29,158,117,0.08)' : 'var(--surface-2, rgba(255,255,255,0.06))'
                  : 'var(--surface)',
                cursor: plugin.available ? 'pointer' : 'default',
                textAlign: 'left',
                transition: 'all 0.12s',
                opacity: plugin.available ? 1 : 0.4,
                position: 'relative',
              }}
            >
              {!plugin.available && (
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--muted)', background: 'var(--bg)',
                  border: '0.5px solid var(--border)', padding: '2px 6px', borderRadius: 6,
                }}>
                  Soon
                </span>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                {plugin.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
                {plugin.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {plugin.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                    background: 'var(--bg)',
                    border: `0.5px solid ${isSelected && isEngine ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
                    color: isSelected && isEngine ? '#1D9E75' : 'var(--muted)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Claude Code callout */}
      {selected === 'claude-code' && selectedPlugin?.setupSteps && (
        <div style={{ padding: '16px 18px', borderRadius: 12, border: '0.5px solid #0F6E56', background: 'rgba(29,158,117,0.06)', marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', marginBottom: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            How it works
          </div>
          <ol style={{ paddingLeft: 16, margin: 0 }}>
            {selectedPlugin.setupSteps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.7, marginBottom: 2, opacity: 0.85 }}>
                {step}
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(29,158,117,0.3)', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#1D9E75' }}>
            {selectedPlugin.installCmd}
          </div>
        </div>
      )}

      {/* Agentis Engine callout */}
      {selected === 'openfang' && (
        <div style={{
          padding: '16px 18px', borderRadius: 12, marginBottom: 20,
          border: `0.5px solid ${isReady ? 'rgba(29,158,117,0.5)' : 'rgba(29,158,117,0.25)'}`,
          background: 'rgba(29,158,117,0.05)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Agentis Engine
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 8,
            background: 'rgba(0,0,0,0.15)',
            border: `0.5px solid ${isReady ? 'rgba(29,158,117,0.35)' : 'rgba(255,255,255,0.08)'}`,
            marginBottom: 14,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: stateColor,
              display: 'inline-block', flexShrink: 0, marginTop: 4,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: isReady ? '#1D9E75' : 'var(--fg)' }}>
                {isReady      ? 'Engine running — ready' :
                 isNotInstalled ? 'Engine binary not found' :
                 needsKey     ? 'Starting engine with your API key...' :
                 daemonState.state === 'error' ? 'Engine error' :
                 daemonState.state.charAt(0).toUpperCase() + daemonState.state.slice(1).replace(/_/g, ' ')}
              </div>
              {isNotInstalled ? (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.6 }}>
                    Build the engine binary from source once — Agentis manages it automatically after that.
                  </p>
                  <pre style={{ margin: 0, padding: '8px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.25)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)', lineHeight: 1.8, overflowX: 'auto' }}>
{`git clone https://github.com/RightNow-AI/openfang
cd openfang && cargo build --release
cp target/release/openfang ${daemonState.binPath ?? './bin/openfang'}`}
                  </pre>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Restart the dev server after placing the binary.
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
                  {daemonState.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {selected === 'openfang' && needsKey
            ? 'Starting engine with your API key...'
            : selected === 'openfang' && !isReady
            ? 'Waiting for engine...'
            : selected
            ? `Using ${selectedPlugin?.label}`
            : 'Select an integration to continue'}
        </span>
        <button
          className="btn-primary"
          disabled={!selected || (selected === 'openfang' && !isReady)}
          onClick={() => selected && onContinue(selected, selected === 'openfang' ? openfangUrl : undefined)}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
