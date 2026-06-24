# Phase 1 — Data Model: Topadero

No hay base de datos ni persistencia: el "modelo de datos" es el **estado en memoria de la simulación** durante una sesión. Las cifras concretas son parámetros de `config.ts` (Principio V), no parte del contrato; aquí se describen comportamiento y relaciones.

## Convenciones

- Todo lo que afecta a la simulación se actualiza dentro del paso fijo (`FIXED_DT`).
- Unidades: metros, segundos, radianes. El cronómetro es **tiempo de simulación acumulado**.
- **Detección de gameplay implementada**: el KCC resuelve colisiones sólidas; el empuje y la meta usan pruebas AABB deterministas en `Simulation.step()`.

---

## Entidades

### PlayerState
Personaje cápsula (FR-001..FR-005, FR-003, FR-007).

| Campo | Tipo | Notas |
|---|---|---|
| `position` | vec3 | Cuerpo `KinematicPositionBased`. |
| `facingYaw` | number | Orientación **visual** (se interpola en render). *Detalle de feel (Principio I), no exigido por ningún FR/SC.* |
| `velocity` | vec3 | `.x`/`.z`: SOLO la velocidad de empuje (knockback), que **decae** cada paso; `.y`: velocidad vertical. El movimiento de input NO se almacena aquí (se aplica como desplazamiento por paso). |
| `verticalVelocity` | number | Componente Y integrada manualmente (gravedad/salto). |
| `isGrounded` | bool | `computedGrounded()` del último paso; condición de salto. |

- **Regla (salto)**: solo modifica `verticalVelocity` si está apoyado o dentro de `coyoteTime = 0.08 s`; sin doble salto. Mientras asciende no se aplica snap-to-ground.
- **Regla (knockback)**: al contacto, el empuje del obstáculo se **fija** en los componentes horizontales de `velocity` (no se acumula) y luego **decae** cada paso con `knockbackDecay`; se consume vía el move-and-slide del KCC (no teletransporte), por lo que nunca atraviesa geometría sólida (R5).
- **Regla (colisión)**: se mueve con `computeColliderMovement`; no penetra y desliza contra paredes/rampa.
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

- **Regla (detección)**: cada paso fijo se comprueba la posición del jugador contra una AABB del obstáculo expandida por el radio/altura de la cápsula y `contactPrediction`. El knockback apunta desde el centro del obstáculo hacia el jugador y su magnitud suma velocidad del obstáculo, limitada por `knockbackMax`.

### Zone (Start / Finish)
Salida y meta (FR-008, FR-010).

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | `'start' \| 'finish'` | |
| `volume` | AABB de datos | Centro y semiextensiones definidos en `circuit.ts`; no crea un collider Rapier. |
| `visualMesh` | primitiva visible | Losa/portal coloreado solidario → "claramente identificables" (FR-008). |
| `spawnTransform` | transform | Solo `start`: pose de aparición y respawn. |

- **Regla**: entrar en `finish` con `running` → `won` (FR-010). **Completar = entrar en la zona de meta, sin validar tramos** (atajos válidos; coherente con Q3).

### RunState (máquina de estados + cronómetro)
(FR-009..FR-012, Q2/Q5).

| Campo | Tipo | Notas |
|---|---|---|
| `phase` | `'idle' \| 'running' \| 'won'` | |
| `elapsedSimTime` | number | Tiempo de simulación acumulado en `running`. SC-006 = duración de simulación (R6). El arranque (idle→running) se decide por `phase`, sin flag aparte. |

- **idle → running**: primer `moveAxis`/`jumpEdge` (Q2). **running → won**: entrar en meta (FR-010). **respawn**: caer bajo umbral → teletransporte a salida, `phase`/`elapsedSimTime` intactos (Q5/FR-011). **reinicio (cualquier fase)**: resetea jugador, obstáculo, `phase=idle`, `elapsedSimTime=0` (FR-012).

### FrameInput, InputEdge y StepInput
Entrada del navegador y entrada ya resuelta para un paso fijo.

| Campo | Tipo | Notas |
|---|---|---|
| `FrameInput.moveAxis` | vec2 | Estado continuo de teclado. |
| `FrameInput.cameraYaw` | number | Yaw crudo usado para transformar el movimiento. |
| `FrameInput.edges` | `InputEdge[]` | Eventos `jump`/`restart` con timestamp; el array persiste entre fotogramas. |
| `StepInput` | objeto | `moveAxis`, `cameraYaw`, `jump` y `restart` para un único paso fijo. |

- **Regla**: `gameLoop.advance()` ventana los `InputEdge`, elimina los consumidos y construye `StepInput`; `Simulation.step()` no procesa timestamps.

### Config (`config.ts`) — enumeración COMPLETA
Único lugar de las cifras (Principio V), agrupadas por dominio:

- **Bucle/sim**: `FIXED_DT (1/60)`, `MAX_SUBSTEPS`, `gravity`.
- **Jugador/KCC**: `capsuleHalfHeight`, `capsuleRadius`, `kccOffset`, `moveSpeed`, `jumpSpeed`, `coyoteTime`, ángulos de pendiente, snap-to-ground y autostep.
- **Cámara**: distancia, altura, offset vertical, límites de pitch, suavizado, sensibilidad y clamp del ratón.
- **Obstáculo**: amplitud, velocidad, semiextensiones, fuerza/máximo/decaimiento del knockback y margen de contacto.
- **Recuperación**: `fallThreshold`.
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

 (running) caer bajo umbral → setTranslation(salida,true), velocidad=0;
            sigue en running, crono NO se reinicia (Q5)
```

Estado implementado y sincronizado con `src/` el 2026-06-24.
