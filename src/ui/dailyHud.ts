// HUD mínimo del circuito diario (006 · US2/US3). SOLO vista: muestra la procedencia (verificable),
// la etiqueta competitivo/offline, la cuenta atrás al próximo circuito (00:00 UTC) y la mejor marca
// local del día. La integración pulida (menús, historial) se coordina con la spec del shell. No toca
// el paso fijo ni la simulación.

import type { DailyCircuit, LocalDailyBest } from '../daily/daily'

const pad = (n: number): string => String(n).padStart(2, '0')

/** ms hasta el próximo 00:00 UTC desde `nowMs`. */
function msToNextUtcMidnight(nowMs: number): number {
  const d = new Date(nowMs)
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0)
  return Math.max(0, next - nowMs)
}

function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export class DailyHud {
  private readonly root: HTMLElement
  private readonly countdownEl: HTMLElement
  private readonly bestEl: HTMLElement

  constructor(parent: HTMLElement, daily: DailyCircuit, best: LocalDailyBest | null) {
    this.root = document.createElement('div')
    this.root.id = 'daily-hud'
    this.root.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:20;max-width:46vw;padding:8px 10px;border-radius:10px;' +
      'background:rgba(20,35,59,0.62);color:#fff;font:12px/1.4 system-ui,sans-serif;text-align:right;' +
      'pointer-events:none;backdrop-filter:blur(3px)'

    const label = daily.competitive ? 'Competitivo' : 'Offline · no competitivo'
    const labelColor = daily.competitive ? '#8bd936' : '#ff7a1a'
    const prov = daily.provenance
    const provLine = prov
      ? `bloque #${prov.height} · ${prov.hash.slice(0, 8)}…${prov.hash.slice(-6)}`
      : 'seed local de la fecha'

    const title = document.createElement('div')
    title.innerHTML =
      `<strong>Circuito de ${daily.dayUTC}</strong> · <span style="color:${labelColor}">${label}</span>`
    const provEl = document.createElement('div')
    provEl.style.opacity = '0.85'
    provEl.textContent = `${provLine} · gen v${daily.generatorVersion}`

    this.countdownEl = document.createElement('div')
    this.countdownEl.style.opacity = '0.85'
    this.bestEl = document.createElement('div')
    this.bestEl.style.marginTop = '2px'

    this.root.append(title, provEl, this.countdownEl, this.bestEl)
    parent.appendChild(this.root)

    this.setBest(best)
  }

  /** Actualiza la cuenta atrás al próximo circuito (llamar por fotograma o ~1/s). */
  updateCountdown(nowMs: number): void {
    this.countdownEl.textContent = `Próximo circuito en ${fmtCountdown(msToNextUtcMidnight(nowMs))}`
  }

  /** Refresca la mejor marca local del día. */
  setBest(best: LocalDailyBest | null): void {
    if (!best) {
      this.bestEl.textContent = 'Mejor marca: —'
      return
    }
    const tag = best.competitive ? '' : ' (offline)'
    this.bestEl.textContent = `Mejor marca: ${(best.bestTimeMs / 1000).toFixed(2)} s${tag}`
  }
}
