import type { Skill } from '@/types'

export const SKILLS: Record<string, Skill> = {
  planner: {
    id: 'planner',
    label: 'Planner',
    description: 'Decomposes tasks into subtasks',
    color: { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  },
  coder: {
    id: 'coder',
    label: 'Coder',
    description: 'Writes production-quality code',
    color: { bg: '#E1F5EE', border: '#0F6E56', text: '#085041' },
  },
  reviewer: {
    id: 'reviewer',
    label: 'Reviewer',
    description: 'Reviews and improves quality',
    color: { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  },
  writer: {
    id: 'writer',
    label: 'Writer',
    description: 'Crafts compelling content',
    color: { bg: '#FAECE7', border: '#993C1D', text: '#712B13' },
  },
  editor: {
    id: 'editor',
    label: 'Editor',
    description: 'Refines and polishes output',
    color: { bg: '#FBEAF0', border: '#993556', text: '#72243E' },
  },
  analyst: {
    id: 'analyst',
    label: 'Analyst',
    description: 'Structures data and insights',
    color: { bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  },
  researcher: {
    id: 'researcher',
    label: 'Researcher',
    description: 'Synthesises knowledge',
    color: { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  },
}
