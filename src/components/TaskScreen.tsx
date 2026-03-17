import type { Persona } from '@/types'

interface Props {
  persona: Persona
  task: string
  onTask: (t: string) => void
  onNext: () => void
  onBack: () => void
}

export function TaskScreen({ persona, task, onTask, onNext, onBack }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>What do you need?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>
        Suggestions for <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>{persona.label}</strong>
        , or write your own task.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {persona.suggestions.map(s => (
          <button
            key={s}
            onClick={() => onTask(s)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '0.5px solid var(--border)',
              background: task === s ? 'var(--fg)' : 'var(--surface)',
              color: task === s ? 'var(--bg)' : 'var(--muted)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <textarea
        value={task}
        onChange={e => onTask(e.target.value)}
        rows={4}
        placeholder="Or describe your own task in plain language..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '12px 14px',
          fontSize: 14,
          borderRadius: 10,
          border: '0.5px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--fg)',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext} disabled={!task.trim()}>
          Next — build skill graph →
        </button>
      </div>
    </div>
  )
}
