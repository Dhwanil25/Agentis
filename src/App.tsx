import { useState } from 'react'
import { useAgent } from '@/hooks/useAgent'
import { StepIndicator } from '@/components/StepIndicator'
import { PersonaScreen } from '@/components/PersonaScreen'
import { TaskScreen } from '@/components/TaskScreen'
import { SkillGraphScreen } from '@/components/SkillGraphScreen'
import { ModeSelect } from '@/components/ModeSelect'
import { TemplateBrowser } from '@/components/TemplateBrowser'
import { WorkflowPreview } from '@/components/WorkflowPreview'
import { ExecuteScreen } from '@/components/ExecuteScreen'
import { OutputScreen } from '@/components/OutputScreen'
import { WORKFLOW_TEMPLATES } from '@/data/templates'

// Wide layout kicks in for execute and output steps
const WIDE_STEPS = new Set(['execute', 'output'])

export default function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [keySet, setKeySet] = useState(!!import.meta.env.VITE_ANTHROPIC_API_KEY)

  const {
    state,
    setStep,
    selectPersona,
    setTask,
    setMode,
    selectTemplate,
    execute,
    executeWorkflow,
    reset,
  } = useAgent(apiKey)

  const isWide = WIDE_STEPS.has(state.step)
  const shellClass = isWide ? 'shell-wide' : 'shell'
  const cardClass = isWide ? 'card-wide' : 'card'

  const selectedTemplate = state.templateId
    ? WORKFLOW_TEMPLATES.find(t => t.id === state.templateId) ?? null
    : null

  // ── API key gate ─────────────────────────────────────────────────────────
  if (!keySet) {
    return (
      <div className="shell">
        <div className="card" style={{ maxWidth: 460 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>Agentis</div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
              Enter your Anthropic API key to get started.{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--fg)' }}>
                Get one here →
              </a>
            </p>
          </div>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && keyInput.startsWith('sk-')) {
                setApiKey(keyInput); setKeySet(true)
              }
            }}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              fontSize: 14, borderRadius: 10, border: '0.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--fg)',
              fontFamily: 'var(--font-mono)', marginBottom: 12, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              disabled={!keyInput.startsWith('sk-')}
              onClick={() => { setApiKey(keyInput); setKeySet(true) }}
            >
              Continue →
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, marginBottom: 0 }}>
            Your key is stored in memory only. Never sent anywhere except directly to api.anthropic.com.
          </p>
        </div>
      </div>
    )
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className={shellClass}>
      <div className={cardClass}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>Agentis</div>
          <button
            onClick={reset}
            style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            Reset
          </button>
        </div>

        <StepIndicator current={state.step} />

        {/* ── Persona ── */}
        {state.step === 'persona' && (
          <PersonaScreen
            selected={state.persona}
            onSelect={selectPersona}
            onNext={() => setStep('mode')}
          />
        )}

        {/* ── Mode select ── */}
        {state.step === 'mode' && (
          <ModeSelect
            onSelectTemplate={() => setMode('template')}
            onSelectFreeform={() => setMode('freeform')}
            onBack={() => setStep('persona')}
          />
        )}

        {/* ── Template browser (template mode) ── */}
        {state.step === 'template' && (
          <TemplateBrowser
            selected={state.templateId}
            onSelect={selectTemplate}
            onNext={() => setStep('preview')}
            onBack={() => setStep('mode')}
          />
        )}

        {/* ── Workflow preview ── */}
        {state.step === 'preview' && selectedTemplate && (
          <WorkflowPreview
            template={selectedTemplate}
            onRun={() => {
              if (state.task.trim()) {
                executeWorkflow(state.task, selectedTemplate.id, state.persona?.id ?? 'dev')
              } else {
                // No task yet — go to task screen first
                setStep('task')
              }
            }}
            onBack={() => setStep('template')}
          />
        )}

        {/* ── Task entry (freeform mode or template task input) ── */}
        {state.step === 'task' && state.persona && (
          <TaskScreen
            persona={state.persona}
            task={state.task}
            onTask={setTask}
            onNext={() => {
              if (state.mode === 'template' && selectedTemplate) {
                executeWorkflow(state.task, selectedTemplate.id, state.persona!.id)
              } else {
                setStep('graph')
              }
            }}
            onBack={() => setStep(state.mode === 'template' ? 'preview' : 'mode')}
          />
        )}

        {/* ── Skill graph (freeform mode only) ── */}
        {state.step === 'graph' && state.persona && (
          <SkillGraphScreen
            skillIds={state.activeSkills}
            onNext={() => execute(state.task, state.persona!.id)}
            onBack={() => setStep('task')}
          />
        )}

        {/* ── Execute: template mode uses new ExecuteScreen, freeform uses old inline ── */}
        {state.step === 'execute' && state.mode === 'template' && state.graph && (
          <ExecuteScreen
            nodes={state.graph.nodes}
            loading={state.loading}
            error={state.error}
          />
        )}

        {state.step === 'execute' && state.mode !== 'template' && (
          <LegacyExecuteScreen
            pipeline={state.pipeline}
            loading={state.loading}
            error={state.error}
          />
        )}

        {/* ── Output: template mode uses new OutputScreen, freeform uses old ── */}
        {state.step === 'output' && state.mode === 'template' && state.graph && (
          <OutputScreen
            nodes={state.graph.nodes}
            artifacts={state.allArtifacts}
            onReset={reset}
          />
        )}

        {state.step === 'output' && state.mode !== 'template' && (
          <LegacyOutputScreen pipeline={state.pipeline} onReset={reset} />
        )}
      </div>
    </div>
  )
}

// ── Legacy screens for freeform mode (preserve existing behaviour) ────────

import type { PipelineStep } from '@/hooks/useAgent'
import { useRef, useEffect, useState as useLocalState } from 'react'

function LegacyExecuteScreen({
  pipeline,
  loading,
  error,
}: {
  pipeline: PipelineStep[]
  loading: boolean
  error: string | null
}) {
  const [expanded, setExpanded] = useLocalState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const running = pipeline.find(p => p.status === 'running')
    if (running) setExpanded(running.id)
  }, [pipeline])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [pipeline])

  const doneSteps = pipeline.filter(p => p.status === 'done').length
  const pct = pipeline.length > 0 ? Math.round((doneSteps / pipeline.length) * 100) : 0

  return (
    <div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>
            {loading ? 'Agent running…' : error ? 'Agent stopped' : 'Agent complete'}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{doneSteps}/{pipeline.length} steps</span>
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
        {pipeline.map(step => {
          const isExpanded = expanded === step.id
          const isRunning = step.status === 'running'
          const isDone = step.status === 'done'
          const isPending = step.status === 'pending'
          return (
            <div key={step.id} style={{ border: `0.5px solid ${isRunning ? step.skillColor.border : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', background: isRunning ? step.skillColor.bg : 'var(--surface)', opacity: isPending ? 0.45 : 1 }}>
              <button onClick={() => setExpanded(isExpanded ? null : step.id)} disabled={isPending} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: isPending ? 'default' : 'pointer', textAlign: 'left' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${isDone ? '#1D9E75' : isRunning ? step.skillColor.border : 'var(--border)'}`, background: isDone ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: isDone ? '#fff' : isRunning ? step.skillColor.text : 'var(--muted)' }}>
                  {isDone ? '✓' : isRunning ? '◌' : '○'}
                </div>
                <span style={{ padding: '2px 9px', borderRadius: 20, border: `0.5px solid ${step.skillColor.border}`, background: step.skillColor.bg, color: step.skillColor.text, fontSize: 11, fontWeight: 500 }}>{step.skill}</span>
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
    </div>
  )
}

function LegacyOutputScreen({ pipeline, onReset }: { pipeline: PipelineStep[]; onReset: () => void }) {
  const [active, setActive] = useLocalState(pipeline[pipeline.length - 1]?.id ?? '')
  const activeStep = pipeline.find(p => p.id === active)
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Done</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>{pipeline.length} skills ran in sequence. Browse each step below.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {pipeline.map(step => (
          <button key={step.id} onClick={() => setActive(step.id)} style={{ padding: '5px 12px', borderRadius: 20, border: `0.5px solid ${active === step.id ? step.skillColor.border : 'var(--border)'}`, background: active === step.id ? step.skillColor.bg : 'var(--surface)', color: active === step.id ? step.skillColor.text : 'var(--muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
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
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Powered by Agentis + Claude API</span>
      </div>
    </div>
  )
}
