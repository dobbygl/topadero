// Unit del detector de eventos de audio (005 · T007). Función pura, sin DOM ni simulación.

import { describe, it, expect } from 'vitest'
import { detectAudioEvents, snapshotOf, type AudioSnapshot } from '../../src/audio/events'

const T = { jumpVy: 3, hitKnockback: 3, respawnDist: 5 }

function snap(o: Partial<AudioSnapshot>): AudioSnapshot {
  return { x: 0, y: 0, z: 0, isGrounded: true, vy: 0, knockback: 0, phase: 'running', ...o }
}

describe('audio (005): detección de eventos', () => {
  it('sin snapshot previo no emite nada', () => {
    expect(detectAudioEvents(null, snap({}), T)).toEqual([])
  })

  it('salto: dejar el suelo con vy alta', () => {
    expect(detectAudioEvents(snap({ isGrounded: true }), snap({ isGrounded: false, vy: 9 }), T)).toContain('jump')
  })

  it('caer de un borde (vy ~0) NO es salto', () => {
    expect(detectAudioEvents(snap({ isGrounded: true }), snap({ isGrounded: false, vy: 0 }), T)).not.toContain('jump')
  })

  it('aterrizaje: aire → suelo', () => {
    expect(detectAudioEvents(snap({ isGrounded: false }), snap({ isGrounded: true }), T)).toContain('land')
  })

  it('golpe: flanco de aparición de knockback', () => {
    expect(detectAudioEvents(snap({ knockback: 0 }), snap({ knockback: 8 }), T)).toContain('hit')
  })

  it('meta: running → won', () => {
    expect(detectAudioEvents(snap({ phase: 'running' }), snap({ phase: 'won' }), T)).toContain('finish')
  })

  it('reaparición: discontinuidad de posición, sin otros eventos ese fotograma', () => {
    const e = detectAudioEvents(snap({ y: -10, isGrounded: false }), snap({ y: 2, isGrounded: true }), T)
    expect(e).toEqual(['respawn'])
  })

  it('snapshotOf mapea el estado (knockback = |velocidad horizontal|)', () => {
    const s = snapshotOf(
      {
        position: { x: 1, y: 2, z: 3 },
        facingYaw: 0,
        velocity: { x: 3, y: 5, z: 4 },
        verticalVelocity: 5,
        horizontalVelocity: { x: 0, z: 0 },
        isGrounded: true,
      },
      { phase: 'running', elapsedSimTime: 0 },
    )
    expect(s.knockback).toBeCloseTo(5, 6) // hypot(3,4)
    expect(s.vy).toBe(5)
  })
})
