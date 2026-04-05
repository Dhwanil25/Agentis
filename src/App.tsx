import { useState, useEffect, useRef } from 'react'
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
import { DocsPage } from '@/components/pages/DocsPage'
import { addHistoryEntry } from '@/components/DashboardScreen'
import { isPinSet, isLocked, verifyPin, unlock, updateActivity, checkInactivityLock, getLockSettings } from '@/lib/pinLock'
import { useDiscordListener } from '@/hooks/useDiscordListener'

type Page =
  | 'chat' | 'overview' | 'analytics' | 'logs' | 'sessions'
  | 'approvals' | 'comms' | 'workflows' | 'scheduler'
  | 'channels' | 'skills' | 'hands' | 'universe' | 'settings' | 'docs'

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    return import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem('agentis_apikey') || ''
  })
  const [keyInput, setKeyInput] = useState('')
  const [keySet, setKeySet] = useState(() => {
    return !!(import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem('agentis_apikey'))
  })
  const [page, setPage] = useState<Page>('overview')
  const [universeInitialRoles, setUniverseInitialRoles] = useState<import('@/lib/multiAgentEngine').AgentRole[] | undefined>(undefined)
  const [universeAutoStart, setUniverseAutoStart] = useState<string | undefined>(undefined)
  const [universeOnComplete, setUniverseOnComplete] = useState<((output: string) => void) | undefined>(undefined)
  const [universeFollowUp, setUniverseFollowUp] = useState<string | undefined>(undefined)
  const [universeOnFollowUpComplete, setUniverseOnFollowUpComplete] = useState<((output: string) => void) | undefined>(undefined)
  const [engineRunning, setEngineRunning] = useState(false)

  // ── PIN lock ───────────────────────────────────────────────────────────────
  const [locked, setLocked] = useState(() => isPinSet() && getLockSettings().enabled)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const inactivityRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const onActivity = () => updateActivity()
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    inactivityRef.current = setInterval(() => {
      if (checkInactivityLock()) setLocked(true)
    }, 30_000)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      if (inactivityRef.current) clearInterval(inactivityRef.current)
    }
  }, [])

  // Re-sync locked state when PIN settings change (e.g. PIN just set)
  useEffect(() => {
    const handler = () => setLocked(isLocked())
    window.addEventListener('agentis_lock_update', handler)
    return () => window.removeEventListener('agentis_lock_update', handler)
  }, [])

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

  const navigate = (p: string, opts?: {
    initialRoles?: import('@/lib/multiAgentEngine').AgentRole[]
    autoStart?: string
    onComplete?: (output: string) => void
    followUp?: string
    onFollowUpComplete?: (output: string) => void
  }) => {
    if (p === 'universe') {
      setUniverseInitialRoles(opts?.initialRoles)
      if (opts?.autoStart !== undefined) setUniverseAutoStart(opts.autoStart)
      if (opts?.onComplete !== undefined) setUniverseOnComplete(() => opts.onComplete!)
      if (opts?.followUp !== undefined) setUniverseFollowUp(opts.followUp)
      if (opts?.onFollowUpComplete !== undefined) setUniverseOnFollowUpComplete(() => opts.onFollowUpComplete!)
    } else if (opts?.initialRoles !== undefined) {
      setUniverseInitialRoles(opts.initialRoles)
    }
    setPage(p as Page)
    // Reset chat state when navigating away from chat
    if (p !== 'chat') reset()
  }

  const discordListener = useDiscordListener({ navigate })

  // ── PIN lock screen ────────────────────────────────────────────────────────────
  if (locked) {
    return (
      <div className="shell-center">
        <div style={{ width: '100%', maxWidth: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <img src="/favicon.png" alt="Agentis" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>AGENTIS</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Locked</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔒</div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Enter your PIN to unlock</div>

          <input
            type="password"
            placeholder="PIN"
            value={pinInput}
            autoFocus
            onChange={e => { setPinInput(e.target.value); setPinError('') }}
            onKeyDown={async e => {
              if (e.key !== 'Enter' || !pinInput) return
              const ok = await verifyPin(pinInput)
              if (ok) { unlock(); setLocked(false); setPinInput('') }
              else { setPinError('Incorrect PIN'); setPinInput('') }
            }}
            style={{ width: '100%', marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.3em', textAlign: 'center' }}
          />

          {pinError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8, textAlign: 'center' }}>{pinError}</div>}

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: 14 }}
            onClick={async () => {
              if (!pinInput) return
              const ok = await verifyPin(pinInput)
              if (ok) { unlock(); setLocked(false); setPinInput('') }
              else { setPinError('Incorrect PIN'); setPinInput('') }
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    )
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
            <span className="badge badge-orange" style={{ marginLeft: 'auto' }}>v0.3</span>
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
                localStorage.setItem('agentis_apikey', keyInput)
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
            onClick={() => { localStorage.setItem('agentis_apikey', keyInput); setApiKey(keyInput); setKeySet(true) }}
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

        {/* Always mounted so scheduled jobs fire even when not on this page */}
        <div style={{ display: page === 'scheduler' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
          <SchedulerPage
            execute={execute}
            navigate={navigate}
            reset={reset}
            agentRunning={agentState.loading}
          />
        </div>

        {page === 'channels' && <ChannelsPage discordListening={discordListener.active} discordProcessed={discordListener.processed} />}

        {page === 'skills' && <SkillsPage navigate={navigate} apiKey={apiKey} />}

        {/* Always mounted so running tasks survive navigation */}
        <div style={{ display: page === 'hands' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
          <HandsPage apiKey={apiKey} />
        </div>

        {page === 'universe' && (
          <UniversePage
            apiKey={apiKey}
            initialRoles={universeInitialRoles}
            autoStart={universeAutoStart}
            onComplete={universeOnComplete}
            onConsumedAutoStart={() => setUniverseAutoStart(undefined)}
            discordFollowUp={universeFollowUp}
            onFollowUpComplete={universeOnFollowUpComplete}
            onConsumedFollowUp={() => setUniverseFollowUp(undefined)}
          />
        )}

        {page === 'settings' && (
          <SettingsPage
            apiKey={apiKey}
            onApiKeyChange={key => {
              if (key) localStorage.setItem('agentis_apikey', key)
              else localStorage.removeItem('agentis_apikey')
              setApiKey(key)
              if (key.startsWith('sk-') && !keySet) setKeySet(true)
            }}
          />
        )}

        {page === 'docs' && <DocsPage />}
      </div>
    </div>
  )
}
