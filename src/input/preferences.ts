// Preferencias de entrada (004 · US2). Seam ESTABLE en memoria, inicializado desde config.ts
// (Principio V). La spec del shell muta estos valores desde su UI de ajustes y la de persistencia
// los guarda/restaura entre sesiones; aquí viven en memoria con sus defaults. No toca la
// simulación: solo gobierna cómo los adaptadores rellenan el FrameInput y la cámara (render).

import { config } from '../config'

export type MoveAction = 'forward' | 'back' | 'left' | 'right'
export type EdgeAction = 'jump' | 'restart'
export type BindableAction = MoveAction | EdgeAction

export interface InputPreferences {
  cameraSensitivity: number // multiplicador global sobre la base por dispositivo
  invertCameraX: boolean
  invertCameraY: boolean
  deadzone: number // deadzone radial del stick del mando
  gamepadJumpButton: number
  gamepadRestartButton: number
  keys: Record<BindableAction, string[]> // códigos de tecla por acción (reasignables)
}

export const inputPrefs: InputPreferences = {
  cameraSensitivity: 1,
  invertCameraX: false,
  invertCameraY: config.invertCameraY,
  deadzone: config.gamepadDeadzone,
  gamepadJumpButton: config.gamepadJumpButton,
  gamepadRestartButton: config.gamepadRestartButton,
  keys: {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    restart: ['KeyR'],
  },
}

/** Reasigna una acción a una tecla (US2). Un control = una acción: reasignar quita la previa. */
export function rebindKey(action: BindableAction, code: string): void {
  for (const a of Object.keys(inputPrefs.keys) as BindableAction[]) {
    inputPrefs.keys[a] = inputPrefs.keys[a].filter((c) => c !== code)
  }
  inputPrefs.keys[action] = [code]
}

/** ¿Qué acción de flanco corresponde a esta tecla? (jump/restart, o null). */
export function edgeActionForKey(code: string): EdgeAction | null {
  if (inputPrefs.keys.jump.includes(code)) return 'jump'
  if (inputPrefs.keys.restart.includes(code)) return 'restart'
  return null
}
