// Núcleo de simulación HEADLESS. No importa Three.js ni toca el DOM, así que es
// instanciable en Node y verificable por el test de determinismo (Principio II).
// Avanza con paso fijo; todo lo que afecta a la simulación ocurre en step().

import * as RAPIER from '@dimforge/rapier3d-compat'
import { circuit, type CircuitDefinition, type ObstacleDef } from '../circuit'
import { config as defaultConfig, type Config } from '../config'
import { quatFromYaw, type PlayerStateView, type RunStateView, type StepInput, type Transform, type Vec3 } from '../types'
import { createPlayer, readPlayerState, respawnPlayer, stepPlayer, type Player } from './player'
import { pose, velocity, colliderHalfExtents, type Pose } from './movingObstacle'
import { createRunState, readRunState, resetRunState, type RunState } from './runState'
import { createCannonState, resetCannonState, stepCannon, type CannonState } from './cannon'
import { inAABB } from './zones'

export class Simulation {
  private readonly world: RAPIER.World
  private readonly player: Player
  private readonly obstacles: { body: RAPIER.RigidBody; def: ObstacleDef }[]
  private readonly run: RunState
  private readonly cannons: CannonState[] // prototipo reactivo; vacío en el circuito real
  private readonly config: Config
  private readonly circuit: CircuitDefinition
  private simTime = 0

  private prevPlayerPos: Vec3
  private prevObstaclePoses: Pose[]

  private constructor(config: Config, circuitDef: CircuitDefinition) {
    this.config = config
    this.circuit = circuitDef

    this.world = new RAPIER.World(config.gravity)
    this.world.timestep = config.FIXED_DT

    // Colliders estáticos (plataformas, rampa, muros) desde la definición pura.
    for (const s of circuitDef.statics) {
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

    // Obstáculos móviles: cuerpos cinemáticos SÓLIDOS (el KCC desliza contra ellos).
    // El collider primitivo se dimensiona por tipo (colliderHalfExtents).
    this.obstacles = circuitDef.obstacles.map((def) => {
      const p = pose(def, 0, config)
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(p.position.x, p.position.y, p.position.z)
          .setRotation(p.quaternion),
      )
      const he = colliderHalfExtents(def, config)
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z), body)
      return { body, def }
    })

    this.player = createPlayer(this.world, config, circuitDef.spawn)
    this.run = createRunState()
    this.cannons = (circuitDef.cannons ?? []).map(createCannonState)

    this.prevPlayerPos = { ...circuitDef.spawn }
    this.prevObstaclePoses = this.snapshotObstaclePoses()
  }

  /** `circuitDef` permite inyectar circuitos mínimos aislados en los tests (seam de test). */
  static create(config: Config = defaultConfig, circuitDef: CircuitDefinition = circuit): Simulation {
    return new Simulation(config, circuitDef)
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

    // 1. Avanzar cada obstáculo (se aplica en world.step()): posición + rotación cinemáticas.
    for (const { body, def } of this.obstacles) {
      const p = pose(def, t + dt, this.config)
      body.setNextKinematicTranslation(p.position)
      body.setNextKinematicRotation(p.quaternion)
    }

    // 2. Empuje: solape AABB del jugador con cada obstáculo (pose actual) → velocidad de empuje.
    this.applyKnockbackIfContact(t)

    // 2b. Cañones (prototipo): apuntan al jugador y disparan; el impacto del proyectil aplica
    // knockback (determinista, dentro del paso fijo). Vacío en el circuito real → no-op.
    if (this.cannons.length > 0) {
      const pt = this.player.body.translation()
      const pc: Vec3 = { x: pt.x, y: pt.y, z: pt.z }
      for (const cs of this.cannons) {
        const hit = stepCannon(cs, pc, dt, this.config)
        if (hit) {
          const mag = Math.min(this.config.cannon.knockbackStrength, this.config.knockbackMax)
          this.player.knockbackX = hit.x * mag
          this.player.knockbackZ = hit.z * mag
        }
      }
    }

    // 3-4. Mover al jugador (gravedad + input + empuje + transporte portante) vía KCC.
    const carryDelta = this.computeCarryDelta(t)
    stepPlayer(this.player, input, this.config, carryDelta)

    // Aplicar las traslaciones cinemáticas (jugador y obstáculo) y refrescar el mundo.
    this.world.step()

    // 5. Estado del intento + zonas (con la pose ya avanzada).
    const p = this.player.body.translation()

    if (this.run.phase === 'idle') {
      const moving =
        Math.abs(input.moveAxis.x) > 1e-4 || Math.abs(input.moveAxis.y) > 1e-4 || input.jump
      if (moving) {
        this.run.phase = 'running'
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
      // Recapturar la pose previa tras el teletransporte para que la interpolación
      // de render no dibuje una "estela" cruzando el nivel (igual que reset()).
      this.capturePrev()
    }

    this.simTime = t + dt
  }

  private applyKnockbackIfContact(t: number): void {
    const c = this.config
    const p = this.player.body.translation()
    const pv: Vec3 = { x: p.x, y: p.y, z: p.z }
    for (const { body, def } of this.obstacles) {
      if (def.kind === 'carry') continue // transporta, no empuja
      if (def.kind === 'rotateBar') {
        this.applyRotateBarKnockback(def, t, pv)
        continue
      }
      // oscillate / pusher / pendulum: contacto por AABB axis-aligned, empuje radial.
      const ob = body.translation()
      const he = colliderHalfExtents(def, c)
      const rad = c.capsuleRadius
      const pred = c.contactPrediction
      const expanded: Vec3 = {
        x: he.x + rad + pred,
        y: he.y + c.capsuleHalfHeight + rad + pred,
        z: he.z + rad + pred,
      }
      if (!inAABB(pv, { x: ob.x, y: ob.y, z: ob.z }, expanded)) continue

      const obVel = velocity(def, t, c).linear
      let dx = pv.x - ob.x
      let dz = pv.z - ob.z
      const len = Math.hypot(dx, dz)
      if (len < 1e-4) {
        const vlen = Math.hypot(obVel.x, obVel.z)
        if (vlen < 1e-4) {
          dx = 1
          dz = 0
        } else {
          dx = obVel.x / vlen
          dz = obVel.z / vlen
        }
      } else {
        dx /= len
        dz /= len
      }
      // 'tirón' (péndulo) más fuerte que el 'empuje' base (oscillate/pusher).
      const base = def.kind === 'pendulum' ? c.knockbackThrowStrength : c.knockbackStrength
      const mag = Math.min(base + Math.hypot(obVel.x, obVel.z), c.knockbackMax)
      this.player.knockbackX = dx * mag
      this.player.knockbackZ = dz * mag
    }
  }

  /** Empuje TANGENCIAL de una barra giratoria (ω × r horizontal); contacto por caja orientada. */
  private applyRotateBarKnockback(def: ObstacleDef, t: number, p: Vec3): void {
    const c = this.config
    const wy = c.rotateBar.angularSpeed
    const angle = wy * t
    const cosT = Math.cos(angle)
    const sinT = Math.sin(angle)
    const ox = p.x - def.base.x
    const oz = p.z - def.base.z
    // Eje del brazo = +X local rotado alrededor de Y: (cosT, -sinT); perpendicular (sinT, cosT).
    const along = ox * cosT - oz * sinT
    const perp = ox * sinT + oz * cosT
    const he = c.rotateBar.halfExtents
    const rad = c.capsuleRadius
    const pred = c.contactPrediction
    const within =
      Math.abs(along) <= he.x + rad + pred &&
      Math.abs(perp) <= he.z + rad + pred &&
      Math.abs(p.y - def.base.y) <= he.y + c.capsuleHalfHeight + rad + pred
    if (!within) return
    // Tangencial: ω × r horizontal = (wy*oz, -wy*ox).
    let tx = wy * oz
    let tz = -wy * ox
    const tlen = Math.hypot(tx, tz)
    if (tlen < 1e-4) return
    tx /= tlen
    tz /= tlen
    const tangentialSpeed = Math.abs(wy) * Math.hypot(ox, oz)
    const mag = Math.min(c.knockbackStrength + tangentialSpeed, c.knockbackMax)
    this.player.knockbackX = tx * mag
    this.player.knockbackZ = tz * mag
  }

  /** Transporte de portantes: delta horizontal si el jugador va sobre la cara superior (R-carry). */
  private computeCarryDelta(t: number): Vec3 {
    const c = this.config
    const dt = c.FIXED_DT
    const p = this.player.body.translation()
    const feetY = p.y - c.capsuleHalfHeight - c.capsuleRadius
    let dx = 0
    let dz = 0
    for (const { def } of this.obstacles) {
      if (def.kind !== 'carry') continue
      const now = pose(def, t, c).position
      const next = pose(def, t + dt, c).position
      const he = def.halfExtents
      const topY = now.y + he.y
      const onTop =
        Math.abs(p.x - now.x) <= he.x + c.capsuleRadius &&
        Math.abs(p.z - now.z) <= he.z + c.capsuleRadius &&
        feetY >= topY - c.carry.supportBandY &&
        feetY <= topY + c.carry.supportBandY &&
        this.player.verticalVelocity <= 0
      if (onTop) {
        dx += next.x - now.x
        dz += next.z - now.z
      }
    }
    return { x: dx, y: 0, z: dz }
  }

  private reset(): void {
    this.simTime = 0
    resetRunState(this.run)
    respawnPlayer(this.player, this.circuit.spawn)
    for (const { body, def } of this.obstacles) {
      const p = pose(def, 0, this.config)
      body.setTranslation(p.position, true)
      body.setRotation(p.quaternion, true)
    }
    for (const cs of this.cannons) resetCannonState(cs)
    this.capturePrev()
  }

  private capturePrev(): void {
    const p = this.player.body.translation()
    this.prevPlayerPos = { x: p.x, y: p.y, z: p.z }
    this.prevObstaclePoses = this.snapshotObstaclePoses()
  }

  private snapshotObstaclePoses(): Pose[] {
    return this.obstacles.map(({ body }) => {
      const t = body.translation()
      const r = body.rotation()
      return {
        position: { x: t.x, y: t.y, z: t.z },
        quaternion: { x: r.x, y: r.y, z: r.z, w: r.w },
      }
    })
  }

  private finishZone() {
    const z = this.circuit.zones.find((q) => q.kind === 'finish')!
    return z
  }

  /**
   * Reinicia el intento (mismo circuito) a su estado inicial determinista, desde el host/shell
   * (007). Es exactamente el `reset()` que ya dispara el flanco `restart` dentro de `step()`, pero
   * invocable directamente: un intento nuevo re-ancla el bucle (`createLoopState`) y el flanco
   * `restart` no llegaría a consumirse (su ventana queda en el pasado del ancla nuevo). NO altera
   * `step()` ni el determinismo (Principio II): la puerta de determinismo prueba `step()`, intacto.
   */
  restart(): void {
    this.reset()
  }

  // --- Lecturas de solo lectura (para las vistas) ---
  getPlayerState(): PlayerStateView {
    return readPlayerState(this.player)
  }
  getRunState(): RunStateView {
    return readRunState(this.run)
  }
  /** Cañones (prototipo): pivote + dirección de apuntado, para que el render oriente la malla. */
  getCannonViews(): { base: Vec3; aim: Vec3 }[] {
    return this.cannons.map((c) => ({ base: c.base, aim: { ...c.aim } }))
  }
  /** Posiciones de los proyectiles vivos (para el render). */
  getProjectiles(): Vec3[] {
    const out: Vec3[] = []
    for (const c of this.cannons) for (const p of c.projectiles) out.push({ x: p.x, y: p.y, z: p.z })
    return out
  }
  getObstacleTransforms(): Transform[] {
    return this.obstacles.map(({ body }) => {
      const t = body.translation()
      const r = body.rotation()
      return {
        position: { x: t.x, y: t.y, z: t.z },
        quaternion: { x: r.x, y: r.y, z: r.z, w: r.w },
      }
    })
  }
  getPreviousPlayerTransform(): Transform {
    return { position: this.prevPlayerPos, quaternion: quatFromYaw(this.player.facingYaw) }
  }
  getPreviousObstacleTransforms(): Transform[] {
    return this.prevObstaclePoses.map((p) => ({ position: p.position, quaternion: p.quaternion }))
  }
  getCircuitDefinition(): CircuitDefinition {
    return this.circuit
  }
  /**
   * Datos de depuración de los colliders de Rapier (vértices + colores de líneas). Solo LECTURA:
   * no avanza la simulación ni afecta al determinismo. Devuelve arrays planos (sin Three), así que
   * la frontera headless se mantiene; el render los dibuja como LineSegments.
   */
  getDebugRender(): { vertices: Float32Array; colors: Float32Array } {
    return this.world.debugRender()
  }
}
