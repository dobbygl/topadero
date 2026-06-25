---

description: "Task list para 004 — Entrada, accesibilidad y app instalable (PWA)"
---

# Tasks: Entrada, accesibilidad y app instalable (mando · táctil/móvil · PWA)

**Input**: Design documents from `/specs/004-input-accessibility/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/input-contract.md, quickstart.md

**Tests**: la única prueba automática obligatoria es la puerta de determinismo (Principio II, NO
NEGOCIABLE): se EXTIENDE `tests/determinism.test.ts`. Los tests unitarios del adaptador son
opcionales y van marcados como tal.

**Organization**: tareas agrupadas por historia. Orden de entrega (del plan): US1 → US4 → US2 → US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1 (mando+táctil), US2 (reasignación/sensibilidad), US3 (accesibilidad), US4 (PWA)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Vite). Código en `src/`, tests en `tests/`, assets servidos del juego en `public/`,
landing de marketing en `marketing/landing/`. `src/sim/` NO se toca en esta feature.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dejar el ajuste y los stubs de módulos listos sin cambiar comportamiento.

- [ ] T001 Añadir las perillas de ajuste de la feature a `src/config.ts`: bindings por defecto,
  `deadzone`, `cameraSensitivity`, `invertX`/`invertY`, layout del overlay táctil (zonas y tamaños),
  `reducedMotion` por defecto, `hudScale`/`hudHighContrast` (Principio V; ver data-model.md).
- [ ] T002 [P] Crear los stubs de los módulos nuevos con sus firmas exportadas:
  `src/input/keyboardMouse.ts`, `src/input/gamepad.ts`, `src/input/touch.ts`, `src/input/scheme.ts`,
  `src/ui/touchControls.ts`, `src/pwa/install.ts`.

---

## Phase 2: Foundational (prerequisitos bloqueantes)

**Purpose**: refactor del adaptador de entrada conservando el contrato `getFrameInput(): FrameInput`
y el comportamiento de teclado+ratón. Bloquea todas las historias de entrada.

**⚠️ CRITICAL**: ninguna historia de entrada empieza hasta cerrar esta fase con el determinismo en verde.

- [ ] T003 Extraer la lógica actual de teclado+ratón de `src/input/input.ts` a
  `src/input/keyboardMouse.ts` (adaptador), sin cambiar comportamiento (mismas teclas, pointer lock,
  flancos con `e.timeStamp`).
- [ ] T004 Implementar `src/input/scheme.ts`: esquema activo (`keyboardMouse`/`gamepad`/`touch`) que
  sigue a la última entrada usada; expone `markActive(kind)` que llaman los adaptadores y el esquema
  actual para mostrar/ocultar el overlay táctil.
- [ ] T005 Refactor de `src/input/input.ts` a agregador: posee yaw/pitch, fusiona los adaptadores en
  un único `FrameInput { moveAxis, cameraYaw, edges }` y conserva exactamente la firma y el
  comportamiento previos (contrato en contracts/input-contract.md).
- [ ] T006 Verificar la puerta de determinismo tras el refactor: `npx vitest run tests/determinism.test.ts`
  debe seguir en verde (no debe cambiar nada de la simulación).

**Checkpoint**: la frontera de entrada es modular y el determinismo sigue intacto.

---

## Phase 3: User Story 1 — Jugar con mando o con los dedos (Priority: P1) 🎯 MVP

**Goal**: el juego es jugable de principio a fin con mando o en táctil, sin teclado, conviviendo con
teclado+ratón y con cambio de esquema en caliente.

**Independent Test**: completar el circuito solo con mando; completarlo solo en táctil; conectar/
desconectar el mando en partida sin perder el control (quickstart US1).

- [ ] T007 [P] [US1] Adaptador de mando en `src/input/gamepad.ts`: polling de `navigator.getGamepads()`
  por fotograma; stick izquierdo → `moveAxis` con deadzone radial (magnitud ≤ 1); stick derecho →
  delta de yaw/pitch; botón de salto → flancos `jump`/`jumpRelease` con timestamp = `now` del
  fotograma; manejo de conexión/desconexión (research R1, R3).
- [ ] T008 [P] [US1] Adaptador táctil en `src/input/touch.ts`: Pointer Events con `pointerId`;
  joystick virtual (mitad izquierda) → `moveAxis` proporcional; zona derecha → delta de cámara; botón
  de salto → flancos con `e.timeStamp`; multi-touch y captura del puntero del joystick (research R2).
- [ ] T009 [US1] Overlay táctil en `src/ui/touchControls.ts`: joystick (izq), botón de salto
  (abajo-dcha) y zona de cámara (dcha) según el layout de `config.ts`; responsive a tamaño/orientación
  y sin ocultar el centro de la pantalla (FR-002, FR-010).
- [ ] T010 [US1] Cablear adaptadores en el agregador y el esquema activo en `src/input/input.ts`,
  `src/input/scheme.ts` y `src/main.ts`: mostrar el overlay solo en táctil, cambio en caliente
  (incluida conexión/desconexión de mando) y soltar entradas "pegadas" al desconectar o perder foco.
- [ ] T011 [US1] EXTENDER la puerta de determinismo en `tests/determinism.test.ts` (OBLIGATORIO,
  Principio II): caso de `moveAxis` analógico parcial (p. ej. magnitud 0.5) idéntico a 60/jitter/30/144 Hz,
  y caso de flancos de salto de fuente mando/táctil (mismos `InputEdge` con timestamp) idénticos.
- [ ] T012 [P] [US1] (opcional) Tests unitarios del adaptador en `tests/input/`: deadzone/normalización
  analógica y regla de detección de esquema.
- [ ] T013 [US1] Prueba de juego manual de US1 (quickstart): mando, táctil y cambio de esquema.

**Checkpoint**: US1 funcional e independiente. MVP de la feature.

---

## Phase 4: User Story 4 — Instalar como app (PWA) (Priority: P2)

**Goal**: el juego se instala como PWA en el móvil, arranca a pantalla completa desde el icono y se
juega sin conexión; la landing sugiere instalar de forma no intrusiva.

**Independent Test**: instalar desde la landing, abrir desde el icono a pantalla completa en `/play`,
jugar en modo avión, comprobar paridad de física vs pestaña (quickstart US4). Depende de la
experiencia táctil de US1; independiente de US2/US3.

- [ ] T014 [P] [US4] Añadir los iconos y el color de tema de la marca Topadero en `public/` (set de
  iconos para instalación).
- [ ] T015 [US4] Crear el Web App Manifest `public/manifest.webmanifest` (name/short_name, theme/
  background, `display` standalone/fullscreen, `start_url`/`scope` relativos a `/play`) y enlazarlo
  desde `index.html` (research R8).
- [ ] T016 [US4] Service worker que precachea el build del juego para uso offline (cache-first del
  shell; el WASM de Rapier va embebido en el bundle JS, así que queda cubierto) con estrategia de
  actualización (activar la versión nueva en la siguiente carga, sin atascar al jugador), vía
  `vite-plugin-pwa` o a mano (`vite.config.ts` / `public/`) (research R9).
- [ ] T017 [US4] Registro del service worker y estado de instalación en `src/pwa/install.ts`
  (detectar standalone/`appinstalled`, `canPrompt`).
- [ ] T018 [US4] Invitación a instalar en `marketing/landing/`: capturar `beforeinstallprompt`, botón/
  aviso no intrusivo y descartable, sin reaparecer de forma molesta en la sesión, y nunca bloqueante
  (FR-017, FR-022).
- [ ] T019 [US4] Fallback para navegadores sin prompt (iOS Safari) en `marketing/landing/`:
  instrucciones equivalentes de "Añadir a pantalla de inicio" (FR-017, AS2).
- [ ] T020 [US4] Prueba de juego manual de US4 (quickstart): instalar, abrir a pantalla completa desde
  el icono, jugar en modo avión, comprobar actualización y paridad de física (FR-020).

**Checkpoint**: el juego se instala y se juega offline sin tocar la simulación.

---

## Phase 5: User Story 2 — Sensibilidad y reasignación (Priority: P2)

**Goal**: sensibilidad de cámara, inversión de ejes y reasignación de controles, como valores con
nombre y a través de un seam estable (la UI la aporta el shell; el guardado, la persistencia).

**Independent Test**: cambiar un binding o la sensibilidad por `config.ts` y comprobar el efecto en
el comportamiento (quickstart US2).

- [ ] T021 [P] [US2] Mapa de bindings con defaults en `config.ts` y lógica de reasignación
  (acción → control) en `src/input/` (agregador/adaptadores): reasignar el salto desasigna su control
  anterior (AS1).
- [ ] T022 [P] [US2] Aplicar `cameraSensitivity` e inversión de ejes desde las preferencias en la ruta
  de cámara de la entrada (`src/input/*`, `src/config.ts`) (AS2, AS3).
- [ ] T023 [US2] Exponer un seam estable de preferencias (en memoria + defaults) listo para que lo
  consuman las specs de shell (UI) y persistencia (guardado); documentar el diferimiento.
- [ ] T024 [US2] Prueba de juego manual de US2 (quickstart): rebind de salto, sensibilidad e inversión.

**Checkpoint**: la entrada es configurable; la UI y el guardado quedan listos para specs posteriores.

---

## Phase 6: User Story 3 — Accesibilidad básica (Priority: P3)

**Goal**: reduced motion, legibilidad del HUD y objetivos táctiles cómodos, sin afectar a la física.

**Independent Test**: activar reduced motion y ver la atenuación sin cambio de trayectoria; HUD legible;
controles táctiles cómodos (quickstart US3).

- [ ] T025 [P] [US3] Honrar `reducedMotion` en `src/render/followCamera.ts`: atenuar/omitir movimiento
  de cámara no esencial; sembrar desde `prefers-reduced-motion`; sin tocar la pose del KCC ni el paso
  fijo (FR-008).
- [ ] T026 [P] [US3] Opciones de legibilidad del HUD (contraste/tamaño) en `src/ui/hud.ts` (FR-009).
- [ ] T027 [US3] Refinar tamaños de los objetivos táctiles y la no-oclusión en `src/ui/touchControls.ts`
  (FR-010, AS2).
- [ ] T028 [US3] Prueba de juego manual de US3 (quickstart): reduced motion, HUD y comodidad táctil.

**Checkpoint**: todas las historias funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: cierre transversal.

- [ ] T029 [P] Comprobar el rendimiento en móvil de gama media: >= 30 FPS estable con táctil + overlay
  (SC-005).
- [ ] T030 Comprobar la frontera: `src/sim/` no importa `src/input`, `src/ui`, la capa PWA ni carga
  assets (Principio III).
- [ ] T031 Ejecutar la validación completa de `quickstart.md` (US1, US4, US2, US3 + puerta de determinismo).
- [ ] T032 [P] (opcional) Nota breve en docs/README sobre mando/táctil/PWA (el reencuadre de README
  prototipo → juego se difiere a la spec de publicación).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias.
- **Historias (Phase 3+)**: dependen de Foundational. Orden de entrega sugerido US1 → US4 → US2 → US3.
- **Polish (Phase 7)**: depende de las historias entregadas.

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Sin dependencias de otras historias. Es el MVP.
- **US4 (PWA, P2)**: tras Foundational; se apoya en la experiencia táctil de US1 (instalar algo
  jugable). Independiente de US2/US3.
- **US2 (P2)**: tras Foundational; usa los bindings/ejes que US1 introduce, pero es testable sola por
  `config.ts`. La UI/guardado son de specs posteriores.
- **US3 (P3)**: tras Foundational; refina sobre US1 (overlay táctil) y render.

### Parallel Opportunities

- T002 en Setup; T007/T008 (adaptadores, archivos distintos) y T012 en US1; T014 en US4; T021/T022 en
  US2; T025/T026 en US3; T029/T032 en Polish.
- Con varias personas, tras Foundational: US1 primero (MVP); luego US4 y US2 pueden ir en paralelo
  (archivos casi disjuntos: PWA vs entrada/config), cuidando los cambios compartidos en `config.ts`.

## Parallel Example: User Story 1

```bash
# Adaptadores de US1 en paralelo (archivos distintos):
Task: "T007 Adaptador de mando en src/input/gamepad.ts"
Task: "T008 Adaptador táctil en src/input/touch.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup → 2. Phase 2 Foundational (CRÍTICO, determinismo en verde) → 3. Phase 3 US1.
4. PARAR y VALIDAR US1 (quickstart): jugable con mando y táctil. Es un incremento publicable de control.

### Incremental Delivery

US1 (MVP) → US4 (se queda en el móvil como app) → US2 (ajuste fino) → US3 (accesibilidad). Cada
historia añade valor sin romper las anteriores; tras cada una, validar su quickstart.

## Notes

- La puerta de determinismo (T011) es OBLIGATORIA: si falla, la feature no está terminada (Principio II).
- `[P]` = archivos distintos sin dependencias; cuidado con los toques concurrentes en `config.ts`.
- `src/sim/` no se modifica en ninguna tarea.
- La UI de ajustes (US2) y el guardado de preferencias dependen de las specs de shell y persistencia;
  aquí se dejan como valores en `config.ts` y un seam en memoria.
- Commit tras cada tarea o grupo lógico; parar en cada checkpoint para validar la historia.
