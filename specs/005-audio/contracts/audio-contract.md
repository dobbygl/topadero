# Contract — Capa de audio (`src/audio`) y su lectura del estado del sim

Define el contrato que la capa de audio DEBE cumplir para añadir sonido sin tocar la simulación ni
el determinismo (Principios II y III). Es el seam que las specs posteriores (shell, persistencia)
consumirán para la UI de volumen y el guardado de preferencias.

## Detector de eventos (función pura)

```
detectAudioEvents(prev: AudioSnapshot | null, actual: AudioSnapshot): AudioEvent[]
```

- `AudioSnapshot`: copia de solo lectura del estado relevante de un fotograma
  (`position`, `isGrounded`, `verticalVelocity`, `velocity` del jugador; `phase` del intento).
- Devuelve los eventos disparados entre `prev` y `actual` (`jump` | `land` | `hit` | `finish` |
  `respawn`).
- **Invariantes**: es PURA (sin estado global, sin efectos); no importa `src/sim/` ni realimenta la
  simulación; con `prev === null` (primer fotograma) no emite eventos.

## AudioManager (Web Audio)

```
init(): void                      // crea el AudioContext (suspended) y el grafo de ganancias
resumeOnUserGesture(): void       // resume() en la primera interacción (autoplay)
preload(): Promise<void>          // carga/decodifica SFX + música; no bloquea el arranque del juego
play(event: AudioEvent): void     // reproduce el SFX del evento (solapado permitido)
startMusic(): void / stopMusic()  // música de juego en bucle
setMusicVolume(v) / setSfxVolume(v) / setMuted(m)   // volúmenes y silencio (seam para el shell)
```

**Invariantes:**

1. **Fuera del paso fijo**: todo ocurre en el tiempo de render / por eventos; el AudioManager NO se
   llama desde el paso fijo de la simulación.
2. **Frontera headless**: `src/audio/` lee el estado de solo lectura de la simulación (vía los
   snapshots que le pasa `main.ts`); NO importa internals de `src/sim/`, y `src/sim/` NO importa
   `src/audio/`.
3. **Determinismo intacto**: el audio no altera el estado de la simulación; `tests/determinism.test.ts`
   no cambia y sigue en verde (Principio II).
4. **Degradación**: si no hay `AudioContext` o un asset falla, los métodos son no-op para esa pista;
   el juego sigue jugable en silencio.
5. **Autoplay**: sin interacción del usuario, el contexto está suspendido y no suena nada (sin error).

## Cableado (en `main.ts`, bucle de render)

```
cada fotograma:
  const snap = snapshot(sim.getPlayerState(), sim.getRunState())
  for (const e of detectAudioEvents(prevSnap, snap)) audio.play(e)
  prevSnap = snap
```

Más: `audio.startMusic()` al empezar a jugar, `audio.resumeOnUserGesture()` en la primera
interacción, y una tecla de silencio que llama a `audio.setMuted(...)`.

## Fuera de este contrato

- La UI de sliders de volumen (shell, 006) y el guardado de preferencias (persistencia, 007): aquí
  solo el seam (`setMusicVolume`/`setSfxVolume`/`setMuted` + un objeto de preferencias en memoria).
- La generación de los assets de SFX (script de dev `scripts/gen-sfx.ts`) y la obtención de la música
  CC0; no son runtime.
