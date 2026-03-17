export type TemplateCategory = 'engineering' | 'documentation' | 'analysis' | 'product'

export interface NodeDefinition {
  id: string
  skill: string
  title: string
  thinking: string
  dependsOn: string[]
  parallelGroup?: string
  critiques?: string[]
  maxTokens: number
  temperature: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  personaId: string
  estimatedMinutes: number
  tags: string[]
  icon: string
  nodeDefinitions: NodeDefinition[]
  taskPromptGuide: string
}
