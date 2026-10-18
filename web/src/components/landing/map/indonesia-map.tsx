'use client'

import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { barHeight, readColors, type GeoFile, type Province, type Values } from './geo'

type Props = {
  geo: GeoFile
  values: Values
  /** Nilai tertinggi di seluruh tahun, agar tinggi balok bisa dibandingkan antartahun. */
  max: number
  hovered: string | null
  onHover: (kode: string | null) => void
  tooltip: (kode: string) => React.ReactNode
}

const LAND_DEPTH = 0.22

function useColors() {
  const [colors, setColors] = useState(readColors)
  useEffect(() => {
    const update = () => setColors(readColors())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    window.addEventListener('themechange', update)
    return () => { mq.removeEventListener('change', update); window.removeEventListener('themechange', update) }
  }, [])
  return colors
}

function provinceGeometry(p: Province) {
  const parts = p.rings.map((ring) => {
    const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)))
    return new THREE.ExtrudeGeometry(shape, { depth: LAND_DEPTH, bevelEnabled: false })
  })
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts)
  if (parts.length > 1) parts.forEach((g) => g.dispose())
  // Bentuk di bidang XY diputar ke bidang datar XZ, ketebalan menghadap ke atas.
  merged.rotateX(-Math.PI / 2)
  return merged
}

function Land({ geo, hovered, onHover, colors }: Pick<Props, 'geo' | 'hovered' | 'onHover'> & { colors: ReturnType<typeof readColors> }) {
  const geometries = useMemo(() => geo.provinces.map((p) => ({ kode: p.kode, geometry: provinceGeometry(p) })), [geo])
  useEffect(() => () => geometries.forEach((g) => g.geometry.dispose()), [geometries])
  return (
    <group>
      {geometries.map(({ kode, geometry }) => (
        <mesh
          key={kode}
          geometry={geometry}
          receiveShadow
          onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(kode) }}
          onPointerOut={() => onHover(null)}
        >
          <meshStandardMaterial color={hovered === kode ? colors.landHover : colors.land} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function Bar({ p, height, active, colors, onHover, tooltip, reduced }: {
  p: Province; height: number; active: boolean; colors: ReturnType<typeof readColors>
  onHover: Props['onHover']; tooltip: Props['tooltip']; reduced: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  const current = useRef(reduced ? height : 0)
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    current.current = reduced ? height : THREE.MathUtils.damp(current.current, height, 5, dt)
    const h = Math.max(current.current, 0.001)
    mesh.scale.y = h
    mesh.position.y = LAND_DEPTH + h / 2
    mesh.visible = current.current > 0.01
  })
  const [x, y] = p.center
  return (
    <group position={[x, 0, -y]}>
      <mesh
        ref={ref}
        castShadow
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(p.kode) }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color={active ? colors.barHover : colors.bar} roughness={0.45} metalness={0.05} />
      </mesh>
      {active && (
        <Html position={[0, LAND_DEPTH + Math.max(height, 0.4) + 0.5, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          {tooltip(p.kode)}
        </Html>
      )}
    </group>
  )
}

function Scene({ geo, values, max, hovered, onHover, tooltip }: Props) {
  const colors = useColors()
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    // Ayunan pelan agar peta terasa hidup; dimatikan untuk pengguna reduced motion.
    if (group.current && !reduced) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.12
  })
  return (
    <group ref={group}>
      <Land geo={geo} hovered={hovered} onHover={onHover} colors={colors} />
      {geo.provinces.map((p) => (
        <Bar key={p.kode} p={p} height={barHeight(values[p.kode], max)} active={hovered === p.kode}
          colors={colors} onHover={onHover} tooltip={tooltip} reduced={reduced} />
      ))}
    </group>
  )
}

const MAP_WIDTH = 47 // lebar peta (Aceh–Papua) plus margin, satuan scene
const VIEW_DIR = new THREE.Vector3(0, 0.66, 0.75).normalize()
// Titik pandang di depan-bawah peta, sehingga peta tampil di bagian atas hero (judul ada di bawah).
const TARGET = new THREE.Vector3(0, -2.5, 3.6)

/** Atur jarak kamera agar seluruh peta muat di lebar layar berapa pun. */
function CameraRig() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect)
    // Layar sempit diberi margin lebih karena peta berayun ke kiri-kanan.
    const width = aspect < 1 ? MAP_WIDTH + 6 : MAP_WIDTH
    const dist = Math.max(30, (width / 2) / Math.tan(hfov / 2))
    cam.position.copy(TARGET).addScaledVector(VIEW_DIR, dist)
    cam.lookAt(TARGET)
    cam.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export default function IndonesiaMap(props: Props) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [0, 24, 30], fov: 34, near: 1, far: 200 }}
      onPointerMissed={() => props.onHover(null)}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#ffffff', '#888888', 0.6]} />
      <directionalLight
        position={[-12, 26, 14]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />
      <CameraRig />
      <group position={[0, 0, 0]}>
        <Scene {...props} />
      </group>
      <OrbitControls
        target={TARGET}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.05}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
        rotateSpeed={0.5}
      />
    </Canvas>
  )
}
