import { useState } from 'react'
import { WORKFLOW_TEMPLATES } from '@/data/templates'
import type { AgentStateEx } from '@/hooks/useAgent'

interface Props {
  apiKey: string
  agentState: AgentStateEx
  executeWorkflow: (task: string, templateId: string, personaId: string) => Promise<void>
  reset: () => void
}

type RunState = 'idle' | 'input' | 'running' | 'done'

function NodeCount(templateId: string): number {
  const t = WORKFLOW_TEMPLATES.find(t => t.id === templateId)
  return t?.nodeDefinitions.length ?? 0
}

export function WorkflowsPage({ apiKey, agentState, executeWorkflow, reset }: Props) {
  const [runState, setRunState] = useState<RunState>('idle')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [task, setTask] = useState('')

  const template = WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplate)

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    setTask('')
    setRunState('input')
    reset()
  }

  const handleRun = () => {
    if (!task.trim() || !selectedTemplate || !apiKey) return
    setRunState('running')
    void executeWorkflow(task, selectedTemplate, template?.personaId ?? 'dev')
  }

  const handleBack = () => {
    setRunState('idle')
    setSelectedTemplate(null)
    setTask('')
    reset()
  }

  // Running / done states
  if (runState === 'running' || (runState === 'input' && agentState.step === 'execute')) {
    const graph = agentState.graph
    const nodes = graph?.nodes ?? []
    const doneCount = nodes.filter(n => n.status === 'done').length
    const pct = nodes.length > 0 ? Math.round((doneCount / nodes.length) * 100) : 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="of-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleBack}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
            >
              Back
            </button>
            <span className="of-page-title">{template?.name ?? 'Workflow'}</span>
          </div>
          {agentState.step === 'output' && (
            <button className="btn-secondary" onClick={handleBack} style={{ fontSize: 12 }}>
              New Workflow
            </button>
          )}
        </div>

        <div className="of-page-content">
          {/* Task summary */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Task</div>
            <div style={{ fontSize: 13, color: 'var(--fg)' }}>{agentState.task}</div>
          </div>

          {/* Progress */}
          {agentState.step === 'execute' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {agentState.loading ? 'Workflow running...' : agentState.error ? 'Stopped' : 'Complete'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{doneCount}/{nodes.length} nodes</span>
              </div>
              <div style={{ height: 3, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: agentState.error ? 'var(--red)' : 'var(--accent)', borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {agentState.error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
              {agentState.error}
            </div>
          )}

          {/* Nodes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {nodes.map(node => {
              const isDone = node.status === 'done'
              const isRunning = node.status === 'running'
              const isPending = node.status === 'pending'

              return (
                <div
                  key={node.id}
                  style={{
                    padding: '10px 14px',
                    background: isRunning ? node.skillColor.bg : 'var(--surface)',
                    border: `1px solid ${isRunning ? node.skillColor.border : 'var(--border)'}`,
                    borderRadius: 8,
                    opacity: isPending ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `1.5px solid ${isDone ? 'var(--green)' : isRunning ? node.skillColor.border : 'var(--border)'}`,
                    background: isDone ? 'var(--green)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 8,
                    color: '#fff',
                  }}>
                    {isDone ? 'OK' : ''}
                  </div>
                  <span style={{
                    padding: '1px 7px',
                    borderRadius: 20,
                    border: `1px solid ${node.skillColor.border}`,
                    background: node.skillColor.bg,
                    color: node.skillColor.text,
                    fontSize: 10,
                    fontWeight: 600,
                  }}>{node.skill}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>{node.title}</span>
                  {isRunning && (
                    <span style={{ fontSize: 11, color: node.skillColor.text, fontStyle: 'italic' }}>{node.thinking}</span>
                  )}
                  {isDone && node.output && (
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{node.output.split(/\s+/).length} words</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Output tabs when done */}
          {agentState.step === 'output' && nodes.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <OutputNodeTabs nodes={nodes} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Input state
  if (runState === 'input' && template) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="of-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleBack}
              style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
            >
              Back
            </button>
            <span className="of-page-title">{template.name}</span>
          </div>
        </div>

        <div className="of-page-content">
          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            {template.taskPromptGuide}
          </div>

          <textarea
            placeholder={`Describe the task for ${template.name}...`}
            value={task}
            onChange={e => setTask(e.target.value)}
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {template.nodeDefinitions.length} nodes · ~{template.estimatedMinutes} min
            </div>
            <button
              className="btn-primary"
              disabled={!task.trim() || !apiKey}
              onClick={handleRun}
              style={{ padding: '9px 24px', fontSize: 14 }}
            >
              Run Workflow
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Idle state - template list
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Workflows</span>
        <div style={{ display: 'flex', gap: 8 }}>
        </div>
      </div>

      <div className="of-page-content">
        <div className="of-info-banner">
          <span style={{ fontWeight: 600 }}>What are Workflows?</span>
          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
            Workflows chain multiple agents into automated pipelines. Each node in the graph is a specialized agent skill that runs in sequence or in parallel.
          </span>
        </div>

        <div style={{ marginBottom: 12 }} className="of-section-label">Agentis Templates</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {WORKFLOW_TEMPLATES.map(t => (
            <div
              key={t.id}
              className="card"
              style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{t.description}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-gray" style={{ fontSize: 9 }}>
                    {NodeCount(t.id)} nodes
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: 9 }}>
                    ~{t.estimatedMinutes}min
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: 9, textTransform: 'capitalize' }}>
                    {t.category}
                  </span>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleUseTemplate(t.id)}
                  style={{ fontSize: 11, padding: '5px 12px' }}
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OutputNodeTabs({ nodes }: { nodes: { id: string; skill: string; title: string; output: string; skillColor: { bg: string; border: string; text: string } }[] }) {
  const [active, setActive] = useState(nodes[nodes.length - 1]?.id ?? '')
  const activeNode = nodes.find(n => n.id === active)

  return (
    <div>
      <div className="tab-bar">
        {nodes.map(n => (
          <button
            key={n.id}
            className={`tab-btn${active === n.id ? ' active' : ''}`}
            onClick={() => setActive(n.id)}
          >
            {n.skill}
          </button>
        ))}
      </div>
      {activeNode && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {activeNode.title}
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
            maxHeight: 440,
            overflowY: 'auto',
          }}>
            {activeNode.output}
          </div>
        </div>
      )}
    </div>
  )
}
