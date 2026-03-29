# Channels

Channels allow you to connect Agentis to external messaging platforms. Once configured, you can test connectivity directly from the UI.

---

## Supported Channels

| Channel | Category | Difficulty | Send Test |
|---|---|---|---|
| Telegram | Messaging | Easy | ✅ |
| Discord | Messaging | Easy | ✅ |
| Slack | Messaging | Easy | ✅ |
| Matrix / Element | Messaging | Medium | ✅ |
| Webhook | Developer | Easy | ✅ |
| GitHub | Developer | Easy | ✅ |
| GitLab | Developer | Easy | ✅ |
| Bluesky | Social | Medium | ✅ |
| Mastodon | Social | Medium | ✅ |
| Webex | Enterprise | Medium | ✅ |
| PagerDuty | Notifications | Medium | ✅ |
| Email (SMTP) | Messaging | Easy | — |
| WhatsApp (Meta API) | Messaging | Medium | — |
| LinkedIn | Social | Hard | — |
| Threads | Social | Hard | — |

---

## Setting Up a Channel

1. Go to **Channels** in the sidebar
2. Click the channel you want to configure
3. Fill in the required fields (token, webhook URL, etc.)
4. Click **Test Connection** to verify
5. Click **Save**

Each channel shows a setup guide with links to where you get the credentials.

---

## Example — Discord

1. Open your Discord server → channel settings → Integrations → Webhooks
2. Click **New Webhook**, copy the URL
3. Paste it into Agentis → Channels → Discord → Webhook URL
4. Click **Test** — a test message will appear in the Discord channel

---

## Example — Telegram

1. Message `@BotFather` on Telegram → `/newbot`
2. Copy the bot token
3. Get your Chat ID (forward a message to `@userinfobot`)
4. Paste both into Agentis → Channels → Telegram
5. Click **Test**

---

## Coming Soon

> The current Channels page lets you configure and test connections. The following features are in development:

- **Agent-triggered messaging** — automatically send a message to a channel when an agent completes a task (e.g., "post the analysis to #research-slack when Universe finishes")
- **Inbound triggers** — start an Agentis task by sending a message to a bot (e.g., DM your Telegram bot to kick off a workflow)
- **Scheduled delivery** — send daily/weekly digests from agent outputs to a channel
- **Multi-channel broadcast** — send one agent output to multiple channels simultaneously
- **Rich formatting** — auto-format agent markdown output for each platform (Slack blocks, Discord embeds, Telegram HTML)

---

## Technical Notes

Channel credentials are stored in your browser's `localStorage`. They never leave your machine unless you export your settings. There is no server-side credential storage.
