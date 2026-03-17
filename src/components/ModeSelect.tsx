interface Props {
  onSelectTemplate: () => void
  onSelectFreeform: () => void
  onBack: () => void
}

export function ModeSelect({ onSelectTemplate, onSelectFreeform, onBack }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>How do you want to work?</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px' }}>
        Templates run multi-agent pipelines with parallel execution and reflection loops.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {/* Template mode */}
        <button
          onClick={onSelectTemplate}
          style={{
            flex: '1 1 240px',
            padding: '24px',
            borderRadius: 14,
            border: '0.5px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.border = '1.5px solid var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.border = '0.5px solid var(--border)')}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>
            Use a template
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Pre-built multi-agent workflows for engineering, docs, and analysis.
            Parallel execution, critique loops, and artifact downloads.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['REST API', 'Full App', 'Documentation', 'CLI Tool'].map(tag => (
              <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-2)', border: '0.5px solid var(--border)', color: 'var(--muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Free-form mode */}
        <button
          onClick={onSelectFreeform}
          style={{
            flex: '1 1 240px',
            padding: '24px',
            borderRadius: 14,
            border: '0.5px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.border = '1.5px solid var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.border = '0.5px solid var(--border)')}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>✏️</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>
            Describe your task
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Free-form mode. Pick a persona, describe what you need, and get a
            sequential skill pipeline tailored to your role.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Flexible', 'Any task', 'Quick start'].map(tag => (
              <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-2)', border: '0.5px solid var(--border)', color: 'var(--muted)' }}>
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
      </div>
    </div>
  )
}
