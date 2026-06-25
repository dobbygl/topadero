// Adaptador táctil (004 · US1). Pointer Events, multi-touch por pointerId. Rellena el MISMO
// FrameInput que teclado y mando: joystick → moveAxis analógico (proporcional, FR-005); botón →
// flancos de salto con e.timeStamp (consumidos en el paso fijo, deterministas); zona derecha →
// cámara (tiempo de render). Solo atiende punteros 'touch'/'pen' para no interferir con el ratón
// (pointer lock). Conduce el overlay visual (TouchControls). NO importa src/sim.

import { config } from '../config'
import type { InputHooks } from './gamepad'
import type { TouchControls } from '../ui/touchControls'

export class TouchInput {
  private moveAxis = { x: 0, y: 0 }
  private joyId: number | null = null
  private joyCx = 0
  private joyCy = 0
  private camId: number | null = null
  private camLastX = 0
  private camLastY = 0
  private jumpId: number | null = null

  constructor(
    private readonly hooks: InputHooks,
    private readonly ui: TouchControls,
  ) {
    window.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
  }

  private isTouch(e: PointerEvent): boolean {
    return e.pointerType === 'touch' || e.pointerType === 'pen'
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.isTouch(e)) return
    this.hooks.mark('touch')
    // Botón de salto (prioridad sobre las zonas).
    if (this.jumpId === null && this.ui.hitJump(e.clientX, e.clientY)) {
      this.jumpId = e.pointerId
      this.ui.setJumpPressed(true)
      this.hooks.pushEdge({ kind: 'jump', timestamp: e.timeStamp / 1000 })
      return
    }
    // Mitad izquierda → joystick flotante (captura este puntero hasta soltar).
    if (this.joyId === null && e.clientX < window.innerWidth / 2) {
      this.joyId = e.pointerId
      this.joyCx = e.clientX
      this.joyCy = e.clientY
      this.ui.showJoystick(e.clientX, e.clientY)
      return
    }
    // Resto (mitad derecha) → arrastre de cámara.
    if (this.camId === null) {
      this.camId = e.pointerId
      this.camLastX = e.clientX
      this.camLastY = e.clientY
    }
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.isTouch(e)) return
    if (e.pointerId === this.joyId) {
      const radius = config.touchJoystickRadius
      let dx = e.clientX - this.joyCx
      let dy = e.clientY - this.joyCy
      const m = Math.hypot(dx, dy)
      if (m > radius) {
        dx = (dx / m) * radius
        dy = (dy / m) * radius
      }
      this.ui.moveKnob(dx, dy)
      // y de pantalla hacia abajo = +; adelante = arriba → invertir. Magnitud ya <= 1.
      this.moveAxis = { x: dx / radius, y: -dy / radius }
      this.hooks.mark('touch')
    } else if (e.pointerId === this.camId) {
      const dx = e.clientX - this.camLastX
      const dy = e.clientY - this.camLastY
      this.camLastX = e.clientX
      this.camLastY = e.clientY
      // Sin inversión aquí: la sensibilidad e inversión las aplica el agregador en applyLook (US2).
      this.hooks.applyLook(dx * config.touchLookSensitivity, dy * config.touchLookSensitivity)
      this.hooks.mark('touch')
    }
  }

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId === this.joyId) {
      this.joyId = null
      this.moveAxis = { x: 0, y: 0 }
      this.ui.hideJoystick()
    } else if (e.pointerId === this.camId) {
      this.camId = null
    } else if (e.pointerId === this.jumpId) {
      this.jumpId = null
      this.ui.setJumpPressed(false)
      this.hooks.pushEdge({ kind: 'jumpRelease', timestamp: e.timeStamp / 1000 })
    }
  }

  getMoveAxis(): { x: number; y: number } {
    return this.moveAxis
  }
}
