// Adaptador de baliza (006): red de SOLO LECTURA a una fuente pública Esplora (mempool.space /
// blockstream.info). Fuera del paso fijo; `src/sim/` NO importa este módulo. Sin envío de datos.
// La lógica de selección del ancla es pura sobre una `BlockSource` inyectable, para poder testearla
// sin red (T007). La regla: último bloque con timestamp < 00:00 UTC del día, con N confirmaciones.

export interface BlockInfo {
  height: number
  hash: string
  timestamp: number // segundos UTC
}

/** Fuente de bloques abstracta (la implementación HTTP o un mock en tests). */
export interface BlockSource {
  getTip(): Promise<BlockInfo>
  getBlockAtHeight(height: number): Promise<BlockInfo>
}

export interface BeaconAnchor {
  height: number
  hash: string
  timestamp: number
  confirmations: number
}

const AVG_BLOCK_SECONDS = 600

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

/** Fuente HTTP Esplora para una URL base (p. ej. https://mempool.space/api). */
export function esploraSource(baseUrl: string): BlockSource {
  const base = baseUrl.replace(/\/+$/, '')
  const blockByHash = async (hash: string): Promise<BlockInfo> => {
    const json = JSON.parse(await fetchText(`${base}/block/${hash}`)) as { height: number; id?: string; timestamp: number }
    return { height: json.height, hash: json.id ?? hash, timestamp: json.timestamp }
  }
  const hashAtHeight = (h: number): Promise<string> => fetchText(`${base}/block-height/${h}`).then((s) => s.trim())
  return {
    async getTip() {
      const height = Number((await fetchText(`${base}/blocks/tip/height`)).trim())
      return blockByHash(await hashAtHeight(height))
    },
    async getBlockAtHeight(height: number) {
      return blockByHash(await hashAtHeight(height))
    },
  }
}

/**
 * Selecciona el bloque ancla: el de mayor altura con `timestamp < midnightSec`, exigiendo
 * `tip.height - anchor.height >= confirmations`. Devuelve null si:
 *  - el día es futuro (la punta aún no llega a medianoche → SC-003: no precomputable), o
 *  - el ancla aún no tiene confirmaciones suficientes (ventana de medianoche).
 * Estima la altura cercana al borde y refina con pocas peticiones (el ancla está ~144 bloques atrás).
 */
export async function selectAnchor(
  src: BlockSource,
  midnightSec: number,
  confirmations: number,
): Promise<BeaconAnchor | null> {
  const tip = await src.getTip()
  // Día futuro: ni la punta ha llegado a medianoche → no hay ancla posible (no precomputable).
  if (tip.timestamp < midnightSec) return null

  // Estimación de la altura justo por debajo del borde de medianoche.
  let est = tip.height - Math.max(0, Math.floor((tip.timestamp - midnightSec) / AVG_BLOCK_SECONDS))
  if (est < 0) est = 0
  let block = est >= tip.height ? tip : await src.getBlockAtHeight(est)

  // Refinar: subir mientras estemos por debajo de medianoche; bajar mientras estemos por encima.
  let guard = 0
  while (block.timestamp >= midnightSec && block.height > 0 && guard++ < 64) {
    block = await src.getBlockAtHeight(block.height - 1)
  }
  while (block.height + 1 <= tip.height && guard++ < 128) {
    const next = await src.getBlockAtHeight(block.height + 1)
    if (next.timestamp >= midnightSec) break
    block = next
  }

  if (block.timestamp >= midnightSec) return null // no se encontró ningún bloque antes de medianoche
  const confs = tip.height - block.height
  if (confs < confirmations) return null // ventana de medianoche: aún no final
  return { height: block.height, hash: block.hash, timestamp: block.timestamp, confirmations: confs }
}
