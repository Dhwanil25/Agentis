import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SKILLS_DIRECTORY,
  searchSkillsDirectory,
  fetchSkillContent,
  getInstalledSkills,
  isSkillInstalled,
  installSkill,
  uninstallSkill,
  getRoleAssignments,
  assignSkillToRole,
  removeSkillFromRole,
  getTotalAssignmentCount,
  type SkillEntry,
  type InstalledSkill,
} from '@/lib/agentSkills'
import type { AgentRole } from '@/lib/multiAgentEngine'

type Tab = 'directory' | 'installed' | 'assignments'

const CATEGORY_COLORS: Record<string, string> = {
  development: '#3b82f6',
  design:      '#ec4899',
  ai:          '#6366f1',
  research:    '#a78bfa',
  writing:     '#10b981',
  analysis:    '#06b6d4',
  operations:  '#f59e0b',
}

const ALL_ROLES: AgentRole[] = ['orchestrator', 'researcher', 'analyst', 'writer', 'coder', 'reviewer', 'planner', 'summarizer', 'browser']

const ROLE_COLORS: Record<AgentRole, string> = {
  orchestrator: '#f97316',
  researcher:   '#3b82f6',
  analyst:      '#06b6d4',
  writer:       '#10b981',
  coder:        '#eab308',
  reviewer:     '#ec4899',
  planner:      '#8b5cf6',
  summarizer:   '#64748b',
  browser:      '#22d3ee',
}

const DEFAULT_QUERIES = ['frontend', 'react', 'testing', 'ai', 'writing', 'research', 'design']

function InstallButton({ entry, onInstalled }: { entry: SkillEntry; onInstalled: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const installed = isSkillInstalled(entry.id)

  const handleInstall = useCallback(async () => {
    setStatus('loading')
    setErrMsg('')
    try {
      const content = await fetchSkillContent(entry.githubRepo, entry.skillPath)
      installSkill(entry, content)
      setStatus('idle')
      onInstalled()
    } catch (e) {
      setStatus('error')
      setErrMsg(e instanceof Error ? e.message : 'Install failed')
    }
  }, [entry, onInstalled])

  if (installed) {
    return (
      <button
        onClick={() => { uninstallSkill(entry.id); onInstalled() }}
        style={{
          fontSize: 11, padding: '4px 12px', borderRadius: 6,
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          color: 'var(--green)', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
        }}
      >
        ✓ Installed
      </button>
    )
  }

  if (status === 'loading') {
    return (
      <button disabled style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, opacity: 0.5, cursor: 'not-allowed', background: 'var(--accent)', border: 'none', color: '#fff', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
        Installing…
      </button>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <button onClick={handleInstall} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
          Retry
        </button>
        <span style={{ fontSize: 10, color: 'var(--red)', maxWidth: 130, textAlign: 'right', lineHeight: 1.3 }}>{errMsg}</span>
      </div>
    )
  }

  return (
    <button onClick={handleInstall} className="btn-primary" style={{ fontSize: 11, padding: '4px 12px', whiteSpace: 'nowrap' }}>
      Install
    </button>
  )
}

function SkillCard({ entry, onInstalled }: { entry: SkillEntry; onInstalled: () => void }) {
  const color = CATEGORY_COLORS[entry.category] ?? '#6b7280'
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.author}
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {entry.installs} installs
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{
          fontSize: 9, color: color,
          background: `${color}18`, border: `1px solid ${color}40`,
          padding: '1px 7px', borderRadius: 4,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {entry.category}
        </span>
        <InstallButton entry={entry} onInstalled={onInstalled} />
      </div>
    </div>
  )
}

function InstalledSkillRow({ skill, assignments, onRemove, onToggleRole }: {
  skill: InstalledSkill
  assignments: Partial<Record<AgentRole, string[]>>
  onRemove: () => void
  onToggleRole: (role: AgentRole) => void
}) {
  const color = CATEGORY_COLORS[skill.category] ?? '#6b7280'
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{skill.name}</span>
          <span style={{
            fontSize: 9, color: color, background: `${color}18`,
            border: `1px solid ${color}40`, padding: '1px 7px', borderRadius: 4,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {skill.category}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {expanded ? 'Hide' : 'Preview'}
          </button>
          <button onClick={onRemove} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Remove
          </button>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>{skill.author}</div>

      <div style={{ marginBottom: expanded ? 10 : 0 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Active for roles
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ALL_ROLES.map(role => {
            const active = (assignments[role] ?? []).includes(skill.id)
            const rColor = ROLE_COLORS[role]
            return (
              <button key={role} onClick={() => onToggleRole(role)} style={{
                fontSize: 10, padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${active ? rColor : 'var(--border)'}`,
                background: active ? `${rColor}20` : 'transparent',
                color: active ? rColor : 'var(--muted)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                fontWeight: active ? 600 : 400, transition: 'all 0.12s',
              }}>
                {role}
              </button>
            )
          })}
        </div>
      </div>

      {expanded && (
        <pre style={{
          margin: 0, padding: '12px', background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 6,
          fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)',
          lineHeight: 1.6, overflowX: 'auto', maxHeight: 280, overflowY: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {skill.content}
        </pre>
      )}
    </div>
  )
}

export function SkillsPage() {
  const [tab, setTab] = useState<Tab>('directory')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SkillEntry[]>(SKILLS_DIRECTORY)
  const [searching, setSearching] = useState(false)
  const [installed, setInstalled] = useState<InstalledSkill[]>([])
  const [assignments, setAssignments] = useState<Partial<Record<AgentRole, string[]>>>({})
  const [tick, setTick] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const defaultQueryRef = useRef(DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)])

  const refresh = useCallback(() => {
    setInstalled(getInstalledSkills())
    setAssignments(getRoleAssignments())
    setTick(t => t + 1)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Load a default trending set on mount
  useEffect(() => {
    setSearching(true)
    searchSkillsDirectory(defaultQueryRef.current).then(res => {
      if (res.length > 0) setResults(res)
      setSearching(false)
    })
  }, [])

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) {
      // Reset to default curated list when cleared
      setResults(SKILLS_DIRECTORY)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const res = await searchSkillsDirectory(search)
      setResults(res.length > 0 ? res : SKILLS_DIRECTORY)
      setSearching(false)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const totalAssignments = getTotalAssignmentCount()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="of-page-header">
        <span className="of-page-title">Skills</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {installed.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {installed.length} installed · {totalAssignments} assignments
            </span>
          )}
          <a href="https://skills.sh" target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
            skills.sh ↗
          </a>
        </div>
      </div>

      <div className="of-page-content">
        <div className="tab-bar" style={{ marginBottom: 14 }}>
          <button className={`tab-btn${tab === 'directory' ? ' active' : ''}`} onClick={() => setTab('directory')}>
            Directory
          </button>
          <button className={`tab-btn${tab === 'installed' ? ' active' : ''}`} onClick={() => setTab('installed')}>
            Installed {installed.length > 0 ? `(${installed.length})` : ''}
          </button>
          <button className={`tab-btn${tab === 'assignments' ? ' active' : ''}`} onClick={() => setTab('assignments')}>
            Role Assignments {totalAssignments > 0 ? `(${totalAssignments})` : ''}
          </button>
        </div>

        {/* ── Directory ── */}
        {tab === 'directory' && (
          <div>
            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                placeholder="Search 90,000+ skills from skills.sh..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', fontSize: 13, paddingRight: 36 }}
                autoFocus
              />
              {searching && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid var(--accent)', borderTopColor: 'transparent',
                  animation: 'spin 0.7s linear infinite',
                }} />
              )}
            </div>

            {!search.trim() && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                Showing featured skills · type to search the full registry
              </div>
            )}

            {results.length === 0 && !searching ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                No skills found for "{search}"
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} key={tick}>
                {results.map(entry => (
                  <SkillCard key={entry.id} entry={entry} onInstalled={refresh} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Installed ── */}
        {tab === 'installed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} key={tick}>
            {installed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                No skills installed yet.{' '}
                <button onClick={() => setTab('directory')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'var(--font-sans)' }}>
                  Browse the directory →
                </button>
              </div>
            ) : (
              installed.map(skill => (
                <InstalledSkillRow
                  key={skill.id}
                  skill={skill}
                  assignments={assignments}
                  onRemove={() => { uninstallSkill(skill.id); refresh() }}
                  onToggleRole={role => {
                    const current = assignments[role] ?? []
                    if (current.includes(skill.id)) removeSkillFromRole(skill.id, role)
                    else assignSkillToRole(skill.id, role)
                    refresh()
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ── Role Assignments ── */}
        {tab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} key={tick}>
            {installed.length === 0 && (
              <div className="of-info-banner" style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--muted)' }}>
                  Install skills from the Directory, then assign them to agent roles here. Assigned skills are injected into the agent's system prompt when a Universe run starts.
                </span>
              </div>
            )}
            {ALL_ROLES.map(role => {
              const roleSkillIds = assignments[role] ?? []
              const roleSkills = installed.filter(s => roleSkillIds.includes(s.id))
              const rColor = ROLE_COLORS[role]

              return (
                <div key={role} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: roleSkills.length > 0 || installed.length > 0 ? 10 : 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>{role}</span>
                    {roleSkills.length > 0
                      ? <span style={{ fontSize: 11, color: rColor, marginLeft: 4 }}>{roleSkills.length} skill{roleSkills.length > 1 ? 's' : ''} active</span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>No skills assigned</span>
                    }
                  </div>

                  {roleSkills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {roleSkills.map(skill => (
                        <div key={skill.id} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 8px 4px 10px',
                          background: `${rColor}12`, border: `1px solid ${rColor}30`, borderRadius: 20,
                        }}>
                          <span style={{ fontSize: 11, color: 'var(--fg)', fontWeight: 500 }}>{skill.name}</span>
                          <button onClick={() => { removeSkillFromRole(skill.id, role); refresh() }} style={{
                            background: 'none', border: 'none', color: 'var(--muted)',
                            cursor: 'pointer', padding: '0 2px', fontSize: 12, lineHeight: 1, fontFamily: 'var(--font-sans)',
                          }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {installed.filter(s => !(assignments[role] ?? []).includes(s.id)).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {installed.filter(s => !(assignments[role] ?? []).includes(s.id)).map(skill => (
                        <button key={skill.id} onClick={() => { assignSkillToRole(skill.id, role); refresh() }} style={{
                          fontSize: 10, padding: '2px 9px',
                          border: '1px dashed var(--border)', borderRadius: 20,
                          background: 'transparent', color: 'var(--muted)',
                          cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                        }}>
                          + {skill.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  )
}
