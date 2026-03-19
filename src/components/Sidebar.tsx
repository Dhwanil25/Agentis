import { useEffect, useState } from 'react'

type Page =
  | 'chat' | 'overview' | 'analytics' | 'logs' | 'sessions'
  | 'approvals' | 'comms' | 'workflows' | 'scheduler'
  | 'channels' | 'skills' | 'hands' | 'settings'

interface Props {
  current: Page
  navigate: (page: Page) => void
  engineRunning: boolean
}

interface Agent {
  id: string
  name: string
  state: string
}

export function Sidebar({ current, navigate, engineRunning }: Props) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    if (!engineRunning) { setAgents([]); return }
    let active = true
    const poll = async () => {
      try {
        const res = await fetch('/agentis-proxy/api/agents', { signal: AbortSignal.timeout(3000) })
        if (res.ok && active) setAgents(await res.json() as Agent[])
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { active = false; clearInterval(id) }
  }, [engineRunning])

  const runningCount = agents.filter(a => a.state === 'Running').length

  const sections: { label: string; items: { id: Page; name: string }[] }[] = [
    {
      label: 'CHAT',
      items: [{ id: 'chat', name: 'Chat' }],
    },
    {
      label: 'MONITOR',
      items: [
        { id: 'overview', name: 'Overview' },
        { id: 'analytics', name: 'Analytics' },
        { id: 'logs', name: 'Logs' },
      ],
    },
    {
      label: 'AGENTS',
      items: [
        { id: 'sessions', name: 'Sessions' },
        { id: 'approvals', name: 'Approvals' },
        { id: 'comms', name: 'Comms' },
      ],
    },
    {
      label: 'AUTOMATION',
      items: [
        { id: 'workflows', name: 'Workflows' },
        { id: 'scheduler', name: 'Scheduler' },
      ],
    },
    {
      label: 'EXTENSIONS',
      items: [
        { id: 'channels', name: 'Channels' },
        { id: 'skills', name: 'Skills' },
        { id: 'hands', name: 'Hands' },
      ],
    },
    {
      label: 'SYSTEM',
      items: [{ id: 'settings', name: 'Settings' }],
    },
  ]

  return (
    <div style={{
      width: 160,
      flexShrink: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo row */}
      <div style={{
        padding: '14px 12px 10px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {/* Orange A logo */}
          <div style={{
            width: 22,
            height: 22,
            background: 'var(--orange)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '-0.02em' }}>A</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.02em' }}>AGENTIS</span>
          <span className="badge badge-orange" style={{ fontSize: 9, padding: '1px 5px', marginLeft: 'auto' }}>v0.1</span>
        </div>

        {/* Agent status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>
            {runningCount} agent{runningCount !== 1 ? 's' : ''} running
          </span>
          <span className="badge badge-orange" style={{ fontSize: 9, padding: '1px 5px' }}>HTTP</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {sections.map(section => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              padding: '8px 12px 4px',
            }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const isActive = current === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 12px',
                    background: isActive ? 'var(--orange-bg)' : 'none',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? 'var(--orange)' : 'transparent'}`,
                    color: isActive ? 'var(--orange)' : 'var(--muted)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const t = e.currentTarget
                      t.style.color = 'var(--fg)'
                      t.style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const t = e.currentTarget
                      t.style.color = 'var(--muted)'
                      t.style.background = 'none'
                    }
                  }}
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom hint */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.02em' }}>
          Ctrl+K agents
        </div>
      </div>
    </div>
  )
}
