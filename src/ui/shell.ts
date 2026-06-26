// Shell de juego (007). Máquina de estados de presentación (title|playing|paused|results) como
// VISTA PURA (Principio III): construye sus pantallas sobre document.body, observa el run state vía
// el host y emite INTENCIÓN por callbacks; NO contiene lógica que altere la física. src/sim no la
// importa. El host (main.ts) decide qué hace cada intención (re-anclar bucle, pauseShift, audio,
// pointer lock) y llama a las transiciones de aquí. El bucle solo avanza cuando screen==='playing'.

export type ShellScreen = 'title' | 'playing' | 'paused' | 'results'

export interface ShellResult {
  timeMs: number
  bestMs: number | null
  isNewBest: boolean
  competitive: boolean
}

/** Formatea ms a m:ss.cc (o ss.cc bajo un minuto) para mostrar en resultados. */
export function formatTime(ms: number): string {
  const totalCs = Math.round(ms / 10)
  const cs = totalCs % 100
  const totalS = Math.floor(totalCs / 100)
  const s = totalS % 60
  const m = Math.floor(totalS / 60)
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0')
  return m > 0 ? `${m}:${pad(s)}.${pad(cs)}` : `${s}.${pad(cs)} s`
}

function button(label: string, cls = ''): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = `shell-btn ${cls}`.trim()
  b.textContent = label
  b.type = 'button'
  return b
}

export class Shell {
  private _screen: ShellScreen = 'title'
  private readonly root: HTMLElement
  private readonly titleEl: HTMLElement
  private readonly pauseEl: HTMLElement
  private readonly resultsEl: HTMLElement
  private readonly resTime: HTMLElement
  private readonly resBest: HTMLElement
  private readonly resBadge: HTMLElement

  // Intenciones (las cablea el host). El host hace el trabajo y llama a la transición correspondiente.
  onPlay: () => void = () => {}
  onResume: () => void = () => {}
  onRestart: () => void = () => {}
  onToTitle: () => void = () => {}
  onOpenSettings: () => void = () => {}

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div')
    this.root.id = 'shell'

    // --- Título ---
    this.titleEl = document.createElement('section')
    this.titleEl.className = 'shell-screen shell-title'
    const h1 = document.createElement('h1')
    h1.className = 'shell-logo'
    h1.textContent = 'TOPADERO'
    const hint = document.createElement('p')
    hint.className = 'shell-hint'
    hint.innerHTML =
      'Mover: <b>WASD</b> / stick · Saltar: <b>Espacio</b> / A · Cámara: ratón / stick / arrastre'
    const playBtn = button('Jugar', 'primary')
    playBtn.addEventListener('click', () => this.onPlay())
    const titleSettings = button('Ajustes')
    titleSettings.addEventListener('click', () => this.onOpenSettings())
    this.titleEl.append(h1, hint, playBtn, titleSettings)

    // --- Pausa ---
    this.pauseEl = document.createElement('section')
    this.pauseEl.className = 'shell-screen shell-pause'
    const ph = document.createElement('h2')
    ph.textContent = 'Pausa'
    const resumeBtn = button('Reanudar', 'primary')
    resumeBtn.addEventListener('click', () => this.onResume())
    const restartBtn = button('Reiniciar intento')
    restartBtn.addEventListener('click', () => this.onRestart())
    const pauseSettings = button('Ajustes')
    pauseSettings.addEventListener('click', () => this.onOpenSettings())
    const quitBtn = button('Salir al título')
    quitBtn.addEventListener('click', () => this.onToTitle())
    this.pauseEl.append(ph, resumeBtn, restartBtn, pauseSettings, quitBtn)

    // --- Resultados ---
    this.resultsEl = document.createElement('section')
    this.resultsEl.className = 'shell-screen shell-results'
    const rh = document.createElement('h2')
    rh.textContent = '¡Meta!'
    this.resBadge = document.createElement('div')
    this.resBadge.className = 'shell-badge'
    this.resBadge.textContent = '¡Nueva mejor marca!'
    this.resTime = document.createElement('div')
    this.resTime.className = 'shell-time'
    this.resBest = document.createElement('div')
    this.resBest.className = 'shell-best'
    const replayBtn = button('Volver a jugar', 'primary')
    replayBtn.addEventListener('click', () => this.onRestart())
    const resTitleBtn = button('Título')
    resTitleBtn.addEventListener('click', () => this.onToTitle())
    this.resultsEl.append(rh, this.resBadge, this.resTime, this.resBest, replayBtn, resTitleBtn)

    this.root.append(this.titleEl, this.pauseEl, this.resultsEl)
    parent.appendChild(this.root)
    this.render()
  }

  get screen(): ShellScreen {
    return this._screen
  }

  toTitle(): void {
    this._screen = 'title'
    this.render()
  }

  toPlaying(): void {
    this._screen = 'playing'
    this.render()
  }

  toPaused(): void {
    this._screen = 'paused'
    this.render()
  }

  toResults(result: ShellResult): void {
    this._screen = 'results'
    this.resTime.textContent = formatTime(result.timeMs)
    this.resBadge.classList.toggle('show', result.isNewBest)
    if (result.bestMs !== null) {
      const tag = result.competitive ? '' : ' (offline)'
      this.resBest.textContent = `Mejor del día: ${formatTime(result.bestMs)}${tag}`
    } else {
      this.resBest.textContent = ''
    }
    this.render()
  }

  /** Muestra solo la pantalla activa y publica el estado en el body (CSS oculta el HUD fuera de juego). */
  private render(): void {
    this.titleEl.classList.toggle('show', this._screen === 'title')
    this.pauseEl.classList.toggle('show', this._screen === 'paused')
    this.resultsEl.classList.toggle('show', this._screen === 'results')
    document.body.dataset.screen = this._screen
  }
}
