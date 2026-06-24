# Contract — Simulation API (seam headless) · Feature 002

Extiende el contrato de 001 (`specs/001-obstacle-platformer/contracts/simulation-api.md`). La
frontera no cambia: `src/sim/` sigue sin Three.js, sin assets y sin DOM, instanciable en Node.
Solo cambia lo necesario para **N obstáculos basados en pose** y **plataformas portantes**.

## Cambios respecto a 001

### Obstáculos: de uno a muchos, de posición a pose

```ts
// 001: un obstáculo, solo posición
sim.getObstacleTransforms(): ReadonlyArray<Transform>   // longitud 1

// 002: N obstáculos (vaivén + barra + péndulo + empujador + portantes), pose completa
sim.getObstacleTransforms(): ReadonlyArray<Transform>   // longitud N, en orden de circuit.obstacles[]
sim.getPreviousObstacleTransforms(): ReadonlyArray<Transform>  // mismo orden, para interpolar
```

- `Transform` ahora lleva **quaternion** (no `rotationY`). Barra/péndulo aportan orientación
  real; el render hace **slerp**. El jugador codifica su `facingYaw` como quaternion de eje Y en
  la lectura.
- Cada obstáculo se mueve con `setNextKinematicTranslation` **y** `setNextKinematicRotation`
  desde `pose(simTime+dt)` (función pura por tipo, en `sim/movingObstacle.ts`).

### Orden interno de `step()` (actualizado)

1. Capturar poses anteriores (jugador + **array** de obstáculos) para interpolación.
2. Si `restart`, reiniciar.
3. Para **cada** obstáculo: programar `pose(t+dt)` (traslación + rotación cinemáticas).
4. Knockback por obstáculo: AABB expandida jugador↔obstáculo; para rotatorios, magnitud/dirección
   desde la **velocidad tangencial**. Variante push/throw/brake según `config`.
5. **Soporte de portante**: AABB de cara superior (pies dentro de XZ + banda Y, apoyado). Si
   soporta, sumar `delta = pose(t+dt)−pose(t)` horizontal al movimiento deseado del KCC.
6. Integrar jugador (gravedad + input + knockback + delta de portante) vía KCC.
7. `world.step()`.
8. Máquina de estados, cronómetro, meta por AABB, respawn si `y < fallThreshold`.
9. `simTime += FIXED_DT`.

### Invariantes (extienden los de 001; el test los verifica)

1–5 de 001 se mantienen (paso fijo, independencia de FPS con igualdad exacta a `FLOAT_EPSILON`,
sin timestamps/FPS en el núcleo, evaluación dentro de `step()`, sin `Date.now`/`Math.random`).

Nuevos:

6. **Pureza de pose**: para todo obstáculo, `pose(simTime)` y su velocidad son funciones puras
   del tiempo; misma `simTime` → misma pose, sin estado oculto.
7. **Transporte portante determinista**: el soporte se decide por **AABB sobre datos**, nunca
   por consultas de contacto de Rapier; el delta se aplica dentro del paso fijo. El jugador
   apoyado recorre la misma distancia a 30/60/144.
8. **Colisión solo primitiva**: ningún `meshUrl`/asset entra en la simulación; los colliders son
   cuboide/cápsula/cilindro.

## Lecturas (sin cambios de forma salvo lo anterior)

```ts
sim.getPlayerState(): Readonly<PlayerStateView>
sim.getRunState(): Readonly<RunStateView>
sim.getCircuitDefinition(): Readonly<CircuitDefinition>   // ahora con obstacles[] y campos visual-only
sim.getObstacleTransforms() / getPreviousObstacleTransforms(): ReadonlyArray<Transform>
sim.getPreviousPlayerTransform(): Transform
```

- `getCircuitDefinition()` sigue siendo la **única fuente** de geometría; `render/scene.ts` la
  consume para mallas y lee los campos visual-only (`meshUrl`, `color`, `theme`) que `sim/`
  ignora.

## Contrato frente a requisitos

| Invariante / método | Requisitos / SC |
|---|---|
| `step()` fijo + igualdad exacta a 4 cadencias | FR-005, SC-002, Principio II |
| Pose pura por obstáculo (inv. 6) | FR-001, FR-002, SC-001 |
| AABB de transporte portante (inv. 7) | FR-007, SC-002 |
| Colisión solo primitiva (inv. 8) | FR-006, FR-013 |
| `getObstacleTransforms()` array + quaternion | FR-012, SC-004 |
| `getCircuitDefinition()` + campos visual-only | FR-008..FR-011, FR-015 |

## Lo que ejercita el test (`tests/determinism.test.ts`, CRECE)

Sobre las **4 cadencias** (60 / jitter 5-40-8 ms / 30 / 144) e igualdad exacta a igual nº de
pasos, además de los 4 escenarios de 001:

- Un caso por **tipo nuevo** (barra, péndulo, empujador): efecto en la trayectoria del jugador.
- Un caso de **transporte sobre plataforma portante**: misma distancia recorrida a cualquier FPS.
- Pureza de `pose()`/velocidad por tipo.
