// Bootstrap del navegador: inicializa Rapier (una vez), crea la simulación y las vistas,
// y arranca el bucle de paso fijo. El reloj de requestAnimationFrame (ms) se pasa en
// SEGUNDOS al bucle (research R2; FIXED_DT en segundos).

import * as RAPIER from '@dimforge/rapier3d-compat'
import { config } from './config'
import { advance, createLoopState } from './core/gameLoop'
import { quatFromYaw } from './types'
import { FollowCamera } from './render/followCamera'
import { SceneView } from './render/scene'
import { loadAssets } from './render/assets'
import { Input } from './input/input'
import { Hud } from './ui/hud'
import { Simulation } from './sim/simulation'
import { registerServiceWorker } from './pwa/install'

async function main(): Promise<void> {
  registerServiceWorker() // PWA (004 · US4): offline tras la primera carga; no toca el paso fijo.
  await RAPIER.init()

  const sim = Simulation.create()
  // Carga de assets ANTES de jugar: ninguna latencia entra en el paso fijo (FR-016).
  const assets = await loadAssets(sim.getCircuitDefinition())
  const app = document.getElementById('app') as HTMLElement
  const view = new SceneView(app, sim.getCircuitDefinition(), assets)
  view.resize()

  const camera = new FollowCamera(view.aspect)
  // Accesibilidad (004 · US3): reduce el movimiento de cámara si la preferencia o el sistema lo pide.
  camera.reducedMotion =
    config.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

  // Cámara de inspección (?look=<z>): enfoca un punto del circuito desde un 3/4. Solo dev/capturas.
  const lookParam = new URLSearchParams(location.search).get('look')
  const lookZ = lookParam !== null && lookParam !== '' ? Number(lookParam) : null

  let lastRenderMs = performance.now()
  const frame = (nowMs: number): void => {
    const dtRender = Math.min((nowMs - lastRenderMs) / 1000, 0.1)
    lastRenderMs = nowMs

    advance(sim, loop, nowMs / 1000, input.getFrameInput(nowMs / 1000))

    const ps = sim.getPlayerState()
    camera.update(ps.position, input.yaw, input.pitch, dtRender)
    if (lookZ !== null) {
      if (new URLSearchParams(location.search).has('top')) {
        camera.camera.position.set(0.01, 16, lookZ) // cenital: leer orientación en XZ
        camera.camera.lookAt(0, 2, lookZ)
      } else {
        camera.camera.position.set(4.5, 4, lookZ + 5.5)
        camera.camera.lookAt(0, 2.6, lookZ)
      }
    }
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
