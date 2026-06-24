// Puerta automática del Principio II (NO NEGOCIABLE): el mismo input produce la misma
// trayectoria con independencia de la tasa de fotogramas. Se alimenta la MISMA línea de
// inputs (con timestamp) por fotograma sobre 4 cadencias (60 / jitter / 30 / 144 Hz) y se
// compara el estado a igual nº de pasos fijos con igualdad EXACTA (epsilon de redondeo).
// Como los flancos se consumen por la ventana de su timestamp, el salto cae en el mismo
// sim-step a cualquier FPS (research R7).

import { beforeAll, describe, expect, it } from 'vitest'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { Simulation } from '../src/sim/simulation'
import { advance, createLoopState, type FrameInput, type InputEdge } from '../src/core/gameLoop'
import { config } from '../src/config'
import { obstaclePosition, obstacleVelocity } from '../src/sim/movingObstacle'

const DT = config.FIXED_DT

beforeAll(async () => {
  await RAPIER.init()
})

// Cadencias de fotograma (segundos por fotograma). Ninguna supera MAX_SUBSTEPS.
const CADENCES: Record<string, number[]> = {
  '60hz': [1 / 60],
  jitter: [5 / 1000, 40 / 1000, 8 / 1000],
  '30hz': [1 / 30],
  '144hz': [1 / 144],
}

/** Línea de fotogramas que SIEMPRE termina exactamente en durationSec (mismo nº de pasos). */
function buildTimeline(frameDurations: number[], durationSec: number): number[] {
  const times = [0]
  let now = 0
  let i = 0
  // Acumula fotogramas estrictamente por debajo de durationSec...
  for (;;) {
    const next = now + frameDurations[i % frameDurations.length]
    if (next >= durationSec - 1e-12) break
    now = next
    times.push(now)
    i++
  }
  // ...y SIEMPRE termina exactamente en durationSec → mismo nº de pasos en toda cadencia.
  times.push(durationSec)
  return times
}

interface Scenario {
  moveAxis: { x: number; y: number }
  cameraYaw: number
  edges: InputEdge[]
  durationSec: number
}

function runScenario(scn: Scenario, frameDurations: number[]) {
  const sim = Simulation.create()
  const state = createLoopState()
  const frame: FrameInput = {
    moveAxis: scn.moveAxis,
    cameraYaw: scn.cameraYaw,
    edges: scn.edges.map((e) => ({ ...e })), // clon: advance() muta el buffer
  }
  for (const now of buildTimeline(frameDurations, scn.durationSec)) {
    advance(sim, state, now, frame)
  }
  const p = sim.getPlayerState()
  const r = sim.getRunState()
  const o = sim.getObstacleTransforms()[0]
  return {
    stepIndex: state.stepIndex,
    phase: r.phase,
    nums: [
      p.position.x, p.position.y, p.position.z,
      p.velocity.x, p.velocity.y, p.velocity.z,
      p.verticalVelocity, p.isGrounded ? 1 : 0,
      r.elapsedSimTime,
      o.position.x, o.position.y, o.position.z,
    ],
  }
}

function expectIdenticalAcrossCadences(scn: Scenario): void {
  const ref = runScenario(scn, CADENCES['60hz'])
  for (const name of Object.keys(CADENCES)) {
    const got = runScenario(scn, CADENCES[name])
    expect(got.stepIndex, `stepIndex @ ${name}`).toBe(ref.stepIndex)
    expect(got.phase, `phase @ ${name}`).toBe(ref.phase)
    for (let k = 0; k < ref.nums.length; k++) {
      expect(
        Math.abs(got.nums[k] - ref.nums[k]),
        `num[${k}] @ ${name} (got ${got.nums[k]} vs ref ${ref.nums[k]})`,
      ).toBeLessThanOrEqual(config.FLOAT_EPSILON)
    }
  }
}

describe('Principio II — determinismo / independencia de FPS', () => {
  it('US1: salto cerca de una frontera de subpaso → idéntico a 60/jitter/30/144 Hz', () => {
    // Flanco de salto situado a 0.3·DT dentro de la ventana del paso 30 (t ≈ 0.5 s).
    const jumpT = 0.5 + 0.3 * DT
    expectIdenticalAcrossCadences({
      moveAxis: { x: 0, y: 1 },
      cameraYaw: 0,
      edges: [{ kind: 'jump', timestamp: jumpT }],
      durationSec: 90 * DT,
    })
  })

  it('US1+US3: recorrido largo con varios saltos (y posibles caídas/respawn) → idéntico', () => {
    const edges: InputEdge[] = [0.4, 1.0, 1.6, 2.2, 2.8].map((t, i) => ({
      kind: 'jump',
      timestamp: t + 0.137 * DT * (i + 1),
    }))
    expectIdenticalAcrossCadences({
      moveAxis: { x: 0, y: 1 },
      cameraYaw: 0,
      edges,
      durationSec: 300 * DT,
    })
  })

  it('US3: caída lateral fuera del circuito → respawn idéntico entre cadencias', () => {
    // Strafe lateral hasta caerse de la plataforma de salida y reaparecer.
    expectIdenticalAcrossCadences({
      moveAxis: { x: 1, y: 0 },
      cameraYaw: 0,
      edges: [],
      durationSec: 180 * DT,
    })
  })

  it('US2: la trayectoria del obstáculo es función pura y su velocidad es la derivada analítica', () => {
    const base = { x: 0, y: 3, z: -31 }
    const h = 1e-5
    for (const t of [0, 0.1, 1.234, 5]) {
      // determinismo: misma entrada → misma salida
      expect(obstaclePosition(base, t, config)).toEqual(obstaclePosition(base, t, config))
      // la velocidad analítica coincide con la derivada numérica de la posición
      const numeric = (obstaclePosition(base, t + h, config).x - obstaclePosition(base, t - h, config).x) / (2 * h)
      expect(Math.abs(obstacleVelocity(t, config).x - numeric)).toBeLessThan(1e-3)
    }
  })
})
