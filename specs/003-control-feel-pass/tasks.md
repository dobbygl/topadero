# Tasks: Pase de feel del control

**Input**: Design documents from `/specs/003-control-feel-pass/`
**Prerequisites**: plan.md, spec.md, research.md (R1–R8), data-model.md, contracts/

**Tests**: Solo se incluye la **puerta de determinismo** (Principio II, NO NEGOCIABLE): es el
único test exigido por la constitución. Cada historia crece el test antes de darse por terminada.
La prueba de juego manual (Principio I) es un *checkpoint*, no una tarea de test.

**Organización**: tareas agrupadas por historia. **Orden de entrega SECUENCIAL P1 → P2 → P3**
(Principio IV: no se inicia una historia de menor prioridad sin validar la superior). Esto
**anula** el patrón por defecto de la plantilla de paralelizar historias entre sí. Dentro de una
historia, `[P]` marca tareas en archivos distintos sin dependencia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencia)
- **[Story]**: a qué historia pertenece (US1/US2/US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único existente; raíz del repo. Archivos tocados: `src/config.ts`, `src/types.ts`,
`src/input/input.ts`, `src/core/gameLoop.ts`, `src/sim/player.ts`, `tests/determinism.test.ts`.
No se crean módulos nuevos. La frontera headless se mantiene (`src/sim/` no importa render).

---

## Phase 1: Setup (línea base)

**Purpose**: fijar la base de regresión antes de tocar el controlador.

- [X] T001 Confirmar la línea base en verde: `npm install` y `npx vitest run tests/determinism.test.ts` pasan a las 4 cadencias ANTES de cualquier cambio (referencia de no regresión).

---

## Phase 2: Foundational (prerequisito bloqueante)

**Purpose**: infraestructura de test compartida por US1 y US2. ⚠️ Debe completarse antes de los casos de determinismo de salto.

- [X] T002 Añadir seguimiento de **pico-Y** (máximo `player.position.y` a lo largo de la línea de tiempo, solo lectura) al helper `runScenario` de `tests/determinism.test.ts` e incluirlo en el vector de estado canónico comparado (R7). No cambia la simulación.

**Checkpoint**: el banco de pruebas puede detectar un ápice desfasado entre cadencias aunque el estado final en el suelo sea idéntico.

---

## Phase 3: User Story 1 - Salto que perdona errores de timing (Priority: P1) 🎯 MVP

**Goal**: jump buffering + coyote time afinado, sin doble salto.

**Independent Test**: pulsar saltar justo antes de aterrizar → salta al tocar suelo; pulsar fuera de la ventana → no salta al aterrizar; saltar tras dejar el borde (coyote) → salta; en el aire fuera de coyote → nada. Determinismo del salto bufferizado en verde a las 4 cadencias.

### Implementation for User Story 1

- [X] T003 [P] [US1] Añadir la perilla `jumpBufferTime` a `src/config.ts` y dejar `coyoteTime` listo para afinar (ya existe).
- [X] T004 [US1] Añadir el campo `jumpBufferRemaining` al interface `Player` e inicializarlo en `createPlayer` en `src/sim/player.ts`.
- [X] T005 [US1] Implementar jump buffering + consumo de coyote en `stepPlayer` (`src/sim/player.ts`): armar `jumpBufferRemaining = jumpBufferTime` cuando llega un flanco `jump` y no se puede saltar; decrementar `dt`/paso y acotar a 0; ejecutar el salto al quedar apoyado o dentro de coyote con buffer > 0; al lanzar, limpiar el buffer y poner `timeSinceGrounded = Infinity` (sin doble salto, FR-008). Depende de T003, T004.
- [X] T006 [US1] Añadir caso de determinismo en `tests/determinism.test.ts`: salto bufferizado (flanco con timestamp justo antes del aterrizaje) idéntico a 60/jitter/30/144 Hz **incluyendo pico-Y** tras el aterrizaje (verifica que se disparó en el mismo instante de juego). Depende de T002, T005.

**Checkpoint US1**: prueba de juego manual de US1 (`quickstart.md`) superada y puerta de determinismo en verde. PARAR y validar antes de US2.

---

## Phase 4: User Story 2 - Salto de altura modulable (Priority: P2)

**Goal**: salto de altura variable (lanzar al máximo, cortar al soltar, suelo mínimo garantizado) + curva de gravedad asimétrica (FR-010).

**Independent Test**: mantener pulsado sube claramente más que un toque; soltar pronto acorta; un toque ultracorto siempre hace un "hop" mínimo (no nulo). Determinismo de soltado-temprano-vs-mantenido en verde a las 4 cadencias.

### Implementation for User Story 2

- [X] T007 [P] [US2] Añadir las perillas `jumpReleaseVelocity` (suelo mínimo), `fallGravityMult` y `lowJumpGravityMult` a `src/config.ts`.
- [X] T008 [US2] Extender el seam de entrada para el flanco de soltado: `jumpRelease: boolean` en `StepInput` (`src/types.ts`) y `'jumpRelease'` en `InputEdge.kind` + su ventaneo en `advance()` (`src/core/gameLoop.ts`), idéntico al flanco `jump`.
- [X] T009 [US2] Emitir el flanco de soltado en el `keyup` de Salto en `src/input/input.ts`: `edges.push({ kind: 'jumpRelease', timestamp: e.timeStamp / 1000 })`. Depende de T008.
- [X] T010 [US2] Añadir los campos `jumpAscending` y `jumpHeld` al interface `Player` e inicializarlos en `createPlayer` (`src/sim/player.ts`).
- [X] T011 [US2] Implementar el salto de altura variable en `stepPlayer` (`src/sim/player.ts`): lanzar a `jumpSpeed` y `jumpAscending = true`; al recibir `jumpRelease` con `jumpAscending` y `vy > 0`, cortar a `min(vy, jumpReleaseVelocity)`; **orden dentro del paso: lanzar antes de cortar** (toque del mismo paso → suelo mínimo); limpiar `jumpAscending` en el ápice o al apoyar; interacción buffer×soltado (un salto bufferizado con `jumpHeld = false` nace al mínimo, R4). Depende de T007, T008, T010 y de la lógica de buffer (T005).
- [X] T012 [US2] Implementar la gravedad asimétrica en `stepPlayer` (`src/sim/player.ts`): escalar `gravity.y` por estado — `fallGravityMult` al caer (`vy < 0`), `lowJumpGravityMult` al ascender ya soltado (`vy > 0` y `!jumpAscending`), base al ascender mantenido (R6). Depende de T007, T010.
- [X] T013 [US2] Añadir casos de determinismo en `tests/determinism.test.ts`: (a) soltado temprano idéntico entre cadencias; (b) mantenido idéntico entre cadencias; (c) comportamiento `pico(mantenido) > pico(soltado temprano)` con margen medible y `pico(soltado temprano) ≥` suelo mínimo (no nulo). Usa el pico-Y de T002. Depende de T011, T012.

**Checkpoint US2**: prueba de juego manual de US2 superada y puerta de determinismo en verde (US1 + US2). PARAR y validar antes de US3.

---

## Phase 5: User Story 3 - Movimiento con peso y control aéreo (Priority: P3)

**Goal**: rampa de aceleración/desaceleración en suelo + control aéreo, ajustables por separado, sin romper el empuje del obstáculo.

**Independent Test**: arrancar muestra rampa (no velocidad máxima de golpe); soltar frena con peso (no parada seca ni patinazo); en el aire la trayectoria se ajusta perceptible pero contenida. Determinismo de la rampa con `moveAxis` constante en verde a las 4 cadencias.

### Implementation for User Story 3

- [X] T014 [P] [US3] Añadir las perillas `groundAccel`, `groundDecel` y `airAccel` a `src/config.ts`.
- [X] T015 [P] [US3] Añadir `horizontalVelocity: { x: number; z: number }` a `PlayerStateView` en `src/types.ts`.
- [X] T016 [US3] Añadir los campos `velX` y `velZ` al interface `Player` e inicializarlos en `createPlayer` (`src/sim/player.ts`).
- [X] T017 [US3] Sustituir la velocidad horizontal instantánea por la rampa en `stepPlayer` (`src/sim/player.ts`): calcular el objetivo desde `moveAxis` (relativo a `cameraYaw`, normalizado); aproximar **vectorialmente** `(velX, velZ)` al objetivo con paso máximo `rate · dt` (`groundAccel`/`groundDecel`/`airAccel`/conservar en aire sin input, R5); el desplazamiento del KCC pasa a `(velX + knockbackX) · dt + carryDelta` (y Z), manteniendo el knockback como velocidad aditiva aparte (FR-012). Depende de T014, T016.
- [X] T018 [US3] Exponer `velX`/`velZ` en `readPlayerState` (`src/sim/player.ts`) como `horizontalVelocity`. Depende de T015, T016.
- [X] T019 [US3] Añadir caso de determinismo en `tests/determinism.test.ts`: locomoción con `moveAxis` **constante** (avance o diagonal) idéntica entre cadencias, y extender el vector canónico con `horizontalVelocity` (R1, R8). Depende de T017, T018.

**Checkpoint US3**: prueba de juego manual de US3 superada; puerta de determinismo en verde (las 3 historias). Verificar no regresión: sin tunneling, deslizamiento estable, el obstáculo sigue empujando, el transporte portante intacto.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: afinado final y validación global.

- [ ] T020 Pase de afinado por prueba de juego (Principio V): iterar las cifras de las perillas nuevas en `src/config.ts` hasta que el control se sienta claramente mejor que el MVP (SC-008), sin regresiones.
- [ ] T021 Ejecutar la validación completa de `specs/003-control-feel-pass/quickstart.md` (las 3 historias + no regresión) y `npm test` en verde a las 4 cadencias.
- [X] T022 [P] Actualizar `README.md` con el pase de feel del control (buffering, coyote, salto variable + suelo mínimo, control aéreo, accel/decel, gravedad asimétrica), distinguiéndolo de la física base.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea los casos de determinismo de US1 y US2.
- **User Stories (Phase 3–5)**: dependen de Foundational. **Se ejecutan en orden P1 → P2 → P3**
  (Principio IV), NO en paralelo. Cada checkpoint es un PARAR-y-validar.
- **Polish (Phase 6)**: depende de que las 3 historias estén completas.

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Independiente (el flanco `jump` ya existe; no necesita soltado).
- **US2 (P2)**: tras US1 validada. Reusa la lógica de buffer (T005) para la interacción buffer×soltado (T011) y añade el flanco de soltado.
- **US3 (P3)**: tras US2 validada. Independiente de la lógica de salto; toca la velocidad horizontal.

### Within Each User Story

- Perillas (`config.ts`) y tipos (`types.ts`) antes de la lógica del controlador (`player.ts`).
- Seam de entrada (`types.ts` + `gameLoop.ts`) antes del emisor (`input.ts`).
- Lógica antes del caso de determinismo que la verifica.
- Historia completa (playtest + determinismo en verde) antes de la siguiente.

### Parallel Opportunities

- Dentro de US1: T003 (config) ‖ T004 (campo en player.ts) — archivos distintos.
- Dentro de US2: T007 (config) puede ir en paralelo al seam de entrada (T008).
- Dentro de US3: T014 (config) ‖ T015 (types) — archivos distintos.
- **No** se paralelizan historias entre sí (Principio IV). El archivo de test es único y se edita
  de forma secuencial.

---

## Parallel Example: User Story 3

```bash
# Lanzar en paralelo (archivos distintos, sin dependencia):
Task: "T014 [US3] Añadir groundAccel/groundDecel/airAccel a src/config.ts"
Task: "T015 [US3] Añadir horizontalVelocity a PlayerStateView en src/types.ts"
# Luego, en secuencia: T016 (estado) → T017 (rampa) → T018 (lectura) → T019 (test)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (línea base) → Phase 2 (helper de pico-Y).
2. Phase 3 (US1: buffering + coyote).
3. **PARAR y VALIDAR**: playtest US1 + determinismo en verde. Esto ya entrega un salto que perdona
   (valor por sí solo, el MVP del pase).

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar → demo (salto que perdona).
3. US2 → validar → demo (salto expresivo + mejor sensación de caída).
4. US3 → validar → demo (movimiento con peso + control aéreo).
5. Polish: afinado final y no regresión.

### Nota de la constitución

El orden secuencial P1 → P2 → P3 es obligatorio (Principio IV) y la puerta de determinismo
(Principio II) debe estar en verde en cada checkpoint: si falla, la historia no está terminada.

---

## Notes

- `[P]` = archivos distintos, sin dependencia. La mayor parte de la lógica vive en
  `src/sim/player.ts` y es secuencial dentro de cada historia.
- El empuje del obstáculo, el transporte portante y el `snapToGround` del MVP NO deben
  regresionar (FR-012): vigilarlo en cada checkpoint.
- Commit tras cada grupo lógico (los hooks de git lo proponen; commit solo cuando el usuario lo pida).
- Las cifras concretas son ajuste por playtest (Principio V), no parte de las tareas de lógica.
