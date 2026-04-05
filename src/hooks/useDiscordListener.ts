// ── Discord Listen Mode ────────────────────────────────────────────────────────
// Polls Discord for !run commands while Agentis is open, runs agents, replies.

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY  = 'agentis_channels'
const LAST_MSG_KEY = 'agentis_discord_last_msg'
const PREFIX       = '!run'
const POLL_MS      = 30_000

interface DiscordMsg {
  id: string
  content: string
  author: { id: string; bot?: boolean }
}

function getCfg() {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const d   = all.discord ?? {}
    return {
      botToken:      ((d.botToken      as string | undefined) ?? '').trim(),
      channelId:     ((d.channelId     as string | undefined) ?? '').trim(),
      listenEnabled: d.listenEnabled === 'true',
    }
  } catch { return { botToken: '', channelId: '', listenEnabled: false } }
}

function dFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`/discord-api${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
}

async function sendMsg(token: string, channelId: string, text: string) {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += 1990) chunks.push(text.slice(i, i + 1990))
  for (const chunk of chunks) {
    await dFetch(`/api/v10/channels/${channelId}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ content: chunk }),
    })
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 400))
  }
}

export interface DiscordListenerStatus {
  active:    boolean
  lastCheck: number | null
  error:     string | null
  processed: number
}

export function useDiscordListener({
  navigate,
}: {
  navigate: (page: string, opts?: {
    autoStart?: string
    onComplete?: (output: string) => void
    followUp?: string
    onFollowUpComplete?: (output: string) => void
  }) => void
}) {
  const [status, setStatus] = useState<DiscordListenerStatus>({
    active: false, lastCheck: null, error: null, processed: 0,
  })

  const navigateRef       = useRef(navigate)
  navigateRef.current     = navigate

  const botIdRef          = useRef<string | null>(null)
  const pendingRef        = useRef<{ channelId: string; botToken: string; prompt: string } | null>(null)
  // Tracks an active session so follow-up messages can continue the conversation
  const followUpSession   = useRef<{ channelId: string; botToken: string } | null>(null)
  const followUpPending   = useRef(false)

  // Polling
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const start = async () => {
      const cfg = getCfg()
      if (!cfg.listenEnabled || !cfg.botToken || !cfg.channelId) {
        setStatus(s => ({ ...s, active: false }))
        return
      }

      setStatus(s => ({ ...s, active: true, error: null }))

      // Get bot's own user ID so we don't react to our own messages
      try {
        const me = await dFetch('/api/v10/users/@me', cfg.botToken)
        if (me.ok) {
          const d = await me.json() as { id: string }
          botIdRef.current = d.id
        }
      } catch { /* ignore */ }

      const poll = async () => {
        if (cancelled) return
        const { botToken, channelId } = getCfg()
        console.log('[Discord] poll tick — botToken:', !!botToken, 'channelId:', channelId)
        if (!botToken || !channelId) return

        try {
          const lastId = localStorage.getItem(LAST_MSG_KEY)
          const url    = lastId
            ? `/api/v10/channels/${channelId}/messages?after=${lastId}&limit=10`
            : `/api/v10/channels/${channelId}/messages?limit=5`

          console.log('[Discord] fetching messages, url:', url)
          const res = await dFetch(url, botToken)
          console.log('[Discord] response status:', res.status)
          if (!res.ok) { setStatus(s => ({ ...s, error: `Discord ${res.status}` })); return }

          const msgs = (await res.json() as DiscordMsg[]).reverse() // oldest first
          console.log('[Discord] messages received:', msgs.length, msgs.map(m => ({ id: m.id, content: m.content.slice(0, 50), bot: m.author.bot })))

          setStatus(s => ({ ...s, lastCheck: Date.now(), error: null }))

          let lastAdvancedId: string | null = lastId
          for (const msg of msgs) {
            if (cancelled) break
            if (msg.author.bot) { lastAdvancedId = msg.id; continue }
            if (msg.author.id === botIdRef.current) { lastAdvancedId = msg.id; continue }

            const trimmed = msg.content.trim().toLowerCase()
            const isRun   = trimmed.startsWith(PREFIX)

            // ── New !run task ────────────────────────────────────────────
            if (isRun) {
              if (pendingRef.current || followUpPending.current) break // busy — retry next poll

              const prompt = msg.content.slice(PREFIX.length).trim()
              if (!prompt) { lastAdvancedId = msg.id; continue }

              // Starting a new task clears any previous follow-up session
              followUpSession.current = null

              await sendMsg(botToken, channelId,
                `Running agents for: **${prompt.slice(0, 100)}${prompt.length > 100 ? '…' : ''}**\n*This may take a minute...*`
              )

              lastAdvancedId = msg.id
              pendingRef.current = { channelId, botToken, prompt }
              navigateRef.current('universe', {
                autoStart: prompt,
                onComplete: (output: string) => {
                  pendingRef.current = null
                  followUpSession.current = { channelId, botToken }
                  const header = `**Result for:** \`${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}\`\n\n`
                  void sendMsg(botToken, channelId, header + output)
                    .then(() => {
                      setStatus(s => ({ ...s, processed: s.processed + 1 }))
                      void sendMsg(botToken, channelId,
                        `*Session active — reply with a follow-up question, or \`!run <new prompt>\` to start a new task.*`
                      )
                    })
                },
              })

            // ── Follow-up message ────────────────────────────────────────
            } else if (followUpSession.current && !followUpPending.current) {
              const { channelId: fChan, botToken: fToken } = followUpSession.current
              const question = msg.content.trim()
              if (!question) { lastAdvancedId = msg.id; continue }

              followUpPending.current = true
              await sendMsg(fToken, fChan, `*Processing follow-up...*`)
              lastAdvancedId = msg.id

              navigateRef.current('universe', {
                followUp: question,
                onFollowUpComplete: (output: string) => {
                  followUpPending.current = false
                  void sendMsg(fToken, fChan, output)
                    .then(() => setStatus(s => ({ ...s, processed: s.processed + 1 })))
                },
              })

            } else {
              lastAdvancedId = msg.id
            }
          }
          if (lastAdvancedId && lastAdvancedId !== lastId) localStorage.setItem(LAST_MSG_KEY, lastAdvancedId)
        } catch (e) {
          console.error('[Discord] poll error:', e)
          setStatus(s => ({ ...s, error: e instanceof Error ? e.message : 'Poll failed' }))
        }
      }

      await poll()
      if (!cancelled) timerId = setInterval(poll, POLL_MS)
    }

    void start()

    const restart = () => {
      cancelled = true
      if (timerId) clearInterval(timerId)
      timerId = null
      cancelled = false
      void start()
    }

    // Same-tab saves (custom event from ChannelsPage)
    window.addEventListener('agentis_channels_update', restart)
    // Cross-tab saves (standard storage event)
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) restart() }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      if (timerId) clearInterval(timerId)
      window.removeEventListener('agentis_channels_update', restart)
      window.removeEventListener('storage', onStorage)
      setStatus(s => ({ ...s, active: false }))
    }
  }, []) // runs once on mount; reacts to config changes via events

  return status
}
