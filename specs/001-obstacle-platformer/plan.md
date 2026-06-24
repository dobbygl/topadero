# Implementation Plan: Topadero — Prototipo de circuito de obstáculos

**Branch**: `001-obstacle-platformer` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-obstacle-platformer/spec.md`
**Status**: Implemented and deployed to <https://dobbygl.github.io/topadero/>

## Summary

Prototipo jugable en navegador de escritorio (un jugador, local) que valida si controlar un personaje cápsula sobre un motor de físicas resulta divertido y responde bien. El jugador recorre un circuito corto de primitivas (plataformas, una rampa y al menos un obstáculo en movimiento) hasta una meta cronometrada, con cámara orbital en tercera persona, salto solo apoyado, respawn al caer y reinicio del intento.

Enfoque técnico: un **núcleo de simulación headless** (Rapier WASM: mundo físico, controlador de personaje cinemático con cápsula, obstáculo móvil, zonas de salida/meta) que avanza con **paso de tiempo fijo mediante acumulador**, desacoplado del render. Three.js y el HUD son **vistas puras** que leen el estado de la simulación e interpolan entre estados para suavizar el render. Todo el ajuste vive centralizado en `config.ts`. La independencia de FPS (Principio II, no negociable) se verifica con un test automático de Vitest que alimenta distintas líneas de tiempo de fotograma sobre los mismos inputs y compara el estado resultante.

## Technical Context

**Language/Version**: TypeScript 6.x (target ES2022, ESM), Node.js 22 en CI
**Primary Dependencies**: Three.js `^0.184`, `@dimforge/rapier3d-compat` `^0.19.3`, Vite 8
**Storage**: N/A. Sin persistencia más allá de la sesión (sin backend, sin red, sin localStorage). El mejor tiempo no se guarda; solo se muestra el tiempo del intento.  
**Testing**: Vitest 4. Cuatro pruebas de determinismo sobre 60/jitter/30/144 Hz; prueba manual reutilizable en `quickstart.md`.
**Target Platform**: Navegador de escritorio moderno con WebGL2 y WebAssembly.  
**Project Type**: Aplicación de navegador de un solo proyecto (solo frontend).  
**Performance Goals**: ≥ 60 FPS de render en navegador de escritorio típico (SC-008); física a paso fijo 60 Hz, independiente de la tasa de fotogramas (SC-004, FR-013).  
**Constraints**: escena solo con primitivas (cápsulas, cajas, cilindros), sin modelos ni audio; personaje con collider cápsula y controlador cinemático; respawn que devuelve el control en pocos segundos (objetivo ≤ 3 s, SC-005), sin recargar; sin tunneling y con deslizamiento estable incluso bajo empuje del obstáculo.  
**Scale/Scope**: un único circuito corto, un jugador, una sesión local.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra la Constitución de Topadero v1.0.0:

| Principio | Estado | Cómo lo respeta el plan |
|---|---|---|
| I. La sensación de juego manda | PASS | La US1 (control y feel) es la primera rebanada; la puerta de aceptación es la prueba de juego manual contra escenarios/SC, recogida en `quickstart.md`. La interpolación de render se mantiene a propósito para no introducir stutter que degrade el feel (ver nota abajo). |
| II. Física determinista e independiente de FPS (NO NEGOCIABLE) | PASS | Bucle de paso fijo con acumulador; núcleo headless puro respecto a Three/DOM; hot path sin `Date.now`/`Math.random`/iteración no determinista. Los flancos (salto/reinicio) se capturan con timestamp de reloj y se consumen en el paso fijo cuyo intervalo de sim-time los contiene → el salto se dispara al mismo sim-step a cualquier FPS. El test de Vitest alimenta la misma línea de inputs sobre 4 cadencias (60/jitter/30/144 Hz) y compara estado a igual nº de pasos con **igualdad exacta** (epsilon de redondeo float, sin tolerancia perceptual ajustable). Empuje, meta, salida y umbral se leen dentro del paso fijo. |
| III. Disciplina de alcance (YAGNI) | PASS | Solo primitivas, cápsula + KCC, un circuito, sin audio/menús/red/persistencia. La única dependencia "extra" (Vitest) es la que exige el Principio II para su puerta automática. Sin infraestructura "por si acaso". |
| IV. Rebanadas verticales jugables | PASS | El orden de construcción respeta P1 → P2 → P3; cada historia queda jugable y validable por separado (detallado en `quickstart.md`). |
| V. Comportamiento sobre cifras; simplicidad | PASS | Todos los parámetros de ajuste en un único `config.ts`. Se usa el move-and-slide integrado del KCC en vez de matemática de colisión propia. Sin abstracción prematura. |

**Complejidad mantenida a propósito (no es violación de III)**: la **interpolación de render** entre estados de física añade una pieza al bucle, pero sirve al Principio I y a FR-002/SC-008 (a 144 Hz de render sobre 60 Hz de física hay stutter visible sin ella). Se descarta la alternativa de física a tasa variable, que rompería el Principio II.

**Resultado del gate (pre-Phase 0)**: PASS. Sin violaciones que justificar en *Complexity Tracking*.

**Re-evaluación post-Phase 1**: PASS. La verificación confirmó el KCC, el descarte de CCD para cuerpos cinemáticos, el knockback enrutado por move-and-slide y el modelo de input con timestamp. Durante la implementación, las consultas de empuje/meta se simplificaron a AABB deterministas sin alterar requisitos ni principios.

**Reconciliación post-implementación**: PASS. El código final conserva el núcleo headless, paso fijo, KCC, interpolación y test multi-cadencia. Simplifica dos decisiones: empuje/meta se detectan con AABB deterministas y `gameLoop.advance()` —no `Simulation.step()`— ventana los flancos con timestamp.

## Project Structure

### Documentation (this feature)

```text
specs/001-obstacle-platformer/
├── plan.md              # Plan original + reconciliación final
├── research.md          # Decisiones y resultado implementado
├── data-model.md        # Estado en memoria actual
├── quickstart.md        # Ejecución y regresión manual
├── contracts/           # Fronteras actuales
│   ├── simulation-api.md   # Seam del núcleo de simulación (lo que ejercita el test de determinismo)
│   └── controls.md         # Mapeo de entrada → acción
└── tasks.md             # Registro de tareas completadas
```

### Source Code (repository root)

```text
index.html                     # Punto de entrada Vite; canvas + contenedor del HUD
package.json
tsconfig.json
vite.config.ts
vitest.config.ts               # (o sección test en vite.config.ts)
src/
├── main.ts                    # Bootstrap: await RAPIER.init() (una vez), crea Simulation + renderer + input + HUD, arranca el bucle
├── config.ts                  # ÚNICO lugar de parámetros de ajuste (Principio V); enumeración completa en data-model
├── circuit.ts                 # Definición PURA del circuito (plataformas, rampa, muros, zonas: forma+pose+tipo visible). La consumen sim/ (colliders) y render/ (mallas); surfaced por sim.getCircuitDefinition()
├── core/
│   └── gameLoop.ts            # Bucle de paso fijo con acumulador, clamp anti-espiral, interpolación de render; mapea timestamps de flancos a pasos
├── sim/                       # NÚCLEO HEADLESS — no importa Three.js ni toca el DOM; sin Date.now/Math.random en el hot path
│   ├── simulation.ts          # Mundo Rapier; step(StepInput), AABB de empuje/meta, respawn y lecturas
│   ├── player.ts              # KCC + cápsula: gravedad, move-and-slide, grounded, coyote time y knockback
│   ├── movingObstacle.ts      # Trayectoria cinemática pura y derivada
│   ├── zones.ts               # Función pura de pertenencia a AABB
│   └── runState.ts            # Máquina de estados del intento (idle/running/won) y cronómetro (tiempo de sim)
├── input/
│   └── input.ts               # Teclado + ratón (pointer lock); distingue movimiento/salto vs cámara; flancos con event.timeStamp; clamp del delta de ratón
├── render/
│   ├── scene.ts               # Mallas Three.js: geometría estática de sim.getCircuitDefinition() + transforms interpolados (jugador y obstáculo)
│   └── followCamera.ts        # Cámara orbital 3ª persona, seguimiento suavizado (dt de render); base de movimiento desde el yaw crudo
└── ui/
    └── hud.ts                 # Overlay DOM: cronómetro, banner de victoria, aviso de reinicio

tests/
└── determinism.test.ts        # Puerta automática del Principio II
```

**Structure Decision**: Proyecto único de frontend. La línea divisoria que importa es `src/sim/` (núcleo de simulación, puro respecto a Three.js y el DOM) frente a `src/render/`, `src/ui/` e `src/input/` (vistas y adaptadores de E/S). El núcleo es instanciable sin navegador, lo que permite que `tests/determinism.test.ts` lo ejercite con `@dimforge/rapier3d-compat` en Node. `config.ts` concentra todo el ajuste. Esta separación es la que sostiene los Principios II (verificable) y V (simple y ajustable).

## Delivery

`.github/workflows/deploy.yml` ejecuta `npm ci`, `npm test` y `npm run build` en cada push a `main`, y publica `dist/` en GitHub Pages. `vite.config.ts` usa `base: './'`. El bundle principal incluye Rapier WASM embebido y actualmente genera una advertencia de tamaño (~2,76 MB sin comprimir), aceptada para el MVP.

## Complexity Tracking

> Sin violaciones del Constitution Check. Sección no aplicable (la interpolación de render se documenta arriba como complejidad deliberada al servicio de un principio, no como violación).
