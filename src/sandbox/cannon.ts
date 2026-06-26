// Sandbox del cañón (DEV-ONLY): una plataforma y un cañón que apunta al jugador y dispara, para
// probar la mecánica aislada. Ruta: #/sandbox/cannon. El cañón empieza mirando a -Z (lejos del
// jugador, que aparece en el centro) para ver cómo gira a apuntar y luego dispara; muévete por la
// plataforma para comprobar el apuntado dinámico (con su lag) y esquivar los proyectiles.

import type { CircuitDefinition } from '../circuit'
import { setter, type SandboxScene } from './types'
import { config } from '../config'
// Mallas low-poly del cañón (Meshy, remesheadas a ~4k tris) servidas por Vite (?url → ruta con
// hash). Viven en src/sandbox/assets/ y SOLO entran aquí; como este módulo solo se importa bajo
// import.meta.env.DEV, Vite/Rollup las elimina del build de producción (no se sirven en prod).
import cannonBaseUrl from './assets/cannon-base.glb?url'
import cannonBarrelUrl from './assets/cannon-barrel.glb?url'

const circuit: CircuitDefinition = {
  spawn: { x: 0, y: 1.0, z: 0 },
  statics: [
    { id: 'sandbox-floor', kind: 'platform', center: { x: 0, y: -0.5, z: 0 }, halfExtents: { x: 8, y: 0.5, z: 8 }, color: 0x2fd4c4 },
  ],
  obstacles: [],
  cannons: [
    { id: 'cannon', base: { x: 0, y: 1.4, z: -6 }, color: 0x4c566a, baseMeshUrl: cannonBaseUrl, barrelMeshUrl: cannonBarrelUrl },
  ],
  zones: [
    { kind: 'start', center: { x: 0, y: 0.6, z: 0 }, halfExtents: { x: 8, y: 0.6, z: 8 }, color: 0x2e7d32 },
    // Meta lejísimos: la escena no la usa (no hay condición de victoria que probar aquí).
    { kind: 'finish', center: { x: 0, y: -500, z: 9999 }, halfExtents: { x: 1, y: 1, z: 1 }, color: 0xd4af37 },
  ],
  theme: { palette: { sky: 0x7ec8f3, platform: 0x2fd4c4, ramp: 0xff7a1a, wall: 0x14233b, ink: 0x14233b } },
}

export const cannonSandbox: SandboxScene = {
  name: 'cannon',
  title: 'Cañón que apunta y dispara',
  circuit,
  // Parámetros de apuntado/disparo (los lee stepCannon por paso → en vivo). La geometría de la malla
  // (meshBarrelYaw/escalas) NO está aquí: es de render y necesita recarga.
  tuning: [
    { label: 'vel. de giro', min: 0, max: 5, step: 0.05, get: () => config.cannon.rotationSpeed, set: setter(config.cannon, 'rotationSpeed') },
    { label: 'cadencia apuntado', min: 0, max: 2, step: 0.05, get: () => config.cannon.aimCadence, set: setter(config.cannon, 'aimCadence') },
    { label: 'tolerancia disparo (rad)', min: 0, max: 0.5, step: 0.01, get: () => config.cannon.fireToleranceRad, set: setter(config.cannon, 'fireToleranceRad') },
    { label: 'recarga (s)', min: 0.2, max: 3, step: 0.05, get: () => config.cannon.fireReload, set: setter(config.cannon, 'fireReload') },
    { label: 'vel. proyectil', min: 5, max: 30, step: 0.5, get: () => config.cannon.projectileSpeed, set: setter(config.cannon, 'projectileSpeed') },
    { label: 'empuje impacto', min: 0, max: 18, step: 0.5, get: () => config.cannon.knockbackStrength, set: setter(config.cannon, 'knockbackStrength') },
  ],
}
