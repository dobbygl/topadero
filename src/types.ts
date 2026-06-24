// Tipos compartidos entre el núcleo de simulación (headless) y las vistas (render/HUD).

export type Vec3 = { x: number; y: number; z: number }

export type RunPhase = 'idle' | 'running' | 'won'

/** Entrada YA ventaneada para UN paso fijo (la construye el bucle). */
export interface StepInput {
  moveAxis: { x: number; y: number } // x = lateral (+derecha), y = avance (+adelante)
  cameraYaw: number // escalar crudo de la cámara; base del movimiento relativo
  jump: boolean // un flanco de salto cayó en la ventana de este paso
  restart: boolean // un flanco de reinicio cayó en la ventana de este paso
}

export interface PlayerStateView {
  position: Vec3
  facingYaw: number
  velocity: Vec3
  verticalVelocity: number
  isGrounded: boolean
}

export interface RunStateView {
  phase: RunPhase
  elapsedSimTime: number
}

export interface Transform {
  position: Vec3
  rotationY: number
}
