// Entrada del navegador: teclado (movimiento + flancos con timestamp) y ratón (pointer lock).
// Posee el yaw/pitch crudos de la cámara (base del movimiento relativo, research R4).
// Los timestamps de los flancos se pasan a SEGUNDOS (el bucle trabaja en segundos).

import { config } from '../config'
import type { FrameInput, InputEdge } from '../core/gameLoop'

export class Input {
  yaw = 0 // mirando a -Z (forward = (-sin yaw, 0, -cos yaw))
  pitch = 0.25
  private keys = new Set<string>()
  private edges: InputEdge[] = []
  private locked = false

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('pointerlockchange', this.onLockChange)
    document.addEventListener('mousemove', this.onMouseMove)
    target.addEventListener('click', this.requestLock)
  }

  requestLock = (): void => {
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
    this.yaw -= dx * config.mouseSensitivity
    this.pitch = Math.max(
      config.cameraPitchMin,
      Math.min(config.cameraPitchMax, this.pitch - dy * config.mouseSensitivity),
    )
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    this.keys.add(e.code)
    if (e.code === 'Space') this.edges.push({ kind: 'jump', timestamp: e.timeStamp / 1000 })
    else if (e.code === 'KeyR') this.edges.push({ kind: 'restart', timestamp: e.timeStamp / 1000 })
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
    // Flanco de SOLTADO del salto (US2): mismo tratamiento que el de pulsado; el corte del salto
    // variable se ventanea al sim-step de su timestamp → independiente de los FPS.
    if (e.code === 'Space') this.edges.push({ kind: 'jumpRelease', timestamp: e.timeStamp / 1000 })
  }

  getFrameInput(): FrameInput {
    const fwd = this.keys.has('KeyW') || this.keys.has('ArrowUp')
    const back = this.keys.has('KeyS') || this.keys.has('ArrowDown')
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft')
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight')
    return {
      moveAxis: { x: (right ? 1 : 0) - (left ? 1 : 0), y: (fwd ? 1 : 0) - (back ? 1 : 0) },
      cameraYaw: this.yaw,
      edges: this.edges,
    }
  }
}
