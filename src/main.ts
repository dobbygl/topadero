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
  // Modo captura (?shot): oculta el overlay para screenshots limpios del escenario.
  if (new URLSearchParams(location.search).has('shot')) clickToPlay.classList.add('hidden')

  window.addEventListener('resize', () => {
    view.resize()
    camera.resize(view.aspect)
  })

  // Modo debug de física (tecla B): overlay de colliders de Rapier. Es solo de vista; NO entra
  // en el StepInput determinista (getFrameInput ignora 'KeyB'), así que no afecta a la simulación.
  let debug = new URLSearchParams(location.search).has('debug') // ?debug arranca el overlay (capturas)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB') debug = !debug
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
    view.updatePlayerAnimation(ps.isGrounded, dtRender)
    view.setDebug(debug ? sim.getDebugRender() : null)
    hud.update(sim.getRunState())
    view.render(camera.camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

main().catch((e: unknown) => {
  const el = document.getElementById('hud')
  const err = e instanceof Error ? (e.stack ?? e.message) : String(e)
  if (el) el.innerHTML =
    '<pre style="color:#fff;background:#900;padding:12px;white-space:pre-wrap;font:12px monospace;position:fixed;inset:0;margin:0;overflow:auto;z-index:99">' +
    err +
    '</pre>'
  console.error(e)
})
