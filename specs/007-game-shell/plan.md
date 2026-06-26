# Implementation Plan: Shell de juego (título, pausa, resultados y ajustes)

**Branch**: `007-game-shell` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-game-shell/spec.md`

## Summary

Envolver el circuito diario (006) en un **shell de juego** jugable de extremo a extremo: título →
jugar → resultados → rejugar/volver, más pausa y un panel de ajustes, todo desde la interfaz, sin
consola ni flags (Principio VI). El núcleo es una **máquina de estados de presentación**
(`title | playing | paused | results`) que vive en `src/ui` como **vista pura**: lee el estado de la
simulación y emite intención, sin tocar la física. El bucle de render solo llama a `advance()` en
`playing`; la **pausa se implementa FUERA de `advance` y de `src/sim/`** (no se avanza y, al reanudar,
se desplaza el ancla `simStartWall` por el tiempo pausado), de modo que el test de determinismo sigue
intacto y los flancos colgados (salto) caen solos al quedar su ventana en el pasado (FR-008/012/013).
El panel de ajustes reutiliza lo ya existente: `AudioManager.setMusicVolume/setSfxVolume` (hot-apply
listo, 005) y las preferencias de entrada (004); se añade una **capa runtime de ajustes** (defaults
desde `config.ts`, valor actual persistido en `localStorage`) para cumplir FR-019/FR-019a. Por la
aclaración Q4, `main.ts` se reestructura con un ciclo **"cargar circuito"** (resolver día →
`Simulation.create` → `loadAssets` → `SceneView`) reutilizable, para re-resolver y reconstruir el
mundo al volver al título tras cambiar el día UTC (FR-024a), que de paso deja lista la costura de la
futura selección de circuito (FR-025). `src/sim/` **no se modifica**.

## Technical Context

**Language/Version**: TypeScript (proyecto Vite existente); Node 22 en CI/tests.
**Primary Dependencies**: Three.js y Rapier (existentes; sin librerías nuevas). El shell es DOM/CSS
sobre los overlays de `index.html` (sin framework de UI: la app ya maneja la UI con vistas DOM puras
en `src/ui/`). Web Audio (`AudioManager`, 005) y `localStorage` (persistencia local).
**Storage**: `localStorage` para las preferencias de jugador (volúmenes música/SFX, sensibilidad,
mapeos de entrada). Defaults en `config.ts`; valores actuales en un registro `PlayerSettings`
persistido. La mejor marca del día ya la gestiona `src/daily/` (006). Degrada con elegancia si el
almacenamiento no está (incógnito/cuota): los ajustes funcionan en la sesión y se arranca con los
defaults (FR-024, SC-007/SC-008).
**Testing**: Vitest. `tests/determinism.test.ts` **no cambia** (`src/sim/` y el núcleo de `advance()`
intactos) y sigue en verde. Nuevo: `tests/core/pause.test.ts` — una corrida con pausa(s) intermedia(s)
produce exactamente los mismos sim-steps/estado que sin pausa (FR-013, SC-004). **Debe incluir una
pausa más larga que `MAX_SUBSTEPS × DT`** (si no, el clamp anti-espiral no se dispara y un test corto
pasaría con la implementación rota) y el caso de **re-anclaje en intento nuevo** (`createLoopState()`
no debe correr pasos espurios al re-entrar tras un rato fuera). Ojo a las UNIDADES: el desplazamiento
va en segundos (mismo reloj que `advance`, `nowMs/1000`). Opcional: test de la máquina de estados del
shell (transiciones puras).
**Target Platform**: navegador de escritorio y móvil (web estática), v2.2.0. Interfaz responsive y
táctil (retrato/apaisado). Sin backend propio.
**Project Type**: aplicación web de un solo proyecto (juego en navegador). Estructura existente
`src/{sim,core,render,ui,input,audio,daily,circuitgen}`.
**Performance Goals**: mantener >= 60 FPS escritorio / >= 30 FPS móvil (SC-008) con el shell cargado;
los overlays del shell son DOM ligero y no entran en el paso fijo. La **reconstrucción de circuito**
al cambiar el día (FR-024a) ocurre al volver al título (no a mitad de intento), como el arranque;
objetivo: misma latencia que el boot, sin fugas de recursos WebGL al reconstruir.
**Constraints**: la pausa NO toca `advance()` ni `src/sim/` (Principio II); el shell vive en `src/ui`
y `src/sim/` no lo importa (frontera headless, Principio III); todos los defaults de ajuste viven en
`config.ts` (Principio V); web estática sin backend; el flujo completo funciona offline y sin
`localStorage` (Principio VI). Las teclas/flags de dev pueden seguir (p. ej. `?shot` salta el título
para capturas) pero el juego no depende de ellas (FR-023).
**Scale/Scope**: un juego corto y diario. Cuatro pantallas (título, pausa, resultados, ajustes) +
máquina de estados + capa de ajustes persistidos + reestructura del ciclo de carga de circuito en
`main.ts`. Sin selección de circuito (solo el hueco, FR-025).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design (ver abajo).*

- **I. La sensación de juego manda** — PASA. El shell no toca el control ni la física: envuelve el
  juego ya validado. La pausa congela y reanuda sin alterar la trayectoria (FR-013). Puerta = prueba
  de juego manual del quickstart (el control se siente igual antes/después de pausar).
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — PASA, y por diseño. `src/sim/` **no se
  toca** y el núcleo de `advance()` no cambia: la pausa se implementa como *no llamar a `advance` y
  desplazar `simStartWall`* (helper aparte, fuera del paso fijo). El test de determinismo sigue en
  verde sin tocar tolerancias, y se añade `pause.test.ts` que prueba pausa-equivalencia (FR-013,
  SC-004). El audio y el shell ya corren en tiempo de render.
- **III. Alcance de producto y disciplina de acabado** — PASA. El "shell de juego (título, pausa,
  victoria/derrota, ajustes)" está EXPLÍCITAMENTE en alcance (Principio III, v2.0.0). El shell vive en
  `src/ui` como vista pura; `src/sim/` no importa UI/persistencia. Persistencia estrictamente local;
  sin backend, sin red entre jugadores, sin telemetría. La re-resolución del día (FR-024a) reusa el
  adaptador de solo lectura existente de `src/daily/` con su degradación offline.
- **IV. Rebanadas verticales jugables** — PASA. Orden P1 (US1 título→jugar, US2 resultados→rejugar,
  US3 pausa) → P2 (US4 ajustes) → P3 (US5 pulido). Cada historia es jugable y se valida en su
  checkpoint del quickstart antes de seguir.
- **V. Comportamiento sobre cifras: `config.ts`** — PASA. Los defaults de volúmenes y sensibilidad ya
  viven en `config.ts`; la capa `PlayerSettings` los toma como punto de partida y persiste el valor
  elegido (FR-019/FR-019a). No se introducen números mágicos de UI dispersos.
- **VI. Acabado de producto publicable** — PASA: ES la razón de ser de la spec. El flujo de extremo a
  extremo queda sin consola ni flags (FR-010); volúmenes accesibles desde ajustes; preferencias
  recordadas (FR-019a) con degradación si no hay storage (FR-024). Las pantallas de error de arranque
  (WebGL/WASM/assets) y la pasada de rendimiento quedan para la spec de robustez/publicación (fuera de
  alcance aquí, declarado en la spec).

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño confina el shell y los ajustes a `src/ui`
(+ una capa de ajustes en `src/settings/`), la pausa a un helper de `src/core/` fuera de `advance`, y
la reconstrucción de circuito a `src/main.ts`; nada de esto entra en `src/sim/` ni en el paso fijo.
Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/007-game-shell/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (pausa determinista, reconstrucción de circuito, capa de ajustes,
│                        #         pausa de escritorio vía pointerlock/foco, máquina de estados del shell)
├── data-model.md        # Fase 1 (ShellState, PlayerSettings, AttemptResult; reuso de DailyCircuit/LocalDailyBest)
├── quickstart.md        # Fase 1 (prueba manual del flujo: título→jugar→resultados→rejugar, pausa, ajustes, día UTC, offline)
├── contracts/
│   ├── shell-state.md   # Contrato de UI: estados, transiciones, intenciones; quién avanza el bucle
│   └── settings.md      # Contrato de ajustes: modelo, hot-apply, persistencia, degradación
└── checklists/
    └── requirements.md  # Checklist de calidad (de /speckit-specify + clarify)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── gameLoop.ts        # AÑADIR helper puro de pausa (desplazar simStartWall por el tiempo pausado +
│                          #   limpiar flancos pendientes). `advance()` NO cambia → determinismo intacto.
├── ui/
│   ├── shell.ts           # NUEVO: máquina de estados (title|playing|paused|results) + pantallas DOM
│   │                      #   (título, pausa, resultados); vista pura que lee run state y emite intención
│   ├── settingsPanel.ts   # NUEVO: panel de ajustes (volúmenes, sensibilidad, reasignación, toggle debug),
│   │                      #   accesible desde título y pausa; aplica en caliente
│   ├── hud.ts             # SIN CAMBIOS de lógica (vista del run); el shell lo muestra/oculta por estado
│   ├── dailyHud.ts        # SIN CAMBIOS (procedencia + cuenta atrás + mejor marca); convive con el shell
│   └── touchControls.ts   # SIN CAMBIOS (en móvil NO hay botón de pausa: la pausa es pérdida de foco, FR-007a)
├── settings/
│   ├── settings.ts        # NUEVO: PlayerSettings runtime (defaults de config) + aplicación a audio/cámara/entrada
│   └── storage.ts         # NUEVO o reuso del patrón de daily/storage.ts: read/writeJSON con degradación
├── input/
│   └── preferences.ts     # EXTENDER: el registro persistido incluye también volúmenes (unificar, no duplicar)
├── main.ts                # REESTRUCTURAR: ciclo "cargar circuito" (resolver→Simulation.create→loadAssets→
│                          #   SceneView) reutilizable + teardown; bucle shell-aware (advance solo en playing);
│                          #   "Jugar" absorbe el desbloqueo de audio (resume+startMusic) del overlay actual
└── config.ts             # SIN CLAVES NUEVAS de feel; defaults de ajuste ya presentes (audio.*, mouseSensitivity,
                          #   touchLookSensitivity, gamepadLookSpeed, invertCameraY); añadir solo defaults de UI si hace falta

index.html                # Overlays del shell (título/pausa/resultados/ajustes); el actual #click-to-play
                          #   se sustituye/absorbe por el botón "Jugar" del título

tests/
├── determinism.test.ts   # SIN CAMBIOS; debe seguir en verde (src/sim y el núcleo de advance intactos)
└── core/
    └── pause.test.ts     # NUEVO: pausa(s) intermedia(s) → mismos sim-steps/estado que sin pausa (FR-013/SC-004)
```

**Structure Decision**: proyecto único existente. El shell es DOM/CSS puro en `src/ui` (coherente con
`hud.ts`/`dailyHud.ts`/`sandboxPanel.ts`, que ya manejan UI sin framework). La pausa se resuelve con un
helper en `src/core/gameLoop.ts` que NO altera `advance()`; los ajustes en `src/settings/` (defaults de
`config.ts`, valor persistido). `src/main.ts` pasa de "construir una escena fija al arrancar" a "cargar
un circuito (resoluble/reconstruible)" gobernado por el shell. **`src/sim/` no se modifica** y la puerta
de determinismo no cambia.

## Complexity Tracking

> Sin violaciones de la constitución que justificar (el shell está en alcance v2.0.0; la pausa no toca
> `src/sim/` ni `advance()`; persistencia estrictamente local). Sección no aplicable.
