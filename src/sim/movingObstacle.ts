// Obstáculo móvil: trayectoria como función PURA del tiempo de simulación → determinista.
// Vaivén senoidal en el eje X alrededor de obstacleBase (research R5/R9).

import type { Vec3 } from '../types'
import type { Config } from '../config'

export function obstaclePosition(base: Vec3, simTime: number, config: Config): Vec3 {
  return {
    x: base.x + Math.sin(simTime * config.obstacleSpeed) * config.obstacleAmplitude,
    y: base.y,
    z: base.z,
  }
}

/** Derivada analítica de obstaclePosition (no numérica): velocidad exacta y determinista. */
export function obstacleVelocity(simTime: number, config: Config): Vec3 {
  return {
    x: Math.cos(simTime * config.obstacleSpeed) * config.obstacleAmplitude * config.obstacleSpeed,
    y: 0,
    z: 0,
  }
}
