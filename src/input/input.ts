// Agregador de entrada (004). Posee el yaw/pitch crudos de la cámara y produce un único
// FrameInput, agnóstico de la fuente: teclado+ratón (keyboardMouse.ts), mando (gamepad.ts) y táctil
// (touch.ts) lo rellenan; el esquema activo (scheme.ts) decide qué moveAxis se usa. Los flancos van
// a un buffer compartido que el bucle consume por ventana de timestamp → deterministas (Principio
// II). La sensibilidad/inversión de cámara se aplican aquí (US2). NO importa src/sim.

import { config } from '../config'
import type { FrameInput, InputEdge } from '../core/gameLoop'
import { GamepadInput, type InputHooks } from './gamepad'
import { TouchInput } from './touch'
import { TouchControls } from '../ui/touchControls'
import { KeyboardMouseInput } from './keyboardMouse'
import { SchemeTracker } from './scheme'
import { inputPrefs } from './preferences'

export class Input {
  yaw = 0 // mirando a -Z (forward = (-sin yaw, 0, -cos yaw))
  pitch = 0.25
  private readonly edges: InputEdge[] = []
  private readonly scheme = new SchemeTracker()
  private readonly km: KeyboardMouseInput
  private readonly gamepad: GamepadInput
  private readonly touch: TouchInput
  private readonly touchControls: TouchControls

  constructor(target: HTMLElement) {
    const hooks: InputHooks = {
      pushEdge: (e) => this.edges.push(e),
      applyLook: (dYaw, dPitch) => this.applyLook(dYaw, dPitch),
      mark: (s) => this.scheme.mark(s),
    }
    this.km = new KeyboardMouseInput(target, hooks)
    this.gamepad = new GamepadInput(config, hooks)
    this.touchControls = new TouchControls()
    this.touch = new TouchInput(hooks, this.touchControls)
    target.addEventListener('click', this.requestLock)
  }

  // Pointer lock solo fuera del esquema táctil (con el dedo no se usa).
  requestLock = (): void => {
    if (this.scheme.active !== 'touch') this.km.lock()
  }

  /** Aplica un delta de cámara (ratón, stick o arrastre) con sensibilidad e inversión (US2). */
  private applyLook(dYaw: number, dPitch: number): void {
    const s = inputPrefs.cameraSensitivity
    const sx = inputPrefs.invertCameraX ? -1 : 1
    const sy = inputPrefs.invertCameraY ? -1 : 1
    this.yaw -= dYaw * s * sx
    this.pitch = Math.max(
      config.cameraPitchMin,
      Math.min(config.cameraPitchMax, this.pitch - dPitch * s * sy),
    )
  }

  getFrameInput(nowSec: number = performance.now() / 1000): FrameInput {
    this.gamepad.poll(nowSec)
    this.touchControls.setVisible(this.scheme.active === 'touch')
    const moveAxis =
      this.scheme.active === 'gamepad'
        ? this.gamepad.getMoveAxis()
        : this.scheme.active === 'touch'
          ? this.touch.getMoveAxis()
          : this.km.getMoveAxis()
    return {
      moveAxis,
      cameraYaw: this.yaw,
      edges: this.edges,
    }
  }
}
