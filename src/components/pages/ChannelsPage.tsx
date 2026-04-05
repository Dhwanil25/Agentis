import { useState, useEffect } from 'react'

type ChannelCategory = 'all' | 'messaging' | 'social' | 'enterprise' | 'developer' | 'notifications'

interface FieldDef {
  key: string
  label: string
  placeholder: string
  type?: 'text' | 'password' | 'url' | 'number' | 'toggle'
  hint?: string
  docsUrl?: string
  optional?: boolean  // if true, not required for Save to be enabled
}

interface ChannelDef {
  id: string
  name: string
  category: Exclude<ChannelCategory, 'all'>
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  time: string
  fields: FieldDef[]
  testable: boolean
  /** Custom validation: returns true if the current values are sufficient to save/test */
  isValid?: (values: Record<string, string>) => boolean
}

// ── Channel definitions with setup fields ─────────────────────────────────────

const CHANNELS: ChannelDef[] = [
  {
    id: 'telegram', name: 'Telegram', category: 'messaging',
    description: 'Send and receive messages via Telegram Bot API',
    difficulty: 'Easy', time: '2 min', testable: true,
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456789:AAF...', type: 'password', hint: 'Create a bot via @BotFather on Telegram', docsUrl: 'https://core.telegram.org/bots#creating-a-new-bot' },
      { key: 'chatId', label: 'Chat ID', placeholder: '-1001234567890 or @username', hint: 'The chat, group, or channel ID to send messages to' },
    ],
  },
  {
    id: 'discord', name: 'Discord', category: 'messaging',
    description: 'Post to Discord channels via bot application or webhook',
    difficulty: 'Easy', time: '2 min', testable: true,
    isValid: (v) => !!(v.webhookUrl?.trim() || (v.botToken?.trim() && v.channelId?.trim())),
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'MTIz...', type: 'password', hint: 'Discord Developer Portal → Your App → Bot → Token', docsUrl: 'https://discord.com/developers/applications', optional: true },
      { key: 'channelId', label: 'Channel ID', placeholder: '1234567890123456789', hint: 'Right-click the channel → Copy Channel ID (enable Developer Mode in Discord settings first)', optional: true },
      { key: 'webhookUrl', label: 'Webhook URL (alternative to bot)', placeholder: 'https://discord.com/api/webhooks/...', type: 'url', hint: 'Channel Settings → Integrations → Webhooks → New Webhook → Copy URL', optional: true },
      { key: 'listenEnabled', label: 'Listen for !run commands', placeholder: '', type: 'toggle', hint: 'When on, Agentis polls this channel every 30s. Send "!run <your prompt>" to trigger agents.', optional: true },
    ],
  },
  {
    id: 'slack', name: 'Slack', category: 'messaging',
    description: 'Send messages to Slack workspaces via webhook',
    difficulty: 'Easy', time: '3 min', testable: true,
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'url', hint: 'Create at api.slack.com → Your Apps → Incoming Webhooks', docsUrl: 'https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks' },
    ],
  },
  {
    id: 'email', name: 'Email', category: 'messaging',
    description: 'Send emails via a configured SMTP endpoint or provider',
    difficulty: 'Easy', time: '3 min', testable: false,
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', placeholder: '587', type: 'number' },
      { key: 'fromEmail', label: 'From Address', placeholder: 'agent@yourdomain.com' },
      { key: 'smtpUser', label: 'Username', placeholder: 'your@email.com' },
      { key: 'smtpPass', label: 'Password / App Password', placeholder: '...', type: 'password', hint: 'For Gmail use an App Password, not your main password', docsUrl: 'https://support.google.com/accounts/answer/185833' },
    ],
  },
  {
    id: 'whatsapp', name: 'WhatsApp', category: 'messaging',
    description: 'Send WhatsApp messages via Meta Business API',
    difficulty: 'Medium', time: '5 min', testable: false,
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAABs...', type: 'password', docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/' },
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '123456789' },
      { key: 'toNumber', label: 'Recipient Number', placeholder: '+1234567890', hint: 'Include country code' },
    ],
  },
  {
    id: 'matrix', name: 'Matrix', category: 'messaging',
    description: 'Federated chat via Matrix/Element',
    difficulty: 'Medium', time: '4 min', testable: true,
    fields: [
      { key: 'homeserver', label: 'Homeserver URL', placeholder: 'https://matrix.org', type: 'url', docsUrl: 'https://spec.matrix.org/latest/client-server-api/' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'syt_...', type: 'password', hint: 'Element → Settings → Help & About → Access Token' },
      { key: 'roomId', label: 'Room ID', placeholder: '!roomid:matrix.org' },
    ],
  },
  {
    id: 'mattermost', name: 'Mattermost', category: 'enterprise',
    description: 'Post to self-hosted Mattermost via webhook',
    difficulty: 'Easy', time: '2 min', testable: true,
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://your-mattermost.com/hooks/...', type: 'url', hint: 'Main Menu → Integrations → Incoming Webhooks', docsUrl: 'https://developers.mattermost.com/integrate/webhooks/incoming/' },
    ],
  },
  {
    id: 'teams', name: 'Microsoft Teams', category: 'enterprise',
    description: 'Send messages to Teams channels via webhook',
    difficulty: 'Medium', time: '4 min', testable: true,
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', type: 'url', hint: 'Channel → … → Connectors → Incoming Webhook → Configure', docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook' },
    ],
  },
  {
    id: 'googlechat', name: 'Google Chat', category: 'enterprise',
    description: 'Send to Google Chat spaces via webhook',
    difficulty: 'Medium', time: '4 min', testable: true,
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://chat.googleapis.com/v1/spaces/...', type: 'url', hint: 'Space → Apps & Integrations → Manage Webhooks → Add Webhook', docsUrl: 'https://developers.google.com/chat/how-tos/webhooks' },
    ],
  },
  {
    id: 'webex', name: 'Webex', category: 'enterprise',
    description: 'Cisco Webex Teams integration',
    difficulty: 'Medium', time: '4 min', testable: true,
    fields: [
      { key: 'botToken', label: 'Bot Access Token', placeholder: '...', type: 'password', docsUrl: 'https://developer.webex.com/docs/bots' },
      { key: 'roomId', label: 'Room ID', placeholder: 'Y2lzY29...', hint: 'Get via developer.webex.com API Explorer' },
    ],
  },
  {
    id: 'github', name: 'GitHub', category: 'developer',
    description: 'Create issues, PRs, and comments on GitHub',
    difficulty: 'Easy', time: '3 min', testable: true,
    fields: [
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_...', type: 'password', hint: 'GitHub → Settings → Developer settings → Personal access tokens', docsUrl: 'https://github.com/settings/tokens' },
      { key: 'owner', label: 'Repository Owner', placeholder: 'username or org' },
      { key: 'repo', label: 'Repository Name', placeholder: 'my-repo' },
    ],
  },
  {
    id: 'gitlab', name: 'GitLab', category: 'developer',
    description: 'Integrate with GitLab repositories',
    difficulty: 'Easy', time: '3 min', testable: true,
    fields: [
      { key: 'token', label: 'Personal Access Token', placeholder: 'glpat-...', type: 'password', docsUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens' },
      { key: 'projectId', label: 'Project ID or path', placeholder: '12345678 or user/repo' },
      { key: 'instanceUrl', label: 'GitLab Instance URL', placeholder: 'https://gitlab.com', type: 'url' },
    ],
  },
  {
    id: 'jira', name: 'Jira', category: 'developer',
    description: 'Create and update Jira tickets',
    difficulty: 'Medium', time: '5 min', testable: false,
    fields: [
      { key: 'host', label: 'Jira Host', placeholder: 'yourcompany.atlassian.net' },
      { key: 'email', label: 'Account Email', placeholder: 'you@company.com' },
      { key: 'apiToken', label: 'API Token', placeholder: '...', type: 'password', docsUrl: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/' },
      { key: 'projectKey', label: 'Project Key', placeholder: 'PROJ' },
    ],
  },
  {
    id: 'bluesky', name: 'Bluesky', category: 'social',
    description: 'Post to Bluesky via AT Protocol',
    difficulty: 'Easy', time: '2 min', testable: true,
    fields: [
      { key: 'handle', label: 'Handle', placeholder: 'you.bsky.social', hint: 'Your Bluesky handle without the @' },
      { key: 'appPassword', label: 'App Password', placeholder: 'xxxx-xxxx-xxxx-xxxx', type: 'password', hint: 'Settings → Privacy and Security → App Passwords', docsUrl: 'https://bsky.app/settings/app-passwords' },
    ],
  },
  {
    id: 'mastodon', name: 'Mastodon', category: 'social',
    description: 'Post to Mastodon federated instances',
    difficulty: 'Easy', time: '2 min', testable: true,
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', placeholder: 'https://mastodon.social', type: 'url' },
      { key: 'accessToken', label: 'Access Token', placeholder: '...', type: 'password', hint: 'Preferences → Development → New Application', docsUrl: 'https://docs.joinmastodon.org/client/token/' },
    ],
  },
  {
    id: 'reddit', name: 'Reddit', category: 'social',
    description: 'Post to subreddits and handle replies',
    difficulty: 'Easy', time: '3 min', testable: false,
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: '...', hint: 'reddit.com/prefs/apps → Create App', docsUrl: 'https://www.reddit.com/prefs/apps' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: '...', type: 'password' },
      { key: 'username', label: 'Reddit Username', placeholder: 'u/yourname' },
      { key: 'password', label: 'Password', placeholder: '...', type: 'password' },
      { key: 'subreddit', label: 'Default Subreddit', placeholder: 'r/test' },
    ],
  },
  {
    id: 'linkedin', name: 'LinkedIn', category: 'social',
    description: 'Post to LinkedIn pages and profiles',
    difficulty: 'Medium', time: '4 min', testable: false,
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: '...', type: 'password', docsUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication' },
      { key: 'personUrn', label: 'Person URN', placeholder: 'urn:li:person:xxxx', hint: 'Get via LinkedIn API /v2/me endpoint' },
    ],
  },
  {
    id: 'pagerduty', name: 'PagerDuty', category: 'notifications',
    description: 'Trigger and resolve PagerDuty incidents',
    difficulty: 'Medium', time: '4 min', testable: true,
    fields: [
      { key: 'integrationKey', label: 'Integration Key', placeholder: 'a1b2c3d4...', hint: 'Service → Integrations → Events API v2', docsUrl: 'https://developer.pagerduty.com/docs/events-api-v2/overview/' },
    ],
  },
  {
    id: 'sms', name: 'SMS (Twilio)', category: 'notifications',
    description: 'Send SMS via Twilio',
    difficulty: 'Easy', time: '2 min', testable: false,
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC...', docsUrl: 'https://console.twilio.com' },
      { key: 'authToken', label: 'Auth Token', placeholder: '...', type: 'password' },
      { key: 'fromNumber', label: 'From Number', placeholder: '+1234567890' },
      { key: 'toNumber', label: 'To Number', placeholder: '+1987654321' },
    ],
  },
]

// ── localStorage persistence ───────────────────────────────────────────────────

const STORAGE_KEY = 'agentis_channels'

function loadAllConfigs(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return {} }
}

function saveConfig(channelId: string, config: Record<string, string>): void {
  const all = loadAllConfigs()
  all[channelId] = config
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function removeConfig(channelId: string): void {
  const all = loadAllConfigs()
  delete all[channelId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// ── Live test functions ────────────────────────────────────────────────────────

async function testChannel(channelId: string, cfg: Record<string, string>): Promise<{ ok: boolean; msg: string }> {
  try {
    switch (channelId) {
      case 'telegram': {
        const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.chatId, text: 'Agentis channel test — connection confirmed.' }),
        })
        const d = await res.json() as { ok: boolean; description?: string }
        return d.ok ? { ok: true, msg: 'Message sent to Telegram successfully' } : { ok: false, msg: d.description ?? 'Telegram API error' }
      }

      case 'discord': {
        const token = cfg.botToken?.trim()
        const channelId = cfg.channelId?.trim()
        if (token && channelId) {
          const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' }

          // Step 1: verify token
          const meRes = await fetch('/discord-api/api/v10/users/@me', { headers })
          if (meRes.status === 401) return { ok: false, msg: 'Invalid bot token — go to Developer Portal → Bot → Reset Token and paste the new one' }
          if (!meRes.ok) return { ok: false, msg: `Token check failed (${meRes.status})` }
          const me = await meRes.json() as { username?: string }

          // Step 2: verify channel access
          const chRes = await fetch(`/discord-api/api/v10/channels/${channelId}`, { headers })
          if (chRes.status === 404) return { ok: false, msg: 'Channel not found — check the Channel ID (right-click channel → Copy Channel ID)' }
          if (chRes.status === 403) return { ok: false, msg: `Bot "${me.username}" can't see this channel — in Discord, go to channel settings → Permissions → add the bot with View Channel ✓` }
          if (!chRes.ok) return { ok: false, msg: `Channel check failed (${chRes.status})` }

          // Step 3: send message
          const sendRes = await fetch(`/discord-api/api/v10/channels/${channelId}/messages`, {
            method: 'POST', headers,
            body: JSON.stringify({ content: 'Agentis channel test — connection confirmed.' }),
          })
          if (sendRes.ok) return { ok: true, msg: `Message sent via bot "${me.username}"` }
          let sd: { message?: string; code?: number } = {}
          try { sd = await sendRes.json() } catch { /* ignore */ }
          if (sendRes.status === 403) return { ok: false, msg: `Bot "${me.username}" can't send messages here — in channel settings → Permissions, add the bot with Send Messages ✓` }
          return { ok: false, msg: sd.message ?? `Discord error ${sendRes.status}` }
        }
        // Webhook fallback
        const res = await fetch(cfg.webhookUrl?.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Agentis channel test — connection confirmed.' }),
        })
        return res.ok ? { ok: true, msg: 'Message posted via Discord webhook' } : { ok: false, msg: `Discord error: ${res.status}` }
      }

      case 'slack': {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Agentis channel test — connection confirmed.' }),
        })
        const text = await res.text()
        return text === 'ok' ? { ok: true, msg: 'Message posted to Slack' } : { ok: false, msg: `Slack error: ${text}` }
      }

      case 'teams':
      case 'googlechat':
      case 'mattermost': {
        const res = await fetch(cfg.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Agentis channel test — connection confirmed.' }),
        })
        return res.ok ? { ok: true, msg: 'Message posted successfully' } : { ok: false, msg: `Error ${res.status}` }
      }

      case 'github': {
        const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
          headers: { 'Authorization': `token ${cfg.token}`, 'User-Agent': 'Agentis' },
        })
        const d = await res.json() as { full_name?: string; message?: string }
        return res.ok ? { ok: true, msg: `Connected to ${d.full_name}` } : { ok: false, msg: d.message ?? 'GitHub API error' }
      }

      case 'gitlab': {
        const base = cfg.instanceUrl || 'https://gitlab.com'
        const res = await fetch(`${base}/api/v4/projects/${encodeURIComponent(cfg.projectId)}`, {
          headers: { 'PRIVATE-TOKEN': cfg.token },
        })
        const d = await res.json() as { name?: string; message?: string }
        return res.ok ? { ok: true, msg: `Connected to ${d.name}` } : { ok: false, msg: d.message ?? 'GitLab API error' }
      }

      case 'bluesky': {
        const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cfg.handle, password: cfg.appPassword }),
        })
        const d = await res.json() as { did?: string; error?: string }
        return d.did ? { ok: true, msg: `Authenticated as ${cfg.handle}` } : { ok: false, msg: d.error ?? 'Bluesky auth failed' }
      }

      case 'mastodon': {
        const res = await fetch(`${cfg.instanceUrl}/api/v1/accounts/verify_credentials`, {
          headers: { 'Authorization': `Bearer ${cfg.accessToken}` },
        })
        const d = await res.json() as { username?: string; error?: string }
        return res.ok ? { ok: true, msg: `Connected as @${d.username}` } : { ok: false, msg: d.error ?? 'Mastodon auth failed' }
      }

      case 'matrix': {
        const res = await fetch(`${cfg.homeserver}/_matrix/client/v3/account/whoami`, {
          headers: { 'Authorization': `Bearer ${cfg.accessToken}` },
        })
        const d = await res.json() as { user_id?: string; errcode?: string }
        return res.ok ? { ok: true, msg: `Connected as ${d.user_id}` } : { ok: false, msg: d.errcode ?? 'Matrix auth failed' }
      }

      case 'pagerduty': {
        const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: cfg.integrationKey,
            event_action: 'trigger',
            payload: { summary: 'Agentis test event', severity: 'info', source: 'agentis' },
          }),
        })
        const d = await res.json() as { status?: string; message?: string }
        return d.status === 'success' ? { ok: true, msg: 'PagerDuty test event triggered' } : { ok: false, msg: d.message ?? 'PagerDuty error' }
      }

      case 'webex': {
        const res = await fetch('https://webexapis.com/v1/messages', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cfg.botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: cfg.roomId, text: 'Agentis channel test — connection confirmed.' }),
        })
        return res.ok ? { ok: true, msg: 'Message sent to Webex room' } : { ok: false, msg: `Webex error: ${res.status}` }
      }

      default:
        return { ok: true, msg: 'Configuration saved (live test not available for this channel)' }
    }
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : 'Request failed — check CORS or network' }
  }
}

// ── Setup drawer ──────────────────────────────────────────────────────────────

function SetupDrawer({
  channel,
  existing,
  onSave,
  onClose,
}: {
  channel: ChannelDef
  existing: Record<string, string>
  onSave: (channelId: string, cfg: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(channel.fields.map(f => [f.key, existing[f.key] ?? '']))
  )
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const [showFields, setShowFields] = useState<Record<string, boolean>>({})

  const allFilled = channel.isValid
    ? channel.isValid(values)
    : channel.fields.filter(f => !f.optional).every(f => values[f.key]?.trim())

  const handleSave = () => {
    saveConfig(channel.id, values)
    onSave(channel.id, values)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testChannel(channel.id, values)
    setTestResult(result)
    setTesting(false)
    if (result.ok) {
      // Auto-save on successful test
      saveConfig(channel.id, values)
      onSave(channel.id, values)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        width: 420, background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
              {channel.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {channel.description}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {channel.fields.map(field => (
              <div key={field.key}>
                {field.type === 'toggle' ? (
                  <button
                    onClick={() => setValues(s => ({ ...s, [field.key]: s[field.key] === 'true' ? 'false' : 'true' }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      background: values[field.key] === 'true' ? 'var(--accent-bg)' : 'var(--surface)',
                      border: `1px solid ${values[field.key] === 'true' ? 'var(--accent-border)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{field.label}</div>
                      {field.hint && <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{field.hint}</div>}
                    </div>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: values[field.key] === 'true' ? 'var(--accent)' : 'var(--border)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                      <div style={{ position: 'absolute', top: 2, left: values[field.key] === 'true' ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </button>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {field.label}
                      </label>
                      {field.type === 'password' && (
                        <button
                          onClick={() => setShowFields(s => ({ ...s, [field.key]: !s[field.key] }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', padding: 0 }}
                        >
                          {showFields[field.key] ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                    <input
                      type={field.type === 'password' && !showFields[field.key] ? 'password' : 'text'}
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(s => ({ ...s, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ width: '100%', fontSize: 12, fontFamily: field.type === 'password' ? 'var(--font-mono)' : 'var(--font-sans)' }}
                    />
                    {(field.hint || field.docsUrl) && (
                      <div style={{ marginTop: 5, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {field.hint}
                        {field.docsUrl && (
                          <>
                            {field.hint ? ' — ' : ''}
                            <a href={field.docsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                              Docs →
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Test result */}
          {testResult && (
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 6, fontSize: 12, lineHeight: 1.5,
              background: testResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: testResult.ok ? '#10b981' : '#ef4444',
            }}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
            </div>
          )}

          {/* Info for non-testable */}
          {!channel.testable && (
            <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 6, fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.6 }}>
              Save your credentials above. This channel will be available for agents to use once saved.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexShrink: 0,
          background: 'var(--surface)',
        }}>
          {channel.testable && (
            <button
              className="btn-secondary"
              disabled={!allFilled || testing}
              onClick={() => void handleTest()}
              style={{ fontSize: 12 }}
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>
          )}
          <button
            className="btn-primary"
            disabled={!allFilled}
            onClick={handleSave}
            style={{ fontSize: 12, marginLeft: channel.testable ? 0 : 0 }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ fontSize: 12, marginLeft: 'auto' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Categories ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ChannelCategory, string> = {
  all: 'All', messaging: 'Messaging', social: 'Social',
  enterprise: 'Enterprise', developer: 'Developer', notifications: 'Notifications',
}

// ── Main ChannelsPage ──────────────────────────────────────────────────────────

export function ChannelsPage({ discordListening = false, discordProcessed = 0 }: { discordListening?: boolean; discordProcessed?: number }) {
  const [activeCategory, setActiveCategory] = useState<ChannelCategory>('all')
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>(loadAllConfigs)
  const [setupChannel, setSetupChannel] = useState<ChannelDef | null>(null)

  // Reload on storage change (other tabs)
  useEffect(() => {
    const handler = () => setConfigs(loadAllConfigs())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const handleSave = (channelId: string, cfg: Record<string, string>) => {
    setConfigs(prev => ({ ...prev, [channelId]: cfg }))
    // Notify same-tab listeners (storage events only fire in other tabs)
    window.dispatchEvent(new CustomEvent('agentis_channels_update'))
  }

  const handleRemove = (channelId: string) => {
    removeConfig(channelId)
    setConfigs(prev => { const n = { ...prev }; delete n[channelId]; return n })
  }

  const categories: ChannelCategory[] = ['all', 'messaging', 'social', 'enterprise', 'developer', 'notifications']

  const filtered = activeCategory === 'all'
    ? CHANNELS
    : CHANNELS.filter(c => c.category === activeCategory)

  const configuredCount = Object.keys(configs).length

  const categoryCounts: Record<ChannelCategory, number> = {
    all: CHANNELS.length,
    messaging: CHANNELS.filter(c => c.category === 'messaging').length,
    social: CHANNELS.filter(c => c.category === 'social').length,
    enterprise: CHANNELS.filter(c => c.category === 'enterprise').length,
    developer: CHANNELS.filter(c => c.category === 'developer').length,
    notifications: CHANNELS.filter(c => c.category === 'notifications').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="of-page-title">Channels</span>
          {configuredCount > 0 && (
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              {configuredCount} CONFIGURED
            </span>
          )}
          {discordListening && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#10b981' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block', animation: 'blink 1.5s step-end infinite' }} />
              Discord listening{discordProcessed > 0 ? ` · ${discordProcessed} run${discordProcessed !== 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="of-page-content">
        {/* Category filter */}
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`tab-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({categoryCounts[cat]})
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {filtered.map(channel => {
            const isConfigured = !!configs[channel.id]
            return (
              <div
                key={channel.id}
                className="card"
                style={{
                  padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  border: isConfigured ? '1px solid rgba(16,185,129,0.35)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isConfigured ? '#10b981' : 'var(--fg)' }}>
                    {channel.name}
                  </span>
                  <span
                    className={isConfigured ? 'badge badge-green' : 'badge badge-gray'}
                    style={{ fontSize: 9 }}
                  >
                    {isConfigured ? 'CONFIGURED' : 'NOT SET'}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, flex: 1 }}>
                  {channel.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 3,
                      background: channel.difficulty === 'Easy' ? 'rgba(16,185,129,0.1)' : channel.difficulty === 'Medium' ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${channel.difficulty === 'Easy' ? 'rgba(16,185,129,0.3)' : channel.difficulty === 'Medium' ? 'rgba(249,115,22,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: channel.difficulty === 'Easy' ? '#10b981' : channel.difficulty === 'Medium' ? '#f97316' : '#ef4444',
                      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {channel.difficulty}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{channel.time}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isConfigured && (
                      <button
                        className="btn-ghost"
                        onClick={() => handleRemove(channel.id)}
                        style={{ fontSize: 10, color: '#ef4444', padding: '2px 6px' }}
                      >
                        Remove
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      onClick={() => setSetupChannel(channel)}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {isConfigured ? 'Edit' : 'Set up'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Setup drawer */}
      {setupChannel && (
        <SetupDrawer
          channel={setupChannel}
          existing={configs[setupChannel.id] ?? {}}
          onSave={handleSave}
          onClose={() => setSetupChannel(null)}
        />
      )}
    </div>
  )
}
