import { useEffect, useRef, useCallback } from 'react'
import { type MAState, type MAToolCall, ROLE_COLORS } from '@/lib/multiAgentEngine'

interface Props {
  state: MAState
  selectedId: string | null
  onSelectAgent: (id: string | null) => void
}

interface FNode {
  id: string
  x: number
  y: number
  r: number
  color: string
  label: string
  sub: string
  status: string
  type: 'agent' | 'tool'
}

interface FEdge {
  fromId: string
  toId: string
  color: string
  active: boolean
  dashed: boolean
}

interface FParticle {
  fromId: string
  toId: string
  t: number
  speed: number
  color: string
}

const TOOL_COLORS: Record<string, string> = {
  web_search:        '#3b82f6',
  llm_call:          '#8b5cf6',
  browser_navigate:  '#22d3ee',
  browser_snapshot:  '#06b6d4',
  browser_read:      '#0891b2',
  browser_click:     '#0e7490',
  browser_fill:      '#155e75',
}

function toolColor(tool: string) {
  return TOOL_COLORS[tool] ?? '#64748b'
}

function toolShortName(tool: string) {
  if (tool === 'web_search') return 'search'
  if (tool === 'llm_call')   return 'llm'
  return tool.replace('browser_', '')
}

// Draw a regular hexagon centered at (cx, cy) with "radius" r
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

// Quadratic bezier midpoint (curved edge between two nodes)
function bezierCurve(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, curvature = 0.25) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Control point offset perpendicular to the line
  const cx = mx - (dy / len) * len * curvature
  const cy = my + (dx / len) * len * curvature
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.quadraticCurveTo(cx, cy, x2, y2)
  return { cx, cy } // return control point for particle positioning
}

// Get point along a quadratic bezier at t
function bezierPoint(x1: number, y1: number, cpx: number, cpy: number, x2: number, y2: number, t: number) {
  const mt = 1 - t
  return {
    x: mt * mt * x1 + 2 * mt * t * cpx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cpy + t * t * y2,
  }
}

// World-space layout: orchestrator at (0,0), workers on a circle, tool calls orbiting workers
function computeLayout(state: MAState): { nodes: Map<string, FNode>; edges: FEdge[] } {
  const nodes = new Map<string, FNode>()
  const edges: FEdge[] = []

  const agents    = state.agents
  const toolCalls = state.toolCalls ?? []
  const workers   = agents.filter(a => a.id !== 'orchestrator')
  const orch      = agents.find(a => a.id === 'orchestrator')

  if (orch) {
    nodes.set(orch.id, {
      id: orch.id, x: 0, y: 0, r: 30,
      color: ROLE_COLORS[orch.role] ?? '#f97316',
      label: orch.name, sub: orch.modelLabel ?? '',
      status: orch.status, type: 'agent',
    })
  }

  const R1 = Math.max(200, workers.length * 48)
  workers.forEach((w, i) => {
    const angle = (i / workers.length) * Math.PI * 2 - Math.PI / 2
    const x = R1 * Math.cos(angle)
    const y = R1 * Math.sin(angle)
    nodes.set(w.id, {
      id: w.id, x, y, r: 22,
      color: ROLE_COLORS[w.role] ?? '#6366f1',
      label: w.name, sub: w.modelLabel ?? '',
      status: w.status, type: 'agent',
    })
    if (orch) {
      const active = w.status === 'working' || w.status === 'thinking'
      edges.push({ fromId: orch.id, toId: w.id, color: ROLE_COLORS[w.role] ?? '#6366f1', active, dashed: false })
    }
  })

  // Group tool calls by agent
  const tcByAgent = new Map<string, MAToolCall[]>()
  for (const tc of toolCalls) {
    const arr = tcByAgent.get(tc.agentId) ?? []
    arr.push(tc)
    tcByAgent.set(tc.agentId, arr)
  }

  for (const [agentId, tcs] of tcByAgent) {
    const parent = nodes.get(agentId)
    if (!parent) continue
    const baseAngle = Math.atan2(parent.y, parent.x)
    const R2    = 80
    const spread = Math.min(Math.PI * 0.75, tcs.length * 0.35)
    tcs.forEach((tc, i) => {
      const offset = tcs.length > 1 ? (i / (tcs.length - 1) - 0.5) * spread : 0
      const angle  = baseAngle + offset
      const x = parent.x + R2 * Math.cos(angle)
      const y = parent.y + R2 * Math.sin(angle)
      const color = toolColor(tc.tool)
      nodes.set(tc.id, {
        id: tc.id, x, y, r: 11,
        color, label: toolShortName(tc.tool),
        sub: tc.label.slice(0, 22),
        status: tc.status, type: 'tool',
      })
      edges.push({ fromId: agentId, toId: tc.id, color, active: tc.status === 'running', dashed: true })
    })
  }

  return { nodes, edges }
}

// Bezier control point cache so particles can follow the same curve
const cpCache = new Map<string, { cx: number; cy: number }>()

export function FlowGraph({ state, selectedId, onSelectAgent }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef     = useRef(state)
  stateRef.current   = state
  const selRef       = useRef(selectedId)
  selRef.current     = selectedId

  const nodesRef     = useRef<Map<string, FNode>>(new Map())
  const edgesRef     = useRef<FEdge[]>([])
  const particlesRef = useRef<FParticle[]>([])
  const seenRef      = useRef<Set<string>>(new Set())
  const rafRef       = useRef(0)
  const camRef       = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef      = useRef({ active: false, moved: false, sx: 0, sy: 0, cx: 0, cy: 0 })
  const sizeRef      = useRef({ w: 800, h: 600 })

  // Recompute layout when agents or tool calls change
  useEffect(() => {
    const { nodes, edges } = computeLayout(stateRef.current)
    nodesRef.current = nodes
    edgesRef.current = edges
    cpCache.clear()
  }, [state.agents, state.toolCalls]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animation loop
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      const dpr = window.devicePixelRatio
      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`
      sizeRef.current = { w, h }
      camRef.current.x = w / 2
      camRef.current.y = h / 2
      const { nodes, edges } = computeLayout(stateRef.current)
      nodesRef.current = nodes
      edgesRef.current = edges
      cpCache.clear()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    let t = 0
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      t += 0.016

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr    = window.devicePixelRatio
      const { w, h } = sizeRef.current
      const { x: camX, y: camY, scale } = camRef.current
      const s = stateRef.current

      ctx.clearRect(0, 0, w * dpr, h * dpr)
      ctx.save()
      ctx.scale(dpr, dpr)

      // Subtle radial background
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6)
      bg.addColorStop(0, 'rgba(99,102,241,0.04)')
      bg.addColorStop(1, 'rgba(8,8,24,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.translate(camX, camY)
      ctx.scale(scale, scale)

      const nodes = nodesRef.current
      const edges = edgesRef.current

      // ── Spawn particles for new messages ─────────────────────────────────
      for (const msg of (s.messages ?? [])) {
        if (seenRef.current.has(msg.id)) continue
        seenRef.current.add(msg.id)
        const from = nodes.get(msg.fromId)
        const to   = nodes.get(msg.toId)
        if (from && to) {
          for (let k = 0; k < 3; k++) {
            particlesRef.current.push({
              fromId: msg.fromId, toId: msg.toId,
              t: k * 0.15, speed: 0.008 + Math.random() * 0.006, color: from.color,
            })
          }
        }
      }
      // Spawn particles for running tool calls
      for (const tc of (s.toolCalls ?? [])) {
        const key = `tc_run_${tc.id}`
        if (tc.status === 'running' && !seenRef.current.has(key)) {
          seenRef.current.add(key)
          for (let k = 0; k < 2; k++) {
            particlesRef.current.push({
              fromId: tc.agentId, toId: tc.id,
              t: k * 0.3, speed: 0.014 + Math.random() * 0.008, color: toolColor(tc.tool),
            })
          }
        }
      }

      // ── Draw curved bezier edges ──────────────────────────────────────────
      for (const edge of edges) {
        const from = nodes.get(edge.fromId)
        const to   = nodes.get(edge.toId)
        if (!from || !to) continue

        const cacheKey = `${edge.fromId}→${edge.toId}`
        ctx.setLineDash(edge.dashed ? [4, 4] : [])
        ctx.strokeStyle = edge.color + (edge.active ? 'aa' : '2a')
        ctx.lineWidth   = edge.active ? 1.5 : 0.8

        const result = bezierCurve(ctx, from.x, from.y, to.x, to.y, edge.dashed ? 0.18 : 0.22)
        cpCache.set(cacheKey, result)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // ── Draw + advance particles along bezier curves ──────────────────────
      particlesRef.current = particlesRef.current.filter(p => {
        p.t += p.speed
        if (p.t >= 1) return false
        const from = nodes.get(p.fromId)
        const to   = nodes.get(p.toId)
        if (!from || !to) return false

        const cacheKey = `${p.fromId}→${p.toId}`
        const cp = cpCache.get(cacheKey) ?? { cx: (from.x + to.x) / 2, cy: (from.y + to.y) / 2 }
        const { x: px, y: py } = bezierPoint(from.x, from.y, cp.cx, cp.cy, to.x, to.y, p.t)

        // Glow halo
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 8)
        glow.addColorStop(0, p.color + '55')
        glow.addColorStop(1, p.color + '00')
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = glow; ctx.fill()
        // Core dot
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color + 'dd'; ctx.fill()
        return true
      })

      // ── Draw nodes ────────────────────────────────────────────────────────
      for (const node of nodes.values()) {
        const isSel    = selRef.current === node.id
        const isActive = node.status === 'working' || node.status === 'thinking'
        const isDone   = node.status === 'done'
        const isError  = node.status === 'error'
        const pulse    = isActive ? 1 + Math.sin(t * 3.5 + node.id.length * 0.7) * 0.08 : 1
        const r        = node.r * pulse

        // Glow for active/selected
        if (isActive || isSel) {
          const glowR = r * 2.8
          const glow  = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, glowR)
          glow.addColorStop(0, node.color + '44')
          glow.addColorStop(1, node.color + '00')
          ctx.beginPath(); ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
          ctx.fillStyle = glow; ctx.fill()
        }

        if (node.type === 'tool') {
          // Diamond for tool nodes
          ctx.save()
          ctx.translate(node.x, node.y)
          ctx.rotate(Math.PI / 4)
          const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.6)
          grad.addColorStop(0, node.color + 'ee')
          grad.addColorStop(1, node.color + '55')
          ctx.beginPath()
          ctx.rect(-r, -r, r * 2, r * 2)
          ctx.fillStyle = grad
          ctx.fill()
          if (node.status === 'running') {
            ctx.strokeStyle = node.color + 'cc'
            ctx.lineWidth = 1.5
            ctx.stroke()
          }
          ctx.restore()
        } else {
          // ── Hexagonal agent nodes ─────────────────────────────────────────
          const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r * 1.4)
          grad.addColorStop(0, node.color + 'ee')
          grad.addColorStop(1, node.color + '44')

          hexPath(ctx, node.x, node.y, r)
          ctx.fillStyle = grad
          ctx.fill()

          if (isSel) {
            hexPath(ctx, node.x, node.y, r)
            ctx.strokeStyle = node.color + 'ff'
            ctx.lineWidth = 2.5
            ctx.stroke()
          }

          // Spinning status ring for active agents
          if (isActive) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, r + 6, t * 1.2, t * 1.2 + Math.PI * 1.5)
            ctx.strokeStyle = node.color + '88'
            ctx.lineWidth = 1.5; ctx.stroke()
          }

          // Done / error badge
          if (isDone) {
            ctx.beginPath(); ctx.arc(node.x + r * 0.65, node.y - r * 0.65, 6, 0, Math.PI * 2)
            ctx.fillStyle = '#10b981'; ctx.fill()
          }
          if (isError) {
            ctx.beginPath(); ctx.arc(node.x + r * 0.65, node.y - r * 0.65, 6, 0, Math.PI * 2)
            ctx.fillStyle = '#ef4444'; ctx.fill()
          }

          // ── Token progress bar ──────────────────────────────────────────
          const agentData = s.agents.find(a => a.id === node.id)
          if (agentData?.tokensOut) {
            const maxTokens = 8096
            const fill = Math.min(agentData.tokensOut / maxTokens, 1)
            const bw = r * 1.6, bh = 3
            const bx = node.x - bw / 2, by = node.y + r + 4
            ctx.fillStyle = 'rgba(255,255,255,0.08)'
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 1.5); ctx.fill()
            ctx.fillStyle = node.color + 'aa'
            ctx.beginPath(); ctx.roundRect(bx, by, bw * fill, bh, 1.5); ctx.fill()
          }
        }

        // Label below node
        ctx.textAlign = 'center'
        const agentData2 = node.type === 'agent' ? s.agents.find(a => a.id === node.id) : null
        const hasTokenBar = agentData2?.tokensOut ? 1 : 0
        const ly = node.y + node.r + 14 + hasTokenBar * 6
        const fontSize = node.type === 'agent' ? 11 : 9
        ctx.font = `${node.type === 'agent' ? 700 : 600} ${fontSize}px Inter, ui-sans-serif, sans-serif`
        ctx.fillStyle = node.color + 'ee'
        ctx.fillText(node.label, node.x, ly)
        if (node.sub) {
          ctx.font = `9px Inter, ui-sans-serif, sans-serif`
          ctx.fillStyle = 'rgba(255,255,255,0.3)'
          ctx.fillText(node.sub, node.x, ly + 12)
        }
        if (node.type === 'agent' && node.status && node.status !== 'idle') {
          ctx.font = '8px Inter, ui-sans-serif, sans-serif'
          const sc = node.status === 'done'  ? '#10b981'
                   : node.status === 'error' ? '#ef4444'
                   : isActive               ? node.color
                   : 'rgba(255,255,255,0.25)'
          ctx.fillStyle = sc
          ctx.fillText(node.status.toUpperCase(), node.x, ly + 23)
        }

        // ── Thought bubble for active agent nodes ─────────────────────────
        if (node.type === 'agent' && isActive && agentData2?.output) {
          const thought = agentData2.output.replace(/^↻[^\n]+\n\n/, '').trim().slice(-80)
          if (thought.length > 8) {
            const bx = node.x + r + 8
            const by = node.y - 22
            const bw = 120, bh = 34
            const alpha = 0.7 + Math.sin(t * 2) * 0.05

            // Glassmorphism bubble
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.fillStyle = 'rgba(15,15,35,0.82)'
            ctx.strokeStyle = node.color + '44'
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke()

            // Connector dot
            ctx.beginPath(); ctx.arc(bx - 4, by + bh / 2, 3, 0, Math.PI * 2)
            ctx.fillStyle = node.color + '66'; ctx.fill()

            // Text
            ctx.fillStyle = 'rgba(255,255,255,0.75)'
            ctx.font = '7.5px Inter, ui-sans-serif, sans-serif'
            ctx.textAlign = 'left'
            // Word-wrap into 2 lines
            const words = thought.split(' ')
            let line = ''
            let lineY = by + 12
            for (const word of words) {
              const test = line ? line + ' ' + word : word
              if (ctx.measureText(test).width > bw - 8 && line) {
                ctx.fillText(line, bx + 4, lineY)
                line = word; lineY += 10
                if (lineY > by + bh - 4) break
              } else { line = test }
            }
            if (line && lineY <= by + bh - 4) ctx.fillText(line, bx + 4, lineY)

            ctx.restore()
            ctx.textAlign = 'center'
          }
        }
      }

      // ── Idle hint ─────────────────────────────────────────────────────────
      if (s.phase === 'idle') {
        ctx.textAlign = 'center'
        const iconR = 32
        const glowI = ctx.createRadialGradient(0, 0, 0, 0, 0, iconR * 2)
        glowI.addColorStop(0, 'rgba(99,102,241,0.2)')
        glowI.addColorStop(1, 'rgba(99,102,241,0)')
        ctx.beginPath(); ctx.arc(0, 0, iconR * 2, 0, Math.PI * 2)
        ctx.fillStyle = glowI; ctx.fill()
        ctx.beginPath(); ctx.arc(0, 0, iconR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.font = '26px sans-serif'; ctx.fillStyle = 'rgba(139,92,246,0.8)'
        ctx.fillText('✦', 0, 9)
        ctx.font = '700 14px Inter, ui-sans-serif, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fillText('Agent Flow', 0, iconR + 22)
        ctx.font = '11px Inter, ui-sans-serif, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.fillText('Enter a task → to deploy agents', 0, iconR + 38)
      }

      ctx.restore()
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.moved) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect  = canvas.getBoundingClientRect()
    const cam   = camRef.current
    const mx    = (e.clientX - rect.left - cam.x) / cam.scale
    const my    = (e.clientY - rect.top  - cam.y) / cam.scale
    let hit: string | null = null
    for (const node of nodesRef.current.values()) {
      if (node.type !== 'agent') continue
      const dx = mx - node.x, dy = my - node.y
      if (dx * dx + dy * dy <= (node.r + 8) * (node.r + 8)) { hit = node.id; break }
    }
    onSelectAgent(hit === selRef.current ? null : hit)
  }, [onSelectAgent])

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.sx
    const dy = e.clientY - dragRef.current.sy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    camRef.current.x = dragRef.current.cx + dx
    camRef.current.y = dragRef.current.cy + dy
  }
  const handleMouseUp = () => { setTimeout(() => { dragRef.current.active = false }, 50) }
  const handleWheel   = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    camRef.current.scale = Math.max(0.25, Math.min(4, camRef.current.scale * factor))
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 10, pointerEvents: 'none' }}>
        {[
          { color: '#3b82f6', label: 'web search' },
          { color: '#8b5cf6', label: 'llm call' },
          { color: '#22d3ee', label: 'browser' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, background: color, transform: 'rotate(45deg)', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 9, color: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }}>
        SCROLL TO ZOOM · DRAG TO PAN
      </div>
    </div>
  )
}
