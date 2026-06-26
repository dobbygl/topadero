// Orquestación del circuito diario (006). Construcción de escena ANTES de jugar, FUERA del paso fijo
// (FR-006); `src/sim/` no importa este módulo. Resuelve: día (calendario UTC + chequeo de cordura
// contra la cadena) → baliza (caché-first del competitivo → proveedor principal → alternativa) →
// seed → generador → circuito. Degradación offline obligatoria (seed local de la fecha, no
// competitivo). Política de caché: competitivo INMUTABLE el día; offline REEMPLAZABLE al resolver
// competitivo. Habilitado por la constitución v2.2.0 (red de solo lectura).

import type { CircuitDefinition } from '../circuit'
import { config } from '../config'
import { generateCircuit } from '../circuitgen/generate'
import { structuralHash } from '../circuitgen/hash'
import { seedFromHash, localDateSeed, toHex } from '../circuitgen/seed'
import { esploraSource, selectAnchor, type BeaconAnchor, type BlockInfo, type BlockSource } from './beacon'
import { readJSON, writeJSON } from './storage'

export interface DailyProvenance extends BeaconAnchor {
  dayUTC: string
  source: string // host del proveedor o 'offline'
}

export interface DailyCircuit {
  dayUTC: string
  seedHex: string
  circuit: CircuitDefinition
  provenance: DailyProvenance | null // null en offline puro
  generatorVersion: string
  competitive: boolean
  structuralHash: string
}

export interface ResolveOptions {
  /** Inyección de fuentes para tests; por defecto, las de config.daily.providers. */
  sources?: BlockSource[]
  sourceNames?: string[]
}

const pad = (n: number): string => String(n).padStart(2, '0')
const utcDay = (sec: number): string => {
  const d = new Date(sec * 1000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
const midnightSec = (dayUTC: string): number => {
  const [y, m, dd] = dayUTC.split('-').map(Number)
  return Date.UTC(y, m - 1, dd, 0, 0, 0) / 1000
}
const dayKey = (dayUTC: string): string => config.daily.cacheKeyPrefix + dayUTC

function defaultSources(): { sources: BlockSource[]; names: string[] } {
  return {
    sources: config.daily.providers.map((u) => esploraSource(u)),
    names: config.daily.providers.map((u) => new URL(u).host),
  }
}

async function buildFromSeed(
  dayUTC: string,
  seed: Uint8Array,
  provenance: DailyProvenance | null,
  competitive: boolean,
): Promise<DailyCircuit> {
  const circuit = generateCircuit(seed, config.circuitgen)
  return {
    dayUTC,
    seedHex: toHex(seed),
    circuit,
    provenance,
    generatorVersion: config.circuitgen.generatorVersion,
    competitive,
    structuralHash: await structuralHash(circuit),
  }
}

/** ¿La caché de `dayUTC` es un competitivo válido con la versión actual? (caché-first, sin red). */
function cachedCompetitive(dayUTC: string): DailyCircuit | null {
  const c = readJSON<DailyCircuit>(dayKey(dayUTC))
  if (c && c.competitive && c.generatorVersion === config.circuitgen.generatorVersion) return c
  return null
}

/**
 * Resuelve el circuito del día. `nowMs` = reloj local (Date.now()); inyectable en tests.
 */
export async function resolveDailyCircuit(nowMs: number, opts: ResolveOptions = {}): Promise<DailyCircuit> {
  const localNowSec = Math.floor(nowMs / 1000)
  const localDay = utcDay(localNowSec)
  const tolSec = config.daily.clockSanityToleranceMs / 1000

  // 1) Caché-first del competitivo (sin red) para el día del reloj local.
  const hit = cachedCompetitive(localDay)
  if (hit) return hit

  // 2) Red: obtener la punta de algún proveedor (esto cruza el chequeo de cordura del reloj).
  const { sources, names } = opts.sources ? { sources: opts.sources, names: opts.sourceNames ?? opts.sources.map((_, i) => `src${i}`) } : defaultSources()
  let tip: BlockInfo | null = null
  for (const s of sources) {
    try {
      tip = await s.getTip()
      break
    } catch {
      /* probar siguiente proveedor */
    }
  }

  if (tip) {
    // Día = calendario local salvo que el reloj diverja groseramente de la cadena → preferir la cadena.
    const day = Math.abs(localNowSec - tip.timestamp) <= tolSec ? localDay : utcDay(tip.timestamp)
    if (day !== localDay) {
      const hit2 = cachedCompetitive(day)
      if (hit2) return hit2
    }
    const midnight = midnightSec(day)
    for (let i = 0; i < sources.length; i++) {
      try {
        const anchor = await selectAnchor(sources[i], midnight, config.daily.confirmations)
        if (anchor) {
          const seed = await seedFromHash(anchor.hash, config.circuitgen.varietySalt ?? '')
          const daily = await buildFromSeed(day, seed, { ...anchor, dayUTC: day, source: names[i] }, true)
          writeJSON(dayKey(day), daily) // competitivo: sobrescribe cualquier offline cacheado
          return daily
        }
      } catch {
        /* probar siguiente proveedor (cascada, FR-010) */
      }
    }
    // 3a) Hay red pero aún no hay ancla (ventana de medianoche / día futuro): offline-práctica.
    return offlineFor(day)
  }

  // 3b) Sin red: offline-práctica para el día del reloj local.
  return offlineFor(localDay)
}

/** Circuito offline (no competitivo) con seed local de la fecha; cacheado solo si no hay competitivo. */
async function offlineFor(dayUTC: string): Promise<DailyCircuit> {
  const existing = cachedCompetitive(dayUTC)
  if (existing) return existing // un competitivo previo manda (no se reemplaza por offline)
  const seed = await localDateSeed(dayUTC, config.circuitgen.varietySalt ?? '')
  const daily = await buildFromSeed(dayUTC, seed, null, false)
  // Offline es reemplazable: se cachea, pero un competitivo posterior lo sobrescribe.
  if (!readJSON<DailyCircuit>(dayKey(dayUTC))?.competitive) writeJSON(dayKey(dayUTC), daily)
  return daily
}

// --- Mejor marca local por día/circuito (US3, FR-015). Estrictamente local; degrada con elegancia. ---

export interface LocalDailyBest {
  dayUTC: string
  circuitId: string // structuralHash: ata la marca al circuito EXACTO
  bestTimeMs: number
  competitive: boolean // false si se logró en modo offline
}

const bestKey = (dayUTC: string): string => config.daily.bestMarkKeyPrefix + dayUTC

/** Mejor marca guardada para el circuito de ese día, o null si no hay o es de otro circuito. */
export function loadBest(dayUTC: string, circuitId: string): LocalDailyBest | null {
  const b = readJSON<LocalDailyBest>(bestKey(dayUTC))
  return b && b.circuitId === circuitId ? b : null
}

/** Registra un tiempo si mejora la marca del circuito de hoy; devuelve la mejor marca resultante. */
export function recordBest(daily: DailyCircuit, timeMs: number): LocalDailyBest {
  const prev = loadBest(daily.dayUTC, daily.structuralHash)
  const best: LocalDailyBest =
    prev && prev.bestTimeMs <= timeMs
      ? prev
      : { dayUTC: daily.dayUTC, circuitId: daily.structuralHash, bestTimeMs: timeMs, competitive: daily.competitive }
  if (!prev || best !== prev) writeJSON(bestKey(daily.dayUTC), best)
  return best
}

export { utcDay, midnightSec }
