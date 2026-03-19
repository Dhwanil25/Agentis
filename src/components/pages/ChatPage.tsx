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

const CATEGORY_MAP: Record<string, string> = {
  dev: 'DEVELOPMENT',
  'senior-dev': 'DEVELOPMENT',
  'api-engineer': 'DEVELOPMENT',
  'platform-eng': 'DEVELOPMENT',
  writer: 'WRITING',
  analyst: 'ANALYSIS',
  marketer: 'MARKETING',
  student: 'LEARNING',
  founder: 'BUSINESS',
}

export function ChatPage({ apiKey, agentState, engineRunning, execute, reset }: Props) {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [task, setTask] = useState('')
  const [useEngine, setUseEngine] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [outputTab, setOutputTab] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const step = agentState.step
  const pipeline = agentState.pipeline
  const loading = agentState.loading
  const error = agentState.error

  useEffect(() => {
    const running = pipeline.find(p => p.status === 'running')
    if (running) setExpanded(running.id)
  }, [pipeline])

  useEffect(() => {
    if (step === 'output' && pipeline.length > 0 && !outputTab) {
      setOutputTab(pipeline[pipeline.length - 1]?.id ?? '')
    }
  }, [step, pipeline, outputTab])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pipeline])

  const handleRun = () => {
    if (!selectedPersona || !task.trim()) return
    void execute(task, selectedPersona.id)
  }

  const handleNewConversation = () => {
    reset()
    setSelectedPersona(null)
    setTask('')
    setExpanded(null)
    setOutputTab('')
    setUseEngine(false)
  }

  const doneSteps = pipeline.filter(p => p.status === 'done').length
  const pct = pipeline.length > 0 ? Math.round((doneSteps / pipeline.length) * 100) : 0

  // State 1: No persona selected
  if (step === 'persona' || (!selectedPersona && step !== 'execute' && step !== 'output')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="of-page-header">
          <span className="of-page-title">Chat</span>
        </div>
        <div className="of-page-content">
          <div style={{ marginBottom: 12 }} className="of-section-label">START CHATTING</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            {PERSONAS.map(persona => (
              <button
                key={persona.id}
                onClick={() => { setSelectedPersona(persona) }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '14px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--orange-border)'
                  e.currentTarget.style.background = 'var(--surface-2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--surface)'
                }}
              >
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className="badge badge-gray" style={{ fontSize: 9 }}>
                    {CATEGORY_MAP[persona.id] ?? 'GENERAL'}
                  </span>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  marginBottom: 6,
                  marginTop: 4,
                }}>
                  {persona.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {persona.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // State 3 + 4: Executing or Output
  if (step === 'execute' || step === 'output') {
    const activeOutputStep = pipeline.find(p => p.id === outputTab)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="of-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleNewConversation}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
            >
              Back
            </button>
            <span className="of-page-title">{selectedPersona?.label ?? 'Chat'}</span>
          </div>
          {step === 'output' && (
            <button className="btn-secondary" onClick={handleNewConversation} style={{ fontSize: 12 }}>
              New conversation
            </button>
          )}
        </div>

        <div className="of-page-content" style={{ paddingBottom: 24 }}>
          {/* Task summary */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Task</div>
            <div style={{ fontSize: 13, color: 'var(--fg)' }}>{agentState.task}</div>
          </div>

          {/* Progress bar */}
          {step === 'execute' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {loading ? 'Agent running...' : error ? 'Stopped' : 'Complete'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{doneSteps}/{pipeline.length} steps</span>
              </div>
              <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: error ? 'var(--red)' : 'var(--orange)', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Execute: pipeline steps */}
          {step === 'execute' && (
            <PipelineView pipeline={pipeline} expanded={expanded} setExpanded={setExpanded} bottomRef={bottomRef} />
          )}

          {/* Output: tabs */}
          {step === 'output' && (
            <div>
              <div className="tab-bar">
                {pipeline.map(step => (
                  <button
                    key={step.id}
                    className={`tab-btn${outputTab === step.id ? ' active' : ''}`}
                    onClick={() => setOutputTab(step.id)}
                  >
                    {step.skill}
                  </button>
                ))}
              </div>
              {activeOutputStep && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {activeOutputStep.title}
                  </div>
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '16px',
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: 'var(--fg)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 480,
                    overflowY: 'auto',
                  }}>
                    {activeOutputStep.output}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // State 2: Persona selected, entering task
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setSelectedPersona(null)}
            style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
          >
            Back
          </button>
          <span className="of-page-title">{selectedPersona?.label}</span>
        </div>
      </div>

      <div className="of-page-content">
        <textarea
          placeholder={`What would you like ${selectedPersona?.label} to do?`}
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && task.trim()) handleRun()
          }}
          style={{
            width: '100%',
            minHeight: 140,
            resize: 'vertical',
            marginBottom: 16,
            fontSize: 14,
            lineHeight: 1.6,
            padding: '12px 14px',
          }}
        />

        {/* Suggestions */}
        {selectedPersona && task === '' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Suggestions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedPersona.suggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTask(s)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--fg)'
                    e.currentTarget.style.borderColor = 'var(--orange-border)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--muted)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {engineRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={useEngine}
                onChange={e => setUseEngine(e.target.checked)}
                style={{ accentColor: 'var(--orange)', width: 14, height: 14 }}
              />
              Use Agentis Engine
            </label>
            {useEngine && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>Connected</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            disabled={!task.trim() || !apiKey}
            onClick={handleRun}
            style={{ padding: '9px 24px', fontSize: 14 }}
          >
            Run
          </button>
        </div>
      </div>
    </div>
  )
}

// Pipeline execution view
function PipelineView({
  pipeline,
  expanded,
  setExpanded,
  bottomRef,
}: {
  pipeline: PipelineStep[]
  expanded: string | null
  setExpanded: (id: string | null) => void
  bottomRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pipeline.map(step => {
        const isExpanded = expanded === step.id
        const isRunning = step.status === 'running'
        const isDone = step.status === 'done'
        const isPending = step.status === 'pending'

        const borderColor = isRunning ? step.skillColor.border : 'var(--border)'
        const bgColor = isRunning ? step.skillColor.bg : 'var(--surface)'

        return (
          <div
            key={step.id}
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              overflow: 'hidden',
              background: bgColor,
              opacity: isPending ? 0.45 : 1,
            }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : step.id)}
              disabled={isPending}
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'none',
                border: 'none',
                cursor: isPending ? 'default' : 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `1.5px solid ${isDone ? 'var(--green)' : isRunning ? step.skillColor.border : 'var(--border)'}`,
                background: isDone ? 'var(--green)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 9,
                color: isDone ? '#fff' : isRunning ? step.skillColor.text : 'var(--muted)',
              }}>
                {isDone ? 'OK' : isRunning ? '' : ''}
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: 20,
                border: `1px solid ${step.skillColor.border}`,
                background: step.skillColor.bg,
                color: step.skillColor.text,
                fontSize: 10,
                fontWeight: 600,
              }}>{step.skill}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>{step.title}</span>
              {isRunning && (
                <span style={{ fontSize: 11, color: step.skillColor.text, fontStyle: 'italic' }}>{step.thinking}</span>
              )}
              {isDone && step.output && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{step.output.split(/\s+/).length} words</span>
              )}
              {(isDone || isRunning) && (
                <span style={{ fontSize: 11, color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>v</span>
              )}
            </button>
            {isExpanded && (isDone || isRunning) && (
              <div style={{ borderTop: `1px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, background: 'var(--bg)' }}>
                {step.toolLog.length > 0 && (
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                      Agent Activity
                    </div>
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
