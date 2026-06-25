// Adaptador de teclado + ratón (004). Extraído del agregador (T003): rellena el mismo FrameInput
// que mando y táctil. Posee las teclas pulsadas y el pointer lock del ratón; el yaw/pitch lo posee
// el agregador (este adaptador solo le pasa deltas vía applyLook). Bindings reasignables (US2).

import { config } from '../config'
import type { InputHooks } from './gamepad'
import { inputPrefs, edgeActionForKey } from './preferences'

export class KeyboardMouseInput {
  private readonly keys = new Set<string>()
  private locked = false

  constructor(
    private readonly target: HTMLElement,
    private readonly hooks: InputHooks,
  ) {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('pointerlockchange', this.onLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
  }

  /** Pide pointer lock. Lo invoca el agregador, que decide según el esquema activo. */
  lock(): void {
    if (!this.locked) void this.target.requestPointerLock()
  }

  private onLockChange = (): void => {
    this.locked = document.pointerLockElement === this.target
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return
    const clamp = config.mouseDeltaClamp
    const dx = Math.max(-clamp, Math.min(clamp, e.movementX))
    const dy = Math.max(-clamp, Math.min(clamp, e.movementY))
    this.hooks.applyLook(dx * config.mouseSensitivity, dy * config.mouseSensitivity)
    this.hooks.mark('keyboardMouse')
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    this.keys.add(e.code)
    const action = edgeActionForKey(e.code) // jump/restart según los bindings reasignables (US2)
    if (action) this.hooks.pushEdge({ kind: action, timestamp: e.timeStamp / 1000 })
    this.hooks.mark('keyboardMouse')
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
    // Flanco de SOLTADO del salto: se ventanea al sim-step de su timestamp (independiente de FPS).
    if (inputPrefs.keys.jump.includes(e.code)) {
      this.hooks.pushEdge({ kind: 'jumpRelease', timestamp: e.timeStamp / 1000 })
    }
  }

  private onBlur = (): void => {
    this.keys.clear() // edge case pérdida de foco: evita teclas pegadas al cambiar de pestaña
  }

  getMoveAxis(): { x: number; y: number } {
    const down = (codes: string[]): boolean => codes.some((c) => this.keys.has(c))
    const fwd = down(inputPrefs.keys.forward)
    const back = down(inputPrefs.keys.back)
    const left = down(inputPrefs.keys.left)
    const right = down(inputPrefs.keys.right)
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (fwd ? 1 : 0) - (back ? 1 : 0) }
  }
}
