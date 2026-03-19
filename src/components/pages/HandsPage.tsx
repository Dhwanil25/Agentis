import { useState } from 'react'

type HandTab = 'available' | 'active'
type HandStatus = 'READY' | 'WRITE-MASKED' | 'INACTIVE'

interface Hand {
  id: string
  name: string
  description: string
  status: HandStatus
  tools: string[]
}

const HANDS: Hand[] = [
  {
    id: 'browser',
    name: 'Browser Hand',
    description: 'Full web browsing capability. Navigate pages, click elements, fill forms, extract content, and take screenshots.',
    status: 'READY',
    tools: ['navigate', 'click', 'type', 'read', 'screenshot'],
  },
  {
    id: 'clip',
    name: 'Clip Hand',
    description: 'Read and write clipboard content. Copy structured data between agents and external applications.',
    status: 'WRITE-MASKED',
    tools: ['read', 'write'],
  },
  {
    id: 'collector',
    name: 'Collector Hand',
    description: 'Gather, aggregate, and structure data from multiple sources into unified collections.',
    status: 'READY',
    tools: ['collect', 'aggregate', 'deduplicate', 'export'],
  },
  {
    id: 'load',
    name: 'Load Hand',
    description: 'Load and parse files, documents, PDFs, CSVs, and structured data into agent context.',
    status: 'READY',
    tools: ['file_read', 'parse_pdf', 'parse_csv', 'parse_json'],
  },
  {
    id: 'predictor',
    name: 'Predictor Hand',
    description: 'Run inference and prediction tasks. Classify inputs, forecast outcomes, and score probabilities.',
    status: 'READY',
    tools: ['classify', 'predict', 'score', 'rank'],
  },
  {
    id: 'researcher',
    name: 'Researcher Hand',
    description: 'Deep web research with automatic source verification, citation extraction, and synthesis.',
    status: 'READY',
    tools: ['web_search', 'fetch', 'extract', 'cite'],
  },
  {
    id: 'trading',
    name: 'Trading Hand',
    description: 'Market data access, price monitoring, portfolio tracking, and trade signal generation.',
    status: 'READY',
    tools: ['price', 'portfolio', 'signal', 'alert'],
  },
  {
    id: 'twitter',
    name: 'Twitter Hand',
    description: 'Read and post to Twitter/X. Monitor mentions, schedule tweets, and track engagement.',
    status: 'WRITE-MASKED',
    tools: ['read', 'post', 'reply', 'search'],
  },
]

const STATUS_COLOR: Record<HandStatus, { bg: string; border: string; text: string }> = {
  'READY':        { bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.4)', text: '#1D9E75' },
  'WRITE-MASKED': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', text: '#f97316' },
  'INACTIVE':     { bg: 'rgba(255,255,255,0.04)', border: 'var(--border)', text: 'var(--muted)' },
}

export function HandsPage() {
  const [tab, setTab] = useState<HandTab>('available')
  const [active, setActive] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setActive(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const activeHands = HANDS.filter(h => active.has(h.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Hands</span>
      </div>

      <div className="of-page-content">
        <div className="of-info-banner" style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Hands — Curated Autonomous Capability Packages</span>
          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
            Hands bundle tools, permissions, and agent instructions into ready-to-activate capability packs.
          </span>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn${tab === 'available' ? ' active' : ''}`} onClick={() => setTab('available')}>
            Available ({HANDS.length})
          </button>
          <button className={`tab-btn${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
            Active ({active.size})
          </button>
        </div>

        {tab === 'available' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {HANDS.map(hand => {
              const sc = STATUS_COLOR[hand.status]
              const isActive = active.has(hand.id)
              return (
                <div key={hand.id} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{hand.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '2px 7px', borderRadius: 4,
                      background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                    }}>
                      {hand.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10 }}>
                    {hand.description}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {hand.tools.map(t => (
                      <span key={t} style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 4,
                        background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    className={isActive ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => toggle(hand.id)}
                    style={{ fontSize: 12, padding: '6px 16px' }}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'active' && (
          activeHands.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 20px', gap: 12,
            }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>-</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>No active hands</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
                Activate a hand from the Available tab to give agents expanded capabilities.
              </div>
              <button className="btn-primary" onClick={() => setTab('available')} style={{ marginTop: 4, fontSize: 13 }}>
                Browse Hands
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {activeHands.map(hand => {
                const sc = STATUS_COLOR[hand.status]
                return (
                  <div key={hand.id} className="card-orange" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)' }}>{hand.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 4,
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      }}>
                        {hand.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10 }}>
                      {hand.description}
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={() => toggle(hand.id)}
                      style={{ fontSize: 12, padding: '6px 16px' }}
                    >
                      Deactivate
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
