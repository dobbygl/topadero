// HUD por overlay DOM: cronómetro, banner de victoria y aviso de reinicio.
// Accesibilidad (004 · US3): escala (hudScale) y alto contraste (hudHighContrast) desde config,
// como capa de vista; no afectan a la simulación ni al determinismo.

import { config } from '../config'
import type { RunStateView } from '../types'

let a11yStyleInjected = false
function injectA11yStyle(): void {
  if (a11yStyleInjected) return
  a11yStyleInjected = true
  const style = document.createElement('style')
  // Se inyecta después del <style> de index.html → gana a igual especificidad (escala/contraste).
  style.textContent = `
    #hud .timer { font-size: calc(28px * var(--hud-scale, 1)); }
    #hud .hint { font-size: calc(13px * var(--hud-scale, 1)); }
    #hud.hud-contrast .timer, #hud.hud-contrast .hint {
      background: #000; color: #fff; border-color: #fff; }
    #hud.hud-contrast .banner { background: rgba(0,0,0,.78); }
    #hud.hud-contrast .banner h1 { color: #fff; }
  `
  document.head.appendChild(style)
}

export class Hud {
  private readonly timerEl: HTMLElement
  private readonly bannerEl: HTMLElement
  private readonly bannerTimeEl: HTMLElement

  constructor(root: HTMLElement) {
    injectA11yStyle()
    root.innerHTML = `
      <div class="timer">0.00</div>
      <div class="hint">WASD/flechas: mover · Espacio: saltar · R: reiniciar · ratón: cámara</div>
      <div class="banner"><h1>META</h1><p></p></div>`
    this.timerEl = root.querySelector('.timer') as HTMLElement
    this.bannerEl = root.querySelector('.banner') as HTMLElement
    this.bannerTimeEl = root.querySelector('.banner p') as HTMLElement

    // Accesibilidad (US3): escala y contraste del HUD.
    root.style.setProperty('--hud-scale', String(config.hudScale))
    root.classList.toggle('hud-contrast', config.hudHighContrast)
  }

  update(run: RunStateView): void {
    this.timerEl.textContent = run.elapsedSimTime.toFixed(2)
    if (run.phase === 'won') {
      this.bannerEl.classList.add('show')
      this.bannerTimeEl.textContent = `Tiempo: ${run.elapsedSimTime.toFixed(2)} s · pulsa R para reintentar`
    } else {
      this.bannerEl.classList.remove('show')
    }
  }
}
