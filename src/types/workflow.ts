import type { Artifact } from './artifacts'

export type NodeStatus = 'pending' | 'running' | 'done' | 'error'

export interface WorkflowNode {
  id: string
  skill: string
  skillColor: { bg: string; border: string; text: string }
  title: string
  thinking: string
  dependsOn: string[]
  parallelGroup?: string
  critiques?: string[]
  outputKey: string
  maxTokens: number
  temperature: number
  status: NodeStatus
  output: string
  artifacts: Artifact[]
  startedAt?: number
  doneAt?: number
}

export interface WorkflowGraph {
  id: string
  nodes: WorkflowNode[]
}

export interface WorkflowContext {
  task: string
  personaId: string
  templateId: string | null
  outputs: Record<string, string>
}

export type WorkflowEventType = 'node_start' | 'node_stream' | 'node_done' | 'node_error' | 'workflow_done'

export interface WorkflowEvent {
  type: WorkflowEventType
  nodeId?: string
  delta?: string
  error?: string
  artifacts?: Artifact[]
}
