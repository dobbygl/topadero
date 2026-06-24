# Phase 1 — Data Model: Topadero

No hay base de datos ni persistencia: el "modelo de datos" es el **estado en memoria de la simulación** durante una sesión. Las cifras concretas son parámetros de `config.ts` (Principio V), no parte del contrato; aquí se describen comportamiento y relaciones.

## Convenciones

- Todo lo que afecta a la simulación se actualiza dentro del paso fijo (`FIXED_DT`).
- Unidades: metros, segundos, radianes. El cronómetro es **tiempo de simulación acumulado**.
- **Detección contra el jugador cinemático**: siempre por consulta geométrica (`contactCollider` / `intersectionsWithShape`), nunca por grafo narrow-phase ni eventos de sensor (ver research, modelo de detección).

---

## Entidades

### PlayerState
Personaje cápsula (FR-001..FR-005, FR-003, FR-007).

| Campo | Tipo | Notas |
|---|---|---|
| `position` | vec3 | Cuerpo `KinematicPositionBased`. |
| `facingYaw` | number | Orientación **visual** (se interpola en render). *Detalle de feel (Principio I), no exigido por ningún FR/SC.* |
| `velocity` | vec3 | Velocidad lógica: input horizontal + componente de empuje (knockback) que **decae** cada paso. |
| `verticalVelocity` | number | Componente Y integrada manualmente (gravedad/salto). |
| `isGrounded` | bool | `computedGrounded()` del último paso; condición de salto. |

- **Regla (salto)**: sólo modifica `verticalVelocity` si `isGrounded` (FR-003, SC-002); sin doble salto. El paso del salto **desactiva snap-to-ground** (o ignora `isGrounded` mientras `verticalVelocity > 0`) para que el snap no anule el impulso. `coyoteTime` (config, recomendado `> 0`) da margen en bordes.
- **Regla (knockback)**: el empuje del obstáculo se SUMA a `velocity` como velocidad persistente que decae con `knockbackDecay`; se consume vía el move-and-slide del KCC (no teletransporte), por lo que nunca atraviesa geometría sólida (R5).
- **Regla (colisión)**: se mueve con `computeColliderMovement` **excluyendo sensores** (`QueryFilterFlags.EXCLUDE_SENSORS`); no penetra (FR-004), desliza contra paredes/rampa (FR-005).
- Física: cuerpo `kinematicPositionBased` + collider `capsule(halfHeight, radius)`.

### CameraState (capa de render, no simulación)
Cámara orbital 3ª persona (FR-002, Q1).

| Campo | Tipo | Notas |
|---|---|---|
| `yaw` | number | Escalar crudo (acumulado de `movementX`). **Define la base de movimiento del jugador** (no la matriz de la cámara suavizada). |
| `pitch` | number | Acotado a `cameraPitchClamp`. |
| `smoothedPosition`/`smoothedTarget` | vec3 | Suavizado `1-exp(-k·dt_render)` (solo render). |

- **Regla**: el input de cámara (ratón) NO arranca el cronómetro (Q2).

### MovingObstacle
Obstáculo en movimiento (FR-006, FR-007, Q4).

| Campo | Tipo | Notas |
|---|---|---|
| `phaseFn(simTime)` | función pura | Vaivén horizontal (eje/amplitud/velocidad en config) → posición determinista. No portante (R3, evita #488). |
| `velocityFn(simTime)` | función pura | **Derivada analítica** de `phaseFn`, para la magnitud del empuje. |
| `kind` | sólido (no sensor) | El KCC también lo trata en move-and-slide. |

- **Regla (detección)**: cada paso fijo, tras avanzar el obstáculo, `playerCollider.contactCollider(obstacleCollider, prediction)`; si `!= null` (o `distance < umbral`), inyecta knockback. `prediction ≥` desplazamiento del obstáculo por paso. Dirección desde la normal del `ShapeContact` (a world-space si rota); magnitud `clamp(knockbackStrength + velObstáculo·normal, knockbackMax)`.

### Zone (Start / Finish)
Salida y meta (FR-008, FR-010).

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | `'start' \| 'finish'` | |
| `sensorCollider` | collider sensor | No bloquea al KCC. Detección por `world.intersectionsWithShape(player...)`, NO por eventos de sensor. |
| `visualMesh` | primitiva visible | Losa/portal coloreado solidario → "claramente identificables" (FR-008). |
| `spawnTransform` | transform | Solo `start`: pose de aparición y respawn. |

- **Regla**: entrar en `finish` con `running` → `won` (FR-010). **Completar = entrar en la zona de meta, sin validar tramos** (atajos válidos; coherente con Q3).

### RunState (máquina de estados + cronómetro)
(FR-009..FR-012, Q2/Q5).

| Campo | Tipo | Notas |
|---|---|---|
| `phase` | `'idle' \| 'running' \| 'won'` | |
| `elapsedSimTime` | number | Tiempo de simulación acumulado en `running`. SC-006 = duración de simulación (R6). |
| `firstInputSeen` | bool | Arranca con el primer input de movimiento/salto (no cámara). |

- **idle → running**: primer `moveAxis`/`jumpEdge` (Q2). **running → won**: entrar en meta (FR-010). **respawn**: caer bajo umbral → teletransporte a salida, `phase`/`elapsedSimTime` intactos (Q5/FR-011). **reinicio (cualquier fase)**: resetea jugador, obstáculo, `phase=idle`, `elapsedSimTime=0`, `firstInputSeen=false`, descarta flancos (FR-012).

### InputFrame / buffer de input
Entrada por **fotograma de render**, consumida por el paso fijo.

| Campo | Tipo | Notas |
|---|---|---|
| `moveAxis` | vec2 | Movimiento del teclado (relativo a cámara). Arranca el crono. |
| `jumpEdges` | array de timestamps | Flancos de salto con su `event.timeStamp` (reloj). Consumidos **una vez**, en el paso fijo cuyo intervalo `[k·DT,(k+1)·DT)` contiene el timestamp (R7, determinismo). |
| `restartEdges` | array de timestamps | Ídem para reinicio. |
| `cameraDelta` | vec2 | Solo `CameraState`; NO arranca el crono ni entra en la sim. |

- **Regla**: el consumo por timestamp (no "primer paso tras el fotograma") es lo que hace el salto independiente de FPS (R7).

### Config (`config.ts`) — enumeración COMPLETA
Único lugar de las cifras (Principio V), agrupadas por dominio:

- **Bucle/sim**: `FIXED_DT (1/60)`, `MAX_SUBSTEPS`, `gravity`.
- **Jugador/KCC**: `capsuleHalfHeight`, `capsuleRadius`, `kccOffset`, `moveSpeed`, `jumpSpeed`, `coyoteTime` (>0), `maxSlopeClimbAngleRad`, `minSlopeSlideAngleRad`, `snapToGroundDistance`, `autostepMaxHeight`, `autostepMinWidth`, `autostepIncludeDynamic`, `enableCcd` (false; no-op en cinemático, documentado).
- **Cámara**: `cameraDistance`, `cameraHeight`, `cameraTargetOffset`, `cameraUp`, `cameraPitchMin`, `cameraPitchMax`, `cameraSmoothingK`, `mouseSensitivity`, `mouseDeltaClamp`.
- **Obstáculo**: `obstacleAxis`, `obstacleAmplitude`, `obstacleSpeed` (acotada: desplazamiento/paso < semigrosor), `obstacleHalfExtents`, `knockbackStrength`, `knockbackMax`, `knockbackDecay`, `contactPrediction`.
- **Zonas/geometría del circuito (R9)**: dimensiones y posiciones de P0–P5, rampa, muros; `startSpawn`, AABB de salida y meta, `FALL_THRESHOLD`.
- **Test/determinismo**: `FLOAT_EPSILON` (~1e-6, solo redondeo).

---

## Diagrama de transiciones (RunState.phase)

```text
        primer input de movimiento/salto
 idle ───────────────────────────────────▶ running
  ▲                                            │
  │ reinicio (FR-012)                          │ entrar en meta (FR-010)
  │                                            ▼
  └──────────────── reinicio (FR-012) ◀───── won

 (running) caer bajo umbral → setTranslation(salida,true), velocidad=0, descartar flancos;
            sigue en running, crono NO se reinicia (Q5)
```

Listo para contracts y quickstart.
