// HUD por overlay DOM: cronómetro, banner de victoria y aviso de reinicio.

import type { RunStateView } from '../types'

export class Hud {
  private readonly timerEl: HTMLElement
  private readonly bannerEl: HTMLElement
  private readonly bannerTimeEl: HTMLElement

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="timer">0.00</div>
      <div class="hint">WASD/flechas: mover · Espacio: saltar · R: reiniciar · ratón: cámara</div>
      <div class="banner"><h1>META</h1><p></p></div>`
    this.timerEl = root.querySelector('.timer') as HTMLElement
    this.bannerEl = root.querySelector('.banner') as HTMLElement
    this.bannerTimeEl = root.querySelector('.banner p') as HTMLElement
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
