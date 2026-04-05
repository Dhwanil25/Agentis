// ── Channel Dispatch ──────────────────────────────────────────────────────────
// Reads saved configs from ChannelsPage and sends messages to any channel.

const STORAGE_KEY = 'agentis_channels'

export interface ConfiguredChannel {
  id:   string
  name: string
}

const CHANNEL_NAMES: Record<string, string> = {
  telegram: 'Telegram', discord: 'Discord', slack: 'Slack', email: 'Email',
  whatsapp: 'WhatsApp', matrix: 'Matrix', mattermost: 'Mattermost',
  teams: 'Microsoft Teams', googlechat: 'Google Chat', webex: 'Webex',
  github: 'GitHub', gitlab: 'GitLab', jira: 'Jira',
  bluesky: 'Bluesky', mastodon: 'Mastodon', reddit: 'Reddit', linkedin: 'LinkedIn',
  pagerduty: 'PagerDuty', sms: 'SMS (Twilio)',
}

export function getConfiguredChannels(): ConfiguredChannel[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    return Object.keys(all).map(id => ({ id, name: CHANNEL_NAMES[id] ?? id }))
  } catch { return [] }
}

function getConfig(channelId: string): Record<string, string> {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Record<string, string>>
    return all[channelId] ?? {}
  } catch { return {} }
}

/** Truncate message to avoid hitting API limits */
function truncate(text: string, max = 3800): string {
  return text.length > max ? text.slice(0, max) + '\n\n[...truncated]' : text
}

export async function sendToChannel(channelId: string, message: string): Promise<{ ok: boolean; msg: string }> {
  const cfg = getConfig(channelId)
  const body = truncate(message)

  try {
    switch (channelId) {

      case 'telegram': {
        const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.chatId, text: body, parse_mode: 'Markdown' }),
        })
        const d = await res.json() as { ok: boolean; description?: string }
        return d.ok ? { ok: true, msg: 'Sent to Telegram' } : { ok: false, msg: d.description ?? 'Telegram error' }
      }

      case 'discord': {
        const token = cfg.botToken?.trim()
        const channelId = cfg.channelId?.trim()
        if (token && channelId) {
          const res = await fetch(`/discord-api/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: body }),
          })
          const d = await res.json() as { id?: string; message?: string }
          return res.ok ? { ok: true, msg: 'Sent to Discord' } : { ok: false, msg: d.message ?? `Discord error ${res.status}` }
        }
        // Fallback to webhook
        const res = await fetch(cfg.webhookUrl?.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: body }),
        })
        return res.ok ? { ok: true, msg: 'Sent to Discord' } : { ok: false, msg: `Discord error ${res.status}` }
      }

      case 'slack': {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body }),
        })
        const text = await res.text()
        return text === 'ok' ? { ok: true, msg: 'Sent to Slack' } : { ok: false, msg: `Slack: ${text}` }
      }

      case 'teams':
      case 'googlechat':
      case 'mattermost': {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: body }),
        })
        return res.ok ? { ok: true, msg: `Sent to ${CHANNEL_NAMES[channelId]}` } : { ok: false, msg: `Error ${res.status}` }
      }

      case 'webex': {
        const res = await fetch('https://webexapis.com/v1/messages', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cfg.botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: cfg.roomId, markdown: body }),
        })
        return res.ok ? { ok: true, msg: 'Sent to Webex' } : { ok: false, msg: `Webex error ${res.status}` }
      }

      case 'matrix': {
        const txnId = Date.now()
        const res = await fetch(
          `${cfg.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(cfg.roomId)}/send/m.room.message/${txnId}`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ msgtype: 'm.text', body }),
          }
        )
        return res.ok ? { ok: true, msg: 'Sent to Matrix' } : { ok: false, msg: `Matrix error ${res.status}` }
      }

      case 'bluesky': {
        // Auth first
        const authRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cfg.handle, password: cfg.appPassword }),
        })
        const auth = await authRes.json() as { accessJwt?: string; did?: string; error?: string }
        if (!auth.accessJwt) return { ok: false, msg: auth.error ?? 'Bluesky auth failed' }

        const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${auth.accessJwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo: auth.did,
            collection: 'app.bsky.feed.post',
            record: { $type: 'app.bsky.feed.post', text: body.slice(0, 300), createdAt: new Date().toISOString() },
          }),
        })
        return postRes.ok ? { ok: true, msg: 'Posted to Bluesky' } : { ok: false, msg: `Bluesky post error ${postRes.status}` }
      }

      case 'mastodon': {
        const res = await fetch(`${cfg.instanceUrl}/api/v1/statuses`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: body.slice(0, 500) }),
        })
        return res.ok ? { ok: true, msg: 'Posted to Mastodon' } : { ok: false, msg: `Mastodon error ${res.status}` }
      }

      case 'github': {
        const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/issues`, {
          method: 'POST',
          headers: { 'Authorization': `token ${cfg.token}`, 'Content-Type': 'application/json', 'User-Agent': 'Agentis' },
          body: JSON.stringify({ title: `Agentis Result — ${new Date().toLocaleString()}`, body }),
        })
        const d = await res.json() as { html_url?: string; message?: string }
        return res.ok ? { ok: true, msg: `Issue created: ${d.html_url}` } : { ok: false, msg: d.message ?? 'GitHub error' }
      }

      case 'pagerduty': {
        const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: cfg.integrationKey,
            event_action: 'trigger',
            payload: { summary: body.slice(0, 200), severity: 'info', source: 'agentis' },
          }),
        })
        const d = await res.json() as { status?: string }
        return d.status === 'success' ? { ok: true, msg: 'PagerDuty incident triggered' } : { ok: false, msg: 'PagerDuty error' }
      }

      default:
        return { ok: false, msg: `Send not implemented for ${channelId}` }
    }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'Send failed' }
  }
}
