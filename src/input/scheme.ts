// Esquema de entrada activo (004). Sigue a la última fuente usada (decidido en clarify): solo
// decide qué fuente alimenta el moveAxis del FrameInput y si se muestra el overlay táctil; NO
// cambia la forma del FrameInput ni toca la simulación.

export type Scheme = 'keyboardMouse' | 'gamepad' | 'touch'

export class SchemeTracker {
  active: Scheme = 'keyboardMouse'

  mark(s: Scheme): void {
    this.active = s
  }
}
