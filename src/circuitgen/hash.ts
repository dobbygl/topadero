// Identidad verificable del circuito (006). PURO. `structuralHash` = SHA-256 de una serialización
// CANÓNICA (orden de claves estable) de la CircuitDefinition, así dos clientes obtienen el mismo hash
// para el mismo circuito (SC-001) y un tercero puede verificarlo (SC-005). Async (Web Crypto).

import { toHex } from './seed'

/** JSON con claves ordenadas de forma estable (los arrays conservan su orden). */
function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') + '}'
}

export async function structuralHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJSON(value)))
  return toHex(new Uint8Array(digest))
}

export { canonicalJSON }
