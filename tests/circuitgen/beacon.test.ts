// T007 [US1] — Regla de selección del bloque ancla, con datos SIMULADOS (sin red real). Verifica:
// último bloque con timestamp < 00:00 UTC con 3 confirmaciones; día futuro → null (SC-003);
// ventana de medianoche (confirmaciones insuficientes) → null.

import { describe, it, expect } from 'vitest'
import { selectAnchor, type BlockInfo, type BlockSource } from '../../src/daily/beacon'

// Cadena sintética: el bloque h tiene timestamp = h*600 (10 min/bloque, monótona).
function chain(n: number): BlockInfo[] {
  return Array.from({ length: n }, (_, h) => ({ height: h, hash: `hash-${h}`, timestamp: h * 600 }))
}
function mockSource(blocks: BlockInfo[], tipHeight: number): BlockSource {
  return {
    getTip: async () => blocks[tipHeight],
    getBlockAtHeight: async (h) => blocks[h],
  }
}

const CONFIRMATIONS = 3

describe('baliza: selección del bloque ancla', () => {
  const blocks = chain(200)

  it('elige el último bloque con timestamp < medianoche, con >=3 confirmaciones', async () => {
    const midnight = 100 * 600 // == timestamp del bloque 100
    const anchor = await selectAnchor(mockSource(blocks, 110), midnight, CONFIRMATIONS)
    expect(anchor).not.toBeNull()
    expect(anchor!.height).toBe(99) // bloque 99 (ts 59400) es el último < 60000
    expect(anchor!.confirmations).toBe(11)
  })

  it('día futuro (la punta aún no llega a medianoche) → null (SC-003)', async () => {
    const midnight = 200 * 600 // muy por delante de la punta (height 110)
    const anchor = await selectAnchor(mockSource(blocks, 110), midnight, CONFIRMATIONS)
    expect(anchor).toBeNull()
  })

  it('ventana de medianoche: ancla con <3 confirmaciones → null', async () => {
    const midnight = 100 * 600
    const anchor = await selectAnchor(mockSource(blocks, 101), midnight, CONFIRMATIONS) // confs = 101-99 = 2
    expect(anchor).toBeNull()
  })
})
