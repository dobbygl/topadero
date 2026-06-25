// Esquema de entrada activo (004). Sigue a la última fuente usada (decidido en clarify): solo
// decide qué fuente alimenta el moveAxis del FrameInput y si se muestra el overlay táctil; NO
// cambia la forma del FrameInput ni toca la simulación.

export type Scheme = 'keyboardMouse' | 'gamepad' | 'touch'

/**
 * Esquema inicial según el dispositivo: en uno táctil-puro (puntero `coarse` y sin `fine`, lo que
 * reportan los móviles y el modo dispositivo de DevTools) arranca en `touch` para que el overlay
 * aparezca de entrada, sin esperar al primer toque. En escritorio (o híbrido con ratón) arranca en
 * `keyboardMouse`. Después, cualquier entrada cambia el esquema (sigue a la última fuente usada).
 */
function detectInitialScheme(): Scheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    if (coarse && !fine) return 'touch'
  }
  return 'keyboardMouse'
}

export class SchemeTracker {
  active: Scheme = detectInitialScheme()

  mark(s: Scheme): void {
    this.active = s
  }
}
