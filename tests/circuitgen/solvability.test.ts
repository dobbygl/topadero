// T006 [US1] — Solubilidad (SC-004): >=1000 seeds, 0 circuitos imposibles. El generador garantiza
// completabilidad por construcción (clamp del hueco al envoltorio de salto); este test lo verifica.

import { describe, it, expect } from 'vitest'
import { config } from '../../src/config'
import { seedFromHash } from '../../src/circuitgen/seed'
import { generateCircuit } from '../../src/circuitgen/generate'
import { jumpEnvelope, isSolvable } from '../../src/circuitgen/solvability'

describe('generador: solubilidad', () => {
  it('1000 seeds → 0 circuitos imposibles', async () => {
    const env = jumpEnvelope(config.circuitgen.envelope, config.circuitgen.reachMargin)
    let bad = 0
    for (let i = 0; i < 1000; i++) {
      const circuit = generateCircuit(await seedFromHash(`block-${i}`), config.circuitgen)
      if (!isSolvable(circuit, env)) bad++
    }
    expect(bad).toBe(0)
  })

  it('respeta el suelo de variedad/dificultad (segmentos y obstáculos mínimos)', async () => {
    const circuit = generateCircuit(await seedFromHash('block-variety'), config.circuitgen)
    const platforms = circuit.statics.filter((s) => s.kind === 'platform')
    expect(platforms.length).toBeGreaterThanOrEqual(config.circuitgen.segmentsRange.min)
    expect(circuit.obstacles.length).toBeGreaterThanOrEqual(config.circuitgen.minObstacles)
  })
})
