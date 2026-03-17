const API_URL = 'https://api.anthropic.com/v1/messages'

export interface AgentStep {
  id: string
  skill: string
  skillColor: { bg: string; border: string; text: string }
  title: string
  thinking: string
  output: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export interface StreamChunk {
  type: 'step_start' | 'step_stream' | 'step_done' | 'all_done' | 'error'
  stepId?: string
  delta?: string
  error?: string
}

const SKILL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Planner:    { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  Architect:  { bg: '#E1F5EE', border: '#0F6E56', text: '#085041' },
  Coder:      { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  Reviewer:   { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  Tester:     { bg: '#FAECE7', border: '#993C1D', text: '#712B13' },
  Documenter: { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  Writer:     { bg: '#FAECE7', border: '#993C1D', text: '#712B13' },
  Analyst:    { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  Researcher: { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  Editor:     { bg: '#FBEAF0', border: '#993556', text: '#72243E' },
}

export function buildPipeline(task: string, personaId: string): AgentStep[] {
  const t = task.toLowerCase()

  if (personaId === 'dev') {
    const steps: AgentStep[] = [
      { id: 'plan',   skill: 'Planner',    skillColor: SKILL_COLORS.Planner,    title: 'Understand & plan',      thinking: 'Breaking the task into clear subtasks and deciding the approach...', output: '', status: 'pending' },
      { id: 'arch',   skill: 'Architect',  skillColor: SKILL_COLORS.Architect,  title: 'Design architecture',    thinking: 'Designing file structure, data flow, and component boundaries...',    output: '', status: 'pending' },
      { id: 'code',   skill: 'Coder',      skillColor: SKILL_COLORS.Coder,      title: 'Write code',             thinking: 'Writing production-quality code with proper error handling...',        output: '', status: 'pending' },
    ]
    if (t.match(/test|unit|spec|jest|vitest/)) {
      steps.push({ id: 'test', skill: 'Tester', skillColor: SKILL_COLORS.Tester, title: 'Write tests', thinking: 'Writing comprehensive test cases covering happy path and edge cases...', output: '', status: 'pending' })
    }
    steps.push({ id: 'review', skill: 'Reviewer',   skillColor: SKILL_COLORS.Reviewer,   title: 'Review & improve', thinking: 'Checking for bugs, performance issues, and security vulnerabilities...', output: '', status: 'pending' })
    steps.push({ id: 'docs',   skill: 'Documenter', skillColor: SKILL_COLORS.Documenter, title: 'Document',         thinking: 'Writing usage docs, API reference, and inline comments...',            output: '', status: 'pending' })
    return steps
  }

  if (personaId === 'writer') return [
    { id: 'plan',  skill: 'Planner', skillColor: SKILL_COLORS.Planner, title: 'Plan structure', thinking: 'Outlining the content structure and key messages...', output: '', status: 'pending' },
    { id: 'draft', skill: 'Writer',  skillColor: SKILL_COLORS.Writer,  title: 'Draft content',  thinking: 'Writing the first complete draft...',                  output: '', status: 'pending' },
    { id: 'edit',  skill: 'Editor',  skillColor: SKILL_COLORS.Editor,  title: 'Edit & refine',  thinking: 'Tightening prose, improving flow and clarity...',       output: '', status: 'pending' },
  ]

  if (personaId === 'analyst') return [
    { id: 'plan',     skill: 'Planner',    skillColor: SKILL_COLORS.Planner,    title: 'Define scope',       thinking: 'Identifying what to analyse and how to structure it...', output: '', status: 'pending' },
    { id: 'research', skill: 'Researcher', skillColor: SKILL_COLORS.Researcher, title: 'Research & gather',  thinking: 'Pulling together relevant frameworks and data...',         output: '', status: 'pending' },
    { id: 'analyse',  skill: 'Analyst',    skillColor: SKILL_COLORS.Analyst,    title: 'Analyse & structure',thinking: 'Building structured analysis with insights...',             output: '', status: 'pending' },
  ]

  return [
    { id: 'plan',    skill: 'Planner',  skillColor: SKILL_COLORS.Planner,  title: 'Plan',    thinking: 'Planning the approach...',        output: '', status: 'pending' },
    { id: 'execute', skill: 'Writer',   skillColor: SKILL_COLORS.Writer,   title: 'Execute', thinking: 'Executing the task...',            output: '', status: 'pending' },
    { id: 'review',  skill: 'Reviewer', skillColor: SKILL_COLORS.Reviewer, title: 'Review',  thinking: 'Reviewing and polishing output...', output: '', status: 'pending' },
  ]
}

function getSkillPrompt(skill: string, task: string, previousOutputs: string[]): string {
  const context = previousOutputs.length > 0
    ? `\n\nPrevious steps output:\n${previousOutputs.map((o, i) => `Step ${i + 1}:\n${o}`).join('\n\n---\n\n')}`
    : ''

  const prompts: Record<string, string> = {
    Planner:    `You are the Planner skill. Deeply understand the request and produce a clear execution plan. Output: 2-3 sentence understanding, numbered execution plan, key technical decisions, potential gotchas. No code yet.${context}`,
    Architect:  `You are the Architect skill. Design the technical architecture. Output: file/folder tree, key interfaces and types, data flow, technology choices. No implementation yet — just the blueprint.${context}`,
    Coder:      `You are the Coder skill. Write the FULL working implementation. Rules: complete production code, no placeholders or TODOs, inline comments, proper error handling, TypeScript types. Label each file clearly.${context}`,
    Tester:     `You are the Tester skill. Write comprehensive tests. Cover happy path, edge cases, and errors. Use Jest/Vitest. Mock externals. Write descriptive test names.${context}`,
    Reviewer:   `You are the Reviewer skill. Critically review all work above. Check for bugs, security issues, performance, missing error handling, type safety. For each issue: problem, severity (high/medium/low), fix. End with verdict and improved critical sections.${context}`,
    Documenter: `You are the Documenter skill. Write clear developer documentation. Include: what it does, setup, usage examples with code, API reference, configuration options.${context}`,
    Writer:     `You are the Writer skill. Write high-quality engaging content based on the plan. Output the full draft. Be specific and compelling.${context}`,
    Editor:     `You are the Editor skill. Review and improve the draft. Fix clarity, flow, tone, structure. Output the polished final version.${context}`,
    Researcher: `You are the Researcher skill. Gather and synthesise relevant knowledge. Output structured findings, frameworks, and key insights.${context}`,
    Analyst:    `You are the Analyst skill. Build the complete structured analysis. Be specific with concrete examples.${context}`,
  }

  return prompts[skill] ?? `You are the ${skill} skill. Complete your part of the task thoroughly.${context}`
}

export async function runAgentStreaming(
  task: string,
  steps: AgentStep[],
  apiKey: string,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> {
  const previousOutputs: string[] = []

  for (const step of steps) {
    onChunk({ type: 'step_start', stepId: step.id })

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          stream: true,
          system: getSkillPrompt(step.skill, task, previousOutputs),
          messages: [{ role: 'user', content: task }],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? `API error ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullOutput = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const event = JSON.parse(data) as { type: string; delta?: { type: string; text?: string } }
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text ?? ''
              fullOutput += text
              onChunk({ type: 'step_stream', stepId: step.id, delta: text })
            }
          } catch { /* ignore malformed SSE */ }
        }
      }

      previousOutputs.push(fullOutput)
      onChunk({ type: 'step_done', stepId: step.id })

    } catch (err) {
      onChunk({ type: 'error', stepId: step.id, error: err instanceof Error ? err.message : 'Unknown error' })
      return
    }
  }

  onChunk({ type: 'all_done' })
}
