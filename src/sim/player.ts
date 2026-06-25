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
  velX: number // velocidad horizontal con rampa en X (US3; entrada, no empuje)
  velZ: number // velocidad horizontal con rampa en Z (US3)
  knockbackX: number
  knockbackZ: number
  isGrounded: boolean
  facingYaw: number
  timeSinceGrounded: number
  jumpBufferRemaining: number // s de buffer de salto vigente (US1; tiempo de sim, no fotogramas)
  jumpAscending: boolean // en la fase de ascenso de un salto propio (US2): gobierna corte y gravedad
  jumpHeld: boolean // el botón de salto sigue mantenido (derivado de flancos pulsar/soltar, US2)
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
    velX: 0,
    velZ: 0,
    knockbackX: 0,
    knockbackZ: 0,
    isGrounded: false,
    facingYaw: Math.PI, // mirando a -Z
    timeSinceGrounded: Infinity,
    jumpBufferRemaining: 0,
    jumpAscending: false,
    jumpHeld: false,
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
  const hasInput = mlen > 1e-6
  if (hasInput) {
    mx /= mlen
    mz /= mlen
    player.facingYaw = Math.atan2(mx, mz)
  }
  // Velocidad objetivo desde el input; la velocidad real se aproxima con rampa (US3, R5).
  // Intensidad proporcional (004 · FR-005): un stick/joystick a media deflexión avanza a media
  // velocidad. El teclado tiene magnitud >= 1, así que min(mlen,1)=1 → sin cambio (no regresión).
  const speedScale = Math.min(mlen, 1)
  const tgtX = hasInput ? mx * config.moveSpeed * speedScale : 0
  const tgtZ = hasInput ? mz * config.moveSpeed * speedScale : 0
  // Tasa de aproximación por estado: suelo accel/decel; aire control; aire sin input conserva
  // la velocidad (momento, no rígido). El empuje del obstáculo va aparte (no entra en la rampa).
  const rate = player.isGrounded ? (hasInput ? config.groundAccel : config.groundDecel) : hasInput ? config.airAccel : 0
  const dvx = tgtX - player.velX
  const dvz = tgtZ - player.velZ
  const dlen = Math.hypot(dvx, dvz)
  const maxStep = rate * dt
  if (dlen <= maxStep || dlen < 1e-9) {
    player.velX = tgtX
    player.velZ = tgtZ
  } else {
    player.velX += (dvx / dlen) * maxStep
    player.velZ += (dvz / dlen) * maxStep
  }

  // --- Salto: buffering (US1) + altura variable y soltado (US2); coyote; sin doble salto ---
  // El flanco de salto se RECUERDA en una ventana de tiempo de sim (jumpBufferTime): un flanco
  // recién llegado arma el buffer; en cuanto el personaje queda apoyado (o dentro de coyote) con
  // buffer vigente, salta. Una pulsación cuya ventana caduca antes de aterrizar no se ejecuta.
  if (input.jump) {
    player.jumpBufferRemaining = config.jumpBufferTime
    player.jumpHeld = true
  }
  const canJump = player.isGrounded || (player.timeSinceGrounded < config.coyoteTime && player.verticalVelocity <= 0)
  if (player.jumpBufferRemaining > 0 && canJump) {
    // Lanzar a la altura MÁXIMA (jumpSpeed); el soltado la recorta (orden: lanzar antes de cortar).
    player.verticalVelocity = config.jumpSpeed
    player.jumpAscending = true
    player.timeSinceGrounded = Infinity // impide re-salto hasta volver a tocar suelo
    player.jumpBufferRemaining = 0
    // R4: un salto bufferizado cuyo botón ya se soltó nace recortado al suelo mínimo.
    if (!player.jumpHeld) {
      player.verticalVelocity = Math.min(player.verticalVelocity, config.jumpReleaseVelocity)
      player.jumpAscending = false
    }
  } else if (player.jumpBufferRemaining > 0) {
    // envejecer el buffer (en tiempo de sim) si no se ha podido consumir este paso
    player.jumpBufferRemaining = Math.max(0, player.jumpBufferRemaining - dt)
  }
  // R3: soltar en pleno ascenso corta la subida al suelo mínimo (mismo sim-step que el flanco).
  if (input.jumpRelease) {
    player.jumpHeld = false
    if (player.jumpAscending && player.verticalVelocity > 0) {
      player.verticalVelocity = Math.min(player.verticalVelocity, config.jumpReleaseVelocity)
      player.jumpAscending = false
    }
  }

  // --- Gravedad asimétrica (US2, R6): más fuerte al caer; más fuerte al subir ya soltado ---
  let gMult = 1
  if (player.verticalVelocity < 0) gMult = config.fallGravityMult
  else if (player.verticalVelocity > 0 && !player.jumpAscending) gMult = config.lowJumpGravityMult
  player.verticalVelocity += config.gravity.y * gMult * dt
  // Pasado el ápice deja de ser ascenso (a partir de aquí cae con fallGravityMult).
  if (player.verticalVelocity <= 0) player.jumpAscending = false

  // Mientras sube, desactivar snap-to-ground para que no anule el impulso del salto (research R3)
  if (player.verticalVelocity > 0) {
    player.controller.disableSnapToGround()
  } else {
    player.controller.enableSnapToGround(config.snapToGroundDistance)
  }

  // --- Desplazamiento deseado = (input + empuje) horizontal + vertical + transporte portante ---
  // El carryDelta NO se multiplica por dt: ya es un desplazamiento en metros (pose(t+dt)-pose(t)).
  const desired = {
    x: (player.velX + player.knockbackX) * dt + carryDelta.x,
    y: player.verticalVelocity * dt,
    z: (player.velZ + player.knockbackZ) * dt + carryDelta.z,
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
  player.velX = 0
  player.velZ = 0
  player.knockbackX = 0
  player.knockbackZ = 0
  player.timeSinceGrounded = Infinity
  player.isGrounded = false
  player.jumpBufferRemaining = 0
  player.jumpAscending = false
}

export function readPlayerState(player: Player): PlayerStateView {
  const t = player.body.translation()
  return {
    position: { x: t.x, y: t.y, z: t.z },
    facingYaw: player.facingYaw,
    velocity: { x: player.knockbackX, y: player.verticalVelocity, z: player.knockbackZ },
    verticalVelocity: player.verticalVelocity,
    horizontalVelocity: { x: player.velX, z: player.velZ },
    isGrounded: player.isGrounded,
  }
}
