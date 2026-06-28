import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Card, Element } from '../../game/types'

const ELEMENT_COLORS: Record<Element, string> = {
  spark: '#ffdd55',
  leaf: '#66ffa0',
  tide: '#59d2ff',
  ember: '#ff794b',
  void: '#b380ff',
}

const ELEMENT_EMISSIVE: Record<Element, [number, number, number]> = {
  spark: [1.0, 0.85, 0.2],
  leaf: [0.2, 1.0, 0.4],
  tide: [0.2, 0.7, 1.0],
  ember: [1.0, 0.4, 0.15],
  void: [0.6, 0.3, 1.0],
}

type FloatingCardProps = {
  card: Card
  position: [number, number, number]
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
}

export function FloatingCard({ card, position, onClick, disabled, selected }: FloatingCardProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const floatSpeed = 0.8 + Math.random() * 0.6
  const floatHeight = 0.15 + Math.random() * 0.15

  const texture = useMemo(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = card.image
    const tex = new THREE.Texture(img)
    img.onload = () => { tex.needsUpdate = true }
    return tex
  }, [card.image])

  // Dispose texture when component unmounts to prevent memory leak
  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        Math.sin(state.clock.elapsedTime * 0.5) * 0.15,
        0.08
      )
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        Math.cos(state.clock.elapsedTime * 0.4) * 0.08,
        0.08
      )
    }
  })

  const glowColor = ELEMENT_COLORS[card.element]
  const emissive = ELEMENT_EMISSIVE[card.element]
  const rarityMultiplier = card.rarity === 'epic' ? 1.4 : card.rarity === 'rare' ? 1.2 : 1.0

  return (
    <group position={position}>
      <Float
        speed={floatSpeed}
        rotationIntensity={0.08}
        floatIntensity={floatHeight}
      >
        <mesh
          ref={meshRef}
          onClick={disabled ? undefined : onClick}
          onPointerOver={() => !disabled && setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry args={[0.9 * rarityMultiplier, 1.26 * rarityMultiplier]} />
          <meshStandardMaterial
            map={texture}
            transparent
            side={THREE.DoubleSide}
            emissive={new THREE.Color(...emissive)}
            emissiveIntensity={hovered ? 0.6 : selected ? 0.5 : 0.15}
            toneMapped={false}
          />

          {/* Glow rim */}
          <mesh scale={[1.06, 1.06, 1]}>
            <planeGeometry args={[0.9 * rarityMultiplier, 1.26 * rarityMultiplier]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={hovered ? 0.35 : selected ? 0.3 : 0.08}
              side={THREE.BackSide}
            />
          </mesh>
        </mesh>

        {/* Rarity badge */}
        <Html position={[0, -0.72 * rarityMultiplier, 0.02]} center>
          <div style={{
            fontSize: '9px',
            fontWeight: 900,
            color: card.rarity === 'epic' ? '#c084fc' : card.rarity === 'rare' ? '#60a5fa' : '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}>
            {card.rarity}
          </div>
        </Html>

        {/* Cost badge */}
        <Html position={[-0.38 * rarityMultiplier, 0.58 * rarityMultiplier, 0.02]} center>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(180deg, #fff1a9, #ffc13f)',
            color: '#151000',
            fontWeight: 950,
            fontSize: 13,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 10px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}>
            {card.cost}
          </div>
        </Html>

        {/* Name */}
        <Html position={[0, -0.52 * rarityMultiplier, 0.02]} center>
          <div style={{
            fontSize: '11px',
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {card.name}
          </div>
        </Html>

        {/* Attack/Health badge for creatures */}
        {card.type === 'creature' && card.attack !== undefined && card.health !== undefined && (
          <Html position={[0.38 * rarityMultiplier, -0.58 * rarityMultiplier, 0.02]} center>
            <div style={{
              display: 'flex',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #fff2aa, #ffc246)',
              color: '#1b1300',
              fontWeight: 950,
              fontSize: 11,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}>
              ⚔{card.attack} ❤{card.health}
            </div>
          </Html>
        )}
      </Float>
    </group>
  )
}
