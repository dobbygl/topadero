// Ajustes del jugador (007 · US4). Capa runtime mutable: defaults desde config.ts (Principio V), y
// el valor ACTUAL persistido en localStorage (FR-019a) reusando los helpers genéricos de
// daily/storage. Unifica los volúmenes de audio con las preferencias de entrada ya existentes
// (input/preferences, 004) en UN solo registro: no se duplica el sistema de guardado. Es vista pura
// (no toca src/sim ni el paso fijo): la sensibilidad escala un input como un remapeo de control; el
// determinismo es función de los StepInput y su puerta usa inputs sintéticos (Principio II intacto).

import { config } from '../config'
import { inputPrefs, type BindableAction } from '../input/preferences'
import { readJSON, writeJSON } from '../daily/storage'
import type { AudioManager } from '../audio/audio'

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

interface PersistedSettings {
  musicVolume: number
  sfxVolume: number
  muted: boolean
  cameraSensitivity: number
  invertCameraX: boolean
  invertCameraY: boolean
  keys: Record<BindableAction, string[]>
}

class Settings {
  // Volúmenes: estado actual; los defaults son los de config.audio. La sensibilidad y los mapeos
  // viven en inputPrefs (004); esta capa los persiste/restaura junto a los volúmenes.
  musicVolume: number = config.audio.musicVolume
  sfxVolume: number = config.audio.sfxVolume
  muted: boolean = config.audio.mutedByDefault
  private audio: AudioManager | null = null

  /** El host enlaza el AudioManager para aplicar los volúmenes en caliente. */
  bind(audio: AudioManager): void {
    this.audio = audio
  }

  /** Carga las preferencias persistidas (si las hay) y las aplica. Degrada con elegancia. */
  load(): void {
    const p = readJSON<Partial<PersistedSettings>>(config.settings.storageKey)
    if (p) {
      if (typeof p.musicVolume === 'number') this.musicVolume = clamp01(p.musicVolume)
      if (typeof p.sfxVolume === 'number') this.sfxVolume = clamp01(p.sfxVolume)
      if (typeof p.muted === 'boolean') this.muted = p.muted
      if (typeof p.cameraSensitivity === 'number') inputPrefs.cameraSensitivity = p.cameraSensitivity
      if (typeof p.invertCameraX === 'boolean') inputPrefs.invertCameraX = p.invertCameraX
      if (typeof p.invertCameraY === 'boolean') inputPrefs.invertCameraY = p.invertCameraY
      if (p.keys) inputPrefs.keys = { ...inputPrefs.keys, ...p.keys }
    }
    this.apply()
  }

  /** Empuja los valores actuales a los sistemas (audio). La sensibilidad la lee Input en vivo. */
  apply(): void {
    this.audio?.setMusicVolume(this.musicVolume)
    this.audio?.setSfxVolume(this.sfxVolume)
    this.audio?.setMuted(this.muted)
  }

  setMusicVolume(v: number): void {
    this.musicVolume = clamp01(v)
    this.audio?.setMusicVolume(this.musicVolume)
    this.save()
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v)
    this.audio?.setSfxVolume(this.sfxVolume)
    this.save()
  }

  setMuted(m: boolean): void {
    this.muted = m
    this.audio?.setMuted(m)
    this.save()
  }

  /** Sensibilidad de cámara (multiplicador sobre la base por dispositivo). Hot-apply: Input la lee. */
  setCameraSensitivity(v: number): void {
    inputPrefs.cameraSensitivity = v
    this.save()
  }

  setInvertCameraY(b: boolean): void {
    inputPrefs.invertCameraY = b
    this.save()
  }

  /** Persiste el registro unificado (volúmenes + sensibilidad + mapeos). Degrada si no hay storage. */
  save(): void {
    const out: PersistedSettings = {
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      cameraSensitivity: inputPrefs.cameraSensitivity,
      invertCameraX: inputPrefs.invertCameraX,
      invertCameraY: inputPrefs.invertCameraY,
      keys: inputPrefs.keys,
    }
    writeJSON(config.settings.storageKey, out)
  }
}

export const settings = new Settings()
