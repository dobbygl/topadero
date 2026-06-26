---
description: "Task list — Shell de juego (007)"
---

# Tasks: Shell de juego (título, pausa, resultados y ajustes)

**Input**: Design documents from `/specs/007-game-shell/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: el proyecto NO exige tests por funcionalidad (constitución: tests automáticos opcionales
salvo la puerta de determinismo, Principio II). Se incluye UN test obligatorio: la pausa toca el
comportamiento determinista (FR-013/SC-004), así que `tests/core/pause.test.ts` es parte de la puerta
automática, no opcional. El resto de validación es la prueba de juego manual del `quickstart.md`.

**Organization**: tareas agrupadas por historia para implementarlas y validarlas de forma
independiente, en orden P1 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1..US5)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único existente: `src/`, `tests/` en la raíz. El shell vive en `src/ui` (vista pura, como
`hud.ts`/`dailyHud.ts`/`sandboxPanel.ts`, que construyen su propio DOM sobre `document.body`). La
pausa se resuelve con un helper en `src/core/gameLoop.ts` sin tocar `advance()`. `src/sim/` NO se
modifica (Principio II).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: andamiaje compartido del shell.

- [X] T001 Preparar `index.html` para el shell: CSS base de overlays a pantalla completa y de
  transiciones (opacity/transform), y confirmar que el shell monta su DOM en `document.body` (patrón
  de `dailyHud.ts`/`sandboxPanel.ts`); dejar el overlay `#click-to-play` en su sitio (se retira en US1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestructura que TODAS las historias necesitan.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase.

- [X] T002 Esqueleto de la máquina de estados en `src/ui/shell.ts`: tipo `ShellState`
  (`title|playing|paused|results` + `settingsOpen`, `pausedSince`, `lastResult`), montaje/ocultado de
  pantallas en `document.body`, API de intención (`play/pause/resume/restart/toTitle/openSettings/
  closeSettings`) y observación del run state. Sin lógica de pausa ni persistencia todavía. (contrato
  `contracts/shell-state.md`)
- [X] T003 Reestructurar `src/main.ts`: extraer un ciclo `loadCircuit(daily)` + `teardown()` que
  reutiliza UN solo `WebGLRenderer` (libera geometrías/materiales/texturas del circuito anterior con
  `dispose()`), y hacer el frame loop **shell-aware** (llamar a `advance()` SOLO si
  `shell.screen === 'playing'`); instanciar el shell y cablear sus intenciones. El boot sigue
  resolviendo el día → cargar → jugar, pero ahora gobernado por el shell. (research R2/R5; depende de
  T002)

**Checkpoint**: el juego arranca a través del shell; el bucle solo avanza en `playing`.

---

## Phase 3: User Story 1 - Arrancar y empezar a jugar desde un título (Priority: P1) 🎯 MVP

**Goal**: primera pantalla = título; "Jugar" entra al circuito del día y arranca el intento.

**Independent Test**: abrir la página → aparece el título con el personaje quieto y el cronómetro a 0;
"Jugar" inicia el intento y suena el audio; usable con toque en retrato/apaisado. Sin consola ni flags.

- [X] T004 [US1] Pantalla de título en `src/ui/shell.ts`: nombre del juego, botón "Jugar" e
  indicaciones básicas de control; es la primera pantalla (`screen='title'`) y la simulación NO avanza
  (cronómetro a 0, personaje quieto). (FR-001)
- [X] T005 [US1] Acción "Jugar" en `src/ui/shell.ts` + `src/main.ts`: re-ancla el bucle
  (`loop = createLoopState()`) y vacía `frame.edges` (NO `pauseShift`), llama a `audio.resume()` +
  `audio.startMusic()` y `input.requestLock()` (escritorio), y pasa a `playing`. Absorbe/retira el
  overlay `#click-to-play`; `?shot` salta el título directo a la escena (ruta dev). (FR-002/FR-003,
  FR-023; research R1/R6; depende de T004)
- [X] T006 [P] [US1] Layout responsive/táctil del título en el CSS del shell: retrato y apaisado,
  objetivos táctiles cómodos, "Jugar" accesible sin desplazamiento. (FR-011)

**Checkpoint**: título → jugar funciona de extremo a extremo sin consola ni flags.

---

## Phase 4: User Story 2 - Ver el resultado y volver a jugar (Priority: P1)

**Goal**: al cruzar la meta, pantalla de resultados con tiempo + mejor marca; volver a jugar o al
título; récord reconocido.

**Independent Test**: completar el circuito → resultados con el tiempo; "volver a jugar" reinicia
limpio; "volver al título" regresa; batir la marca muestra récord + SFX.

- [X] T007 [US2] Detección de victoria en el frame loop/`src/ui/shell.ts`: al observar
  `sim.getRunState().phase === 'won'`, transición `playing→results` (una sola vez por victoria);
  construir `AttemptResult` (`timeMs = round(elapsedSimTime*1000)`, `recordBest(daily, timeMs)`,
  `isNewBest`). (FR-004; data-model; depende de T002/T003)
- [X] T008 [US2] Pantalla de resultados en `src/ui/shell.ts`: tiempo del intento + mejor marca del
  día (si hay) + botones "volver a jugar" y "volver al título"; señal visual de récord y SFX
  `new best` al batir (reusa la detección de `recordBest` y el evento de audio 005). (FR-004/005/006;
  depende de T004/T007)
- [X] T009 [US2] Transiciones de resultados en `src/ui/shell.ts`: "volver a jugar" = intento nuevo
  (`createLoopState()` + vaciar flancos + flanco `restart`), repite el circuito de la sesión; "volver
  al título" = Entrada a `title`. Sin `localStorage`: mostrar solo `timeMs` sin fallar. (FR-005,
  SC-007; research R1/R7; depende de T008)
- [X] T010 [US2] Entrada a `title` con re-resolución del día (FR-024a) en `src/ui/shell.ts` +
  `src/main.ts`: `resolveDailyCircuit(Date.now())`; si `dayUTC` difiere del de la sesión →
  `teardown()` + `loadCircuit(nuevo)` (degradación offline de la baliza); mismo día → conservar el
  circuito. (research R2; depende de T003)

**Checkpoint**: US1 + US2 funcionan; el bucle título→jugar→resultados→rejugar/volver está cerrado.

---

## Phase 5: User Story 3 - Pausar, reanudar, reiniciar y salir (Priority: P1)

**Goal**: pausar congela la sim de forma determinista; reanudar/reiniciar/volver al título; auto-pausa
al perder foco.

**Independent Test**: pausar a mitad → personaje y cronómetro detenidos; reanudar sin salto colgado;
reiniciar limpio; volver al título; en móvil, salir/bloquear y volver = en pausa. El resultado con
pausas == sin pausas para los mismos inputs.

- [X] T011 [P] [US3] Helper puro de pausa en `src/core/gameLoop.ts`: `pauseShift(state, pausedSec)`
  que hace `state.simStartWall += pausedSec` (SEGUNDOS, mismo reloj que `advance`, `nowMs/1000`). **NO
  tocar el cuerpo de `advance()`** (Principio II). (research R1)
- [X] T012 [US3] Lógica de pausa en `src/ui/shell.ts`: `playing→paused` (`pausedSince = nowSeg`,
  vaciar `frame.edges`, mostrar pantalla de pausa, dejar de llamar a `advance`); reanudar
  (`pauseShift(loop, nowSeg − pausedSince)`, `pausedSince=null`, re-pedir pointer lock); reiniciar
  (re-ancla `createLoopState()` + vaciar flancos + flanco `restart`); volver al título (Entrada a
  `title`). (contrato `contracts/shell-state.md`; depende de T011/T002)
- [X] T013 [US3] Disparadores de pausa en `src/main.ts`/`src/ui/shell.ts`: escritorio = tecla
  (`Esc`/`P`) y `pointerlockchange` perdido durante `playing`; ambos = `visibilitychange`/`blur` →
  auto-pausa (FR-009); reanudar exige gesto explícito. NO hay botón de pausa en pantalla en móvil
  (la pausa móvil ES la pérdida de foco). (FR-007a/FR-009; research R4; depende de T012)
- [X] T014 [US3] `tests/core/pause.test.ts` (puerta automática, Principio II): una corrida con una o
  varias pausas produce los mismos sim-steps/estado que sin pausas para los mismos inputs (FR-013,
  SC-004). DEBE incluir una pausa **más larga que `MAX_SUBSTEPS × DT`** (aseverar cero pasos espurios,
  `frame.edges` vaciado y shift en segundos) y el caso de **re-anclaje en intento nuevo**
  (`createLoopState()` sin pasos espurios al re-entrar tras un rato fuera). (research R1; depende de
  T011)

**Checkpoint**: US1+US2+US3 = flujo publicable (Principio VI). Verificar que
`tests/determinism.test.ts` sigue en verde **sin cambios** y `pause.test.ts` en verde.

---

## Phase 6: User Story 4 - Ajustar el juego desde la interfaz (Priority: P2)

**Goal**: panel de ajustes (volúmenes, sensibilidad, reasignación, toggle debug) desde título y pausa,
en caliente y persistido.

**Independent Test**: abrir ajustes desde título y pausa; bajar volumen y oírlo al instante; cambiar
sensibilidad y notarla; recargar y conservar valores; en incógnito, aplicar en sesión y volver a
defaults sin fallar.

- [X] T015 [P] [US4] `src/config.ts`: añadir la clave de almacenamiento de ajustes (alineada con
  `cacheKeyPrefix`/`bestMarkKeyPrefix` de `config.daily`); sin claves de *feel* nuevas (los defaults
  de volúmenes y sensibilidad ya existen). (Principio V, FR-019)
- [X] T016 [P] [US4] `src/settings/storage.ts`: `readJSON`/`writeJSON` con degradación con elegancia
  (reusar el patrón de `src/daily/storage.ts`). (contrato `contracts/settings.md`)
- [X] T017 [US4] `src/settings/settings.ts`: registro runtime `PlayerSettings` sembrado desde los
  defaults de `config`; `load()/get()/set()/apply()`; aplica volúmenes vía
  `AudioManager.setMusicVolume/setSfxVolume/setMuted` y expone la sensibilidad viva. Unificar la
  persistencia con `src/input/preferences.ts` (un solo registro, no duplicar). (data-model; contrato
  `contracts/settings.md`; research R3; depende de T015/T016)
- [X] T018 [US4] Conectar consumidores a `PlayerSettings`: la mirada de cámara/entrada lee
  `mouseSensitivity`/`touchLookSensitivity`/`gamepadLookSpeed`/`invertCameraY` del registro vivo (con
  el default de `config` como base) en `src/input/*` y la cámara de `src/render/followCamera.ts`.
  (research R3; depende de T017)
- [X] T019 [US4] Panel de ajustes en `src/ui/settingsPanel.ts`: sliders de volumen música/efectos,
  sensibilidad, reasignación de entrada (reusa `src/input/preferences.ts`, 004) y toggle de debug de
  físicas (apagado por defecto, estado de sesión); accesible desde título y pausa; hot-apply.
  (FR-015/016/017/018; depende de T017)
- [X] T020 [US4] Cargar `PlayerSettings` al arrancar (`src/main.ts`) y aplicarlos antes de jugar; el
  toggle de debug controla el overlay de colliders (deja de depender de la tecla `B` como única vía).
  (FR-019a, FR-023; depende de T017/T019)

**Checkpoint**: ajustes accesibles, en caliente y persistidos; degradación sin storage.

---

## Phase 7: User Story 5 - Navegación pulida y ayuda de controles (Priority: P3)

**Goal**: navegación por teclado/mando con foco visible, transiciones suaves, ayuda de controles.

**Independent Test**: recorrer todas las pantallas solo con teclado y solo con mando, con foco
visible; transiciones sin parpadeo; ayuda de controles en el título.

- [ ] T021 [P] [US5] Navegación por teclado y mando en `src/ui/shell.ts`/`settingsPanel.ts`: foco
  visible (`:focus-visible`), orden de tabulación, y D-pad/stick mueven el foco + botón A activa
  (reusa `src/input/gamepad.ts`). (FR-020, SC-006)
- [X] T022 [P] [US5] Transiciones suaves entre pantallas en el CSS del shell (opacity/transform), sin
  parpadeo. (FR-021)
- [X] T023 [P] [US5] Ayuda de controles en el título por esquema (teclado/mando/toque) en
  `src/ui/shell.ts`, reusando la detección de `Scheme` (`src/input/scheme.ts`, 004). (FR-022)

**Checkpoint**: pulido completo; las cinco historias funcionan.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: puertas de calidad de la constitución y limpieza.

- [X] T024 [P] Comprobar la frontera headless (Principio III): `src/sim/` no importa `src/ui`,
  `src/settings` ni la persistencia (grep de imports); el shell solo lee estado y emite intención.
- [X] T025 [P] Verificar la puerta automática (Principio II): `npx vitest run tests/determinism.test.ts`
  en verde **sin cambios** y `npx vitest run tests/core/pause.test.ts` en verde.
- [X] T026 Ejecutar la validación manual de `quickstart.md` (Principio VI): flujo completo en
  escritorio y móvil, pausa, ajustes, cambio de día UTC, offline y sin `localStorage`; sin consola ni
  flags de dev, sin pantalla en blanco. (Validado por el usuario, 2026-06-26.)
- [X] T027 [P] Limpieza: retirar restos del overlay `#click-to-play` y de cualquier dependencia de
  tecla como ÚNICA salida; confirmar que `R` sigue como atajo pero no como única vía (FR-023,
  Principio VI).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: tras Setup; BLOQUEA todas las historias. T003 depende de T002.
- **US1 (Phase 3)**: tras Foundational. T005 depende de T004; T006 [P].
- **US2 (Phase 4)**: tras Foundational. T008 depende de T004/T007; T009 de T008; T010 de T003.
- **US3 (Phase 5)**: tras Foundational. T011 [P] (aislado); T012 de T011/T002; T013 de T012; T014 de T011.
- **US4 (Phase 6)**: tras Foundational. T015/T016 [P]; T017 de T015/T016; T018/T019/T020 de T017.
- **US5 (Phase 7)**: tras US1-US4 (pule sus pantallas). T021/T022/T023 [P].
- **Polish (Phase 8)**: tras las historias deseadas.

### User Story Dependencies

- **US1 (P1)**: independiente (entrada del juego).
- **US2 (P1)**: usa las pantallas del shell de US1; introduce el primer "volver al título" (de ahí
  FR-024a, T010). Testable por sí sola una vez existe el título.
- **US3 (P1)**: independiente en su lógica de pausa; el helper `pauseShift` (T011) no depende de US1/US2.
- **US4 (P2)**: el panel se abre desde título (US1) y pausa (US3); la capa de ajustes es independiente.
- **US5 (P3)**: pule lo construido en US1-US4.

### Parallel Opportunities

- US3 puede empezar en paralelo a US1/US2: **T011** (`gameLoop.ts`, archivo aislado) y **T014** (test)
  no tocan el shell.
- US4: **T015** (config) y **T016** (storage) en paralelo; luego T017 los une.
- US5: T021/T022/T023 en paralelo (foco, CSS, ayuda).
- Polish: T024/T025/T027 en paralelo; T026 es manual.

---

## Parallel Example: arranque rápido

```bash
# Tras Foundational (T002, T003), se pueden lanzar en paralelo:
Task: "T011 [US3] Helper pauseShift en src/core/gameLoop.ts"   # aislado, no toca el shell
Task: "T006 [US1] Layout responsive/táctil del título (CSS)"   # CSS, distinto de la lógica de shell.ts
Task: "T015 [US4] Clave de almacenamiento de ajustes en config.ts"
Task: "T016 [US4] src/settings/storage.ts (read/writeJSON)"
```

---

## Implementation Strategy

### MVP y corte publicable

- **MVP demoable** = US1 (título → jugar). Es el primer incremento jugable.
- **Corte publicable (Principio VI)** = US1 + US2 + US3 (las tres P1): título, jugar, resultados,
  rejugar/volver y pausa, sin consola ni flags. Es la puerta de "publicable" del shell; parar y
  validar aquí con `quickstart.md`.

### Entrega incremental

1. Setup + Foundational → el shell gobierna el arranque.
2. US1 → título → jugar (MVP). Validar.
3. US2 → resultados → rejugar/volver (+ día UTC). Validar.
4. US3 → pausa determinista (+ test de pausa-equivalencia). Validar la puerta de determinismo.
5. US4 → ajustes en caliente y persistidos. Validar.
6. US5 → pulido de navegación y ayuda. Validar.
7. Polish → frontera headless, puertas automáticas y quickstart completo.

### Notas

- `src/sim/` y el núcleo de `advance()` NO se tocan: la puerta de determinismo sigue válida por
  construcción; la pausa es propiedad del bucle/host (T011/T012).
- Cuidado con UNIDADES en la pausa: segundos, no ms (T011/T012).
- Dos rutas de "entrar en playing": reanudar (pauseShift) vs. intento nuevo (re-anclar el bucle); no
  confundirlas o correrán pasos espurios (T005/T009/T012).
- Commit tras cada grupo lógico de tareas (cadencia de la constitución).

---

## Estado de implementación (2026-06-26)

**Puertas automáticas en verde:** `tsc --noEmit` limpio; `npx vitest run` = 43/43 (incluye
`tests/determinism.test.ts` SIN cambios + `tests/core/pause.test.ts` nuevo, 3 casos: pausa larga,
varias pausas, re-anclaje); `npm run build` (tsc + vite) OK; frontera headless verificada
(`src/sim/` no importa ui/settings/render/audio/daily). `src/sim/` solo añade un método público
`restart()` que envuelve el `reset()` ya existente (no toca `step()` → determinismo intacto).

**Desviaciones respecto al plan (documentadas):**
- **T003/T010 — cambio de día (FR-024a) por `location.reload()`, no por rebuild in-place.** `SceneView`
  crea su propio renderer y no expone `dispose()`; un teardown/rebuild de Three a ciegas es arriesgado
  y el caso (cruzar medianoche UTC con el shell abierto y volver al título) es rarísimo. `goToTitle()`
  detecta el cambio de día con `utcDay()` (sin red) y recarga; el boot re-resuelve (caché→red→offline).
  Comportamiento observable correcto; se desvía de research R2. La costura FR-025 (entrada de juego)
  queda igualmente preparada en el cableado del shell.
- **T016 — sin `src/settings/storage.ts` separado:** se reusan `readJSON/writeJSON` de
  `src/daily/storage.ts` (genéricos, con degradación), evitando duplicar el sistema de guardado.
- **T009/T012 — intento nuevo resetea vía `sim.restart()` (no por flanco `restart`):** con el bucle
  re-anclado (`createLoopState`), el flanco `restart` no se consumiría (su ventana queda en el pasado
  del ancla nuevo). Se documenta en el docstring de `Simulation.restart()`.
- **FR-006 — sin SFX `new_best`:** ese asset no existe en `config.audio.sfx`; el récord se marca con
  señal VISUAL (badge). El jingle de meta (`finish`) suena al cruzar. Degradación con elegancia.

**Correcciones post-revisión (advisor):**
- **SFX de meta:** la detección de audio estaba bajo `screen==='playing'`, pero la victoria flipa la
  pantalla a `results` en el mismo fotograma → el flanco running→won (que dispara `finish`) se perdía.
  Arreglado capturando `const playing` UNA vez por fotograma (antes del flip) para advance + victoria
  + audio. Era una regresión respecto a 006.
- **Pantalla de arranque (`#boot`):** al quitar `#click-to-play`, el primer arranque quedaba en blanco
  durante el boot async; se restauró feedback inmediato con un `#boot` estático en `index.html` que el
  JS retira al montar el shell (mitiga la regresión; la pantalla de carga formal es de spec-008).
- **Esc:** lo gobierna solo `pointerlockchange` (pausa); se quitó del keydown para evitar el doble
  manejo (Esc soltaba el lock → pausa, y el keydown reanudaba). `KeyP` queda como toggle explícito.
- **Mute (`KeyM`):** ahora pasa por `settings.setMuted` → persiste (antes solo tocaba el gain).

**Pendiente:**
- **T021 (P3) — navegación por mando en menús: PARCIAL.** La navegación por teclado (Tab/Enter/Espacio)
  y el foco visible (`:focus-visible`) funcionan de forma nativa; falta cablear el D-pad/stick para
  mover el foco en los menús. No se ha implementado a ciegas por no poder validarlo visualmente.
- **T026 — validación manual del `quickstart.md`: PENDIENTE (usuario).** Requiere prueba de juego real
  (escritorio + móvil, pausa, ajustes, cambio de día, offline). No automatizable aquí.
