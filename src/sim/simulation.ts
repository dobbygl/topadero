// Núcleo de simulación HEADLESS. No importa Three.js ni toca el DOM, así que es
// instanciable en Node y verificable por el test de determinismo (Principio II).
// Avanza con paso fijo; todo lo que afecta a la simulación ocurre en step().

import * as RAPIER from '@dimforge/rapier3d-compat'
import { circuit, type CircuitDefinition } from '../circuit'
import { config as defaultConfig, type Config } from '../config'
import type { PlayerStateView, RunStateView, StepInput, Transform, Vec3 } from '../types'
import { createPlayer, readPlayerState, respawnPlayer, stepPlayer, type Player } from './player'
import { obstaclePosition, obstacleVelocity } from './movingObstacle'
import { createRunState, readRunState, resetRunState, type RunState } from './runState'
import { inAABB } from './zones'

export class Simulation {
  private readonly world: RAPIER.World
  private readonly player: Player
  private readonly obstacleBody: RAPIER.RigidBody
  private readonly run: RunState
  private readonly config: Config
  private readonly circuit: CircuitDefinition
  private simTime = 0

  private prevPlayerPos: Vec3
  private prevPlayerYaw: number
  private prevObstaclePos: Vec3

  private constructor(config: Config) {
    this.config = config
    this.circuit = circuit

    this.world = new RAPIER.World(config.gravity)
    this.world.timestep = config.FIXED_DT

    // Colliders estáticos (plataformas, rampa, muros) desde la definición pura.
    for (const s of circuit.statics) {
      let desc = RAPIER.RigidBodyDesc.fixed().setTranslation(s.center.x, s.center.y, s.center.z)
      if (s.rotationX) {
        const h = s.rotationX / 2
        desc = desc.setRotation({ x: Math.sin(h), y: 0, z: 0, w: Math.cos(h) })
      }
      const body = this.world.createRigidBody(desc)
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(s.halfExtents.x, s.halfExtents.y, s.halfExtents.z),
        body,
      )
    }

    // Obstáculo móvil: cuerpo cinemático SÓLIDO (el KCC desliza contra él).
    const base = circuit.obstacleBase
    this.obstacleBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(base.x, base.y, base.z),
    )
    const he = config.obstacleHalfExtents
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z), this.obstacleBody)

    this.player = createPlayer(this.world, config, circuit.spawn)
    this.run = createRunState()

    this.prevPlayerPos = { ...circuit.spawn }
    this.prevPlayerYaw = this.player.facingYaw
    this.prevObstaclePos = { ...base }
  }

  static create(config: Config = defaultConfig): Simulation {
    return new Simulation(config)
  }

  /** Avanza EXACTAMENTE un paso fijo. */
  step(input: StepInput): void {
    this.capturePrev()

    if (input.restart) {
      this.reset()
      return
    }

    const dt = this.config.FIXED_DT
    const t = this.simTime

    // 1. Avanzar el obstáculo (se aplica en world.step()).
    const obNext = obstaclePosition(this.circuit.obstacleBase, t + dt, this.config)
    this.obstacleBody.setNextKinematicTranslation(obNext)

    // 2. Empuje: solape AABB del jugador con el obstáculo (pose actual) → velocidad de empuje.
    this.applyKnockbackIfContact(t)

    // 3-4. Mover al jugador (gravedad + input + empuje vía KCC) y leer apoyo.
    stepPlayer(this.player, input, this.config)

    // Aplicar las traslaciones cinemáticas (jugador y obstáculo) y refrescar el mundo.
    this.world.step()

    // 5. Estado del intento + zonas (con la pose ya avanzada).
    const p = this.player.body.translation()

    if (this.run.phase === 'idle') {
      const moving =
        Math.abs(input.moveAxis.x) > 1e-4 || Math.abs(input.moveAxis.y) > 1e-4 || input.jump
      if (moving) {
        this.run.phase = 'running'
        this.run.firstInputSeen = true
      }
    }
    if (this.run.phase === 'running') {
      this.run.elapsedSimTime += dt
      const f = this.finishZone()
      if (inAABB(p, f.center, f.halfExtents)) this.run.phase = 'won'
    }

    // Caída por debajo del umbral → respawn en la salida (el crono sigue, Q5).
    if (p.y < this.config.fallThreshold) {
      respawnPlayer(this.player, this.circuit.spawn)
    }

    this.simTime = t + dt
  }

  private applyKnockbackIfContact(t: number): void {
    const ob = this.obstacleBody.translation()
    const p = this.player.body.translation()
    const c = this.config
    const he = c.obstacleHalfExtents
    const rad = c.capsuleRadius
    const pred = c.contactPrediction
    const expanded: Vec3 = {
      x: he.x + rad + pred,
      y: he.y + c.capsuleHalfHeight + rad + pred,
      z: he.z + rad + pred,
    }
    if (!inAABB({ x: p.x, y: p.y, z: p.z }, { x: ob.x, y: ob.y, z: ob.z }, expanded)) return

    let dx = p.x - ob.x
    let dz = p.z - ob.z
    const len = Math.hypot(dx, dz)
    if (len < 1e-4) {
      const sign = obstacleVelocity(t, c).x
      dx = sign >= 0 ? 1 : -1
      dz = 0
    } else {
      dx /= len
      dz /= len
    }
    const obVel = obstacleVelocity(t, c)
    const mag = Math.min(c.knockbackStrength + Math.abs(obVel.x), c.knockbackMax)
    this.player.knockbackX = dx * mag
    this.player.knockbackZ = dz * mag
  }

  private reset(): void {
    this.simTime = 0
    resetRunState(this.run)
    respawnPlayer(this.player, this.circuit.spawn)
    const base = this.circuit.obstacleBase
    this.obstacleBody.setTranslation(obstaclePosition(base, 0, this.config), true)
    this.capturePrev()
  }

  private capturePrev(): void {
    const p = this.player.body.translation()
    this.prevPlayerPos = { x: p.x, y: p.y, z: p.z }
    this.prevPlayerYaw = this.player.facingYaw
    const o = this.obstacleBody.translation()
    this.prevObstaclePos = { x: o.x, y: o.y, z: o.z }
  }

  private finishZone() {
    const z = this.circuit.zones.find((q) => q.kind === 'finish')!
    return z
  }

  // --- Lecturas de solo lectura (para las vistas) ---
  getPlayerState(): PlayerStateView {
    return readPlayerState(this.player)
  }
  getRunState(): RunStateView {
    return readRunState(this.run)
  }
  getObstacleTransforms(): Transform[] {
    const o = this.obstacleBody.translation()
    return [{ position: { x: o.x, y: o.y, z: o.z }, rotationY: 0 }]
  }
  getPreviousPlayerTransform(): Transform {
    return { position: this.prevPlayerPos, rotationY: this.prevPlayerYaw }
  }
  getPreviousObstacleTransforms(): Transform[] {
    return [{ position: this.prevObstaclePos, rotationY: 0 }]
  }
  getCircuitDefinition(): CircuitDefinition {
    return this.circuit
  }
}
