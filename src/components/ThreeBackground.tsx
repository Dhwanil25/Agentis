import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface AgentNode {
  mesh: THREE.Mesh
  origin: THREE.Vector3
  rotSpeed: number
  driftAmp: { x: number; y: number }
  driftFreq: { x: number; y: number }
  driftPhase: { x: number; y: number }
}

interface Connection {
  line: THREE.Line
  a: AgentNode
  b: AgentNode
}

export function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x080c14)
    mount.appendChild(renderer.domElement)

    // ── Scene & Camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    )
    camera.position.set(0, 0, 38)

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a1a2e, 1.2))

    const dirLight = new THREE.DirectionalLight(0x1d9e75, 2.5)
    dirLight.position.set(10, 12, 8)
    scene.add(dirLight)

    const greenPoint = new THREE.PointLight(0x1d9e75, 4, 70)
    greenPoint.position.set(-18, 10, 6)
    scene.add(greenPoint)

    const bluePoint = new THREE.PointLight(0x5b8af5, 2.5, 60)
    bluePoint.position.set(18, -10, 4)
    scene.add(bluePoint)

    // ── Node helpers ──────────────────────────────────────────────────────
    const makeNode = (x: number, y: number, z: number, size: number, wire: boolean): AgentNode => {
      const geo = new THREE.IcosahedronGeometry(size, 0)
      const mat = wire
        ? new THREE.MeshBasicMaterial({ color: 0x1d9e75, wireframe: true, transparent: true, opacity: 0.28 })
        : new THREE.MeshPhongMaterial({
            color: 0x1d9e75,
            emissive: 0x093d28,
            shininess: 100,
            transparent: true,
            opacity: Math.random() * 0.3 + 0.5,
          })
      const mesh = new THREE.Mesh(geo, mat)
      const origin = new THREE.Vector3(x, y, z)
      mesh.position.copy(origin)
      scene.add(mesh)
      return {
        mesh,
        origin: origin.clone(),
        rotSpeed: (Math.random() - 0.5) * 0.6,
        driftAmp: { x: Math.random() * 1.4 + 0.4, y: Math.random() * 1.0 + 0.3 },
        driftFreq: { x: Math.random() * 0.1 + 0.08, y: Math.random() * 0.08 + 0.06 },
        driftPhase: { x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 },
      }
    }

    // ── Nodes ─────────────────────────────────────────────────────────────
    const NODE_COUNT = 24
    const nodes: AgentNode[] = []

    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 54
      const y = (Math.random() - 0.5) * 34
      const z = (Math.random() - 0.5) * 16
      const size = Math.random() * 0.7 + 0.22
      const wire = i % 4 === 0
      nodes.push(makeNode(x, y, z, size, wire))
    }

    // ── Connections ───────────────────────────────────────────────────────
    const CONNECT_DIST = 13
    const connections: Connection[] = []
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1d9e75,
      transparent: true,
      opacity: 0.1,
    })

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (nodes[i].origin.distanceTo(nodes[j].origin) < CONNECT_DIST) {
          const geo = new THREE.BufferGeometry()
          const verts = new Float32Array([
            nodes[i].mesh.position.x, nodes[i].mesh.position.y, nodes[i].mesh.position.z,
            nodes[j].mesh.position.x, nodes[j].mesh.position.y, nodes[j].mesh.position.z,
          ])
          geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
          const line = new THREE.Line(geo, lineMat.clone())
          scene.add(line)
          connections.push({ line, a: nodes[i], b: nodes[j] })
        }
      }
    }

    // ── Particle stars ────────────────────────────────────────────────────
    const STAR_COUNT = 220
    const starPos = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 140
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 90
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 20
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.45 })
    scene.add(new THREE.Points(starGeo, starMat))

    // ── Mouse tracking ────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 4.5
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2.8
    }
    window.addEventListener('mousemove', onMouseMove)

    // ── Animation loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Smooth mouse lerp
      mouse.x += (mouse.tx - mouse.x) * 0.035
      mouse.y += (mouse.ty - mouse.y) * 0.035

      // Animate nodes
      nodes.forEach((node, i) => {
        node.mesh.rotation.x = t * 0.18 + i * 0.31
        node.mesh.rotation.y = t * node.rotSpeed + i * 0.47
        node.mesh.position.x =
          node.origin.x + Math.sin(t * node.driftFreq.x + node.driftPhase.x) * node.driftAmp.x
        node.mesh.position.y =
          node.origin.y + Math.cos(t * node.driftFreq.y + node.driftPhase.y) * node.driftAmp.y
      })

      // Update connection vertices
      connections.forEach(({ line, a, b }) => {
        const pos = line.geometry.attributes.position as THREE.BufferAttribute
        pos.setXYZ(0, a.mesh.position.x, a.mesh.position.y, a.mesh.position.z)
        pos.setXYZ(1, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z)
        pos.needsUpdate = true
      })

      // Camera parallax
      camera.position.x += (mouse.x - camera.position.x) * 0.045
      camera.position.y += (-mouse.y - camera.position.y) * 0.045
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize handler ────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
