# Data Model — Pase de feel del control (Fase 1)

No hay persistencia ni entidades nuevas de dominio: el "modelo" es el **estado del controlador**
(en `src/sim/player.ts`, mutado dentro del paso fijo) y el **catálogo de perillas** (en
`src/config.ts`). Todo es estado de simulación; las vistas solo lo leen.

---

## 1. Estado del jugador (`Player`)

Campos existentes (MVP) que se conservan: `verticalVelocity`, `knockbackX`, `knockbackZ`,
`isGrounded`, `facingYaw`, `timeSinceGrounded`.

Campos nuevos de esta feature:

| Campo | Tipo | Significado | Regla |
|---|---|---|---|
| `velX` | number | velocidad horizontal en X (m/s), con rampa | Se aproxima a la velocidad objetivo por `rate·dt` (R5). Alimenta el desplazamiento del KCC junto al knockback. |
| `velZ` | number | velocidad horizontal en Z (m/s), con rampa | Igual que `velX`. |
| `jumpBufferRemaining` | number | segundos de buffer de salto vigentes | Se arma a `jumpBufferTime` al pulsar sin poder saltar; se decrementa `dt`/paso; acotado a 0; se limpia al ejecutar el salto (R2). |
| `jumpAscending` | boolean | el personaje está en la fase de ascenso de un salto propio | `true` al lanzar; `false` al pasar el ápice (`verticalVelocity ≤ 0`), al quedar apoyado o tras el corte por soltado (R3). Gobierna el corte y la gravedad de "low jump". |
| `jumpHeld` | boolean | el botón de salto sigue mantenido (derivado de flancos) | Se pone `false` con un flanco `jumpRelease`, `true` con un flanco `jump`. Resuelve la interacción buffer × soltado (R4): un salto bufferizado lanzado con `jumpHeld=false` nace recortado al mínimo. |

> El knockback (`knockbackX/Z`) NO se fusiona con `velX/velZ`: sigue siendo una velocidad aditiva
> que decae aparte, para no amortiguar el empuje del obstáculo (FR-012, R5).

---

## 2. Máquina de estados de la intención de salto

Conduce buffering (US1), coyote (US1) y altura variable (US2). Todas las transiciones ocurren
**dentro del paso fijo**; los disparadores `jump`/`jumpRelease` son flancos ya ventaneados.

```
                    flanco jump (apoyado o coyote)            verticalVelocity ≤ 0
   GROUNDED  ───────────────────────────────────────▶  ASCENDING  ─────────────────▶  FALLING
      ▲   │   lanzar: vy=jumpSpeed; jumpAscending=true        │                          │
      │   │                                                   │ flanco jumpRelease       │
      │   │ flanco jump (NO apoyado, fuera de coyote)         │ y vy>0: vy=min(vy,        │
      │   │   armar buffer: jumpBufferRemaining=jumpBufferTime│ jumpReleaseVelocity);     │
      │   │                                                   │ jumpAscending=false       │
      │   ▼                                                   ▼                          │
      │  (buffer activo, decrece dt/paso)            (corte aplicado, sigue subiendo      │
      │   │                                            con low-jump gravity)              │
      │   │ al quedar apoyado/coyote con buffer>0:            │                          │
      │   │  lanzar salto; si jumpHeld=false → nace al mínimo │                          │
      └───┴──────────────── apoyado (grounded) ◀──────────────┴──────────────────────────┘
```

Reglas clave:
- **Orden dentro del paso** (toque del mismo paso): procesar **lanzamiento antes que corte**, de
  modo que pulsar+soltar en el mismo sim-step rinda exactamente el suelo mínimo (R3).
- **Coyote + buffer** no producen doble salto: al lanzar se pone `timeSinceGrounded = Infinity` y
  se limpia el buffer (impide re-salto hasta volver a tocar suelo). Garantía del MVP intacta
  (FR-008).
- **Buffer caducado**: si `jumpBufferRemaining` llega a 0 en el aire, no se ejecuta nada al
  aterrizar (FR-001, escenario 2 de US1).
- **Soltar ya en caída** (`verticalVelocity ≤ 0`): el corte no hace nada (no hay ascenso que
  recortar). Edge case de la spec.

---

## 3. Velocidad horizontal: cálculo por paso (R5)

1. `dir` = `moveAxis` transformado por `cameraYaw` y normalizado (igual que el MVP).
2. `tgt` = `dir · moveSpeed` (cero si no hay input).
3. `rate` = `groundAccel` (apoyado + input) | `groundDecel` (apoyado + sin input) | `airAccel`
   (en el aire + input) | 0 (en el aire + sin input → conserva velocidad).
4. Aproximar **vectorialmente** `(velX, velZ)` a `tgt` con paso máximo `rate · dt`.
5. Desplazamiento horizontal deseado = `(velX + knockbackX) · dt + carryDelta.x` (análogo en Z).

`facingYaw` se sigue fijando desde la dirección de input cuando hay input (rumbo responsivo), como
en el MVP.

---

## 4. Gravedad asimétrica: selección por paso (R6)

```
g(vy, jumpAscending) =
  gravity.y · fallGravityMult      si vy < 0            (caída)
  gravity.y · lowJumpGravityMult   si vy > 0 y !jumpAscending  (ascenso ya soltado)
  gravity.y                        si vy > 0 y jumpAscending   (ascenso mantenido)
```
`verticalVelocity += g · dt`. Con `fallGravityMult = lowJumpGravityMult = 1` degenera al MVP.

---

## 5. Catálogo de perillas nuevas (`src/config.ts`)

Todas con nombre, en el único lugar de ajuste (Principio V). Valores iniciales orientativos; se
afinan en playtest (no forman parte de la spec).

| Perilla | Unidad | Para | Nota de afinado |
|---|---|---|---|
| `coyoteTime` *(ya existe)* | s | margen de salto tras dejar el borde (US1) | afinar el 0.08 actual |
| `jumpBufferTime` | s | ventana del jump buffer (US1) | ~0.10–0.15 s típico |
| `jumpReleaseVelocity` | m/s | velocidad a la que se corta el salto al soltar = **suelo mínimo** (US2, FR-004) | > 0; define el "hop" mínimo |
| `groundAccel` | m/s² | rampa de arranque en suelo (US3) | mayor = más responsivo |
| `groundDecel` | m/s² | rampa de frenado en suelo (US3) | mayor = menos patinazo |
| `airAccel` | m/s² | control aéreo: aceleración hacia el objetivo en el aire (US3, FR-007) | separado del suelo |
| `fallGravityMult` | × | multiplicador de gravedad al caer (FR-010) | ≥ 1 para caída más rápida |
| `lowJumpGravityMult` | × | multiplicador al ascender con salto soltado (FR-010) | ≥ 1; complementa el corte |

`moveSpeed`, `jumpSpeed`, `gravity.y` ya existen y se conservan (la velocidad objetivo y el
lanzamiento del salto los usan).

---

## 6. Vistas (lectura, sin romper frontera)

`PlayerStateView` y `readPlayerState` añaden la **velocidad horizontal** (`velX/velZ`) además de
`verticalVelocity` y el knockback (R8). Es lectura pura: el HUD/depuración puede mostrarla y el
test de determinismo la incluye en su vector canónico para vigilar la rampa.
