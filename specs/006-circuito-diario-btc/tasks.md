# Tasks: Circuito diario procedural con baliza Bitcoin

**Feature**: `006-circuito-diario-btc` · **Plan**: [plan.md](./plan.md) · **Spec**: [spec.md](./spec.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivo distinto, sin dependencias incompletas).
- **[US#]**: historia a la que pertenece la tarea (solo en fases de historia).
- Rutas absolutas desde la raíz del repo.

**Tests**: SÍ incluidos. Los exigen los criterios medibles (SC-001 reproducibilidad, SC-004
solubilidad, SC-005 verificación) y la puerta automática NO NEGOCIABLE de determinismo (Principio II).

## Path Conventions

Proyecto único existente (Vite + TS). Código nuevo en `src/circuitgen/` (puro/headless) y
`src/daily/` (red de solo lectura + caché). `src/sim/` **no se toca**. Tests en `tests/circuitgen/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Añadir a `src/config.ts` el bloque **congelado** `circuitgen` (GENERATION_CONSTANTS: `grid`, `segmentsRange`, `gapRange`, `platformWidthRange`, `obstacleDensity`, `obstacleMix`, `varietySalt`, `envelope {gravity, jumpSpeed, moveSpeed}`, `generatorVersion`) y el bloque `daily` (`providers` [mempool, blockstream], `confirmations: 3`, `cacheKeyPrefix`, `bestMarkKeyPrefix`). El generador leerá `circuitgen`, NO las perillas de feel vivas. **Inicializar `envelope` con los valores de feel vivos ACTUALES** (gravity/jumpSpeed/moveSpeed) para que la solubilidad case con la física real; si luego divergen, subir `generatorVersion` (T026).

**Checkpoint**: parámetros centralizados disponibles (Principio V).

---

## Phase 2: Foundational (Blocking Prerequisites)

Puros y compartidos por todas las historias. Sin red, sin DOM (corren en Node).

- [X] T002 [P] PRNG determinista **sfc32** + helpers (`nextU32`, `intRange` por rechazo, `pick`, `chance`) en `src/circuitgen/prng.ts`. Aritmética entera (`>>> 0`, `Math.imul`); PROHIBIDO `Math.random`/`Date`.
- [X] T003 [P] `seedFromHash(blockHash, varietySalt?)` con **SHA-256** (Web Crypto `crypto.subtle`) en `src/circuitgen/seed.ts`. Blanquea el hash (PoW sesga los bits altos); determinista e idéntico en navegador y Node 22.
- [X] T004 [P] `structuralHash(circuit)` (SHA-256 de serialización canónica con orden de claves estable) en `src/circuitgen/hash.ts` (puro). Identidad verificable del circuito.

**Checkpoint**: fundamentos listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Circuito del día, igual para todos e impredecible (Priority: P1) 🎯 MVP

**Goal**: cada día UTC, un circuito determinista, idéntico para todos, impredecible y completable.

**Independent Test**: dos clientes limpios el mismo día → mismo `structuralHash`; otro día → distinto;
mañana no precomputable; jugable de salida a meta.

### Tests for User Story 1

- [X] T005 [P] [US1] Test de **reproducibilidad** en `tests/circuitgen/reproducibility.test.ts`: mismo seed + versión → mismo `structuralHash`; seeds distintos → hashes distintos (SC-001, SC-002).
- [X] T006 [P] [US1] Test de **solubilidad** en `tests/circuitgen/solvability.test.ts`: ≥1000 seeds, `isSolvable` true en el 100% (SC-004).
- [X] T007 [P] [US1] Test unidad de la **regla de selección de bloque** en `tests/circuitgen/beacon.test.ts` con datos simulados: último bloque con `timestamp < 00:00 UTC` aceptado con 3 confirmaciones; día = calendario UTC + chequeo de cordura (no del timestamp de la punta); y **caso SC-003**: resolver un día futuro cuyo bloque ancla aún no existe → NO produce circuito canónico (devuelve no-resuelto/offline).

### Implementation for User Story 1

- [X] T008 [US1] `src/circuitgen/solvability.ts`: `jumpEnvelope(constants)` desde el bloque **congelado** (gravity/jumpSpeed/moveSpeed), `isReachable(from,to,env,margin)`, `isSolvable(circuit, constants)`. Puro, cinemática cerrada (no física).
- [X] T009 [US1] `src/circuitgen/generate.ts`: `generateCircuit(seed, params) -> CircuitDefinition`. Layout en `-Z` sobre rejilla (posiciones = entero·grid), reutiliza primitivas y catálogo 001/002 (oscillate/rotateBar/pendulum/pusher/carry), ajuste **determinista** por solubilidad hasta converger, suelo de variedad/dificultad. Puro y headless.
- [X] T010 [US1] `src/daily/beacon.ts`: `getTip`, `getBlockAtHeight`, `selectAnchor(provider, dayUTC)` (Esplora) contra el proveedor **principal** (mempool.space); regla del bloque ancla + 3 confirmaciones; errores capturables (sin romper arranque). Solo lectura.
- [X] T011 [US1] `src/daily/daily.ts`: `resolveDailyCircuit(config, now)` — día = calendario UTC + chequeo de cordura contra la cadena, caché-first del día, resolver baliza (principal), `seedFromHash`→`generateCircuit`, `structuralHash`, `competitive=true`; cachear y devolver. Construcción de escena, fuera del paso fijo.
- [X] T012 [US1] `src/daily/storage.ts`: `loadDay`/`saveDay` en `localStorage` (clave `cacheKeyPrefix+dayUTC`); degrada con elegancia si no está disponible (FR-008).
- [X] T013 [US1] Cablear en `src/main.ts`: `await resolveDailyCircuit(...)` antes de jugar → `Simulation.create(config, daily.circuit)`; la latencia NO entra en el paso fijo (FR-006). `src/sim/` sin cambios.

**Checkpoint**: US1 funcional e independiente — el circuito diario se genera, es determinista,
impredecible y jugable. Puerta de determinismo/FPS sigue verde (sim intacto).

---

## Phase 4: User Story 2 - Verificable por cualquiera (Priority: P2)

**Goal**: cualquiera reproduce el circuito del día con hash + versión + el generador open source.

**Independent Test**: con la procedencia mostrada, reproducir el circuito y obtener el mismo
`structuralHash`; un hash falso no coincide.

### Tests for User Story 2

- [X] T014 [P] [US2] Vector de **verificación** en `tests/circuitgen/reproducibility.test.ts`: hash de bloque conocido + `generatorVersion` → `structuralHash` esperado fijo (SC-005); hash distinto → no coincide.

### Implementation for User Story 2

- [X] T015 [US2] `src/ui/dailyHud.ts` (mínimo): mostrar procedencia del día — fecha UTC, altura, hash del bloque, `generatorVersion` y etiqueta competitivo/offline (FR-011).
- [X] T016 [US2] En `src/daily/daily.ts`, garantizar que `DailyCircuit` registra `provenance` (BeaconAnchor), `generatorVersion`, `seedHex` y `structuralHash` para reproducción/verificación (FR-012).
- [X] T017 [US2] Documentar el procedimiento de verificación reproducible (hash+versión → `generateCircuit` → comparar `structuralHash`) en `specs/006-circuito-diario-btc/quickstart.md` (sección de verificación).

**Checkpoint**: US1 + US2 funcionan independientes — el circuito es reproducible y auditable.

---

## Phase 5: User Story 3 - Resiliencia: sin conexión y ante fallos (Priority: P3)

**Goal**: jugable siempre (red caída, proveedor caído, sin caché), sin pantalla en blanco; el circuito
de hoy no cambia al recargar; cuenta atrás y mejor marca a la vista.

**Independent Test**: caché+modo avión → mismo circuito; sin caché+sin red → offline etiquetado
jugable; proveedor principal bloqueado → alternativa; se ven cuenta atrás y mejor marca.

### Tests for User Story 3

- [X] T018 [P] [US3] Test de **cascada y offline** en `tests/circuitgen/beacon.test.ts`: principal falla → alternativa; sin red+sin caché → seed local no competitivo; un cacheado offline se reemplaza al resolver competitivo (FR-009/FR-010/FR-013).

### Implementation for User Story 3

- [X] T019 [US3] En `src/daily/beacon.ts`, añadir el proveedor **alternativo** (blockstream.info) y la cascada principal → alternativa antes de degradar (FR-010).
- [X] T020 [US3] En `src/daily/daily.ts`, **fallback offline**: `seedFromHash(localDateSeed(today))` → circuito "modo offline no competitivo" (`competitive=false`), sin reutilizar días anteriores; política de caché: competitivo **inmutable** el día, offline **reemplazable** al resolver competitivo (FR-009/FR-013).
- [X] T021 [US3] En `src/daily/storage.ts`, mejor marca local: `loadBest`/`saveBest` por día/`circuitId` (=`structuralHash`); marcas offline marcadas no competitivas; degrada con elegancia (FR-015).
- [X] T022 [US3] En `src/ui/dailyHud.ts`, **cuenta atrás** al próximo 00:00 UTC + **mejor marca local** del día + etiqueta offline/no competitivo; mensaje claro en vez de error (Principio VI).

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Confirmar que `tests/determinism.test.ts` sigue en VERDE sin cambios (sim intacto), a 30/60/144 Hz (SC-007).
- [ ] T024 [P] Verificar build de producción y que el juego arranca y es jugable **sin red** (offline) sin consola ni flags de dev (Principio VI / FR-009).
- [X] T025 [P] Verificar la **frontera headless**: `src/sim/` no importa `src/daily/` ni `src/circuitgen/` (revisión/grep). El generador puro no importa red ni DOM.
- [ ] T026 Prueba de juego manual del `quickstart.md` (US1/US2/US3) y pasada de ajuste de `circuitgen` en `config.ts` (variedad/dificultad/longitud); si se cambian constantes de generación, **subir `generatorVersion`**.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sin dependencias.
- **Foundational (T002–T004)**: tras Setup; **bloquea** todas las historias.
- **US1 (T005–T013)**: tras Foundational. MVP.
- **US2 (T014–T017)** y **US3 (T018–T022)**: tras Foundational; se apoyan en el generador/daily de US1 pero son testables de forma independiente.
- **Polish (T023–T026)**: tras las historias deseadas.

### Within Each User Story

Tests → solubilidad/generador → adaptador de baliza → orquestación → caché → cableado/UI.

### Parallel Opportunities

- Foundational: T002, T003, T004 en paralelo (archivos distintos).
- US1 tests: T005, T006, T007 en paralelo.
- Polish: T023, T024, T025 en paralelo.

## Parallel Example: Foundational

```text
# Lanzar juntas (archivos independientes):
T002 src/circuitgen/prng.ts
T003 src/circuitgen/seed.ts
T004 src/circuitgen/hash.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational, crítico) → 3. Phase 3 (US1). Con US1 ya hay circuito
   diario determinista, impredecible y jugable: MVP entregable y validable contra su Independent Test.

### Incremental Delivery

US1 (MVP) → US2 (verificabilidad) → US3 (resiliencia offline) → Polish. Cada historia se valida con su
prueba de juego antes de empezar la siguiente (Principio IV). La puerta de determinismo debe seguir en
verde en todo momento (Principio II): `src/sim/` no se toca en ninguna tarea.
