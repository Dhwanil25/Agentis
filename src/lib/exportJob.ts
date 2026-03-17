import type { Persona } from '@/types'
import type { PipelineStep } from '@/hooks/useAgent'
import type { WorkflowNode } from '@/types/workflow'
import type { Artifact } from '@/types/artifacts'

// ── Shared job manifest type ──────────────────────────────────────────────

export interface AgentisJob {
  version: '1.0'
  id: string
  createdAt: string
  task: string
  persona: string
  mode: 'freeform' | 'template'
  templateId?: string
  skills: string[]
  steps: {
    id: string
    skill: string
    title: string
    output: string
  }[]
}

// ── Build job from freeform pipeline ─────────────────────────────────────

export function buildJobFromPipeline(
  task: string,
  persona: Persona,
  pipeline: PipelineStep[]
): AgentisJob {
  return {
    version: '1.0',
    id: `agentis-${Date.now()}`,
    createdAt: new Date().toISOString(),
    task,
    persona: persona.id,
    mode: 'freeform',
    skills: pipeline.map(p => p.skill),
    steps: pipeline.map(p => ({
      id: p.id,
      skill: p.skill,
      title: p.title,
      output: p.output,
    })),
  }
}

// ── Build job from template workflow nodes ────────────────────────────────

export function buildJobFromWorkflow(
  task: string,
  persona: Persona,
  nodes: WorkflowNode[],
  templateId: string
): AgentisJob {
  const done = nodes.filter(n => n.status === 'done')
  return {
    version: '1.0',
    id: `agentis-${Date.now()}`,
    createdAt: new Date().toISOString(),
    task,
    persona: persona.id,
    mode: 'template',
    templateId,
    skills: done.map(n => n.skill),
    steps: done.map(n => ({
      id: n.id,
      skill: n.skill,
      title: n.title,
      output: n.output,
    })),
  }
}

// ── Extract code blocks from Coder output ────────────────────────────────

function extractCodeFiles(coderOutput: string): Record<string, string> {
  const files: Record<string, string> = {}

  // Match: **filename.ts**, `filename.ts`, ### filename.ts, // filename.ts, filename: ...
  // followed by a fenced code block
  const pattern =
    /(?:(?:\*\*|`{1,3}|###?\s*|\/\/\s*|filename:\s*)([a-zA-Z0-9_./-]+\.[a-zA-Z]+)(?:\*\*|`{1,3})?[\s\S]*?```(?:[a-z]*)\n([\s\S]*?)```)/g

  let match
  while ((match = pattern.exec(coderOutput)) !== null) {
    const filename = match[1].trim()
    const code = match[2].trim()
    if (filename && code) files[filename] = code
  }

  // Fallback: extract all fenced code blocks
  if (Object.keys(files).length === 0) {
    const fallback = /```(?:[a-z]+)?\n([\s\S]*?)```/g
    let i = 1
    let fm
    while ((fm = fallback.exec(coderOutput)) !== null) {
      files[`generated-${i++}.ts`] = fm[1].trim()
    }
  }

  return files
}

// ── Build zip file contents ───────────────────────────────────────────────

function buildFiles(
  job: AgentisJob,
  steps: { id: string; skill: string; title: string; output: string }[],
  artifacts?: Artifact[]
): Record<string, string> {
  const files: Record<string, string> = {}

  // job.json
  files['agentis-job/job.json'] = JSON.stringify(job, null, 2)

  // One markdown per step (except Coder gets special treatment)
  for (const step of steps) {
    const slug = step.skill.toLowerCase().replace(/\s+/g, '-')
    if (slug === 'coder') continue
    files[`agentis-job/${slug}.md`] = `# ${step.title}\n\n${step.output}`
  }

  // Coder: extract individual code files
  const coderSteps = steps.filter(s => s.skill.toLowerCase() === 'coder')
  for (const coderStep of coderSteps) {
    const codeFiles = extractCodeFiles(coderStep.output)
    for (const [filename, content] of Object.entries(codeFiles)) {
      files[`agentis-job/code/${filename}`] = content
    }
    files[`agentis-job/coder-raw.md`] = `# Coder output\n\n${coderStep.output}`
  }

  // If we have typed artifacts (template mode), include them under code/
  if (artifacts && artifacts.length > 0) {
    for (const artifact of artifacts) {
      files[`agentis-job/code/${artifact.filename}`] = artifact.content
    }
  }

  // CLAUDE.md
  files['agentis-job/CLAUDE.md'] = buildClaudeMd(job, steps)

  // execute.sh
  files['agentis-job/execute.sh'] = buildExecuteSh(job)

  return files
}

// ── CLAUDE.md ─────────────────────────────────────────────────────────────

function buildClaudeMd(
  job: AgentisJob,
  steps: { skill: string; title: string; output: string }[]
): string {
  const planner = steps.find(s => s.skill.toLowerCase() === 'planner')
  const architect = steps.find(s => s.skill.toLowerCase() === 'architect')
  const reviewer = steps.find(s => s.skill.toLowerCase() === 'reviewer')

  return `# Agentis Job — Instructions for Claude Code

## Task
${job.task}

## What Agentis has already done
Agentis completed the thinking phase using ${steps.length} agents:
${steps.map(s => `- **${s.skill}**: ${s.title}`).join('\n')}

## Your job (Claude Code)
You are picking up where Agentis left off. Your job is to:
1. Read \`agentis-job/job.json\` and this file carefully
2. Place the generated code files from \`agentis-job/code/\` into the correct locations in this repo
3. Run the existing test suite to check for errors
4. Fix any errors or type issues you find
5. Run the tests again to confirm everything passes
6. Commit with message: \`feat(agentis): <short description>\`
7. Open a pull request titled: \`[Agentis] ${job.task.slice(0, 60)}\`

## Plan (from Agentis Planner)
${planner?.output ?? 'See planner.md'}

## Architecture notes
${architect?.output ?? 'Not available — see agent trace in job.json'}

## Review notes
${reviewer?.output ?? 'See reviewer.md'}

## Rules
- Do NOT re-plan or re-architect — Agentis has done that. Go straight to execution.
- Place files exactly where the architecture specifies
- If a file already exists, merge carefully — do not overwrite existing logic
- Run tests after placing files; fix all errors before committing
- Branch name format: \`agentis/<task-slug>\`
- Delete the \`agentis-job/\` folder after opening the PR

## Job metadata
- Job ID: ${job.id}
- Created: ${job.createdAt}
- Persona: ${job.persona}
- Mode: ${job.mode}${job.templateId ? `\n- Template: ${job.templateId}` : ''}
- Skills used: ${job.skills.join(', ')}
`
}

// ── execute.sh ────────────────────────────────────────────────────────────

function buildExecuteSh(job: AgentisJob): string {
  return `#!/bin/bash
# Agentis → Claude Code executor
# Job: ${job.id}
# Task: ${job.task}
#
# Usage: drop this file + the agentis-job/ folder into your repo root
# Then run: bash agentis-job/execute.sh

set -e

echo "Agentis job: ${job.task}"
echo "Job ID: ${job.id}"
echo ""
echo "Handing off to Claude Code..."
echo ""

# Check Claude Code is installed
if ! command -v claude &> /dev/null; then
  echo "Claude Code not found."
  echo "Install it: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

# Run Claude Code with the job context
claude --print "Read agentis-job/CLAUDE.md carefully, then execute the job. Place the code files from agentis-job/code/ into the right locations in this repo, run tests, fix any errors, then commit and open a PR."

echo ""
echo "Agentis job complete."
`
}

// ── Download as zip ───────────────────────────────────────────────────────

export async function downloadJobZip(
  task: string,
  persona: Persona,
  pipeline: PipelineStep[]
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const job = buildJobFromPipeline(task, persona, pipeline)
  const files = buildFiles(job, job.steps)

  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agentis-job-${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadWorkflowJobZip(
  task: string,
  persona: Persona,
  nodes: WorkflowNode[],
  artifacts: Artifact[],
  templateId: string
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const job = buildJobFromWorkflow(task, persona, nodes, templateId)
  const files = buildFiles(job, job.steps, artifacts)

  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agentis-job-${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
