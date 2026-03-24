import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  type MAState, type MAAgent,
  ROLE_COLORS, PROVIDER_COLORS, PROVIDER_LABELS,
} from '@/lib/multiAgentEngine'

interface Props {
  state: MAState
  selectedId: string | null
  onSelectAgent: (id: string | null) => void
}

const ORCH_R  = 1.0
const WORK_R  = 0.55
const ORBIT_R = 8.5   // wider spread so agents never visually overlap

// ── Fibonacci sphere distribution ─────────────────────────────────────────────
function fibPos(i: number, total: number): THREE.Vector3 {
  if (total === 0) return new THREE.Vector3(ORBIT_R, 0, 0)
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y    = 1 - (i / (total - 1 || 1)) * 2
  const r    = Math.sqrt(Math.max(0, 1 - y * y))
  const th   = golden * i
  // Clamp y so agents never stack too close at top/bottom poles
  const yPos = y * Math.min(4.5, ORBIT_R * 0.55)
  return new THREE.Vector3(ORBIT_R * r * Math.cos(th), yPos, ORBIT_R * r * Math.sin(th))
}

function computePositions(agents: MAAgent[]): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>()
  const workers = agents.filter(a => a.id !== 'orchestrator')
  map.set('orchestrator', new THREE.Vector3(0, 0, 0))
  workers.forEach((w, i) => map.set(w.id, fibPos(i, workers.length)))
  return map
}

// ── Glow sprite factory ───────────────────────────────────────────────────────
function makeGlowSprite(color: string, size: number): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0,   color + 'cc')
  g.addColorStop(0.3, color + '66')
  g.addColorStop(1,   color + '00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.setScalar(size)
  return sprite
}

// ── Curve between two Vector3s ────────────────────────────────────────────────
function makeCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const perp = new THREE.Vector3().crossVectors(b.clone().sub(a), new THREE.Vector3(0, 1, 0)).normalize()
  mid.addScaledVector(perp, a.distanceTo(b) * 0.18)
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()])
}

// ── 2D CSS fallback (used when WebGL unavailable) ──────────────────────────────
function Universe2D({ state, selectedId, onSelectAgent }: Props) {
  const agents = state.agents
  const isIdle = state.phase === 'idle'

  // Lay out agents in a circle around a center orchestrator
  const cx = 50, cy = 50, r = 32
  const workers = agents.filter(a => a.id !== 'orchestrator')
  const orch    = agents.find(a => a.id === 'orchestrator')

  const workerPositions = workers.map((_, i) => {
    const angle = (i / Math.max(workers.length, 1)) * 2 * Math.PI - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.07) 0%, rgba(8,8,24,0.0) 70%)',
    }}>
      {/* SVG for lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Connections from workers to orchestrator */}
        {orch && workerPositions.map((wp, idx2) => {
          const ag = workers[idx2]
          const color = ROLE_COLORS[ag.role] ?? '#6366f1'
          const active = ag.status === 'working' || ag.status === 'thinking'
          return (
            <line key={ag.id}
              x1={wp.x} y1={wp.y} x2={cx} y2={cy}
              stroke={color} strokeWidth={active ? 0.5 : 0.2}
              strokeOpacity={active ? 0.7 : 0.25}
              strokeDasharray={active ? '2 1' : undefined}
            />
          )
        })}
        {/* Idle ring */}
        {isIdle && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(99,102,241,0.12)" strokeWidth="0.4" strokeDasharray="2 3" />
        )}
      </svg>

      {/* Agent nodes */}
      {agents.map((ag) => {
        const isOrch = ag.id === 'orchestrator'
        const idx    = workers.indexOf(ag as typeof workers[0])
        const pos    = isOrch ? { x: cx, y: cy } : workerPositions[idx] ?? { x: cx, y: cy }
        const color  = ROLE_COLORS[ag.role] ?? '#6366f1'
        const active = ag.status === 'working' || ag.status === 'thinking'
        const done   = ag.status === 'done'
        const sel    = selectedId === ag.id
        const size   = isOrch ? 7 : 4.5

        return (
          <div key={ag.id}
            onClick={() => onSelectAgent(sel ? null : ag.id)}
            style={{
              position: 'absolute',
              left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              zIndex: sel ? 10 : 1,
            }}
          >
            {/* Node circle */}
            <div style={{
              width: size * 8, height: size * 8, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}55)`,
              border: `${sel ? 2 : 1}px solid ${color}${sel ? 'ff' : '88'}`,
              boxShadow: active
                ? `0 0 ${isOrch ? 20 : 12}px ${color}88, 0 0 ${isOrch ? 40 : 20}px ${color}33`
                : `0 0 ${isOrch ? 12 : 6}px ${color}44`,
              animation: active ? 'pulseGlow 1.8s ease-in-out infinite' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}>
              {isOrch && <div style={{ fontSize: isOrch ? 14 : 9, color: '#fff', opacity: 0.9 }}>✦</div>}
            </div>
            {/* Label */}
            <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: color, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                textShadow: `0 0 8px ${color}88` }}>
                {ag.name}
              </div>
              {!isOrch && (
                <div style={{ fontSize: 7.5, color: done ? '#10b981' : active ? color : 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>
                  {ag.status}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Idle hint */}
      {isIdle && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99,102,241,0.15)',
            animation: 'pulseGlow 3s ease-in-out infinite',
          }}>
            <div style={{ fontSize: 26, color: 'rgba(139,92,246,0.85)' }}>✦</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Agent Universe</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.7, maxWidth: 220 }}>
            Enter a task in the panel →<br />to deploy a team of AI agents
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Universe3D({ state, selectedId, onSelectAgent }: Props) {
  const mountRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Three.js objects
  const rendRef    = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef   = useRef<THREE.Scene>(new THREE.Scene())
  const camRef     = useRef<THREE.PerspectiveCamera | null>(null)
  const rafRef     = useRef(0)
  const clockRef   = useRef(new THREE.Clock())

  // Scene objects keyed by agent id
  const coreRef    = useRef<Map<string, THREE.Mesh>>(new Map())
  const glowRef    = useRef<Map<string, THREE.Sprite>>(new Map())
  const ringRef    = useRef<Map<string, THREE.LineLoop>>(new Map())
  const connRef    = useRef<Map<string, THREE.Line>>(new Map())
  const curvesRef  = useRef<Map<string, THREE.CatmullRomCurve3>>(new Map())

  // Stars
  const starsRef   = useRef<THREE.Points | null>(null)

  // Particles flying along connections
  interface P3 { fromId: string; toId: string; t: number; speed: number; mesh: THREE.Mesh }
  const pRef       = useRef<P3[]>([])
  const seenRef    = useRef<Set<string>>(new Set())
  const pGeoRef    = useRef<THREE.SphereGeometry | null>(null)

  // Camera orbit state
  const orbitRef   = useRef({ theta: 0.3, phi: 0.45, r: 18 })
  const dragRef    = useRef({ active: false, x: 0, y: 0 })
  const groupRef   = useRef<THREE.Group | null>(null) // whole agent scene rotates

  // Positions
  const posRef     = useRef<Map<string, THREE.Vector3>>(new Map())

  // WebGL availability
  const [webglError, setWebglError] = useState(false)

  // State / selected refs for animation loop
  const stateRef   = useRef(state)
  stateRef.current = state
  const selRef     = useRef(selectedId)
  selRef.current   = selectedId

  // ── Init Three.js ───────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth  || 800
    const H = mount.clientHeight || 600

    // Renderer — pre-check WebGL support before Three.js tries
    const testCanvas = document.createElement('canvas')
    const testGl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')
    if (!testGl) {
      setWebglError(true)
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setWebglError(true)
      return
    }

    // Also catch degraded contexts (e.g. GPU blocklisted, software renderer failure)
    if (renderer.getContext().isContextLost()) {
      renderer.dispose()
      setWebglError(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x080818, 1)
    mount.appendChild(renderer.domElement)
    rendRef.current = renderer

    // Camera
    const cam = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000)
    camRef.current = cam

    const scene = sceneRef.current

    // Ambient + point lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const cLight = new THREE.PointLight(0xffa040, 2, 20)
    scene.add(cLight)

    // Agent group (slow auto-rotate)
    const group = new THREE.Group()
    scene.add(group)
    groupRef.current = group

    // Stars
    const starGeo = new THREE.BufferGeometry()
    const starPos: number[] = []
    for (let i = 0; i < 3000; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 40 + Math.random() * 60
      starPos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      )
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xaaaaff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.9 })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)
    starsRef.current = stars

    // Shared particle geometry
    pGeoRef.current = new THREE.SphereGeometry(0.06, 6, 6)

    // Resize observer
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      const w = e.contentRect.width
      const h = e.contentRect.height
      renderer.setSize(w, h)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
    })
    ro.observe(mount)

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const t   = clockRef.current.getElapsedTime()
      void clockRef.current.getDelta

      // Auto-rotate group slowly
      if (groupRef.current) groupRef.current.rotation.y = t * 0.04

      // Stars slow drift
      if (starsRef.current) starsRef.current.rotation.y = t * 0.01

      const s    = stateRef.current
      const pos  = posRef.current

      // Pulse + ring spin for active agents
      coreRef.current.forEach((mesh, id) => {
        const ag = s.agents.find(a => a.id === id)
        if (!ag) return
        const active = ag.status === 'thinking' || ag.status === 'working' || ag.status === 'recalled'
        const isOrch = id === 'orchestrator'

        if (active) {
          const pulse = 1 + Math.sin(t * 3.5 + id.length) * 0.1
          mesh.scale.setScalar(pulse)
          ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3
        } else {
          mesh.scale.setScalar(1)
          ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3
        }

        // Glow size pulse
        const gl = glowRef.current.get(id)
        if (gl) {
          const base = isOrch ? 3.5 : 2.2
          gl.scale.setScalar(active ? base + Math.sin(t * 2.5 + id.length) * 0.5 : base)
        }

        // Spinning dashed ring
        const rg = ringRef.current.get(id)
        if (rg) {
          rg.visible = active || id === selRef.current
          rg.rotation.z = t * (active ? 1.2 : 0.4)
          rg.rotation.x = t * (active ? 0.7 : 0.2)
        }
      })

      // Advance particles
      const dead: number[] = []
      pRef.current.forEach((p, idx) => {
        p.t += p.speed
        if (p.t >= 1) { dead.push(idx); return }
        const curve = curvesRef.current.get(`${p.fromId}→${p.toId}`) ?? curvesRef.current.get(`${p.toId}→${p.fromId}`)
        if (curve && groupRef.current) {
          const pt = curve.getPoint(p.t)
          p.mesh.position.copy(pt)
        }
      })
      dead.reverse().forEach(i => {
        const p = pRef.current[i]
        groupRef.current?.remove(p.mesh)
        pRef.current.splice(i, 1)
      })

      // Spawn particles for new messages
      const { messages, agents } = s
      for (const msg of messages) {
        if (seenRef.current.has(msg.id)) continue
        seenRef.current.add(msg.id)
        const fa  = agents.find(a => a.id === msg.fromId)
        const ta  = agents.find(a => a.id === msg.toId)
        const fp  = pos.get(msg.fromId)
        const tp  = pos.get(msg.toId)
        if (!fa || !ta || !fp || !tp || !pGeoRef.current || !groupRef.current) continue
        const color = new THREE.Color(ROLE_COLORS[fa.role] ?? '#f97316')
        const mat   = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
        for (let k = 0; k < 3; k++) {
          const mesh = new THREE.Mesh(pGeoRef.current, mat.clone())
          const key  = `${msg.fromId}→${msg.toId}`
          if (!curvesRef.current.has(key)) curvesRef.current.set(key, makeCurve(fp, tp))
          const startPt = curvesRef.current.get(key)!.getPoint(k * 0.12)
          mesh.position.copy(startPt)
          groupRef.current.add(mesh)
          pRef.current.push({ fromId: msg.fromId, toId: msg.toId, t: k * 0.12, speed: 0.006 + Math.random() * 0.005, mesh })
        }
      }

      // Connection line opacity flicker
      connRef.current.forEach((line, key) => {
        const [fromId] = key.split('→')
        const ag = s.agents.find(a => a.id === fromId)
        const active = ag && (ag.status === 'working' || ag.status === 'thinking')
        ;(line.material as THREE.LineBasicMaterial).opacity = active ? 0.6 + Math.sin(t * 5 + key.length) * 0.25 : 0.18
      })

      // Update camera position from orbit
      const { theta, phi, r } = orbitRef.current
      cam.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      )
      cam.lookAt(0, 0, 0)

      // Update HTML label positions using actual world positions (accounts for group rotation)
      updateLabels(s.agents, coreRef.current, cam, renderer, overlayRef.current)

      renderer.render(scene, cam)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild scene when agents change ───────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const agents = state.agents

    // Compute 3D positions
    const newPos = computePositions(agents)
    posRef.current = newPos

    // Remove old meshes not in new agents
    const newIds = new Set(agents.map(a => a.id))
    coreRef.current.forEach((m, id) => { if (!newIds.has(id)) { group.remove(m); coreRef.current.delete(id) } })
    glowRef.current.forEach((s, id) => { if (!newIds.has(id)) { group.remove(s); glowRef.current.delete(id) } })
    ringRef.current.forEach((r, id) => { if (!newIds.has(id)) { group.remove(r); ringRef.current.delete(id) } })

    // Remove old connections
    connRef.current.forEach(l => group.remove(l))
    connRef.current.clear()
    curvesRef.current.clear()

    // Add/update agent nodes
    for (const ag of agents) {
      const pos    = newPos.get(ag.id)!
      const isOrch = ag.id === 'orchestrator'
      const r      = isOrch ? ORCH_R : WORK_R
      const hex    = ROLE_COLORS[ag.role] ?? '#f97316'
      const color  = new THREE.Color(hex)

      if (!coreRef.current.has(ag.id)) {
        // Core sphere
        const geo  = new THREE.SphereGeometry(r, 32, 32)
        const mat  = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.4,
          roughness: 0.15,
          metalness: 0.6,
          transparent: true,
          opacity: 0.95,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(pos)
        mesh.userData.agentId = ag.id
        group.add(mesh)
        coreRef.current.set(ag.id, mesh)

        // Glow sprite
        const glow = makeGlowSprite(hex, isOrch ? 3.5 : 2.2)
        glow.position.copy(pos)
        group.add(glow)
        glowRef.current.set(ag.id, glow)

        // Spinning ring
        const ringGeo = new THREE.BufferGeometry()
        const pts: number[] = []
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2
          pts.push(Math.cos(a) * (r + 0.3), Math.sin(a) * (r + 0.3), 0)
        }
        ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
        const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
        const rLoop   = new THREE.LineLoop(ringGeo, ringMat)
        rLoop.position.copy(pos)
        rLoop.visible = false
        group.add(rLoop)
        ringRef.current.set(ag.id, rLoop)
      } else {
        // Update position if needed
        coreRef.current.get(ag.id)!.position.copy(pos)
        glowRef.current.get(ag.id)!.position.copy(pos)
        ringRef.current.get(ag.id)!.position.copy(pos)
      }
    }

    // Build connections from each worker to orchestrator
    const orchPos = newPos.get('orchestrator')
    if (orchPos) {
      for (const ag of agents) {
        if (ag.id === 'orchestrator') continue
        const wPos = newPos.get(ag.id)
        if (!wPos) continue
        const key   = `${ag.id}→orchestrator`
        const curve = makeCurve(wPos, orchPos)
        curvesRef.current.set(key, curve)
        const pts    = curve.getPoints(50)
        const geo    = new THREE.BufferGeometry().setFromPoints(pts)
        const color  = new THREE.Color(ROLE_COLORS[ag.role] ?? '#888')
        const mat    = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
        const line   = new THREE.Line(geo, mat)
        group.add(line)
        connRef.current.set(key, line)
      }
    }

    // Rebuild HTML labels
    rebuildLabels(agents, coreRef.current, overlayRef.current, camRef.current, rendRef.current)
  }, [state.agents]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update label content when status/model changes ─────────────────────────
  useEffect(() => {
    updateLabelContent(state.agents, overlayRef.current)
  }, [state.agents])

  // ── Click → ray cast ────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.active) return
    const renderer = rendRef.current
    const cam = camRef.current
    const group = groupRef.current
    if (!renderer || !cam || !group) return

    const rect = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, cam)
    const meshes = Array.from(coreRef.current.values())
    const hits = raycaster.intersectObjects(meshes)
    if (hits.length > 0) {
      const id = hits[0].object.userData.agentId as string
      onSelectAgent(selRef.current === id ? null : id)
    } else {
      onSelectAgent(null)
    }
  }

  // ── Mouse orbit ─────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current.x = e.clientX
    dragRef.current.y = e.clientY
    orbitRef.current.theta -= dx * 0.008
    orbitRef.current.phi    = Math.max(0.15, Math.min(Math.PI - 0.15, orbitRef.current.phi + dy * 0.008))
  }
  const handleMouseUp = () => {
    setTimeout(() => { dragRef.current.active = false }, 50)
  }
  const handleWheel = (e: React.WheelEvent) => {
    orbitRef.current.r = Math.max(10, Math.min(30, orbitRef.current.r + e.deltaY * 0.025))
  }

  if (webglError) return <Universe2D state={state} selectedId={selectedId} onSelectAgent={onSelectAgent} />

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Three.js canvas mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* HTML label overlay */}
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      />

      {/* Idle hint */}
      {state.phase === 'idle' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.1) 60%, transparent 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99,102,241,0.15)',
          }}>
            <div style={{ fontSize: 28, color: 'rgba(139,92,246,0.8)' }}>✦</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.6 }}>
            Agent Universe
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.8, maxWidth: 260 }}>
            Enter a task in the panel →<br />and launch a team of AI agents
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 4, letterSpacing: '0.06em' }}>
            DRAG TO ORBIT · SCROLL TO ZOOM
          </div>
        </div>
      )}
    </div>
  )
}

// ── Imperative label helpers (bypass React for 60fps positioning) ─────────────

function rebuildLabels(
  agents: MAAgent[],
  meshes: Map<string, THREE.Mesh>,
  overlay: HTMLDivElement | null,
  cam: THREE.PerspectiveCamera | null,
  renderer: THREE.WebGLRenderer | null,
) {
  if (!overlay) return
  overlay.innerHTML = ''
  for (const ag of agents) {
    const div = document.createElement('div')
    div.id   = `label-${ag.id}`
    div.style.cssText = `
      position:absolute; transform:translateX(-50%);
      text-align:center; pointer-events:none; user-select:none;
      transition: opacity 0.3s;
    `
    overlay.appendChild(div)
  }
  updateLabelContent(agents, overlay)
  if (cam && renderer) updateLabels(agents, meshes, cam, renderer, overlay)
}

function updateLabelContent(agents: MAAgent[], overlay: HTMLDivElement | null) {
  if (!overlay) return
  for (const ag of agents as MAAgent[]) {
    const div = overlay.querySelector(`#label-${ag.id}`) as HTMLDivElement | null
    if (!div) continue
    const color = ROLE_COLORS[ag.role] ?? '#888'
    const pColor = ag.provider ? PROVIDER_COLORS[ag.provider] : color
    const isOrch = ag.id === 'orchestrator'

    div.innerHTML = `
      <div style="font-size:${isOrch ? 12 : 10.5}px;font-weight:700;color:${color};
        letter-spacing:0.04em;text-shadow:0 0 14px ${color}bb;font-family:var(--font-sans)">
        ${ag.name}
      </div>
      ${!isOrch && ag.provider && ag.modelLabel ? `
        <div style="display:inline-flex;align-items:center;gap:4px;margin-top:3px;padding:2px 7px;
          border-radius:20px;background:${pColor}18;border:1px solid ${pColor}40">
          <div style="width:5px;height:5px;border-radius:50%;background:${pColor};box-shadow:0 0 4px ${pColor};flex-shrink:0"></div>
          <span style="font-size:8px;font-weight:600;color:${pColor};white-space:nowrap;font-family:var(--font-sans)">
            ${PROVIDER_LABELS[ag.provider]} · ${ag.modelLabel}
          </span>
        </div>
      ` : ''}
      <div style="font-size:8.5px;color:rgba(255,255,255,0.3);margin-top:3px;
        text-transform:uppercase;letter-spacing:0.08em;font-family:var(--font-sans)">
        ${ag.status === 'recalled' ? '⟳ recalled' : ag.status}
      </div>
    `
  }
}

function updateLabels(
  agents: MAAgent[],
  meshes: Map<string, THREE.Mesh>,
  cam: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  overlay: HTMLDivElement | null,
) {
  if (!overlay) return
  const W = renderer.domElement.clientWidth
  const H = renderer.domElement.clientHeight
  const worldPos = new THREE.Vector3()

  for (const ag of agents) {
    const div = overlay.querySelector(`#label-${ag.id}`) as HTMLDivElement | null
    if (!div) continue
    const mesh = meshes.get(ag.id)
    if (!mesh) continue

    // Get the actual world position (after group rotation)
    mesh.getWorldPosition(worldPos)

    // Project to NDC
    const projected = worldPos.clone().project(cam)
    const sx = (projected.x + 1) / 2 * W
    const sy = -(projected.y - 1) / 2 * H

    // Sphere screen-space radius: project a point offset by sphere radius
    const r = ag.id === 'orchestrator' ? ORCH_R : WORK_R
    const edgeWorld = worldPos.clone()
    edgeWorld.y += r
    const edgeProj = edgeWorld.project(cam)
    const edgeSy   = -(edgeProj.y - 1) / 2 * H
    const screenR  = Math.abs(edgeSy - sy)

    div.style.left    = `${sx}px`
    div.style.top     = `${sy + screenR + 8}px`
    div.style.opacity = projected.z > 1 ? '0' : '1'
  }
}
