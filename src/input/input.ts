// Agregador de entrada (004). Posee el yaw/pitch crudos de la cámara y produce un único
// FrameInput, agnóstico de la fuente: teclado+ratón (inline), mando (gamepad.ts) y táctil
// (touch.ts) lo rellenan; el esquema activo (scheme.ts) decide qué moveAxis se usa. Los flancos
// van a un buffer compartido que el bucle consume por ventana de timestamp → deterministas
// (Principio II). NO importa src/sim ni la capa de render/física.

import { config } from '../config'
import type { FrameInput, InputEdge } from '../core/gameLoop'
import { GamepadInput, type InputHooks } from './gamepad'
import { TouchInput } from './touch'
import { TouchControls } from '../ui/touchControls'
import { SchemeTracker } from './scheme'

export class Input {
  yaw = 0 // mirando a -Z (forward = (-sin yaw, 0, -cos yaw))
  pitch = 0.25
  private keys = new Set<string>()
  private edges: InputEdge[] = []
  private locked = false
  private readonly scheme = new SchemeTracker()
  private readonly gamepad: GamepadInput
  private readonly touch: TouchInput
  private readonly touchControls: TouchControls

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('pointerlockchange', this.onLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    target.addEventListener('click', this.requestLock)
    window.addEventListener('blur', this.onBlur)

    const hooks: InputHooks = {
      pushEdge: (e) => this.edges.push(e),
      applyLook: (dYaw, dPitch) => this.applyLook(dYaw, dPitch),
      mark: (s) => this.scheme.mark(s),
    }
    this.gamepad = new GamepadInput(config, hooks)
    this.touchControls = new TouchControls()
    this.touch = new TouchInput(hooks, this.touchControls)
  }

  requestLock = (): void => {
    // En táctil no se usa pointer lock (el ratón sí); evita pedirlo cuando se juega con el dedo.
    if (!this.locked && this.scheme.active !== 'touch') void this.target.requestPointerLock()
  }

  /** Aplica un delta de orientación de cámara (ratón, stick del mando o arrastre táctil). */
  private applyLook(dYaw: number, dPitch: number): void {
    this.yaw -= dYaw
    this.pitch = Math.max(config.cameraPitchMin, Math.min(config.cameraPitchMax, this.pitch - dPitch))
  }

  private onLockChange = (): void => {
    this.locked = document.pointerLockElement === this.target
  }

  private onBlur = (): void => {
    // Edge case "pérdida de foco": evita teclas pegadas al cambiar de pestaña con una tecla pulsada.
    this.keys.clear()
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return
    const clamp = config.mouseDeltaClamp
    const dx = Math.max(-clamp, Math.min(clamp, e.movementX))
    const dy = Math.max(-clamp, Math.min(clamp, e.movementY))
    this.applyLook(dx * config.mouseSensitivity, dy * config.mouseSensitivity)
    this.scheme.mark('keyboardMouse')
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    this.keys.add(e.code)
    if (e.code === 'Space') this.edges.push({ kind: 'jump', timestamp: e.timeStamp / 1000 })
    else if (e.code === 'KeyR') this.edges.push({ kind: 'restart', timestamp: e.timeStamp / 1000 })
    this.scheme.mark('keyboardMouse')
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
    // Flanco de SOLTADO del salto (US2): mismo tratamiento que el de pulsado; el corte del salto
    // variable se ventanea al sim-step de su timestamp → independiente de los FPS.
    if (e.code === 'Space') this.edges.push({ kind: 'jumpRelease', timestamp: e.timeStamp / 1000 })
  }

  private keyboardMoveAxis(): { x: number; y: number } {
    const fwd = this.keys.has('KeyW') || this.keys.has('ArrowUp')
    const back = this.keys.has('KeyS') || this.keys.has('ArrowDown')
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft')
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight')
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (fwd ? 1 : 0) - (back ? 1 : 0) }
  }

  getFrameInput(nowSec: number = performance.now() / 1000): FrameInput {
    this.gamepad.poll(nowSec)
    this.touchControls.setVisible(this.scheme.active === 'touch')
    const moveAxis =
      this.scheme.active === 'gamepad'
        ? this.gamepad.getMoveAxis()
        : this.scheme.active === 'touch'
          ? this.touch.getMoveAxis()
          : this.keyboardMoveAxis()
    return {
      moveAxis,
      cameraYaw: this.yaw,
      edges: this.edges,
    }
  }
}
