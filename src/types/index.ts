export interface Skill {
  id: string
  label: string
  description: string
  color: {
    bg: string
    border: string
    text: string
  }
}

export interface Persona {
  id: string
  label: string
  icon: string
  description: string
  skills: string[]        // skill ids
  suggestions: string[]
}

export type AgentStep = 'persona' | 'task' | 'graph' | 'execute' | 'output' | 'mode' | 'template' | 'preview'

export interface AgentState {
  step: AgentStep
  persona: Persona | null
  task: string
  activeSkills: string[]
  output: string
  loading: boolean
  error: string | null
  templateId: string | null
  mode: 'template' | 'freeform' | null
}
