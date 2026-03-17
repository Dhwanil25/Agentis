import { useRef, useEffect, useState } from 'react'
import type { PipelineStep } from '@/hooks/useAgent'

// ── Execution Screen (live streaming) ─────────────────────────────────────

interface ExecuteProps {
  pipeline: PipelineStep[]
  loading: boolean
  error: string | null
}

export function ExecuteScreen({ pipeline, loading, error }: ExecuteProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const running = pipeline.find(p => p.status === 'running')
    if (running) setExpanded(running.id)
  }, [pipeline])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pipeline])

  const totalSteps = pipeline.length
  const doneSteps = pipeline.filter(p => p.status === 'done').length
  const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
            {loading ? 'Agent running…' : error ? 'Agent stopped' : 'Agent complete'}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{doneSteps}/{totalSteps} steps</span>
        </div>
        <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: error ? '#E24B4A' : '#1D9E75', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', border: '0.5px solid #F09595', color: '#A32D2D', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pipeline.map((step) => {
          const isExpanded = expanded === step.id
          const isRunning = step.status === 'running'
          const isDone = step.status === 'done'
          const isPending = step.status === 'pending'

          return (
            <div key={step.id} style={{ border: `0.5px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', background: isRunning ? step.skillColor.bg : 'var(--surface)', transition: 'all 0.25s', opacity: isPending ? 0.45 : 1 }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : step.id)}
                disabled={isPending}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: isPending ? 'default' : 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${isDone ? '#1D9E75' : isRunning ? step.skillColor.border : 'var(--border)'}`, background: isDone ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: isDone ? '#fff' : isRunning ? step.skillColor.text : 'var(--muted)' }}>
                  {isDone ? '✓' : isRunning ? '◌' : '○'}
                </div>
                <span style={{ padding: '2px 9px', borderRadius: 20, border: `0.5px solid ${step.skillColor.border}`, background: step.skillColor.bg, color: step.skillColor.text, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                  {step.skill}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>{step.title}</span>
                {isRunning && <span style={{ fontSize: 12, color: step.skillColor.text, fontStyle: 'italic' }}>{step.thinking}</span>}
                {isDone && step.output && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{step.output.split(/\s+/).length} words</span>}
                {(isDone || isRunning) && <span style={{ fontSize: 12, color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>}
              </button>

              {isExpanded && (isDone || isRunning) && (
                <div style={{ borderTop: `0.5px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, padding: '14px 16px', fontSize: 13, lineHeight: 1.75, fontFamily: 'var(--font-mono)', color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 360, overflowY: 'auto', background: 'var(--bg)' }}>
                  {step.output}
                  {isRunning && <span style={{ display: 'inline-block', width: 8, height: 14, background: step.skillColor.border, marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div ref={bottomRef} />
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  )
}

// ── Output Screen ──────────────────────────────────────────────────────────

interface OutputProps {
  pipeline: PipelineStep[]
  onReset: () => void
}

export function OutputScreen({ pipeline, onReset }: OutputProps) {
  const [active, setActive] = useState(pipeline[pipeline.length - 1]?.id ?? '')
  const activeStep = pipeline.find(p => p.id === active)

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Done</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>{pipeline.length} skills ran in sequence. Browse each step below.</p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {pipeline.map(step => (
          <button key={step.id} onClick={() => setActive(step.id)} style={{ padding: '5px 12px', borderRadius: 20, border: `0.5px solid ${active === step.id ? step.skillColor.border : 'var(--border)'}`, background: active === step.id ? step.skillColor.bg : 'var(--surface)', color: active === step.id ? step.skillColor.text : 'var(--muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
            ✓ {step.skill}
          </button>
        ))}
      </div>

      {activeStep && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{activeStep.title}</div>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '18px 20px', fontSize: 13, lineHeight: 1.8, color: 'var(--fg)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 420, overflowY: 'auto' }}>
            {activeStep.output}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <button className="btn-secondary" onClick={onReset}>Start over</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Powered by obra/superpowers + Claude API</span>
      </div>
    </div>
  )
}
