import type { AgentStep } from '@/types'

const STEPS: { id: AgentStep; label: string }[] = [
  { id: 'persona',  label: 'Who' },
  { id: 'mode',     label: 'Mode' },
  { id: 'execute',  label: 'Run' },
  { id: 'output',   label: 'Output' },
]

// Full ordering for progress calculation (includes non-visible steps)
const ORDER: AgentStep[] = ['persona', 'mode', 'template', 'preview', 'task', 'graph', 'execute', 'output']

interface Props {
  current: AgentStep
}

export function StepIndicator({ current }: Props) {
  const currentIdx = ORDER.indexOf(current)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => {
        const idx = ORDER.indexOf(step.id)
        const done = idx < currentIdx
        const active = idx === currentIdx

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 500,
                  border: done
                    ? '1.5px solid #1D9E75'
                    : active
                    ? '1.5px solid var(--fg)'
                    : '1.5px solid var(--border)',
                  background: done ? '#1D9E75' : active ? 'var(--fg)' : 'var(--surface)',
                  color: done || active ? 'var(--bg)' : 'var(--muted)',
                  transition: 'all 0.3s',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  color: active ? 'var(--fg)' : 'var(--muted)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {step.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 1.5,
                  background: done ? '#1D9E75' : 'var(--border)',
                  marginBottom: 20,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
