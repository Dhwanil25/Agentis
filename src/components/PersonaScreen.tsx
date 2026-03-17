import { PERSONAS } from '@/data/personas'
import type { Persona } from '@/types'
import { SKILLS } from '@/data/skills'

interface Props {
  selected: Persona | null
  onSelect: (p: Persona) => void
  onNext: () => void
}

export function PersonaScreen({ selected, onSelect, onNext }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Who are you?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Agentis selects the right skill set for your role.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {PERSONAS.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              padding: '16px',
              borderRadius: 12,
              border: selected?.id === p.id
                ? '1.5px solid var(--fg)'
                : '0.5px solid var(--border)',
              background: selected?.id === p.id ? 'var(--surface-2)' : 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6, color: 'var(--fg)' }}>
              {p.icon}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>
              {p.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
              {p.description}
            </div>
            <div>
              {p.skills.map(sid => {
                const sk = SKILLS[sid]
                if (!sk) return null
                return (
                  <span
                    key={sid}
                    style={{
                      display: 'inline-block',
                      padding: '1px 7px',
                      borderRadius: 20,
                      border: `0.5px solid ${sk.color.border}`,
                      background: sk.color.bg,
                      color: sk.color.text,
                      fontSize: 10,
                      fontWeight: 500,
                      margin: '1px',
                    }}
                  >
                    {sk.label}
                  </span>
                )
              })}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={onNext} disabled={!selected}>
          Next — pick a task →
        </button>
      </div>
    </div>
  )
}
