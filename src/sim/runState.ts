// Máquina de estados del intento + cronómetro (tiempo de simulación acumulado).
// idle → running (primer input de movimiento/salto) → won (entrar en meta).
// El respawn no reinicia el crono (Q5); el reinicio lo pone a cero (FR-012).

import type { RunPhase, RunStateView } from '../types'

export interface RunState {
  phase: RunPhase
  elapsedSimTime: number
}

export function createRunState(): RunState {
  return { phase: 'idle', elapsedSimTime: 0 }
}

export function resetRunState(rs: RunState): void {
  rs.phase = 'idle'
  rs.elapsedSimTime = 0
}

export function readRunState(rs: RunState): RunStateView {
  return { phase: rs.phase, elapsedSimTime: rs.elapsedSimTime }
}
