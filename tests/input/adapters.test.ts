// Tests unitarios del adaptador de entrada (004 · T012). Cubren piezas puras de la capa de entrada
// (deadzone, esquema activo, reasignación). El determinismo de la física vive en
// tests/determinism.test.ts; aquí solo se verifica la lógica del adaptador, sin DOM.

import { describe, it, expect } from 'vitest'
import { SchemeTracker } from '../../src/input/scheme'
import { applyDeadzone } from '../../src/input/gamepad'
import { rebindKey, edgeActionForKey } from '../../src/input/preferences'

describe('entrada (004): adaptadores', () => {
  it('deadzone radial: anula por debajo del umbral y reescala [dz,1]→[0,1]', () => {
    expect(applyDeadzone(0.1, 0, 0.2)).toEqual({ x: 0, y: 0 })
    const full = applyDeadzone(1, 0, 0.2)
    expect(Math.hypot(full.x, full.y)).toBeCloseTo(1, 6)
    const half = applyDeadzone(0.6, 0, 0.2) // (0.6 - 0.2) / (1 - 0.2) = 0.5
    expect(Math.hypot(half.x, half.y)).toBeCloseTo(0.5, 6)
  })

  it('SchemeTracker: arranca en teclado y sigue a la última fuente usada', () => {
    const s = new SchemeTracker()
    expect(s.active).toBe('keyboardMouse')
    s.mark('gamepad')
    expect(s.active).toBe('gamepad')
    s.mark('touch')
    expect(s.active).toBe('touch')
  })

  it('reasignación (US2): un control = una acción; la asignación previa se desasigna', () => {
    expect(edgeActionForKey('Space')).toBe('jump')
    rebindKey('jump', 'KeyJ')
    expect(edgeActionForKey('KeyJ')).toBe('jump')
    expect(edgeActionForKey('Space')).toBeNull()
    rebindKey('jump', 'Space') // restaurar el default para no contaminar otros tests
    expect(edgeActionForKey('Space')).toBe('jump')
  })
})
