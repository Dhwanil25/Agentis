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
  'api-designer': {
    id: 'api-designer',
    label: 'API Designer',
    description: 'Designs REST/GraphQL contracts',
    color: { bg: '#F0FDF4', border: '#16A34A', text: '#15803D' },
  },
  'test-engineer': {
    id: 'test-engineer',
    label: 'Test Engineer',
    description: 'Full test suites with fixtures',
    color: { bg: '#FFF7ED', border: '#C2410C', text: '#9A3412' },
  },
  'security-auditor': {
    id: 'security-auditor',
    label: 'Security Auditor',
    description: 'OWASP security review',
    color: { bg: '#FEF2F2', border: '#DC2626', text: '#B91C1C' },
  },
  critiquer: {
    id: 'critiquer',
    label: 'Critiquer',
    description: 'Adversarial code review',
    color: { bg: '#F5F3FF', border: '#7C3AED', text: '#5B21B6' },
  },
  reviser: {
    id: 'reviser',
    label: 'Reviser',
    description: 'Applies review fixes',
    color: { bg: '#ECFDF5', border: '#059669', text: '#047857' },
  },
  integrator: {
    id: 'integrator',
    label: 'Integrator',
    description: 'Merges parallel workstreams',
    color: { bg: '#F0F9FF', border: '#0284C7', text: '#0369A1' },
  },
  scaffolder: {
    id: 'scaffolder',
    label: 'Scaffolder',
    description: 'Generates project structure',
    color: { bg: '#EDF7FF', border: '#0369A1', text: '#075985' },
  },
  'schema-designer': {
    id: 'schema-designer',
    label: 'Schema Designer',
    description: 'DB schemas and types',
    color: { bg: '#FAFAF9', border: '#57534E', text: '#44403C' },
  },
  devops: {
    id: 'devops',
    label: 'DevOps',
    description: 'Docker, CI/CD, infra',
    color: { bg: '#F7FEE7', border: '#65A30D', text: '#4D7C0F' },
  },
  documenter: {
    id: 'documenter',
    label: 'Documenter',
    description: 'Developer documentation',
    color: { bg: '#EAF3DE', border: '#3B6D11', text: '#27500A' },
  },
  tester: {
    id: 'tester',
    label: 'Tester',
    description: 'Test cases and suites',
    color: { bg: '#FAECE7', border: '#993C1D', text: '#712B13' },
  },
}
