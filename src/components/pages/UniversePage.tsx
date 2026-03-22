import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ROLE_COLORS, INITIAL_MA_STATE, runMultiAgentTask, runFollowUpTask,
  PROVIDER_COLORS, PROVIDER_LABELS, loadAllProviderKeys,
  type MAState, type MAAgent, type ProviderKeys, type LLMProvider,
} from '@/lib/multiAgentEngine'
import { addMemory } from '@/lib/memory'

interface Props { apiKey: string }

// ── Stars ──────────────────────────────────────────────────────────────────────
interface Star { x: number; y: number; r: number; a: number; tw: number }

function makeStars(W: number, H: number): Star[] {
  return Array.from({ length: 260 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.2,
    a: Math.random() * 0.6 + 0.2,
    tw: Math.random() * 2.5 + 0.5,
  }))
}

// ── Bezier helpers ─────────────────────────────────────────────────────────────
function bezierCPs(ax: number, ay: number, bx: number, by: number) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const dx = bx - ax, dy = by - ay
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const bend = len * 0.25
  return {
    cp1x: mx - (dy / len) * bend,
    cp1y: my + (dx / len) * bend,
    cp2x: mx + (dy / len) * bend,
    cp2y: my - (dx / len) * bend,
  }
}

function bezierAt(ax: number, ay: number, bx: number, by: number,
  cp1x: number, cp1y: number, cp2x: number, cp2y: number, t: number) {
  const mt = 1 - t
  return {
    x: mt * mt * mt * ax + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * bx,
    y: mt * mt * mt * ay + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * by,
  }
}

// ── Particles ──────────────────────────────────────────────────────────────────
interface Particle { id: string; fromId: string; toId: string; progress: number; color: string; speed: number }

// ── Canvas draw ────────────────────────────────────────────────────────────────
const R_ORCH = 34
const R_WORKER = 26

function drawUniverse(
  canvas: HTMLCanvasElement,
  state: MAState,
  particles: Particle[],
  stars: Star[],
  time: number,
  selectedId: string | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width, H = canvas.height
  const agents = state.agents

  ctx.clearRect(0, 0, W, H)

  // Background
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
  bg.addColorStop(0, '#0d0d20')
  bg.addColorStop(1, '#05050e')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Stars
  for (const s of stars) {
    const alpha = s.a + Math.sin(time * 0.001 * s.tw) * 0.18
    ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha))
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  if (agents.length === 0) return

  // Build edge list: worker ↔ orchestrator + dependency edges
  type Edge = { x1: number; y1: number; x2: number; y2: number; cp1x: number; cp1y: number; cp2x: number; cp2y: number; c1: string; c2: string; active: boolean }
  const edges: Edge[] = []
  const orch = agents.find(a => a.id === 'orchestrator')

  for (const ag of agents) {
    if (ag.id === 'orchestrator' || !orch) continue
    const cp = bezierCPs(ag.x, ag.y, orch.x, orch.y)
    const active = ag.status === 'working' || ag.status === 'thinking' || orch.status === 'working'
    edges.push({ x1: ag.x, y1: ag.y, x2: orch.x, y2: orch.y, ...cp, c1: ROLE_COLORS[ag.role], c2: ROLE_COLORS['orchestrator'], active })
    for (const depId of ag.dependsOn) {
      const dep = agents.find(a => a.id === depId)
      if (!dep) continue
      const cp2 = bezierCPs(dep.x, dep.y, ag.x, ag.y)
      edges.push({ x1: dep.x, y1: dep.y, x2: ag.x, y2: ag.y, ...cp2, c1: ROLE_COLORS[dep.role], c2: ROLE_COLORS[ag.role], active: ag.status === 'working' || ag.status === 'thinking' })
    }
  }

  // Draw edges
  for (const e of edges) {
    const grad = ctx.createLinearGradient(e.x1, e.y1, e.x2, e.y2)
    grad.addColorStop(0, e.c1 + (e.active ? '80' : '30'))
    grad.addColorStop(1, e.c2 + (e.active ? '80' : '30'))
    ctx.beginPath()
    ctx.moveTo(e.x1, e.y1)
    ctx.bezierCurveTo(e.cp1x, e.cp1y, e.cp2x, e.cp2y, e.x2, e.y2)
    ctx.strokeStyle = grad
    ctx.lineWidth = e.active ? 1.5 : 0.8
    ctx.stroke()
  }

  // Draw particles
  for (const p of particles) {
    const fa = agents.find(a => a.id === p.fromId)
    const ta = agents.find(a => a.id === p.toId)
    if (!fa || !ta) continue
    const cp = bezierCPs(fa.x, fa.y, ta.x, ta.y)
    const pos = bezierAt(fa.x, fa.y, ta.x, ta.y, cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, p.progress)
    const fade = 1 - Math.abs(p.progress * 2 - 1) * 0.6
    ctx.save()
    ctx.shadowColor = p.color
    ctx.shadowBlur = 14
    ctx.fillStyle = p.color
    ctx.globalAlpha = fade
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
    // Trail
    ctx.globalAlpha = fade * 0.3
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Draw agent nodes
  for (const ag of agents) {
    const isOrch = ag.id === 'orchestrator'
    const r = isOrch ? R_ORCH : R_WORKER
    const color = ROLE_COLORS[ag.role] ?? '#888'
    const active = ag.status === 'thinking' || ag.status === 'working' || ag.status === 'recalled'
    const done = ag.status === 'done'
    const error = ag.status === 'error'
    const selected = ag.id === selectedId
    const displayColor = error ? '#ef4444' : color

    // Glow layers
    const pulseR = active ? 1 + Math.sin(time * 0.003) * 0.18 : 1
    const glowLayers = active ? 4 : done ? 3 : selected ? 2 : 1
    for (let i = glowLayers; i >= 1; i--) {
      ctx.globalAlpha = 0.045 * i * (active ? 1.5 : 1)
      ctx.fillStyle = displayColor
      ctx.beginPath()
      ctx.arc(ag.x, ag.y, (r + i * 14) * (active ? pulseR : 1), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Selected ring
    if (selected) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(ag.x, ag.y, r + 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Spinning dashed ring (active)
    if (active) {
      ctx.save()
      ctx.translate(ag.x, ag.y)
      ctx.rotate(time * 0.0018)
      ctx.strokeStyle = displayColor
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.85
      ctx.setLineDash([7, 11])
      ctx.beginPath()
      ctx.arc(0, 0, r + 9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // Main circle
    const innerFill = ctx.createRadialGradient(ag.x - r * 0.2, ag.y - r * 0.2, 0, ag.x, ag.y, r)
    innerFill.addColorStop(0, displayColor + '30')
    innerFill.addColorStop(1, displayColor + '10')
    ctx.fillStyle = innerFill
    ctx.strokeStyle = displayColor + (done ? 'dd' : active ? 'ff' : '55')
    ctx.lineWidth = done ? 2.5 : active ? 2 : 1.5
    ctx.beginPath()
    ctx.arc(ag.x, ag.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Done checkmark
    if (done) {
      ctx.strokeStyle = displayColor
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      const s = r * 0.28
      ctx.moveTo(ag.x - s, ag.y)
      ctx.lineTo(ag.x - s * 0.3, ag.y + s * 0.8)
      ctx.lineTo(ag.x + s * 1.1, ag.y - s * 0.9)
      ctx.stroke()
    }

    // Error X
    if (error) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      const s = r * 0.35
      ctx.beginPath()
      ctx.moveTo(ag.x - s, ag.y - s); ctx.lineTo(ag.x + s, ag.y + s)
      ctx.moveTo(ag.x + s, ag.y - s); ctx.lineTo(ag.x - s, ag.y + s)
      ctx.stroke()
    }

    // Idle dot
    if (ag.status === 'idle') {
      ctx.fillStyle = displayColor + '60'
      ctx.beginPath()
      ctx.arc(ag.x, ag.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── Phase badge ────────────────────────────────────────────────────────────────
const PHASE_META: Record<string, { label: string; color: string }> = {
  idle:        { label: 'Ready',              color: 'var(--muted)' },
  planning:    { label: 'Planning...',        color: '#8b5cf6' },
  executing:   { label: 'Agents working',    color: '#3b82f6' },
  synthesizing:{ label: 'Synthesizing...',   color: '#f97316' },
  done:        { label: 'Complete',           color: '#10b981' },
  error:       { label: 'Error',             color: '#ef4444' },
}

// ── Provider order for the panel ───────────────────────────────────────────────
const PROVIDER_ORDER: LLMProvider[] = [
  'anthropic', 'openai', 'google', 'groq',
  'mistral', 'deepseek', 'openrouter', 'cohere',
  'xai', 'together', 'ollama', 'lmstudio',
]
const PROVIDER_PLACEHOLDERS: Record<LLMProvider, string> = {
  anthropic:  'sk-ant-...',
  openai:     'sk-proj-...',
  google:     'AIzaSy...',
  groq:       'gsk_...',
  mistral:    'key...',
  deepseek:   'sk-...',
  openrouter: 'sk-or-v1-...',
  cohere:     'key...',
  xai:        'xai-...',
  together:   'key...',
  ollama:     'http://localhost:11434',
  lmstudio:   'http://localhost:1234',
}

// Read/write using the same agentis_provider_{id} keys that SettingsPage uses
const SETTINGS_KEY_PREFIX = 'agentis_provider_'
function readSettingsKey(provider: LLMProvider): string {
  return localStorage.getItem(`${SETTINGS_KEY_PREFIX}${provider}`) ?? ''
}
function writeSettingsKey(provider: LLMProvider, value: string) {
  if (value) localStorage.setItem(`${SETTINGS_KEY_PREFIX}${provider}`, value)
  else localStorage.removeItem(`${SETTINGS_KEY_PREFIX}${provider}`)
}

// ── Main component ─────────────────────────────────────────────────────────────
export function UniversePage({ apiKey }: Props) {
  const [maState, setMaState] = useState<MAState>(INITIAL_MA_STATE)
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState('')
  const [savedToMemory, setSavedToMemory] = useState(false)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [providerKeys, setProviderKeys] = useState<ProviderKeys>(() => loadAllProviderKeys())
  const [providersOpen, setProvidersOpen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<Star[]>([])
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const stateRef = useRef(maState)
  stateRef.current = maState
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const seenRef = useRef<Set<string>>(new Set())

  // Spawn particles on new messages
  useEffect(() => {
    const { agents, messages } = maState
    for (const msg of messages) {
      if (seenRef.current.has(msg.id)) continue
      seenRef.current.add(msg.id)
      const fa = agents.find(a => a.id === msg.fromId)
      const ta = agents.find(a => a.id === msg.toId)
      if (!fa || !ta) continue
      const color = ROLE_COLORS[fa.role] ?? '#f97316'
      for (let k = 0; k < 2; k++) {
        particlesRef.current.push({
          id: `${msg.id}-${k}`,
          fromId: msg.fromId, toId: msg.toId,
          progress: k * 0.18,
          color,
          speed: 0.005 + Math.random() * 0.004,
        })
      }
    }
  }, [maState.messages]) // eslint-disable-line react-hooks/exhaustive-deps

  // RAF draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Advance particles
    particlesRef.current = particlesRef.current
      .map(p => ({ ...p, progress: p.progress + p.speed }))
      .filter(p => p.progress < 1)
    drawUniverse(canvas, stateRef.current, particlesRef.current, starsRef.current, performance.now(), selectedRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [])

  // Canvas init + resize
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const resize = () => {
      const { width, height } = container.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      starsRef.current = makeStars(width, height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [draw])

  // Click on canvas — detect which node was clicked
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const agents = stateRef.current.agents
    for (const ag of agents) {
      const r = ag.id === 'orchestrator' ? R_ORCH : R_WORKER
      const dx = mx - ag.x, dy = my - ag.y
      if (dx * dx + dy * dy <= (r + 10) * (r + 10)) {
        setSelectedId(prev => prev === ag.id ? null : ag.id)
        return
      }
    }
    setSelectedId(null)
  }, [])

  // Sync apiKey prop → Settings localStorage if not already set
  useEffect(() => {
    if (apiKey && !readSettingsKey('anthropic')) {
      writeSettingsKey('anthropic', apiKey)
      setProviderKeys(loadAllProviderKeys())
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read from Settings whenever the panel is opened (in case user updated Settings)
  useEffect(() => {
    if (providersOpen) setProviderKeys(loadAllProviderKeys())
  }, [providersOpen])

  const updateProviderKey = (provider: LLMProvider, value: string) => {
    writeSettingsKey(provider, value)
    setProviderKeys(loadAllProviderKeys())
  }

  const hasAnyKey = !!(providerKeys.anthropic || providerKeys.openai || providerKeys.google || providerKeys.mistral)

  const handleLaunch = async (overrideTask?: string) => {
    const taskToRun = overrideTask ?? task
    if (!taskToRun.trim() || !hasAnyKey || running) return
    setRunning(true)
    seenRef.current = new Set()
    particlesRef.current = []
    setSelectedId(null)
    setSavedToMemory(false)
    const canvas = canvasRef.current
    const W = canvas?.width ?? 800
    const H = canvas?.height ?? 560
    try {
      await runMultiAgentTask(taskToRun.trim(), providerKeys, { w: W, h: H }, fn => setMaState(fn))
    } finally {
      setRunning(false)
    }
  }

  const handleFollowUp = async (question: string) => {
    if (!question.trim() || !hasAnyKey || running) return
    setRunning(true)
    setSavedToMemory(false)
    const canvas = canvasRef.current
    const W = canvas?.width ?? 800
    const H = canvas?.height ?? 560
    try {
      await runFollowUpTask(question.trim(), maState, providerKeys, { w: W, h: H }, fn => setMaState(fn))
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setMaState(INITIAL_MA_STATE)
    setTask('')
    setRunning(false)
    setSelectedId(null)
    setFollowUp('')
    setSavedToMemory(false)
    setCopiedOutput(false)
    seenRef.current = new Set()
    particlesRef.current = []
  }

  const { phase, agents, finalOutput, errorMsg } = maState
  const phaseMeta = PHASE_META[phase]
  const selectedAgent = agents.find(a => a.id === selectedId) as MAAgent | undefined
  const doneCount = agents.filter(a => a.status === 'done').length
  const activeProviders = PROVIDER_ORDER.filter(p => providerKeys[p])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="of-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="of-page-title">Agent Universe</span>
          {phase !== 'idle' && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 20,
              background: phaseMeta.color + '22', border: `1px solid ${phaseMeta.color}55`,
              color: phaseMeta.color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {phaseMeta.label}
            </span>
          )}
          {agents.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {doneCount}/{agents.length} agents done
            </span>
          )}
        </div>
        {phase !== 'idle' && (
          <button className="btn-ghost" onClick={handleReset} style={{ fontSize: 12 }}>Reset</button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Universe Canvas ────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
          />

          {/* Agent labels overlay */}
          {agents.map(ag => {
            const maAg = ag as MAAgent
            const color = ROLE_COLORS[ag.role] ?? '#888'
            const providerColor = maAg.provider ? PROVIDER_COLORS[maAg.provider] : color
            const isOrch = ag.id === 'orchestrator'
            const labelY = ag.y + (isOrch ? R_ORCH : R_WORKER) + 10
            return (
              <div
                key={ag.id}
                onClick={() => setSelectedId(prev => prev === ag.id ? null : ag.id)}
                style={{
                  position: 'absolute',
                  left: ag.x, top: labelY,
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  cursor: 'pointer', userSelect: 'none', pointerEvents: 'all',
                  zIndex: 10,
                }}
              >
                {/* Agent name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <div style={{
                    fontSize: isOrch ? 12 : 11, fontWeight: 700,
                    color, letterSpacing: '0.04em',
                    textShadow: `0 0 12px ${color}99`,
                  }}>
                    {ag.name}
                  </div>
                </div>

                {/* Provider + model pill */}
                {!isOrch && maAg.provider && maAg.modelLabel && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 3, padding: '2px 7px',
                    borderRadius: 20,
                    background: `${providerColor}18`,
                    border: `1px solid ${providerColor}40`,
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: providerColor,
                      boxShadow: `0 0 4px ${providerColor}`,
                    }} />
                    <span style={{
                      fontSize: 8.5, fontWeight: 600, letterSpacing: '0.04em',
                      color: providerColor,
                      whiteSpace: 'nowrap',
                    }}>
                      {PROVIDER_LABELS[maAg.provider]} · {maAg.modelLabel}
                    </span>
                  </div>
                )}

                {/* Status */}
                <div style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {ag.status === 'recalled' ? '⟳ recalled' : ag.status}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {phase === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 52, opacity: 0.12 }}>✦</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)', textAlign: 'center', lineHeight: 1.8, maxWidth: 280 }}>
                Enter a task and launch to deploy<br />a coordinated team of AI agents
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--sidebar-bg)', overflow: 'hidden',
        }}>

          {/* Providers panel */}
          <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => setProvidersOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  LLM Providers
                </span>
                {/* Provider dots */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {activeProviders.map(p => (
                    <div key={p} title={PROVIDER_LABELS[p]} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: PROVIDER_COLORS[p],
                      boxShadow: `0 0 4px ${PROVIDER_COLORS[p]}`,
                    }} />
                  ))}
                </div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: 'var(--muted)', opacity: 0.5, transform: providersOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {providersOpen && (
              <div style={{ padding: '4px 16px 12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', marginBottom: 8 }}>
                  {PROVIDER_ORDER.map(provider => {
                    const val = (providerKeys as Record<string, string>)[provider] ?? ''
                    const connected = !!val
                    return (
                      <div key={provider}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: PROVIDER_COLORS[provider], flexShrink: 0,
                            boxShadow: connected ? `0 0 4px ${PROVIDER_COLORS[provider]}` : 'none' }} />
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: connected ? PROVIDER_COLORS[provider] : 'var(--muted)' }}>
                            {PROVIDER_LABELS[provider]}
                          </span>
                          {connected && <span style={{ fontSize: 8, color: '#10b981', marginLeft: 'auto' }}>✓</span>}
                        </div>
                        <input
                          type="password"
                          placeholder={PROVIDER_PLACEHOLDERS[provider]}
                          value={val}
                          onChange={e => updateProviderKey(provider, e.target.value)}
                          style={{ width: '100%', fontSize: 10, padding: '3px 6px', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Synced with Settings. Agents auto-distributed across active providers.
                </div>
              </div>
            )}
          </div>

          {/* Task input */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
              Task
            </label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey && task.trim()) void handleLaunch() }}
              placeholder="Describe a complex task for the agent team to tackle together..."
              disabled={running}
              style={{ width: '100%', minHeight: 80, fontSize: 12, lineHeight: 1.6, resize: 'none', marginBottom: 10 }}
            />
            <button
              className="btn-primary"
              onClick={() => void handleLaunch()}
              disabled={!task.trim() || !hasAnyKey || running}
              style={{ width: '100%', fontSize: 13, padding: '9px 0' }}
            >
              {running ? 'Running...' : 'Launch Agent Team'}
            </button>
            {!hasAnyKey && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                Add an API key above to launch agents
              </div>
            )}
          </div>

          {/* Selected agent detail */}
          {selectedAgent && (
            <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[selectedAgent.role], boxShadow: `0 0 6px ${ROLE_COLORS[selectedAgent.role]}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{selectedAgent.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{selectedAgent.role}</span>
                  {selectedAgent.provider && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 8,
                      background: PROVIDER_COLORS[selectedAgent.provider] + '20',
                      border: `1px solid ${PROVIDER_COLORS[selectedAgent.provider]}50`,
                      color: PROVIDER_COLORS[selectedAgent.provider], fontWeight: 700,
                    }}>
                      {PROVIDER_LABELS[selectedAgent.provider]}
                    </span>
                  )}
                  {selectedAgent.modelLabel && (
                    <span style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.65 }}>· {selectedAgent.modelLabel}</span>
                  )}
                </div>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '8px 16px 12px', maxHeight: 190, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Task</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>{selectedAgent.task}</div>
                {selectedAgent.output && (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Output</div>
                    <div style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                      {selectedAgent.output}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Agent cards */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {agents.length === 0 ? (
              <div style={{ padding: '24px 16px', fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.7 }}>
                No agents deployed yet.<br />Launch a task to spawn the team.
              </div>
            ) : agents.map(ag => {
              const color = ROLE_COLORS[ag.role] ?? '#888'
              const isActive = ag.status === 'thinking' || ag.status === 'working'
              const isDone = ag.status === 'done'
              const isErr = ag.status === 'error'
              const isRecalled = ag.status === 'recalled'
              const isSel = ag.id === selectedId
              return (
                <button
                  key={ag.id}
                  onClick={() => setSelectedId(prev => prev === ag.id ? null : ag.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '11px 16px',
                    background: isSel ? 'var(--accent-bg)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    borderLeft: `2px solid ${isDone ? color : isErr ? '#ef4444' : isRecalled ? '#a855f7' : isActive ? color : 'transparent'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: isErr ? '#ef4444' : color,
                      boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{ag.name}</span>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 10,
                      background: color + '18', border: `1px solid ${color}35`, color,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {ag.role}
                    </span>
                  </div>
                  {(ag as MAAgent).provider && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: PROVIDER_COLORS[(ag as MAAgent).provider],
                      }} />
                      <span style={{ fontSize: 9, color: PROVIDER_COLORS[(ag as MAAgent).provider], fontWeight: 600 }}>
                        {PROVIDER_LABELS[(ag as MAAgent).provider]}
                      </span>
                      {ag.modelLabel && (
                        <span style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.7 }}>· {ag.modelLabel}</span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {ag.task}
                  </div>
                  {ag.output && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ag.output.slice(0, 90)}...
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    {isActive && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: color, animation: 'blink 0.8s step-end infinite' }} />}
                    <span style={{
                      fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
                      color: isDone ? '#10b981' : isErr ? '#ef4444' : isRecalled ? '#a855f7' : isActive ? color : 'var(--muted)',
                    }}>
                      {isRecalled ? '⟳ recalled' : ag.status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Final output + post-analysis panel */}
          {(phase === 'synthesizing' || phase === 'done') && finalOutput && (
            <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: phase === 'done' ? 420 : 200 }}>
              {/* Header */}
              <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase === 'done' ? '#10b981' : '#f97316' }}>
                  {phase === 'done' ? '✦ Final Synthesis' : 'Synthesizing...'}
                </span>
                {phase === 'done' && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(finalOutput)
                        setCopiedOutput(true)
                        setTimeout(() => setCopiedOutput(false), 2000)
                      }}
                      style={{ fontSize: 10, padding: '2px 8px' }}
                    >
                      {copiedOutput ? '✓ Copied' : 'Copy'}
                    </button>
                    <button
                      className="btn-ghost"
                      title="Export as Markdown"
                      onClick={() => {
                        const blob = new Blob([`# Agent Universe Output\n\n**Task:** ${task}\n\n---\n\n${finalOutput}`], { type: 'text/markdown' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `agentis-output-${Date.now()}.md`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{ fontSize: 10, padding: '2px 8px' }}
                    >
                      ↓ MD
                    </button>
                    <button
                      className="btn-ghost"
                      title="Export as plain text"
                      onClick={() => {
                        const blob = new Blob([`Task: ${task}\n\n${finalOutput}`], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `agentis-output-${Date.now()}.txt`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      style={{ fontSize: 10, padding: '2px 8px' }}
                    >
                      ↓ TXT
                    </button>
                  </div>
                )}
              </div>

              {/* Output body */}
              <div style={{ overflowY: 'auto', padding: '0 16px 10px', fontSize: 11, lineHeight: 1.8, color: 'var(--fg)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', maxHeight: 160 }}>
                {finalOutput}
              </div>

              {/* Post-analysis actions — only shown when done */}
              {phase === 'done' && (
                <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 2 }}>
                    What's next?
                  </div>

                  {/* Follow-up question */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      placeholder="Ask a follow-up question..."
                      value={followUp}
                      onChange={e => setFollowUp(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && followUp.trim() && !running) {
                          const q = followUp.trim()
                          setFollowUp('')
                          void handleFollowUp(q)
                        }
                      }}
                      style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                    />
                    <button
                      className="btn-primary"
                      disabled={!followUp.trim() || running}
                      onClick={() => {
                        const q = followUp.trim()
                        setFollowUp('')
                        void handleFollowUp(q)
                      }}
                      style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}
                    >
                      Ask
                    </button>
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {/* Save to Memory */}
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        addMemory({
                          agentId: 'universe',
                          key: `task-${Date.now()}`,
                          value: `Task: ${task}\n\nOutput:\n${finalOutput}`,
                          ts: Date.now(),
                          source: 'manual',
                        })
                        setSavedToMemory(true)
                        setTimeout(() => setSavedToMemory(false), 3000)
                      }}
                      disabled={savedToMemory}
                      style={{ fontSize: 10, padding: '3px 9px', flex: 1 }}
                    >
                      {savedToMemory ? '✓ Saved' : '⊞ Save to Memory'}
                    </button>

                    {/* Deep Dive */}
                    <button
                      className="btn-ghost"
                      disabled={running}
                      onClick={() => {
                        setSavedToMemory(false)
                        void handleFollowUp(`Deep dive and expand the analysis with more detail, concrete examples, and actionable insights based on: ${finalOutput.slice(0, 500)}`)
                      }}
                      style={{ fontSize: 10, padding: '3px 9px', flex: 1 }}
                    >
                      ⟳ Deep Dive
                    </button>

                    {/* Run Again */}
                    <button
                      className="btn-ghost"
                      disabled={running}
                      onClick={() => void handleLaunch()}
                      style={{ fontSize: 10, padding: '3px 9px', flex: 1 }}
                    >
                      ↺ Re-run
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {phase === 'error' && errorMsg && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, fontSize: 11, color: '#ef4444', lineHeight: 1.6 }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
