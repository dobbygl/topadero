// Cámara orbital en tercera persona. Suavizado independiente del framerate
// (1 - exp(-k·dt_render)); SOLO afecta a posición/target (capa de render), nunca a la
// simulación: la base de movimiento se deriva del yaw crudo, no de esta cámara (research R4).

import * as THREE from 'three'
import { config } from '../config'
import type { Vec3 } from '../types'

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera
  private readonly pos = new THREE.Vector3()
  private readonly target = new THREE.Vector3()
  private initialized = false

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(config.cameraFov, aspect, config.cameraNear, config.cameraFar)
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update(playerPos: Vec3, yaw: number, pitch: number, dtRender: number): void {
    const tx = playerPos.x
    const ty = playerPos.y + config.cameraTargetOffsetY
    const tz = playerPos.z
    const cp = Math.cos(pitch)
    // detrás del jugador = +(sin yaw, _, cos yaw) (forward = (-sin, 0, -cos))
    const desiredX = tx + Math.sin(yaw) * cp * config.cameraDistance
    const desiredY = ty + config.cameraHeight + Math.sin(pitch) * config.cameraDistance
    const desiredZ = tz + Math.cos(yaw) * cp * config.cameraDistance

    if (!this.initialized) {
      this.pos.set(desiredX, desiredY, desiredZ)
      this.target.set(tx, ty, tz)
      this.initialized = true
    } else {
      const a = 1 - Math.exp(-config.cameraSmoothingK * dtRender)
      this.pos.x += (desiredX - this.pos.x) * a
      this.pos.y += (desiredY - this.pos.y) * a
      this.pos.z += (desiredZ - this.pos.z) * a
      this.target.x += (tx - this.target.x) * a
      this.target.y += (ty - this.target.y) * a
      this.target.z += (tz - this.target.z) * a
    }
    this.camera.position.copy(this.pos)
    this.camera.lookAt(this.target)
  }
}
