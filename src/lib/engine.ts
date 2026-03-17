import type { WorkflowGraph, WorkflowContext, WorkflowEvent } from '@/types/workflow'
import { buildNodePrompt } from '@/lib/prompts'
import { extractArtifacts } from '@/lib/artifacts'

const API_URL = 'https://api.anthropic.com/v1/messages'

// Returns the full accumulated output. Emits node_start and node_stream only —
// node_done is emitted by runWorkflow after artifacts are extracted.
async function runNodeStreaming(
  nodeId: string,
  skill: string,
  task: string,
  depsContext: string,
  critiqueContext: string,
  apiKey: string,
  maxTokens: number,
  temperature: number,
  onEvent: (event: WorkflowEvent) => void
): Promise<string> {
  const prompt = buildNodePrompt(skill, task, depsContext, critiqueContext)

  onEvent({ type: 'node_start', nodeId })

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
      max_tokens: maxTokens,
      temperature,
      stream: true,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    const message = err.error?.message ?? `API error ${response.status}`
    onEvent({ type: 'node_error', nodeId, error: message })
    throw new Error(message)
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
          onEvent({ type: 'node_stream', nodeId, delta: text })
        }
      } catch { /* ignore malformed SSE */ }
    }
  }

  return fullOutput
}

export async function runWorkflow(
  graph: WorkflowGraph,
  context: WorkflowContext,
  apiKey: string,
  onEvent: (event: WorkflowEvent) => void
): Promise<void> {
  const doneSet = new Set<string>()
  const outputs: Record<string, string> = { ...context.outputs }
  let pending = [...graph.nodes]

  while (pending.length > 0) {
    const ready = pending.filter(n => n.dependsOn.every(id => doneSet.has(id)))

    if (ready.length === 0) {
      onEvent({ type: 'node_error', error: 'Workflow stalled: possible circular dependency' })
      return
    }

    // Run all ready nodes concurrently, then mark them done together
    await Promise.all(
      ready.map(async node => {
        // Build context string from nodes this node depends on
        const depsContext = node.dependsOn
          .filter(id => outputs[id])
          .map(id => {
            const depNode = graph.nodes.find(n => n.id === id)
            return `## ${depNode?.skill ?? id} — ${depNode?.title ?? id}\n${outputs[id]}`
          })
          .join('\n\n---\n\n')

        // Build critique context from nodes listed in critiques[]
        const critiqueContext = (node.critiques ?? [])
          .filter(id => outputs[id])
          .map(id => {
            const targetNode = graph.nodes.find(n => n.id === id)
            return `## ${targetNode?.skill ?? id} — ${targetNode?.title ?? id}\n${outputs[id]}`
          })
          .join('\n\n---\n\n')

        const output = await runNodeStreaming(
          node.id,
          node.skill,
          context.task,
          depsContext,
          critiqueContext,
          apiKey,
          node.maxTokens,
          node.temperature,
          onEvent
        )

        outputs[node.id] = output
        outputs[node.outputKey] = output

        const artifacts = extractArtifacts(node.id, output)

        // Single node_done emission with artifacts attached
        onEvent({ type: 'node_done', nodeId: node.id, artifacts })
      })
    )

    for (const node of ready) {
      doneSet.add(node.id)
    }
    pending = pending.filter(n => !doneSet.has(n.id))
  }

  onEvent({ type: 'workflow_done' })
}
