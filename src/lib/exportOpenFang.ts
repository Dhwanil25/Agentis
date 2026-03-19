/**
 * Export completed Agentis workflows to the OpenFang daemon.
 *
 * OpenFang stores these as conversation history on the assistant agent,
 * making the outputs available for future autonomous follow-up tasks.
 * Uses POST /v1/chat/completions (non-streaming) to store the summary.
 */

import type { Persona } from '@/types'
import type { WorkflowNode } from '@/types/workflow'

// ── Resolve base URL (same proxy logic as openfang-runner.ts) ─────────────────

function getBaseUrl(daemonUrl: string): string {
  if (import.meta.env.DEV) return '/agentis-proxy'
  return daemonUrl.replace(/\/$/, '')
}

// ── Build the save message ────────────────────────────────────────────────────

function buildSaveMessage(
  task: string,
  persona: string,
  mode: 'freeform' | 'template',
  steps: Array<{ skill: string; title: string; output: string }>,
  templateId?: string
): string {
  const header = [
    `[Agentis Workflow Export — ${new Date().toISOString()}]`,
    `Task: ${task}`,
    `Persona: ${persona}`,
    `Mode: ${mode}${templateId ? ` (template: ${templateId})` : ''}`,
    `Steps: ${steps.length}`,
    '',
  ].join('\n')

  const body = steps
    .map((s, i) => `## Step ${i + 1}: ${s.skill} — ${s.title}\n\n${s.output}`)
    .join('\n\n---\n\n')

  return (
    `Please store the following completed Agentis workflow for future reference:\n\n` +
    header + body
  )
}

// ── Post to OpenFang via OpenAI-compat endpoint ───────────────────────────────

async function saveToOpenFang(message: string, daemonUrl: string): Promise<void> {
  const url = `${getBaseUrl(daemonUrl)}/v1/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openfang:assistant',
      stream: false,
      messages: [{ role: 'user', content: message }],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Agentis Engine returned ${res.status}: ${text}`)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportFreeformToOpenFang(
  task: string,
  persona: Persona,
  pipeline: Array<{ skill: string; title: string; output: string }>,
  daemonUrl: string
): Promise<void> {
  const message = buildSaveMessage(task, persona.id, 'freeform', pipeline)
  await saveToOpenFang(message, daemonUrl)
}

export async function exportWorkflowToOpenFang(
  task: string,
  persona: Persona,
  nodes: WorkflowNode[],
  templateId: string,
  daemonUrl: string
): Promise<void> {
  const steps = nodes
    .filter(n => n.status === 'done' && n.output)
    .map(n => ({ skill: n.skill, title: n.title, output: n.output ?? '' }))

  const message = buildSaveMessage(task, persona.id, 'template', steps, templateId)
  await saveToOpenFang(message, daemonUrl)
}
