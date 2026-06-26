// T018 [US3] — Orquestación diaria: cascada de proveedores y degradación offline (FR-009/FR-010).
// Inyecta fuentes simuladas (sin red real). En Node no hay localStorage → el caché degrada a no-op,
// así que cada caso se evalúa aislado.

import { describe, it, expect } from 'vitest'
import { resolveDailyCircuit } from '../../src/daily/daily'
import type { BlockSource } from '../../src/daily/beacon'

const MIDNIGHT = Date.UTC(2026, 5, 26, 0, 0, 0) / 1000 // 00:00 UTC 2026-06-26
const NOW_MS = (MIDNIGHT + 2400) * 1000 // 00:40 UTC: dentro de la tolerancia de cordura del reloj

/** Fuente sana: cadena lineal con el ancla (último < medianoche) y 5 confirmaciones. */
function working(H0 = 800000, tipOffset = 5): BlockSource {
  const block = (h: number) => ({ height: h, hash: `hash-${h}`, timestamp: MIDNIGHT - 600 + (h - H0) * 600 })
  return { getTip: async () => block(H0 + tipOffset), getBlockAtHeight: async (h) => block(h) }
}
const broken: BlockSource = {
  getTip: async () => {
    throw new Error('proveedor caído')
  },
  getBlockAtHeight: async () => {
    throw new Error('proveedor caído')
  },
}

describe('orquestación diaria: cascada y offline', () => {
  it('proveedor principal caído → resuelve con la alternativa (competitivo)', async () => {
    const d = await resolveDailyCircuit(NOW_MS, { sources: [broken, working()], sourceNames: ['principal', 'alt'] })
    expect(d.competitive).toBe(true)
    expect(d.provenance?.source).toBe('alt')
    expect(d.circuit.statics.length).toBeGreaterThan(0)
  })

  it('sin red (todos los proveedores caídos) → circuito offline no competitivo y jugable', async () => {
    const d = await resolveDailyCircuit(NOW_MS, { sources: [broken, broken], sourceNames: ['principal', 'alt'] })
    expect(d.competitive).toBe(false)
    expect(d.provenance).toBeNull()
    expect(d.circuit.statics.length).toBeGreaterThan(0)
  })
})
