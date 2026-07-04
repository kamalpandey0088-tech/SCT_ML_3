import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_COUNT = 220
const MAX_CONNECTIONS = 380
const MAX_CONN_PER_NODE = 4
const CONN_DISTANCE = 1.15
const SPHERE_R_MIN = 1.8
const SPHERE_R_MAX = 3.0

// ── Neural Mesh ───────────────────────────────────────────────────────────────

interface NeuralMeshProps {
  scrollProgress: React.MutableRefObject<number>
}

function NeuralMesh({ scrollProgress }: NeuralMeshProps) {
  const groupRef = useRef<THREE.Group>(null)

  const { nodePositions, nodeColors, linePositions } = useMemo(() => {
    const nodePositions = new Float32Array(NODE_COUNT * 3)
    const nodeColors = new Float32Array(NODE_COUNT * 3)
    const nodeVec3: THREE.Vector3[] = []

    // Fibonacci sphere distribution for even, natural spread
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = (i * 2.399963) % (Math.PI * 2) // golden angle ≈ 137.5°
      const r = SPHERE_R_MIN + Math.random() * (SPHERE_R_MAX - SPHERE_R_MIN)

      const x = r * radiusAtY * Math.cos(theta)
      const yPos = r * y
      const z = r * radiusAtY * Math.sin(theta)

      nodePositions[i * 3] = x
      nodePositions[i * 3 + 1] = yPos
      nodePositions[i * 3 + 2] = z
      nodeVec3.push(new THREE.Vector3(x, yPos, z))

      // Cyan (70%) ↔ Violet (30%) — neon dual-tone palette
      if (Math.random() > 0.3) {
        // Cyan  #06b6d4
        nodeColors[i * 3] = 0.024
        nodeColors[i * 3 + 1] = 0.714
        nodeColors[i * 3 + 2] = 0.831
      } else {
        // Violet #8b5cf6
        nodeColors[i * 3] = 0.545
        nodeColors[i * 3 + 1] = 0.361
        nodeColors[i * 3 + 2] = 0.965
      }
    }

    // Build connections — capped per-node and globally
    const lineArr: number[] = []
    const connCounts = new Array<number>(NODE_COUNT).fill(0)
    let totalConns = 0

    outer: for (let i = 0; i < nodeVec3.length; i++) {
      for (let j = i + 1; j < nodeVec3.length; j++) {
        if (totalConns >= MAX_CONNECTIONS) break outer
        if (connCounts[i] >= MAX_CONN_PER_NODE) break
        if (connCounts[j] >= MAX_CONN_PER_NODE) continue
        if (nodeVec3[i].distanceTo(nodeVec3[j]) > CONN_DISTANCE) continue

        lineArr.push(
          nodeVec3[i].x, nodeVec3[i].y, nodeVec3[i].z,
          nodeVec3[j].x, nodeVec3[j].y, nodeVec3[j].z
        )
        connCounts[i]++
        connCounts[j]++
        totalConns++
      }
    }

    return {
      nodePositions,
      nodeColors,
      linePositions: new Float32Array(lineArr),
    }
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    const s = scrollProgress.current // 0 → 1

    // Organic base rotation
    groupRef.current.rotation.y = t * 0.07
    groupRef.current.rotation.x = Math.sin(t * 0.035) * 0.12 + s * Math.PI * 0.45

    // Scroll-driven: scale toward zero and push backward
    const scale = Math.max(0, 1 - s * 1.3)
    groupRef.current.scale.setScalar(scale)
    groupRef.current.position.z = -s * 3
  })

  return (
    <group ref={groupRef}>
      {/* ── Main neuron nodes ── */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={NODE_COUNT}
            array={nodePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={NODE_COUNT}
            array={nodeColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          vertexColors
          sizeAttenuation
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── Synaptic connections ── */}
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linePositions.length / 3}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.11}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* ── Inner bright core ── */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={Math.min(60, NODE_COUNT)}
            array={nodePositions.slice(0, Math.min(60, NODE_COUNT) * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.025}
          color="#ffffff"
          sizeAttenuation
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

// ── Ambient background dust ───────────────────────────────────────────────────

function AmbientDust() {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22
      arr[i * 3 + 1] = (Math.random() - 0.5) * 22
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.018
      pointsRef.current.rotation.x = clock.getElapsedTime() * 0.007
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={600}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color="#8b5cf6"
        sizeAttenuation
        transparent
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ── Scene Lighting ────────────────────────────────────────────────────────────

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[6, 6, 6]} intensity={0.8} color="#06b6d4" />
      <pointLight position={[-6, -4, -4]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, 8, -8]} intensity={0.3} color="#ec4899" />
    </>
  )
}

// ── Exported Canvas Wrapper ───────────────────────────────────────────────────

interface NeuralNetCanvasProps {
  scrollProgress: React.MutableRefObject<number>
  className?: string
}

export default function NeuralNetCanvas({
  scrollProgress,
  className = '',
}: NeuralNetCanvasProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 7.5], fov: 58, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.3,
      }}
      dpr={[1, 1.5]}
    >
      <SceneLights />
      <NeuralMesh scrollProgress={scrollProgress} />
      <AmbientDust />
    </Canvas>
  )
}
