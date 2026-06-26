// Generador del circuito diario (006). PURO y HEADLESS: sin red, sin DOM, sin Three.js, sin Rapier.
// `generateCircuit(seed, params) -> CircuitDefinition`. Determinista hasta la rejilla (posiciones =
// entero·grid, exactas en float64) y completable por construcción (clamp del hueco al envoltorio de
// salto). Reutiliza primitivas y el catálogo de obstáculos validado (001/002); NO crea tipos nuevos.
// Lee las constantes CONGELADAS de generación (params), nunca las perillas de feel vivas (research §8).

import type { CircuitDefinition, ObstacleDef, StaticBox, ZoneDef } from '../circuit'
import type { ObstacleKind, Vec3 } from '../types'
import { createPrng } from './prng'
import { jumpEnvelope, maxHorizReach, type GenEnvelope } from './solvability'

export interface GeneratorParams {
  generatorVersion: string
  varietySalt: string
  grid: number
  segmentsRange: { min: number; max: number }
  gapRange: { min: number; max: number }
  platformHalfWidthRange: { min: number; max: number }
  platformHalfDepth: number
  obstacleChance: { num: number; den: number }
  minObstacles: number
  obstacleMix: Partial<Record<ObstacleKind, number>>
  reachMargin: number
  envelope: GenEnvelope
}

const PLATFORM_COLOR = 0x3b4252
const FINISH_COLOR = 0xd4af37
const START_COLOR = 0x2e7d32
// Color + malla por tipo de obstáculo (reutiliza los assets existentes; sin assets nuevos).
const OBSTACLE_META: Record<Exclude<ObstacleKind, 'carry'>, { color: number; meshUrl: string; yOffset: number; meshYaw?: number }> = {
  oscillate: { color: 0xbf4040, meshUrl: 'assets/obstacle-oscillate.glb', yOffset: 1.5 },
  rotateBar: { color: 0xb5651d, meshUrl: 'assets/obstacle-rotatebar.glb', yOffset: 1.1 },
  pendulum: { color: 0x8e44ad, meshUrl: 'assets/obstacle-pendulum.glb', yOffset: 4.5 },
  pusher: { color: 0xe07b39, meshUrl: 'assets/obstacle-pusher.glb', yOffset: 1.5, meshYaw: Math.PI / 2 },
}

// Tema candy reutilizado del circuito fijo (dirección de arte 002); el render cae a color si no carga.
const THEME = {
  palette: { sky: 0x7ec8f3, platform: 0x2fd4c4, ramp: 0xff7a1a, wall: 0x14233b, ink: 0x14233b },
  skyboxUrl: 'assets/sky.png',
  textures: { platform: 'assets/tex-platform.png', ramp: 'assets/tex-ramp.png', wall: 'assets/tex-wall.png' },
}

/** Genera el circuito diario determinista a partir del seed blanqueado. */
export function generateCircuit(seed: Uint8Array, params: GeneratorParams): CircuitDefinition {
  const rng = createPrng(seed)
  const grid = params.grid
  const env = jumpEnvelope(params.envelope, params.reachMargin)
  const snap = (v: number): number => Math.round(v / grid) * grid
  // Entero gridded en [min, max] (m), inclusivo en ambos extremos por pasos de rejilla.
  const griddedRange = (min: number, max: number): number => {
    const lo = Math.round(min / grid)
    const hi = Math.round(max / grid)
    return rng.intRange(lo, hi + 1) * grid
  }

  // Mezcla ponderada de obstáculos (v1 EXCLUYE 'carry': el puente móvil se difiere a una versión futura
  // del generador; los demás tipos del catálogo se colocan como peligro sobre la plataforma).
  const mix: { kind: Exclude<ObstacleKind, 'carry'>; w: number }[] = []
  for (const [k, w] of Object.entries(params.obstacleMix)) {
    if (k === 'carry' || !w) continue
    mix.push({ kind: k as Exclude<ObstacleKind, 'carry'>, w })
  }
  const totalW = mix.reduce((s, m) => s + m.w, 0) || 1
  const pickObstacleKind = (): Exclude<ObstacleKind, 'carry'> => {
    let r = rng.intRange(0, totalW)
    for (const m of mix) {
      if (r < m.w) return m.kind
      r -= m.w
    }
    return mix[0].kind
  }

  const statics: StaticBox[] = []
  const obstacles: ObstacleDef[] = []
  const hd = params.platformHalfDepth

  // Plataforma de salida (p0) en z=0, ancha, top y=0 (como el circuito fijo). spawn encima.
  let curX = 0
  let curTopY = 0
  let curZ = 0
  let curHW = snap(params.platformHalfWidthRange.max + 4) // salida ancha
  statics.push({ id: 'p0', kind: 'platform', center: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: curHW, y: 0.5, z: hd }, color: START_COLOR })

  const segments = rng.intRange(params.segmentsRange.min, params.segmentsRange.max + 1)
  let obstacleCount = 0

  for (let i = 1; i <= segments; i++) {
    const isLast = i === segments
    // Desnivel pequeño gridded en [-1, +1] (siempre dentro de maxRise·margen → altura alcanzable).
    const maxStep = Math.min(1, env.maxRise * env.margin)
    const dy = griddedRange(-Math.min(1, maxStep), Math.min(1, maxStep))
    // Desplazamiento lateral pequeño (X centrado y acotado a una banda estrecha).
    let nextX = snap(curX + griddedRange(-1, 1))
    if (nextX > 2) nextX = 2
    if (nextX < -2) nextX = -2
    const dx = Math.abs(nextX - curX)
    // Hueco elegido, CLAMP al máximo soluble dado dy y dx (completable por construcción, FR-007).
    let gap = griddedRange(params.gapRange.min, params.gapRange.max)
    const maxHoriz = maxHorizReach(env, dy)
    const maxGap = Math.sqrt(Math.max(0, maxHoriz * maxHoriz - dx * dx))
    const maxGapGridded = Math.floor(maxGap / grid) * grid
    if (gap > maxGapGridded) gap = Math.max(grid * 2, maxGapGridded)

    const nextTopY = curTopY + dy
    const nextZ = snap(curZ - (hd + gap + hd))
    const hw = isLast
      ? snap(params.platformHalfWidthRange.max + 1) // meta ancha
      : griddedRange(params.platformHalfWidthRange.min, params.platformHalfWidthRange.max)

    statics.push({
      id: isLast ? 'pf' : `p${i}`,
      kind: 'platform',
      center: { x: nextX, y: nextTopY - 0.5, z: nextZ },
      halfExtents: { x: hw, y: 0.5, z: hd },
      color: isLast ? FINISH_COLOR : PLATFORM_COLOR,
    })

    // Obstáculo en plataformas intermedias: forzado hasta cubrir minObstacles, luego por probabilidad.
    if (!isLast) {
      const intermediatesLeft = segments - 1 - i // plataformas intermedias que aún quedan
      const mustPlace = obstacleCount < params.minObstacles && intermediatesLeft < params.minObstacles - obstacleCount
      if (mustPlace || rng.chance(params.obstacleChance.num, params.obstacleChance.den)) {
        const kind = pickObstacleKind()
        const meta = OBSTACLE_META[kind]
        const base: Vec3 = { x: nextX, y: nextTopY + meta.yOffset, z: nextZ }
        const ob = { id: `ob${i}`, kind, base, color: meta.color, meshUrl: meta.meshUrl } as ObstacleDef
        if (meta.meshYaw !== undefined) (ob as { meshYaw?: number }).meshYaw = meta.meshYaw
        obstacles.push(ob)
        obstacleCount++
      }
    }

    curX = nextX
    curTopY = nextTopY
    curZ = nextZ
    curHW = hw
  }

  const finishTop = curTopY
  const zones: ZoneDef[] = [
    { kind: 'start', center: { x: 0, y: 0.6, z: 0 }, halfExtents: { x: statics[0].halfExtents.x, y: 0.6, z: hd }, color: START_COLOR },
    {
      kind: 'finish',
      center: { x: curX, y: finishTop + 1.1, z: curZ },
      halfExtents: { x: curHW, y: 0.8, z: hd },
      color: FINISH_COLOR,
      signageUrl: 'assets/sign-finish.png',
    },
  ]

  return {
    spawn: { x: 0, y: 1.0, z: 0 },
    statics,
    obstacles,
    zones,
    theme: THEME,
  }
}
