import { useState, useRef, useEffect } from 'react'

// ── Static data ────────────────────────────────────────────────────────────

interface ProviderEntry {
  id: string
  name: string
  models: number
  env: string
  doc?: string
}

interface ProviderSection {
  label: string
  providers: ProviderEntry[]
}

export const PROVIDER_SECTIONS: ProviderSection[] = [
  {
    label: 'Popular',
    providers: [
      { id: 'anthropic',  name: 'Anthropic',      models: 7,  env: 'ANTHROPIC_API_KEY',  doc: 'https://console.anthropic.com/settings/keys' },
      { id: 'openai',     name: 'OpenAI',         models: 20, env: 'OPENAI_API_KEY',     doc: 'https://platform.openai.com/api-keys' },
      { id: 'google',     name: 'Google Gemini',  models: 12, env: 'GOOGLE_API_KEY',     doc: 'https://aistudio.google.com/app/apikey' },
      { id: 'groq',       name: 'Groq',           models: 12, env: 'GROQ_API_KEY',       doc: 'https://console.groq.com/keys' },
      { id: 'deepseek',   name: 'DeepSeek',       models: 5,  env: 'DEEPSEEK_API_KEY',   doc: 'https://platform.deepseek.com/api_keys' },
      { id: 'openrouter', name: 'OpenRouter',     models: 50, env: 'OPENROUTER_API_KEY', doc: 'https://openrouter.ai/keys' },
      { id: 'xai',        name: 'xAI (Grok)',     models: 9,  env: 'XAI_API_KEY',        doc: 'https://console.x.ai' },
      { id: 'mistral',    name: 'Mistral AI',     models: 8,  env: 'MISTRAL_API_KEY',    doc: 'https://console.mistral.ai/api-keys' },
      { id: 'cohere',     name: 'Cohere',         models: 6,  env: 'COHERE_API_KEY',     doc: 'https://dashboard.cohere.com/api-keys' },
      { id: 'perplexity', name: 'Perplexity AI',  models: 6,  env: 'PERPLEXITY_API_KEY', doc: 'https://www.perplexity.ai/settings/api' },
    ],
  },
  {
    label: 'Open Source & Inference',
    providers: [
      { id: 'together',   name: 'Together AI',    models: 50, env: 'TOGETHER_API_KEY',   doc: 'https://api.together.xyz/settings/api-keys' },
      { id: 'fireworks',  name: 'Fireworks AI',   models: 30, env: 'FIREWORKS_API_KEY',  doc: 'https://fireworks.ai/account/api-keys' },
      { id: 'replicate',  name: 'Replicate',      models: 20, env: 'REPLICATE_API_TOKEN', doc: 'https://replicate.com/account/api-tokens' },
      { id: 'huggingface',name: 'Hugging Face',   models: 20, env: 'HF_TOKEN',           doc: 'https://huggingface.co/settings/tokens' },
      { id: 'nvidianim',  name: 'NVIDIA NIM',     models: 10, env: 'NVIDIA_API_KEY',     doc: 'https://build.nvidia.com' },
      { id: 'cerebras',   name: 'Cerebras',       models: 5,  env: 'CEREBRAS_API_KEY',   doc: 'https://cloud.cerebras.ai' },
      { id: 'sambanova',  name: 'SambaNova',      models: 6,  env: 'SAMBANOVA_API_KEY',  doc: 'https://cloud.sambanova.ai' },
      { id: 'lepton',     name: 'Lepton AI',      models: 10, env: 'LEPTON_API_KEY',     doc: 'https://www.lepton.ai/credentials' },
      { id: 'novita',     name: 'Novita AI',      models: 20, env: 'NOVITA_API_KEY',     doc: 'https://novita.ai/dashboard/key' },
      { id: 'lambdalabs', name: 'Lambda Labs',    models: 8,  env: 'LAMBDA_API_KEY',     doc: 'https://cloud.lambdalabs.com/api-keys' },
    ],
  },
  {
    label: 'Self-Hosted & Local',
    providers: [
      { id: 'ollama',     name: 'Ollama',         models: 50, env: 'OLLAMA_BASE_URL' },
      { id: 'vllm',       name: 'vLLM',           models: 20, env: 'VLLM_BASE_URL' },
      { id: 'lmstudio',   name: 'LM Studio',      models: 10, env: 'LM_STUDIO_BASE_URL', doc: 'https://lmstudio.ai' },
      { id: 'localai',    name: 'LocalAI',        models: 20, env: 'LOCAL_AI_BASE_URL',  doc: 'https://localai.io' },
      { id: 'llamacpp',   name: 'llama.cpp',      models: 5,  env: 'LLAMACPP_BASE_URL' },
      { id: 'jan',        name: 'Jan',            models: 10, env: 'JAN_BASE_URL',        doc: 'https://jan.ai' },
      { id: 'oobabooga',  name: 'Oobabooga',      models: 10, env: 'OOBA_BASE_URL' },
      { id: 'lemonade',   name: 'Lemonade',       models: 5,  env: 'LEMONADE_BASE_URL' },
      { id: 'textgen',    name: 'Text Gen WebUI',  models: 5,  env: 'TEXTGEN_BASE_URL' },
    ],
  },
  {
    label: 'Cloud & Enterprise',
    providers: [
      { id: 'awsbedrock',    name: 'AWS Bedrock',       models: 15, env: 'AWS_ACCESS_KEY_ID',        doc: 'https://aws.amazon.com/bedrock' },
      { id: 'azureopenai',   name: 'Azure OpenAI',      models: 8,  env: 'AZURE_OPENAI_API_KEY',     doc: 'https://portal.azure.com' },
      { id: 'googlevertex',  name: 'Google Vertex AI',  models: 12, env: 'GOOGLE_APPLICATION_CREDENTIALS', doc: 'https://cloud.google.com/vertex-ai' },
      { id: 'ghcopilot',     name: 'GitHub Copilot',    models: 3,  env: 'GH_COPILOT_TOKEN',         doc: 'https://github.com/settings/copilot' },
      { id: 'claudecode',    name: 'Claude Code',       models: 3,  env: 'CLAUDE_CODE_API_KEY' },
      { id: 'ibmwatsonx',    name: 'IBM watsonx',       models: 8,  env: 'WATSONX_API_KEY',          doc: 'https://www.ibm.com/watsonx' },
      { id: 'oracleoci',     name: 'Oracle OCI',        models: 5,  env: 'OCI_API_KEY' },
      { id: 'cf',            name: 'Cloudflare AI',     models: 10, env: 'CLOUDFLARE_API_KEY',       doc: 'https://dash.cloudflare.com' },
    ],
  },
  {
    label: 'Specialized',
    providers: [
      { id: 'openaicodex',   name: 'OpenAI Codex',          models: 3,  env: 'OPENAI_API_KEY' },
      { id: 'ai21',          name: 'AI21 Labs',              models: 4,  env: 'AI21_API_KEY',          doc: 'https://studio.ai21.com/account/api-key' },
      { id: 'alephalpha',    name: 'Aleph Alpha',            models: 4,  env: 'ALEPH_ALPHA_API_KEY',   doc: 'https://app.aleph-alpha.com/profile' },
      { id: 'anyscale',      name: 'Anyscale',               models: 8,  env: 'ANYSCALE_API_KEY',      doc: 'https://app.endpoints.anyscale.com' },
      { id: 'voyage',        name: 'Voyage AI',              models: 4,  env: 'VOYAGE_API_KEY',        doc: 'https://dash.voyageai.com' },
      { id: 'jina',          name: 'Jina AI',                models: 4,  env: 'JINA_API_KEY',          doc: 'https://jina.ai/api-dashboard' },
      { id: 'chutes',        name: 'Chutes.ai',              models: 5,  env: 'CHUTES_API_KEY' },
      { id: 'venice',        name: 'Venice.ai',              models: 3,  env: 'VENICE_API_KEY' },
      { id: 'openrouter2',   name: 'OpenRouter (Bring Key)', models: 5,  env: 'OPENROUTER_API_KEY' },
      { id: 'friendliai',    name: 'FriendliAI',             models: 8,  env: 'FRIENDLI_TOKEN',        doc: 'https://suite.friendli.ai' },
    ],
  },
  {
    label: 'Chinese Providers',
    providers: [
      { id: 'qwen',       name: 'Qwen (Alibaba)',         models: 14, env: 'DASHSCOPE_API_KEY',    doc: 'https://dashscope.aliyuncs.com' },
      { id: 'zhipuglm',  name: 'Zhipu AI (GLM)',         models: 8,  env: 'ZHIPU_API_KEY',        doc: 'https://open.bigmodel.cn' },
      { id: 'baidu',     name: 'Baidu Qianfan',          models: 6,  env: 'QIANFAN_API_KEY',      doc: 'https://console.bce.baidu.com/qianfan' },
      { id: 'moonshot',  name: 'Moonshot (Kimi)',        models: 6,  env: 'MOONSHOT_API_KEY',     doc: 'https://platform.moonshot.cn' },
      { id: 'minimax',   name: 'MiniMax',                models: 6,  env: 'MINIMAX_API_KEY',      doc: 'https://api.minimax.chat' },
      { id: 'volcanodou',name: 'Volcano Engine (Doubao)', models: 5,  env: 'VOLC_ACCESSKEY' },
      { id: 'zhipucode', name: 'Zhipu Coding (CodeGeeX)', models: 3,  env: 'ZHIPU_CODE_API_KEY' },
      { id: 'kimicode',  name: 'Kimi for Code',          models: 2,  env: 'KIMI_API_KEY' },
      { id: 'zai',       name: 'Z.AI',                   models: 3,  env: 'ZAI_API_KEY' },
      { id: 'hunyuan',   name: 'Tencent Hunyuan',        models: 4,  env: 'HUNYUAN_SECRET_KEY',   doc: 'https://cloud.tencent.com/product/hunyuan' },
      { id: 'sensetime', name: 'SenseTime (Nova)',       models: 4,  env: 'SENSETIME_API_KEY' },
      { id: 'iflytek',   name: 'iFlytek Spark',          models: 4,  env: 'SPARK_API_KEY',        doc: 'https://xinghuo.xfyun.cn' },
      { id: 'stepfun',   name: 'StepFun',                models: 4,  env: 'STEPFUN_API_KEY',      doc: 'https://platform.stepfun.com' },
      { id: 'lingyi',    name: 'LingYi (Yi-01)',         models: 4,  env: 'LINGYI_API_KEY',       doc: 'https://platform.lingyiwanwu.com' },
    ],
  },
]

// Flat maps derived from sections
const PROVIDER_NAMES: Record<string, string> = {}
const PROVIDER_ENV: Record<string, string> = {}
const PROVIDER_DOCS: Record<string, string> = {}
for (const sec of PROVIDER_SECTIONS) {
  for (const p of sec.providers) {
    PROVIDER_NAMES[p.id] = p.name
    PROVIDER_ENV[p.id]   = p.env
    if (p.doc) PROVIDER_DOCS[p.id] = p.doc
  }
}

const PERSONAS = [
  { id: 'dev',        label: 'Developer',       desc: 'Code, tests, APIs, reviews',              skills: ['planner', 'coder', 'reviewer'],                  suggestions: ['Write a rate-limiter middleware for Express', 'Generate unit tests for a parsing function', 'Build a debounce utility in TypeScript'] },
  { id: 'analyst',    label: 'Analyst',          desc: 'Data, metrics, strategy',                  skills: ['planner', 'analyst', 'researcher'],              suggestions: ['Build a SWOT analysis for a DTC brand', 'Define KPIs for a SaaS analytics dashboard', 'Create a competitor analysis template'] },
  { id: 'writer',     label: 'Writer',            desc: 'Blogs, emails, copy, posts',              skills: ['planner', 'writer', 'editor'],                   suggestions: ['Write an SEO blog post outline on AI', 'Draft a 3-email cold outreach sequence', 'Write 3 product description variations'] },
  { id: 'marketer',   label: 'Marketer',          desc: 'GTM, campaigns, content',                 skills: ['planner', 'writer', 'analyst'],                  suggestions: ['Write a go-to-market strategy', 'Create 5 Facebook ad copy variations', 'Plan a 30-day content calendar'] },
  { id: 'founder',    label: 'Founder',           desc: 'Pitch, investors, unit economics',        skills: ['planner', 'analyst', 'writer'],                  suggestions: ['Write a 10-slide seed-stage pitch narrative', 'Generate 10 tough investor questions', 'Model SaaS unit economics at $299/mo'] },
  { id: 'senior-dev', label: 'Senior Engineer',   desc: 'Production systems, architecture, scale', skills: ['planner', 'coder', 'reviewer', 'security'],      suggestions: ['Design a rate-limiting system at 100k req/s', 'Implement a distributed job queue', 'Refactor a monolith into microservices'] },
  { id: 'student',    label: 'Student',           desc: 'Essays, study plans, concepts',           skills: ['planner', 'researcher', 'writer'],               suggestions: ['Explain gradient descent with a simple analogy', 'Create a 4-week ML study plan', 'Outline a 2000-word essay on UBI'] },
  { id: 'api-engineer',label: 'API Engineer',     desc: 'REST, GraphQL, SDKs, API design',         skills: ['planner', 'coder', 'tester'],                    suggestions: ['Design a versioned REST API with webhooks', 'Build a GraphQL API with subscriptions', 'Create a TypeScript SDK for a REST API'] },
]

interface ChannelField {
  id: string
  label: string
  placeholder: string
  type?: string
  envVar?: string
  required?: boolean
  advanced?: boolean
}

interface ChannelDef {
  id: string
  name: string
  abbr: string
  subtitle: string
  howTo: { step: string; link?: { label: string; url: string } }[]
  fields: ChannelField[]
}

const CHANNELS: ChannelDef[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    abbr: 'TG',
    subtitle: 'Paste your bot token from @BotFather',
    howTo: [
      { step: 'Open Telegram and search for @BotFather' },
      { step: 'Send /newbot and follow the prompts to name your bot' },
      { step: 'Copy the token BotFather gives you and paste it below' },
      { step: 'Optionally restrict the bot to a specific chat ID (advanced)', link: { label: 'How to find Chat ID', url: 'https://core.telegram.org/bots/api#getting-updates' } },
    ],
    fields: [
      { id: 'token',  label: 'Bot Token', placeholder: '7123456789:AABBcc-ddEEff...', type: 'password', envVar: 'TELEGRAM_BOT_TOKEN', required: true },
      { id: 'chatId', label: 'Chat ID',   placeholder: '-1001234567890',              envVar: 'TELEGRAM_CHAT_ID', advanced: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    abbr: 'DC',
    subtitle: 'Paste your bot token from the Discord Developer Portal',
    howTo: [
      { step: 'Go to the Discord Developer Portal', link: { label: 'discord.com/developers/applications', url: 'https://discord.com/developers/applications' } },
      { step: 'Create an application, then go to Bot → Reset Token' },
      { step: 'Copy the token and paste it below' },
      { step: 'To get your Guild ID: open Discord, go to Settings → Advanced → enable Developer Mode, then right-click your server and copy the ID' },
    ],
    fields: [
      { id: 'token',       label: 'Bot Token',  placeholder: 'MTIz...', type: 'password', envVar: 'DISCORD_BOT_TOKEN', required: true },
      { id: 'guildId',     label: 'Guild ID',   placeholder: '1234567890123456789',       envVar: 'DISCORD_GUILD_ID',  advanced: true },
      { id: 'channelId',   label: 'Channel ID', placeholder: '9876543210987654321',       envVar: 'DISCORD_CHANNEL_ID', advanced: true },
      { id: 'prefix',      label: 'Command Prefix', placeholder: '!',                     envVar: 'DISCORD_PREFIX',    advanced: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    abbr: 'SL',
    subtitle: 'Connect via a Slack App with bot and socket permissions',
    howTo: [
      { step: 'Go to Slack API and create a new app', link: { label: 'api.slack.com/apps', url: 'https://api.slack.com/apps' } },
      { step: 'Under OAuth & Permissions, add bot scopes: chat:write, im:history, im:read' },
      { step: 'Install the app to your workspace and copy the Bot Token (xoxb-)' },
      { step: 'Under Basic Information, copy the Signing Secret' },
      { step: 'Under Socket Mode, enable it and generate an App-Level Token (xapp-)' },
    ],
    fields: [
      { id: 'botToken',      label: 'Bot Token',      placeholder: 'xoxb-...',  type: 'password', envVar: 'SLACK_BOT_TOKEN',      required: true },
      { id: 'signingSecret', label: 'Signing Secret', placeholder: 'abc123...', type: 'password', envVar: 'SLACK_SIGNING_SECRET',  required: true },
      { id: 'appToken',      label: 'App Token',      placeholder: 'xapp-...',  type: 'password', envVar: 'SLACK_APP_TOKEN',       advanced: true },
      { id: 'channelId',     label: 'Default Channel',placeholder: 'C01234567',                   envVar: 'SLACK_CHANNEL_ID',     advanced: true },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    abbr: 'WH',
    subtitle: 'Generic HTTP webhook — works with any service',
    howTo: [
      { step: 'Agentis will expose a POST endpoint at /agentis/webhook' },
      { step: 'Point your external service (Zapier, Make, etc.) to that URL' },
      { step: 'Optionally set a secret to validate incoming requests' },
    ],
    fields: [
      { id: 'path',   label: 'Webhook Path',   placeholder: '/agentis/webhook',  envVar: 'WEBHOOK_PATH',   advanced: true },
      { id: 'secret', label: 'Signing Secret',  placeholder: 'my-secret-key',     envVar: 'WEBHOOK_SECRET', advanced: false },
    ],
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function ProviderCard({ p, selected, ready, onClick }: {
  p: { id: string; name: string; models: number }
  selected: boolean
  ready: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'var(--accent-bg)' : 'var(--surface)',
        border: `1px solid ${selected ? 'var(--accent)' : ready ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
        borderLeft: ready ? '3px solid var(--green)' : selected ? '3px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 8, padding: '12px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.15s', fontFamily: 'var(--font-sans)', width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--fg)', lineHeight: 1.3 }}>
          {p.name}
        </span>
        {ready && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)', color: 'var(--green)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
            READY
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.models} models</div>
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? 'rgba(29,158,117,0.12)' : 'var(--surface)', border: `1.5px solid ${ok ? 'rgba(29,158,117,0.4)' : 'var(--border)'}` }}>
        {ok
          ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg>
          : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border)' }} />
        }
      </div>
      <span style={{ fontSize: 13, color: ok ? 'var(--fg)' : 'var(--muted)' }}>{label}</span>
      {!ok && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', padding: '1px 7px', border: '1px solid var(--border)', borderRadius: 4 }}>skipped</span>}
    </div>
  )
}

// ── ChannelCard sub-component ──────────────────────────────────────────────

function ChannelCard({ ch, isExpanded, isSaved, values, error, onToggle, onChange, onSave, onCancel, onDisconnect }: {
  ch: ChannelDef
  isExpanded: boolean
  isSaved: boolean
  values: Record<string, string>
  error: string
  onToggle: () => void
  onChange: (fieldId: string, val: string) => void
  onSave: () => void
  onCancel: () => void
  onDisconnect: () => void
}) {
  const [showHowTo, setShowHowTo] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const requiredFields = ch.fields.filter(f => !f.advanced)
  const advancedFields = ch.fields.filter(f => f.advanced)
  const miniStep = isSaved ? 2 : isExpanded ? 0 : -1

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${isSaved ? 'rgba(29,158,117,0.35)' : isExpanded ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'all 0.15s' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }} onClick={onToggle}>
        {/* Abbr badge */}
        <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: isSaved ? 'rgba(29,158,117,0.12)' : isExpanded ? 'var(--accent-bg)' : 'var(--bg)', border: `1px solid ${isSaved ? 'rgba(29,158,117,0.3)' : isExpanded ? 'var(--accent-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: isSaved ? 'var(--green)' : isExpanded ? 'var(--accent)' : 'var(--muted)', letterSpacing: '0.04em' }}>{ch.abbr}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: isSaved ? 'var(--green)' : isExpanded ? 'var(--accent)' : 'var(--fg)', marginBottom: 2 }}>{ch.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ch.subtitle}</div>
        </div>
        {isSaved
          ? <span style={{ fontSize: 10, color: 'var(--green)', padding: '2px 8px', border: '1px solid rgba(29,158,117,0.35)', borderRadius: 4 }}>Connected</span>
          : <span style={{ fontSize: 10, color: 'var(--muted)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 4 }}>{isExpanded ? 'Close' : 'Configure'}</span>
        }
      </div>

      {/* Expanded config form */}
      {isExpanded && !isSaved && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>

          {/* Mini 3-step stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            {['Configure', 'Verify', 'Ready'].map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: miniStep === i ? 'var(--accent)' : miniStep > i ? 'rgba(29,158,117,0.15)' : 'var(--bg)', border: `1.5px solid ${miniStep === i ? 'var(--accent)' : miniStep > i ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`, color: miniStep === i ? '#fff' : miniStep > i ? 'var(--green)' : 'var(--muted)' }}>
                    {miniStep > i ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg> : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: miniStep === i ? 600 : 400, color: miniStep === i ? 'var(--accent)' : 'var(--muted)' }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 8px' }} />}
              </div>
            ))}
          </div>

          {/* How to get credentials collapsible */}
          <div style={{ marginBottom: 14, border: '1px solid var(--accent-border)', borderRadius: 7, overflow: 'hidden' }}>
            <button
              onClick={() => setShowHowTo(s => !s)}
              style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: 'var(--accent)', flexShrink: 0, transform: showHowTo ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="4 2 8 6 4 10"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>How to get credentials</span>
            </button>
            {showHowTo && (
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderTop: '1px solid var(--accent-border)' }}>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ch.howTo.map((item, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {item.step}
                      {item.link && (
                        <a href={item.link.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', marginLeft: 6, textDecoration: 'underline', fontSize: 12 }}>
                          {item.link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Required fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            {requiredFields.map(f => (
              <div key={f.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', letterSpacing: '0.04em' }}>{f.label} <span style={{ color: 'var(--red)' }}>*</span></label>
                  {f.envVar && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', padding: '1px 6px', borderRadius: 3 }}>{f.envVar}</span>}
                </div>
                <input
                  type={f.type ?? 'text'}
                  value={values[f.id] ?? ''}
                  onChange={e => onChange(f.id, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'var(--bg)', border: `1px solid ${values[f.id] ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 6, color: 'var(--fg)', fontFamily: 'var(--font-mono)', boxSizing: 'border-box', outline: 'none' }}
                />
                {values[f.id] && (
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>{f.envVar} is set</div>
                )}
              </div>
            ))}
          </div>

          {/* Advanced toggle */}
          {advancedFields.length > 0 && (
            <button
              onClick={() => setShowAdvanced(s => !s)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', marginBottom: 12 }}
            >
              {showAdvanced ? `Hide advanced (${advancedFields.length})` : `Show advanced (${advancedFields.length})`}
            </button>
          )}

          {/* Advanced fields */}
          {showAdvanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
              {advancedFields.map(f => (
                <div key={f.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em' }}>{f.label}</label>
                    {f.envVar && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 3 }}>{f.envVar}</span>}
                  </div>
                  <input
                    type={f.type ?? 'text'}
                    value={values[f.id] ?? ''}
                    onChange={e => onChange(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={onSave} style={{ fontSize: 13, padding: '9px 22px' }}>
              Save &amp; Test
            </button>
            <button onClick={onCancel} style={{ fontSize: 13, padding: '9px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connected state actions */}
      {isSaved && (
        <div style={{ borderTop: '1px solid rgba(29,158,117,0.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(29,158,117,0.03)' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 7 6 11 12 3"/></svg>
          <span style={{ fontSize: 12, color: 'var(--green)', flex: 1 }}>Successfully connected</span>
          <button onClick={onDisconnect} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Disconnect</button>
        </div>
      )}
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'
type TryStatus  = 'idle' | 'running' | 'done' | 'error'
type StepId     = 'welcome' | 'provider' | 'agent' | 'tryit' | 'channel' | 'done'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'welcome',  label: 'WELCOME'  },
  { id: 'provider', label: 'PROVIDER' },
  { id: 'agent',    label: 'AGENT'    },
  { id: 'tryit',    label: 'TRY IT'   },
  { id: 'channel',  label: 'CHANNEL'  },
  { id: 'done',     label: 'DONE'     },
]

interface Props {
  apiKey: string
  onClose: () => void
  onSaveApiKey: (key: string) => void
  navigate: (page: string) => void
}

// ── Main component ─────────────────────────────────────────────────────────

export function SetupWizard({ apiKey, onClose, onSaveApiKey, navigate }: Props) {
  const [stepIdx, setStepIdx] = useState(0)

  // Provider step
  const [draftKey, setDraftKey]             = useState(apiKey)
  const [selectedProvider, setSelectedProvider] = useState(apiKey ? 'anthropic' : '')
  const [testStatus, setTestStatus]         = useState<TestStatus>(apiKey ? 'ok' : 'idle')
  const [testError, setTestError]           = useState('')
  const [configuredProviders, setConfiguredProviders] = useState<Set<string>>(
    new Set(apiKey ? ['anthropic'] : [])
  )

  // Agent step
  const [selectedPersonaId, setSelectedPersonaId] = useState('dev')
  const [agentName, setAgentName]           = useState('')

  // Try It step
  const [tryMsg, setTryMsg]                 = useState('')
  const [tryStatus, setTryStatus]           = useState<TryStatus>('idle')
  const [tryResponse, setTryResponse]       = useState('')
  const [tryError, setTryError]             = useState('')
  const tryResponseRef = useRef<HTMLDivElement>(null)

  // Channel step
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null)
  const [channelFields, setChannelFields]   = useState<Record<string, Record<string, string>>>({})
  const [channelSaved, setChannelSaved]     = useState<Set<string>>(new Set())
  const [channelError, setChannelError]     = useState<Record<string, string>>({})

  const current         = STEPS[stepIdx]
  const selectedPersona = PERSONAS.find(p => p.id === selectedPersonaId) ?? PERSONAS[0]
  const effectiveKey    = testStatus === 'ok' ? draftKey : apiKey

  const next = () => { if (stepIdx < STEPS.length - 1) setStepIdx(s => s + 1) }
  const back = () => { if (stepIdx > 0) setStepIdx(s => s - 1) }

  // Auto-scroll try-it response
  useEffect(() => {
    tryResponseRef.current?.scrollTo({ top: tryResponseRef.current.scrollHeight, behavior: 'smooth' })
  }, [tryResponse])

  // ── Provider: Save & Test ────────────────────────────────────────────────
  const handleSaveAndTest = async () => {
    if (!draftKey.trim()) return
    setTestStatus('testing')
    setTestError('')
    try {
      if (selectedProvider === 'anthropic') {
        // Direct call required — Anthropic needs the special browser-access header
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': draftKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
        }
      } else if (selectedProvider === 'openai') {
        const res = await fetch('/openai-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: { message?: string } }; throw new Error(b?.error?.message ?? `HTTP ${res.status}`) }
      } else if (selectedProvider === 'groq') {
        const res = await fetch('/groq-proxy/openai/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'google') {
        const res = await fetch(`/google-proxy/v1beta/models?key=${draftKey}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'cohere') {
        const res = await fetch('/cohere-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'mistral') {
        const res = await fetch('/mistral-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'deepseek') {
        const res = await fetch('/deepseek-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'openrouter') {
        const res = await fetch('/openrouter-proxy/api/v1/auth/key', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'xai') {
        const res = await fetch('/xai-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'together') {
        const res = await fetch('/together-proxy/v1/models', { headers: { Authorization: `Bearer ${draftKey}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else if (selectedProvider === 'ollama') {
        const base = draftKey.replace(/\/$/, '') || 'http://localhost:11434'
        const res = await fetch(`${base}/api/tags`)
        if (!res.ok) throw new Error('Ollama not reachable')
      } else if (selectedProvider === 'lmstudio') {
        const base = draftKey.replace(/\/$/, '') || 'http://localhost:1234'
        const res = await fetch(`${base}/v1/models`)
        if (!res.ok) throw new Error('LM Studio not reachable')
      } else {
        throw new Error('API key validation not supported for this provider — save and test manually')
      }
      // success
      setTestStatus('ok')
      onSaveApiKey(draftKey)
      setConfiguredProviders(prev => new Set([...prev, selectedProvider]))
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  // ── Try It: send real message ────────────────────────────────────────────
  const handleTryIt = async () => {
    if (!tryMsg.trim() || !effectiveKey) return
    setTryStatus('running')
    setTryResponse('')
    setTryError('')

    const systemPrompt = `You are a ${selectedPersona.label} assistant. ${selectedPersona.desc}. Be concise and helpful.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': effectiveKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: tryMsg }],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const evt = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } }
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setTryResponse(prev => prev + (evt.delta?.text ?? ''))
            }
          } catch { /* skip malformed */ }
        }
      }
      setTryStatus('done')
    } catch (err) {
      setTryStatus('error')
      setTryError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  // ── Channel: save credentials ────────────────────────────────────────────
  const handleSaveChannel = (channelId: string) => {
    const ch = CHANNELS.find(c => c.id === channelId)
    const requiredFields = ch?.fields.filter(f => f.required) ?? []
    const values = channelFields[channelId] ?? {}
    const missing = requiredFields.filter(f => !values[f.id]?.trim())
    if (missing.length > 0) {
      setChannelError(prev => ({ ...prev, [channelId]: `Please fill in: ${missing.map(f => f.label).join(', ')}` }))
      return
    }
    // persist to localStorage
    const stored = JSON.parse(localStorage.getItem('agentis_channels') ?? '{}') as Record<string, Record<string, string>>
    stored[channelId] = values
    localStorage.setItem('agentis_channels', JSON.stringify(stored))
    setChannelSaved(prev => new Set([...prev, channelId]))
    setChannelError(prev => ({ ...prev, [channelId]: '' }))
    setExpandedChannel(null)
  }

  const setField = (channelId: string, fieldId: string, value: string) => {
    setChannelFields(prev => ({ ...prev, [channelId]: { ...prev[channelId], [fieldId]: value } }))
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const canContinue = (() => {
    if (current.id === 'provider') return testStatus === 'ok' || !!apiKey
    if (current.id === 'tryit') return tryStatus === 'done' || tryStatus === 'idle'
    return true
  })()

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>Setup Wizard</span>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Skip Setup
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 48px 0', flexShrink: 0 }}>
        {STEPS.map((s, i) => {
          const isActive = i === stepIdx
          const isDone   = i < stepIdx
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isActive ? 'var(--accent)' : isDone ? 'rgba(91,115,247,0.18)' : 'var(--surface)', border: `2px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--accent-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--muted)', transition: 'all 0.2s' }}>
                  {isDone ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 7 6 11 12 3"/></svg> : i + 1}
                </div>
                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.09em', color: isActive ? 'var(--accent)' : 'var(--muted)', transition: 'color 0.2s' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, marginBottom: 20, marginLeft: 4, marginRight: 4, background: isDone ? 'var(--accent-border)' : 'var(--border)', transition: 'background 0.2s' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── WELCOME ── */}
        {current.id === 'welcome' && (
          <div style={{ width: '100%', maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 48px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'var(--accent)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>A</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>Welcome to Agentis</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
              Agentis is a multi-agent orchestration platform. Run AI agents that can chat, use tools, access memory, and connect to external services — all from a single dashboard.
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 24px', textAlign: 'left', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>This wizard will help you:</div>
              {[
                'Connect an LLM provider (Anthropic, OpenAI, Gemini, etc.)',
                'Configure your first AI agent persona',
                'Try it live with a real message',
                'Optionally connect a messaging channel (Telegram, Discord, Slack)',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, paddingTop: 2 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', opacity: 0.6 }}>Takes about 2 minutes. You can skip any step and configure later.</div>
          </div>
        )}

        {/* ── PROVIDER ── */}
        {current.id === 'provider' && (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Connect an LLM Provider</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Agentis needs at least one LLM provider to power your agents. Select a provider and enter your API key.</div>
            </div>

            {/* Already configured banner */}
            {(testStatus === 'ok' || (!!apiKey && testStatus === 'idle')) && (
              <div style={{ padding: '12px 18px', borderRadius: 8, marginBottom: 20, background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.25)', borderLeft: '3px solid var(--green)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 3 }}>Provider Already Configured</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>You already have at least one provider set up. You can continue to the next step or configure additional providers.</div>
              </div>
            )}

            {PROVIDER_SECTIONS.map(section => (
              <div key={section.label}>
                <SectionLabel>{section.label}</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
                  {section.providers.map(p => (
                    <ProviderCard
                      key={p.id}
                      p={p}
                      selected={selectedProvider === p.id}
                      ready={configuredProviders.has(p.id)}
                      onClick={() => { setSelectedProvider(p.id === selectedProvider ? '' : p.id); setDraftKey(''); setTestStatus('idle'); setTestError('') }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Configure panel */}
            {selectedProvider && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '20px 24px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>
                  Configure {PROVIDER_NAMES[selectedProvider] ?? selectedProvider}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Environment variable:</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4 }}>
                    {PROVIDER_ENV[selectedProvider] ?? 'API_KEY'}
                  </span>
                </div>
                {PROVIDER_DOCS[selectedProvider] && (
                  <a href={PROVIDER_DOCS[selectedProvider]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginBottom: 14, textDecoration: 'underline' }}>
                    Get your key from the {PROVIDER_NAMES[selectedProvider]} platform
                  </a>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>API KEY</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="password"
                    value={draftKey}
                    onChange={e => { setDraftKey(e.target.value); setTestStatus('idle'); setTestError('') }}
                    placeholder={`Enter your ${PROVIDER_NAMES[selectedProvider] ?? selectedProvider} API key`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 13, background: 'var(--bg)', border: `1px solid ${testStatus === 'ok' ? 'rgba(29,158,117,0.5)' : testStatus === 'error' ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`, borderRadius: 6, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleSaveAndTest}
                    disabled={!draftKey.trim() || testStatus === 'testing'}
                    style={{ padding: '10px 18px', fontSize: 13, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7, opacity: !draftKey.trim() || testStatus === 'testing' ? 0.6 : 1 }}
                  >
                    {testStatus === 'testing' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                    {testStatus === 'testing' ? 'Testing...' : 'Save & Test'}
                  </button>
                </div>

                {testStatus === 'ok' && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 7 6 11 12 3"/></svg>
                    <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>API key verified. {PROVIDER_NAMES[selectedProvider]} is ready.</span>
                  </div>
                )}
                {testStatus === 'error' && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: testError ? 4 : 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
                      <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>Authentication failed</span>
                    </div>
                    {testError && <div style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 22 }}>{testError}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AGENT ── */}
        {current.id === 'agent' && (
          <div style={{ width: '100%', maxWidth: 620 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Configure Your Agent</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Choose a persona that defines your agent's role and behavior.</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
              {PERSONAS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedPersonaId(a.id)}
                  style={{ background: selectedPersonaId === a.id ? 'var(--accent-bg)' : 'var(--surface)', border: `1px solid ${selectedPersonaId === a.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selectedPersonaId === a.id ? 'var(--accent)' : 'var(--fg)' }}>{a.label}</span>
                    {selectedPersonaId === a.id && <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg></div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{a.desc}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {a.skills.map(sk => (
                      <span key={sk} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 3, background: selectedPersonaId === a.id ? 'var(--accent-bg)' : 'var(--bg)', border: `1px solid ${selectedPersonaId === a.id ? 'var(--accent-border)' : 'var(--border)'}`, color: selectedPersonaId === a.id ? 'var(--accent)' : 'var(--muted)' }}>{sk}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Agent name */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', display: 'block', marginBottom: 8 }}>Agent Name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder={`My ${selectedPersona.label}`}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                Active skills: {selectedPersona.skills.join(' · ')}
              </div>
            </div>
          </div>
        )}

        {/* ── TRY IT ── */}
        {current.id === 'tryit' && (
          <div style={{ width: '100%', maxWidth: 640 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Try It Out</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Send a live message to your <strong style={{ color: 'var(--fg)' }}>{agentName || selectedPersona.label}</strong> agent and see it respond in real time.
            </div>

            {!effectiveKey && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                No API key configured. Go back to the Provider step to add one.
              </div>
            )}

            {/* Suggestions */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Suggestions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {selectedPersona.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setTryMsg(s); setTryStatus('idle'); setTryResponse('') }}
                  style={{ textAlign: 'left', padding: '9px 12px', background: tryMsg === s ? 'var(--accent-bg)' : 'var(--surface)', border: `1px solid ${tryMsg === s ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 6, fontSize: 12, color: tryMsg === s ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-sans)' }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <textarea
                placeholder="Or type your own message..."
                value={tryMsg}
                onChange={e => { setTryMsg(e.target.value); setTryStatus('idle'); setTryResponse('') }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTryIt() }}
                disabled={tryStatus === 'running'}
                style={{ flex: 1, minHeight: 72, resize: 'none', fontSize: 13, lineHeight: 1.6, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}
              />
              <button
                className="btn-primary"
                onClick={handleTryIt}
                disabled={!tryMsg.trim() || tryStatus === 'running' || !effectiveKey}
                style={{ padding: '0 20px', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: !tryMsg.trim() || tryStatus === 'running' || !effectiveKey ? 0.55 : 1, minWidth: 72 }}
              >
                {tryStatus === 'running'
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
                <span style={{ fontSize: 10 }}>{tryStatus === 'running' ? 'Sending' : 'Send'}</span>
              </button>
            </div>

            {/* Response */}
            {(tryStatus === 'running' || tryStatus === 'done' || tryResponse) && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: tryStatus === 'running' ? 'var(--accent)' : tryStatus === 'done' ? 'var(--green)' : 'var(--muted)', flexShrink: 0, animation: tryStatus === 'running' ? 'pulse 1.2s ease-in-out infinite' : 'none' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {agentName || selectedPersona.label}
                  </span>
                  {tryStatus === 'done' && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)' }}>Complete</span>}
                </div>
                <div
                  ref={tryResponseRef}
                  style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.75, color: 'var(--fg)', fontFamily: 'var(--font-sans)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 280, overflowY: 'auto' }}
                >
                  {tryResponse}
                  {tryStatus === 'running' && <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--accent)', marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />}
                </div>
              </div>
            )}

            {tryStatus === 'error' && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: 'var(--red)' }}>
                {tryError}
              </div>
            )}

            {tryStatus === 'done' && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round"><polyline points="2 7 6 11 12 3"/></svg>
                Agent is working. You're ready to continue.
              </div>
            )}
          </div>
        )}

        {/* ── CHANNEL ── */}
        {current.id === 'channel' && (
          <div style={{ width: '100%', maxWidth: 600 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Connect a Channel</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
              Optionally connect a messaging channel so your agent can receive messages from outside the dashboard.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHANNELS.map(ch => (
                <ChannelCard
                  key={ch.id}
                  ch={ch}
                  isExpanded={expandedChannel === ch.id}
                  isSaved={channelSaved.has(ch.id)}
                  values={channelFields[ch.id] ?? {}}
                  error={channelError[ch.id] ?? ''}
                  onToggle={() => setExpandedChannel(expandedChannel === ch.id ? null : ch.id)}
                  onChange={(fieldId, val) => setField(ch.id, fieldId, val)}
                  onSave={() => handleSaveChannel(ch.id)}
                  onCancel={() => setExpandedChannel(null)}
                  onDisconnect={() => setChannelSaved(prev => { const n = new Set(prev); n.delete(ch.id); return n })}
                />
              ))}
            </div>

            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              Channels can be configured later from the Channels page in the sidebar.
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {current.id === 'done' && (
          <div style={{ width: '100%', maxWidth: 540 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(29,158,117,0.12)', border: '2px solid rgba(29,158,117,0.4)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"><polyline points="4 14 11 21 24 7"/></svg>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>You're all set!</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>Agentis is configured and ready to run. Here's a summary of what was set up.</div>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Setup Summary</div>
              <div style={{ padding: '4px 16px' }}>
                <CheckRow ok={testStatus === 'ok' || !!apiKey} label={`LLM Provider: ${testStatus === 'ok' || apiKey ? (PROVIDER_NAMES[selectedProvider] ?? 'Configured') : 'Not configured'}`} />
                <CheckRow ok={true} label={`Agent: ${agentName || selectedPersona.label} (${selectedPersona.desc})`} />
                <CheckRow ok={tryStatus === 'done'} label={tryStatus === 'done' ? 'Test message sent successfully' : 'Live test skipped'} />
                <CheckRow ok={channelSaved.size > 0} label={channelSaved.size > 0 ? `Channels: ${[...channelSaved].map(id => id.charAt(0).toUpperCase() + id.slice(1)).join(', ')}` : 'No channels connected'} />
              </div>
            </div>

            {/* Quick nav */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Where to next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Open Chat',         sub: 'Start a conversation with your agent',  page: 'chat'      },
                { label: 'Browse Workflows',  sub: 'Explore multi-agent workflow templates', page: 'workflows' },
                { label: 'View Settings',     sub: 'Fine-tune models, budget, and security', page: 'settings'  },
              ].map(item => (
                <button
                  key={item.page}
                  onClick={() => { onClose(); navigate(item.page) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.background = 'var(--accent-bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.sub}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={back}
          disabled={stepIdx === 0}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '9px 20px', fontSize: 13, color: stepIdx === 0 ? 'var(--muted)' : 'var(--fg)', cursor: stepIdx === 0 ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: stepIdx === 0 ? 0.4 : 1 }}
        >
          Back
        </button>

        <div style={{ display: 'flex', gap: 5 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === stepIdx ? 20 : 7, height: 7, borderRadius: 4, background: i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--accent-border)' : 'var(--border)', transition: 'all 0.2s' }} />
          ))}
        </div>

        {current.id === 'done' ? (
          <button className="btn-primary" onClick={onClose} style={{ padding: '9px 28px', fontSize: 13 }}>
            Finish
          </button>
        ) : (
          <button
            className="btn-primary"
            disabled={!canContinue}
            onClick={next}
            style={{ padding: '9px 28px', fontSize: 13, opacity: canContinue ? 1 : 0.5 }}
          >
            {current.id === 'welcome' ? 'Get Started' : current.id === 'channel' ? 'Continue' : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}
