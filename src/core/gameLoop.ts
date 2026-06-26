// Bucle de paso fijo con acumulador, desacoplado del render (research R1).
// `advance()` es la lógica pura que ejercita TANTO el navegador (vía requestAnimationFrame)
// COMO el test de determinismo: trocea el reloj en pasos fijos y consume los flancos por
// la ventana de tiempo que contiene su timestamp → el salto cae en el mismo sim-step a
// cualquier FPS (research R7). El nº de pasos hasta `now` es floor((now-t0)/DT),
// independiente de la cadencia.

import { config } from '../config'
import type { Simulation } from '../sim/simulation'
import type { StepInput } from '../types'

export interface InputEdge {
  kind: 'jump' | 'jumpRelease' | 'restart'
  timestamp: number // reloj (mismo origen que requestAnimationFrame)
}

export interface FrameInput {
  moveAxis: { x: number; y: number }
  cameraYaw: number
  /** Buffer de flancos pendientes; `advance` elimina los ya consumidos. */
  edges: InputEdge[]
}

export interface LoopState {
  simStartWall: number
  stepIndex: number
  started: boolean
  alpha: number
}

export function createLoopState(): LoopState {
  return { simStartWall: 0, stepIndex: 0, started: false, alpha: 0 }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * Pausa determinista (007). Desplaza el ancla por el tiempo pausado (SEGUNDOS, mismo reloj que
 * `now` en `advance`) para que el intervalo de pausa NO genere pasos: `dueSteps = floor((now -
 * simStartWall)/DT)` no incluye la pausa. Se llama al REANUDAR (no toca `advance()` ni `src/sim/`,
 * así que el determinismo / independencia de FPS sigue intacto, Principio II). Para un INTENTO NUEVO
 * (no reanudar) NO se usa esto: se re-ancla el bucle con `createLoopState()`.
 */
export function pauseShift(state: LoopState, pausedSec: number): void {
  state.simStartWall += pausedSec
}

/** Avanza la simulación para alcanzar el reloj `now`. Muta `sim`, `state` y `frame.edges`. */
export function advance(sim: Simulation, state: LoopState, now: number, frame: FrameInput): void {
  const DT = config.FIXED_DT
  if (!state.started) {
    state.simStartWall = now
    state.started = true
  }

  const dueSteps = Math.floor((now - state.simStartWall) / DT)
  let toRun = dueSteps - state.stepIndex
  if (toRun > config.MAX_SUBSTEPS) toRun = config.MAX_SUBSTEPS

  for (let i = 0; i < toRun; i++) {
    const k = state.stepIndex
    const winStart = state.simStartWall + k * DT
    const winEnd = winStart + DT
    let jump = false
    let jumpRelease = false
    let restart = false
    for (const e of frame.edges) {
      if (e.timestamp >= winStart && e.timestamp < winEnd) {
        if (e.kind === 'jump') jump = true
        else if (e.kind === 'jumpRelease') jumpRelease = true
        else restart = true
      }
    }
    const stepInput: StepInput = {
      moveAxis: frame.moveAxis,
      cameraYaw: frame.cameraYaw,
      jump,
      jumpRelease,
      restart,
    }
    sim.step(stepInput)
    state.stepIndex = k + 1
  }

  // Anti espiral de la muerte: si seguimos atrasados, descartar el exceso (cámara lenta).
  const stillDue = Math.floor((now - state.simStartWall) / DT) - state.stepIndex
  if (stillDue > 0) state.simStartWall += stillDue * DT

  // Eliminar del buffer los flancos ya consumidos (ventana en el pasado).
  for (let i = frame.edges.length - 1; i >= 0; i--) {
    const target = Math.floor((frame.edges[i].timestamp - state.simStartWall) / DT)
    if (target < state.stepIndex) frame.edges.splice(i, 1)
  }

  state.alpha = clamp01((now - state.simStartWall - state.stepIndex * DT) / DT)
}
