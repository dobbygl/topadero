// 008 · US2 (T015). Blinda el gate de presupuestos: la función pura `evaluate` clasifica y marca los
// estados correctos y devuelve el código de salida adecuado. Sin tocar dist/ (items sintéticos).

import { describe, it, expect } from 'vitest'
// @ts-expect-error — script .mjs sin tipos; se importa la función pura para testearla.
import { evaluate, classify, globToRegExp } from '../../scripts/check-asset-budgets.mjs'

const manifest = {
  totalMaxBytes: 1_000_000,
  categories: [
    { id: 'texture-standalone', match: ['assets/sky.*', 'assets/tex-*.*'], maxBytesPerFile: 524288 },
    { id: 'mesh-obstacle-prop', match: ['assets/obstacle-*.glb'], maxBytesPerFile: 1048576, maxTrianglesPerMesh: 12000, maxEmbeddedImageBytes: 524288 },
    { id: 'audio', match: ['audio/*'], maxBytesPerFile: 786432 },
  ],
}

describe('globToRegExp / classify', () => {
  it('casa un * dentro de un segmento, no a través de /', () => {
    expect(globToRegExp('assets/obstacle-*.glb').test('assets/obstacle-carry.glb')).toBe(true)
    expect(globToRegExp('assets/obstacle-*.glb').test('assets/obstacle-carry.png')).toBe(false)
    expect(globToRegExp('audio/*').test('audio/music_gameplay.mp3')).toBe(true)
  })
  it('clasifica por categoría', () => {
    expect(classify('assets/sky.webp', manifest.categories)?.id).toBe('texture-standalone')
    expect(classify('assets/obstacle-carry.glb', manifest.categories)?.id).toBe('mesh-obstacle-prop')
    expect(classify('index.html', manifest.categories)).toBeNull()
  })
})

describe('evaluate', () => {
  it('todo dentro de presupuesto → exitCode 0', () => {
    const r = evaluate(
      [
        { path: 'assets/sky.webp', bytes: 30_000 },
        { path: 'assets/obstacle-carry.glb', bytes: 100_000, triangles: 716, embeddedImageBytes: [90_000] },
        { path: 'index.html', bytes: 8_000 },
      ],
      manifest,
    )
    expect(r.exitCode).toBe(0)
    expect(r.problems).toHaveLength(0)
  })

  it('límite inclusivo: exactamente el máximo está dentro', () => {
    const r = evaluate([{ path: 'assets/sky.webp', bytes: 524288 }], manifest)
    expect(r.exitCode).toBe(0)
  })

  it('detecta over-size, over-triangles y over-embedded-image', () => {
    const r = evaluate(
      [
        { path: 'assets/sky.webp', bytes: 600_000 }, // > 512 KB
        { path: 'assets/obstacle-carry.glb', bytes: 100_000, triangles: 20_000, embeddedImageBytes: [600_000] },
      ],
      manifest,
    )
    expect(r.exitCode).toBe(1)
    expect(r.problems.some((p: string) => p.startsWith('over-size'))).toBe(true)
    expect(r.problems.some((p: string) => p.startsWith('over-triangles'))).toBe(true)
    expect(r.problems.some((p: string) => p.startsWith('over-embedded-image'))).toBe(true)
  })

  it('un asset de juego sin categoría → unclassified (exit 1); el bundle .js bajo assets/ NO', () => {
    const r = evaluate(
      [
        { path: 'assets/misterioso.webp', bytes: 10 }, // game asset sin categoría → unclassified
        { path: 'assets/index-abc.js', bytes: 10 }, // bundle de Vite bajo assets/ → ok, solo cuenta al total
      ],
      manifest,
    )
    const unclassified = r.problems.filter((p: string) => p.startsWith('unclassified'))
    expect(unclassified).toHaveLength(1)
    expect(unclassified[0]).toContain('assets/misterioso.webp')
    expect(r.exitCode).toBe(1)
  })

  it('el total cuenta solo un formato por par de audio (mp3/ogg)', () => {
    // 2 pistas en mp3+ogg: el total debe sumar solo el mayor de cada par (600k + 500k), no los 4.
    const r = evaluate(
      [
        { path: 'audio/music.mp3', bytes: 600_000 },
        { path: 'audio/music.ogg', bytes: 500_000 },
        { path: 'audio/sfx.mp3', bytes: 8_000 },
        { path: 'audio/sfx.ogg', bytes: 10_000 },
      ],
      manifest,
    )
    // 600_000 (music máx) + 10_000 (sfx máx) = 610_000, dentro de 1_000_000 → ok
    expect(r.exitCode).toBe(0)
    expect(r.totalBytes).toBe(610_000)
  })

  it('supera el total → over-total (exit 1)', () => {
    const r = evaluate([{ path: 'assets/sky.webp', bytes: 30_000 }, { path: 'big.js', bytes: 2_000_000 }], manifest)
    expect(r.problems.some((p: string) => p.startsWith('over-total'))).toBe(true)
    expect(r.exitCode).toBe(1)
  })
})
