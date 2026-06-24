# Phase 0 — Research: Topadero

Fecha: 2026-06-24 · Stack dado: TypeScript + Vite + Three.js + Rapier (`@dimforge/rapier3d-compat`).

No quedan `[NEEDS CLARIFICATION]` en la spec. Este documento registra la investigación que guio el MVP y, donde el código final simplificó el diseño, describe la implementación efectiva. **Las firmas de API marcadas `[verified-doc]` se comprobaron contra la documentación oficial vigente de Rapier (rapier.rs / typedoc), Three.js y MDN.**

> **Modelo implementado de detección.** El KCC de Rapier resuelve suelo, plataformas, paredes, rampa y obstáculo sólido. Las reglas de gameplay que solo necesitan solape —empuje y meta— usan AABB deterministas calculadas con datos de `circuit.ts`; no se usan `EventQueue`, sensores ni el grafo narrow-phase.

---

## R1. Bucle de paso fijo con acumulador, desacoplado del render

- **Implementación**: `advance()` calcula `dueSteps = floor((now - simStartWall) / FIXED_DT)` y ejecuta la diferencia respecto a `stepIndex`, con un máximo de `MAX_SUBSTEPS`. Si queda atraso, desplaza `simStartWall` para descartarlo. El render obtiene `alpha` del resto fraccionario. `world.timestep = FIXED_DT` se fija una vez y cada `Simulation.step()` llama una vez a `world.step()`.
- **Propiedad clave (verificada)**: el nº de pasos ejecutados hasta el tiempo de reloj `t` es `floor(t / FIXED_DT)`, **independiente de cómo se trocee `t` en fotogramas**. De ahí la independencia de FPS.
- **Rationale**: cumple FR-013/SC-004/Principio II. La interpolación evita stutter a 144 Hz render / 60 Hz física (FR-002/SC-008).
- **Alternatives considered**: física a tasa variable (rompe II); paso fijo sin interpolación (stutter, degrada Principio I); sub-stepping interno de Rapier con dt variable (rompe II).
- **Riesgo**: sin `MAX_SUBSTEPS` el bucle entra en espiral de la muerte bajo carga; el clamp lo convierte en cámara lenta (degradación aceptable, R6). El sobrante del acumulador NO se descarta salvo el caso tab-out (R6).

## R2. `@dimforge/rapier3d-compat` en navegador (Vite) y en Node (Vitest)

- **Decision**: un único paquete `@dimforge/rapier3d-compat` (WASM en base64 inline) para navegador y tests. `import * as RAPIER from '@dimforge/rapier3d-compat'`; `await RAPIER.init()` **exactamente una vez** al arrancar (en `main.ts` para el navegador; en un `beforeAll`/setup único para Vitest) antes de crear el `World` `[verified-doc: init(): Promise<void>; rapier.d.ts reexporta named + default]`.
- **Vite**: funciona out-of-the-box; **sin** `vite-plugin-wasm`, **sin** `optimizeDeps.exclude`, **sin** top-level-await (no hay `.wasm` externo) `[verified-doc]`.
- **Vitest/Node**: ESM sin flags ni plugins; `test: { environment: 'node' }` (núcleo headless, no necesita jsdom) `[verified-doc]`. Fallback a tener a mano sólo si el pool de workers falla al instanciar WASM: `test: { pool: 'forks' }` (NO añadir preventivamente).
- **Rationale**: un solo código de física navegador+Node es lo que hace que el test de determinismo ejercite el mismo código que producción.
- **Correcciones a research previo**: (a) no apoyarse en idempotencia de `init()` (no confirmada en 0.19.x) — llamarla una vez; (b) la etiqueta "init síncrona" del paquete no-compat era imprecisa (el no-compat usa import dinámico + WASM externo y suele exigir config de bundler); la decisión por `-compat` se mantiene.
- **tsconfig relevante**: `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict true`, proyecto `"type": "module"`.

## R3. Controlador de personaje cinemático (KCC) con cápsula

- **Decision**: cuerpo `RigidBodyDesc.kinematicPositionBased()` + `ColliderDesc.capsule(halfHeight, radius)` (ese orden; invertirlo da una cápsula gorda) `[verified-doc]`. Controller: `world.createCharacterController(offset)` `[verified-doc]`. Cada paso: integrar gravedad manual en la velocidad vertical, construir la traslación deseada, `controller.computeColliderMovement(collider, desiredTranslationDelta, filterFlags, filterGroups, filterPredicate)`, aplicar `rigidBody.setNextKinematicTranslation(pos + controller.computedMovement())`, leer `controller.computedGrounded()` `[verified-doc todos]`.
- **Filtrado implementado**: salida y meta son volúmenes de datos, no colliders; por tanto no necesitan exclusión del KCC. El obstáculo móvil sí es sólido y participa del move-and-slide.
- **Snap-to-ground**: `controller.enableSnapToGround(distance)`; `setMaxSlopeClimbAngle(rad)` / `setMinSlopeSlideAngle(rad)` `[verified-doc]`. **OJO: ángulos en RADIANES** (la confusión grados/radianes es la causa documentada de "setMaxSlopeClimbAngle no funciona", rapier.js #274); convertir en `config.ts`. Sin snap-to-ground, gravedad manual + KCC escalona/rebota al bajar la rampa (incumple FR-005, US1 escenario 3).
- **Autostep**: `controller.enableAutostep(maxHeight, minWidth, includeDynamicBodies)` con valores pequeños para bordes de plataforma `[verified-doc]`.
- **Salto (FR-003, SC-002)**: sólo si `computedGrounded()` fue true; fija la velocidad vertical al impulso. **Interacción salto ↔ snap-to-ground (NUEVO)**: el paso del salto DEBE **desactivar snap-to-ground** (o ignorar `computedGrounded` mientras `verticalVelocity > 0`), o el snap re-pega al suelo y anula el impulso inicial. `coyoteTime` es un parámetro REAL recomendado `> 0` para el feel en bordes (no dejarlo en 0 por inercia; decidir su valor en la prueba de juego de US1, Principio I).
- **Restricción de diseño (NUEVO, evita rapier.js #488)**: ninguna primitiva sobre la que el jugador se APOYE tendrá movimiento vertical (el KCC se hunde/rebota en plataformas-ascensor). El obstáculo móvil es de barrido horizontal/rotación, no una plataforma portante (coherente con R5).
- **Alternatives considered**: cuerpo dinámico con fuerzas — descartado (la constitución exige KCC; peor control directo).

## R4. Cámara orbital 3ª persona + Pointer Lock + movimiento relativo a cámara

- **Decision**: Pointer Lock API **cruda** (NO `three/examples/PointerLockControls`, que es de PRIMERA persona y rota la propia cámara, sin modo orbital `[verified-doc]`). `canvas.requestPointerLock()` desde un gesto de usuario (clic); escuchar `pointerlockchange`; mientras `document.pointerLockElement` sea el canvas, acumular `e.movementX/movementY` en `yaw`/`pitch` (pitch acotado) `[verified-doc MDN]`. `followCamera.ts` orbita el objetivo a `cameraDistance`/`cameraHeight` y suaviza SOLO posición/target con `alpha = 1 - exp(-k * dt_render)`.
- **Base de movimiento (CRÍTICO para Principio II)**: derivar del **escalar `yaw` crudo**, NO de `camera.getWorldDirection()`/matrixWorld de la cámara suavizada: `forward = (-sin yaw, 0, -cos yaw)`, `right = normalize(cross(forward, up))` con `up=(0,1,0)`, `worldMove = moveAxis.x*right + moveAxis.y*forward`. Si se tomara de la cámara lerpeada por dt de render, los FPS de render se filtrarían a la trayectoria y romperían el Principio II. El suavizado con dt de render es inocuo **sólo bajo esta precondición**.
- **Crono (Q2)**: el ratón actualiza `Input.yaw`/`pitch`, pero no arranca el cronómetro. Solo `moveAxis` o `StepInput.jump` disparan `idle→running`; `pitch` no entra en la simulación.
- **Correcciones/notas**: clamp del delta de ratón por fotograma o `requestPointerLock({ unadjustedMovement: true })` para evitar saltos bruscos de yaw `[verified-doc MDN]`; re-bloquear tras Esc exige nuevo clic.

## R5. Detección de contacto jugador↔obstáculo, empuje (knockback) y tunneling

- **Implementación (detección)**: el obstáculo es un cuerpo cinemático sólido. `Simulation.applyKnockbackIfContact()` expande su AABB por las dimensiones de la cápsula y `contactPrediction`, y comprueba si contiene la posición del jugador.
- **Implementación (empuje, Q4)**: al solapar, se asigna una velocidad de knockback persistente que decae. La dirección horizontal va del centro del obstáculo al jugador; si coinciden, usa el signo de la velocidad del obstáculo. La magnitud es `min(knockbackStrength + abs(obstacleVelocity.x), knockbackMax)`.
- **Decision (anti-tunneling, suelo de corrección duro)**: el knockback se enruta **a través del KCC** (se integra en `velocity`, que alimenta `computeColliderMovement`), nunca como teletransporte de posición; así el barrido swept-and-slide del KCC frena contra geometría sólida aun a alta velocidad. Mitigaciones: (a) `knockbackMax` que acota la velocidad; (b) colliders de pared/obstáculo **gruesos**; (c) `obstacleSpeed` acotada para que el desplazamiento por paso `<` semigrosor del obstáculo (evita que el obstáculo cruce entero al jugador quieto en un paso). Si aún se observa cruce en la prueba de estabilidad, red de seguridad: `world.castShape(...)` barriendo el obstáculo prev→cur contra el jugador `[verified-doc]`.
- **CCD descartado (corrección verificada)**: `rigidBody.enableCcd(true)` **NO tiene efecto** en cuerpos `KinematicPositionBased` (CCD/motion-clamping sólo afecta a dinámicos) `[verified-doc: docs.rs RigidBody.enable_ccd]`. Se elimina del plan; la protección real es el barrido del KCC + clamp + colliders gruesos.
- **No usados en el MVP**: `intersectionPair`, `contactPair`, `contactPairsWith`, `contactCollider` y `EventQueue`.

## R6. Cronómetro como tiempo de simulación acumulado

- **Decision**: el cronómetro acumula **tiempo de simulación** (suma de `FIXED_DT` por paso en `running`), no reloj de pared. Arranca con el primer input de movimiento/salto (Q2), se detiene al entrar en la meta (Q2/FR-010), no se reinicia por respawn (Q5).
- **SC-006 (semántica explícita, NUEVO)**: "el tiempo mostrado coincide con la duración real del recorrido" se entiende como **duración de simulación**. Bajo inanición de FPS (clamp R1) o tab-out (rAF se pausa), el tiempo de fondo no se simula; al recuperar foco, el delta acumulado se descarta por el clamp y el crono **no salta**. Para un prototipo local de un jugador, un tab-out **pausa el intento de hecho**: decisión consciente y aceptable (cierra el Edge Case "pestaña pierde el foco" de la spec). Divergencia esperada respecto al reloj de pared, nombrada como degradación.
- **Alternatives considered**: `performance.now()` de reloj de pared — rechazado (dependencia de FPS y jitter en la métrica central).

## R7. Puerta automática del Principio II — test de determinismo / independencia de FPS

Única puerta automática obligatoria. Diseñada para ser **nítida y a prueba de tautología** (sin "knob" de tolerancia que se afloje hasta pasar).

- **Implementación (modelo de input determinista)**: `Input` captura flancos con `event.timeStamp`; `gameLoop.advance()` los consume exactamente una vez en la ventana `[simStartWall + k·DT, simStartWall + (k+1)·DT)` y construye un `StepInput` sin timestamps. `Simulation.step()` solo recibe `jump`/`restart` booleanos.
- **Decision (comparación)**: el test instancia una `Simulation` **fresca** por corrida (en Node, rapier3d-compat) y la corre con varias **líneas de tiempo de fotograma** sobre la **misma línea de inputs con timestamps**: 60 Hz estable (16,6 ms), jitter (5/40/8 ms), **30 Hz sostenido (33,3 ms)** y 144 Hz (7 ms). El input se entrega **por fotograma** (no por paso); el acumulador decide cuántos pasos corren. Se compara el estado **a igual nº de pasos fijos** y, gracias al modelo de input por timestamp, la igualdad es **exacta salvo epsilon de redondeo float (~1e-6), sin tolerancia perceptual**. La línea de 30 Hz casa con la letra de SC-004 ("~30 vs ~144 FPS").
- **Cobertura actual**: cuatro pruebas cubren salto en frontera, recorrido largo con saltos y posibles respawns, caída lateral con respawn y pureza/derivada de la trayectoria del obstáculo.
- **Requisitos del núcleo**: el hot path de `step()` no usa `Date.now`, `performance.now` ni `Math.random`; el tiempo y los inputs entran por argumento.
- **Rationale**: la nitidez (igualdad exacta) es la salvaguarda correcta para el único principio NO NEGOCIABLE; evita el falso fallo del enfoque "epsilon de float a igual nº de pasos" (que el flanco desfasado rompería) y la tautología del "epsilon perceptual ajustable".
- **Alternatives considered**: comparar invariantes perceptuales (nº de saltos + arco con tolerancia declarada + estado asentado) — válido pero introduce un knob de tolerancia; se prefiere el modelo por timestamp porque lo elimina. Comparar por tiempo de reloj — ruidoso por el sobrante del acumulador.

## R8. Zonas de salida/meta y respawn

- **Implementación (detección)**: salida y meta son AABB de datos dentro de `CircuitDefinition`, con representación visible en Three.js. Tras `world.step()`, la posición del jugador se comprueba contra la AABB de meta. El umbral de caída es `player.y < fallThreshold`.
- **Decision (meta, FR-010)**: entrar en la zona de meta con el intento en `running` → `won` (detiene crono, banner). **Condición de victoria = entrar en la zona de meta, sin validación de tramos** (atajos válidos), coherente con Q3 (sin checkpoints). Edge Case "atajo" cerrado.
- **Implementación (respawn, FR-011)**: al cruzar el umbral, `respawnPlayer()` usa `setTranslation(spawnPos, true)` y pone a cero velocidad vertical y knockback. El crono sigue corriendo. Los eventos de input pendientes no se limpian desde la simulación.
- **Decision (visibilidad, FR-008)**: salida y meta tienen, además del volumen AABB de datos (no es un collider), una **malla primitiva visible** (p. ej. losa/portal coloreado) solidaria, para que sean "claramente identificables" (FR-008). Coherente con "solo primitivas".
- **Edge Case "atascado entre obstáculo y pared sin caer"**: salida = **reinicio manual** (FR-012); el `knockbackMax` y los colliders gruesos reducen la probabilidad de encajamiento. Decisión consciente, sin código extra.

## R9. Geometría del circuito (layout concreto)

Contenido de nivel (no "cifras de ajuste"): se fija un layout aproximado para que las tareas de US2/US3 sean descomponibles. Coordenadas/dimensiones exactas viven en `config.ts` (R-V) y se afinan en la prueba de juego.

- **6 plataformas** (cajas) escalonadas formando un recorrido en L corto:
  - **P0 — Salida**: plataforma ancha al inicio; spawn encima; losa visible de SALIDA + volumen AABB de salida (datos).
  - **P1**: tras un hueco saltable desde P0 (valida salto, US1/US2).
  - **Rampa R1→**: rampa (caja inclinada) que sube de P1 a P2 (valida slide en rampa, FR-005).
  - **P2**: plataforma media.
  - **P3 — Obstáculo**: plataforma ancha cruzada por un **obstáculo móvil**: una **caja en vaivén horizontal** perpendicular al avance (eje X), que empuja/derriba al contacto (FR-006/FR-007). No es portante (R3).
  - **P4**: plataformas de paso con huecos (riesgo de caída → respawn, US3).
  - **P5 — Meta**: plataforma final; losa/portal visible de META + volumen AABB de meta (datos).
- **Muros laterales** gruesos en tramos estrechos (deslizamiento, FR-005; anti-tunneling, R5).
- **`FALL_THRESHOLD`**: un plano Y por debajo de la plataforma más baja; caer por debajo → respawn en P0.

---

## Resumen de dependencias

| Área | Elección | Forma |
|---|---|---|
| Lenguaje | TypeScript 6.x | ESM, ES2022, moduleResolution bundler |
| Render | Three.js | `^0.184.0` |
| Físicas | `@dimforge/rapier3d-compat` | `^0.19.x`; `await RAPIER.init()` una vez |
| Bundler/dev | Vite 8 | sin plugins WASM; `base: './'` para Pages |
| Test | Vitest 4 | `environment: 'node'`; cuatro pruebas |

Investigación cerrada e implementación completada. Demo: <https://dobbygl.github.io/topadero/>.
