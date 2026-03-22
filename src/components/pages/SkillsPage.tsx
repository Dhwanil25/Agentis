import { useState } from 'react'

type SkillsTab = 'installed' | 'browse' | 'mcp' | 'quickstart'
type SkillCategory = 'all' | 'development' | 'writing' | 'analysis' | 'research' | 'operations' | 'security'

interface InstalledSkill {
  id: string
  name: string
  description: string
  category: Exclude<SkillCategory, 'all'>
}

interface BrowseSkill {
  id: string
  name: string
  description: string
  category: Exclude<SkillCategory, 'all'>
  author: string
  installed: boolean
}

const INSTALLED_SKILLS: InstalledSkill[] = [
  { id: 'planner', name: 'Planner', description: 'Breaks down tasks into structured plans and steps', category: 'operations' },
  { id: 'coder', name: 'Coder', description: 'Writes production-ready code in any language', category: 'development' },
  { id: 'architect', name: 'Architect', description: 'Designs system architecture and technical specs', category: 'development' },
  { id: 'reviewer', name: 'Reviewer', description: 'Reviews code for quality, security, and correctness', category: 'development' },
  { id: 'tester', name: 'Tester', description: 'Writes comprehensive test suites and fixtures', category: 'development' },
  { id: 'documenter', name: 'Documenter', description: 'Creates clear technical documentation and READMEs', category: 'writing' },
  { id: 'writer', name: 'Writer', description: 'Writes blogs, copy, emails, and long-form content', category: 'writing' },
  { id: 'editor', name: 'Editor', description: 'Polishes and improves existing written content', category: 'writing' },
  { id: 'researcher', name: 'Researcher', description: 'Gathers context and researches domain knowledge', category: 'research' },
  { id: 'analyst', name: 'Analyst', description: 'Analyzes data, metrics, and business problems', category: 'analysis' },
]

const BROWSE_SKILLS: BrowseSkill[] = [
  { id: 'sql-query', name: 'SQL Query', description: 'Write and optimize SQL queries for any database', category: 'development', author: 'agentis', installed: false },
  { id: 'regex', name: 'Regex Builder', description: 'Build and explain complex regular expressions', category: 'development', author: 'agentis', installed: false },
  { id: 'scraper', name: 'Web Scraper', description: 'Extract structured data from web pages', category: 'research', author: 'community', installed: false },
  { id: 'summarizer', name: 'Summarizer', description: 'Condense long documents into key points', category: 'analysis', author: 'agentis', installed: false },
  { id: 'translator', name: 'Translator', description: 'Translate content between languages with context', category: 'writing', author: 'agentis', installed: false },
  { id: 'security-auditor', name: 'Security Auditor', description: 'OWASP-based security analysis and vulnerability detection', category: 'security', author: 'agentis', installed: false },
  { id: 'devops', name: 'DevOps', description: 'Infrastructure as code, CI/CD, Docker, Kubernetes', category: 'operations', author: 'agentis', installed: false },
  { id: 'data-analyst', name: 'Data Analyst', description: 'Statistical analysis, charts, and data insights', category: 'analysis', author: 'agentis', installed: false },
  { id: 'api-designer', name: 'API Designer', description: 'Design REST and GraphQL API contracts', category: 'development', author: 'agentis', installed: false },
]

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  all: 'All',
  development: 'Development',
  writing: 'Writing',
  analysis: 'Analysis',
  research: 'Research',
  operations: 'Operations',
  security: 'Security',
}

export function SkillsPage() {
  const [tab, setTab] = useState<SkillsTab>('installed')
  const [browseCategory, setBrowseCategory] = useState<SkillCategory>('all')
  const [search, setSearch] = useState('')
  const [installedBrowse, setInstalledBrowse] = useState<Set<string>>(new Set())

  const categories: SkillCategory[] = ['all', 'development', 'writing', 'analysis', 'research', 'operations', 'security']

  const filteredBrowse = BROWSE_SKILLS.filter(s => {
    if (browseCategory !== 'all' && s.category !== browseCategory) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categoryColor: Record<Exclude<SkillCategory, 'all'>, string> = {
    development: 'var(--blue)',
    writing: 'var(--green)',
    analysis: 'var(--accent)',
    research: '#a78bfa',
    operations: '#f59e0b',
    security: 'var(--red)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Skills</span>
      </div>

      <div className="of-page-content">
        <div className="of-info-banner">
          <span style={{ fontWeight: 600 }}>Skills and Ecosystem</span>
          <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
            Agentis comes with built-in skills for each persona. Browse the community for additional capabilities.
          </span>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn${tab === 'installed' ? ' active' : ''}`} onClick={() => setTab('installed')}>
            Installed ({INSTALLED_SKILLS.length})
          </button>
          <button className={`tab-btn${tab === 'browse' ? ' active' : ''}`} onClick={() => setTab('browse')}>Browse</button>
          <button className={`tab-btn${tab === 'mcp' ? ' active' : ''}`} onClick={() => setTab('mcp')}>MCP Servers</button>
          <button className={`tab-btn${tab === 'quickstart' ? ' active' : ''}`} onClick={() => setTab('quickstart')}>Quick Start</button>
        </div>

        {tab === 'installed' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {INSTALLED_SKILLS.map(skill => (
              <div key={skill.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{skill.name}</span>
                  <span className="badge badge-green" style={{ fontSize: 9 }}>INSTALLED</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 6 }}>{skill.description}</div>
                <span style={{
                  fontSize: 10,
                  color: categoryColor[skill.category],
                  background: `${categoryColor[skill.category]}18`,
                  border: `1px solid ${categoryColor[skill.category]}40`,
                  padding: '1px 7px',
                  borderRadius: 4,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}>
                  {CATEGORY_LABELS[skill.category]}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'browse' && (
          <div>
            {/* Search */}
            <div style={{ marginBottom: 12 }}>
              <input
                placeholder="Search skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', maxWidth: 320, marginBottom: 10 }}
              />
            </div>

            {/* Category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setBrowseCategory(cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: `1px solid ${browseCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                    background: browseCategory === cat ? 'var(--accent-bg)' : 'transparent',
                    color: browseCategory === cat ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.12s',
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {filteredBrowse.map(skill => (
                <div key={skill.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{skill.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>by {skill.author}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 8 }}>{skill.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 10,
                      color: categoryColor[skill.category],
                      background: `${categoryColor[skill.category]}18`,
                      border: `1px solid ${categoryColor[skill.category]}40`,
                      padding: '1px 7px',
                      borderRadius: 4,
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em',
                    }}>
                      {CATEGORY_LABELS[skill.category]}
                    </span>
                    <button
                      className={installedBrowse.has(skill.id) ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => setInstalledBrowse(s => {
                        const next = new Set(s)
                        if (next.has(skill.id)) next.delete(skill.id)
                        else next.add(skill.id)
                        return next
                      })}
                      style={{ fontSize: 11, padding: '4px 12px' }}
                    >
                      {installedBrowse.has(skill.id) ? 'Installed' : 'Install'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'mcp' && (
          <div>
            <div className="of-info-banner" style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>MCP Servers</span>
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                Model Context Protocol servers extend agents with external tools and data sources.
              </span>
            </div>
            <div className="card" style={{ padding: '16px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10 }}>Configured MCP Servers</div>
              <pre style={{
                margin: 0, padding: '12px 14px', borderRadius: 6,
                background: 'var(--bg)', border: '1px solid var(--border)',
                fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)',
                lineHeight: 1.7, overflowX: 'auto',
              }}>{`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "..." }
    }
  }
}`}</pre>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                Add MCP servers by editing the engine config or by providing a server URL below.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="mcp://server-url or npx command..."
                  style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                />
                <button className="btn-primary" style={{ fontSize: 12, padding: '6px 16px', whiteSpace: 'nowrap' }}>Add Server</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'quickstart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { title: 'Write your first blog post', persona: 'Writer', skill: 'Writer + Editor', badge: 'WRITING' },
              { title: 'Build a REST API', persona: 'API Engineer', skill: 'Planner + Coder + Tester', badge: 'DEVELOPMENT' },
              { title: 'Analyze a dataset', persona: 'Analyst', skill: 'Researcher + Analyst', badge: 'ANALYSIS' },
              { title: 'Design system architecture', persona: 'Senior Engineer', skill: 'Architect + Documenter', badge: 'DEVELOPMENT' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.persona} · {item.skill}</div>
                </div>
                <span className="badge badge-orange" style={{ fontSize: 9, flexShrink: 0 }}>{item.badge}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
