# Research — Audio (Fase 0)

Decisiones de diseño previas al Phase 1. Hilo conductor: el audio es una vista de render que lee el
estado de solo lectura de la simulación; `src/sim/` no se toca y el determinismo no cambia.

## R1 — Detección de eventos sin tocar la simulación

- **Decisión**: detectar los eventos de audio en el tiempo de render comparando el snapshot del
  estado del fotograma anterior con el actual (función pura `detectAudioEvents(prev, actual)`):
  - **meta**: `RunStateView.phase` pasa de `running` a `won`.
  - **aterrizaje**: `PlayerStateView.isGrounded` pasa de `false` a `true`.
  - **salto**: en el flanco apoyado→aire (`isGrounded` true→false) con `verticalVelocity` claramente
    positiva (umbral en `config.ts`); distingue el salto de caerse de un borde (vy ~0/negativa).
  - **golpe**: la magnitud del knockback (`PlayerStateView.velocity.x/z`) cruza al alza un umbral
    desde ~0 (aparición del empuje del obstáculo).
  - **reaparición**: discontinuidad de posición entre fotogramas mayor que un umbral (teletransporte
    del respawn).
- **Razón**: cero cambios en `src/sim/` (más limpio que exponer flags), respeta la frontera headless
  y deja el determinismo intacto. Para SFX (cosmético, tiempo de render) una detección por muestreo
  es suficiente.
- **Alternativas**: exponer flags de evento desde el estado del sim (válido y fiable, pero toca el
  sim sin necesidad); usar los flancos del `FrameInput` para el salto (marca "pulsado", no "salto
  ejecutado" con buffer/coyote, peor para el SFX).

## R2 — Reproducción con Web Audio API

- **Decisión**: un `AudioManager` sobre `AudioContext`. SFX como `AudioBuffer` precargados y
  reproducidos con `AudioBufferSourceNode` (baja latencia, permite solapado). Música como fuente en
  bucle (`AudioBufferSourceNode.loop` o un `<audio loop>`). Grafo de ganancias: `master` → {`music`,
  `sfx`} para volúmenes independientes (FR-003) y silencio (FR-002).
- **Razón**: la Web Audio API es nativa (sin dependencias), da control de volumen por nodo y
  solapado de efectos sin cortes (FR-005), y va por completo en el tiempo de render.
- **Alternativas**: solo `HTMLAudioElement` (más simple pero peor para SFX solapados y latencia);
  librería de audio de juego (dependencia innecesaria para este alcance).

## R3 — Política de autoplay (arranque tras interacción)

- **Decisión**: crear el `AudioContext` en estado `suspended` y llamar a `resume()` en la primera
  interacción del usuario (el clic/tecla/toque que ya inicia el juego, p. ej. el "Toca o haz clic
  para jugar"). Hasta entonces, silencio sin error.
- **Razón**: cumple FR-007 y las políticas de autoplay de los navegadores sin condicionar la
  jugabilidad.

## R4 — Formatos y peso de assets

- **Decisión**: servir cada sonido/música en `.ogg`/`.webm` (Opus/Vorbis, ligero) con respaldo
  `.mp3` (universal). Cargar por `fetch` + `decodeAudioData`, eligiendo el formato soportado. SFX
  cortos (pocos kB); la música, un loop comprimido.
- **Razón**: cubre todos los navegadores objetivo manteniendo el peso bajo (FR-012); el coste de
  decodificación es puntual en la precarga.
- **Alternativas**: solo `.mp3` (universal pero peor compresión); solo `.ogg` (no cubre algún
  navegador). El doble formato es el estándar seguro.

## R5 — Generación de SFX (dev) y origen de la música

- **Decisión**: script de dev `scripts/gen-sfx.ts` (fuera del runtime/build) que lee
  `ELEVENLABS_API_KEY` de `.env`, genera cada SFX desde `prompts/audio-sfx.prompt` con el endpoint
  `sound-generation` (cuenta Starter, licencia comercial verificada) y los convierte a `.ogg`/`.mp3`
  (con `ffmpeg` si está disponible) en `public/audio/`. La música de juego se obtiene a mano de una
  fuente **CC0/royalty-free** y se coloca en `public/audio/`, con sus créditos registrados.
- **Razón**: reproducible y con licencia limpia; la clave nunca entra en el build (solo dev). La
  música por IA no es fiable para loops; CC0 es limpio y loopable.
- **Alternativas**: generar a mano cada SFX en la web de ElevenLabs (no reproducible); música por
  ElevenLabs (licencia más restrictiva y loop torpe).

## R6 — Volumen y silencio

- **Decisión**: `GainNode` de master, música y SFX. Una **tecla de silencio** global (p. ej. `M`)
  conmuta el gain master entre 0 y su valor; volúmenes de música y SFX como valores en `config.ts`.
  Un objeto de preferencias en memoria (`musicVolume`, `sfxVolume`, `muted`) es el **seam** que la UI
  del shell (006) y la persistencia (007) consumirán.
- **Razón**: cumple FR-002/FR-003 con lo mínimo accesible y deja el enganche para el shell, sin UI de
  sliders en esta iteración (decisión de clarify).

## R7 — Degradación con elegancia

- **Decisión**: si no hay `AudioContext` o un asset falla al cargar/decodificar, el `AudioManager`
  pasa a no-op para esa pista; el juego sigue plenamente jugable en silencio. El bloqueo por autoplay
  no es un fallo: se espera a la interacción.
- **Razón**: FR-013; el audio es una mejora, no una dependencia para jugar.

## R8 — Determinismo y frontera (cómo se mantiene)

- **Decisión**: el `AudioManager` y el detector de eventos viven en `src/audio/` y se cablean en el
  bucle de render de `main.ts`; **no se modifica `src/sim/`** ni el paso fijo. El detector es una
  función pura de `(prev, actual)` snapshots, testeable en aislamiento. La puerta de determinismo
  (`tests/determinism.test.ts`) **no cambia** y debe seguir en verde.
- **Razón**: cumple FR-008/FR-009 por construcción: el audio reacciona al estado, nunca lo altera.

## Resumen para Fase 1

- Entidades → `data-model.md` (SFX, música, preferencias de audio, evento de audio, snapshot previo).
- Contrato de la capa de audio → `contracts/audio-contract.md`.
- Sin NEEDS CLARIFICATION pendientes: las decisiones abiertas (alcance de efectos, control de volumen
  mínimo, pistas de música) se cerraron en `/speckit-clarify`.
