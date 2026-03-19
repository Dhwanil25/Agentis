import { useState } from 'react'

type ChannelCategory = 'all' | 'messaging' | 'social' | 'enterprise' | 'developer' | 'notifications'

interface Channel {
  name: string
  category: Exclude<ChannelCategory, 'all'>
  description: string
  difficulty: string
  time: string
}

const CHANNELS: Channel[] = [
  { name: 'Telegram', category: 'messaging', description: 'Send and receive messages via Telegram Bot API', difficulty: 'Easy', time: '2min' },
  { name: 'Discord', category: 'messaging', description: 'Post to Discord channels and webhooks', difficulty: 'Easy', time: '2min' },
  { name: 'Slack', category: 'messaging', description: 'Send messages and files to Slack workspaces', difficulty: 'Easy', time: '3min' },
  { name: 'WhatsApp', category: 'messaging', description: 'Send WhatsApp messages via Business API', difficulty: 'Medium', time: '5min' },
  { name: 'Signal', category: 'messaging', description: 'Encrypted messages via Signal protocol', difficulty: 'Medium', time: '5min' },
  { name: 'Matrix', category: 'messaging', description: 'Federated chat via Matrix/Element', difficulty: 'Medium', time: '4min' },
  { name: 'Email', category: 'messaging', description: 'Send emails via SMTP or provider API', difficulty: 'Easy', time: '2min' },
  { name: 'LINE', category: 'messaging', description: 'Send LINE messages in Asia Pacific', difficulty: 'Medium', time: '4min' },
  { name: 'Viber', category: 'messaging', description: 'Send messages via Viber Business API', difficulty: 'Medium', time: '4min' },
  { name: 'Messenger', category: 'social', description: 'Facebook Messenger via Meta Business API', difficulty: 'Medium', time: '5min' },
  { name: 'Reddit', category: 'social', description: 'Post to subreddits and handle replies', difficulty: 'Easy', time: '3min' },
  { name: 'Mastodon', category: 'social', description: 'Post to Mastodon federated instances', difficulty: 'Easy', time: '2min' },
  { name: 'Bluesky', category: 'social', description: 'Post to Bluesky via AT Protocol', difficulty: 'Easy', time: '2min' },
  { name: 'LinkedIn', category: 'social', description: 'Post to LinkedIn pages and profiles', difficulty: 'Medium', time: '4min' },
  { name: 'Microsoft Teams', category: 'enterprise', description: 'Send messages to Teams channels', difficulty: 'Medium', time: '4min' },
  { name: 'Mattermost', category: 'enterprise', description: 'Post to self-hosted Mattermost', difficulty: 'Easy', time: '2min' },
  { name: 'Google Chat', category: 'enterprise', description: 'Send to Google Chat spaces and rooms', difficulty: 'Medium', time: '4min' },
  { name: 'Webex', category: 'enterprise', description: 'Cisco Webex Teams integration', difficulty: 'Medium', time: '4min' },
  { name: 'GitHub', category: 'developer', description: 'Create issues, PRs, and comments on GitHub', difficulty: 'Easy', time: '3min' },
  { name: 'GitLab', category: 'developer', description: 'Integrate with GitLab repositories and CI', difficulty: 'Easy', time: '3min' },
  { name: 'Jira', category: 'developer', description: 'Create and update Jira tickets', difficulty: 'Medium', time: '5min' },
  { name: 'PagerDuty', category: 'notifications', description: 'Trigger and resolve PagerDuty incidents', difficulty: 'Medium', time: '4min' },
  { name: 'SMS', category: 'notifications', description: 'Send SMS via Twilio or provider', difficulty: 'Easy', time: '2min' },
  { name: 'Push Notifications', category: 'notifications', description: 'Mobile push via Firebase or APNs', difficulty: 'Medium', time: '5min' },
]

const CATEGORY_LABELS: Record<ChannelCategory, string> = {
  all: 'All',
  messaging: 'Messaging',
  social: 'Social',
  enterprise: 'Enterprise',
  developer: 'Developer',
  notifications: 'Notifications',
}

const CATEGORY_COUNTS: Record<ChannelCategory, number> = {
  all: CHANNELS.length,
  messaging: CHANNELS.filter(c => c.category === 'messaging').length,
  social: CHANNELS.filter(c => c.category === 'social').length,
  enterprise: CHANNELS.filter(c => c.category === 'enterprise').length,
  developer: CHANNELS.filter(c => c.category === 'developer').length,
  notifications: CHANNELS.filter(c => c.category === 'notifications').length,
}

export function ChannelsPage() {
  const [activeCategory, setActiveCategory] = useState<ChannelCategory>('all')

  const filteredChannels = activeCategory === 'all'
    ? CHANNELS
    : CHANNELS.filter(c => c.category === activeCategory)

  const categories: ChannelCategory[] = ['all', 'messaging', 'social', 'enterprise', 'developer', 'notifications']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="of-page-title">Channels</span>
          <span className="badge badge-gray" style={{ fontSize: 10 }}>
            {CHANNELS.length} CONFIGURED
          </span>
        </div>
      </div>

      <div className="of-page-content">
        {/* Category filter tabs */}
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`tab-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({CATEGORY_COUNTS[cat]})
            </button>
          ))}
        </div>

        {/* Channel grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {filteredChannels.map(channel => (
            <div
              key={channel.name}
              className="card"
              style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{channel.name}</span>
                <span className="badge badge-gray" style={{ fontSize: 9 }}>NOT CONFIGURED</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, flex: 1 }}>
                {channel.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {channel.difficulty} · {channel.time}
                </span>
                <button
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--orange)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Set up
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
