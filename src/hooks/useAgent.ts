import { useState, useCallback } from 'react'
import type { AgentState, Persona } from '@/types'
import type { AgentStep as PipelineStep } from '@/lib/claude'
import { buildPipeline, runAgentStreaming } from '@/lib/claude'
import type { WorkflowGraph } from '@/types/workflow'
import type { Artifact } from '@/types/artifacts'
import { runWorkflow } from '@/lib/engine'
import { SKILL_COLORS, DEFAULT_SKILL_COLOR } from '@/lib/colors'
import { buildOpenFangPipeline, runOnOpenFangHand } from '@/lib/openfang-runner'
import { addUsageRecord, calculateCost } from '@/lib/analytics'
import { autoSaveTaskMemory } from '@/lib/memory'

export type { PipelineStep }

export interface AgentStateEx extends AgentState {
  pipeline: PipelineStep[]
  mode: 'template' | 'freeform' | null
  templateId: string | null
  graph: WorkflowGraph | null
  allArtifacts: Artifact[]
}

const initial: AgentStateEx = {
  step: 'persona',
  persona: null,
  task: '',
  activeSkills: [],
  output: '',
  loading: false,
  error: null,
  pipeline: [],
  mode: null,
  templateId: null,
  graph: null,
  allArtifacts: [],
}

export function useAgent(apiKey: string, openfangUrl?: string) {
  const [state, setState] = useState<AgentStateEx>(initial)

  const setStep = useCallback((step: AgentState['step']) => {
    setState(s => ({ ...s, step, error: null }))
  }, [])

  const selectPersona = useCallback((persona: Persona) => {
    setState(s => ({ ...s, persona, activeSkills: persona.skills }))
  }, [])

  const setTask = useCallback((task: string) => {
    setState(s => ({ ...s, task }))
  }, [])

  const setMode = useCallback((mode: 'template' | 'freeform') => {
    setState(s => ({
      ...s,
      mode,
      error: null,
      // Navigate: freeform goes to task entry, template goes to template selection
      step: mode === 'freeform' ? 'task' : 'template',
    }))
  }, [])

  const selectTemplate = useCallback((templateId: string) => {
    setState(s => ({ ...s, templateId }))
  }, [])

  const execute = useCallback(async (task: string, personaId: string) => {
    if (!task.trim() || !apiKey) return

    const pipeline = buildPipeline(task, personaId)
    setState(s => ({ ...s, pipeline, loading: true, error: null, step: 'execute', task }))

    await runAgentStreaming(task, pipeline, apiKey, (chunk) => {
      if (chunk.type === 'step_start') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, status: 'running' } : p
          ),
        }))
      } else if (chunk.type === 'step_stream') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, output: p.output + (chunk.delta ?? '') } : p
          ),
        }))
      } else if (chunk.type === 'step_done') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, status: 'done' } : p
          ),
        }))
      } else if (chunk.type === 'all_done') {
        setState(s => {
          // Auto-save task memory from first completed step output
          const firstOutput = s.pipeline.find(p => p.output)?.output ?? ''
          if (firstOutput) autoSaveTaskMemory(personaId, task, firstOutput).catch(() => {})
          return { ...s, loading: false, step: 'output' }
        })
        // Save token usage to analytics
        if (chunk.totalInputTokens !== undefined) {
          const model = chunk.model ?? 'claude-sonnet-4-20250514'
          addUsageRecord({
            ts: Date.now(), model, persona: personaId, task,
            inputTokens: chunk.totalInputTokens,
            outputTokens: chunk.totalOutputTokens ?? 0,
            cost: calculateCost(model, chunk.totalInputTokens, chunk.totalOutputTokens ?? 0),
            stepCount: pipeline.length,
          })
        }
      } else if (chunk.type === 'error') {
        setState(s => ({
          ...s,
          loading: false,
          error: chunk.error ?? 'Unknown error',
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, status: 'error' } : p
          ),
        }))
      }
    })
  }, [apiKey])

  const executeWorkflow = useCallback(async (
    task: string,
    templateId: string,
    personaId: string
  ) => {
    if (!task.trim() || !apiKey) return

    // Dynamic import so a missing templates file is a runtime error, not a build error
    let template
    try {
      const mod = await import('@/data/templates')
      const templates = mod.WORKFLOW_TEMPLATES as import('@/types/templates').WorkflowTemplate[]
      template = templates.find(t => t.id === templateId)
      if (!template) throw new Error(`Template "${templateId}" not found`)
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load templates',
      }))
      return
    }

    // Build WorkflowGraph from template node definitions
    const graph: WorkflowGraph = {
      id: `${templateId}-${Date.now()}`,
      nodes: template.nodeDefinitions.map(def => ({
        id: def.id,
        skill: def.skill,
        skillColor: SKILL_COLORS[def.skill] ?? DEFAULT_SKILL_COLOR,
        title: def.title,
        thinking: def.thinking,
        dependsOn: def.dependsOn,
        parallelGroup: def.parallelGroup,
        critiques: def.critiques,
        outputKey: def.id,
        maxTokens: def.maxTokens,
        temperature: def.temperature,
        status: 'pending',
        output: '',
        artifacts: [],
      })),
    }

    setState(s => ({
      ...s,
      step: 'execute',
      graph,
      loading: true,
      error: null,
      allArtifacts: [],
      task,
      templateId,
    }))

    const workflowContext = {
      task,
      personaId,
      templateId,
      outputs: {},
    }

    await runWorkflow(graph, workflowContext, apiKey, (event) => {
      if (event.type === 'node_start') {
        setState(s => ({
          ...s,
          graph: s.graph
            ? {
                ...s.graph,
                nodes: s.graph.nodes.map(n =>
                  n.id === event.nodeId
                    ? { ...n, status: 'running', startedAt: Date.now() }
                    : n
                ),
              }
            : s.graph,
        }))
      } else if (event.type === 'node_stream') {
        setState(s => ({
          ...s,
          graph: s.graph
            ? {
                ...s.graph,
                nodes: s.graph.nodes.map(n =>
                  n.id === event.nodeId
                    ? { ...n, output: n.output + (event.delta ?? '') }
                    : n
                ),
              }
            : s.graph,
        }))
      } else if (event.type === 'node_done') {
        const incoming = event.artifacts ?? []
        setState(s => ({
          ...s,
          allArtifacts: [...s.allArtifacts, ...incoming],
          graph: s.graph
            ? {
                ...s.graph,
                nodes: s.graph.nodes.map(n =>
                  n.id === event.nodeId
                    ? { ...n, status: 'done', doneAt: Date.now(), artifacts: incoming }
                    : n
                ),
              }
            : s.graph,
        }))
      } else if (event.type === 'node_error') {
        setState(s => ({
          ...s,
          error: event.error ?? 'Node failed',
          graph: s.graph
            ? {
                ...s.graph,
                nodes: s.graph.nodes.map(n =>
                  n.id === event.nodeId ? { ...n, status: 'error' } : n
                ),
              }
            : s.graph,
        }))
      } else if (event.type === 'workflow_done') {
        setState(s => ({ ...s, loading: false, step: 'output' }))
      }
    })
  }, [apiKey])

  // ── OpenFang Hand execution ───────────────────────────────────────────────
  const executeOnOpenFang = useCallback(async (task: string, personaId: string) => {
    if (!task.trim() || !openfangUrl) return

    const pipeline = buildOpenFangPipeline(personaId)
    setState(s => ({ ...s, pipeline, loading: true, error: null, step: 'execute', mode: 'freeform' }))

    await runOnOpenFangHand(task, personaId, openfangUrl, (chunk) => {
      if (chunk.type === 'step_start') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p => p.id === chunk.stepId ? { ...p, status: 'running' } : p),
        }))
      } else if (chunk.type === 'step_stream') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, output: p.output + (chunk.delta ?? '') } : p
          ),
        }))
      } else if (chunk.type === 'step_tool_start') {
        // New tool starting — update thinking label and add to log
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? {
              ...p,
              thinking: chunk.thinking ?? `Using ${chunk.tool}`,
              toolLog: [...p.toolLog, { tool: chunk.tool ?? '', label: chunk.thinking ?? chunk.tool ?? '', input: '', done: false }],
            } : p
          ),
        }))
      } else if (chunk.type === 'step_tool_input') {
        // Update the last tool entry with streamed arguments
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p => {
            if (p.id !== chunk.stepId) return p
            const log = [...p.toolLog]
            if (log.length > 0) log[log.length - 1] = { ...log[log.length - 1], input: chunk.input ?? '' }
            return { ...p, toolLog: log }
          }),
        }))
      } else if (chunk.type === 'step_done') {
        setState(s => ({
          ...s,
          pipeline: s.pipeline.map(p => p.id === chunk.stepId
            ? { ...p, status: 'done', toolLog: p.toolLog.map(t => ({ ...t, done: true })) }
            : p
          ),
        }))
      } else if (chunk.type === 'all_done') {
        setState(s => ({ ...s, loading: false, step: 'output' }))
      } else if (chunk.type === 'error') {
        setState(s => ({
          ...s,
          loading: false,
          error: chunk.error ?? 'OpenFang execution failed',
          pipeline: s.pipeline.map(p =>
            p.id === chunk.stepId ? { ...p, status: 'error' } : p
          ),
        }))
      }
    })
  }, [openfangUrl])

  const reset = useCallback(() => setState(initial), [])

  return { state, setStep, selectPersona, setTask, setMode, selectTemplate, execute, executeWorkflow, executeOnOpenFang, reset }
}
