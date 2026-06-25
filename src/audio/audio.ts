// Capa de audio (005). Web Audio API: SFX como buffers (baja latencia, solapado) y música como
// buffer en bucle, con un grafo de ganancias master → {música, SFX} para volúmenes y silencio
// separados. Va por completo en el tiempo de render: NO importa src/sim ni toca el paso fijo. El
// AudioContext arranca suspendido y se reanuda en la primera interacción (autoplay). Si no hay
// AudioContext o un asset falla, los métodos son no-op (el juego sigue jugable en silencio).

import { config } from '../config'
import type { AudioEventKind } from './events'

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }

export class AudioManager {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicGain!: GainNode
  private sfxGain!: GainNode
  private readonly buffers = new Map<string, AudioBuffer>()
  private musicSources: AudioBufferSourceNode[] = []
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private nextMusicStart = 0
  private muted: boolean = config.audio.mutedByDefault

  init(): void {
    try {
      const Ctx = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext
      if (!Ctx) return
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.musicGain = this.ctx.createGain()
      this.sfxGain = this.ctx.createGain()
      this.musicGain.connect(this.master)
      this.sfxGain.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.master.gain.value = this.muted ? 0 : config.audio.master
      this.musicGain.gain.value = config.audio.musicVolume
      this.sfxGain.gain.value = config.audio.sfxVolume
    } catch {
      this.ctx = null // sin audio: el juego sigue en silencio
    }
  }

  /** Precarga SFX + música; no bloquea el arranque y tolera fallos de carga (degradación). */
  async preload(): Promise<void> {
    if (!this.ctx) return
    const names = [...Object.values(config.audio.sfx), config.audio.music]
    await Promise.allSettled(names.map((n) => this.load(n)))
  }

  private async load(name: string): Promise<void> {
    if (!this.ctx) return
    for (const ext of ['ogg', 'mp3']) {
      try {
        const res = await fetch(`${config.audio.dir}${name}.${ext}`)
        if (!res.ok) continue
        this.buffers.set(name, await this.ctx.decodeAudioData(await res.arrayBuffer()))
        return
      } catch {
        // probar el siguiente formato; si ninguno carga, la pista queda en silencio
      }
    }
  }

  /** Reanuda el AudioContext (llamar en la primera interacción del usuario; autoplay). */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(event: AudioEventKind): void {
    if (!this.ctx) return
    const buf = this.buffers.get(config.audio.sfx[event])
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.sfxGain)
    src.start()
  }

  // Bucle de música con crossfade: cada repetición empieza `xf` antes de que acabe la anterior y se
  // funde con ella, así el empalme no tiene corte perceptible (FR-004). Un planificador con lookahead
  // (setInterval) va programando las repeticiones por adelantado con el reloj del AudioContext.
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return
    const buf = this.buffers.get(config.audio.music)
    if (!buf) return
    const xf = Math.min(config.audio.musicCrossfade, buf.duration / 2)
    const period = buf.duration - xf
    this.nextMusicStart = this.ctx.currentTime + 0.1
    const schedule = (): void => {
      if (!this.ctx) return
      while (this.nextMusicStart < this.ctx.currentTime + 1) {
        this.scheduleMusicOnce(buf, this.nextMusicStart, xf)
        this.nextMusicStart += period
      }
    }
    schedule()
    this.musicTimer = setInterval(schedule, 500)
  }

  private scheduleMusicOnce(buf: AudioBuffer, when: number, xf: number): void {
    if (!this.ctx) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const g = this.ctx.createGain()
    src.connect(g)
    g.connect(this.musicGain)
    const end = when + buf.duration
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(1, when + xf)
    g.gain.setValueAtTime(1, end - xf)
    g.gain.linearRampToValueAtTime(0, end)
    src.start(when)
    src.stop(end + 0.05)
    this.musicSources.push(src)
    src.onended = () => {
      this.musicSources = this.musicSources.filter((s) => s !== src)
    }
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    for (const s of this.musicSources) {
      try {
        s.stop()
      } catch {
        // ya detenido
      }
    }
    this.musicSources = []
  }

  setMusicVolume(v: number): void {
    if (this.ctx) this.musicGain.gain.value = v
  }

  setSfxVolume(v: number): void {
    if (this.ctx) this.sfxGain.gain.value = v
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.ctx) this.master.gain.value = m ? 0 : config.audio.master
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }
}
