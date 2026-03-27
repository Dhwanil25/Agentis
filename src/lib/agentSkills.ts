// ── Agent Skills — skills.sh integration ──────────────────────────────────────
// Fetches SKILL.md files from GitHub, stores them in localStorage,
// and injects them into agent system prompts by role.

import type { AgentRole } from './multiAgentEngine'

export interface SkillEntry {
  id: string
  name: string
  description: string
  category: 'development' | 'design' | 'ai' | 'research' | 'writing' | 'analysis' | 'operations'
  author: string        // display label, e.g. "anthropics/skills"
  githubRepo: string    // e.g. "anthropics/skills"
  skillPath: string     // subfolder in repo, e.g. "frontend-design"
  installs: string      // display string, e.g. "206K"
  suggestedRoles: AgentRole[]
}

export interface InstalledSkill extends SkillEntry {
  content: string       // raw SKILL.md text
  installedAt: number
}

const SKILLS_KEY = 'agentis_skills_installed'
const ASSIGNMENTS_KEY = 'agentis_skills_assignments'

// ── Curated directory ──────────────────────────────────────────────────────────
export const SKILLS_DIRECTORY: SkillEntry[] = [
  // Anthropic
  {
    id: 'frontend-design',
    name: 'Frontend Design',
    description: 'Distinctive, production-grade frontend interfaces that reject generic AI aesthetics. Guides bold aesthetic direction with typography, color, motion, and layout.',
    category: 'design',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'frontend-design',
    installs: '206K',
    suggestedRoles: ['coder', 'writer'],
  },
  {
    id: 'claude-api',
    name: 'Claude API',
    description: 'Best practices for building applications with the Claude API and Anthropic SDK, including streaming, tool use, and prompt patterns.',
    category: 'ai',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'claude-api',
    installs: '7K',
    suggestedRoles: ['coder'],
  },
  {
    id: 'mcp-builder',
    name: 'MCP Builder',
    description: 'Build Model Context Protocol servers and tools. Covers server setup, tool definitions, resource handling, and client integration.',
    category: 'ai',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'mcp-builder',
    installs: '28K',
    suggestedRoles: ['coder', 'planner'],
  },
  {
    id: 'webapp-testing',
    name: 'Web App Testing',
    description: 'Comprehensive testing strategies for web applications — unit, integration, e2e, and accessibility testing with modern frameworks.',
    category: 'development',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'webapp-testing',
    installs: '34K',
    suggestedRoles: ['coder', 'reviewer'],
  },
  {
    id: 'web-artifacts-builder',
    name: 'Web Artifacts Builder',
    description: 'Build interactive web artifacts, demos, and prototypes as self-contained HTML/CSS/JS files.',
    category: 'design',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'web-artifacts-builder',
    installs: '20K',
    suggestedRoles: ['coder', 'writer'],
  },
  {
    id: 'skill-creator',
    name: 'Skill Creator',
    description: 'Template and step-by-step guide for creating new skills for the skills.sh registry.',
    category: 'ai',
    author: 'anthropics/skills',
    githubRepo: 'anthropics/skills',
    skillPath: 'skill-creator',
    installs: '110K',
    suggestedRoles: ['planner', 'writer'],
  },
  // Vercel
  {
    id: 'vercel-react-best-practices',
    name: 'React Best Practices',
    description: "Vercel-recommended patterns for production React apps — components, hooks, data fetching, performance, and deployment.",
    category: 'development',
    author: 'vercel-labs/agent-skills',
    githubRepo: 'vercel-labs/agent-skills',
    skillPath: 'vercel-react-best-practices',
    installs: '253K',
    suggestedRoles: ['coder'],
  },
  {
    id: 'web-design-guidelines',
    name: 'Web Design Guidelines',
    description: 'Comprehensive design system guidelines — spacing, typography, color tokens, component patterns, and accessibility.',
    category: 'design',
    author: 'vercel-labs/agent-skills',
    githubRepo: 'vercel-labs/agent-skills',
    skillPath: 'web-design-guidelines',
    installs: '203K',
    suggestedRoles: ['coder', 'writer'],
  },
  // Supabase
  {
    id: 'supabase-postgres-best-practices',
    name: 'Supabase / Postgres',
    description: 'Best practices for building with Supabase and PostgreSQL — schema design, RLS, queries, and Edge Functions.',
    category: 'development',
    author: 'supabase/agent-skills',
    githubRepo: 'supabase/agent-skills',
    skillPath: 'supabase-postgres-best-practices',
    installs: '52K',
    suggestedRoles: ['coder'],
  },
  // Marketing
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    description: 'Comprehensive SEO analysis — on-page, technical, and content optimization recommendations.',
    category: 'research',
    author: 'coreyhaines31/marketingskills',
    githubRepo: 'coreyhaines31/marketingskills',
    skillPath: 'seo-audit',
    installs: '57K',
    suggestedRoles: ['analyst', 'researcher'],
  },
  {
    id: 'copywriting',
    name: 'Copywriting',
    description: 'Professional marketing copy, ads, email campaigns, and persuasive long-form writing.',
    category: 'writing',
    author: 'coreyhaines31/marketingskills',
    githubRepo: 'coreyhaines31/marketingskills',
    skillPath: 'copywriting',
    installs: '49K',
    suggestedRoles: ['writer'],
  },
  // Brainstorming
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Structured ideation frameworks — mind maps, lateral thinking, constraint-based creativity, and idea evaluation.',
    category: 'analysis',
    author: 'obra/superpowers',
    githubRepo: 'obra/superpowers',
    skillPath: 'brainstorming',
    installs: '76K',
    suggestedRoles: ['planner', 'analyst'],
  },
]

// ── Fetch SKILL.md from GitHub ─────────────────────────────────────────────────
export async function fetchSkillContent(githubRepo: string, skillPath: string): Promise<string> {
  const branches = ['main', 'master']
  const paths = [`${skillPath}/SKILL.md`, 'SKILL.md']

  for (const branch of branches) {
    for (const path of paths) {
      try {
        const url = `https://raw.githubusercontent.com/${githubRepo}/${branch}/${path}`
        const res = await fetch(url)
        if (res.ok) {
          const text = await res.text()
          if (text.trim()) return text
        }
      } catch {
        // try next combination
      }
    }
  }
  throw new Error(`Could not fetch SKILL.md from ${githubRepo} (tried main/master branches)`)
}

// ── localStorage persistence ───────────────────────────────────────────────────
export function getInstalledSkills(): InstalledSkill[] {
  try {
    const raw = localStorage.getItem(SKILLS_KEY)
    return raw ? (JSON.parse(raw) as InstalledSkill[]) : []
  } catch {
    return []
  }
}

export function isSkillInstalled(skillId: string): boolean {
  return getInstalledSkills().some(s => s.id === skillId)
}

export function installSkill(entry: SkillEntry, content: string): void {
  const existing = getInstalledSkills().filter(s => s.id !== entry.id)
  localStorage.setItem(SKILLS_KEY, JSON.stringify([...existing, { ...entry, content, installedAt: Date.now() }]))
}

export function uninstallSkill(skillId: string): void {
  localStorage.setItem(SKILLS_KEY, JSON.stringify(getInstalledSkills().filter(s => s.id !== skillId)))
  // Remove from all role assignments
  const assignments = getRoleAssignments()
  for (const role of Object.keys(assignments) as AgentRole[]) {
    assignments[role] = (assignments[role] ?? []).filter(id => id !== skillId)
  }
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

// ── Role assignments ───────────────────────────────────────────────────────────
export function getRoleAssignments(): Partial<Record<AgentRole, string[]>> {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<AgentRole, string[]>>) : {}
  } catch {
    return {}
  }
}

export function assignSkillToRole(skillId: string, role: AgentRole): void {
  const assignments = getRoleAssignments()
  const current = assignments[role] ?? []
  if (!current.includes(skillId)) {
    assignments[role] = [...current, skillId]
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
  }
}

export function removeSkillFromRole(skillId: string, role: AgentRole): void {
  const assignments = getRoleAssignments()
  assignments[role] = (assignments[role] ?? []).filter(id => id !== skillId)
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

export function getSkillsForRole(role: AgentRole): InstalledSkill[] {
  const installed = getInstalledSkills()
  const assignments = getRoleAssignments()
  const ids = assignments[role] ?? []
  return installed.filter(s => ids.includes(s.id))
}

export function getTotalAssignmentCount(): number {
  const assignments = getRoleAssignments()
  return Object.values(assignments).reduce((sum, ids) => sum + (ids?.length ?? 0), 0)
}
