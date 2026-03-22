import { useEffect, useState } from 'react'

type Page =
  | 'chat' | 'overview' | 'analytics' | 'logs' | 'sessions'
  | 'approvals' | 'comms' | 'workflows' | 'scheduler'
  | 'channels' | 'skills' | 'hands' | 'universe' | 'settings'

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

// SVG icons matching the reference nav design
const ICONS: Record<string, JSX.Element> = {
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  logs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  sessions: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  approvals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  comms: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <circle cx="4" cy="12" r="2"/>
      <circle cx="20" cy="12" r="2"/>
      <line x1="6" y1="12" x2="10" y2="12"/>
      <line x1="14" y1="12" x2="18" y2="12"/>
    </svg>
  ),
  workflows: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3"/>
      <circle cx="6" cy="6" r="3"/>
      <path d="M6 21V9a9 9 0 0 0 9 9"/>
    </svg>
  ),
  scheduler: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  channels: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9"/>
      <line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/>
      <line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
  skills: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  hands: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/>
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/>
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>
  ),
  universe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="3" x2="12" y2="21"/>
      <path d="M3 12h18"/>
      <path d="M4.2 7.5C6 9 9 10 12 10s6-1 7.8-2.5"/>
      <path d="M4.2 16.5C6 15 9 14 12 14s6 1 7.8 2.5"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
}

export function Sidebar({ current, navigate, engineRunning }: Props) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    AGENTS: true, // collapsed by default since it's in the reference
  })

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

  const toggleSection = (label: string) =>
    setCollapsed(s => ({ ...s, [label]: !s[label] }))

  const sections: { label: string; items: { id: Page; name: string; icon: JSX.Element }[] }[] = [
    {
      label: 'CHAT',
      items: [{ id: 'chat', name: 'Chat', icon: ICONS.chat }],
    },
    {
      label: 'MONITOR',
      items: [
        { id: 'overview', name: 'Overview', icon: ICONS.overview },
        { id: 'analytics', name: 'Analytics', icon: ICONS.analytics },
        { id: 'logs', name: 'Logs', icon: ICONS.logs },
      ],
    },
    {
      label: 'AGENTS',
      items: [
        { id: 'universe', name: 'Universe', icon: ICONS.universe },
        { id: 'sessions', name: 'Sessions', icon: ICONS.sessions },
        { id: 'approvals', name: 'Approvals', icon: ICONS.approvals },
        { id: 'comms', name: 'Comms', icon: ICONS.comms },
      ],
    },
    {
      label: 'AUTOMATION',
      items: [
        { id: 'workflows', name: 'Workflows', icon: ICONS.workflows },
        { id: 'scheduler', name: 'Scheduler', icon: ICONS.scheduler },
      ],
    },
    {
      label: 'EXTENSIONS',
      items: [
        { id: 'channels', name: 'Channels', icon: ICONS.channels },
        { id: 'skills', name: 'Skills', icon: ICONS.skills },
        { id: 'hands', name: 'Hands', icon: ICONS.hands },
      ],
    },
    {
      label: 'SYSTEM',
      items: [{ id: 'settings', name: 'Settings', icon: ICONS.settings }],
    },
  ]

  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo block */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <img
            src="/favicon.png"
            alt="Agentis"
            style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.06em' }}>AGENTIS</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>v0.1</div>
          </div>
        </div>

        {/* Agent status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: engineRunning ? 'var(--green)' : '#555',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {runningCount} agent{runningCount !== 1 ? 's' : ''} running
            </span>
          </div>
          <span className="badge badge-accent" style={{ fontSize: 9, padding: '2px 7px' }}>HTTP</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 8px' }}>
        {sections.map(section => {
          const isCollapsed = collapsed[section.label]
          return (
            <div key={section.label} style={{ marginBottom: 4 }}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.label)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 16px 4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--muted)',
                }}>
                  {section.label}
                </span>
                <svg
                  width="10" height="10" viewBox="0 0 10 10"
                  style={{ color: 'var(--muted)', opacity: 0.5, transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Nav items */}
              {!isCollapsed && section.items.map(item => {
                const isActive = current === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 16px',
                      background: isActive ? 'var(--accent)' : 'none',
                      border: 'none',
                      borderRadius: isActive ? 0 : 0,
                      color: isActive ? '#fff' : 'var(--muted)',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        const t = e.currentTarget
                        t.style.color = 'var(--fg)'
                        t.style.background = 'rgba(255,255,255,0.04)'
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
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.65 }}>
                      {item.icon}
                    </span>
                    {item.name}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Bottom hint */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.02em' }}>
          Ctrl+K agents
        </div>
      </div>
    </div>
  )
}
