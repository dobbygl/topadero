// Helper compartido de las escenas de sandbox: una plataforma plana de prueba con el jugador en el
// centro y una meta lejísimos (sin condición de victoria; el sandbox es para probar, no para ganar).

import type { CircuitDefinition, ObstacleDef } from '../circuit'

const THEME = { palette: { sky: 0x7ec8f3, platform: 0x2fd4c4, ramp: 0xff7a1a, wall: 0x14233b, ink: 0x14233b } }

/** Circuito de prueba: suelo plano (semilado `half`), spawn en el centro y meta inalcanzable. */
export function flatCircuit(obstacles: ObstacleDef[] = [], half = 8): CircuitDefinition {
  return {
    spawn: { x: 0, y: 1.0, z: 0 },
    statics: [
      { id: 'sandbox-floor', kind: 'platform', center: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: half, y: 0.5, z: half }, color: 0x2fd4c4 },
    ],
    obstacles,
    zones: [
      { kind: 'start', center: { x: 0, y: 0.6, z: 0 }, halfExtents: { x: half, y: 0.6, z: half }, color: 0x2e7d32 },
      { kind: 'finish', center: { x: 0, y: -500, z: 9999 }, halfExtents: { x: 1, y: 1, z: 1 }, color: 0xd4af37 },
    ],
    theme: THEME,
  }
}
