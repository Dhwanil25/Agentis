import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function BackgroundCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 80

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Particles
    const PARTICLE_COUNT = 120
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities: THREE.Vector3[] = []
    const SPREAD = 120

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        0
      ))
    }

    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMat = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 0.6,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // Connection lines
    const lineGroup = new THREE.Group()
    scene.add(lineGroup)

    const MAX_DIST = 22
    let frameId: number

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      // Update particle positions
      const pos = particleGeo.attributes.position.array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3]     += velocities[i].x
        pos[i * 3 + 1] += velocities[i].y

        // Wrap around edges
        if (pos[i * 3] > SPREAD / 2)  pos[i * 3] = -SPREAD / 2
        if (pos[i * 3] < -SPREAD / 2) pos[i * 3] = SPREAD / 2
        if (pos[i * 3 + 1] > SPREAD / 2)  pos[i * 3 + 1] = -SPREAD / 2
        if (pos[i * 3 + 1] < -SPREAD / 2) pos[i * 3 + 1] = SPREAD / 2
      }
      particleGeo.attributes.position.needsUpdate = true

      // Remove old lines
      while (lineGroup.children.length) lineGroup.remove(lineGroup.children[0])

      // Draw connections
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = pos[i * 3]     - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < MAX_DIST) {
            const opacity = (1 - dist / MAX_DIST) * 0.15
            const geo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]),
              new THREE.Vector3(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]),
            ])
            const mat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity })
            lineGroup.add(new THREE.Line(geo, mat))
          }
        }
      }

      // Slow rotation
      particles.rotation.z += 0.0002
      lineGroup.rotation.z += 0.0002

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
