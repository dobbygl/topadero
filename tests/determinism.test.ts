// Puerta automática del Principio II (NO NEGOCIABLE): el mismo input produce la misma
// trayectoria con independencia de la tasa de fotogramas. Se alimenta la MISMA línea de
// inputs (con timestamp) por fotograma sobre 4 cadencias (60 / jitter / 30 / 144 Hz) y se
// compara el estado a igual nº de pasos fijos con igualdad EXACTA (epsilon de redondeo).
// Como los flancos se consumen por la ventana de su timestamp, el salto cae en el mismo
// sim-step a cualquier FPS (research R7).

import { beforeAll, describe, expect, it } from 'vitest'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { Simulation } from '../src/sim/simulation'
import { advance, createLoopState, type FrameInput, type InputEdge } from '../src/core/gameLoop'
import { config } from '../src/config'
import { pose, velocity } from '../src/sim/movingObstacle'
import type { CircuitDefinition, ObstacleDef, OscillateDef, StaticBox } from '../src/circuit'
import type { Vec3 } from '../src/types'

const DT = config.FIXED_DT

beforeAll(async () => {
  await RAPIER.init()
})

// Cadencias de fotograma (segundos por fotograma). Ninguna supera MAX_SUBSTEPS.
const CADENCES: Record<string, number[]> = {
  '60hz': [1 / 60],
  jitter: [5 / 1000, 40 / 1000, 8 / 1000],
  '30hz': [1 / 30],
  '144hz': [1 / 144],
}

/** Línea de fotogramas que SIEMPRE termina exactamente en durationSec (mismo nº de pasos). */
function buildTimeline(frameDurations: number[], durationSec: number): number[] {
  const times = [0]
  let now = 0
  let i = 0
  // Acumula fotogramas estrictamente por debajo de durationSec...
  for (;;) {
    const next = now + frameDurations[i % frameDurations.length]
    if (next >= durationSec - 1e-12) break
    now = next
    times.push(now)
    i++
  }
  // ...y SIEMPRE termina exactamente en durationSec → mismo nº de pasos en toda cadencia.
  times.push(durationSec)
  return times
}

interface Scenario {
  moveAxis: { x: number; y: number }
  cameraYaw: number
  edges: InputEdge[]
  durationSec: number
}

function runScenario(scn: Scenario, frameDurations: number[], circuitDef?: CircuitDefinition) {
  const sim = circuitDef ? Simulation.create(config, circuitDef) : Simulation.create()
  const state = createLoopState()
  const frame: FrameInput = {
    moveAxis: scn.moveAxis,
    cameraYaw: scn.cameraYaw,
    edges: scn.edges.map((e) => ({ ...e })), // clon: advance() muta el buffer
  }
  // pico de altura a lo largo de la línea (solo lectura). Se usa SOLO en aserciones de
  // comportamiento a 60 Hz (donde cada fotograma = un paso → muestreo por sim-step). NO entra en
  // la comparación entre cadencias: a 30 Hz un fotograma agrupa 2 pasos y el muestreo por
  // fotograma podría perderse el paso del ápice. El determinismo del arco se comprueba comparando
  // el estado canónico (incluye position.y y verticalVelocity) en un paso EN VUELO (R7).
  let peakY = -Infinity
  for (const now of buildTimeline(frameDurations, scn.durationSec)) {
    advance(sim, state, now, frame)
    const y = sim.getPlayerState().position.y
    if (y > peakY) peakY = y
  }
  const p = sim.getPlayerState()
  const r = sim.getRunState()
  // Vector de estado canónico: jugador + crono + TODOS los obstáculos (posición + quaternion).
  const obsNums: number[] = []
  for (const o of sim.getObstacleTransforms()) {
    obsNums.push(
      o.position.x, o.position.y, o.position.z,
      o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w,
    )
  }
  return {
    stepIndex: state.stepIndex,
    phase: r.phase,
    peakY,
    nums: [
      p.position.x, p.position.y, p.position.z,
      p.velocity.x, p.velocity.y, p.velocity.z,
      p.verticalVelocity, p.isGrounded ? 1 : 0,
      p.horizontalVelocity.x, p.horizontalVelocity.z, // rampa de locomoción (US3, R8)
      r.elapsedSimTime,
      ...obsNums,
    ],
  }
}

function expectIdenticalAcrossCadences(scn: Scenario, circuitDef?: CircuitDefinition): void {
  const ref = runScenario(scn, CADENCES['60hz'], circuitDef)
  for (const name of Object.keys(CADENCES)) {
    const got = runScenario(scn, CADENCES[name], circuitDef)
    expect(got.stepIndex, `stepIndex @ ${name}`).toBe(ref.stepIndex)
    expect(got.phase, `phase @ ${name}`).toBe(ref.phase)
    for (let k = 0; k < ref.nums.length; k++) {
      expect(
        Math.abs(got.nums[k] - ref.nums[k]),
        `num[${k}] @ ${name} (got ${got.nums[k]} vs ref ${ref.nums[k]})`,
      ).toBeLessThanOrEqual(config.FLOAT_EPSILON)
    }
  }
}

// --- Circuitos mínimos aislados para los obstáculos nuevos (seam Simulation.create). ---
// Suelo grande para que el knockback no tire al jugador del borde durante el test.
function flatGround(topY: number): StaticBox[] {
  return [
    { id: 'g', kind: 'platform', center: { x: 0, y: topY - 0.5, z: 0 }, halfExtents: { x: 30, y: 0.5, z: 30 }, color: 0 },
  ]
}
function miniCircuit(obstacle: ObstacleDef, spawn: Vec3, statics: StaticBox[]): CircuitDefinition {
  return {
    spawn,
    statics,
    obstacles: [obstacle],
    // Meta lejísimos: estos escenarios no la tocan (el crono queda en idle, sin input).
    zones: [
      { kind: 'start', center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 1, y: 0.1, z: 1 }, color: 0 },
      { kind: 'finish', center: { x: 0, y: -500, z: 9999 }, halfExtents: { x: 1, y: 1, z: 1 }, color: 0 },
    ],
  }
}
const STILL = { moveAxis: { x: 0, y: 0 }, cameraYaw: 0, edges: [] }

describe('Principio II — determinismo / independencia de FPS', () => {
  it('US1: salto cerca de una frontera de subpaso → idéntico a 60/jitter/30/144 Hz', () => {
    // Flanco de salto situado a 0.3·DT dentro de la ventana del paso 30 (t ≈ 0.5 s).
    const jumpT = 0.5 + 0.3 * DT
    expectIdenticalAcrossCadences({
      moveAxis: { x: 0, y: 1 },
      cameraYaw: 0,
      edges: [{ kind: 'jump', timestamp: jumpT }],
      durationSec: 90 * DT,
    })
  })

  it('US1: salto BUFFERIZADO (pulsado en el aire antes de aterrizar) → idéntico y se dispara', () => {
    // El jugador cae desde y=3.0 hasta el reposo (~1.9). El flanco de salto cae EN EL AIRE
    // (t=0.20), dentro de jumpBufferTime antes del aterrizaje: se recuerda y se ejecuta al tocar
    // suelo. La comparación entre cadencias ocurre EN PLENO ASCENSO (33·DT ≈ 0.55 s), donde
    // position.y es sensible al paso exacto en que se disparó → un buffer NO determinista
    // (consumido por fotograma) divergiría entre 30 y 144 Hz y fallaría aquí (R7).
    const c = miniCircuit(
      { id: 'far', kind: 'oscillate', base: { x: 0, y: -50, z: 0 }, color: 0 },
      { x: 0, y: 3.0, z: 0 },
      flatGround(1.0),
    )
    const scn: Scenario = {
      moveAxis: { x: 0, y: 0 },
      cameraYaw: 0,
      edges: [{ kind: 'jump', timestamp: 0.2 }],
      durationSec: 33 * DT,
    }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(r.peakY, 'el salto bufferizado debe elevar al jugador por encima del reposo (~1.9)').toBeGreaterThan(2.5)
  })

  // --- US2: salto de altura variable (lanzar al máximo, cortar al soltar) + gravedad asimétrica ---
  const flatSpawn = () =>
    miniCircuit(
      { id: 'far', kind: 'oscillate' as const, base: { x: 0, y: -50, z: 0 }, color: 0 },
      { x: 0, y: 1.9, z: 0 }, // reposo sobre flatGround(1.0): 1.0 + radio 0.4 + medio 0.5
      flatGround(1.0),
    )

  it('US2: salto MANTENIDO vs SOLTADO temprano → cada uno idéntico a 60/jitter/30/144 Hz', () => {
    // Apoyado en suelo plano; salto en t=0.10. La comparación entre cadencias ocurre EN VUELO
    // (18·DT ≈ 0.30 s): position.y y verticalVelocity son sensibles al paso EXACTO del corte →
    // un corte no determinista (muestreo de "mantenido" por fotograma) divergiría aquí (R3, R7).
    const c = flatSpawn()
    const held: Scenario = {
      moveAxis: { x: 0, y: 0 },
      cameraYaw: 0,
      edges: [{ kind: 'jump', timestamp: 0.1 }],
      durationSec: 18 * DT,
    }
    const early: Scenario = {
      moveAxis: { x: 0, y: 0 },
      cameraYaw: 0,
      edges: [
        { kind: 'jump', timestamp: 0.1 },
        { kind: 'jumpRelease', timestamp: 0.12 },
      ],
      durationSec: 18 * DT,
    }
    expectIdenticalAcrossCadences(held, c)
    expectIdenticalAcrossCadences(early, c)
  })

  it('US2: mantener salta más alto que soltar pronto; un toque siempre da un hop mínimo (FR-004)', () => {
    const c = flatSpawn()
    const long = (edges: InputEdge[]): Scenario => ({ moveAxis: { x: 0, y: 0 }, cameraYaw: 0, edges, durationSec: 120 * DT })
    const heldPeak = runScenario(long([{ kind: 'jump', timestamp: 0.1 }]), CADENCES['60hz'], c).peakY
    const earlyPeak = runScenario(
      long([{ kind: 'jump', timestamp: 0.1 }, { kind: 'jumpRelease', timestamp: 0.117 }]),
      CADENCES['60hz'],
      c,
    ).peakY
    const rest = 1.9
    expect(earlyPeak, 'un toque ultracorto debe producir un hop mínimo perceptible (no nulo)').toBeGreaterThan(rest + 0.1)
    expect(heldPeak - earlyPeak, 'mantener debe subir claramente más que soltar pronto').toBeGreaterThan(0.8)
  })

  it('US3: locomoción con rampa (moveAxis CONSTANTE) → trayectoria idéntica entre cadencias', () => {
    // moveAxis constante (diagonal) y cámara girada, sobre suelo plano amplio: la rampa de
    // velocidad se integra con dt → idéntica a 30/60/jitter/144 Hz. R1: el movimiento es
    // held-sampled, así que la garantía es "misma trayectoria con input mantenido"; por eso el
    // escenario NO cambia de dirección. El vector canónico incluye horizontalVelocity (R8).
    const c = miniCircuit(
      { id: 'far', kind: 'oscillate', base: { x: 0, y: -50, z: 0 }, color: 0 },
      { x: 0, y: 1.9, z: 0 },
      flatGround(1.0),
    )
    const scn: Scenario = { moveAxis: { x: 0.6, y: 1 }, cameraYaw: 0.3, edges: [], durationSec: 120 * DT }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(Math.hypot(r.nums[0], r.nums[2]), 'el jugador debe avanzar').toBeGreaterThan(2)
    expect(Math.hypot(r.nums[8], r.nums[9]), 'la rampa debe converger a la velocidad de crucero').toBeGreaterThan(6)
  })

  it('US1+US3: recorrido largo con varios saltos (y posibles caídas/respawn) → idéntico', () => {
    const edges: InputEdge[] = [0.4, 1.0, 1.6, 2.2, 2.8].map((t, i) => ({
      kind: 'jump',
      timestamp: t + 0.137 * DT * (i + 1),
    }))
    expectIdenticalAcrossCadences({
      moveAxis: { x: 0, y: 1 },
      cameraYaw: 0,
      edges,
      durationSec: 300 * DT,
    })
  })

  it('US3: caída lateral fuera del circuito → respawn idéntico entre cadencias', () => {
    // Strafe lateral hasta caerse de la plataforma de salida y reaparecer.
    expectIdenticalAcrossCadences({
      moveAxis: { x: 1, y: 0 },
      cameraYaw: 0,
      edges: [],
      durationSec: 180 * DT,
    })
  })

  it('US2: la trayectoria del obstáculo es función pura y su velocidad es la derivada analítica', () => {
    const def: OscillateDef = { id: 'test-osc', kind: 'oscillate', base: { x: 0, y: 3, z: -31 }, color: 0 }
    const h = 1e-5
    for (const t of [0, 0.1, 1.234, 5]) {
      // determinismo: misma entrada → misma salida
      expect(pose(def, t, config)).toEqual(pose(def, t, config))
      // la velocidad analítica coincide con la derivada numérica de la posición
      const numeric = (pose(def, t + h, config).position.x - pose(def, t - h, config).position.x) / (2 * h)
      expect(Math.abs(velocity(def, t, config).linear.x - numeric)).toBeLessThan(1e-3)
    }
  })

  it('US1: barra giratoria → empuje tangencial idéntico entre cadencias y con efecto real', () => {
    const c = miniCircuit(
      { id: 'bar', kind: 'rotateBar', base: { x: 0, y: 1.4, z: 0 }, color: 0 },
      { x: 2, y: 1.9, z: 0 }, // sobre el brazo (a lo largo de +X en t=0) → contacto inmediato
      flatGround(1.0),
    )
    const scn = { ...STILL, durationSec: 45 * DT }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(Math.hypot(r.nums[0] - 2, r.nums[2]), 'la barra debe empujar al jugador').toBeGreaterThan(0.3)
  })

  it('US1: péndulo → tirón idéntico entre cadencias y con efecto real', () => {
    const c = miniCircuit(
      { id: 'pend', kind: 'pendulum', base: { x: 0, y: 5.0, z: 0 }, color: 0 }, // bob baja a (0,1,0) en t=0
      { x: 0, y: 1.0, z: 0 },
      flatGround(0.0),
    )
    const scn = { ...STILL, durationSec: 30 * DT }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(Math.hypot(r.nums[0], r.nums[2]), 'el péndulo debe lanzar al jugador').toBeGreaterThan(0.3)
  })

  it('US1: empujador → empuje frontal idéntico entre cadencias y con efecto real', () => {
    const c = miniCircuit(
      { id: 'push', kind: 'pusher', base: { x: 0, y: 1.4, z: 0 }, color: 0 },
      { x: 0, y: 1.9, z: 0.5 }, // dentro del alcance del empujador en t=0
      flatGround(1.0),
    )
    const scn = { ...STILL, durationSec: 45 * DT }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(Math.hypot(r.nums[0], r.nums[2] - 0.5), 'el empujador debe empujar al jugador').toBeGreaterThan(0.3)
  })

  it('US1: plataforma portante → transporte idéntico a 30/144 y con efecto real', () => {
    const c = miniCircuit(
      { id: 'carry', kind: 'carry', base: { x: 0, y: 0.5, z: 0 }, color: 0, axis: 'x', halfExtents: { x: 2, y: 0.4, z: 2 } },
      { x: 0, y: 1.8, z: 0 }, // de pie sobre la cara superior de la portante (sin otro suelo)
      [],
    )
    const scn = { ...STILL, durationSec: 60 * DT }
    expectIdenticalAcrossCadences(scn, c)
    const r = runScenario(scn, CADENCES['60hz'], c)
    expect(Math.abs(r.nums[0]), 'el jugador debe viajar con la plataforma en X').toBeGreaterThan(0.5)
  })

  it('US1: pose/velocity de los tipos nuevos son puras (misma simTime → misma salida)', () => {
    const defs: ObstacleDef[] = [
      { id: 'b', kind: 'rotateBar', base: { x: 0, y: 2, z: 0 }, color: 0 },
      { id: 'p', kind: 'pendulum', base: { x: 0, y: 5, z: 0 }, color: 0 },
      { id: 'u', kind: 'pusher', base: { x: 0, y: 2, z: 0 }, color: 0 },
      { id: 'c', kind: 'carry', base: { x: 0, y: 1, z: 0 }, color: 0, axis: 'z', halfExtents: { x: 2, y: 0.4, z: 2 } },
    ]
    for (const def of defs) {
      for (const t of [0, 0.37, 1.5, 4.2]) {
        expect(pose(def, t, config)).toEqual(pose(def, t, config))
        expect(velocity(def, t, config)).toEqual(velocity(def, t, config))
      }
    }
  })
})
