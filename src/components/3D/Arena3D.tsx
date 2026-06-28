import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Stars, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { Element } from '../../game/types'

const ELEMENT_COLORS: Record<Element, [number, number, number]> = {
  spark: [1.0, 0.85, 0.2],
  leaf: [0.2, 1.0, 0.4],
  tide: [0.2, 0.7, 1.0],
  ember: [1.0, 0.4, 0.15],
  void: [0.6, 0.3, 1.0],
}

type Arena3DProps = {
  pulseElement?: Element
  pulseCharge?: number
  children?: React.ReactNode
}

function Ring({ element }: { element?: Element }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const color = element ? ELEMENT_COLORS[element] : [0.3, 0.6, 1.0]

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08
      ringRef.current.rotation.z += 0.003
    }
  })

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -1.2, 0]}>
      <ringGeometry args={[2.8, 3.4, 64]} />
      <meshBasicMaterial
        color={new THREE.Color(...color)}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function FloatingOrbs({ pulseElement }: { pulseElement?: Element }) {
  const count = 24
  const positions = useMemo(() => {
    const pos: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 2.2 + Math.random() * 1.2
      pos.push([
        Math.cos(angle) * radius,
        -0.8 + Math.random() * 1.6,
        Math.sin(angle) * radius,
      ])
    }
    return pos
  }, [])

  const color = pulseElement ? ELEMENT_COLORS[pulseElement] : [0.4, 0.7, 1.0]

  return (
    <>
      {positions.map((pos, i) => (
        <Float key={i} speed={0.3 + Math.random() * 0.4} floatIntensity={0.15}>
          <mesh position={pos}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color={new THREE.Color(...color)}
              transparent
              opacity={0.15 + Math.random() * 0.15}
            />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function AmbientLights({ pulseElement }: { pulseElement?: Element }) {
  const color = pulseElement ? ELEMENT_COLORS[pulseElement] : [0.3, 0.6, 1.0]

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />
      <pointLight
        position={[0, 0, 2]}
        intensity={0.8}
        color={new THREE.Color(...color)}
      />
      <pointLight
        position={[-3, 2, -3]}
        intensity={0.3}
        color={new THREE.Color(0.2, 0.5, 1.0)}
      />
    </>
  )
}

export function Arena3D({ pulseElement, pulseCharge = 0, children }: Arena3DProps) {
  const elementColor = pulseElement
    ? `hsl(${ELEMENT_COLORS[pulseElement][0] * 360}, 80%, 50%)`
    : '#4488ff'

  return (
    <>
      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0e18', 6, 14]} />

      <AmbientLights pulseElement={pulseElement} />

      {/* Background stars */}
      <Stars
        radius={20}
        depth={40}
        count={300}
        factor={3}
        saturation={0.3}
        fade
        speed={0.5}
      />

      {/* Sparkles on the arena floor */}
      <Sparkles
        count={80}
        scale={6}
        size={1.5}
        speed={0.3}
        opacity={0.4}
        color={elementColor}
        position={[0, -0.5, 0]}
      />

      {/* Floating orbs */}
      <FloatingOrbs pulseElement={pulseElement} />

      {/* Ring */}
      <Ring element={pulseElement} />

      {/* Pulse charge indicators */}
      {Array.from({ length: pulseCharge }).map((_, i) => (
        <Float key={i} speed={1} floatIntensity={0.3}>
          <mesh position={[-1.2 + i * 1.2, -1.6, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial
              color={new THREE.Color(...(pulseElement ? ELEMENT_COLORS[pulseElement] : [0.4, 0.7, 1.0]))}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Float>
      ))}

      {/* Children (cards, effects) */}
      {children}
    </>
  )
}
