# Contract — Simulation API (seam headless)

Contrato del **núcleo de simulación**: la frontera entre la lógica de juego/física (testable sin navegador) y las vistas (Three.js, HUD) e input. Es el seam del que depende la puerta automática del Principio II. Three.js y el DOM **no** cruzan esta frontera.

## Construcción

```ts
await RAPIER.init();                       // UNA vez (rapier3d-compat); en main.ts (navegador) o beforeAll (tests)
const sim = Simulation.create(config);     // mundo + jugador + obstáculo + geometría estática; estado 'idle'
```

- `Simulation.create(config)` no importa Three.js ni toca el DOM → instanciable en Node (Vitest).
- El test crea una `Simulation` **fresca por corrida** (no reusa mundo).

## Avance del estado

```ts
sim.step(input: StepInput): void;   // EXACTAMENTE un paso de física de tamaño FIXED_DT
```

`StepInput` ya está asociado a un paso concreto:

```ts
interface StepInput {
  moveAxis: { x: number; y: number }
  cameraYaw: number
  jump: boolean
  restart: boolean
}
```

La frontera timestamp → paso fijo vive en `core/gameLoop.ts`: `advance()` recibe `FrameInput`, calcula la ventana temporal de cada paso, consume los eventos que caen en ella y construye `StepInput`.

**Orden interno implementado de `step()`:**

1. Capturar transformaciones anteriores para interpolación.
2. Si `restart` está activo, reiniciar jugador, obstáculo, estado y tiempo de simulación.
3. Programar la siguiente posición cinemática del obstáculo mediante `obstaclePosition(t + dt)`.
4. Detectar proximidad jugador↔obstáculo con una AABB expandida y actualizar el knockback persistente.
5. Integrar gravedad, movimiento relativo a `cameraYaw`, salto y knockback mediante el KCC.
6. Ejecutar `world.step()` para aplicar las traslaciones cinemáticas.
7. Actualizar la máquina de estados, acumular el cronómetro, comprobar la meta por AABB y aplicar respawn si `player.y < fallThreshold`.
8. Avanzar `simTime` en `FIXED_DT`.

> La detección de empuje usa la pose actual del obstáculo antes de `world.step()`, por lo que su respuesta puede tener una latencia de un paso. Es determinista.

**Invariantes del contrato** (lo que el test verifica):

1. `step()` avanza siempre `FIXED_DT`; no acepta dt variable. El troceado del reloj en pasos es del bucle (`core/gameLoop.ts`), no del núcleo.
2. **Independencia de FPS**: dado el mismo estado inicial y la misma secuencia de `StepInput`, el estado a igual número de pasos es idéntico salvo `FLOAT_EPSILON = 1e-6`.
3. `step()` no conoce timestamps ni FPS; solo recibe los booleanos `jump` y `restart` resueltos por el bucle.
4. Salto, empuje, meta y umbral de caída se evalúan dentro de `step()`.
5. El hot path no usa `Date.now`, `performance.now` ni `Math.random`.

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
| `advance()` ventana flancos y crea `StepInput` | FR-003, SC-002, FR-013 |
| AABB expandida jugador↔obstáculo | FR-007 |
| AABB de meta tras `world.step()` | FR-010, SC-006 |
| umbral → `setTranslation` | FR-011, SC-005 |
| `elapsedSimTime` (tiempo de sim) | FR-009, SC-006 |
| `getCircuitDefinition()` + zonas visibles | FR-006, FR-008 |

## Lo que ejercita el test (`tests/determinism.test.ts`)

- `Simulation.create(config)` fresca en Node.
- Misma línea de inputs **con timestamps** sobre 4 cadencias: 60 Hz, jitter (5/40/8 ms), **30 Hz** y 144 Hz (30 vs 144 casa con SC-004).
- `FrameInput` se entrega por fotograma a `advance()`; el bucle construye los `StepInput` y compara el estado a igual número de pasos.
- Cubre cuatro escenarios: salto cerca de una frontera, recorrido largo con saltos, caída lateral con respawn y función/derivada del obstáculo.
