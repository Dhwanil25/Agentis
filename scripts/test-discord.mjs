// Run: node scripts/test-discord.mjs YOUR_BOT_TOKEN YOUR_CHANNEL_ID
// Example: node scripts/test-discord.mjs MTQ4N... 1234567890

const [,, TOKEN, CHANNEL_ID] = process.argv

if (!TOKEN || !CHANNEL_ID) {
  console.error('Usage: node scripts/test-discord.mjs YOUR_BOT_TOKEN YOUR_CHANNEL_ID')
  process.exit(1)
}

const headers = { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' }

async function run() {
  console.log('\n── Step 1: Verify bot token ──')
  const meRes = await fetch('https://discord.com/api/v10/users/@me', { headers })
  const me = await meRes.json()
  if (!meRes.ok) {
    console.error('✗ Invalid token:', me.message)
    process.exit(1)
  }
  console.log(`✓ Bot: ${me.username}#${me.discriminator} (id: ${me.id})`)

  console.log('\n── Step 2: Check channel access ──')
  const chRes = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}`, { headers })
  const ch = await chRes.json()
  if (chRes.status === 403) {
    console.error('✗ Bot cannot see this channel.')
    console.error('  → Make sure the bot is in the server that owns this channel')
    console.error('  → Channel response:', ch)
    process.exit(1)
  }
  if (chRes.status === 404) {
    console.error('✗ Channel not found. Wrong Channel ID?')
    process.exit(1)
  }
  if (!chRes.ok) {
    console.error(`✗ Channel error ${chRes.status}:`, ch)
    process.exit(1)
  }
  console.log(`✓ Channel: #${ch.name} (guild: ${ch.guild_id})`)

  console.log('\n── Step 3: Send test message ──')
  const sendRes = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST', headers,
    body: JSON.stringify({ content: '✓ Agentis test message — connection confirmed.' }),
  })
  const send = await sendRes.json()
  if (!sendRes.ok) {
    console.error(`✗ Send failed ${sendRes.status}:`, send)
    process.exit(1)
  }
  console.log(`✓ Message sent! ID: ${send.id}`)
  console.log('\n✓ All checks passed — Discord is working correctly.\n')
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
