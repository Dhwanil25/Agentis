import { useState, useEffect } from 'react'
import { useAgent } from '@/hooks/useAgent'
import { Sidebar } from '@/components/Sidebar'
import { ChatPage } from '@/components/pages/ChatPage'
import { OverviewPage } from '@/components/pages/OverviewPage'
import { AnalyticsPage } from '@/components/pages/AnalyticsPage'
import { LogsPage } from '@/components/pages/LogsPage'
import { SessionsPage } from '@/components/pages/SessionsPage'
import { ApprovalsPage } from '@/components/pages/ApprovalsPage'
import { CommsPage } from '@/components/pages/CommsPage'
import { WorkflowsPage } from '@/components/pages/WorkflowsPage'
import { SchedulerPage } from '@/components/pages/SchedulerPage'
import { ChannelsPage } from '@/components/pages/ChannelsPage'
import { SkillsPage } from '@/components/pages/SkillsPage'
import { HandsPage } from '@/components/pages/HandsPage'
import { UniversePage } from '@/components/pages/UniversePage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { addHistoryEntry } from '@/components/DashboardScreen'

type Page =
  | 'chat' | 'overview' | 'analytics' | 'logs' | 'sessions'
  | 'approvals' | 'comms' | 'workflows' | 'scheduler'
  | 'channels' | 'skills' | 'hands' | 'universe' | 'settings'

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [keySet, setKeySet] = useState(!!import.meta.env.VITE_ANTHROPIC_API_KEY)
  const [page, setPage] = useState<Page>('overview')
  const [engineRunning, setEngineRunning] = useState(false)

  // Poll engine status
  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis/status', { signal: AbortSignal.timeout(2000) })
        if (res.ok && active) {
          const data = await res.json() as { state: string }
          setEngineRunning(data.state === 'running')
        }
      } catch {
        if (active) setEngineRunning(false)
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => { active = false; clearInterval(id) }
  }, [])

  // Auto-send API key to engine when needed
  useEffect(() => {
    if (!apiKey.startsWith('sk-') || !engineRunning) return
    fetch('/agentis/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }).catch(() => { /* silent */ })
  }, [apiKey, engineRunning])

  const {
    state: agentState,
    execute,
    executeWorkflow,
    executeOnOpenFang,
    reset,
  } = useAgent(apiKey)

  // Record completed tasks to history
  useEffect(() => {
    if (agentState.step !== 'output' || !agentState.persona) return
    addHistoryEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts: Date.now(),
      persona: agentState.persona.id,
      task: agentState.task,
      mode: agentState.mode ?? 'freeform',
      status: agentState.error ? 'error' : 'completed',
    })
  }, [agentState.step]) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (p: string) => {
    setPage(p as Page)
    // Reset chat state when navigating away from chat
    if (p !== 'chat') reset()
  }

  // ── API key gate ──────────────────────────────────────────────────────────────
  if (!keySet) {
    return (
      <div className="shell-center">
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 28,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img
              src="/favicon.png"
              alt="Agentis"
              style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.02em' }}>AGENTIS</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Multi-Agent AI Platform</div>
            </div>
            <span className="badge badge-orange" style={{ marginLeft: 'auto' }}>v0.2</span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Enter your Anthropic API key to get started.{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Get one here
            </a>
          </div>

          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && keyInput.startsWith('sk-')) {
                setApiKey(keyInput)
                setKeySet(true)
              }
            }}
            style={{
              width: '100%',
              marginBottom: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
            }}
          />

          <button
            className="btn-primary"
            disabled={!keyInput.startsWith('sk-')}
            onClick={() => { setApiKey(keyInput); setKeySet(true) }}
            style={{ width: '100%', padding: '10px', fontSize: 14 }}
          >
            Continue
          </button>

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
            Your key is stored in memory only and never sent to any third party.
          </div>
        </div>
      </div>
    )
  }

  // ── Main dashboard layout ─────────────────────────────────────────────────────
  return (
    <div className="shell">
      <Sidebar
        current={page}
        navigate={p => setPage(p as Page)}
        engineRunning={engineRunning}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {page === 'chat' && (
          <ChatPage
            apiKey={apiKey}
            agentState={agentState}
            engineRunning={engineRunning}
            execute={execute}
            executeOnOpenFang={executeOnOpenFang}
            reset={reset}
          />
        )}

        {page === 'overview' && (
          <OverviewPage
            apiKey={apiKey}
            engineRunning={engineRunning}
            navigate={navigate}
            onSaveApiKey={key => setApiKey(key)}
          />
        )}

        {page === 'analytics' && <AnalyticsPage />}

        {page === 'logs' && <LogsPage />}

        {page === 'sessions' && (
          <SessionsPage
            engineRunning={engineRunning}
            navigate={navigate}
          />
        )}

        {page === 'approvals' && <ApprovalsPage />}

        {page === 'comms' && <CommsPage engineRunning={engineRunning} />}

        {page === 'workflows' && (
          <WorkflowsPage
            apiKey={apiKey}
            agentState={agentState}
            executeWorkflow={executeWorkflow}
            reset={reset}
          />
        )}

        {page === 'scheduler' && (
          <SchedulerPage
            execute={execute}
            navigate={navigate}
            reset={reset}
            agentRunning={agentState.loading}
          />
        )}

        {page === 'channels' && <ChannelsPage />}

        {page === 'skills' && <SkillsPage />}

        {page === 'hands' && <HandsPage apiKey={apiKey} />}

        {page === 'universe' && <UniversePage apiKey={apiKey} />}

        {page === 'settings' && (
          <SettingsPage
            apiKey={apiKey}
            onApiKeyChange={key => {
              setApiKey(key)
              if (key.startsWith('sk-') && !keySet) setKeySet(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
