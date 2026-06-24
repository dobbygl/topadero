// Definición PURA del circuito (datos, sin Three.js ni Rapier). La consumen:
//   - sim/ para crear los colliders estáticos (las zonas son AABB de datos, no colliders),
//   - render/scene.ts para construir las mallas (vía sim.getCircuitDefinition()).
// Layout aproximado de research R9; las dimensiones se afinan en la prueba de juego.
// Convención: -Z es "hacia delante"; el jugador aparece en P0 mirando a -Z.

import type { ObstacleKind, Vec3 } from './types'

export type StaticKind = 'platform' | 'wall' | 'ramp'

export interface StaticBox {
  id: string
  kind: StaticKind
  center: Vec3
  halfExtents: Vec3
  /** Inclinación alrededor del eje X (rad), para la rampa. */
  rotationX?: number
  color: number
  /** VISUAL-ONLY: textura de superficie (US2); sim/ lo ignora. Reserva: color. */
  texture?: string
}

export interface ZoneDef {
  kind: 'start' | 'finish'
  /** AABB usado tanto para la detección por contención como para la losa visible. */
  center: Vec3
  halfExtents: Vec3
  color: number
  /** VISUAL-ONLY: cartel de señalización (US2); sim/ lo ignora. Reserva: losa coloreada. */
  signageUrl?: string
}

/** VISUAL-ONLY: dirección de arte (paleta de ./marketing + skybox + texturas). La lee solo render/. */
export interface CircuitTheme {
  palette: { sky: number; platform: number; ramp: number; wall: number; ink: number }
  skyboxUrl?: string
  /** Texturas de superficie por tipo (tileables); reserva al color de paleta si no cargan. */
  textures?: { platform?: string; ramp?: string; wall?: string }
}

/**
 * Obstáculo móvil. Campos de SIMULACIÓN (los lee sim/) + campos VISUAL-ONLY (`color`,
 * `meshUrl`) que sim/ ignora, igual que StaticBox.color. Las MAGNITUDES (amplitud, velocidad,
 * halfExtents del collider) viven por tipo en config.ts; aquí solo va lo que define la
 * instancia (id, kind, pivote `base` y, para portantes, eje y halfExtents).
 */
export interface ObstacleDefBase {
  id: string
  kind: ObstacleKind
  /** Pivote / centro de la trayectoria. */
  base: Vec3
  color: number
  /** VISUAL-ONLY: malla low-poly (US3); sim/ lo ignora. */
  meshUrl?: string
  /** VISUAL-ONLY: giro Y (rad) de la malla para orientarla (p.ej. el cañón hacia el jugador).
   *  Si está presente, el render usa escala uniforme (no 'fill') para que el giro no cizalle. */
  meshYaw?: number
}
export interface OscillateDef extends ObstacleDefBase {
  kind: 'oscillate'
}
export interface RotateBarDef extends ObstacleDefBase {
  kind: 'rotateBar'
}
export interface PendulumDef extends ObstacleDefBase {
  kind: 'pendulum'
}
export interface PusherDef extends ObstacleDefBase {
  kind: 'pusher'
}
export interface CarryDef extends ObstacleDefBase {
  kind: 'carry'
  /** La cara superior de este AABB define el soporte (R-carry). */
  halfExtents: Vec3
  /** SOLO horizontal (clarificación FR-007); el vertical queda excluido (rapier #488). */
  axis: 'x' | 'z'
}
export type ObstacleDef = OscillateDef | RotateBarDef | PendulumDef | PusherDef | CarryDef

export interface CircuitDefinition {
  /** Pose de aparición / respawn (centro de la cápsula). */
  spawn: Vec3
  statics: StaticBox[]
  /** Obstáculos móviles (función pura del tiempo de sim por tipo). */
  obstacles: ObstacleDef[]
  zones: ZoneDef[]
  /** VISUAL-ONLY: dirección de arte; sim/ lo ignora. */
  theme?: CircuitTheme
}

const PLATFORM = 0x3b4252
const WALL = 0x4c566a
const RAMP = 0x5e81ac
const START = 0x2e7d32
const FINISH = 0xd4af37
const OBSTACLE = 0xbf4040
const BAR = 0xb5651d
const PENDULUM = 0x8e44ad
const CARRY = 0x2fd4c4
const PUSHER = 0xe07b39

export const circuit: CircuitDefinition = {
  spawn: { x: 0, y: 1.0, z: 0 },
  // 002 · US1: variedad de obstáculos deterministas. Magnitudes en config.ts; aquí va la
  // instancia (id/kind/base/eje). Colocación a afinar en playtest (Principio I/V).
  obstacles: [
    // Barra giratoria sobre P2 (barrido horizontal a la altura del cuerpo).
    { id: 'bar', kind: 'rotateBar', base: { x: 0, y: 2.6, z: -22 }, color: BAR, meshUrl: 'assets/obstacle-rotatebar.glb' },
    // Vaivén senoidal sobre P3 (heredado de 001).
    { id: 'osc', kind: 'oscillate', base: { x: 0, y: 3.0, z: -31 }, color: OBSTACLE, meshUrl: 'assets/obstacle-oscillate.glb' },
    // Péndulo que cruza P4 (arco que baja al nivel de la plataforma).
    { id: 'pendulum', kind: 'pendulum', base: { x: 0, y: 6.0, z: -40 }, color: PENDULUM, meshUrl: 'assets/obstacle-pendulum.glb' },
    // Plataforma PORTANTE horizontal (eje Z): puente móvil entre P5 y P6.
    { id: 'carry', kind: 'carry', base: { x: 0, y: 1.5, z: -50 }, color: CARRY, axis: 'z', halfExtents: { x: 2.5, y: 0.4, z: 2.5 }, meshUrl: 'assets/obstacle-carry.glb' },
    // Empujador alternante en P6 (carrera en Z) — malla del cañón (key art).
    { id: 'pusher', kind: 'pusher', base: { x: 0, y: 3.0, z: -58 }, color: PUSHER, meshUrl: 'assets/obstacle-pusher.glb', meshYaw: Math.PI / 2 },
  ],
  statics: [
    // P0 — plataforma de salida (ancha)
    { id: 'p0', kind: 'platform', center: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: 4, y: 0.5, z: 4 }, color: PLATFORM },
    // P1 — tras un hueco saltable
    { id: 'p1', kind: 'platform', center: { x: 0, y: -0.5, z: -11 }, halfExtents: { x: 3, y: 0.5, z: 3 }, color: PLATFORM },
    // Rampa de P1 (y=0) hacia P2 (y=2)
    { id: 'ramp', kind: 'ramp', center: { x: 0, y: 1.0, z: -16.5 }, halfExtents: { x: 3, y: 0.25, z: 3 }, rotationX: -0.38, color: RAMP },
    // P2 — plataforma media (muros laterales para slide; barra giratoria encima)
    { id: 'p2', kind: 'platform', center: { x: 0, y: 1.5, z: -22 }, halfExtents: { x: 3, y: 0.5, z: 3 }, color: PLATFORM },
    { id: 'wall-l', kind: 'wall', center: { x: -3.4, y: 2.6, z: -22 }, halfExtents: { x: 0.4, y: 1.2, z: 3 }, color: WALL },
    { id: 'wall-r', kind: 'wall', center: { x: 3.4, y: 2.6, z: -22 }, halfExtents: { x: 0.4, y: 1.2, z: 3 }, color: WALL },
    // P3 — plataforma ancha cruzada por el vaivén
    { id: 'p3', kind: 'platform', center: { x: 0, y: 1.5, z: -31 }, halfExtents: { x: 5, y: 0.5, z: 4 }, color: PLATFORM },
    // P4 — plataforma con el péndulo encima
    { id: 'p4', kind: 'platform', center: { x: 0, y: 1.5, z: -40 }, halfExtents: { x: 2.5, y: 0.5, z: 2.5 }, color: PLATFORM },
    // P5 — embarque a la plataforma portante
    { id: 'p5', kind: 'platform', center: { x: 0, y: 1.5, z: -44 }, halfExtents: { x: 2.5, y: 0.5, z: 2 }, color: PLATFORM },
    // P6 — plataforma con el empujador (tras bajar de la portante)
    { id: 'p6', kind: 'platform', center: { x: 0, y: 1.5, z: -58 }, halfExtents: { x: 3, y: 0.5, z: 3 }, color: PLATFORM },
    // P7 — plataforma de meta
    { id: 'p7', kind: 'platform', center: { x: 0, y: 1.5, z: -66 }, halfExtents: { x: 4, y: 0.5, z: 4 }, color: PLATFORM },
    // Atajo arriesgado: viga estrecha en x=+6 que evita portante+empujador (fácil caerse).
    { id: 'shortcut', kind: 'platform', center: { x: 6, y: 1.5, z: -53 }, halfExtents: { x: 0.8, y: 0.5, z: 11 }, color: RAMP },
  ],
  zones: [
    { kind: 'start', center: { x: 0, y: 0.6, z: 0 }, halfExtents: { x: 4, y: 0.6, z: 4 }, color: START },
    { kind: 'finish', center: { x: 0, y: 2.6, z: -66 }, halfExtents: { x: 4, y: 0.8, z: 4 }, color: FINISH, signageUrl: 'assets/sign-finish.png' },
  ],
  // VISUAL-ONLY (US2): dirección de arte de ./marketing (cartoon/pop). Rutas bajo public/assets/.
  // Reserva: si una textura no carga, scene.ts usa el color de paleta por tipo.
  theme: {
    palette: { sky: 0x7ec8f3, platform: 0x2fd4c4, ramp: 0xff7a1a, wall: 0x14233b, ink: 0x14233b },
    skyboxUrl: 'assets/sky.png',
    textures: { platform: 'assets/tex-platform.png', ramp: 'assets/tex-ramp.png', wall: 'assets/tex-wall.png' },
  },
}
