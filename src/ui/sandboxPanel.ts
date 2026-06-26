// Panel de la pantalla de depuración (DEV-ONLY, 006). SOLO vista: un overlay con el índice de
// escenas (enlaces a #/sandbox/<name>) y, para la escena activa, sliders que ajustan EN VIVO sus
// parámetros (cada slider muta config vía get/set; el sim lo lee en el siguiente paso). Cambiar de
// escena navega por hash; main.ts recarga al cambiar (dev). No entra en el build de producción.

import type { SandboxScene, TuningParam } from '../sandbox/types'

export class SandboxPanel {
  constructor(parent: HTMLElement, scenes: { name: string; title: string }[], active: SandboxScene | null) {
    const root = document.createElement('div')
    root.id = 'sandbox-panel'
    root.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:30;width:260px;max-height:92vh;overflow:auto;' +
      'padding:10px 12px;border-radius:10px;background:rgba(20,35,59,0.82);color:#fff;' +
      'font:12px/1.45 system-ui,sans-serif;backdrop-filter:blur(4px)'

    const title = document.createElement('div')
    title.innerHTML = '<strong>🧪 Sandbox</strong>' + (active ? ` · ${active.title}` : ' · índice')
    title.style.marginBottom = '6px'
    root.appendChild(title)

    // --- Índice de escenas (enlaces; el activo resaltado) ---
    const menu = document.createElement('div')
    menu.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px'
    for (const s of scenes) {
      const a = document.createElement('a')
      a.href = `#/sandbox/${s.name}`
      a.textContent = s.title.replace(/\s*\(.*\)/, '') // título corto (sin el paréntesis técnico)
      const isActive = active?.name === s.name
      a.style.cssText =
        'padding:3px 7px;border-radius:6px;text-decoration:none;font-size:11px;' +
        (isActive ? 'background:#ff5fa2;color:#14233b;font-weight:600' : 'background:rgba(255,255,255,0.14);color:#fff')
      menu.appendChild(a)
    }
    root.appendChild(menu)

    // --- Sliders en vivo de la escena activa ---
    if (active?.tuning?.length) {
      const head = document.createElement('div')
      head.textContent = 'Ajustes (en vivo)'
      head.style.cssText = 'opacity:0.85;margin:2px 0 4px;border-top:1px solid rgba(255,255,255,0.15);padding-top:6px'
      root.appendChild(head)
      for (const p of active.tuning) root.appendChild(this.buildRow(p))

      const note = document.createElement('div')
      note.textContent = 'Geometría/tamaño → recarga (Ctrl+Shift+R). Esc libera el ratón para tocar el panel.'
      note.style.cssText = 'opacity:0.6;font-size:10px;margin-top:6px'
      root.appendChild(note)
    } else if (active) {
      const none = document.createElement('div')
      none.textContent = 'Sin parámetros en vivo para esta escena.'
      none.style.opacity = '0.6'
      root.appendChild(none)
    }

    parent.appendChild(root)
  }

  private buildRow(p: TuningParam): HTMLElement {
    const row = document.createElement('div')
    row.style.cssText = 'margin:5px 0'
    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;font-size:11px'
    const label = document.createElement('span')
    label.textContent = p.label
    const value = document.createElement('span')
    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(p.min)
    input.max = String(p.max)
    input.step = String(p.step)
    input.value = String(p.get())
    input.style.cssText = 'width:100%;accent-color:#ff5fa2'
    value.textContent = input.value
    input.addEventListener('input', () => {
      const v = Number(input.value)
      p.set(v) // muta config → el sim lo lee en el siguiente paso (en vivo)
      value.textContent = input.value
    })
    top.append(label, value)
    row.append(top, input)
    return row
  }
}
