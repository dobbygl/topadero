// Panel de ajustes (007 · US4). Overlay modal accesible desde el título y desde la pausa (FR-015).
// Vista pura: muta `settings`/`inputPrefs` y aplica en caliente (FR-016); no toca src/sim. El toggle
// de debug de físicas es estado de SESIÓN (no se persiste; arranca apagado, FR-018) y lo gobierna el
// host vía callback. La reasignación de entrada reusa rebindKey de la spec 004 (FR-017).

import { settings } from '../settings/settings'
import { inputPrefs, rebindKey, type BindableAction } from '../input/preferences'

const ACTIONS: { action: BindableAction; label: string }[] = [
  { action: 'forward', label: 'Adelante' },
  { action: 'back', label: 'Atrás' },
  { action: 'left', label: 'Izquierda' },
  { action: 'right', label: 'Derecha' },
  { action: 'jump', label: 'Saltar' },
  { action: 'restart', label: 'Reiniciar' },
]

function row(labelText: string, control: HTMLElement): HTMLElement {
  const r = document.createElement('label')
  r.className = 'settings-row'
  const span = document.createElement('span')
  span.textContent = labelText
  r.append(span, control)
  return r
}

export class SettingsPanel {
  private readonly root: HTMLElement
  private readonly debugCheck: HTMLInputElement
  private rebinding: { action: BindableAction; btn: HTMLButtonElement } | null = null

  /** El host abre/cierra el panel; estos callbacks reflejan/controlan el toggle de debug (sesión). */
  onClose: () => void = () => {}
  onToggleDebug: (on: boolean) => void = () => {}

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div')
    this.root.id = 'settings-panel'
    this.root.className = 'shell-screen'

    const card = document.createElement('div')
    card.className = 'settings-card'
    const h = document.createElement('h2')
    h.textContent = 'Ajustes'
    card.append(h)

    // Volúmenes
    card.append(row('Música', this.slider(settings.musicVolume, (v) => settings.setMusicVolume(v))))
    card.append(row('Efectos', this.slider(settings.sfxVolume, (v) => settings.setSfxVolume(v))))
    const mute = document.createElement('input')
    mute.type = 'checkbox'
    mute.checked = settings.muted
    mute.addEventListener('change', () => settings.setMuted(mute.checked))
    card.append(row('Silenciar', mute))

    // Sensibilidad e inversión
    card.append(
      row(
        'Sensibilidad',
        this.slider(inputPrefs.cameraSensitivity, (v) => settings.setCameraSensitivity(v), 0.2, 3, 0.1),
      ),
    )
    const invY = document.createElement('input')
    invY.type = 'checkbox'
    invY.checked = inputPrefs.invertCameraY
    invY.addEventListener('change', () => settings.setInvertCameraY(invY.checked))
    card.append(row('Invertir eje Y', invY))

    // Debug de físicas (sesión, no persistido)
    this.debugCheck = document.createElement('input')
    this.debugCheck.type = 'checkbox'
    this.debugCheck.addEventListener('change', () => this.onToggleDebug(this.debugCheck.checked))
    card.append(row('Debug de físicas', this.debugCheck))

    // Reasignación de controles (reusa rebindKey, 004)
    const rebindTitle = document.createElement('h3')
    rebindTitle.textContent = 'Controles'
    rebindTitle.className = 'settings-subtitle'
    card.append(rebindTitle)
    for (const { action, label } of ACTIONS) card.append(this.rebindRow(action, label))

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'shell-btn primary'
    close.textContent = 'Cerrar'
    close.addEventListener('click', () => this.close())
    card.append(close)

    this.root.append(card)
    parent.appendChild(this.root)

    // Captura de tecla para la reasignación en curso.
    window.addEventListener('keydown', this.onKeyDown, true)
  }

  private slider(value: number, onInput: (v: number) => void, min = 0, max = 1, step = 0.05): HTMLInputElement {
    const s = document.createElement('input')
    s.type = 'range'
    s.min = String(min)
    s.max = String(max)
    s.step = String(step)
    s.value = String(value)
    s.addEventListener('input', () => onInput(Number(s.value)))
    return s
  }

  private rebindRow(action: BindableAction, label: string): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'shell-btn rebind'
    btn.textContent = this.keyLabel(action)
    btn.addEventListener('click', () => {
      this.rebinding = { action, btn }
      btn.textContent = 'Pulsa una tecla…'
    })
    return row(label, btn)
  }

  private keyLabel(action: BindableAction): string {
    return (inputPrefs.keys[action][0] ?? '—').replace(/^Key|^Arrow/, '')
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.rebinding) return
    e.preventDefault()
    e.stopPropagation()
    if (e.code !== 'Escape') {
      rebindKey(this.rebinding.action, e.code)
      settings.save()
    }
    this.rebinding.btn.textContent = this.keyLabel(this.rebinding.action)
    this.rebinding = null
  }

  /** Refleja el estado de debug actual (sesión) al abrir. */
  setDebugState(on: boolean): void {
    this.debugCheck.checked = on
  }

  open(): void {
    this.root.classList.add('show')
  }

  close(): void {
    this.rebinding = null
    this.root.classList.remove('show')
    this.onClose()
  }

  get isOpen(): boolean {
    return this.root.classList.contains('show')
  }
}
