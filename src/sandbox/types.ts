// Escenas de SANDBOX (pantallas debug de elementos para probarlos y AFINARLOS). DEV-ONLY: este
// código solo se carga en `npm run dev` (import dinámico gateado por import.meta.env.DEV en main.ts)
// y queda FUERA del build de producción. Cada escena aporta un circuito aislado + (opcional) una
// lista de parámetros ajustables EN VIVO desde el panel (sandboxPanel.ts). Ruta: `#/sandbox/<name>`.

import type { CircuitDefinition } from '../circuit'

/**
 * Parámetro ajustable en vivo. `get`/`set` cierran sobre `config`; al mover el slider se MUTA config
 * y el sim lo lee en el siguiente paso (pose/velocity/stepCannon reciben config por paso). Solo para
 * parámetros de MOVIMIENTO/feel (los estructurales —tamaño de collider, geometría— necesitan recarga).
 */
export interface TuningParam {
  label: string
  min: number
  max: number
  step: number
  get(): number
  set(v: number): void
}

export interface SandboxScene {
  /** Identificador en la ruta `#/sandbox/<name>`. */
  name: string
  /** Título legible (para el índice y el panel). */
  title: string
  /** Circuito que carga la simulación para esta escena. */
  circuit: CircuitDefinition
  /** Parámetros afinables en vivo desde el panel (opcional). */
  tuning?: TuningParam[]
}

/**
 * Setter que MUTA un campo numérico de `config` (readonly por tipo) SOLO para el tuning en vivo del
 * sandbox (dev). El objeto es mutable en runtime; el cast desactiva la protección de tipo a propósito,
 * porque el sentido del sandbox es experimentar con esos valores. No se usa en código de juego.
 */
export function setter<T extends object>(obj: T, key: keyof T & string): (v: number) => void {
  return (v: number) => {
    ;(obj as unknown as Record<string, number>)[key] = v
  }
}
