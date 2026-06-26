// [US1] Smoke test de integración: un circuito GENERADO se instancia en una Simulation real y se
// avanza sin NaN ni caída instantánea. Valida lo que los tests del generador puro NO tocan: spawn
// sobre la plataforma de salida, offsets `base.y` de los obstáculos y colocación de la meta.
// No es la puerta de FR-007 (esa es la prueba de juego manual, T026); es un suelo de cordura.

import { beforeAll, describe, it, expect } from 'vitest'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { config } from '../../src/config'
import { Simulation } from '../../src/sim/simulation'
import { advance, createLoopState, type FrameInput } from '../../src/core/gameLoop'
import { seedFromHash } from '../../src/circuitgen/seed'
import { generateCircuit } from '../../src/circuitgen/generate'

const DT = config.FIXED_DT
const STILL: FrameInput = { moveAxis: { x: 0, y: 0 }, cameraYaw: 0, edges: [] }

beforeAll(async () => {
  await RAPIER.init()
})

describe('circuito generado: carga y simula sin romperse', () => {
  it('quieto sobre la salida 300 pasos → posición finita y sin caer por el umbral', async () => {
    const circuit = generateCircuit(await seedFromHash('block-smoke-1'), config.circuitgen)
    const sim = Simulation.create(config, circuit)
    const loop = createLoopState()
    for (let i = 1; i <= 300; i++) advance(sim, loop, i * DT, STILL)
    const p = sim.getPlayerState().position
    expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true)
    expect(p.y).toBeGreaterThan(config.fallThreshold) // no se cae a través de la plataforma de salida
  })

  it('varios seeds se instancian y avanzan sin NaN', async () => {
    for (const tag of ['a', 'b', 'c', 'd', 'e']) {
      const circuit = generateCircuit(await seedFromHash(`block-smoke-${tag}`), config.circuitgen)
      const sim = Simulation.create(config, circuit)
      const loop = createLoopState()
      for (let i = 1; i <= 120; i++) advance(sim, loop, i * DT, STILL)
      const p = sim.getPlayerState().position
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true)
      expect(p.y).toBeGreaterThan(config.fallThreshold)
    }
  })
})
