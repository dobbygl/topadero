// Puerta automática de la pausa (007, Principio II). La pausa se implementa FUERA de advance() y de
// src/sim: al reanudar se desplaza el ancla (pauseShift) por el tiempo pausado, así el hueco de pausa
// NO genera pasos. Aquí se comprueba que una corrida con una o varias pausas produce EXACTAMENTE los
// mismos sim-steps y estado final que la corrida sin pausas, para los mismos inputs (FR-013, SC-004).
// Incluye una pausa MÁS LARGA que MAX_SUBSTEPS·DT (donde una implementación rota correría pasos
// espurios por el clamp anti-espiral) y el caso de re-anclaje en intento nuevo (createLoopState).

import { beforeAll, describe, expect, it } from 'vitest'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { Simulation } from '../../src/sim/simulation'
import { advance, createLoopState, pauseShift, type FrameInput } from '../../src/core/gameLoop'
import { config } from '../../src/config'

const DT = config.FIXED_DT

beforeAll(async () => {
  await RAPIER.init()
})

function freshFrame(): FrameInput {
  return { moveAxis: { x: 0, y: 1 }, cameraYaw: 0, edges: [] } // avanzar de frente (input mantenido)
}

function readNums(sim: Simulation): number[] {
  const p = sim.getPlayerState()
  const r = sim.getRunState()
  return [p.position.x, p.position.y, p.position.z, p.verticalVelocity, r.elapsedSimTime]
}

/** Corrida continua de K pasos a 60 Hz. */
function runContinuous(steps: number): { sim: Simulation; stepIndex: number } {
  const sim = Simulation.create()
  const loop = createLoopState()
  const frame = freshFrame()
  for (let i = 0; i <= steps; i++) advance(sim, loop, i * DT, frame)
  return { sim, stepIndex: loop.stepIndex }
}

/**
 * Misma corrida pero con una pausa: al llegar a `pauseFrame` se "pausa" (deja de avanzar), pasa un
 * hueco de `gapSec` de reloj y al reanudar se aplica pauseShift(gapSec). El reloj posterior va
 * desplazado por el hueco (como en el juego real).
 */
function runPaused(steps: number, pauseFrame: number, gapSec: number): { sim: Simulation; stepIndex: number } {
  const sim = Simulation.create()
  const loop = createLoopState()
  const frame = freshFrame()
  for (let i = 0; i <= steps; i++) {
    if (i === pauseFrame + 1) pauseShift(loop, gapSec) // reanudar: absorber el hueco antes de avanzar
    const wall = i * DT + (i > pauseFrame ? gapSec : 0)
    advance(sim, loop, wall, frame)
  }
  return { sim, stepIndex: loop.stepIndex }
}

describe('Principio II — la pausa no altera la trayectoria', () => {
  it('una pausa larga (> MAX_SUBSTEPS·DT) reanudada == sin pausa (FR-013, SC-004)', () => {
    const STEPS = 120
    const gapSec = 2 // ≫ MAX_SUBSTEPS·DT (= 5/60 ≈ 0.083 s): dispara el clamp si falta el pauseShift
    expect(gapSec).toBeGreaterThan(config.MAX_SUBSTEPS * DT)

    const ref = runContinuous(STEPS)
    const paused = runPaused(STEPS, 60, gapSec)

    expect(paused.stepIndex, 'mismos pasos fijos ejecutados').toBe(ref.stepIndex)
    const a = readNums(ref.sim)
    const b = readNums(paused.sim)
    for (let k = 0; k < a.length; k++) {
      expect(Math.abs(a[k] - b[k]), `num[${k}] (sin pausa ${a[k]} vs pausa ${b[k]})`).toBeLessThanOrEqual(
        config.FLOAT_EPSILON,
      )
    }
  })

  it('varias pausas a lo largo de la corrida == sin pausa', () => {
    const STEPS = 150
    const ref = runContinuous(STEPS)
    // Tres pausas de distinta duración en distintos momentos, encadenadas en una sola corrida.
    const sim = Simulation.create()
    const loop = createLoopState()
    const frame = freshFrame()
    const pauses = new Map<number, number>([
      [30, 1.3],
      [70, 0.5],
      [110, 3.0],
    ])
    let accumGap = 0
    for (let i = 0; i <= STEPS; i++) {
      const gapHere = pauses.get(i - 1) // reanudar el fotograma siguiente al de pausa
      if (gapHere !== undefined) {
        pauseShift(loop, gapHere)
        accumGap += gapHere
      }
      advance(sim, loop, i * DT + accumGap, frame)
    }
    expect(loop.stepIndex).toBe(ref.stepIndex)
    const a = readNums(ref.sim)
    const b = readNums(sim)
    for (let k = 0; k < a.length; k++) {
      expect(Math.abs(a[k] - b[k]), `num[${k}]`).toBeLessThanOrEqual(config.FLOAT_EPSILON)
    }
  })

  it('intento nuevo: re-anclar con createLoopState() no corre pasos espurios tras un hueco largo', () => {
    const sim = Simulation.create()
    let loop = createLoopState()
    const frame = freshFrame()
    for (let i = 0; i <= 5; i++) advance(sim, loop, i * DT, frame) // 5 pasos
    const before = readNums(sim)

    // Re-anclaje (ruta de intento nuevo en el shell): un LoopState fresco. Aunque pase un hueco
    // grande, el primer advance tras re-anclar pone simStartWall=now y corre 0 pasos.
    loop = createLoopState()
    const bigGap = 3 // ≫ MAX_SUBSTEPS·DT
    advance(sim, loop, 5 * DT + bigGap, frame)

    expect(loop.stepIndex, 'sin pasos espurios al re-anclar').toBe(0)
    expect(readNums(sim), 'estado intacto: el re-anclaje no avanzó la simulación').toEqual(before)
  })
})
