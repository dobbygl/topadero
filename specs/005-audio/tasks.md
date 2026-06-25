---

description: "Task list para 005 — Audio (efectos y música)"
---

# Tasks: Audio (efectos y música)

**Input**: Design documents from `/specs/005-audio/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/audio-contract.md, quickstart.md

**Tests**: NO se modifica la puerta de determinismo (`src/sim/` no se toca); debe seguir en verde sin
cambios. El único test es opcional: unit del detector de eventos (función pura).

**Organization**: tareas agrupadas por historia. Orden de entrega: US1 → US2 → US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1 (SFX núcleo + silencio), US2 (música), US3 (reaparición + puntos diferidos)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Vite). Audio en `src/audio/`, assets servidos en `public/audio/`, script de dev en
`scripts/`. `src/sim/` NO se toca en esta feature.

---

## Phase 1: Setup (infraestructura compartida)

- [X] T001 Añadir las perillas de audio a `src/config.ts`: volúmenes por defecto (música y SFX),
  silencio por defecto, rutas de los assets, y umbrales del detector de eventos (velocidad vertical
  para el salto, knockback para el golpe, discontinuidad de posición para la reaparición).
- [X] T002 [P] Crear los stubs `src/audio/audio.ts` y `src/audio/events.ts` con sus firmas exportadas,
  y la carpeta `public/audio/`.
- [X] T003 [P] Script de DEV `scripts/gen-sfx.ts` (no runtime): lee `ELEVENLABS_API_KEY` de `.env`,
  genera los SFX desde `prompts/audio-sfx.prompt` con el endpoint `sound-generation` y los convierte a
  `.ogg`/`.mp3` en `public/audio/`. La clave nunca entra en el build.

---

## Phase 2: Foundational (prerequisitos bloqueantes)

**Purpose**: el motor de audio, el detector de eventos puro y el cableado de render. Bloquea todas
las historias.

**⚠️ CRITICAL**: ninguna historia empieza hasta que el motor + detector + cableado estén listos.

- [X] T004 Detector de eventos PURO en `src/audio/events.ts`: `detectAudioEvents(prev, actual)` →
  `jump`/`land`/`hit`/`finish`/`respawn` a partir de dos snapshots de estado, usando los umbrales de
  `config.ts`; sin estado global ni efectos; con `prev` nulo no emite (contrato en
  contracts/audio-contract.md).
- [X] T005 `AudioManager` en `src/audio/audio.ts` (Web Audio): `AudioContext` + grafo de ganancias
  master/música/SFX; `resumeOnUserGesture()`; `preload()` no bloqueante (fetch + decode con respaldo
  de formato); `play(event)` con solapado; `startMusic`/`stopMusic`; `setMusicVolume`/`setSfxVolume`/
  `setMuted`; degradación a no-op si no hay `AudioContext` o falla un asset.
- [X] T006 Cablear en `src/main.ts`: por fotograma, construir el snapshot del estado
  (`getPlayerState`/`getRunState`), pasar por `detectAudioEvents` y reproducir; `resume()` del
  `AudioContext` en la primera interacción (clic/tecla/toque que inicia el juego); tecla de silencio
  (p. ej. `M`) → `setMuted`.
- [X] T007 [P] (opcional) Unit test del detector en `tests/audio/events.test.ts` (transiciones
  salto/aterrizaje/golpe/meta/reaparición desde snapshots).

**Checkpoint**: el motor reproduce un sonido ante un evento; `src/sim/` intacto y la puerta de
determinismo sigue en verde sin cambios.

---

## Phase 3: User Story 1 — Oír las acciones núcleo y silenciar (Priority: P1) 🎯 MVP

**Goal**: el jugador oye salto, aterrizaje, golpe y meta en su momento, y puede silenciar/ajustar el
volumen.

**Independent Test**: jugar y oír los cuatro efectos en los momentos correctos; silenciar y comprobar
que enmudece; subir el volumen y que vuelve a oírse (quickstart US1).

- [X] T008 [P] [US1] Generar los SFX núcleo (`jump`, `land`, `hit`, `finish`) con `scripts/gen-sfx.ts`
  (licencia comercial ElevenLabs) en `public/audio/`.
- [X] T009 [US1] Mapear los eventos `jump`/`land`/`hit`/`finish` a sus SFX y reproducirlos en el
  instante correcto (vía el `AudioManager` y las rutas/volúmenes de `config.ts`).
- [ ] T010 [US1] Verificar el control de silencio y el volumen de SFX sobre sonidos reales (la tecla
  de silencio enmudece; el gain de SFX ajusta el volumen).
- [ ] T011 [US1] Prueba de juego manual de US1 (quickstart): los cuatro efectos + silenciar/volumen.

**Checkpoint**: US1 funcional e independiente. MVP de audio.

---

## Phase 4: User Story 2 — Música de fondo (Priority: P2)

**Goal**: una música de juego loopable con su propio volumen, separado del de los efectos, y mezcla
equilibrada.

**Independent Test**: al jugar suena la música en bucle sin corte perceptible; bajar el volumen de
música no afecta a los efectos (y viceversa); con música + efectos a la vez no satura (quickstart US2).

- [X] T012 [P] [US2] Obtener y colocar la música CC0/royalty-free loopable en
  `public/audio/music_gameplay.{ogg,mp3}` y registrar sus créditos/licencia.
- [X] T013 [US2] Reproducir la música en bucle enrutada al gain de música (p. ej. `<audio loop>` vía
  `MediaElementAudioSourceNode`, o `AudioBufferSourceNode.loop`), con volumen independiente del de SFX;
  arranca al empezar a jugar y sigue su bucle a través de respawns sin reiniciarse de golpe.
- [ ] T014 [US2] Prueba de juego manual de US2 (quickstart): loop sin corte, volúmenes independientes,
  mezcla sin saturar.

**Checkpoint**: US1 + US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 — Reaparición y puntos diferidos (Priority: P3)

**Goal**: el efecto de reaparición (validable hoy); los efectos de menú/pausa/"nueva marca" quedan
definidos y conectados a sus puntos, para validarse con el shell (006) y la persistencia (007).

**Independent Test**: caer por un borde y oír el efecto de reaparición (quickstart US3).

- [X] T015 [P] [US3] Generar el SFX de reaparición (`respawn`) con `scripts/gen-sfx.ts` en
  `public/audio/`.
- [X] T016 [US3] Mapear el evento `respawn` a su SFX; dejar definidos y conectados (sin disparar aún)
  los puntos de los efectos de menú/pausa/"nueva marca" para que el shell (006) y la persistencia
  (007) los enchufen.
- [ ] T017 [US3] Prueba de juego manual de US3 (quickstart): caer y oír la reaparición.

**Checkpoint**: todas las historias entregables funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Comprobar el rendimiento con audio cargado: >= 60 FPS escritorio / >= 30 FPS móvil
  (SC-007), sin glitches por la mezcla.
- [X] T019 Comprobar la frontera y el determinismo: `src/sim/` no importa `src/audio/` ni carga
  assets, y `tests/determinism.test.ts` sigue en verde SIN cambios (Principios II y III).
- [ ] T020 Ejecutar la validación completa de `quickstart.md`, incluida la degradación con elegancia
  (sin assets / audio bloqueado → el juego se completa en silencio, SC-005).
- [X] T021 [P] Registrar créditos y licencias de los assets (música CC0, SFX ElevenLabs) en
  docs/CREDITS o el README.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias (motor + detector +
  cableado).
- **Historias (Phase 3+)**: dependen de Foundational. Orden de entrega US1 → US2 → US3.
- **Polish (Phase 6)**: depende de las historias entregadas.

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Sin dependencias de otras historias. Es el MVP.
- **US2 (P2)**: tras Foundational; independiente de US1 (música por su propia ruta y gain). Se valida
  sola.
- **US3 (P3)**: tras Foundational; reutiliza el motor; los puntos de menú/pausa/"nueva marca" se
  conectan pero se validan con shell (006) y persistencia (007).

### Parallel Opportunities

- T002/T003 en Setup; T007 en Foundational; T008 en US1; T012 en US2; T015 en US3; T018/T021 en Polish.
- Tras Foundational, US1 y US2 tocan archivos casi disjuntos (SFX vs música) y pueden ir en paralelo,
  cuidando los toques compartidos en `config.ts` y en el `AudioManager`.

## Parallel Example: User Story 1

```bash
# Generar los SFX núcleo en paralelo a otro trabajo de US1 (archivos de asset distintos):
Task: "T008 Generar jump/land/hit/finish con scripts/gen-sfx.ts en public/audio/"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup → 2. Phase 2 Foundational (motor + detector + cableado; determinismo en verde) →
3. Phase 3 US1. 4. PARAR y VALIDAR US1 (quickstart): se oyen las acciones núcleo y se puede silenciar.

### Incremental Delivery

US1 (MVP) → US2 (música) → US3 (reaparición + puntos diferidos). Cada historia añade valor sin romper
las anteriores; tras cada una, validar su quickstart.

## Notes

- La puerta de determinismo NO cambia: el audio no toca `src/sim/` ni el paso fijo. T019 lo verifica.
- `[P]` = archivos distintos sin dependencias; cuidado con los toques compartidos en `config.ts` y el
  `AudioManager`.
- La UI de sliders de volumen (shell, 006) y el guardado de preferencias (persistencia, 007) se
  difieren; aquí, tecla de silencio + volúmenes en `config.ts` + seam en memoria.
- Assets: SFX con licencia comercial (ElevenLabs Starter) vía script de dev; música CC0/royalty-free.
  La clave de API nunca entra en el build.
- Commit tras cada tarea o grupo lógico; parar en cada checkpoint para validar la historia.
