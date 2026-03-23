import { useState, useEffect, useRef } from 'react'
import {
  ROLE_COLORS, INITIAL_MA_STATE, runMultiAgentTask, runFollowUpTask,
  PROVIDER_COLORS, PROVIDER_LABELS, loadAllProviderKeys,
  type MAState, type MAAgent, type ProviderKeys, type LLMProvider,
} from '@/lib/multiAgentEngine'
import { addMemory } from '@/lib/memory'
import { Universe3D } from '@/components/Universe3D'
import { testProviderKey, type TestResult } from '@/lib/testProviderKey'
import { loadSessions, saveSession, deleteSession, type ChatSession } from '@/lib/chatHistory'

interface Props { apiKey: string }

// ── Phase badge ────────────────────────────────────────────────────────────────
const PHASE_META: Record<string, { label: string; color: string }> = {
  idle:        { label: 'Ready',              color: 'var(--muted)' },
  planning:    { label: 'Planning...',        color: '#8b5cf6' },
  executing:   { label: 'Agents working',    color: '#3b82f6' },
  synthesizing:{ label: 'Synthesizing...',   color: '#f97316' },
  done:        { label: 'Complete',           color: '#10b981' },
  error:       { label: 'Error',             color: '#ef4444' },
}

// ── Provider order for the panel ───────────────────────────────────────────────
const PROVIDER_ORDER: LLMProvider[] = [
  'anthropic', 'openai', 'google', 'groq',
  'mistral', 'deepseek', 'openrouter', 'cohere',
  'xai', 'together', 'ollama', 'lmstudio',
]
const PROVIDER_PLACEHOLDERS: Record<LLMProvider, string> = {
  anthropic:  'sk-ant-...',
  openai:     'sk-proj-...',
  google:     'AIzaSy...',
  groq:       'gsk_...',
  mistral:    'key...',
  deepseek:   'sk-...',
  openrouter: 'sk-or-v1-...',
  cohere:     'key...',
  xai:        'xai-...',
  together:   'key...',
  ollama:     'http://localhost:11434',
  lmstudio:   'http://localhost:1234',
}

// Read/write using the same agentis_provider_{id} keys that SettingsPage uses
const SETTINGS_KEY_PREFIX = 'agentis_provider_'
function readSettingsKey(provider: LLMProvider): string {
  return localStorage.getItem(`${SETTINGS_KEY_PREFIX}${provider}`) ?? ''
}
function writeSettingsKey(provider: LLMProvider, value: string) {
  if (value) localStorage.setItem(`${SETTINGS_KEY_PREFIX}${provider}`, value)
  else localStorage.removeItem(`${SETTINGS_KEY_PREFIX}${provider}`)
}

// ── Sessions sidebar ───────────────────────────────────────────────────────────
function SessionsSidebar({
  sessions, activeSessionId, open, onToggle, onLoad, onDelete, onNew,
}: {
  sessions: ChatSession[]
  activeSessionId: string | null
  open: boolean
  onToggle: () => void
  onLoad: (s: ChatSession) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  const fmt = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{
      width: open ? 220 : 36, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar-bg)',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Toggle + header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 8px', gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onToggle}
          title={open ? 'Collapse' : 'Chats'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="1" y="6.25" width="12" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="1" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>
        {open && (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
              Chats
            </span>
            <button
              onClick={onNew}
              title="New chat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Session list */}
      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '20px 12px', fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7, opacity: 0.6 }}>
              No chats yet.<br />Launch a task to start.
            </div>
          ) : sessions.map(s => {
            const isActive = s.id === activeSessionId
            const isHover = s.id === hoverId
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  position: 'relative',
                  borderBottom: '1px solid var(--border)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : isHover ? 'rgba(255,255,255,0.03)' : 'none',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
              >
                <button
                  onClick={() => onLoad(s)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 28px 9px 10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--fg)' : 'rgba(255,255,255,0.7)',
                    lineHeight: 1.4, marginBottom: 3,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>{fmt(s.updatedAt)}</span>
                    <span>·</span>
                    <span>{s.state.agents.length} agents</span>
                    {s.state.phase === 'done' && <span style={{ color: '#10b981' }}>✓</span>}
                    {s.state.phase === 'error' && <span style={{ color: '#ef4444' }}>✕</span>}
                  </div>
                </button>
                {/* Delete button — appears on hover */}
                {isHover && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                    title="Delete chat"
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 4, color: '#ef4444', cursor: 'pointer',
                      padding: '2px 5px', fontSize: 10, lineHeight: 1,
                    }}
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Chat message type ──────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string }

// ── Right panel sub-component ──────────────────────────────────────────────────
interface RightPanelProps {
  phase: string; phaseMeta: { label: string; color: string }
  agents: MAAgent[]; finalOutput: string; errorMsg: string | null
  task: string; setTask: (v: string) => void
  running: boolean; hasAnyKey: boolean
  selectedId: string | null; setSelectedId: (id: string | null) => void
  followUp: string; setFollowUp: (v: string) => void
  savedToMemory: boolean; copiedOutput: boolean
  providerKeys: ProviderKeys; providersOpen: boolean
  setProvidersOpen: (fn: (o: boolean) => boolean) => void
  activeProviders: LLMProvider[]
  messages: ChatMsg[]
  browserEnabled: boolean; onToggleBrowser: () => void
  onLaunch: () => void; onFollowUp: (q: string) => void
  onSaveMemory: () => void; onCopyOutput: () => void
  onExportMd: () => void; onExportTxt: () => void; onDeepDive: () => void
  updateProviderKey: (p: LLMProvider, v: string) => void
  onTestKey: (p: LLMProvider) => void
  testStatus: Partial<Record<LLMProvider, TestResult>>
}

function RightPanel({
  phase, agents, finalOutput, errorMsg,
  task, setTask, running, hasAnyKey,
  selectedId, setSelectedId, followUp, setFollowUp,
  savedToMemory, copiedOutput, providerKeys, providersOpen, setProvidersOpen,
  activeProviders, messages, browserEnabled, onToggleBrowser, onLaunch, onFollowUp, onSaveMemory, onCopyOutput,
  onExportMd, onExportTxt, onDeepDive, updateProviderKey, onTestKey, testStatus,
}: RightPanelProps) {
  const [tab, setTab] = useState<'team' | 'output'>('team')
  const [collapsed, setCollapsed] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const selectedAgent = agents.find(a => a.id === selectedId) as MAAgent | undefined
  const lastMsg = messages[messages.length - 1]
  const outputAlreadyInMessages = lastMsg?.role === 'assistant' && lastMsg.content === finalOutput
  const hasOutput = messages.length > 0 || ((phase === 'synthesizing' || phase === 'done') && !!finalOutput)

  // Auto-switch to output tab when synthesis starts
  useEffect(() => {
    if (phase === 'synthesizing' || phase === 'done') setTab('output')
  }, [phase])

  // Auto-scroll chat to bottom when messages or streaming output changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, finalOutput])

  return (
    <div style={{
      width: collapsed ? 0 : 360,
      minWidth: collapsed ? 0 : 360,
      flexShrink: 0,
      borderLeft: collapsed ? 'none' : '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar-bg)',
      overflow: 'hidden',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      position: 'relative',
    }}>

      {/* ── Collapse toggle ─────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Show panel' : 'Hide panel'}
        style={{
          position: 'absolute', top: '50%', left: collapsed ? 0 : -14,
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 14, height: 40,
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border)',
          borderRight: collapsed ? '1px solid var(--border)' : 'none',
          borderRadius: collapsed ? '6px 0 0 6px' : '6px 0 0 6px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 9,
          padding: 0,
          transition: 'left 0.25s ease',
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* ── Providers bar (always compact) ─────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => setProvidersOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 16px',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Providers
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {activeProviders.map(p => (
                <div key={p} title={PROVIDER_LABELS[p]} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: PROVIDER_COLORS[p],
                  boxShadow: `0 0 5px ${PROVIDER_COLORS[p]}`,
                }} />
              ))}
              {activeProviders.length === 0 && (
                <span style={{ fontSize: 9, color: '#ef4444' }}>No keys set</span>
              )}
            </div>
          </div>
          <svg width="9" height="9" viewBox="0 0 10 10" style={{ color: 'var(--muted)', opacity: 0.4, transform: providersOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {providersOpen && (
          <div style={{ padding: '2px 16px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 10px', marginBottom: 8 }}>
              {PROVIDER_ORDER.map(provider => {
                const val = (providerKeys as Record<string, string>)[provider] ?? ''
                const connected = !!val
                const ts = testStatus[provider] ?? 'idle'
                return (
                  <div key={provider}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: PROVIDER_COLORS[provider],
                        boxShadow: connected ? `0 0 4px ${PROVIDER_COLORS[provider]}` : 'none',
                        opacity: connected ? 1 : 0.35,
                      }} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: connected ? PROVIDER_COLORS[provider] : 'var(--muted)' }}>
                        {PROVIDER_LABELS[provider]}
                      </span>
                      {ts === 'ok'   && <span style={{ fontSize: 8, color: '#10b981', marginLeft: 'auto' }}>✓ Valid</span>}
                      {ts === 'fail' && <span style={{ fontSize: 8, color: '#ef4444', marginLeft: 'auto' }}>✕ Invalid</span>}
                      {ts === 'testing' && <span style={{ fontSize: 8, color: 'var(--muted)', marginLeft: 'auto' }}>testing…</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="password"
                        placeholder={PROVIDER_PLACEHOLDERS[provider]}
                        value={val}
                        onChange={e => updateProviderKey(provider, e.target.value)}
                        style={{ flex: 1, fontSize: 9.5, padding: '3px 6px', fontFamily: 'var(--font-mono)', minWidth: 0 }}
                      />
                      {connected && (
                        <button
                          onClick={() => onTestKey(provider)}
                          disabled={ts === 'testing'}
                          style={{
                            fontSize: 8.5, padding: '2px 6px', flexShrink: 0,
                            background: ts === 'ok' ? '#10b98122' : ts === 'fail' ? '#ef444422' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${ts === 'ok' ? '#10b98155' : ts === 'fail' ? '#ef444455' : 'var(--border)'}`,
                            borderRadius: 5, cursor: ts === 'testing' ? 'default' : 'pointer',
                            color: ts === 'ok' ? '#10b981' : ts === 'fail' ? '#ef4444' : 'var(--muted)',
                            fontWeight: 600, whiteSpace: 'nowrap',
                          }}
                        >
                          {ts === 'testing' ? '…' : 'Test'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.65 }}>
              Synced with Settings · agents auto-distributed
            </div>
          </div>
        )}
      </div>

      {/* ── Task input ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey && task.trim()) onLaunch() }}
          placeholder="Describe a complex task — the team will coordinate to solve it..."
          disabled={running}
          style={{
            width: '100%', minHeight: 72, fontSize: 12, lineHeight: 1.65,
            resize: 'none', marginBottom: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 10px', color: 'var(--fg)',
            outline: 'none',
          }}
        />
        {/* Browser toggle */}
        <button
          onClick={onToggleBrowser}
          disabled={running}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', marginBottom: 8, padding: '7px 10px',
            background: browserEnabled ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${browserEnabled ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
            borderRadius: 7, cursor: running ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <div style={{
            width: 28, height: 16, borderRadius: 8, flexShrink: 0,
            background: browserEnabled ? '#22d3ee' : 'rgba(255,255,255,0.12)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 2, left: browserEnabled ? 14 : 2,
              width: 12, height: 12, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 11, color: browserEnabled ? '#22d3ee' : 'var(--muted)', fontWeight: 600 }}>
            Browser Agent
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
            {browserEnabled ? 'on' : 'off'}
          </span>
        </button>

        <button
          className="btn-primary"
          onClick={() => onLaunch()}
          disabled={!task.trim() || !hasAnyKey || running}
          style={{ width: '100%', fontSize: 13, padding: '9px 0', borderRadius: 8 }}
        >
          {running ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor', opacity: 0.6, animation: 'blink 0.8s step-end infinite' }} />
              Running...
            </span>
          ) : 'Launch Agent Team'}
        </button>
        {!hasAnyKey && (
          <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>⚠</span> Add a provider API key above
          </div>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0,
        padding: '0 4px',
      }}>
        {(['team', 'output'] as const).map(t => {
          const label = t === 'team'
            ? `Team${agents.length > 0 ? ` · ${agents.length}` : ''}`
            : `Output${hasOutput ? ' ✦' : ''}`
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0', fontSize: 11, fontWeight: active ? 700 : 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--fg)' : 'var(--muted)',
                borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                transition: 'color 0.1s, border-color 0.1s',
                letterSpacing: '0.02em',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Team tab ───────────────────────────────────────────────────── */}
      {tab === 'team' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Selected agent detail (inline card) */}
          {selectedAgent && (
            <div style={{
              margin: '12px 14px 0',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${ROLE_COLORS[selectedAgent.role]}33`,
              borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            }}>
              {/* Card header */}
              <div style={{
                padding: '10px 12px',
                borderBottom: selectedAgent.output ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  background: ROLE_COLORS[selectedAgent.role],
                  boxShadow: `0 0 8px ${ROLE_COLORS[selectedAgent.role]}`,
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{selectedAgent.name}</span>
                {selectedAgent.provider && (
                  <span style={{
                    fontSize: 8.5, padding: '2px 6px', borderRadius: 6,
                    background: PROVIDER_COLORS[selectedAgent.provider] + '22',
                    border: `1px solid ${PROVIDER_COLORS[selectedAgent.provider]}44`,
                    color: PROVIDER_COLORS[selectedAgent.provider], fontWeight: 700,
                  }}>
                    {PROVIDER_LABELS[selectedAgent.provider]}
                    {selectedAgent.modelLabel ? ` · ${selectedAgent.modelLabel}` : ''}
                  </span>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                >×</button>
              </div>
              {/* Task */}
              <div style={{ padding: '8px 12px 4px' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Task</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{selectedAgent.task}</div>
              </div>
              {/* Output */}
              {selectedAgent.output && (
                <div style={{ padding: '6px 12px 10px', maxHeight: 180, overflowY: 'auto' }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Output</div>
                  <div style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                    {selectedAgent.output}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Agent list */}
          <div style={{ flex: 1, padding: '10px 0 4px' }}>
            {agents.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, opacity: 0.1, marginBottom: 10 }}>◎</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                  No agents deployed yet.<br />Launch a task to spawn the team.
                </div>
              </div>
            ) : agents.map(ag => {
              const color = ROLE_COLORS[ag.role] ?? '#888'
              const isActive = ag.status === 'thinking' || ag.status === 'working'
              const isDone = ag.status === 'done'
              const isErr = ag.status === 'error'
              const isRecalled = ag.status === 'recalled'
              const isSel = ag.id === selectedId
              const statusColor = isDone ? '#10b981' : isErr ? '#ef4444' : isRecalled ? '#a855f7' : isActive ? color : 'var(--muted)'

              const maAg = ag as MAAgent
              return (
                <button
                  key={ag.id}
                  onClick={() => setSelectedId(selectedId === ag.id ? null : ag.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left',
                    padding: '9px 16px',
                    background: isSel ? 'rgba(255,255,255,0.05)' : 'none',
                    border: 'none',
                    borderLeft: `2px solid ${isSel ? color : isActive ? color : 'transparent'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: isErr ? '#ef4444' : color,
                    boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                    opacity: isDone ? 0.9 : isActive ? 1 : 0.5,
                  }} />
                  {/* Name + model row */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ag.name}
                      </span>
                      <span style={{ fontSize: 9, color, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                        {ag.role}
                      </span>
                    </div>
                    {maAg.provider && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 9.5, color: PROVIDER_COLORS[maAg.provider], fontWeight: 600, flexShrink: 0 }}>
                          {PROVIDER_LABELS[maAg.provider]}
                        </span>
                        {maAg.modelLabel && (
                          <span style={{ fontSize: 9.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            · {maAg.modelLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Status label */}
                  <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: statusColor, flexShrink: 0 }}>
                    {isRecalled ? '⟳' : isDone ? '✓' : isErr ? '✕' : isActive ? '…' : '—'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Error */}
          {phase === 'error' && errorMsg && (
            <div style={{ margin: '8px 14px 14px', padding: '10px 12px', borderRadius: 8, background: '#ef444415', border: '1px solid #ef444430', fontSize: 11, color: '#ef4444', lineHeight: 1.6, flexShrink: 0 }}>
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* ── Output tab ─────────────────────────────────────────────────── */}
      {tab === 'output' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {(phase === 'planning' || phase === 'executing') && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6', marginBottom: 10 }}>
                {phase === 'planning' ? 'Planning team...' : 'Agents working'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {agents.filter(a => a.id !== 'orchestrator').length === 0 ? (
                  // Planning phase — no workers yet, show orchestrator thinking
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: '#8b5cf6',
                      boxShadow: '0 0 8px #8b5cf6',
                      animation: 'blink 0.8s step-end infinite',
                    }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Orchestrator is planning the team...</span>
                  </div>
                ) : (
                  agents.filter(a => a.id !== 'orchestrator').map(ag => {
                    const color = ROLE_COLORS[ag.role] ?? '#888'
                    const isActive = ag.status === 'thinking' || ag.status === 'working'
                    const isDone = ag.status === 'done'
                    const statusText = isDone ? 'done' : isActive ? 'working...' : 'queued'
                    return (
                      <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                          background: isDone ? '#10b981' : isActive ? color : 'var(--muted)',
                          boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                          opacity: isDone ? 0.7 : 1,
                          animation: isActive ? 'blink 0.8s step-end infinite' : 'none',
                        }} />
                        <span style={{ fontSize: 11, color: isActive ? 'var(--fg)' : 'var(--muted)', flex: 1 }}>
                          {ag.name}
                          <span style={{ color: 'var(--muted)', marginLeft: 4, fontSize: 10 }}>·</span>
                          <span style={{ color: isActive ? color : 'var(--muted)', marginLeft: 4, fontSize: 10 }}>{ag.role}</span>
                        </span>
                        <span style={{ fontSize: 9.5, color: isDone ? '#10b981' : isActive ? color : 'var(--muted)', fontWeight: 600 }}>
                          {isDone ? '✓' : isActive ? '●' : '○'} {statusText}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {!hasOutput && phase !== 'planning' && phase !== 'executing' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: 0.1, marginBottom: 10 }}>✦</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                Output will appear here<br />once the agents finish.
              </div>
            </div>
          ) : hasOutput ? (
            <>
              {/* Output header */}
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase === 'done' ? '#10b981' : '#f97316' }}>
                  {phase === 'done' ? `✦ ${messages.length > 1 ? `Chat · ${Math.ceil(messages.length / 2)} exchanges` : 'Synthesis'}` : 'Synthesizing...'}
                </span>
                {phase === 'done' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-ghost" onClick={onCopyOutput} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {copiedOutput ? '✓' : 'Copy'}
                    </button>
                    <button className="btn-ghost" title="Export Markdown" onClick={onExportMd} style={{ fontSize: 10, padding: '2px 8px' }}>↓ MD</button>
                    <button className="btn-ghost" title="Export Text" onClick={onExportTxt} style={{ fontSize: 10, padding: '2px 8px' }}>↓ TXT</button>
                  </div>
                )}
              </div>

              {/* Chat history + live output */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'user' ? (
                      <div style={{
                        background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '10px 10px 2px 10px', padding: '8px 11px',
                        maxWidth: '88%', fontSize: 12, color: 'var(--fg)', lineHeight: 1.6,
                      }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                        borderRadius: '10px 10px 10px 2px', padding: '10px 12px',
                        width: '100%', fontSize: 12, color: 'var(--fg)', lineHeight: 1.75,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}

                {/* Live streaming output + done state before effect fires */}
                {finalOutput && !outputAlreadyInMessages && (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                    borderRadius: '10px 10px 10px 2px', padding: '10px 12px',
                    width: '100%', fontSize: 12, color: 'var(--fg)', lineHeight: 1.75,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {finalOutput}
                    {phase === 'synthesizing' && <span style={{ opacity: 0.5, animation: 'blink 0.8s step-end infinite' }}>▊</span>}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Follow-up + actions */}
              {phase === 'done' && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Follow-up input */}
                  <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
                    <input
                      placeholder="Ask a follow-up..."
                      value={followUp}
                      onChange={e => setFollowUp(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && followUp.trim() && !running) {
                          const q = followUp.trim(); setFollowUp(''); onFollowUp(q)
                        }
                      }}
                      style={{ flex: 1, fontSize: 12, padding: '7px 10px', borderRadius: 7 }}
                    />
                    <button
                      className="btn-primary"
                      disabled={!followUp.trim() || running}
                      onClick={() => { const q = followUp.trim(); setFollowUp(''); onFollowUp(q) }}
                      style={{ fontSize: 11, padding: '7px 12px', whiteSpace: 'nowrap', borderRadius: 7 }}
                    >Ask</button>
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" onClick={onSaveMemory} disabled={savedToMemory}
                      style={{ flex: 1, fontSize: 10, padding: '5px 0' }}>
                      {savedToMemory ? '✓ Saved' : '⊞ Memory'}
                    </button>
                    <button className="btn-ghost" onClick={onDeepDive} disabled={running}
                      style={{ flex: 1, fontSize: 10, padding: '5px 0' }}>
                      ⟳ Deep Dive
                    </button>
                    <button className="btn-ghost" onClick={() => setTab('team')}
                      style={{ flex: 1, fontSize: 10, padding: '5px 0' }}>
                      ← Team
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function UniversePage({ apiKey }: Props) {
  const [maState, setMaState] = useState<MAState>(INITIAL_MA_STATE)
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState('')
  const [savedToMemory, setSavedToMemory] = useState(false)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [providerKeys, setProviderKeys] = useState<ProviderKeys>(() => loadAllProviderKeys())
  const [providersOpen, setProvidersOpen] = useState(false)
  const [testStatus, setTestStatus] = useState<Partial<Record<LLMProvider, TestResult>>>({})
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [browserEnabled, setBrowserEnabled] = useState(false)


  // Sync apiKey prop → Settings localStorage if not already set
  useEffect(() => {
    if (apiKey && !readSettingsKey('anthropic')) {
      writeSettingsKey('anthropic', apiKey)
      setProviderKeys(loadAllProviderKeys())
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read from Settings whenever the panel is opened (in case user updated Settings)
  useEffect(() => {
    if (providersOpen) setProviderKeys(loadAllProviderKeys())
  }, [providersOpen])

  const updateProviderKey = (provider: LLMProvider, value: string) => {
    writeSettingsKey(provider, value)
    setProviderKeys(loadAllProviderKeys())
    // Reset test result when key changes
    setTestStatus(prev => { const next = { ...prev }; delete next[provider]; return next })
  }

  const handleTestKey = async (provider: LLMProvider) => {
    const key = (providerKeys as Record<string, string>)[provider] ?? ''
    if (!key) return
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }))
    const result = await testProviderKey(provider, key)
    setTestStatus(prev => ({ ...prev, [provider]: result }))
  }

  const hasAnyKey = Object.values(providerKeys).some(v => !!v)

  // Keep a ref to the active session id so the effect below can read it without stale closure
  const activeSessionIdRef = useRef<string | null>(null)
  activeSessionIdRef.current = activeSessionId

  // Keep a ref to the current task text for the same reason
  const taskRef = useRef(task)
  taskRef.current = task

  // Captures the final output INSIDE the setMaState functional update (guaranteed fresh, no stale closure)
  const pendingOutputRef = useRef('')

  // Wraps the engine's update callback: intercepts the state transition to 'done'
  // and stores finalOutput in the ref so the effect below can reliably read it.
  const trackState = (fn: (prev: MAState) => MAState) => {
    setMaState(prev => {
      const next = fn(prev)
      if (next.phase === 'done' && prev.phase !== 'done' && next.finalOutput) {
        pendingOutputRef.current = next.finalOutput
      }
      return next
    })
  }

  // Auto-save whenever a task finishes (done or error)
  useEffect(() => {
    if (maState.phase !== 'done' && maState.phase !== 'error') return
    const sid = activeSessionIdRef.current
    if (!sid) return
    saveSession(taskRef.current, maState, sid)
    setSessions(loadSessions())
  }, [maState.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Push assistant message to chat history when synthesis completes.
  // Reads from pendingOutputRef (set synchronously inside trackState) instead of
  // maState.finalOutput to avoid stale closure issues.
  useEffect(() => {
    if (maState.phase !== 'done') return
    const output = pendingOutputRef.current
    if (!output) return
    pendingOutputRef.current = ''
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant' && last.content === output) return prev
      return [...prev, { role: 'assistant', content: output }]
    })
  }, [maState.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLaunch = async (overrideTask?: string) => {
    const taskToRun = overrideTask ?? task
    if (!taskToRun.trim() || !hasAnyKey || running) return
    setRunning(true)
    setSelectedId(null)
    setSavedToMemory(false)
    setMessages([]) // fresh conversation for new task
    pendingOutputRef.current = ''
    // Create the session row immediately so it appears in the sidebar right away
    const session = saveSession(taskToRun.trim(), { ...INITIAL_MA_STATE, phase: 'planning' })
    setActiveSessionId(session.id)
    setSessions(loadSessions())
    try {
      await runMultiAgentTask(taskToRun.trim(), providerKeys, { w: 800, h: 600 }, trackState, browserEnabled)
    } finally {
      setRunning(false)
    }
  }

  const handleFollowUp = async (question: string) => {
    if (!question.trim() || !hasAnyKey || running) return
    // Push user question immediately so it shows in chat right away
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setRunning(true)
    setSavedToMemory(false)
    try {
      await runFollowUpTask(question.trim(), maState, providerKeys, { w: 800, h: 600 }, trackState, browserEnabled)
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setMaState(INITIAL_MA_STATE)
    setTask('')
    setRunning(false)
    setSelectedId(null)
    setFollowUp('')
    setSavedToMemory(false)
    setCopiedOutput(false)
    setActiveSessionId(null)
    setMessages([])
  }

  const handleLoadSession = (session: ChatSession) => {
    setMaState(session.state)
    setTask(session.task)
    setActiveSessionId(session.id)
    setSelectedId(null)
    setFollowUp('')
    setSavedToMemory(false)
    setCopiedOutput(false)
    // Restore the final output as the single assistant message in chat history
    setMessages(session.state.finalOutput
      ? [{ role: 'assistant', content: session.state.finalOutput }]
      : []
    )
  }

  const handleDeleteSession = (id: string) => {
    deleteSession(id)
    setSessions(loadSessions())
    if (activeSessionId === id) handleReset()
  }

  const { phase, agents, finalOutput, errorMsg } = maState
  const phaseMeta = PHASE_META[phase]
  const doneCount = agents.filter(a => a.status === 'done').length
  const activeProviders = PROVIDER_ORDER.filter(p => providerKeys[p])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="of-page-title">Agent Universe</span>
          {phase !== 'idle' && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              background: phaseMeta.color + '22', border: `1px solid ${phaseMeta.color}55`,
              color: phaseMeta.color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {phaseMeta.label}
            </span>
          )}
          {agents.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {doneCount}/{agents.length} agents done
            </span>
          )}
        </div>
        {phase !== 'idle' && (
          <button className="btn-ghost" onClick={handleReset} style={{ fontSize: 12 }}>Reset</button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sessions Sidebar ──────────────────────────────────────────── */}
        <SessionsSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onNew={handleReset}
        />

        {/* ── Universe 3D ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Universe3D
            state={maState}
            selectedId={selectedId}
            onSelectAgent={setSelectedId}
          />
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────── */}
        <RightPanel
          phase={phase}
          phaseMeta={phaseMeta}
          agents={agents}
          finalOutput={finalOutput}
          errorMsg={errorMsg}
          task={task}
          setTask={setTask}
          running={running}
          hasAnyKey={hasAnyKey}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          followUp={followUp}
          setFollowUp={setFollowUp}
          savedToMemory={savedToMemory}
          copiedOutput={copiedOutput}
          providerKeys={providerKeys}
          providersOpen={providersOpen}
          setProvidersOpen={setProvidersOpen}
          activeProviders={activeProviders}
          messages={messages}
          browserEnabled={browserEnabled}
          onToggleBrowser={() => setBrowserEnabled(v => !v)}
          onLaunch={handleLaunch}
          onFollowUp={handleFollowUp}
          onSaveMemory={() => {
            addMemory({ agentId: 'universe', key: `task-${Date.now()}`, value: `Task: ${task}\n\nOutput:\n${finalOutput}`, ts: Date.now(), source: 'manual' })
            setSavedToMemory(true)
            setTimeout(() => setSavedToMemory(false), 3000)
          }}
          onCopyOutput={() => {
            void navigator.clipboard.writeText(finalOutput)
            setCopiedOutput(true)
            setTimeout(() => setCopiedOutput(false), 2000)
          }}
          onExportMd={() => {
            const blob = new Blob([`# Agent Universe Output\n\n**Task:** ${task}\n\n---\n\n${finalOutput}`], { type: 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `agentis-output-${Date.now()}.md`; a.click()
            URL.revokeObjectURL(url)
          }}
          onExportTxt={() => {
            const blob = new Blob([`Task: ${task}\n\n${finalOutput}`], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `agentis-output-${Date.now()}.txt`; a.click()
            URL.revokeObjectURL(url)
          }}
          onDeepDive={() => {
            setSavedToMemory(false)
            void handleFollowUp(`Deep dive and expand the analysis with more detail, concrete examples, and actionable insights based on: ${finalOutput.slice(0, 500)}`)
          }}
          updateProviderKey={updateProviderKey}
          onTestKey={p => void handleTestKey(p)}
          testStatus={testStatus}
        />
      </div>
    </div>
  )
}
