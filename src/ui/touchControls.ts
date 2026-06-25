// Overlay táctil (004 · US1). Solo VISTA: joystick virtual flotante (mitad izquierda), botón de
// salto (abajo-derecha) y la zona de cámara (mitad derecha) la gestiona el adaptador
// (src/input/touch.ts). Visible solo en esquema táctil. No toca la simulación ni el determinismo.

import { config } from '../config'

let styleInjected = false
function injectStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const r = config.touchJoystickRadius
  const s = config.touchJumpButtonSize
  const m = config.touchControlMargin
  const style = document.createElement('style')
  style.textContent = `
    html, body { touch-action: none; overscroll-behavior: none; }
    .tc-root { position: fixed; inset: 0; pointer-events: none; z-index: 50; }
    .tc-joy-base { position: absolute; width: ${r * 2}px; height: ${r * 2}px;
      margin-left: ${-r}px; margin-top: ${-r}px; border-radius: 50%;
      background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.5); display: none; }
    .tc-joy-knob { position: absolute; left: 50%; top: 50%; width: 50%; height: 50%;
      margin-left: -25%; margin-top: -25%; border-radius: 50%; background: rgba(255,255,255,0.55); }
    .tc-jump { position: absolute; right: ${m}px; bottom: ${m}px; width: ${s}px; height: ${s}px;
      border-radius: 50%; background: rgba(255,95,162,0.6); border: 2px solid rgba(255,255,255,0.75);
      color: #fff; font: bold 15px/1 system-ui, sans-serif; display: flex; align-items: center;
      justify-content: center; user-select: none; }
    .tc-jump.pressed { background: rgba(255,95,162,0.95); }
  `
  document.head.appendChild(style)
}

export class TouchControls {
  private readonly root: HTMLDivElement
  private readonly joyBase: HTMLDivElement
  private readonly joyKnob: HTMLDivElement
  private readonly jumpBtn: HTMLDivElement
  private visible = false

  constructor() {
    injectStyle()
    this.root = document.createElement('div')
    this.root.className = 'tc-root'
    this.joyBase = document.createElement('div')
    this.joyBase.className = 'tc-joy-base'
    this.joyKnob = document.createElement('div')
    this.joyKnob.className = 'tc-joy-knob'
    this.joyBase.appendChild(this.joyKnob)
    this.jumpBtn = document.createElement('div')
    this.jumpBtn.className = 'tc-jump'
    this.jumpBtn.textContent = 'SALTO'
    this.root.append(this.joyBase, this.jumpBtn)
    this.root.style.display = 'none'
    document.body.appendChild(this.root)
  }

  setVisible(v: boolean): void {
    if (v === this.visible) return
    this.visible = v
    this.root.style.display = v ? 'block' : 'none'
    if (!v) this.hideJoystick()
  }

  /** ¿El punto cae sobre el botón de salto (abajo-derecha)? */
  hitJump(x: number, y: number): boolean {
    const s = config.touchJumpButtonSize
    const m = config.touchControlMargin
    const cx = window.innerWidth - m - s / 2
    const cy = window.innerHeight - m - s / 2
    return Math.hypot(x - cx, y - cy) <= s / 2
  }

  showJoystick(cx: number, cy: number): void {
    this.joyBase.style.left = `${cx}px`
    this.joyBase.style.top = `${cy}px`
    this.joyKnob.style.transform = 'translate(0px, 0px)'
    this.joyBase.style.display = 'block'
  }

  moveKnob(dx: number, dy: number): void {
    this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`
  }

  hideJoystick(): void {
    this.joyBase.style.display = 'none'
  }

  setJumpPressed(pressed: boolean): void {
    this.jumpBtn.classList.toggle('pressed', pressed)
  }
}
