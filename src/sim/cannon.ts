// Cañón reactivo que apunta al jugador y dispara (prototipo). DETERMINISTA: todo es función del
// estado + la posición del jugador + dt + config, consumido dentro del paso fijo (Principio II).
// No importa Three ni el Player: stepCannon devuelve la dirección de knockback y la magnitud la
// aplica la simulación (reutilizando el modelo de empuje existente). Sin Math.random.

import type { Config } from '../config'
import type { CannonDef } from '../circuit'
import type { Vec3 } from '../types'

export interface Projectile {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number // s restantes antes de despawn
}

export interface CannonState {
  base: Vec3
  aim: Vec3 // dirección unitaria a la que apunta la boca
  target: Vec3 // último objetivo muestreado (unitario), hacia el que gira el apuntado
  retarget: number // s hasta volver a muestrear el objetivo (lag de apuntado)
  reload: number // s hasta poder disparar
  projectiles: Projectile[]
}

const FORWARD: Vec3 = { x: 0, y: 0, z: -1 } // -Z = hacia delante (convención del circuito)

export function createCannonState(def: CannonDef): CannonState {
  return {
    base: { ...def.base },
    aim: { ...FORWARD },
    target: { ...FORWARD },
    retarget: 0,
    reload: 0,
    projectiles: [],
  }
}

export function resetCannonState(s: CannonState): void {
  s.aim = { ...FORWARD }
  s.target = { ...FORWARD }
  s.retarget = 0
  s.reload = 0
  s.projectiles = []
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

function normalizeOr(x: number, y: number, z: number, fallback: Vec3): Vec3 {
  const len = Math.hypot(x, y, z)
  if (len < 1e-6) return { ...fallback }
  return { x: x / len, y: y / len, z: z / len }
}

/** Gira `aim` hacia `target` como máximo `maxAngle` rad (rotación en su plano común). */
function rotateToward(aim: Vec3, target: Vec3, maxAngle: number): Vec3 {
  const dot = clamp(aim.x * target.x + aim.y * target.y + aim.z * target.z, -1, 1)
  const angle = Math.acos(dot)
  if (angle <= maxAngle || angle < 1e-6) return { ...target }
  // Componente de target perpendicular a aim (dirección de giro dentro del plano aim-target).
  let px = target.x - aim.x * dot
  let py = target.y - aim.y * dot
  let pz = target.z - aim.z * dot
  let plen = Math.hypot(px, py, pz)
  if (plen < 1e-6) {
    // aim y target casi opuestos: elige una perpendicular estable (aim × Y, o aim × X).
    px = -aim.z
    py = 0
    pz = aim.x
    plen = Math.hypot(px, py, pz)
    if (plen < 1e-6) {
      px = 0
      py = 1
      pz = 0
      plen = 1
    }
  }
  px /= plen
  py /= plen
  pz /= plen
  const ca = Math.cos(maxAngle)
  const sa = Math.sin(maxAngle)
  return normalizeOr(aim.x * ca + px * sa, aim.y * ca + py * sa, aim.z * ca + pz * sa, target)
}

/**
 * Avanza el cañón un paso fijo: re-muestrea el objetivo por cadencia, gira el apuntado, dispara al
 * estar alineado y recargado, y mueve los proyectiles con contacto BARRIDO (sub-pasos < radio de la
 * cápsula → no atraviesa al jugador a alta velocidad). Devuelve la dirección horizontal del empuje
 * si un proyectil impacta este paso, o null. Muta `state`.
 */
export function stepCannon(state: CannonState, playerCenter: Vec3, dt: number, config: Config): { x: number; z: number } | null {
  const c = config.cannon
  const muzzle: Vec3 = {
    x: state.base.x + state.aim.x * c.muzzleLength,
    y: state.base.y + state.aim.y * c.muzzleLength,
    z: state.base.z + state.aim.z * c.muzzleLength,
  }
  const dirNow = normalizeOr(
    playerCenter.x - muzzle.x,
    playerCenter.y - muzzle.y,
    playerCenter.z - muzzle.z,
    state.aim,
  )

  // Re-muestreo del objetivo por cadencia (introduce lag → esquivable).
  state.retarget -= dt
  if (state.retarget <= 0) {
    state.target = dirNow
    state.retarget = c.aimCadence
  }
  // Giro del apuntado hacia el objetivo muestreado.
  state.aim = rotateToward(state.aim, state.target, c.rotationSpeed * dt)

  // Disparo: recargado y apuntando al jugador ACTUAL dentro de la tolerancia.
  state.reload -= dt
  const aimDot = clamp(state.aim.x * dirNow.x + state.aim.y * dirNow.y + state.aim.z * dirNow.z, -1, 1)
  if (state.reload <= 0 && Math.acos(aimDot) <= c.fireToleranceRad) {
    state.projectiles.push({
      x: muzzle.x,
      y: muzzle.y,
      z: muzzle.z,
      vx: state.aim.x * c.projectileSpeed,
      vy: state.aim.y * c.projectileSpeed,
      vz: state.aim.z * c.projectileSpeed,
      life: c.projectileLife,
    })
    state.reload = c.fireReload
  }

  // Avance de proyectiles + contacto barrido. Array reconstruido en orden (no splice en iteración).
  let hit: { x: number; z: number } | null = null
  const hitR = config.capsuleRadius + c.projectileRadius + c.contactMargin
  const alive: Projectile[] = []
  for (const pr of state.projectiles) {
    pr.life -= dt
    if (pr.life <= 0) continue
    const speed = Math.hypot(pr.vx, pr.vy, pr.vz)
    const subN = Math.max(1, Math.ceil((speed * dt) / (config.capsuleRadius * 0.5)))
    const sdt = dt / subN
    let hitThis = false
    for (let i = 0; i < subN; i++) {
      pr.x += pr.vx * sdt
      pr.y += pr.vy * sdt
      pr.z += pr.vz * sdt
      // Distancia del proyectil al núcleo (segmento vertical) de la cápsula del jugador.
      const cy = clamp(pr.y, playerCenter.y - config.capsuleHalfHeight, playerCenter.y + config.capsuleHalfHeight)
      if (Math.hypot(pr.x - playerCenter.x, pr.y - cy, pr.z - playerCenter.z) <= hitR) {
        hitThis = true
        break
      }
    }
    if (hitThis) {
      const hlen = Math.hypot(pr.vx, pr.vz)
      hit = hlen > 1e-4 ? { x: pr.vx / hlen, z: pr.vz / hlen } : { x: state.aim.x, z: state.aim.z }
      continue // proyectil consumido
    }
    alive.push(pr)
  }
  state.projectiles = alive
  return hit
}
