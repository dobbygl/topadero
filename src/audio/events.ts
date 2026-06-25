// Detección de eventos de audio (005). Función PURA: deriva los eventos (salto, aterrizaje, golpe,
// meta, reaparición) comparando dos snapshots de solo lectura del estado de la simulación. NO toca
// la simulación ni el paso fijo; el audio es una vista de render. Testeable en aislamiento.

import type { PlayerStateView, RunPhase, RunStateView } from '../types'

export type AudioEventKind = 'jump' | 'land' | 'hit' | 'finish' | 'respawn'

export interface AudioSnapshot {
  x: number
  y: number
  z: number
  isGrounded: boolean
  vy: number // velocidad vertical
  knockback: number // magnitud horizontal del empuje del obstáculo
  phase: RunPhase
}

export interface EventThresholds {
  jumpVy: number // vy mínima al dejar el suelo para considerarlo salto (no caída de borde)
  hitKnockback: number // magnitud de knockback para considerar "golpe"
  respawnDist: number // salto de posición en un fotograma que delata una reaparición
}

/** Snapshot ligero de solo lectura a partir de las vistas de estado de la simulación. */
export function snapshotOf(p: PlayerStateView, r: RunStateView): AudioSnapshot {
  return {
    x: p.position.x,
    y: p.position.y,
    z: p.position.z,
    isGrounded: p.isGrounded,
    vy: p.verticalVelocity,
    knockback: Math.hypot(p.velocity.x, p.velocity.z),
    phase: r.phase,
  }
}

/** Eventos disparados entre `prev` y `cur`. Con `prev` nulo (primer fotograma) no emite nada. */
export function detectAudioEvents(
  prev: AudioSnapshot | null,
  cur: AudioSnapshot,
  t: EventThresholds,
): AudioEventKind[] {
  if (!prev) return []
  // Reaparición: discontinuidad de posición (teletransporte). Ese fotograma no emite otros eventos
  // (evita un aterrizaje/salto espurio por el salto de posición).
  if (Math.hypot(cur.x - prev.x, cur.y - prev.y, cur.z - prev.z) > t.respawnDist) return ['respawn']

  const events: AudioEventKind[] = []
  if (prev.phase !== 'won' && cur.phase === 'won') events.push('finish')
  if (!prev.isGrounded && cur.isGrounded) events.push('land')
  if (prev.isGrounded && !cur.isGrounded && cur.vy > t.jumpVy) events.push('jump')
  if (prev.knockback < t.hitKnockback && cur.knockback >= t.hitKnockback) events.push('hit')
  return events
}
