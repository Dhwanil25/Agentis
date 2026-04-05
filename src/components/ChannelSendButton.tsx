// ── ChannelSendButton ─────────────────────────────────────────────────────────
// Reusable "send to channel" dropdown. Returns null if no channels are configured.

import { useState } from 'react'
import { getConfiguredChannels, sendToChannel } from '@/lib/channelDispatch'

interface Props {
  message: string
  style?: React.CSSProperties
}

export function ChannelSendButton({ message, style }: Props) {
  const channels = getConfiguredChannels()
  const [open,    setOpen]    = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null)

  if (channels.length === 0) return null

  const send = async (channelId: string) => {
    setSending(channelId)
    setOpen(false)
    const res = await sendToChannel(channelId, message)
    setSending(null)
    setResult(res)
    setTimeout(() => setResult(null), 4000)
  }

  const baseStyle: React.CSSProperties = { fontSize: 10, padding: '2px 8px', ...style }

  // Feedback state
  if (result) {
    return (
      <span style={{ fontSize: 10, padding: '2px 8px', color: result.ok ? '#10b981' : '#ef4444' }}>
        {result.ok ? `✓ ${result.msg}` : `✗ ${result.msg}`}
      </span>
    )
  }

  // Single channel — skip dropdown
  if (channels.length === 1) {
    const ch = channels[0]
    return (
      <button
        className="btn-ghost"
        onClick={() => void send(ch.id)}
        disabled={!!sending}
        style={baseStyle}
      >
        {sending ? 'Sending…' : `↑ ${ch.name}`}
      </button>
    )
  }

  // Multiple channels — dropdown
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(o => !o)}
        disabled={!!sending}
        style={baseStyle}
      >
        {sending ? 'Sending…' : '↑ Channel ▾'}
      </button>
      {open && (
        <>
          {/* Click-away overlay */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, zIndex: 100, minWidth: 150,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => void send(ch.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 12, color: 'var(--fg)',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {ch.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
