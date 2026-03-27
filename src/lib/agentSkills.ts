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

// ── Live search via skills.sh API ─────────────────────────────────────────────
interface SkillsShResult {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
}

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function formatName(skillId: string): string {
  return skillId
    .replace(/[-_:]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function inferCategory(skillId: string, source: string): SkillEntry['category'] {
  const s = (skillId + ' ' + source).toLowerCase()
  if (s.match(/react|vue|angular|css|design|ui|ux|frontend|style|theme|web/)) return 'design'
  if (s.match(/test|debug|review|audit|security|seo/)) return 'analysis'
  if (s.match(/research|search|scrape|crawl/)) return 'research'
  if (s.match(/write|copy|doc|blog|content|post/)) return 'writing'
  if (s.match(/mcp|agent|ai|llm|claude|gpt|model|skill/)) return 'ai'
  if (s.match(/deploy|infra|ci|cd|devops|docker|k8s|ops/)) return 'operations'
  return 'development'
}

export async function searchSkillsDirectory(query: string): Promise<SkillEntry[]> {
  if (!query.trim()) return []
  try {
    const endpoint = window.location.hostname === 'localhost'
      ? `/skills-sh/api/search?q=${encodeURIComponent(query)}`
      : `https://skills.sh/api/search?q=${encodeURIComponent(query)}`
    const res = await fetch(endpoint)
    if (!res.ok) return []
    const data = await res.json() as { skills?: SkillsShResult[] }
    return (data.skills ?? []).map(s => ({
      id: s.id,
      name: formatName(s.name),
      description: `${s.source}`,
      category: inferCategory(s.skillId, s.source),
      author: s.source,
      githubRepo: s.source,
      skillPath: s.skillId,
      installs: formatInstalls(s.installs),
      suggestedRoles: [],
    }))
  } catch {
    return []
  }
}

// ── Fetch SKILL.md from GitHub (via Vite proxy to avoid CORS) ─────────────────
function rawUrl(repo: string, branch: string, filePath: string): string {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  return isLocal
    ? `/github-raw/${repo}/${branch}/${filePath}`
    : `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`
}

function apiUrl(path: string): string {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  return isLocal ? `/github-api${path}` : `https://api.github.com${path}`
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    return text.trim() ? text : null
  } catch {
    return null
  }
}

export async function fetchSkillContent(githubRepo: string, skillPath: string): Promise<string> {
  // Step 1: try common paths on main + master
  const branches = ['main', 'master']
  const paths = [`${skillPath}/SKILL.md`, 'SKILL.md', `${skillPath}/skill.md`, `skills/${skillPath}/SKILL.md`]

  for (const branch of branches) {
    for (const filePath of paths) {
      const text = await fetchRaw(rawUrl(githubRepo, branch, filePath))
      if (text) return text
    }
  }

  // Step 2: use GitHub API to search the repo tree for any SKILL.md
  for (const branch of branches) {
    try {
      const treeRes = await fetch(apiUrl(`/repos/${githubRepo}/git/trees/${branch}?recursive=1`))
      if (!treeRes.ok) continue
      const tree = await treeRes.json() as { tree?: { path: string; type: string }[] }
      const skillFiles = (tree.tree ?? [])
        .filter(f => f.type === 'blob' && f.path.toLowerCase().endsWith('skill.md'))
        // prefer paths that contain the skillPath
        .sort((a, b) => {
          const aMatch = a.path.toLowerCase().includes(skillPath.toLowerCase()) ? -1 : 1
          const bMatch = b.path.toLowerCase().includes(skillPath.toLowerCase()) ? -1 : 1
          return aMatch - bMatch
        })

      for (const file of skillFiles) {
        const text = await fetchRaw(rawUrl(githubRepo, branch, file.path))
        if (text) return text
      }
    } catch {
      // continue
    }
  }

  throw new Error(`Could not find SKILL.md in ${githubRepo}`)
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
