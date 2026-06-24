# Implementation Plan: Variedad de obstáculos y vestido gráfico

**Branch**: `002-obstacle-variety-and-art` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-obstacle-variety-and-art/spec.md`
**Status**: Planned (pendiente de `/speckit-tasks` + `/speckit-implement`)

## Summary

Segunda iteración de Topadero sobre el núcleo ya validado. Dos frentes, ambos como
añadidos a la arquitectura existente sin tocar su frontera:

1. **Gameplay (en alcance bajo la constitución original)**: enriquecer el circuito y pasar
   de un único obstáculo (vaivén senoidal) a **varios tipos deterministas** (barra giratoria,
   péndulo, empujador alternante) más **plataformas portantes horizontales** (FR-007). Cada
   trayectoria sigue siendo una **función pura del tiempo de simulación**.
2. **Vestido gráfico (excepción v1.1.0 de la constitución)**: dirección de arte de
   `./marketing` (cartoon/pop), skybox/fondo, materiales texturizados, señalización, props
   low-poly y una malla del mascot que sustituye visualmente a la cápsula. Todo en la **capa
   de render**, como vista pura.

Enfoque técnico: generalizar el obstáculo único a una lista de obstáculos **basados en pose**
(`pose(simTime) → {position, quaternion}`) gestionada en `sim/`; resolver el transporte de
plataformas portantes con **AABB determinista dentro del paso fijo** (mismo precedente que
001, que sustituyó las consultas de contacto por AABB); cargar assets de forma **asíncrona
antes de jugar** en `render/`, con reserva a primitivas. El test de determinismo **crece** con
casos por tipo de obstáculo y por transporte. `config.ts` sigue siendo el único lugar de
ajuste.

## Technical Context

**Language/Version**: TypeScript 6.x (target ES2022, ESM), Node.js 22 en CI
**Primary Dependencies**: Three.js `^0.184` (+ `GLTFLoader`, `TextureLoader` de three/examples),
`@dimforge/rapier3d-compat` `^0.19.3`, Vite 8. Generación de assets (fase implement, fuera del
runtime): gpt-image-2 (OpenAI, `OPENAI_API_KEY` en `.env` local gitignored) para imágenes 2D;
Meshy (vía MCP) para mallas low-poly GLB. `./marketing` como referencia de arte.
**Storage**: N/A en runtime. Assets estáticos versionados en `public/assets/` (skybox,
texturas, `*.glb`); sin backend, sin red, sin persistencia.
**Testing**: Vitest 4. La puerta de determinismo CRECE: casos nuevos por tipo de obstáculo y
por transporte de plataforma portante, a 60/jitter/30/144 Hz con igualdad exacta a igual nº de
pasos. Prueba manual ampliada en `quickstart.md`.
**Target Platform**: Navegador de escritorio moderno con WebGL2 y WebAssembly.
**Project Type**: Aplicación de navegador de un solo proyecto (solo frontend).
**Performance Goals**: ≥ 60 FPS de render con todos los assets cargados (SC-005); física a
paso fijo 60 Hz independiente de los FPS (SC-002). Arte low-poly de presupuesto acotado.
**Constraints**: la simulación sigue headless (`src/sim/` sin imports de Three/asset);
colisión SOLO sobre primitivas (las mallas nunca son geometría de colisión); las plataformas
portantes son **solo horizontales** (vertical excluido, rapier #488); la carga de assets no
bloquea ni introduce no-determinismo en el paso fijo; reserva a primitivas si un asset falta.
**Scale/Scope**: un circuito más largo (≈8-12 tramos), 3 tipos nuevos de obstáculo +
plataformas portantes, un jugador, una sesión local.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluación contra la Constitución de Topadero **v1.1.0**. Conviene separar los dos frentes:
el **gameplay** (obstáculos + portantes) está en alcance bajo la constitución original; solo
el **arte decorativo** usa la excepción v1.1.0.

| Principio | Estado | Cómo lo respeta el plan |
|---|---|---|
| I. La sensación de juego manda | PASS | El gameplay (obstáculos variados + portantes) se valida con prueba de juego manual (quickstart) antes de dar por hecha cada rebanada; la interpolación/slerp de render evita stutter. El vestido gráfico no altera el control. |
| II. Determinismo / independencia de FPS (NO NEGOCIABLE) | PASS (con foco) | Cada obstáculo es `pose(simTime)` pura (sin estado oculto, sin `Date.now`/`Math.random`). El **transporte de plataforma portante** se resuelve con AABB determinista dentro del paso fijo (delta = pos(t+dt)−pos(t) sumado al movimiento del KCC), NO con consultas de contacto de Rapier. El test crece con casos por tipo y por transporte; igualdad exacta a 60/jitter/30/144. La capa de render (assets) no entra en la simulación. |
| III. Disciplina de alcance (YAGNI + excepción v1.1.0) | PASS | Gameplay: dentro del alcance original (más obstáculos y un circuito más rico no son *Out of Scope*). Arte: bajo la **excepción v1.1.0**, solo decoración en `src/render`, alineada a colliders primitivos, nunca collmesh; `src/sim/` no carga assets. Siguen fuera: audio, multijugador, menús, progresión, varios niveles, collmesh, animación riggeada. |
| IV. Rebanadas verticales jugables | PASS | Orden P1 (variedad de obstáculos + circuito, sin arte) → P2 (identidad visual 2D) → P3 (mallas low-poly). Cada una jugable/validable por separado; P1 entrega valor sin un solo asset. |
| V. Comportamiento sobre cifras; simplicidad | PASS | Todos los parámetros nuevos (por tipo de obstáculo, portantes, presupuesto de assets) en `config.ts`. Se reutiliza el move-and-slide del KCC y el canal de knockback existente; sin abstracción prematura. |

**Re-evaluación del Principio II exigida por el transporte de plataforma portante**: es la
pieza de mayor riesgo. Se trata como decisión de research nombrada (R-carry) y se cubre con
casos de test específicos. Si esos casos no quedan en verde con igualdad exacta a las 4
cadencias, la rebanada P1 NO se considera terminada (puerta automática del Principio II).

**Resultado del gate (pre-Phase 0)**: PASS. Sin violaciones que justificar en *Complexity Tracking*.

**Re-evaluación post-Phase 1**: PASS. El diseño confirma: (a) obstáculos basados en pose con
`setNextKinematicRotation` y knockback tangencial para los rotatorios; (b) transporte portante
por AABB de cara superior dentro del paso fijo; (c) frontera de render intacta (campos
visual-only `meshUrl`/`texture` en `circuit.ts`, ignorados por `sim/`; cero imports de
Three/asset alcanzables desde `src/sim/`). Detalle en `research.md` y `contracts/`.

## Project Structure

### Documentation (this feature)

```text
specs/002-obstacle-variety-and-art/
├── plan.md              # Este archivo
├── research.md          # Phase 0: decisiones (R1 pose+rotación, R-carry portantes, R3 assets, R4 knockback, R5 test, R6 perf)
├── data-model.md        # Phase 1: entidades en memoria (obstáculos, portantes, catálogo de assets)
├── quickstart.md        # Phase 1: ejecución + regresión manual ampliada
├── contracts/           # Phase 1: fronteras
│   ├── simulation-api.md   # Seam del núcleo (extendido: obstáculos múltiples basados en pose, portantes)
│   └── assets.md           # Frontera render↔assets (carga, fallback, alineación malla↔collider)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
public/
└── assets/                    # NUEVO: assets estáticos servidos por Vite (skybox, texturas, *.glb). Reserva: si falta, primitiva
src/
├── main.ts                    # + await loadAssets() ANTES de arrancar el bucle (no bloquea el paso fijo: ocurre antes de jugar)
├── config.ts                  # + parámetros por tipo de obstáculo, portantes y presupuesto de assets (sigue siendo el ÚNICO lugar de ajuste)
├── circuit.ts                 # + obstacles[] (tipo + pose-params), portantes, campos VISUAL-ONLY (meshUrl/texture); sim/ ignora lo visual (igual que .color hoy)
├── types.ts                   # + ObstacleKind; Transform extendido con quaternion (rotación completa para barra/péndulo); StepInput sin cambios
├── core/
│   └── gameLoop.ts            # Sin cambios de contrato (ya ventanea flancos por timestamp)
├── sim/                       # NÚCLEO HEADLESS — sigue sin Three.js ni assets ni DOM
│   ├── simulation.ts          # Gestiona N obstáculos cinemáticos (pos+rot), transporte portante por AABB, knockback por obstáculo
│   ├── player.ts              # + integrar delta horizontal de la plataforma portante ANTES de computeColliderMovement (dentro del paso fijo)
│   ├── movingObstacle.ts      # Generalizado: pose(simTime)→{position,quaternion} y velocidad (lineal + tangencial) por tipo
│   ├── zones.ts               # AABB (reutilizado para el test de cara superior de portantes)
│   └── runState.ts            # Sin cambios
├── input/
│   └── input.ts               # Sin cambios
├── render/                    # VISTA PURA — aquí vive todo el arte (excepción v1.1.0)
│   ├── scene.ts               # Mallas/materiales texturizados, skybox, señalización; bind obstáculo↔malla; slerp de rotación; reserva a primitiva
│   ├── assets.ts              # NUEVO: carga asíncrona (GLTFLoader/TextureLoader), catálogo y fallback; SOLO render
│   └── followCamera.ts        # Sin cambios
└── ui/
    └── hud.ts                 # + estilo coherente con la identidad (FR-010); sin lógica de juego

tests/
└── determinism.test.ts        # CRECE: casos por tipo de obstáculo + transporte portante (60/jitter/30/144, igualdad exacta)
```

**Structure Decision**: se conserva el proyecto único de frontend y la línea divisoria
`src/sim/` (headless) vs `src/render` + `src/ui` + `src/input` (vistas/E-S). Las dos
ampliaciones respetan esa línea: el gameplay vive en `sim/` (datos del circuito + pose pura +
transporte AABB); el arte vive en `render/` (carga de assets + materiales + slerp), leyendo
del seam sin escribir en él. `config.ts` concentra el ajuste. Esta separación es la que sostiene
los Principios II (verificable en Node) y la excepción v1.1.0 (arte aislado del núcleo).

## Complexity Tracking

> Sin violaciones del Constitution Check. El transporte de plataforma portante añade lógica al
> paso fijo, pero es gameplay en alcance y se mitiga con AABB determinista + cobertura de test;
> se documenta como riesgo dirigido del Principio II (arriba), no como violación de un principio.
