---
description: "Task list — Topadero (prototipo de circuito de obstáculos)"
---

# Tasks: Topadero — Prototipo de circuito de obstáculos

**Input**: Design documents from `specs/001-obstacle-platformer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (verificados de forma adversarial)

**Tests**: Por la constitución (Principio II, NO NEGOCIABLE), el ÚNICO test automático obligatorio es la **puerta de determinismo / independencia de FPS** (`tests/determinism.test.ts`), que **crece por historia**. El resto de tests son OPCIONALES y no se generan. La puerta principal de cada historia es la **prueba de juego manual** del `quickstart.md`.

**Organization**: Tareas agrupadas por historia (P1 → P2 → P3), rebanadas verticales jugables (Principio IV). La geometría estática del circuito se crea en Foundational (lo exige el contrato `Simulation.create` y US1 necesita suelo donde apoyarse); cada historia añade su **comportamiento**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencia pendiente del mismo grupo)
- **[Story]**: `[US1]`/`[US2]`/`[US3]`; Setup/Foundational/Polish sin etiqueta
- Rutas exactas en cada tarea de código; las tareas-puerta (prueba de juego, rendimiento) referencian la sección del `quickstart.md` que validan

## Path Conventions

Proyecto único de frontend: `src/`, `tests/` en la raíz (árbol en plan.md). Frontera clave: `src/sim/` es núcleo **headless** (no importa Three.js ni toca el DOM).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar el proyecto y su estructura.

- [X] T001 Crear la estructura de carpetas (`src/core`, `src/sim`, `src/input`, `src/render`, `src/ui`, `tests`) según plan.md
- [X] T002 Inicializar npm y `package.json`: deps `three`, `@dimforge/rapier3d-compat@^0.19`; devDeps `typescript@^5`, `vite`, `vitest`; `"type":"module"`; scripts `dev`/`build`/`preview`/`test`/`test:watch` (research R2)
- [X] T003 [P] Configurar `tsconfig.json` (target ES2022, module ESNext, moduleResolution bundler, strict)
- [X] T004 [P] Configurar `vite.config.ts` (mínimo, sin plugin WASM) y `vitest.config.ts` (`test.environment: 'node'`)
- [X] T005 [P] Crear `index.html` (canvas de render + contenedor del HUD)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Núcleo compartido + geometría estática. Implementa el seam y el bucle de los que depende el Principio II y deja el mundo con suelo/plataformas para que US1 sea jugable.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta completar esta fase.

- [X] T006 Crear `src/config.ts` con la enumeración COMPLETA de parámetros por dominio (bucle/sim, jugador/KCC, cámara, obstáculo, zonas/geometría, test) según data-model § Config; ángulos de pendiente en RADIANES
- [X] T007 Crear `src/circuit.ts`: `CircuitDefinition` PURA (datos) — plataformas P0–P5, rampa, muros, obstáculo y zonas salida/meta (forma + pose + flag visible) según research R9 (depende de T006)
- [X] T008 Crear `src/sim/simulation.ts` (seam): `Simulation.create(config)` crea el `World` (`world.timestep = FIXED_DT`) y, desde `circuit.ts`, los colliders ESTÁTICOS (plataformas, rampa, muros), el collider del obstáculo (cinemático sólido) y los colliders SENSOR de salida/meta. Getters de solo lectura (`getPlayerState`, `getRunState`, `getObstacleTransforms`, `getPreviousPlayerTransform`/`getPreviousObstacleTransforms`, `getCircuitDefinition`). `step(input)` con el ORDEN del contrato; el **ventaneo de flancos por timestamp se consume DENTRO de `step()`** (contrato paso 6), no en el bucle. Sin `Date.now`/`Math.random`/iteración no determinista en el hot path (research R1/R7; contrato invariantes 1-5; FR-004, FR-005) (depende de T006, T007)
- [X] T009 Implementar `src/core/gameLoop.ts`: bucle de paso fijo con acumulador (`while acc>=FIXED_DT && substeps<MAX_SUBSTEPS`), **sobrante persistente entre fotogramas**, `alpha=acc/FIXED_DT` para interpolación; entrega a `step()` el `InputFrame` por fotograma. NO hace el ventaneo de flancos (eso vive en `step()`). (research R1) (depende de T008)
- [X] T010 [P] Implementar `src/render/scene.ts`: renderer/escena/luces Three.js y construir TODAS las mallas estáticas del circuito desde `sim.getCircuitDefinition()` (plataformas, rampa, muros); dejar huecos para mallas dinámicas (jugador/obstáculo) y marcadores de zona, que añaden las historias (depende de T007, T008)
- [X] T011 [P] Implementar `src/input/input.ts`: muestreo de teclado (eje de movimiento); captura de flancos salto/reinicio con `event.timeStamp`; **buffer de flancos pendientes que PERSISTE entre fotogramas hasta ser consumido por `step()`**, con `clearPendingEdges()` para respawn/reinicio; ratón con Pointer Lock (`cameraDelta`, clamp del delta) (data-model § InputFrame; controls.md) (depende de T006)
- [X] T012 Cablear `src/main.ts`: `await RAPIER.init()` (una vez) → crear `Simulation`, renderer (`scene.ts`), input; arrancar `gameLoop`. (HUD se cablea en US2 al crear `hud.ts`.) (depende de T008, T009, T010, T011)
- [X] T013 [P] Crear el arnés `tests/determinism.test.ts`: `beforeAll(RAPIER.init)`; runner que pasa una `Simulation` **fresca** por una línea de fotogramas con inputs **con timestamp**; 4 cadencias (60 / jitter 5-40-8 / 30 / 144 Hz); comparador de **igualdad exacta** a igual nº de pasos (`FLOAT_EPSILON`). Define el **vector de estado canónico** a comparar, reutilizado por T018/T027/T032: `PlayerState{position, velocity, verticalVelocity, isGrounded}` + `RunState{phase, elapsedSimTime}` + transform del obstáculo (research R7; contrato) (depende de T008, T009)

**Checkpoint**: fundación lista — mundo con suelo, seam y bucle operativos.

---

## Phase 3: User Story 1 — Control y sensación del personaje (Priority: P1) 🎯 MVP

**Goal**: Personaje cápsula movible y agradable en 3ª persona sobre el circuito: movimiento relativo a cámara, salto solo apoyado, cámara orbital suave, sin atravesar geometría, slide en pared/rampa.

**Independent Test**: con el circuito ya presente (Foundational), mover en las 4 direcciones, saltar (solo apoyado), rozar pared/rampa y comprobar cámara suave y no-tunneling (quickstart US1).

- [X] T014 [US1] Implementar `src/sim/player.ts`: cuerpo `kinematicPositionBased` + collider `capsule(halfHeight, radius)`; `createCharacterController(offset)` con `enableSnapToGround(snapToGroundDistance)`, `enableAutostep(...)`, `setMaxSlopeClimbAngle`/`setMinSlopeSlideAngle` (RADIANES, de config); gravedad manual; `computeColliderMovement(..., EXCLUDE_SENSORS)`; aplicar `computedMovement` por `setNextKinematicTranslation`; leer `computedGrounded` (research R3; FR-004, FR-005) (depende de T008)
- [X] T015 [US1] En `src/sim/simulation.ts` (`step()`) y `src/sim/player.ts`: movimiento relativo al **yaw crudo** de la cámara; salto solo si `isGrounded`, **desactivando snap-to-ground ese paso** (o ignorando grounded con `verticalVelocity>0`); el flanco de salto se consume por su ventana de timestamp (research R3/R4/R7; FR-001, FR-003) (depende de T014)
- [X] T016 [P] [US1] Implementar `src/render/followCamera.ts`: cámara orbital 3ª persona (yaw/pitch acotado), seguimiento suavizado `1-exp(-k·dt_render)` (FR-002) (depende de T010)
- [X] T017 [US1] Cablear cámara/input y render del jugador: en `src/input/input.ts` derivar yaw/pitch de `cameraDelta` (pointer lock); en `src/render/scene.ts` añadir la malla cápsula del jugador interpolada (`getPreviousPlayerTransform` + alpha); conectar en `src/main.ts` (FR-001, FR-002) (depende de T011, T015, T016)
- [X] T018 [US1] Ampliar `tests/determinism.test.ts`: invariancia del **flanco de salto**. Fixture concreta: pulsar salto con un `event.timeStamp` colocado a propósito a una fracción de `FIXED_DT` de una frontera de subpaso (research R7); correr la misma línea por 60/jitter/30/144 Hz; comparar el vector de estado canónico (T013) a igual nº de pasos con `FLOAT_EPSILON`. Caza la regresión al consumo "primer paso tras el fotograma" (FR-013/SC-004, FR-003/SC-002) (depende de T013, T015)
- [X] T019 [US1] Prueba de juego manual del checklist US1 del `quickstart.md` (movimiento relativo a cámara, salto solo apoyado, slide pared/rampa, cámara suave, decisión de `coyoteTime`, snap no se come el salto, ≥60 FPS)

**Checkpoint**: US1 plenamente funcional y testable por sí sola (MVP).

---

## Phase 4: User Story 2 — Circuito hasta la meta con cronómetro (Priority: P2)

**Goal**: El obstáculo móvil empuja al contacto; cronómetro que arranca al primer input y se detiene en la meta con victoria. (Las plataformas/rampa/muros y los colliders de obstáculo/zonas ya existen desde Foundational; aquí se les da comportamiento y representación.)

**Independent Test**: recorrer el circuito, recibir el empuje del obstáculo, cruzar la meta y ver crono detenido + victoria (quickstart US2). SC-001 (completar de salida a meta) emerge aquí.

- [X] T020 [P] [US2] Implementar `src/sim/movingObstacle.ts`: dar movimiento al collider del obstáculo con `phaseFn(simTime)` (vaivén horizontal) + `velocityFn` (derivada analítica) (FR-006; research R5/R9) (depende de T008)
- [X] T021 [US2] Empuje (knockback) en `src/sim/simulation.ts` (`step()`) y `src/sim/player.ts`: cada paso, `playerCollider.contactCollider(obstacleCollider, contactPrediction)`; si hay contacto, sumar a `player.velocity` una velocidad de empuje que **decae** (`knockbackDecay`), dirección = normal del `ShapeContact` transformada a world-space, magnitud = `clamp(knockbackStrength + velObstáculo·normal, knockbackMax)`; se consume por el KCC (no teletransporte). `contactPrediction ≥` desplazamiento del obstáculo por paso (FR-007, Q4; research R5) (depende de T020, T015)
- [X] T022 [US2] Render del obstáculo móvil interpolado (`getPreviousObstacleTransforms` + alpha) en `src/render/scene.ts` (depende de T010, T020)
- [X] T023 [P] [US2] Implementar `src/sim/zones.ts`: detección de salida/meta por `world.intersectionsWithShape(player...)` dentro del paso (los sensores ya existen, T008); entrar en meta con `running` → `won` (FR-008, FR-010; research R8) (depende de T008)
- [X] T024 [US2] Mallas VISIBLES de salida y meta (losa/portal coloreado) en `src/render/scene.ts` (FR-008) (depende de T022, T023)
- [X] T025 [US2] Implementar `src/sim/runState.ts`: cronómetro de tiempo de simulación; arranca con el primer input de movimiento/salto (no cámara), acumula en `running`, se detiene al entrar en meta (FR-009/FR-010, Q2; research R6) (depende de T023)
- [X] T026 [US2] Implementar `src/ui/hud.ts` (cronómetro visible + banner de victoria con tiempo final) y cablearlo en `src/main.ts` (FR-009/FR-010, SC-006) (depende de T012, T025)
- [X] T027 [US2] Ampliar `tests/determinism.test.ts`: invariancia del **empuje del obstáculo**. Fixture: posicionar/scriptear al jugador para que solape con el obstáculo en un paso conocido; comparar `position`/`velocity` tras el knockback a igual nº de pasos en las 4 cadencias (FR-007) (depende de T018, T021)
- [X] T028 [US2] Prueba de juego manual del checklist US2 del `quickstart.md` (recorrer, el obstáculo empuja/derriba, la meta detiene el crono y muestra victoria)

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 — Recuperación tras caída y reinicio (Priority: P3)

**Goal**: Respawn automático al caer (crono sigue) y reinicio manual del intento en cualquier momento, sin recargar.

**Independent Test**: caer por un hueco → reaparecer en la salida en pocos segundos sin recargar (crono sigue); pulsar reinicio en cualquier fase y comprobar reseteo (quickstart US3).

- [X] T029 [US3] En `src/sim/zones.ts` (o `simulation.ts step()`): detección `player.y < FALL_THRESHOLD` por paso → respawn: `rigidBody.setTranslation(spawn, true)`, `velocity`/`verticalVelocity` a 0, `input.clearPendingEdges()`; el crono NO se reinicia (FR-011, Q5, SC-005; research R8) (depende de T014, T025)
- [X] T030 [US3] En `src/sim/runState.ts` (consumiendo el flanco `R` de `src/input/input.ts`): reinicio → resetear jugador (T014), obstáculo (T020), `runState` a `idle`, crono a 0, `firstInputSeen=false`, `input.clearPendingEdges()` (FR-012, SC-007) (depende de T014, T020, T025)
- [X] T031 [P] [US3] Aviso de reinicio en el HUD `src/ui/hud.ts` (FR-012) (depende de T026)
- [X] T032 [US3] Ampliar `tests/determinism.test.ts`: invariancia del **trigger de respawn/umbral**. Fixture: posición inicial sobre el vacío / scriptear caída hasta `y<FALL_THRESHOLD`; comparar el estado post-respawn (`position==spawn`, `velocity==0`, crono sigue) a igual nº de pasos en las 4 cadencias (FR-011) (depende de T027, T029)
- [X] T033 [US3] Prueba de juego manual del checklist US3 del `quickstart.md` (caída→respawn ≤3 s sin recargar, crono sigue; `R` resetea en cualquier fase)

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Estabilidad y feel transversales.

- [X] T034 Comprobación de estabilidad de colisiones: sin tunneling **incluso cuando el obstáculo empuja al jugador contra una pared**; ajustar `knockbackMax`/`obstacleSpeed`/grosor de colliders/`contactPrediction` en `src/config.ts` (Principio V; quickstart "Estabilidad de colisiones") (depende de Phase 4, Phase 5)
- [X] T035 Ajustar parámetros de feel en `src/config.ts` (velocidad, salto, `coyoteTime`, cámara) mediante prueba de juego (Principios I y V) (depende de T034, mismo archivo `config.ts`)
- [X] T036 [P] Comprobar rendimiento ≥ 60 FPS en navegador de escritorio (quickstart; SC-008)
- [X] T037 Validación completa de `quickstart.md` (las 3 historias + estabilidad de colisiones) y `npm test` en verde (puerta del Principio II). Confirmar como comportamiento aceptado por diseño los edge cases: tab-out pausa el crono de sim (R6) y atasco → reinicio manual (R8) (depende de T034, T035)
- [X] T038 [P] Crear `README.md` con instrucciones de arranque/test (CLAUDE.md lo referencia como fuente de verdad; tarea utilitaria fuera del diseño formal)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **BLOQUEA todas las historias**. Incluye la geometría estática (US1 necesita suelo).
- **Historias (Phase 3–5)**: dependen de Foundational; orden P1 → P2 → P3 (Principio IV: validar cada una antes de la siguiente).
- **Polish (Phase 6)**: depende de las historias entregadas.

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Independiente (MVP): el mundo ya tiene suelo/plataformas/rampa/muros.
- **US2 (P2)**: tras Foundational; el empuje (T021) reutiliza el jugador/KCC de US1 (T014/T015). Testable por sí sola.
- **US3 (P3)**: tras Foundational; usa `runState`/crono de US2 (T025) para "el crono sigue" y el jugador de US1.

> US2 y US3 reutilizan piezas de las anteriores, así que en la práctica se construyen en secuencia (no en paralelo entre historias), como recomienda la constitución.

### Within Each Story

- El test de determinismo de cada historia se amplía **tras** su implementación (puerta del Principio II creciendo, no TDD): T013 (arnés) → T018 (salto, P1) → T027 (empuje, P2) → T032 (respawn, P3).
- Orden de `step()` (contrato): avanzar obstáculo → integrar (gravedad+input+knockback) → KCC → grounded → consultas geométricas (empuje/meta/salida/umbral) → consumir flancos por ventana de timestamp.
- Validar el checkpoint manual antes de pasar de historia.

### Parallel Opportunities

- **Setup**: T003, T004, T005 (archivos distintos).
- **Foundational**: T010 (`render/scene.ts`), T011 (`input/input.ts`), T013 (`tests/determinism.test.ts`) en paralelo entre sí (archivos distintos; dependen de T008/T009 ya hechos, no entre sí).
- **US1**: T016 (`render/followCamera.ts`) en paralelo con la lógica de sim (T014/T015), archivos distintos. T017 NO es [P] (toca varios archivos y depende de T015/T016).
- **US2**: T020 (`sim/movingObstacle.ts`) y T023 (`sim/zones.ts`) en paralelo (archivos distintos, dependen solo de T008). Las tareas de render (T022, T024) comparten `render/scene.ts` → secuenciales.
- **US3**: T031 (`ui/hud.ts`) [P].
- **Polish**: T036 (rendimiento) y T038 (`README.md`) [P]. T034/T035 comparten `config.ts` → secuenciales.

---

## Parallel Example: Foundational

```bash
# Tras T008 (seam + colliders estáticos) y T009 (bucle), en paralelo (archivos distintos):
Task: "Implementar src/render/scene.ts (bootstrap + mallas estáticas desde getCircuitDefinition)"   # T010
Task: "Implementar src/input/input.ts (teclado + flancos con timestamp + buffer persistente + pointer lock)"  # T011
Task: "Crear el arnés tests/determinism.test.ts (4 cadencias, vector de estado, igualdad exacta)"     # T013
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational, CRÍTICO: incluye geometría estática) → 3. Phase 3 (US1) → 4. **PARAR y VALIDAR** US1 con la prueba de juego → demo del "muñeco jugable" sobre el circuito.

### Incremental Delivery

1. Setup + Foundational → fundación lista (mundo con suelo, seam, bucle, test arnés).
2. US1 → validar → demo (MVP: control y feel, la hipótesis del proyecto).
3. US2 → validar → demo (obstáculo que empuja + meta + crono).
4. US3 → validar → demo (respawn + reinicio).
5. Polish → estabilidad de colisiones, feel, rendimiento, quickstart en verde.

---

## Notes

- La puerta automática obligatoria es `tests/determinism.test.ts` (Principio II); crece con cada historia (salto P1, empuje P2, respawn P3) reutilizando el runner y el vector de estado de T013. Si falla, ninguna historia se considera terminada.
- `src/sim/` no importa Three.js ni toca el DOM; eso hace ejecutable el test en Node y verificable el Principio II.
- Ventaneo de flancos: el buffer pendiente vive en `src/input/input.ts` (persiste entre fotogramas); `Simulation.step()` consume los flancos cuyo timestamp cae en `[simTime, simTime+FIXED_DT)`; respawn/reinicio llaman a `clearPendingEdges()`.
- Todas las cifras viven en `src/config.ts` (Principio V); no dispersar números mágicos.
- Commit tras cada tarea o grupo lógico (solo cuando el usuario lo pida; hay hooks de git por fase).
- Evitar: tareas vagas, conflictos en el mismo archivo entre tareas [P], dependencias entre historias que rompan su independencia.
