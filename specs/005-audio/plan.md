# Implementation Plan: Audio (efectos y música)

**Branch**: `005-audio` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-audio/spec.md`

## Summary

Añadir audio al juego: efectos de las acciones núcleo (salto, aterrizaje, golpe del obstáculo,
meta) + reaparición, una música de fondo loopable, y un control de silencio/volumen. El enfoque
mantiene la simulación **intacta**: la capa de audio (`src/audio/`) lee el estado de solo lectura
de la simulación en el tiempo de render y **detecta los eventos por transiciones** del estado
muestreado (cambio de fase para la meta, flanco de apoyo para el aterrizaje, aparición de knockback
para el golpe, velocidad vertical desde apoyado para el salto, discontinuidad de posición para la
reaparición). Reproduce los sonidos con la Web Audio API (nodos de ganancia para volúmenes y
silencio separados) fuera del paso fijo. Así el determinismo (Principio II) **no se toca**: la
puerta sigue en verde sin cambios y `src/sim/` no se modifica. Los SFX se generan en dev con
licencia comercial (ElevenLabs Starter) y la música es CC0/royalty-free; todo se sirve como web
estática.

## Technical Context

**Language/Version**: TypeScript (proyecto Vite); Node 22 en CI.
**Primary Dependencies**: Three.js y Rapier (existentes; sin cambios). Audio en runtime: **Web Audio
API** del navegador (sin nuevas dependencias). Generación de assets en **dev** (fuera del runtime):
un script que usa ElevenLabs para los SFX (lee `ELEVENLABS_API_KEY` de `.env`); la música se obtiene
a mano de fuentes CC0. La clave nunca entra en el build.
**Storage**: N/A. Las preferencias de audio (volúmenes, silencio) viven en memoria + defaults de
`config.ts`; su guardado entre sesiones lo aporta la spec de persistencia (007).
**Testing**: Vitest. La puerta de determinismo (`tests/determinism.test.ts`) **no cambia** porque
`src/sim/` no se toca; debe seguir en verde. Test unitario opcional del detector de eventos (función
pura de dos snapshots de estado).
**Target Platform**: navegador de escritorio y móvil (web), v2.1.0; sin backend.
**Performance Goals**: >= 60 FPS escritorio / >= 30 FPS móvil; el audio (decodificar + reproducir) es
ligero y va fuera del paso fijo.
**Constraints**: el audio se reproduce FUERA del paso fijo y no introduce no-determinismo; frontera
headless (`src/sim/` no importa audio ni carga assets; la capa de audio lee estado de solo lectura);
ajuste en `config.ts`; web estática sin backend; SFX con licencia comercial verificada y música
CC0/royalty-free.
**Scale/Scope**: un juego; en esta iteración ~5 efectos (salto, aterrizaje, golpe, meta, reaparición)
+ 1 música de juego en bucle + control de silencio/volúmenes. El resto de efectos (menú/pausa/"nueva
marca") se difieren a shell (006) y persistencia (007).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design (ver abajo).*

- **I. La sensación de juego manda** — PASA. El audio es aditivo; no degrada el control validado
  (FR-015). Puerta = prueba de juego manual.
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — PASA, y de forma fuerte: el audio es
  una vista de render que lee estado de solo lectura; **`src/sim/` no se modifica**, así que el test
  de determinismo no cambia y sigue en verde sin tocar tolerancias (FR-008). La detección de eventos
  es una función pura de dos snapshots; no realimenta la simulación.
- **III. Alcance de producto y disciplina de acabado** — PASA. El audio entra en alcance con la
  v2.0.0. La capa vive en `src/audio/` (nueva), lee el estado de la simulación y NO carga assets
  dentro de `sim/`; `src/sim/` no importa audio. Web estática, sin backend ni CDN propio. La UI de
  volumen (shell) y el guardado de preferencias (persistencia) se difieren.
- **IV. Rebanadas verticales jugables** — PASA. US1 (SFX núcleo + silencio) es el MVP independiente;
  US2 (música) encima; US3 (secundarios) se difiere a shell/persistencia.
- **V. Comportamiento sobre cifras: config.ts** — PASA. Volúmenes (música/SFX), silencio por defecto,
  rutas de assets, política de arranque y umbrales del detector de eventos van a `config.ts`.
- **VI. Acabado de producto publicable** — PASA en su parte aplicable: audio + control de volumen
  accesible. La UI completa de ajustes corresponde al shell.

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño confina el audio a `src/audio/` + assets en
`public/`, sin tocar `src/sim/` ni el paso fijo. Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/005-audio/
├── plan.md
├── research.md          # Fase 0 (detección de eventos, Web Audio, formatos, generación, autoplay)
├── data-model.md        # Fase 1 (SFX, música, preferencias, evento de audio, snapshot previo)
├── quickstart.md        # Fase 1 (prueba manual: oír efectos, loop, silencio, volúmenes, offline)
├── contracts/
│   └── audio-contract.md  # Fase 1 (contrato de la capa de audio y su lectura del estado del sim)
└── checklists/
    └── requirements.md  # Checklist de calidad (de /speckit-specify + clarify)
```

### Source Code (repository root)

```text
src/
├── audio/
│   ├── audio.ts          # NUEVO: AudioManager (Web Audio): carga, SFX, música en bucle, ganancias
│   │                     #        (master/música/SFX), silencio, resume tras 1ª interacción
│   └── events.ts         # NUEVO: detector PURO de eventos de audio a partir de (prev, actual)
│                         #        snapshots del estado (jump/land/hit/finish/respawn)
├── main.ts               # cablear: por fotograma, detectar eventos del estado y reproducir; tecla
│                         # de silencio; resume del AudioContext en la primera interacción
└── config.ts             # volúmenes, silencio por defecto, rutas, política de arranque, umbrales

public/
└── audio/                # assets servidos (juego, /play): sfx_*.ogg/.mp3 + music_gameplay.ogg/.mp3

scripts/
└── gen-sfx.ts            # DEV (no runtime): genera los SFX con ElevenLabs desde prompts/audio-sfx.prompt
                          # y los convierte a formato web; la clave (.env) nunca entra en el build

tests/
├── determinism.test.ts   # SIN CAMBIOS (src/sim no se toca); debe seguir en verde
└── audio/                # (opcional) unit del detector de eventos (función pura)
```

**Structure Decision**: proyecto único existente. El audio vive aislado en `src/audio/`
(AudioManager + detector de eventos puro), cableado desde `src/main.ts` en el bucle de render; los
assets en `public/audio/`; el ajuste en `config.ts`. **`src/sim/` no se modifica** y la puerta de
determinismo no cambia. La generación de SFX es un script de dev (`scripts/gen-sfx.ts`) que no entra
en el runtime ni en el build.

## Complexity Tracking

> Sin violaciones de la constitución que justificar. Sección no aplicable.
