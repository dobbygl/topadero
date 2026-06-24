// Personaje: cuerpo cinemático position-based + cápsula + KinematicCharacterController.
// La gravedad se integra a mano; el KCC hace el move-and-slide (no atravesar / deslizar).
// El empuje del obstáculo es una velocidad horizontal que decae y se consume POR el KCC
// (barrido swept), nunca un teletransporte (research R3/R5).

import * as RAPIER from '@dimforge/rapier3d-compat'
import type { Config } from '../config'
import type { Vec3, StepInput, PlayerStateView } from '../types'

export interface Player {
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  controller: RAPIER.KinematicCharacterController
  verticalVelocity: number
  knockbackX: number
  knockbackZ: number
  isGrounded: boolean
  facingYaw: number
  timeSinceGrounded: number
}

export function createPlayer(world: RAPIER.World, config: Config, spawn: Vec3): Player {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
  )
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(config.capsuleHalfHeight, config.capsuleRadius),
    body,
  )
  const controller = world.createCharacterController(config.kccOffset)
  controller.enableAutostep(config.autostepMaxHeight, config.autostepMinWidth, config.autostepIncludeDynamic)
  controller.setMaxSlopeClimbAngle(config.maxSlopeClimbAngleRad)
  controller.setMinSlopeSlideAngle(config.minSlopeSlideAngleRad)
  controller.enableSnapToGround(config.snapToGroundDistance)

  return {
    body,
    collider,
    controller,
    verticalVelocity: 0,
    knockbackX: 0,
    knockbackZ: 0,
    isGrounded: false,
    facingYaw: Math.PI, // mirando a -Z
    timeSinceGrounded: Infinity,
  }
}

/**
 * Avanza el jugador un paso fijo. Muta el estado del jugador y la pose del cuerpo.
 * `carryDelta` es el desplazamiento horizontal (ya en metros) que aporta una plataforma
 * portante bajo los pies (R-carry); lo calcula la simulación dentro del paso fijo.
 */
export function stepPlayer(
  player: Player,
  input: StepInput,
  config: Config,
  carryDelta: Vec3 = { x: 0, y: 0, z: 0 },
): void {
  const dt = config.FIXED_DT

  // --- Movimiento horizontal relativo al yaw crudo de la cámara (research R4) ---
  const yaw = input.cameraYaw
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  // forward = (-sin, 0, -cos); right = (cos, 0, -sin)
  let mx = input.moveAxis.y * -sin + input.moveAxis.x * cos
  let mz = input.moveAxis.y * -cos + input.moveAxis.x * -sin
  const mlen = Math.hypot(mx, mz)
  if (mlen > 1e-6) {
    mx /= mlen
    mz /= mlen
    player.facingYaw = Math.atan2(mx, mz)
  }
  const moveX = mx * config.moveSpeed
  const moveZ = mz * config.moveSpeed

  // --- Salto (solo apoyado o dentro de coyote time; sin doble salto) ---
  const canJump = player.isGrounded || (player.timeSinceGrounded < config.coyoteTime && player.verticalVelocity <= 0)
  if (input.jump && canJump) {
    player.verticalVelocity = config.jumpSpeed
    player.timeSinceGrounded = Infinity // impide re-salto hasta volver a tocar suelo
  }

  // --- Gravedad ---
  player.verticalVelocity += config.gravity.y * dt

  // Mientras sube, desactivar snap-to-ground para que no anule el impulso del salto (research R3)
  if (player.verticalVelocity > 0) {
    player.controller.disableSnapToGround()
  } else {
    player.controller.enableSnapToGround(config.snapToGroundDistance)
  }

  // --- Desplazamiento deseado = (input + empuje) horizontal + vertical + transporte portante ---
  // El carryDelta NO se multiplica por dt: ya es un desplazamiento en metros (pose(t+dt)-pose(t)).
  const desired = {
    x: (moveX + player.knockbackX) * dt + carryDelta.x,
    y: player.verticalVelocity * dt,
    z: (moveZ + player.knockbackZ) * dt + carryDelta.z,
  }

  // Move-and-slide del KCC: barrido contra la geometría (no atravesar / deslizar).
  // No se filtran sensores porque el mundo no tiene ninguno (las zonas son AABB de datos).
  player.controller.computeColliderMovement(player.collider, desired)
  const corrected = player.controller.computedMovement()
  const pos = player.body.translation()
  player.body.setNextKinematicTranslation({
    x: pos.x + corrected.x,
    y: pos.y + corrected.y,
    z: pos.z + corrected.z,
  })

  // --- Estado de apoyo ---
  const grounded = player.controller.computedGrounded()
  player.isGrounded = grounded
  if (grounded) {
    player.timeSinceGrounded = 0
    if (player.verticalVelocity < 0) player.verticalVelocity = 0
  } else {
    player.timeSinceGrounded += dt
  }

  // --- Decaimiento del empuje ---
  const decay = Math.exp(-config.knockbackDecay * dt)
  player.knockbackX *= decay
  player.knockbackZ *= decay
}

/** Respawn: teletransporte limpio (sin velocidad cinemática inferida) + reset de estado. */
export function respawnPlayer(player: Player, spawn: Vec3): void {
  player.body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true)
  player.verticalVelocity = 0
  player.knockbackX = 0
  player.knockbackZ = 0
  player.timeSinceGrounded = Infinity
  player.isGrounded = false
}

export function readPlayerState(player: Player): PlayerStateView {
  const t = player.body.translation()
  return {
    position: { x: t.x, y: t.y, z: t.z },
    facingYaw: player.facingYaw,
    velocity: { x: player.knockbackX, y: player.verticalVelocity, z: player.knockbackZ },
    verticalVelocity: player.verticalVelocity,
    isGrounded: player.isGrounded,
  }
}
