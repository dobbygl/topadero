// PRNG determinista (sfc32) para la generación del circuito diario (006). PURO y headless.
// Aritmética entera de 32 bits (`>>> 0`, `Math.imul` no hace falta en sfc32) → IDÉNTICA entre motores
// JS (navegador y Node), requisito de FR-003 / SC-001. PROHIBIDO `Math.random` y `Date` aquí: romperían
// el determinismo. El estado se siembra con 4×uint32 del seed blanqueado (ver seed.ts).

export interface Prng {
  /** Siguiente entero sin signo de 32 bits. */
  nextU32(): number
  /** Entero en [minInclusive, maxExclusive) sin sesgo de módulo (rechazo). */
  intRange(minInclusive: number, maxExclusive: number): number
  /** Elemento del array (uniforme). */
  pick<T>(items: readonly T[]): T
  /** true con probabilidad num/den. */
  chance(num: number, den: number): boolean
}

/** Crea un PRNG sfc32 a partir de los primeros 16 bytes del seed (4 palabras de 32 bits, big-endian). */
export function createPrng(seed: Uint8Array): Prng {
  if (seed.length < 16) throw new Error('createPrng: el seed necesita al menos 16 bytes')
  const dv = new DataView(seed.buffer, seed.byteOffset, seed.byteLength)
  let a = dv.getUint32(0) >>> 0
  let b = dv.getUint32(4) >>> 0
  let c = dv.getUint32(8) >>> 0
  let d = dv.getUint32(12) >>> 0

  const nextU32 = (): number => {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = ((c << 21) | (c >>> 11)) >>> 0
    c = (c + t) | 0
    return t >>> 0
  }

  // Calentamiento: descarta los primeros valores para mezclar el estado (práctica habitual en sfc32).
  for (let i = 0; i < 16; i++) nextU32()

  const intRange = (minInclusive: number, maxExclusive: number): number => {
    const range = maxExclusive - minInclusive
    if (range <= 1) return minInclusive
    // Rechazo para eliminar el sesgo de módulo: descarta el "sobrante" por encima del múltiplo de range.
    const limit = Math.floor(0x100000000 / range) * range
    let x = nextU32()
    while (x >= limit) x = nextU32()
    return minInclusive + (x % range)
  }

  const pick = <T>(items: readonly T[]): T => items[intRange(0, items.length)]
  const chance = (num: number, den: number): boolean => intRange(0, den) < num

  return { nextU32, intRange, pick, chance }
}
