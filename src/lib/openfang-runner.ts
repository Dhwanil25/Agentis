/**
 * OpenFang execution engine.
 *
 * Routes all tasks through the default `openfang:assistant` agent via the
 * OpenAI-compatible endpoint: POST /v1/chat/completions
 *
 * OpenFang only registers the "assistant" agent by default. Persona-specific
 * behaviour is encoded directly in the user message so the agent acts in role.
 */

import type { AgentStep, StreamChunk } from './claude'
import { SKILL_COLORS, DEFAULT_SKILL_COLOR } from './colors'

// ── Tool name → friendly activity label ──────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  web_search:       'Searching the web',
  web_fetch:        'Reading a webpage',
  memory_store:     'Saving to memory',
  memory_recall:    'Recalling from memory',
  file_read:        'Reading a file',
  file_write:       'Writing a file',
  file_list:        'Listing files',
  apply_patch:      'Applying code patch',
  shell_exec:       'Running a command',
  agent_spawn:      'Spawning a sub-agent',
  agent_send:       'Messaging an agent',
  agent_list:       'Listing agents',
  agent_kill:       'Stopping an agent',
  agent_find:       'Finding an agent',
  browser_navigate: 'Opening browser',
  browser_click:    'Clicking on page',
  browser_type:     'Typing in browser',
  browser_read_page:'Reading page content',
  browser_screenshot:'Taking screenshot',
  browser_scroll:   'Scrolling page',
  browser_run_js:   'Running page script',
  image_analyze:    'Analyzing image',
  image_generate:   'Generating image',
  knowledge_query:  'Querying knowledge graph',
  knowledge_add_entity: 'Adding to knowledge graph',
  task_post:        'Posting a task',
  task_claim:       'Claiming a task',
  task_complete:    'Completing a task',
  schedule_create:  'Scheduling a job',
  event_publish:    'Publishing an event',
  cron_create:      'Creating cron job',
  docker_exec:      'Running in container',
  process_start:    'Starting a process',
  text_to_speech:   'Generating speech',
  speech_to_text:   'Transcribing audio',
  canvas_present:   'Presenting canvas',
  system_time:      'Checking system time',
}

// ── Persona display labels and colours ────────────────────────────────────────

const PERSONA_LABELS: Record<string, string> = {
  analyst:             'Analyst',
  student:             'Researcher',
  writer:              'Writer',
  marketer:            'Analyst',
  founder:             'Planner',
  dev:                 'Engineer',
  'senior-engineer':   'Code Reviewer',
  'api-engineer':      'Engineer',
  'platform-engineer': 'DevOps Lead',
}

const PERSONA_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  analyst:           { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  student:           { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  writer:            { bg: '#FAECE7', border: '#993C1D', text: '#712B13' },
  marketer:          { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  founder:           { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  dev:               { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  'senior-engineer': { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  'api-engineer':    { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  'platform-engineer': { bg: '#F7FEE7', border: '#65A30D', text: '#4D7C0F' },
}

// ── Persona → system role instructions ────────────────────────────────────────
// Embedded in the user message because OpenFang only uses the last user message.

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  analyst:
    'You are a senior data analyst. Provide a thorough structured analysis with clear findings, supporting data, and actionable recommendations.',
  student:
    'You are an expert researcher. Gather and synthesise all relevant information on the topic. Be comprehensive, cite key facts, and organise findings clearly.',
  writer:
    'You are a professional writer. Produce high-quality, polished content that is engaging, clear, and ready to publish. Output the full draft.',
  marketer:
    'You are a marketing strategist. Identify the target audience, key messages, and channels. Deliver a complete marketing plan with concrete tactics.',
  founder:
    'You are a startup advisor and planner. Produce a clear, numbered execution plan covering strategy, milestones, risks, and resources needed.',
  dev:
    'You are a senior software engineer. Write complete, production-ready code with no placeholders or TODOs. Include error handling and tests where relevant.',
  'senior-engineer':
    'You are a principal engineer doing a code review. Identify bugs, security issues, performance problems, and architectural concerns. Give a clear verdict with specific fixes.',
  'api-engineer':
    'You are an API engineer. Design and implement clean, well-documented API endpoints. Include request/response types, authentication, and error codes.',
  'platform-engineer':
    'You are a DevOps / platform engineer. Provide infrastructure-as-code, CI/CD pipeline config, and operational runbooks. Use best practices for reliability and security.',
}

// ── Resolve the correct API base URL ─────────────────────────────────────────
// In dev, Vite proxies /openfang-proxy/* → OpenFang daemon (avoids CORS).

function getBaseUrl(daemonUrl: string): string {
  if (import.meta.env.DEV) return '/agentis-proxy'
  return daemonUrl.replace(/\/$/, '')
}

// ── Build the full prompt including persona instructions ──────────────────────

function buildTaskMessage(task: string, personaId: string): string {
  const instructions = PERSONA_INSTRUCTIONS[personaId]
  if (!instructions) return task
  return `${instructions}\n\n---\n\n${task}`
}

// ── Pipeline builder ──────────────────────────────────────────────────────────

export function buildOpenFangPipeline(personaId: string): AgentStep[] {
  const label = PERSONA_LABELS[personaId] ?? 'Assistant'
  const color = PERSONA_COLORS[personaId] ?? DEFAULT_SKILL_COLOR

  return [{
    id: 'openfang-agent',
    skill: label,
    skillColor: color,
    title: `Agentis Engine — ${label} running autonomously`,
    thinking: `${label} is thinking...`,
    output: '',
    status: 'pending',
    toolLog: [],
  }]
}

// ── Execute via OpenFang OpenAI-compat API ────────────────────────────────────

export async function runOnOpenFangHand(
  task: string,
  personaId: string,
  daemonUrl: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> {
  const stepId = 'openfang-agent'
  const message = buildTaskMessage(task, personaId)

  onChunk({ type: 'step_start', stepId })

  try {
    const url = `${getBaseUrl(daemonUrl)}/v1/chat/completions`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openfang:assistant',
        stream: true,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      let msg = `OpenFang returned ${res.status}: ${text}`
      if (res.status === 401 || text.includes('api-key') || text.includes('Auth error')) {
        msg = 'Agentis Engine: API key not configured. Enter your Anthropic key in the dashboard and try again.'
      } else if (res.status === 500 && text.includes('processing failed')) {
        msg = 'Agentis Engine: Agent processing failed. Check that your Anthropic API key is valid.'
      }
      throw new Error(msg)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body from OpenFang daemon')

    const decoder = new TextDecoder()
    let buffer = ''
    // Track the tool currently being accumulated (arguments stream in fragments)
    const pendingTools: Record<number, { tool: string; args: string }> = {}

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()

        if (data === '[DONE]') {
          onChunk({ type: 'step_done', stepId })
          onChunk({ type: 'all_done' })
          return
        }

        try {
          const ev = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string
                tool_calls?: Array<{
                  index: number
                  id?: string
                  type?: string
                  function?: { name?: string; arguments?: string }
                }>
              }
              finish_reason?: string
            }>
          }

          const choice = ev.choices?.[0]
          if (!choice) continue

          // ── Text content ──────────────────────────────────────────────────
          const text = choice.delta?.content ?? ''
          if (text) onChunk({ type: 'step_stream', stepId, delta: text })

          // ── Tool call events ──────────────────────────────────────────────
          for (const tc of choice.delta?.tool_calls ?? []) {
            const idx = tc.index ?? 0

            if (tc.function?.name) {
              // New tool starting
              pendingTools[idx] = { tool: tc.function.name, args: tc.function.arguments ?? '' }
              const label = TOOL_LABELS[tc.function.name] ?? `Using ${tc.function.name}`
              onChunk({ type: 'step_tool_start', stepId, tool: tc.function.name, thinking: label })
            } else if (tc.function?.arguments && pendingTools[idx]) {
              // Arguments streaming in
              pendingTools[idx].args += tc.function.arguments
              onChunk({ type: 'step_tool_input', stepId, tool: pendingTools[idx].tool, input: pendingTools[idx].args })
            }
          }

          if (choice.finish_reason === 'stop') {
            onChunk({ type: 'step_done', stepId })
            onChunk({ type: 'all_done' })
            return
          }
        } catch { /* ignore malformed SSE lines */ }
      }
    }

    onChunk({ type: 'step_done', stepId })
    onChunk({ type: 'all_done' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isFetchFail = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')
    onChunk({
      type: 'error',
      stepId,
      error: isFetchFail
        ? `Cannot reach Agentis Engine at ${daemonUrl}. Run: npm run dev`
        : msg,
    })
  }
}

export { SKILL_COLORS, DEFAULT_SKILL_COLOR }
