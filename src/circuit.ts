// Definición PURA del circuito (datos, sin Three.js ni Rapier). La consumen:
//   - sim/ para crear los colliders (estáticos + sensores),
//   - render/scene.ts para construir las mallas (vía sim.getCircuitDefinition()).
// Layout aproximado de research R9; las dimensiones se afinan en la prueba de juego.
// Convención: -Z es "hacia delante"; el jugador aparece en P0 mirando a -Z.

import type { Vec3 } from './types'

export type StaticKind = 'platform' | 'wall' | 'ramp'

export interface StaticBox {
  id: string
  kind: StaticKind
  center: Vec3
  halfExtents: Vec3
  /** Inclinación alrededor del eje X (rad), para la rampa. */
  rotationX?: number
  color: number
}

export interface ZoneDef {
  kind: 'start' | 'finish'
  /** AABB usado tanto para la detección por contención como para la losa visible. */
  center: Vec3
  halfExtents: Vec3
  color: number
}

export interface CircuitDefinition {
  /** Pose de aparición / respawn (centro de la cápsula). */
  spawn: Vec3
  statics: StaticBox[]
  /** Centro del vaivén del obstáculo (la amplitud/eje van en config). */
  obstacleBase: Vec3
  zones: ZoneDef[]
}

const PLATFORM = 0x3b4252
const WALL = 0x4c566a
const RAMP = 0x5e81ac
const START = 0x2e7d32
const FINISH = 0xd4af37

export const circuit: CircuitDefinition = {
  spawn: { x: 0, y: 1.0, z: 0 },
  obstacleBase: { x: 0, y: 3.0, z: -31 },
  statics: [
    // P0 — plataforma de salida (ancha)
    { id: 'p0', kind: 'platform', center: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: 4, y: 0.5, z: 4 }, color: PLATFORM },
    // P1 — tras un hueco saltable
    { id: 'p1', kind: 'platform', center: { x: 0, y: -0.5, z: -11 }, halfExtents: { x: 3, y: 0.5, z: 3 }, color: PLATFORM },
    // Rampa de P1 (y=0) hacia P2 (y=2)
    { id: 'ramp', kind: 'ramp', center: { x: 0, y: 1.0, z: -16.5 }, halfExtents: { x: 3, y: 0.25, z: 3 }, rotationX: -0.38, color: RAMP },
    // P2 — plataforma media (con muros laterales para probar slide)
    { id: 'p2', kind: 'platform', center: { x: 0, y: 1.5, z: -22 }, halfExtents: { x: 3, y: 0.5, z: 3 }, color: PLATFORM },
    { id: 'wall-l', kind: 'wall', center: { x: -3.4, y: 2.6, z: -22 }, halfExtents: { x: 0.4, y: 1.2, z: 3 }, color: WALL },
    { id: 'wall-r', kind: 'wall', center: { x: 3.4, y: 2.6, z: -22 }, halfExtents: { x: 0.4, y: 1.2, z: 3 }, color: WALL },
    // P3 — plataforma ancha cruzada por el obstáculo móvil
    { id: 'p3', kind: 'platform', center: { x: 0, y: 1.5, z: -31 }, halfExtents: { x: 5, y: 0.5, z: 4 }, color: PLATFORM },
    // P4 — plataforma de paso tras un hueco
    { id: 'p4', kind: 'platform', center: { x: 0, y: 1.5, z: -40 }, halfExtents: { x: 2.5, y: 0.5, z: 2.5 }, color: PLATFORM },
    // P5 — plataforma de meta
    { id: 'p5', kind: 'platform', center: { x: 0, y: 1.5, z: -47 }, halfExtents: { x: 4, y: 0.5, z: 4 }, color: PLATFORM },
  ],
  zones: [
    { kind: 'start', center: { x: 0, y: 0.6, z: 0 }, halfExtents: { x: 4, y: 0.6, z: 4 }, color: START },
    { kind: 'finish', center: { x: 0, y: 2.6, z: -47 }, halfExtents: { x: 4, y: 0.8, z: 4 }, color: FINISH },
  ],
}
