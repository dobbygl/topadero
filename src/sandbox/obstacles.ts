// Escenas de sandbox de los 5 obstáculos del catálogo (001/002), cada uno aislado en una plataforma
// de prueba, con sliders en vivo de sus parámetros de MOVIMIENTO (mutan config; el sim los lee por
// paso). Los parámetros estructurales (tamaño de collider) no se exponen: necesitan recarga.

import { config } from '../config'
import { setter, type SandboxScene } from './types'
import { flatCircuit } from './flat'

// El jugador aparece en z=0 y avanza hacia -Z; el obstáculo se coloca delante (z=-4..-5).

export const oscillateSandbox: SandboxScene = {
  name: 'oscillate',
  title: 'Vaivén (oscillate)',
  circuit: flatCircuit([
    { id: 'osc', kind: 'oscillate', base: { x: 0, y: 2, z: -4 }, color: 0xbf4040, meshUrl: 'assets/obstacle-oscillate.glb' },
  ]),
  tuning: [
    { label: 'amplitud (X)', min: 0, max: 8, step: 0.1, get: () => config.obstacleAmplitude, set: setter(config, 'obstacleAmplitude') },
    { label: 'velocidad', min: 0, max: 4, step: 0.05, get: () => config.obstacleSpeed, set: setter(config, 'obstacleSpeed') },
  ],
}

export const rotateBarSandbox: SandboxScene = {
  name: 'rotatebar',
  title: 'Barra giratoria (rotateBar)',
  circuit: flatCircuit([
    { id: 'bar', kind: 'rotateBar', base: { x: 0, y: 1.6, z: -4 }, color: 0xb5651d, meshUrl: 'assets/obstacle-rotatebar.glb' },
  ]),
  tuning: [
    { label: 'vel. angular', min: 0, max: 4, step: 0.05, get: () => config.rotateBar.angularSpeed, set: setter(config.rotateBar, 'angularSpeed') },
  ],
}

export const pendulumSandbox: SandboxScene = {
  name: 'pendulum',
  title: 'Péndulo (pendulum)',
  circuit: flatCircuit([
    { id: 'pendulum', kind: 'pendulum', base: { x: 0, y: 6, z: -4 }, color: 0x8e44ad, meshUrl: 'assets/obstacle-pendulum.glb' },
  ]),
  tuning: [
    { label: 'amplitud (rad)', min: 0, max: 1.5, step: 0.02, get: () => config.pendulum.amplitude, set: setter(config.pendulum, 'amplitude') },
    { label: 'vel. angular', min: 0, max: 3, step: 0.05, get: () => config.pendulum.angularSpeed, set: setter(config.pendulum, 'angularSpeed') },
    { label: 'long. brazo', min: 1, max: 6, step: 0.1, get: () => config.pendulum.armLength, set: setter(config.pendulum, 'armLength') },
  ],
}

export const pusherSandbox: SandboxScene = {
  name: 'pusher',
  title: 'Empujador (pusher)',
  circuit: flatCircuit([
    { id: 'pusher', kind: 'pusher', base: { x: 0, y: 1.6, z: -4 }, color: 0xe07b39, meshUrl: 'assets/obstacle-pusher.glb', meshYaw: Math.PI / 2 },
  ]),
  tuning: [
    { label: 'carrera (Z)', min: 0, max: 5, step: 0.1, get: () => config.pusher.stroke, set: setter(config.pusher, 'stroke') },
    { label: 'velocidad', min: 0, max: 3, step: 0.05, get: () => config.pusher.speed, set: setter(config.pusher, 'speed') },
  ],
}

export const carrySandbox: SandboxScene = {
  name: 'carry',
  title: 'Plataforma portante (carry)',
  circuit: flatCircuit([
    {
      id: 'carry',
      kind: 'carry',
      base: { x: 0, y: 0.9, z: -5 },
      color: 0x2fd4c4,
      axis: 'z',
      halfExtents: { x: 2.5, y: 0.4, z: 2.5 },
      meshUrl: 'assets/obstacle-carry.glb',
    },
  ]),
  tuning: [
    { label: 'amplitud', min: 0, max: 6, step: 0.1, get: () => config.carry.amplitude, set: setter(config.carry, 'amplitude') },
    { label: 'velocidad', min: 0, max: 3, step: 0.05, get: () => config.carry.speed, set: setter(config.carry, 'speed') },
  ],
}

export const obstacleScenes: SandboxScene[] = [
  oscillateSandbox,
  rotateBarSandbox,
  pendulumSandbox,
  pusherSandbox,
  carrySandbox,
]
