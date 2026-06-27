---
description: "Task list — Pulido y optimización (008)"
---

# Tasks: Pulido y optimización para el corte mínimo publicable

**Input**: Design documents from `/specs/008-pulido-optimizacion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: el proyecto NO exige tests por funcionalidad (constitución: automáticos opcionales salvo la
puerta de determinismo, Principio II). Aquí hay UN gate automático nuevo (el comprobador de
presupuestos, que FALLA el build) y se conserva el de determinismo. Por eso: `tests/determinism.test.ts`
debe seguir en verde (obligatorio) y se añade `tests/build/asset-budgets.test.ts` para blindar el
comprobador (recomendado, guarda el gate). El test unitario de detección WebGL es opcional. El resto de
validación es la prueba manual del `quickstart.md`. **El rendimiento (FPS) es puerta MANUAL** en
dispositivos reales (la captura headless usa SwiftShader, inservible para FPS).

**Organization**: tareas agrupadas por historia para implementarlas y validarlas de forma
independiente, en orden P1 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ir en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1..US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único existente: `src/`, `tests/` en la raíz. Novedad estructural: `assets-src/` (entradas
pesadas, NO servido) frente a `public/assets/` (salida optimizada y solo referenciada). El pipeline de
optimización es OFFLINE (`scripts/optimize-assets.mjs`); el comprobador de presupuestos
(`scripts/check-asset-budgets.mjs`) corre en `npm run build`. `src/sim/` NO se modifica (Principio II).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: andamiaje del pipeline de assets y del manifest de presupuestos.

- [X] T001 [P] Añadir devDependencies del pipeline offline a `package.json`: `@gltf-transform/core`,
  `@gltf-transform/functions` y `sharp` (solo devDependencies; las deps de runtime three/rapier NO
  cambian). No tocar aún los scripts.
- [X] T002 [P] Crear el manifest único `asset-budgets.json` en la raíz con categorías y valores de
  clarify (total 20 MB; textura standalone <=1024²/512 KB; mallas personaje <=15k / obstáculo-prop
  <=12k tris y <=512 KB de imagen embebida; audio <=768 KB; `sceneMaxTriangles` 120000 con
  `sceneTrianglesEnforcement: "manual"`), según `contracts/asset-budgets.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: línea base verificable antes de tocar nada. Las tres historias son en gran medida
independientes; este es el único prerrequisito común.

**⚠️ CRITICAL**: confirmar la base verde evita confundir una regresión nueva con un fallo previo.

- [X] T003 Confirmar la línea base en verde: `npm test` (incluye `tests/determinism.test.ts`) y
  `npm run build` actuales pasan antes de empezar. Anotar el peso de `dist/` de partida como referencia
  (hoy supera el presupuesto por el peso muerto).

**Checkpoint**: base confirmada → empieza US1 (el MVP). El orden entre historias es secuencial
P1 → P2 → P3, validando cada una antes de la siguiente (Principio IV).

---

## Phase 3: User Story 1 - El juego nunca deja al jugador ante una pantalla en blanco (Priority: P1) 🎯 MVP

**Goal**: ningún fallo esperable (sin WebGL, WASM falla, asset caído) deja pantalla en blanco; el flujo
completo funciona sin consola ni flags.

**Independent Test**: forzar cada fallo catastrófico y comprobar mensaje claro con acción; cortar un
asset y comprobar reserva jugable; recorrer título→jugar→resultado→rejugar sin consola
(`quickstart.md` P1, pasos 1-5). Independiente del toolchain de assets (US2).

- [X] T004 [US1] Crear `src/render/webgl.ts` con `isWebGLAvailable()`: intenta obtener contexto
  `webgl2`/`webgl` en un canvas desechable y devuelve booleano; sin efectos secundarios.
  (contrato `contracts/boot-robustness.md`)
- [X] T005 [P] [US1] Crear `src/ui/bootError.ts`: pantalla de error de arranque que reusa el contenedor
  `#boot`/estilos; mapea `kind` (`no-webgl`|`wasm-init-failed`|`unknown`) → `{title, detail, action}`;
  botón **Reintentar** enfocable y activable con teclado; nunca depende de la consola.
  (contrato `contracts/boot-robustness.md`, entidad `BootError`)
- [X] T006 [P] [US1] Añadir a `index.html` los estilos de la pantalla de error (variante de `#boot`):
  titular, detalle y botón, coherentes con la paleta de marca; respetar `prefers-reduced-motion`.
- [X] T007 [US1] Envolver el arranque en `src/main.ts`: detectar WebGL con `isWebGLAvailable()` ANTES de
  crear `SceneView` (→ `no-webgl`); `try/catch` alrededor de `await RAPIER.init()` (→
  `wasm-init-failed`, acción reintentar); `try/catch` externo de todo `main()` (→ `unknown`); ante
  fallo, mostrar `bootError` en vez de dejar `#boot` colgado o lienzo en blanco. CONSERVAR el
  `try/catch` del circuito diario y la degradación por-asset de `assets.ts` (no son catastróficos).
  (depende de T004, T005, T006)
- [X] T008 [P] [US1] (Opcional, PARCIAL) Test del mapeo `kind → {title, detail, action}` en
  `tests/ui/bootError.test.ts` (puro, sin DOM). El test de `isWebGLAvailable()` con mock de
  `getContext` queda DIFERIDO (requiere entorno jsdom; no configurado). Cubierto por T009 manual.
- [ ] T009 [US1] Validación manual P1 (`quickstart.md` pasos 1-5): carga visible; sin WebGL → mensaje;
  WASM falla → mensaje + Reintentar; asset caído → reserva jugable; flujo completo sin consola.

**Checkpoint US1**: ningún fallo esperable deja pantalla en blanco. ✅ MVP entregable por sí solo.

---

## Phase 4: User Story 2 - El juego carga ligero y va fluido, también en móvil (Priority: P2)

**Goal**: descarga <=20 MB sin peso muerto; cada asset dentro de presupuesto con el build fallando al
exceder; >=60 FPS escritorio / >=30 FPS móvil; determinismo intacto.

**Independent Test**: medir peso por asset y total contra el manifest; comprobar que `dist/` no tiene
assets no referenciados; forzar un exceso y ver el build fallar; medir FPS en dispositivos reales;
`npm test` en verde (`quickstart.md` P2). Independiente de US1.

- [X] T010 [US2] Separación estructural: mover los ORIGINALES pesados y los NO referenciados de
  `public/assets/` a `assets-src/`: GLB con textura 2048² embebida, los `*_base_color.png` y
  `arrow.png` (verificado: no se referencia en `src/`, es peso muerto). El audio (`public/audio/`) NO
  se mueve. Tras esto `public/assets/` lo regenera el optimizador. (research R4)
- [X] T011 [US2] Implementar `scripts/optimize-assets.mjs` (offline): por cada GLB de `assets-src/`,
  redimensionar las texturas embebidas a 1024² y recodificarlas a **WebP** (gltf-transform
  `textureCompress` + sharp); **decimar SOLO** la malla del péndulo a <=12k tris. **Salvedad de mallas
  riggeadas** (`player-rigged.glb`): solo recodificar su textura, NUNCA simplificar/reordenar su
  geometría (rompería el skinning/esqueleto). Para las texturas standalone (sky,
  tex-platform/ramp/wall, sign-finish) redimensionar a <=1024² + WebP. Escribir a `public/assets/`
  SOLO lo referenciado, con los mismos nombres base. (research R1/R2/R4, `contracts/asset-budgets.md`)
- [X] T012 [US2] Actualizar las referencias de texturas standalone a `.webp` en `src/circuit.ts` y
  `src/circuitgen/generate.ts` (`sky`, `tex-platform`, `tex-ramp`, `tex-wall`, `sign-finish`). Las
  texturas de arte van embebidas en GLB → `src/render/assets.ts` NO cambia (mismas rutas de GLB).
- [X] T013 [US2] Ejecutar `npm run assets:optimize` y verificar que `public/assets/` contiene solo los
  assets optimizados y referenciados (sin `*_base_color.png` ni 2048²); versionar la salida optimizada
  (CI no corre el pipeline, construye desde aquí). (research R4)
- [X] T014 [US2] Implementar `scripts/check-asset-budgets.mjs` extendiendo el prototipo `tris.mjs`: lee
  `asset-budgets.json`, recorre `dist/`, clasifica por categoría, mide bytes de fichero + resolución
  (standalone) + triángulos por malla + bytes de cada imagen WebP embebida (parseo del chunk JSON del
  GLB) + total (cuenta ambos formatos de audio, sobreestima: conservador); imprime resumen y SALE != 0
  ante cualquier `over-*`/`unclassified`; IGNORA `sceneMaxTriangles`. (contrato `contracts/asset-budgets.md`)
- [X] T015 [P] [US2] Añadir `tests/build/asset-budgets.test.ts`: dado un manifest + ficheros sintéticos,
  el comprobador marca `ok`/`over-size`/`over-resolution`/`over-triangles`/`over-embedded-image`/
  `unclassified`; límite inclusivo (igual al máx = ok); por encima → exit != 0; `sceneMaxTriangles` no
  afecta al exit.
- [X] T016 [US2] Cablear los scripts en `package.json`: `"assets:optimize": "node scripts/optimize-assets.mjs"`
  (offline) y `"build": "tsc --noEmit && vite build && node scripts/check-asset-budgets.mjs"` (el build
  FALLA al exceder, también en CI). (depende de T014)
- [X] T017 [US2] Re-ejecutar la puerta de determinismo: `npm test` con `tests/determinism.test.ts` en
  **verde** tras optimizar y decimar (la optimización es de render; no debe mover la física,
  Principio II). (depende de T011/T013)
- [ ] T018 [US2] Validación manual de rendimiento (`quickstart.md` P2 pasos 9b, 10-11): triángulos de
  escena <=~120k a ojo en el circuito del día; >=60 FPS escritorio y >=30 FPS móvil de gama media con
  audio + UI + arte + obstáculos cargados.

**Checkpoint US2**: presupuestos en verde (build falla al exceder), sin peso muerto en `dist/`, FPS
objetivo en escritorio y móvil, determinismo intacto. ✅

---

## Phase 5: User Story 3 - El juego se siente terminado y se puede publicar (Priority: P3)

**Goal**: acabado visual coherente, build estático servible verificado sobre el build real, metadatos de
compartición y créditos/licencias.

**Independent Test**: recorrer la checklist de QA en escritorio y móvil; servir el build con
`vite preview` y completar el flujo (incl. offline y subruta `/play`); comprobar metadatos y créditos
(`quickstart.md` P3). Metadatos y créditos son independientes; la verificación sobre el build se apoya
en US1 (robusto) + US2 (optimizado).

- [X] T019 [P] [US3] Añadir metadatos de compartición a `index.html`: Open Graph (`og:title`,
  `og:description`, `og:image`, `og:type`) y Twitter Card; reutilizar un icono existente como imagen de
  preview. (FR-018)
- [X] T020 [P] [US3] (PARCIAL) `CREDITS.md` completado con créditos y licencias de audio y arte
  (sección de arte añadida). RESIDUAL: la **verificación** de licencias comerciales depende del
  propietario; quedan ⚠ en CREDITS.md (mallas Meshy, texturas standalone, iconos) que deben
  resolverse antes de publicar (lo recoge la checklist de QA). (FR-019)
- [ ] T021 [US3] Pasada de QA visual/UI (`quickstart.md` P3 pasos 13-14): alineación malla-collider (el
  personaje y los obstáculos no flotan ni se hunden), sin geometría que asome ni z-fighting, escalas e
  iluminación coherentes; shell coherente en escritorio y móvil (retrato/apaisado). (depende de US2: el
  arte optimizado es el que se revisa)
- [ ] T022 [US3] Verificación sobre el BUILD (`quickstart.md` P3 pasos 15-17): `npm run build` +
  `npm run preview`, flujo de extremo a extremo; offline (red de baliza cortada → sigue jugable);
  servir bajo subruta `/play` y comprobar que los assets resuelven (base relativa). (depende de US1+US2)
- [X] T023 [US3] Consolidar la **checklist de QA publicable** repetible (a partir de `quickstart.md`) como
  el artefacto de la puerta del Principio VI, marcando qué es automático (presupuestos, determinismo) y
  qué es manual (robustez, FPS, visual, distribución). (entidad `QAChecklist`)

**Checkpoint US3 (publicable)**: checklist completa en verde sobre el build → listo para desplegar.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cierre del corte publicable y seguimiento de constitución.

- [X] T024 [P] Actualizar `README.md`: reencuadre prototipo → juego publicable al cerrar el corte
  mínimo (TODO de la constitución v2.2.0); mencionar el pipeline de assets offline y el gate de
  presupuestos.
- [X] T025 Confirmar que `deploy.yml` no necesita cambios: `npm run build` ya incluye el comprobador, así
  que un exceso de presupuesto aborta el despliegue igual que ya lo hace un fallo de `npm test`. Dejar
  constancia (sin tocar el workflow salvo que falle).
- [X] T026 [P] (Opcional) Refinar el total del comprobador para contar solo el mayor de cada par de
  audio (mp3/ogg) en `scripts/check-asset-budgets.mjs`, reflejando la descarga real en vez de
  sobreestimar.
- [X] T027 [P] (Follow-up de 006, FUERA de 008) Registrar para una spec futura: el `structuralHash`
  hashea la `CircuitDefinition` entera (incl. URLs de textura), así que optimizar assets cambió la
  identidad del circuito y reseteó marcas locales (ver research R9). Valorar que el hash represente
  solo la estructura (geometría/layout/semilla). Requiere su propia spec/clarify; no se hace aquí.

---

## Dependencies & Story Order

**Orden de historias = Principio IV (no negociable)**: P1 → P2 → P3, y cada historia se **valida en su
checkpoint del `quickstart.md` antes de iniciar la siguiente**. No se empieza una historia inferior
antes de validar la superior. La paralelización es **dentro** de cada historia, nunca entre historias.

- **Setup (T001-T002)** → habilita US2 (devDeps + manifest). US1 no usa el toolchain de assets, pero
  igualmente se respeta el orden de validación de abajo.
- **Foundational (T003)** → línea base antes de todo.
- **US1 (P1, T004-T009)**: el MVP. Se implementa y **se valida (T009) antes de iniciar US2**.
- **US2 (P2, T010-T018)**: empieza **tras validar US1**. Orden interno: T010 → T011 →
  (T012 ‖ T013) → T014 → (T015 ‖ T016) → T017 → T018. Se valida (T018) antes de iniciar US3.
- **US3 (P3, T019-T023)**: empieza **tras validar US2**. Orden interno: T019 ‖ T020 (independientes
  entre sí) → T021 (depende del arte optimizado) → T022 (depende del build robusto+optimizado) → T023.
- **Polish (T024-T026)**: tras US3.

## Parallel Opportunities

Paralelización **solo dentro de cada historia** (entre historias el orden es secuencial P1→P2→P3 por
el Principio IV):

- Setup: T001 ‖ T002.
- US1: T005 ‖ T006 (y T008 opcional) mientras se prepara T004; T007 cierra.
- US2: T012 ‖ T013; T015 ‖ T016.
- US3: T019 ‖ T020 (una vez iniciada US3); T021 y T022 son secuenciales por dependencia.
- Nota de archivo compartido: `index.html` lo tocan US1 (estilos de error) y US3 (metadatos); como van
  en fases distintas no colisionan, pero editar con cuidado el bloque correspondiente cada vez.

## Implementation Strategy

MVP = **US1** (robustez): por sí sola eleva el juego de "se rompe ante un fallo" a "siempre da una
salida", que es el suelo del Principio VI. Luego **US2** (peso + rendimiento), la palanca de mayor
impacto medible. Por último **US3** (acabado + distribución) sobre lo ya robusto y optimizado. Cada
historia se valida en su checkpoint del `quickstart.md` antes de seguir (Principio IV). `src/sim/` no se
toca en ninguna; la puerta de determinismo se re-ejecuta en T017.
