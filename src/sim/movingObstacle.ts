// Trayectoria de los obstáculos como función PURA del tiempo de simulación → determinista.
// Despacho por tipo: pose(def, t) -> {position, quaternion} y velocity() (lineal + angular).
// Sin Three ni estado oculto (vale en el núcleo headless). Las magnitudes viven en config.ts.

import { quatFromAxisAngle, type Quat, type Vec3 } from '../types'
import type { Config } from '../config'
import type { ObstacleDef } from '../circuit'

export interface Pose {
  position: Vec3
  quaternion: Quat
}

export interface ObstacleVel {
  linear: Vec3
  /** Velocidad angular (rad/s) por eje; presente solo en obstáculos rotatorios. */
  angular?: Vec3
}

/** Pose (posición + orientación) del obstáculo en `simTime`. Pura y determinista. */
export function pose(def: ObstacleDef, simTime: number, config: Config): Pose {
  switch (def.kind) {
    case 'oscillate':
      // Vaivén senoidal en X alrededor de base; sin rotación.
      return {
        position: {
          x: def.base.x + Math.sin(simTime * config.obstacleSpeed) * config.obstacleAmplitude,
          y: def.base.y,
          z: def.base.z,
        },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      }
    case 'rotateBar': {
      // Brazo que gira alrededor de +Y; el centro (pivote) no se mueve, solo rota.
      const angle = simTime * config.rotateBar.angularSpeed
      return { position: { ...def.base }, quaternion: quatFromAxisAngle(0, 1, 0, angle) }
    }
    case 'pendulum': {
      // Vaivén angular alrededor de +X; el bob traza un arco bajo el pivote `base`.
      const p = config.pendulum
      const angle = p.amplitude * Math.sin(simTime * p.angularSpeed)
      return {
        position: {
          x: def.base.x,
          y: def.base.y - p.armLength * Math.cos(angle),
          z: def.base.z - p.armLength * Math.sin(angle),
        },
        quaternion: quatFromAxisAngle(1, 0, 0, angle),
      }
    }
    case 'pusher': {
      // Empujador alternante: traslación senoidal en Z alrededor de base.
      const p = config.pusher
      return {
        position: { x: def.base.x, y: def.base.y, z: def.base.z + Math.sin(simTime * p.speed) * p.stroke },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      }
    }
    case 'carry': {
      // Plataforma portante: traslación horizontal en el eje (SOLO x|z).
      const p = config.carry
      const off = Math.sin(simTime * p.speed) * p.amplitude
      return {
        position: {
          x: def.base.x + (def.axis === 'x' ? off : 0),
          y: def.base.y,
          z: def.base.z + (def.axis === 'z' ? off : 0),
        },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      }
    }
  }
}

/** Velocidad del obstáculo en `simTime` (derivada analítica). Pura y determinista. */
export function velocity(def: ObstacleDef, simTime: number, config: Config): ObstacleVel {
  switch (def.kind) {
    case 'oscillate':
      return {
        linear: {
          x: Math.cos(simTime * config.obstacleSpeed) * config.obstacleAmplitude * config.obstacleSpeed,
          y: 0,
          z: 0,
        },
      }
    case 'rotateBar':
      return { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: config.rotateBar.angularSpeed, z: 0 } }
    case 'pendulum': {
      const p = config.pendulum
      const angle = p.amplitude * Math.sin(simTime * p.angularSpeed)
      const angVel = p.amplitude * p.angularSpeed * Math.cos(simTime * p.angularSpeed)
      return {
        linear: {
          x: 0,
          y: p.armLength * Math.sin(angle) * angVel,
          z: -p.armLength * Math.cos(angle) * angVel,
        },
        angular: { x: angVel, y: 0, z: 0 },
      }
    }
    case 'pusher': {
      const p = config.pusher
      return { linear: { x: 0, y: 0, z: Math.cos(simTime * p.speed) * p.stroke * p.speed } }
    }
    case 'carry': {
      const p = config.carry
      const v = Math.cos(simTime * p.speed) * p.amplitude * p.speed
      return { linear: { x: def.axis === 'x' ? v : 0, y: 0, z: def.axis === 'z' ? v : 0 } }
    }
  }
}

/** Half-extents del collider primitivo por tipo (puro; lo usan sim y render). */
export function colliderHalfExtents(def: ObstacleDef, config: Config): Vec3 {
  switch (def.kind) {
    case 'oscillate':
      return config.obstacleHalfExtents
    case 'rotateBar':
      return config.rotateBar.halfExtents
    case 'pendulum':
      return config.pendulum.bobHalfExtents
    case 'pusher':
      return config.pusher.halfExtents
    case 'carry':
      return def.halfExtents
  }
}
