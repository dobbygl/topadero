# Implementation Plan: Pase de feel del control

**Branch**: `003-control-feel-pass` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-control-feel-pass/spec.md`

## Summary

Pase de "feel" sobre el controlador ya validado (MVP): jump buffering, coyote time afinado,
salto de altura variable (con altura mínima garantizada), control aéreo, aceleración/
desaceleración en suelo y curva de gravedad asimétrica. No añade contenido ni cambia el
alcance: enriquece la lógica de movimiento/salto en `src/sim/player.ts` y centraliza todas las
perillas en `src/config.ts`.

Enfoque técnico: el bucle de paso fijo (`gameLoop.advance`) ya ventanea los **flancos con
timestamp** (salto, reinicio) al sim-step que contiene su marca de tiempo, de modo que el salto
cae en el mismo paso a cualquier FPS (research R7 del MVP). Esta feature añade un **flanco
simétrico de soltado** (`jumpRelease`) por el mismo camino, para que el corte del salto variable
ocurra en el mismo sim-step a 30 o 144 FPS. El resto del feel (rampas de velocidad, control
aéreo, gravedad asimétrica) es estado del jugador integrado **dentro del paso fijo** con `dt`
constante, por lo que es determinista por construcción. La puerta automática (test de
determinismo) crece con casos de pulsación bufferizada y de salto soltado-temprano-vs-mantenido,
muestreando el **pico de altura** (no solo el estado final) para que el test verifique de verdad
el arco del salto.

## Technical Context

**Language/Version**: TypeScript (ESM), Node ≥ 18 para tests  
**Primary Dependencies**: three, @dimforge/rapier3d-compat (físicas WASM, `await RAPIER.init()`), vite, vitest  
**Storage**: N/A (sin persistencia más allá de la sesión)  
**Testing**: Vitest; puerta no negociable `tests/determinism.test.ts` (Principio II)  
**Target Platform**: navegador de escritorio, un jugador, local  
**Project Type**: app de navegador con núcleo de simulación headless desacoplado del render  
**Performance Goals**: ≥ 60 FPS (SC heredado del MVP); el feel no añade coste de render  
**Constraints**: determinismo / independencia de FPS NO NEGOCIABLE; toda mecánica nueva se
consume dentro del paso fijo; todo el ajuste en `config.ts`; colisión sobre el collider cápsula  
**Scale/Scope**: un controlador de personaje; ~6 mecánicas de feel; sin contenido nuevo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. La sensación de juego manda** — ✅ El pase existe para mejorar el control (la hipótesis
  bajo prueba). Puerta de aceptación: prueba de juego manual de `quickstart.md` (SC-008) + no
  regresión de lo validado en US1 del MVP.
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — ✅ Decisión central del diseño:
  el soltado del salto se modela como **flanco con timestamp** (igual que el salto), y todas las
  mecánicas (buffer, salto variable, control aéreo, accel/decel, gravedad asimétrica) se integran
  dentro del paso fijo. El test crece con casos nuevos y muestrea el pico de altura. **Matiz
  documentado**: el movimiento horizontal es de muestreo continuo (held-sampled), no flanco; la
  garantía de independencia de FPS para locomoción es "misma trayectoria con input mantenido",
  no exactitud por evento (ver `contracts/` y R1).
- **III. Disciplina de alcance (YAGNI)** — ✅ Sin contenido nuevo, sin audio/modelos/menús/red/
  niveles. Solo se enriquece la lógica del controlador + un flanco de entrada. Colisión sigue
  sobre primitivas (cápsula). No requiere enmienda de constitución (confirmado por el prompt).
- **IV. Rebanadas verticales jugables** — ✅ Orden P1 (US1: buffering + coyote) → P2 (US2: salto
  variable) → P3 (US3: locomoción con peso + control aéreo). Cada historia se valida (playtest +
  test de determinismo en verde) antes de la siguiente.
- **V. Comportamiento sobre cifras** — ✅ Todas las ventanas, fuerzas, aceleraciones y
  multiplicadores de gravedad son parámetros con nombre en `config.ts`.

**Resultado**: PASA. Sin violaciones → `Complexity Tracking` vacío.

## Project Structure

### Documentation (this feature)

```text
specs/003-control-feel-pass/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0: decisiones de feel + determinismo
├── data-model.md        # Fase 1: estado del jugador, máquina de intención de salto, catálogo de perillas
├── quickstart.md        # Fase 1: guion de playtest por historia + puerta automática
├── contracts/
│   ├── controls.md      # Entrada → acción (añade flanco de soltado; held vs tap; buffer; coyote)
│   └── simulation-api.md# Delta de StepInput/PlayerStateView + garantías de paso fijo
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea este comando)
```

### Source Code (repository root)

Esta feature **no añade módulos**: enriquece archivos existentes. Frontera intacta (sim headless,
render como vista pura).

```text
src/
├── config.ts            # + perillas: jumpBufferTime, jumpReleaseVelocity, groundAccel/Decel,
│                        #   airAccel/airControl, fallGravityMult, lowJumpGravityMult, (coyoteTime ya existe)
├── types.ts             # StepInput += jumpRelease; PlayerStateView += velocidad horizontal (velX/velZ)
├── input/input.ts       # keyup de Salto → push flanco { kind: 'jumpRelease', timestamp }
├── core/gameLoop.ts     # InputEdge.kind += 'jumpRelease'; advance() lo ventanea → StepInput.jumpRelease
└── sim/
    └── player.ts        # NÚCLEO del cambio: estado velX/velZ, jumpBufferRemaining, jumpAscending;
                         #   buffering, salto variable, rampas accel/decel + control aéreo, gravedad asimétrica

tests/
└── determinism.test.ts  # + casos: salto bufferizado; soltado-temprano vs mantenido (muestreo de pico);
                         #   ramp de locomoción con input mantenido. Helper de pico-Y en runScenario.
```

**Structure Decision**: se mantiene el layout del MVP. El cambio se concentra en
`src/sim/player.ts` (lógica de control) con un añadido mínimo en la cadena de entrada
(`input.ts` → `gameLoop.ts` → `types.ts`) para el flanco de soltado, y el crecimiento de la
puerta automática en `tests/determinism.test.ts`. Ningún archivo de render cambia su contrato.

## Complexity Tracking

> Sin violaciones de la constitución que justificar. Tabla intencionadamente vacía.
