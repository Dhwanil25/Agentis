import { useState } from 'react'
import { WORKFLOW_TEMPLATES } from '@/data/templates'
import type { TemplateCategory } from '@/types/templates'

const CATEGORIES: { id: TemplateCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'product', label: 'Product' },
]

interface Props {
  selected: string | null
  onSelect: (templateId: string) => void
  onNext: () => void
  onBack: () => void
}

export function TemplateBrowser({ selected, onSelect, onNext, onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all')

  const filtered = activeCategory === 'all'
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter(t => t.category === activeCategory)

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Choose a workflow template</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>
        Each template runs a multi-agent pipeline optimised for the task.
      </p>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid var(--border)', paddingBottom: 0 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '7px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeCategory === cat.id ? '2px solid var(--fg)' : '2px solid transparent',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              color: activeCategory === cat.id ? 'var(--fg)' : 'var(--muted)',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            style={{
              padding: '18px',
              borderRadius: 12,
              border: selected === template.id
                ? '1.5px solid var(--fg)'
                : '0.5px solid var(--border)',
              background: selected === template.id ? 'var(--surface-2)' : 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{template.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>
              {template.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
              {template.description}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} style={{
                  fontSize: 10,
                  padding: '1px 7px',
                  borderRadius: 20,
                  background: 'var(--bg)',
                  border: '0.5px solid var(--border)',
                  color: 'var(--muted)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              ~{template.estimatedMinutes} min · {template.nodeDefinitions.length} agents
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext} disabled={!selected}>
          Next — preview workflow →
        </button>
      </div>
    </div>
  )
}
