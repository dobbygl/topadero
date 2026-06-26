// Blanqueo hash→seed para la generación del circuito diario (006). PURO.
// El hash de un bloque de Bitcoin NO es uniforme en sus bits altos (la prueba de trabajo fuerza ceros
// a la izquierda); pasarlo por SHA-256 lo blanquea a 32 bytes uniformes, evitando sesgos. SHA-256 vía
// Web Crypto es determinista e idéntico en navegador y Node 22 (FR-003, SC-005). Async.

const enc = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

/**
 * Seed uniforme (32 bytes) a partir del hash de bloque. Se hashea la cadena hex en minúsculas
 * (canónica, sin paso de decodificación) precedida por `varietySalt`, de modo que cualquiera reproduce
 * el mismo seed con el mismo hash + versión.
 */
export async function seedFromHash(blockHash: string, varietySalt = ''): Promise<Uint8Array> {
  const input = enc.encode(varietySalt + blockHash.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', input)
  return new Uint8Array(digest)
}

/**
 * Seed para el modo OFFLINE (no competitivo): derivado de la fecha UTC local, NO de la cadena. Mismo
 * pipeline que el competitivo pero etiquetado aparte. Prefijo distinto para que jamás colisione con un
 * seed de baliza real.
 */
export async function localDateSeed(dayUTC: string, varietySalt = ''): Promise<Uint8Array> {
  const input = enc.encode(`offline:${varietySalt}:${dayUTC}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return new Uint8Array(digest)
}

export { toHex }
