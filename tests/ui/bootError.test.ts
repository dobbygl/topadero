// 008 · US1 (T008, opcional). Test PURO del mapeo de la pantalla de error de arranque: cada tipo de
// fallo tiene texto claro y la acción correcta. No toca el DOM (no llama a showBootError), así que
// corre en el mismo entorno headless que el resto de tests.

import { describe, it, expect } from 'vitest'
import { BOOT_ERROR_CONTENT, type BootErrorKind } from '../../src/ui/bootError'

describe('BOOT_ERROR_CONTENT', () => {
  const kinds: BootErrorKind[] = ['no-webgl', 'wasm-init-failed', 'unknown']

  it('cubre los tres tipos de fallo catastrófico', () => {
    for (const k of kinds) expect(BOOT_ERROR_CONTENT[k]).toBeDefined()
  })

  it('cada tipo tiene título y detalle no vacíos (mensaje claro, FR-002/003/005)', () => {
    for (const k of kinds) {
      expect(BOOT_ERROR_CONTENT[k].title.length).toBeGreaterThan(0)
      expect(BOOT_ERROR_CONTENT[k].detail.length).toBeGreaterThan(0)
    }
  })

  it('asigna la acción adecuada: WASM y fallo desconocido ofrecen reintentar; sin WebGL solo informa', () => {
    expect(BOOT_ERROR_CONTENT['wasm-init-failed'].action).toBe('retry')
    expect(BOOT_ERROR_CONTENT['unknown'].action).toBe('retry')
    // Sin WebGL recargar no ayuda (falta soporte de hardware): informa cómo activarlo.
    expect(BOOT_ERROR_CONTENT['no-webgl'].action).toBe('info')
  })
})
