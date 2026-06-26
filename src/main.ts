// Bootstrap del navegador (007): inicializa Rapier (una vez), resuelve el circuito del día, crea la
// simulación y las vistas, y arranca el bucle de paso fijo GOBERNADO POR EL SHELL. El shell (vista
// pura, src/ui) decide la pantalla; el bucle solo AVANZA la simulación cuando screen==='playing'. La
// pausa vive aquí, FUERA de advance()/src/sim (desplazando el ancla con pauseShift), así el test de
// determinismo no se toca (Principio II). El reloj de requestAnimationFrame (ms) se pasa en SEGUNDOS.

import * as RAPIER from '@dimforge/rapier3d-compat'
import { config } from './config'
import type { CircuitDefinition } from './circuit'
import { advance, createLoopState, pauseShift } from './core/gameLoop'
import { quatFromYaw } from './types'
import { FollowCamera } from './render/followCamera'
import { SceneView } from './render/scene'
import { loadAssets } from './render/assets'
import { Input } from './input/input'
import { Hud } from './ui/hud'
import { Simulation } from './sim/simulation'
import { registerServiceWorker } from './pwa/install'
import { AudioManager } from './audio/audio'
import { detectAudioEvents, snapshotOf, type AudioSnapshot } from './audio/events'
import { resolveDailyCircuit, loadBest, recordBest, utcDay, type DailyCircuit } from './daily/daily'
import { DailyHud } from './ui/dailyHud'
import { Shell } from './ui/shell'
import { SettingsPanel } from './ui/settingsPanel'
import { settings } from './settings/settings'

async function main(): Promise<void> {
  registerServiceWorker() // PWA (004 · US4): offline tras la primera carga; no toca el paso fijo.
  await RAPIER.init()

  // Sandbox (DEV-ONLY): la ruta #/sandbox/<name> carga una escena de prueba y TIENE PRELACIÓN sobre el
  // circuito diario (para probar/afinar elementos aislados). En producción import.meta.env.DEV es false
  // → Vite elimina este bloque y el import dinámico; src/sandbox/ no entra en el build ni las rutas.
  let circuitDef: CircuitDefinition | undefined
  if (import.meta.env.DEV) {
    const m = location.hash.match(/^#\/sandbox(?:\/([\w-]+))?/)
    if (m) {
      const { getSandboxScene, listSandboxScenes, indexScene } = await import('./sandbox')
      const name = m[1] ?? ''
      const found = name ? getSandboxScene(name) : indexScene
      if (name && !found) console.warn(`Sandbox desconocido: ${name}`)
      const scene = found ?? indexScene
      circuitDef = scene.circuit
      const { SandboxPanel } = await import('./ui/sandboxPanel')
      new SandboxPanel(document.body, listSandboxScenes(), scene)
      window.addEventListener('hashchange', () => location.reload())
    }
  }

  // Circuito diario (006): si NO hay sandbox, resolver el circuito del día (baliza fuera del paso fijo,
  // FR-006). Degradación: si falla, se cae al circuito fijo para no dejar pantalla en blanco (Principio VI).
  let daily: DailyCircuit | null = null
  if (!circuitDef) {
    try {
      daily = await resolveDailyCircuit(Date.now())
    } catch (e: unknown) {
      console.warn('Circuito diario no resuelto; uso el circuito fijo:', e)
    }
  }

  const sim = circuitDef
    ? Simulation.create(config, circuitDef)
    : daily
      ? Simulation.create(config, daily.circuit)
      : Simulation.create()
  const hasCannons = sim.getCannonViews().length > 0
  // Carga de assets ANTES de jugar: ninguna latencia entra en el paso fijo (FR-016).
  const assets = await loadAssets(sim.getCircuitDefinition())
  const app = document.getElementById('app') as HTMLElement
  const view = new SceneView(app, sim.getCircuitDefinition(), assets, { decor: !circuitDef && !daily })
  view.resize()

  const camera = new FollowCamera(view.aspect)
  // Accesibilidad (004 · US3): reduce el movimiento de cámara si la preferencia o el sistema lo pide.
  camera.reducedMotion =
    config.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const hudEl = document.getElementById('hud') as HTMLElement
  const hud = new Hud(hudEl)
  // HUD del circuito diario (006 · US2/US3): procedencia + cuenta atrás + mejor marca. Solo vista.
  const dailyHud = daily ? new DailyHud(document.body, daily, loadBest(daily.dayUTC, daily.structuralHash)) : null
  const input = new Input(view.renderer.domElement)
  let loop = createLoopState()

  // Audio (005): vista de render fuera del paso fijo. Detecta eventos del estado y los reproduce.
  const audio = new AudioManager()
  audio.init()
  void audio.preload() // no bloquea el arranque; degrada en silencio si falla
  // Ajustes (007 · US4): cargar y aplicar preferencias persistidas (volúmenes + sensibilidad) al arrancar.
  settings.bind(audio)
  settings.load()
  const audioThresholds = {
    jumpVy: config.audio.jumpVyThreshold,
    hitKnockback: config.audio.hitKnockbackThreshold,
    respawnDist: config.audio.respawnDistThreshold,
  }
  let prevSnap: AudioSnapshot | null = null

  // --- Shell (007): máquina de estados de pantallas + panel de ajustes. Vista pura. ---
  const shell = new Shell(document.body)
  const settingsPanel = new SettingsPanel(document.body)
  let pausedSince: number | null = null
  let resultRecorded = false
  let debug = new URLSearchParams(location.search).has('debug') // ?debug arranca el overlay (capturas)

  // Empieza un intento NUEVO (título→jugar, volver a jugar, reiniciar): re-ancla el bucle para que el
  // tiempo fuera de juego NO genere pasos espurios (clamp MAX_SUBSTEPS), resetea la simulación
  // directamente (el flanco `restart` no se consumiría con un ancla nuevo) y desbloquea el audio.
  const startFreshAttempt = (): void => {
    sim.restart()
    loop = createLoopState()
    input.clearEdges()
    pausedSince = null
    resultRecorded = false
    prevSnap = null
    audio.resume() // autoplay: el audio arranca con la primera interacción (gesto "Jugar")
    audio.startMusic()
    input.requestLock()
    shell.toPlaying()
  }

  const pauseGame = (): void => {
    if (shell.screen !== 'playing') return
    pausedSince = performance.now() / 1000 // SEGUNDOS, mismo reloj que advance
    input.clearEdges() // que el gesto de reanudar no dispare un salto colgado (FR-008)
    if (document.pointerLockElement) document.exitPointerLock()
    shell.toPaused()
  }

  const resumeGame = (): void => {
    if (shell.screen !== 'paused') return
    if (pausedSince !== null) {
      pauseShift(loop, performance.now() / 1000 - pausedSince) // absorbe la pausa: 0 pasos en el hueco
      pausedSince = null
    }
    input.clearEdges()
    prevSnap = null
    input.requestLock()
    shell.toPlaying()
  }

  const goToTitle = (): void => {
    // FR-024a: si cambió el día UTC mientras el shell estaba abierto, recoger el circuito del día
    // nuevo recargando (re-resuelve en el boot: caché-first → red → offline). El siguiente "Jugar"
    // usa el circuito de hoy. (Implementación: reload en vez de rebuild in-place; ver research R2.)
    if (daily && utcDay(Math.floor(Date.now() / 1000)) !== daily.dayUTC) {
      location.reload()
      return
    }
    pausedSince = null
    if (document.pointerLockElement) document.exitPointerLock()
    shell.toTitle()
  }

  // Cableado de intenciones del shell → trabajo del host + transición.
  shell.onPlay = startFreshAttempt
  shell.onRestart = startFreshAttempt
  shell.onResume = resumeGame
  shell.onToTitle = goToTitle
  shell.onOpenSettings = () => {
    settingsPanel.setDebugState(debug)
    settingsPanel.open()
  }
  settingsPanel.onToggleDebug = (on) => {
    debug = on
  }

  // Todo listo (sim + escena + assets + shell): retirar la pantalla de arranque estática (#boot).
  document.getElementById('boot')?.remove()

  // Modo captura (?shot): salta el título directo al escenario para pantallazos limpios (ruta dev,
  // FR-023). El jugador SIEMPRE pasa por el título.
  if (new URLSearchParams(location.search).has('shot')) startFreshAttempt()
  else shell.toTitle()

  window.addEventListener('resize', () => {
    view.resize()
    camera.resize(view.aspect)
  })

  // Disparadores de pausa (FR-007a/FR-009):
  // - escritorio: tecla de pausa (P/Esc) y salida de pointer lock (Esc del navegador) durante el juego.
  // - cualquier plataforma (móvil incluido): pérdida de foco / pestaña oculta → auto-pausa.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB') debug = !debug // debug físicas (vista; ignorado por el StepInput determinista)
    else if (e.code === config.audio.muteKey) settings.setMuted(!settings.muted) // persiste el silencio
    else if (e.code === 'KeyP') {
      // Pausa explícita por teclado. El Esc del navegador suelta el pointer lock y la pausa la dispara
      // `pointerlockchange` (evita el doble manejo: Esc→soltar lock→pausa, y el keydown reanudaría).
      if (shell.screen === 'playing') pauseGame()
      else if (shell.screen === 'paused' && !settingsPanel.isOpen) resumeGame()
    }
  })
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && shell.screen === 'playing' && input.activeScheme !== 'touch') {
      pauseGame()
    }
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && shell.screen === 'playing') pauseGame()
  })

  // Cámara de inspección (?look=<z>): enfoca un punto del circuito desde un 3/4. Solo dev/capturas.
  const lookParam = new URLSearchParams(location.search).get('look')
  const lookZ = lookParam !== null && lookParam !== '' ? Number(lookParam) : null

  let lastRenderMs = performance.now()
  const frame = (nowMs: number): void => {
    const dtRender = Math.min((nowMs - lastRenderMs) / 1000, 0.1)
    lastRenderMs = nowMs

    // Capturar UNA vez si estábamos en juego: la detección de victoria flipa la pantalla a
    // 'results', pero el bloque de audio debe seguir contando este fotograma como "en juego" para
    // que el flanco running→won dispare el SFX de meta (`finish`) antes del flip (Principio VI).
    const playing = shell.screen === 'playing'

    // El paso fijo SOLO avanza en juego (FR-012): pausa/título/resultados congelan la simulación.
    if (playing) {
      advance(sim, loop, nowMs / 1000, input.getFrameInput(nowMs / 1000))
    }

    const ps = sim.getPlayerState()
    const run = sim.getRunState()

    // Cuenta atrás del circuito diario (siempre); al GANAR, registrar mejor marca y mostrar resultados.
    if (dailyHud) dailyHud.updateCountdown(Date.now())
    if (playing && run.phase === 'won' && !resultRecorded) {
      resultRecorded = true
      const timeMs = Math.round(run.elapsedSimTime * 1000)
      const best = daily ? recordBest(daily, timeMs) : null
      const isNewBest = !!best && best.bestTimeMs === timeMs
      if (dailyHud && best) dailyHud.setBest(best)
      shell.toResults({
        timeMs,
        bestMs: best?.bestTimeMs ?? null,
        isNewBest,
        competitive: daily?.competitive ?? false,
      })
      if (document.pointerLockElement) document.exitPointerLock()
    }

    // Audio: detectar eventos por transiciones del estado muestreado del fotograma en juego (incluye
    // el de victoria). No toca la simulación. `playing` se capturó ANTES del flip a 'results'.
    if (playing) {
      const snap = snapshotOf(ps, run)
      for (const ev of detectAudioEvents(prevSnap, snap, audioThresholds)) audio.play(ev)
      prevSnap = snap
    }

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
    if (hasCannons) view.updateCannons(sim.getCannonViews(), sim.getProjectiles())
    view.updatePlayerAnimation(ps.isGrounded, dtRender)
    view.setDebug(debug ? sim.getDebugRender() : null)
    hud.update(run, input.activeScheme)
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
