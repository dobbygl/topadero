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
  private musicSource: AudioBufferSourceNode | null = null
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

  startMusic(): void {
    if (!this.ctx || this.musicSource) return
    const buf = this.buffers.get(config.audio.music)
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(this.musicGain)
    src.start()
    this.musicSource = src
  }

  stopMusic(): void {
    this.musicSource?.stop()
    this.musicSource = null
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
