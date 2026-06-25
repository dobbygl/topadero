// Tipos compartidos entre el núcleo de simulación (headless) y las vistas (render/HUD).

export type Vec3 = { x: number; y: number; z: number }

export type RunPhase = 'idle' | 'running' | 'won'

/** Tipo de obstáculo móvil; despacha su trayectoria pura (ver sim/movingObstacle.ts). */
export type ObstacleKind = 'oscillate' | 'rotateBar' | 'pendulum' | 'pusher' | 'carry'

/** Entrada YA ventaneada para UN paso fijo (la construye el bucle). */
export interface StepInput {
  moveAxis: { x: number; y: number } // x = lateral (+derecha), y = avance (+adelante)
  cameraYaw: number // escalar crudo de la cámara; base del movimiento relativo
  jump: boolean // un flanco de salto cayó en la ventana de este paso
  jumpRelease: boolean // un flanco de SOLTADO de salto cayó en la ventana de este paso (US2)
  restart: boolean // un flanco de reinicio cayó en la ventana de este paso
}

export interface PlayerStateView {
  position: Vec3
  facingYaw: number
  velocity: Vec3
  verticalVelocity: number
  horizontalVelocity: { x: number; z: number } // velocidad horizontal con rampa (US3; velX/velZ)
  isGrounded: boolean
}

export interface RunStateView {
  phase: RunPhase
  elapsedSimTime: number
}

export type Quat = { x: number; y: number; z: number; w: number }

/** Quaternion identidad. NO mutar; las funciones puras devuelven copias frescas. */
export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 }

/** Quaternion a partir de un eje unitario + ángulo (rad). Puro, sin Three (vale en sim/). */
export function quatFromAxisAngle(ax: number, ay: number, az: number, angle: number): Quat {
  const h = angle / 2
  const s = Math.sin(h)
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) }
}

/** Quaternion de rotación alrededor de +Y (rumbo del jugador). */
export function quatFromYaw(yaw: number): Quat {
  return quatFromAxisAngle(0, 1, 0, yaw)
}

export interface Transform {
  position: Vec3
  quaternion: Quat
}
