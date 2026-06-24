# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
Active feature: 003-control-feel-pass (Topadero — pase de feel del control).
Stack: TypeScript + Vite + Three.js + @dimforge/rapier3d-compat (físicas WASM).
Arquitectura: núcleo de simulación headless (src/sim/) con paso de tiempo fijo
(acumulador) desacoplado del render; Three.js, HUD y cámara son vistas puras;
todo el ajuste centralizado en src/config.ts. El arte decorativo (mallas low-poly +
texturas, excepción v1.1.0) vive solo en src/render, alineado a colliders primitivos,
nunca como geometría de colisión. Puerta automática no negociable: test de
determinismo / independencia de FPS (Principio II de la constitución).

For technologies, project structure, shell commands and other context, read the
current plan: specs/003-control-feel-pass/plan.md
(spec: specs/003-control-feel-pass/spec.md ·
constitución: .specify/memory/constitution.md)
<!-- SPECKIT END -->

## Estado del repositorio

Diseño cerrado, implementación pendiente. Hoy solo existen la especificación y los
artefactos de diseño; **no hay `package.json` ni `src/` todavía** (llegan con
`/speckit-tasks` + `/speckit-implement`). Las fuentes de verdad son `README.md`,
`specs/001-obstacle-platformer/{spec,plan,quickstart}.md`, los `contracts/` y la
constitución. El bloque `SPECKIT` de arriba lo regenera la herramienta: no lo edites a mano.

## Comandos

Previstos para cuando exista la implementación; aún no se ejecutan.

```bash
npm install                              # three, @dimforge/rapier3d-compat, vite, vitest, typescript
npm run dev                              # Vite dev server
npm run build                            # build de producción
npm run preview                          # sirve el build
npm test                                 # Vitest (incluye la puerta de determinismo)
npx vitest run tests/determinism.test.ts # un solo archivo de test
npx vitest run -t "<nombre>"             # un solo test por nombre
```

## Arquitectura (lo que no se ve leyendo un único archivo)

La frontera que organiza todo separa la **simulación** del **render/E-S**:

- `src/sim/` es un núcleo *headless*: posee el mundo de Rapier y expone el seam
  `Simulation.step(dtFijo, inputFrame)` con estado de solo lectura. **No importa Three.js
  ni toca el DOM.** Esa pureza es lo que permite instanciarlo en Node y verificarlo en
  `tests/determinism.test.ts` (contrato en `contracts/simulation-api.md`).
- `src/core/gameLoop.ts` corre el **bucle de paso fijo con acumulador** (60 Hz) con clamp
  anti-espiral, y desacopla la física del render interpolando entre estados.
- `src/render/`, `src/ui/` y `src/input/` son vistas y adaptadores puros que leen el estado
  de la simulación; nunca contienen lógica de juego.
- `src/config.ts` es el **único** lugar de los parámetros de ajuste (velocidad, salto,
  umbral de caída, cámara…). No disperses números mágicos por el código (Principio V).

## Reglas no negociables (constitución v2.0.0)

- **Determinismo / independencia de FPS (Principio II, NO NEGOCIABLE).** El mismo input debe
  producir la misma trayectoria a 30 o 144 FPS. Los **inputs de flanco** (salto), el empuje
  del obstáculo y las comprobaciones de meta/respawn se consumen **dentro del paso fijo**, no
  por fotograma; consumirlos por fotograma es el bug clásico que caza el test de determinismo.
  Si ese test falla, ninguna historia se considera terminada.
- **Alcance de producto (Principio III, v2.0.0).** La geometría de simulación y **colisión** usa
  solo primitivas (cápsulas, cajas, cilindros). Tras el pivote a juego publicable, **están en
  alcance**: audio, shell de juego (título/pausa/victoria/ajustes), persistencia **local** (mejor
  marca y preferencias), varios circuitos y progresión básica. **Siguen fuera**: multijugador o
  red, cualquier backend o persistencia en servidor, y la colisión por mallas (collmesh); salirse
  de ahí exige enmendar antes spec y constitución. **Frontera headless:** `src/sim/` no importa
  render, audio, UI ni persistencia, ni carga assets; esas capas son vistas puras que leen el
  estado de la simulación. **Arte/animación (v1.1.0 + v1.2.0):** mallas low-poly + texturas y
  animación esqueletal del personaje en `src/render`, alineadas al collider, **nunca** geometría
  de colisión, conducidas por el **tiempo de render** (`AnimationMixer`), sin afectar a la posición
  (la determina el KCC) ni al determinismo.
- **Acabado publicable (Principio VI, v2.0.0).** El juego debe ser jugable de extremo a extremo
  (título → jugar → resultado → rejugar) sin consola ni flags de dev, con audio y persistencia
  local, y manejar los fallos esperables (WebGL/WASM/assets) sin pantalla en blanco.
- **Rebanadas verticales (Principio IV).** Construir en orden P1 → P2 → P3; cada historia se
  valida (prueba de juego manual del `quickstart.md`) antes de empezar la siguiente.
- **Rapier.** `@dimforge/rapier3d-compat` requiere `await RAPIER.init()` una vez al arrancar
  (en `main.ts` para el navegador y en el setup del test para Node); mismo paquete en ambos.

## Flujo dirigido por especificación

El proyecto usa Spec Kit: constitución → spec → clarify → plan → tasks → implement, con las
skills `speckit-*`. El `Constitution Check` de cada plan debe pasar. Hay hooks de git
(auto-commit por fase) configurados en `.specify/extensions.yml`; los commits se hacen solo
cuando el usuario lo pide.

## Skills del proyecto (Skill tool)

Instaladas a nivel de proyecto en `.claude/skills/` y fijadas en `skills-lock.json` (versiona
ambos, junto con `.agents/`). Claude Code las descubre solas; invócalas con la Skill tool al
trabajar en el área correspondiente. Mantenimiento: `npx skills check` y `npx skills update`.

| Skill | Cuándo usarla en Topadero |
|---|---|
| `vitest` | Tests y su configuración, sobre todo la puerta de determinismo (`tests/determinism.test.ts`): mocking, filtrado de tests, fixtures, cobertura. |
| `vite` | `vite.config.ts`, plugins, dev server y build (incl. la init asíncrona de Rapier WASM). |
| `threejs-fundamentals` | Escena, cámara, renderer, jerarquía Object3D y transformes (`src/render/`, `src/main.ts`). |
| `threejs-geometry` | Geometría de las primitivas del circuito: cajas, cilindros, cápsulas, BufferGeometry (`src/render/scene.ts`). |
| `threejs-interaction` | Raycasting y entrada de ratón / pointer lock para la cámara orbital (`src/input/`, `followCamera`). |

Al usar las skills de Three.js, respeta la frontera: el render es una vista pura. Three.js vive
en `src/render` y `src/ui`, **nunca** en `src/sim/` (rompería el Principio II).
