// T005 [US1] — Reproducibilidad del generador (SC-001/SC-002/SC-005). El generador es puro y
// determinista: mismo hash + versión → mismo structuralHash; hashes distintos → circuitos distintos.

import { describe, it, expect } from 'vitest'
import { config } from '../../src/config'
import { seedFromHash } from '../../src/circuitgen/seed'
import { generateCircuit } from '../../src/circuitgen/generate'
import { structuralHash } from '../../src/circuitgen/hash'

const HASH_A = '0000000000000000000209d3e8e5c3f3a1b2c4d5e6f70819283746556473829a'
const HASH_B = '00000000000000000004f1e2d3c4b5a6978869574635241302f1e0d9c8b7a6f5'

describe('generador: reproducibilidad', () => {
  it('mismo hash + versión → mismo structuralHash (SC-001/005)', async () => {
    const c1 = generateCircuit(await seedFromHash(HASH_A), config.circuitgen)
    const c2 = generateCircuit(await seedFromHash(HASH_A), config.circuitgen)
    expect(await structuralHash(c1)).toBe(await structuralHash(c2))
  })

  it('hashes distintos → circuitos distintos (SC-002)', async () => {
    const cA = generateCircuit(await seedFromHash(HASH_A), config.circuitgen)
    const cB = generateCircuit(await seedFromHash(HASH_B), config.circuitgen)
    expect(await structuralHash(cA)).not.toBe(await structuralHash(cB))
  })

  it('el circuito usa solo primitivas y el catálogo validado (FR-004)', async () => {
    const c = generateCircuit(await seedFromHash(HASH_A), config.circuitgen)
    for (const s of c.statics) expect(['platform', 'wall', 'ramp']).toContain(s.kind)
    for (const o of c.obstacles) expect(['oscillate', 'rotateBar', 'pendulum', 'pusher', 'carry']).toContain(o.kind)
  })

  it('vector de verificación: hash conocido + versión → structuralHash FIJO (SC-005)', async () => {
    // Golden vector: un tercero con este hash + generatorVersion DEBE reproducir exactamente este hash.
    // El snapshot lo fija vitest; si el generador cambia sin subir versión, este test lo caza.
    const c = generateCircuit(await seedFromHash(HASH_A), config.circuitgen)
    expect({ version: config.circuitgen.generatorVersion, structuralHash: await structuralHash(c) }).toMatchSnapshot()
  })
})
