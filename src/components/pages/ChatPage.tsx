import { useState, useEffect, useRef } from 'react'
import { PERSONAS } from '@/data/personas'
import type { Persona } from '@/types'
import type { AgentStateEx, PipelineStep } from '@/hooks/useAgent'

interface Props {
  apiKey: string
  agentState: AgentStateEx
  engineRunning: boolean
  execute: (task: string, personaId: string) => Promise<void>
  executeOnOpenFang: (task: string, personaId: string) => Promise<void>
  reset: () => void
}

interface Conversation {
  id: string
  persona: Persona
  task: string
  name: string
  emoji: string
  color: string
  createdAt: number
}

const CATEGORY_MAP: Record<string, string> = {
  dev: 'DEV',
  'senior-dev': 'DEV',
  'api-engineer': 'DEV',
  'platform-eng': 'DEV',
  writer: 'WRITING',
  analyst: 'ANALYSIS',
  marketer: 'MARKETING',
  student: 'RESEARCH',
  founder: 'BUSINESS',
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ── Wizard data ────────────────────────────────────────────────────────────────

const AGENT_EMOJIS = [
  '🤖', '🗂️', '🔍', '🐟', '📊', '🛠️', '💬', '🪝',
  '🌍', '🔒', '⚡', '🚀', '✏️', '🎯', '📚', '🧠',
  '🖥️', '📁', '❤️', '✨', '🔧', '📝', '💡', '🎨',
]

const AGENT_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#eab308', '#ec4899',
]

const AGENT_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', badge: 'FAST', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet', badge: 'BALANCED', provider: 'Anthropic' },
  { id: 'claude-opus-4-6', label: 'Claude Opus', badge: 'POWERFUL', provider: 'Anthropic' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', badge: 'FAST', provider: 'OpenAI' },
  { id: 'gpt-4o', label: 'GPT-4o', badge: 'BALANCED', provider: 'OpenAI' },
]

interface AgentTypeOption {
  value: string
  label: string
  personaId: string
}

const AGENT_TYPES: AgentTypeOption[] = [
  { value: 'assistant', label: 'Assistant', personaId: 'founder' },
  { value: 'researcher', label: 'Researcher', personaId: 'student' },
  { value: 'coder', label: 'Coder', personaId: 'dev' },
  { value: 'writer', label: 'Writer', personaId: 'writer' },
  { value: 'devops', label: 'DevOps', personaId: 'platform-eng' },
  { value: 'support', label: 'Support', personaId: 'api-engineer' },
  { value: 'analyst', label: 'Analyst', personaId: 'analyst' },
  { value: 'custom', label: 'Custom', personaId: 'senior-dev' },
]

interface WizardState {
  name: string
  emoji: string
  color: string
  agentType: string
  model: string
  systemPrompt: string
  task: string
  memory: boolean
  webSearch: boolean
}

const STEP_LABELS = ['Identity', 'Model', 'Behavior', 'Capabilities', 'Task & Launch']

// ── Create Agent Modal ─────────────────────────────────────────────────────────

// Reverse map: personaId → agentType value
const PERSONA_TO_TYPE: Record<string, string> = {
  founder: 'assistant',
  student: 'researcher',
  dev: 'coder',
  writer: 'writer',
  'platform-eng': 'devops',
  'api-engineer': 'support',
  analyst: 'analyst',
  'senior-dev': 'custom',
  marketer: 'analyst',
}

function CreateAgentModal({ onClose, onLaunch, initialWizard, initialStep }: {
  onClose: () => void
  onLaunch: (state: WizardState) => void
  initialWizard?: Partial<WizardState>
  initialStep?: number
}) {
  const [activeTab, setActiveTab] = useState<'wizard' | 'toml'>('wizard')
  const [step, setStep] = useState(initialStep ?? 1)
  const [wizard, setWizard] = useState<WizardState>({
    name: 'my-agent',
    emoji: '🤖',
    color: '#f97316',
    agentType: '',
    model: 'claude-sonnet-4-6',
    systemPrompt: '',
    task: '',
    memory: true,
    webSearch: false,
    ...initialWizard,
  })

  const update = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setWizard(prev => ({ ...prev, [k]: v }))

  const selectedType = AGENT_TYPES.find(t => t.value === wizard.agentType)
  const selectedPersona = PERSONAS.find(p => p.id === selectedType?.personaId)

  const toml = `[agent]
name = "${wizard.name}"
emoji = "${wizard.emoji}"
color = "${wizard.color}"
type = "${wizard.agentType || 'assistant'}"
model = "${wizard.model}"
memory = ${wizard.memory}
web_search = ${wizard.webSearch}

[behavior]
system_prompt = """
${wizard.systemPrompt || `You are a helpful ${selectedType?.label ?? 'AI'} agent.`}
"""

[task]
description = """
${wizard.task || '# Enter your task on the final step'}
"""`

  const canNext = (): boolean => {
    if (step === 1) return wizard.name.trim().length > 0 && wizard.agentType !== ''
    return true
  }

  const badgeStyle = (badge: string) => ({
    fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
    letterSpacing: '0.08em',
    background: badge === 'FAST' ? 'rgba(16,185,129,0.1)' : badge === 'BALANCED' ? 'rgba(249,115,22,0.1)' : 'rgba(139,92,246,0.1)',
    color: badge === 'FAST' ? '#10b981' : badge === 'BALANCED' ? '#f97316' : '#8b5cf6',
    border: `1px solid ${badge === 'FAST' ? 'rgba(16,185,129,0.3)' : badge === 'BALANCED' ? 'rgba(249,115,22,0.3)' : 'rgba(139,92,246,0.3)'}`,
  } as React.CSSProperties)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 520, maxHeight: '90vh', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 12,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
      }}>

        {/* ── Modal header ── */}
        <div style={{ padding: '18px 22px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Create Agent</span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['wizard', 'toml'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  color: activeTab === tab ? 'var(--fg)' : 'var(--muted)',
                  borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                  marginBottom: -1, fontFamily: 'var(--font-sans)',
                }}
              >
                {tab === 'toml' ? 'Raw TOML' : 'Wizard'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Raw TOML view ── */}
        {activeTab === 'toml' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
            <pre style={{
              fontSize: 12, lineHeight: 1.7, color: 'var(--fg)', fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 8, padding: 16, margin: 0,
            }}>
              {toml}
            </pre>
          </div>
        )}

        {/* ── Wizard view ── */}
        {activeTab === 'wizard' && (
          <>
            {/* Step indicator */}
            <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    onClick={() => n < step && setStep(n)}
                    style={{
                      width: 30, height: 30, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      background: n === step ? 'var(--accent)' : 'transparent',
                      border: n === step ? 'none' : `1.5px solid ${n < step ? 'var(--accent)' : 'var(--border)'}`,
                      color: n === step ? '#fff' : n < step ? 'var(--accent)' : 'var(--muted)',
                      cursor: n < step ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </div>
                  {n < 5 && (
                    <div style={{ width: 22, height: 1.5, borderRadius: 1, background: n < step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
                  )}
                </div>
              ))}
              <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                {STEP_LABELS[step - 1]}
              </span>
            </div>

            {/* Step content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

              {/* ── Step 1: Identity ── */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                      Agent Name
                    </label>
                    <input
                      value={wizard.name}
                      onChange={e => update('name', e.target.value)}
                      placeholder="my-agent"
                      autoFocus
                      style={{ width: '100%', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                      Emoji
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
                      {AGENT_EMOJIS.map(em => (
                        <button
                          key={em}
                          onClick={() => update('emoji', em)}
                          style={{
                            width: 38, height: 38, borderRadius: 8, fontSize: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: wizard.emoji === em ? 'var(--accent-bg)' : 'var(--surface)',
                            border: `1px solid ${wizard.emoji === em ? 'var(--accent-border)' : 'var(--border)'}`,
                            cursor: 'pointer', transition: 'all 0.1s',
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                      Color
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {AGENT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => update('color', c)}
                          style={{
                            width: 28, height: 28, borderRadius: 6, background: c,
                            border: 'none', cursor: 'pointer',
                            outline: wizard.color === c ? '2px solid var(--fg)' : '2px solid transparent',
                            outlineOffset: 2, transition: 'outline 0.1s',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                      Type
                    </label>
                    <select
                      value={wizard.agentType}
                      onChange={e => update('agentType', e.target.value)}
                      style={{ width: '100%', fontSize: 13 }}
                    >
                      <option value="">Choose...</option>
                      {AGENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Step 2: Model ── */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    Select the AI model that powers this agent.
                  </div>
                  {AGENT_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => update('model', m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: wizard.model === m.id ? 'var(--accent-bg)' : 'var(--surface)',
                        border: `1px solid ${wizard.model === m.id ? 'var(--accent-border)' : 'var(--border)'}`,
                        fontFamily: 'var(--font-sans)', transition: 'all 0.1s',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.provider}</div>
                      </div>
                      <span style={badgeStyle(m.badge)}>{m.badge}</span>
                      {wizard.model === m.id && (
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round">
                          <polyline points="2 6 5 9 10 3"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Step 3: Behavior ── */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    Customize how this agent thinks and responds. Leave blank to use the default for the selected type.
                  </div>
                  <textarea
                    value={wizard.systemPrompt}
                    onChange={e => update('systemPrompt', e.target.value)}
                    placeholder={`You are a helpful ${selectedType?.label ?? 'AI'} agent. You are professional, concise, and focused on delivering value. You never use emojis or markdown bold unless explicitly asked.`}
                    style={{ width: '100%', minHeight: 180, fontSize: 12, lineHeight: 1.7, resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                    Tip: Define the agent's role, output format, tone, and any constraints here.
                  </div>
                </div>
              )}

              {/* ── Step 4: Capabilities ── */}
              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, lineHeight: 1.6 }}>
                    Enable or disable capabilities for this agent.
                  </div>
                  {([
                    { key: 'memory' as const, label: 'Memory', desc: 'Agent retains context across sessions', icon: '🧠' },
                    { key: 'webSearch' as const, label: 'Web Search', desc: 'Agent can browse and research the web in real time', icon: '🌍' },
                  ]).map(cap => (
                    <button
                      key={cap.key}
                      onClick={() => update(cap.key, !wizard[cap.key])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        background: wizard[cap.key] ? 'var(--accent-bg)' : 'var(--surface)',
                        border: `1px solid ${wizard[cap.key] ? 'var(--accent-border)' : 'var(--border)'}`,
                        fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{cap.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{cap.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cap.desc}</div>
                      </div>
                      {/* Toggle */}
                      <div style={{ width: 36, height: 20, borderRadius: 10, background: wizard[cap.key] ? 'var(--accent)' : 'var(--border)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: 2, left: wizard[cap.key] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Step 5: Task & Launch ── */}
              {step === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Agent summary card */}
                  <div style={{
                    padding: '12px 14px', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    display: 'flex', gap: 14, alignItems: 'center',
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                      background: wizard.color + '20',
                      border: `1.5px solid ${wizard.color}50`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    }}>
                      {wizard.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 2 }}>{wizard.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {selectedType?.label ?? 'Custom'} · {AGENT_MODELS.find(m => m.id === wizard.model)?.label ?? wizard.model}
                        {wizard.memory && ' · Memory'}
                        {wizard.webSearch && ' · Web'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                      Task
                    </label>
                    <textarea
                      autoFocus
                      value={wizard.task}
                      onChange={e => update('task', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && wizard.task.trim()) onLaunch(wizard) }}
                      placeholder={`What would you like ${wizard.name} to do?`}
                      style={{ width: '100%', minHeight: 120, fontSize: 13, lineHeight: 1.7, resize: 'vertical' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Cmd+Enter to launch</div>
                  </div>

                  {/* Suggestions */}
                  {wizard.task === '' && selectedPersona && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Suggestions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {selectedPersona.suggestions.slice(0, 3).map((s, i) => (
                          <button
                            key={i}
                            onClick={() => update('task', s)}
                            style={{
                              textAlign: 'left', padding: '8px 10px',
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              borderRadius: 6, fontSize: 12, color: 'var(--muted)',
                              cursor: 'pointer', fontFamily: 'var(--font-sans)',
                              transition: 'color 0.1s, border-color 0.1s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--accent-border)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 22px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0, background: 'var(--surface)',
            }}>
              <button
                className="btn-ghost"
                onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                style={{ fontSize: 13 }}
              >
                {step > 1 ? 'Back' : 'Cancel'}
              </button>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{step} of 5</span>
                {step < 5 ? (
                  <button
                    className="btn-primary"
                    disabled={!canNext()}
                    onClick={() => setStep(s => s + 1)}
                    style={{ fontSize: 13, padding: '7px 20px' }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    disabled={!wizard.task.trim()}
                    onClick={() => onLaunch(wizard)}
                    style={{ fontSize: 13, padding: '7px 20px' }}
                  >
                    Launch Agent
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── ChatPage ───────────────────────────────────────────────────────────────────

type View = 'conversation' | 'empty'

export function ChatPage({ agentState, execute, reset }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [view, setView] = useState<View>('empty')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [outputTab, setOutputTab] = useState('')
  const [modalConfig, setModalConfig] = useState<{ initial?: Partial<WizardState>; step?: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const step = agentState.step
  const pipeline = agentState.pipeline
  const loading = agentState.loading
  const error = agentState.error

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null

  useEffect(() => {
    const running = pipeline.find(p => p.status === 'running')
    if (running) setExpanded(running.id)
  }, [pipeline])

  useEffect(() => {
    if (step === 'output' && pipeline.length > 0 && !outputTab) {
      setOutputTab(pipeline[pipeline.length - 1]?.id ?? '')
    }
  }, [step, pipeline, outputTab])

  const activeConvIdRef = useRef(activeConvId)
  activeConvIdRef.current = activeConvId
  const agentStateRef = useRef(agentState)
  agentStateRef.current = agentState

  useEffect(() => {
    if (step === 'execute' || step === 'output') {
      setView('conversation')
      if (!activeConvIdRef.current) {
        const state = agentStateRef.current
        const persona = state.persona ?? PERSONAS.find(p => p.id === 'dev') ?? PERSONAS[0]
        const convTask = state.task || 'Scheduled task'
        const conv: Conversation = {
          id: `auto-${Date.now()}`,
          persona,
          task: convTask,
          name: persona.label,
          emoji: '🤖',
          color: '#f97316',
          createdAt: Date.now(),
        }
        setConversations(prev => [conv, ...prev])
        setActiveConvId(conv.id)
      }
    }
  }, [step])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pipeline])

  const handleLaunch = (wizard: WizardState) => {
    const selectedType = AGENT_TYPES.find(t => t.value === wizard.agentType)
    const personaId = selectedType?.personaId ?? 'dev'
    const persona = PERSONAS.find(p => p.id === personaId) ?? PERSONAS[0]

    const conv: Conversation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      persona,
      task: wizard.task.trim(),
      name: wizard.name,
      emoji: wizard.emoji,
      color: wizard.color,
      createdAt: Date.now(),
    }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(conv.id)
    setView('conversation')
    setOutputTab('')
    setModalConfig(null)
    void execute(wizard.task.trim(), personaId)
  }

  const handleSelectConv = (conv: Conversation) => {
    setActiveConvId(conv.id)
    setView('conversation')
  }

  const handleNewAgent = () => {
    reset()
    setActiveConvId(null)
    setOutputTab('')
    setView('empty')
    setModalConfig({})
  }

  const handlePersonaClick = (persona: Persona) => {
    reset()
    setOutputTab('')
    setModalConfig({
      initial: { agentType: PERSONA_TO_TYPE[persona.id] ?? 'assistant' },
      step: 5,
    })
  }

  const doneSteps = pipeline.filter(p => p.status === 'done').length
  const pct = pipeline.length > 0 ? Math.round((doneSteps / pipeline.length) * 100) : 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)',
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Agents
          </div>
          <button
            className="btn-primary"
            onClick={handleNewAgent}
            style={{ width: '100%', fontSize: 13, padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Agent
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
              No agents yet.<br />Create one to get started.
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = activeConvId === conv.id && view === 'conversation'
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '11px 14px',
                    background: isActive ? 'var(--accent-bg)' : 'none',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{conv.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--fg)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.name}
                    </span>
                    <span className="badge badge-gray" style={{ fontSize: 8, flexShrink: 0 }}>
                      {CATEGORY_MAP[conv.persona.id] ?? 'GENERAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {conv.task}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
                    {timeAgo(conv.createdAt)}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Persona grid — default landing when no conversation is active */}
        {view === 'empty' && (
          <>
            <div className="of-page-header">
              <span className="of-page-title">Choose a Persona</span>
              <button className="btn-primary" onClick={handleNewAgent} style={{ fontSize: 12, padding: '6px 14px' }}>
                Full Wizard
              </button>
            </div>
            <div className="of-page-content">
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18, lineHeight: 1.6 }}>
                Click a persona to instantly launch an agent, or use the full wizard to customise name, model, and behavior.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PERSONAS.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => handlePersonaClick(persona)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '16px 14px', textAlign: 'left',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-border)'
                      e.currentTarget.style.background = 'var(--accent-bg)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{persona.icon.length <= 2 ? persona.icon : '🤖'}</span>
                      <span className="badge badge-gray" style={{ fontSize: 9 }}>
                        {CATEGORY_MAP[persona.id] ?? 'GENERAL'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
                      {persona.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {persona.description}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {persona.skills.slice(0, 3).map(skill => (
                        <span key={skill} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Active conversation */}
        {view === 'conversation' && activeConv && (
          <>
            <div className="of-page-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{activeConv.emoji}</span>
                <span className="of-page-title" style={{ color: activeConv.color }}>{activeConv.name}</span>
                <span className="badge badge-accent" style={{ fontSize: 9 }}>
                  {CATEGORY_MAP[activeConv.persona.id] ?? 'GENERAL'}
                </span>
                {loading && <span className="badge badge-green" style={{ fontSize: 9 }}>RUNNING</span>}
              </div>
              <button className="btn-secondary" onClick={handleNewAgent} style={{ fontSize: 12 }}>
                New Agent
              </button>
            </div>

            <div className="of-page-content" style={{ paddingBottom: 24 }}>
              {/* Task */}
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Task</div>
                <div style={{ fontSize: 13, color: 'var(--fg)' }}>{activeConv.task}</div>
              </div>

              {/* Progress */}
              {step === 'execute' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {loading ? 'Running...' : error ? 'Stopped' : 'Complete'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{doneSteps}/{pipeline.length} steps</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: error ? 'var(--red)' : activeConv.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {step === 'execute' && (
                <PipelineView pipeline={pipeline} expanded={expanded} setExpanded={setExpanded} bottomRef={bottomRef} accentColor={activeConv.color} />
              )}

              {step === 'output' && (
                <div>
                  <div className="tab-bar">
                    {pipeline.map(s => (
                      <button key={s.id} className={`tab-btn${outputTab === s.id ? ' active' : ''}`} onClick={() => setOutputTab(s.id)}>
                        {s.skill}
                      </button>
                    ))}
                  </div>
                  {pipeline.find(s => s.id === outputTab) && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {pipeline.find(s => s.id === outputTab)?.title}
                      </div>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px', fontSize: 13, lineHeight: 1.8, color: 'var(--fg)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 480, overflowY: 'auto' }}>
                        {pipeline.find(s => s.id === outputTab)?.output}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Create Agent Modal ─────────────────────────────────────────── */}
      {modalConfig !== null && (
        <CreateAgentModal
          onClose={() => setModalConfig(null)}
          onLaunch={handleLaunch}
          initialWizard={modalConfig.initial}
          initialStep={modalConfig.step}
        />
      )}
    </div>
  )
}

function PipelineView({ pipeline, expanded, setExpanded, bottomRef, accentColor }: {
  pipeline: PipelineStep[]
  expanded: string | null
  setExpanded: (id: string | null) => void
  bottomRef: React.RefObject<HTMLDivElement>
  accentColor?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pipeline.map(step => {
        const isExpanded = expanded === step.id
        const isRunning = step.status === 'running'
        const isDone = step.status === 'done'
        const isPending = step.status === 'pending'

        return (
          <div key={step.id} style={{ border: `1px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', background: isRunning ? step.skillColor.bg : 'var(--surface)', opacity: isPending ? 0.4 : 1 }}>
            <button
              onClick={() => setExpanded(isExpanded ? null : step.id)}
              disabled={isPending}
              style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: isPending ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isDone ? (accentColor ?? 'var(--green)') : isRunning ? step.skillColor.border : 'var(--border)'}`, background: isDone ? (accentColor ?? 'var(--green)') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: isDone ? '#fff' : 'var(--muted)' }}>
                {isDone && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="2 6 5 9 10 3"/>
                  </svg>
                )}
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 20, border: `1px solid ${step.skillColor.border}`, background: step.skillColor.bg, color: step.skillColor.text, fontSize: 10, fontWeight: 600 }}>{step.skill}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>{step.title}</span>
              {isRunning && <span style={{ fontSize: 11, color: step.skillColor.text, fontStyle: 'italic' }}>{step.thinking}</span>}
              {isDone && step.output && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{step.output.split(/\s+/).length} words</span>}
              {(isDone || isRunning) && (
                <svg width="11" height="11" viewBox="0 0 12 12" style={{ flexShrink: 0, color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            {isExpanded && (isDone || isRunning) && (
              <div style={{ borderTop: `1px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, background: 'var(--bg)' }}>
                {step.toolLog.length > 0 && (
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Agent Activity</div>
                    {step.toolLog.map((t, i) => {
                      let detail = ''
                      try {
                        const parsed = JSON.parse(t.input)
                        detail = parsed.query ?? parsed.url ?? parsed.key ?? parsed.command ?? parsed.prompt ?? Object.values(parsed)[0] ?? ''
                        if (typeof detail !== 'string') detail = JSON.stringify(detail)
                        if (detail.length > 80) detail = detail.slice(0, 80) + '...'
                      } catch { detail = t.input.length > 80 ? t.input.slice(0, 80) + '...' : t.input }
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, opacity: t.done ? 0.6 : 1 }}>
                          <span style={{ color: step.skillColor.text, fontWeight: 500 }}>{t.label}</span>
                          {detail && <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 10, wordBreak: 'break-all' }}>"{detail}"</span>}
                          {!t.done && isRunning && <span style={{ marginLeft: 'auto', fontSize: 10, color: step.skillColor.border, flexShrink: 0 }}>running...</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ padding: '12px 14px', fontSize: 12, lineHeight: 1.75, fontFamily: 'var(--font-mono)', color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflowY: 'auto' }}>
                  {step.output}
                  {isRunning && <span style={{ display: 'inline-block', width: 7, height: 13, background: step.skillColor.border, marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />}
                </div>
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
