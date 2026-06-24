# Contract — Simulation API (seam headless)

Contrato del **núcleo de simulación**: la frontera entre la lógica de juego/física (testable sin navegador) y las vistas (Three.js, HUD) e input. Es el seam del que depende la puerta automática del Principio II. Three.js y el DOM **no** cruzan esta frontera.

## Construcción

```ts
await RAPIER.init();                       // UNA vez (rapier3d-compat); en main.ts (navegador) o beforeAll (tests)
const sim = Simulation.create(config);     // mundo + jugador + obstáculo + zonas + geometría estática; estado 'idle'
```

- `Simulation.create(config)` no importa Three.js ni toca el DOM → instanciable en Node (Vitest).
- El test crea una `Simulation` **fresca por corrida** (no reusa mundo).

## Avance del estado

```ts
sim.step(input: InputFrame): void;   // EXACTAMENTE un paso de física de tamaño FIXED_DT
```

**Orden interno de `step()` (load-bearing para el determinismo; fijo):**

1. Avanzar el obstáculo: `phaseFn(simTime)` → `setNextKinematicTranslation/Rotation`.
2. Integrar en el vector deseado del jugador: gravedad + movimiento (de `moveAxis`, relativo al yaw crudo) + knockback persistente (decae).
3. `computeColliderMovement(playerCollider, desiredDelta, EXCLUDE_SENSORS, ...)` → `setNextKinematicTranslation(pos + computedMovement())`.
4. Leer `computedGrounded()`.
5. Consultas geométricas (no narrow-phase): empuje `contactCollider(player, obstacle, prediction)`; meta/salida `intersectionsWithShape(player...)`; caída `player.y < FALL_THRESHOLD` → respawn (`setTranslation`, vel=0, descartar flancos).
6. Consumir los flancos (`jumpEdges`/`restartEdges`) **cuyo timestamp cae en el intervalo `[simTime, simTime+FIXED_DT)`**, exactamente una vez. Avanzar `simTime += FIXED_DT` y `elapsedSimTime` si `running`.

> Se acepta una latencia de **un paso** en el empuje (la consulta refleja la pose del obstáculo ya avanzada en este paso). Determinista.

**Invariantes del contrato** (lo que el test verifica):

1. `step()` avanza siempre `FIXED_DT`; no acepta dt variable. El troceado del reloj en pasos es del bucle (`core/gameLoop.ts`), no del núcleo.
2. **Independencia de FPS exacta**: dado el mismo estado inicial y la misma línea de inputs con timestamps, el estado a **igual nº de pasos fijos** es idéntico salvo epsilon de redondeo float (`FLOAT_EPSILON ~1e-6`), **con independencia de la cadencia de fotogramas** que generó esos pasos. Sin tolerancia perceptual.
3. Los flancos se consumen **exactamente una vez**, en el paso cuyo intervalo de sim-time contiene su timestamp (no "primer paso tras el fotograma"). Esto hace el salto independiente de FPS.
4. Todas las lecturas que afectan a la simulación (salto, empuje, meta, salida, umbral) ocurren dentro de `step()`.
5. Hot path **libre de no-determinismo**: sin `Date.now`/`performance.now`/`Math.random`; reducción determinista de los callbacks de consulta (p. ej. primer hit por handle ordenado); sin iteración dependiente del orden de inserción de `Map`/`Set`.

## Lectura de estado (solo lectura, para las vistas)

```ts
sim.getPlayerState(): Readonly<PlayerState>;        // position, facingYaw, velocity, isGrounded
sim.getObstacleTransforms(): ReadonlyArray<Transform>;
sim.getRunState(): Readonly<RunState>;              // phase, elapsedSimTime
// Interpolación de render (TODO lo que se mueve y se renderiza):
sim.getPreviousPlayerTransform(): Transform;        // posición + rotación
sim.getPreviousObstacleTransforms(): ReadonlyArray<Transform>;
// Geometría ESTÁTICA (seam para que render/scene.ts construya las mallas sin duplicar):
sim.getCircuitDefinition(): Readonly<CircuitDefinition>;  // plataformas, rampa, muros, zonas (forma+pose+tipo visible)
```

- `getCircuitDefinition()` es la **única fuente** de la geometría del circuito: `sim/` la usa para crear colliders y `render/scene.ts` para crear mallas Three.js (evita duplicar la definición en dos sitios).
- Las vistas **solo leen**; nunca escriben en la simulación salvo vía `step(input)`.
- Interpolación = `previous`/`current` + `alpha`, puramente visual, sobre jugador (pos+rot) y obstáculo.

## Contrato frente a requisitos

| Invariante / método | Requisitos / SC |
|---|---|
| `step()` fijo + invariante 2 (igualdad exacta) | FR-013, SC-004, Principio II |
| invariante 3 (flancos por timestamp, una vez) | FR-003, SC-002 |
| orden paso 5 (contactCollider) | FR-007 |
| orden paso 5 (intersectionsWithShape meta) | FR-010, SC-006 |
| orden paso 5 (umbral → setTranslation) | FR-011, SC-005 |
| `elapsedSimTime` (tiempo de sim) | FR-009, SC-006 |
| `getCircuitDefinition()` + zonas visibles | FR-006, FR-008 |

## Lo que ejercita el test (`tests/determinism.test.ts`)

- `Simulation.create(config)` fresca en Node.
- Misma línea de inputs **con timestamps** sobre 4 cadencias: 60 Hz, jitter (5/40/8 ms), **30 Hz** y 144 Hz (30 vs 144 casa con SC-004).
- Input entregado **por fotograma**; compara estado a **igual nº de pasos**; igualdad exacta (epsilon float).
- Un salto colocado cerca de una frontera de subpaso: una regresión al consumo "primer paso tras fotograma" lo desplazaría de sim-step y el test fallaría. El test crece por historia (salto P1, empuje P2, respawn/umbral P3).
