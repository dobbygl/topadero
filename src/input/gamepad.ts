// Adaptador de mando (004 · US1): polling de la Gamepad API. Rellena el MISMO FrameInput que el
// teclado, así que el determinismo se mantiene por construcción: los flancos de salto se sellan
// con el `now` del fotograma (mismo reloj que el bucle) y los consume el paso fijo por ventana de
// timestamp (research R1). El stick izquierdo da moveAxis analógico (intensidad proporcional,
// FR-005); el derecho mueve la cámara (tiempo de render, no toca la simulación).

import type { Config } from '../config'
import type { InputEdge } from '../core/gameLoop'
import type { Scheme } from './scheme'

export interface InputHooks {
  pushEdge: (e: InputEdge) => void
  applyLook: (dYaw: number, dPitch: number) => void
  mark: (s: Scheme) => void
}

/** Deadzone radial: por debajo de `dz` → 0; por encima se reescala [dz,1]→[0,1] (sin salto). */
function applyDeadzone(x: number, y: number, dz: number): { x: number; y: number } {
  const m = Math.hypot(x, y)
  if (m < dz || m < 1e-6) return { x: 0, y: 0 }
  const scaled = Math.min((m - dz) / (1 - dz), 1) / m
  return { x: x * scaled, y: y * scaled }
}

export class GamepadInput {
  private jumpDown = false
  private restartDown = false
  private moveAxis = { x: 0, y: 0 }
  private lastNow = 0

  constructor(
    private readonly config: Config,
    private readonly hooks: InputHooks,
  ) {}

  /** Llamar una vez por fotograma con el reloj en segundos. */
  poll(nowSec: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    let pad: Gamepad | null = null
    for (const p of pads) {
      if (p) {
        pad = p
        break
      }
    }
    const dt = this.lastNow > 0 ? nowSec - this.lastNow : 0
    this.lastNow = nowSec

    if (!pad) {
      // Sin mando: soltar entradas continuas (no dejar movimiento ni salto "pegados").
      this.moveAxis = { x: 0, y: 0 }
      this.jumpDown = false
      this.restartDown = false
      return
    }

    // Movimiento: stick izquierdo (axes 0,1). Adelante = -y (arriba del stick es -1).
    const mv = applyDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, this.config.gamepadDeadzone)
    this.moveAxis = { x: mv.x, y: -mv.y }
    const moving = mv.x !== 0 || mv.y !== 0

    // Cámara: stick derecho (axes 2,3), rate-based con dt de render.
    const look = applyDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, this.config.gamepadDeadzone)
    const looking = look.x !== 0 || look.y !== 0
    if (looking && dt > 0) {
      const inv = this.config.invertCameraY ? -1 : 1
      this.hooks.applyLook(
        look.x * this.config.gamepadLookSpeed * dt,
        inv * look.y * this.config.gamepadLookSpeed * dt,
      )
    }

    // Salto: flanco pulsar/soltar con timestamp del fotograma (mismo reloj que el bucle).
    const jump = pad.buttons[this.config.gamepadJumpButton]?.pressed ?? false
    if (jump && !this.jumpDown) this.hooks.pushEdge({ kind: 'jump', timestamp: nowSec })
    else if (!jump && this.jumpDown) this.hooks.pushEdge({ kind: 'jumpRelease', timestamp: nowSec })
    this.jumpDown = jump

    // Reinicio
    const restart = pad.buttons[this.config.gamepadRestartButton]?.pressed ?? false
    if (restart && !this.restartDown) this.hooks.pushEdge({ kind: 'restart', timestamp: nowSec })
    this.restartDown = restart

    if (moving || looking || jump || restart) this.hooks.mark('gamepad')
  }

  getMoveAxis(): { x: number; y: number } {
    return this.moveAxis
  }
}
