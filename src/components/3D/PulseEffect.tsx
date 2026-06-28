import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Element } from '../../game/types'

const ELEMENT_PARTICLE_COLORS: Record<Element, string> = {
  spark: '#ffdd55',
  leaf: '#66ffa0',
  tide: '#59d2ff',
  ember: '#ff794b',
  void: '#b380ff',
}

type PulseEffectProps = {
  active: boolean
  element?: Element
  position?: [number, number, number]
  intensity?: number
}

function createParticleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(canvas)
}

export function PulseEffect({ active, element, position = [0, 0, 0], intensity = 1 }: PulseEffectProps) {
  const particleCount = 60

  const { positions, velocities, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)
    const col = new Float32Array(particleCount * 3)
    const siz = new Float32Array(particleCount)
    const color = element ? new THREE.Color(ELEMENT_PARTICLE_COLORS[element]) : new THREE.Color('#ffffff')

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 0.1

      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius
      pos[i * 3 + 2] = Math.cos(phi) * radius

      const speed = 0.02 + Math.random() * 0.04
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      vel[i * 3 + 2] = Math.cos(phi) * speed

      const c = color.clone().multiplyScalar(0.5 + Math.random() * 0.5)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b

      siz[i] = 0.04 + Math.random() * 0.08
    }

    return { positions: pos, velocities: vel, colors: col, sizes: siz }
  }, [element])

  const geometryRef = useRef<THREE.BufferGeometry>(null)

  // Store velocities on the ref so useFrame can access them
  const velRef = useRef(velocities)
  velRef.current = velocities

  useFrame((_, delta) => {
    if (!active || !geometryRef.current) return

    const pos = geometryRef.current.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] += velRef.current[i * 3] * delta * intensity * 20
      pos[i * 3 + 1] += velRef.current[i * 3 + 1] * delta * intensity * 20
      pos[i * 3 + 2] += velRef.current[i * 3 + 2] * delta * intensity * 20

      velRef.current[i * 3] *= 0.98
      velRef.current[i * 3 + 1] *= 0.98
      velRef.current[i * 3 + 2] *= 0.98
    }

    geometryRef.current.attributes.position.needsUpdate = true
  })

  const texture = useMemo(() => createParticleTexture(), [])

  if (!active) return null

  return (
    <points position={position}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        map={texture}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
        opacity={0.8}
      />
    </points>
  )
}
