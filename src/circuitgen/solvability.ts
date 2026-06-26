// Comprobación de solubilidad del circuito (006). PURO. Envoltorio de salto cerrado (cinemática), NO
// simulación física. Lee las constantes CONGELADAS de generación (no las perillas de feel vivas), de
// modo que la solubilidad es reproducible bajo la versión del generador (research §8). FR-007 / SC-004.

import type { CircuitDefinition, StaticBox } from '../circuit'

export interface GenEnvelope {
  /** Valores congelados del envoltorio. */
  gravityY: number
  jumpSpeed: number
  moveSpeed: number
}

export interface Envelope {
  maxRise: number // altura máxima alcanzable de un salto (m)
  v0: number // jumpSpeed
  g: number // |gravityY|
  moveSpeed: number
  margin: number // fracción exigible (reachMargin)
}

export function jumpEnvelope(env: GenEnvelope, reachMargin: number): Envelope {
  const g = Math.abs(env.gravityY)
  const v0 = env.jumpSpeed
  return { maxRise: (v0 * v0) / (2 * g), v0, g, moveSpeed: env.moveSpeed, margin: reachMargin }
}

/** Tiempo de vuelo hasta aterrizar a un desnivel `dy` (m); null si `dy` supera la altura máxima. */
function timeToLand(env: Envelope, dy: number): number | null {
  const disc = env.v0 * env.v0 - 2 * env.g * dy
  if (disc < 0) return null
  return (env.v0 + Math.sqrt(disc)) / env.g
}

/** Alcance horizontal máximo (con margen) para un salto que termina a desnivel `dy`. */
export function maxHorizReach(env: Envelope, dy: number): number {
  const t = timeToLand(env, dy)
  if (t === null) return 0
  return env.moveSpeed * t * env.margin
}

/** ¿Se puede saltar un hueco horizontal `horizDist` (m) terminando a desnivel `dy` (m)? */
export function isReachable(env: Envelope, dy: number, horizDist: number): boolean {
  if (dy > env.maxRise) return false
  return horizDist <= maxHorizReach(env, dy)
}

const topY = (s: StaticBox): number => s.center.y + s.halfExtents.y

/**
 * ¿El circuito es completable de salida a meta? Ordena las plataformas del camino por Z descendente
 * (la convención es avanzar hacia -Z) y exige que cada transición consecutiva sea alcanzable. Los
 * muros/rampas/atajos no son escalones del camino y se excluyen.
 */
export function isSolvable(circuit: CircuitDefinition, env: Envelope): boolean {
  const path = circuit.statics
    .filter((s) => s.kind === 'platform')
    .slice()
    .sort((a, b) => b.center.z - a.center.z) // de z=0 (salida) hacia -Z (meta)
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]
    const next = path[i]
    const gapZ = prev.center.z - prev.halfExtents.z - (next.center.z + next.halfExtents.z)
    const dx = Math.abs(next.center.x - prev.center.x)
    const horiz = Math.hypot(Math.max(0, gapZ), dx)
    const dy = topY(next) - topY(prev)
    if (!isReachable(env, dy, horiz)) return false
  }
  return true
}
