# Implementation Plan: Entrada, accesibilidad y app instalable (mando · táctil/móvil · PWA)

**Branch**: `004-input-accessibility` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-input-accessibility/spec.md`

## Summary

Ampliar la entrada del juego a **mando (gamepad)** y **controles táctiles para móvil** junto al
teclado y ratón ya existentes (detección de esquema en caliente, reasignación, accesibilidad), y
permitir **instalar el juego como app web (PWA)** en el móvil con arranque a pantalla completa y
juego sin conexión.

El enfoque de la entrada se apoya en que la frontera ya es agnóstica de la fuente: `src/input`
produce un único `FrameInput { moveAxis, cameraYaw, edges[] }` y el bucle (`src/core/gameLoop.ts`)
ventanea los flancos por su timestamp al paso fijo. Mando y táctil son **adaptadores que rellenan
ese mismo `FrameInput`**; `moveAxis` ya es un vector (analógico-ready) y los flancos ya son
deterministas. La PWA es **empaquetado del lado del cliente** (web app manifest + service worker
sobre el build estático de Vite); no hay backend. La simulación (`src/sim/`) no se toca y el
determinismo se mantiene **por construcción**, verificado extendiendo `tests/determinism.test.ts`.

> **Observación de alcance (no bloqueante)**: la PWA es una preocupación de *distribución* que
> solapa con la futura spec de robustez/publicación (roadmap 008). Se incorpora aquí porque la
> spec lo pide y porque US4 depende de que la experiencia táctil de US1 funcione. Si se prefiere,
> puede extraerse a la spec de publicación; por defecto se planifica dentro de la 004.

## Technical Context

**Language/Version**: TypeScript (proyecto Vite); Node 22 en CI.
**Primary Dependencies**: Three.js (render), @dimforge/rapier3d-compat (físicas, en `sim/`; su WASM
va embebido en base64 dentro del bundle JS). Entrada: APIs del navegador, sin nuevas dependencias
(Gamepad API por polling; Pointer/Touch Events para táctil). PWA: Web App Manifest + Service Worker
(Cache API); la generación del service worker puede hacerse a mano o con `vite-plugin-pwa` (decisión
en research) — en cualquier caso es build-time, sin backend en ejecución.
**Storage**: para la entrada, N/A (preferencias y mapeos personalizados se persisten en la spec de
persistencia; aquí en memoria + defaults en `config.ts`). Para la PWA, la Cache API del navegador
guarda los recursos del juego para uso sin conexión (cliente, no servidor).
**Testing**: Vitest, incluida la puerta de determinismo (`tests/determinism.test.ts`), que se
extiende con entrada analógica y flancos de mando/táctil. Verificación de PWA por prueba de juego
manual (instalación, arranque desde icono, modo avión, paridad de física). Tests unitarios
opcionales del adaptador (deadzone, detección de esquema).
**Target Platform**: navegador de escritorio y móvil (web), WebGL2 + WebAssembly; instalable como
PWA (constitución v2.1.0). Sin app nativa de tienda, sin backend.
**Project Type**: aplicación web de una sola página (juego) servida bajo `/play`, más una landing de
marketing estática en la raíz; proyecto único (sin front/back separados).
**Performance Goals**: >= 60 FPS en escritorio; >= 30 FPS estable en móvil de gama media (SC-005).
Físicas a paso fijo 60 Hz, deterministas e independientes de los FPS (Principio II).
**Constraints**: frontera headless (`src/sim/` no importa entrada, render, audio ni persistencia);
flancos consumidos DENTRO del paso fijo; ajuste centralizado en `config.ts`; sin red, sin backend,
sin telemetría; web estática (la PWA cachea en cliente, no añade servidor).
**Scale/Scope**: un jugador, en local; un circuito (no toca contenido); tres esquemas de entrada
(teclado+ratón, mando, táctil); dos superficies de despliegue: landing de marketing (raíz) que
sugiere instalar, y el juego (`/play`) que es lo que se instala y cachea.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design (ver abajo).*

- **I. La sensación de juego manda** — PASA. No degrada el control de teclado/ratón validado
  (FR-012, SC-008); puerta = prueba de juego manual (`quickstart.md`).
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — PASA. Mando y táctil rellenan el
  mismo `FrameInput`; el bucle ventanea los flancos por timestamp; el `moveAxis` analógico es
  held-sampled e integrado con dt. La PWA es empaquetado del cliente: el service worker y el cacheo
  no tocan el paso fijo ni introducen no-determinismo (FR-020). El adaptador y la capa PWA corren
  fuera de la simulación. Verificación: se extiende `tests/determinism.test.ts` y debe quedar en
  verde; si no, la feature no se considera terminada.
- **III. Alcance de producto y disciplina de acabado** — PASA. Táctil/móvil ya en alcance (v2.1.0).
  La PWA NO requiere enmienda: es "web estática autocontenida, sin servidor en ejecución, sin
  backend" (manifest + service worker + Cache API del lado del cliente; no es app de tienda nativa,
  que sí está fuera). `src/input` sigue siendo adaptador puro; `src/sim/` no importa entrada/render/
  PWA; sin collmesh. La UI de reasignación y el guardado de preferencias se difieren a las specs de
  shell y persistencia (documentado).
- **IV. Rebanadas verticales jugables** — PASA. US1 (jugar con mando o táctil) es independiente y
  entregable; US4 (PWA) se apoya en la experiencia táctil de US1 pero es independiente de US2/US3;
  US2/US3 encima. Orden sugerido: US1 → US4 → US2 → US3.
- **V. Comportamiento sobre cifras: config.ts** — PASA. Bindings por defecto, deadzones,
  sensibilidades, inversión de ejes, layout táctil y estado por defecto de "reduced motion" en
  `config.ts`. La identidad de la PWA (nombre, color de tema, rutas) vive en el manifest.
- **VI. Acabado de producto publicable** — PASA en su parte aplicable. La feature aporta jugar de
  extremo a extremo con mando o táctil sin teclado ni consola, y un producto que se instala y se
  juega sin conexión. La puerta de "publicable" completa (título/pausa/resultados) sigue siendo de
  la spec del shell.

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño confina la entrada a `src/input`
(adaptadores) y la PWA a manifest + service worker sobre el build, ambos fuera de `src/sim/` y del
paso fijo. Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/004-input-accessibility/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (decisiones: mando, táctil, deadzone, esquema, perf, PWA)
├── data-model.md        # Fase 1 (entidades: FrameInput, esquema, bindings, prefs, layout, PWA)
├── quickstart.md        # Fase 1 (prueba de juego: mando, táctil, cambio, a11y, instalación/offline)
├── contracts/
│   └── input-contract.md  # Fase 1 (contrato de la capa de entrada y su seam con el bucle)
└── checklists/
    └── requirements.md  # Checklist de calidad de la spec (de /speckit-specify)
```

### Source Code (repository root)

```text
src/
├── input/
│   ├── input.ts          # Agregador: posee yaw/pitch y produce FrameInput; orquesta los adaptadores
│   ├── keyboardMouse.ts  # (extraído de input.ts) adaptador teclado + ratón pointer-lock
│   ├── gamepad.ts        # NUEVO: polling de Gamepad API, ejes + flancos de salto con timestamp
│   ├── touch.ts          # NUEVO: Pointer Events, joystick virtual, botón de salto, arrastre cámara
│   └── scheme.ts         # NUEVO: esquema activo (sigue a la última entrada usada)
├── ui/
│   ├── touchControls.ts  # NUEVO overlay táctil (joystick izq, cámara der, botón salto abajo-dcha)
│   └── hud.ts            # a11y: contraste/tamaño del HUD (opciones)
├── render/
│   └── followCamera.ts   # a11y: honra "reduced motion" (atenúa movimiento no esencial; no toca KCC)
├── pwa/
│   └── install.ts        # NUEVO: registro del service worker + lógica de invitación a instalar
└── config.ts             # bindings, deadzone, sensibilidades, invertY, layout táctil, reducedMotion

public/                   # servido bajo /play: manifest.webmanifest + iconos del juego
service worker            # generado a build-time (vite-plugin-pwa) o a mano; scope = /play
index.html                # del juego (se build a dist → /play); enlaza el manifest

marketing/landing/        # raíz del sitio (/topadero): añade la invitación a instalar (FR-017)
                          # y, en iOS Safari, las instrucciones equivalentes (sin beforeinstallprompt)

tests/
├── determinism.test.ts   # EXTENDER: moveAxis analógico parcial + flancos de salto mando/táctil
└── input/                # (opcional) unit del adaptador: deadzone, normalización, detección de esquema
```

**Structure Decision**: proyecto único existente con dos superficies de despliegue (landing en raíz,
juego en `/play`; `base: './'` relativa en `vite.config.ts`). La entrada vive en `src/input`
(adaptadores que alimentan el `FrameInput` ya existente), `src/ui` (overlay táctil + opciones de HUD)
y `src/render/followCamera.ts` (reduced motion). La PWA confina su manifest + service worker al
**scope del juego (`/play`)**, suficiente para el offline de FR-019 (el juego es lo que se cachea); la
landing solo añade la afordancia de instalar. **`src/sim/` no se modifica** y el único cambio en
`tests/` es extender la puerta de determinismo.

## Complexity Tracking

> Sin violaciones de la constitución que justificar. Sección no aplicable.
