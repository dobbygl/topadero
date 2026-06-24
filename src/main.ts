// Bootstrap del navegador: inicializa Rapier (una vez), crea la simulación y las vistas,
// y arranca el bucle de paso fijo. El reloj de requestAnimationFrame (ms) se pasa en
// SEGUNDOS al bucle (research R2; FIXED_DT en segundos).

import * as RAPIER from '@dimforge/rapier3d-compat'
import { advance, createLoopState } from './core/gameLoop'
import { quatFromYaw } from './types'
import { FollowCamera } from './render/followCamera'
import { SceneView } from './render/scene'
import { loadAssets } from './render/assets'
import { Input } from './input/input'
import { Hud } from './ui/hud'
import { Simulation } from './sim/simulation'

async function main(): Promise<void> {
  await RAPIER.init()

  const sim = Simulation.create()
  // Carga de assets ANTES de jugar: ninguna latencia entra en el paso fijo (FR-016).
  const assets = await loadAssets(sim.getCircuitDefinition())
  const app = document.getElementById('app') as HTMLElement
  const view = new SceneView(app, sim.getCircuitDefinition(), assets)
  view.resize()

  const camera = new FollowCamera(view.aspect)
  const hud = new Hud(document.getElementById('hud') as HTMLElement)
  const input = new Input(view.renderer.domElement)
  const loop = createLoopState()

  const clickToPlay = document.getElementById('click-to-play') as HTMLElement
  clickToPlay.addEventListener('click', () => {
    clickToPlay.classList.add('hidden')
    input.requestLock()
  })

  window.addEventListener('resize', () => {
    view.resize()
    camera.resize(view.aspect)
  })

  let lastRenderMs = performance.now()
  const frame = (nowMs: number): void => {
    const dtRender = Math.min((nowMs - lastRenderMs) / 1000, 0.1)
    lastRenderMs = nowMs

    advance(sim, loop, nowMs / 1000, input.getFrameInput())

    const ps = sim.getPlayerState()
    camera.update(ps.position, input.yaw, input.pitch, dtRender)
    view.updateDynamic(
      sim.getPreviousPlayerTransform(),
      { position: ps.position, quaternion: quatFromYaw(ps.facingYaw) },
      sim.getPreviousObstacleTransforms(),
      sim.getObstacleTransforms(),
      loop.alpha,
    )
    hud.update(sim.getRunState())
    view.render(camera.camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

void main()
