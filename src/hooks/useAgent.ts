import { useState, useCallback } from 'react'
import type { AgentState, Persona } from '@/types'
import type { AgentStep as PipelineStep } from '@/lib/claude'
import { buildPipeline, runAgentStreaming } from '@/lib/claude'

export type { PipelineStep }

export interface AgentStateEx extends AgentState {
  pipeline: PipelineStep[]
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
}

export function useAgent(apiKey: string) {
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

  const execute = useCallback(async (task: string, personaId: string) => {
    if (!task.trim() || !apiKey) return

    const pipeline = buildPipeline(task, personaId)
    setState(s => ({ ...s, pipeline, loading: true, error: null, step: 'execute' }))

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
        setState(s => ({ ...s, loading: false, step: 'output' }))
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

  const reset = useCallback(() => setState(initial), [])

  return { state, setStep, selectPersona, setTask, execute, reset }
}
