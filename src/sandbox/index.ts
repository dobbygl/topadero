// Registro de escenas de SANDBOX (DEV-ONLY). main.ts importa este módulo de forma DINÁMICA y solo
// cuando import.meta.env.DEV es true, así que todo src/sandbox/ queda FUERA del build de producción
// (las rutas #/sandbox/* no son accesibles en producción). Para añadir una escena nueva: crea su
// SandboxScene (en su .ts) y regístrala en SCENES.

import type { CircuitDefinition } from '../circuit'
import type { SandboxScene } from './types'
import { cannonSandbox } from './cannon'
import { obstacleScenes } from './obstacles'
import { flatCircuit } from './flat'

const ALL: SandboxScene[] = [...obstacleScenes, cannonSandbox]

const SCENES: Record<string, SandboxScene> = Object.fromEntries(ALL.map((s) => [s.name, s]))

/** Escena del índice (`#/sandbox` sin nombre): plataforma vacía; el panel solo muestra el menú. */
export const indexScene: SandboxScene = {
  name: '',
  title: 'Índice de sandbox',
  circuit: flatCircuit([]),
}

/** Escena de sandbox por `name` (con su tuning), o null si no existe. */
export function getSandboxScene(name: string): SandboxScene | null {
  return SCENES[name] ?? null
}

/** Circuito de la escena `name`, o null si no existe (compatibilidad). */
export function loadSandbox(name: string): CircuitDefinition | null {
  return SCENES[name]?.circuit ?? null
}

/** Lista de escenas disponibles (para el índice/menú del panel). */
export function listSandboxScenes(): { name: string; title: string }[] {
  return ALL.map((s) => ({ name: s.name, title: s.title }))
}
