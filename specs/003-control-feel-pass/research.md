# Research — Pase de feel del control (Fase 0)

Decisiones de diseño que resuelven el "cómo" del feel sin tocar la frontera del MVP. Formato:
**Decisión / Razón / Alternativas**. Las cifras concretas son ajuste por playtest (Principio V),
no se fijan aquí.

---

## R1 — Modelo de entrada: flanco para el salto/soltado, muestreo continuo para el movimiento

**Decisión.** Mantener dos modelos de entrada distintos y documentarlos:
- **Salto y soltado del salto** = *flancos con timestamp*. `gameLoop.advance()` ya asigna cada
  flanco al sim-step cuya ventana `[winStart, winEnd)` contiene su `timestamp`. El nuevo flanco
  `jumpRelease` viaja por el mismo camino. Resultado: el momento de pulsar **y** el de soltar
  caen en el mismo sim-step a 30, 60, jitter o 144 FPS → corte del salto idéntico (FR-009).
- **Movimiento horizontal** = *muestreo continuo* (held-sampled): `StepInput.moveAxis` es el
  mismo valor para todos los subpasos de un fotograma. No se convierte en flancos.

**Razón.** El soltado del salto es un evento puntual cuyo instante determina la altura: tiene que
ser un flanco o el corte variaría con los FPS (el bug clásico). El movimiento, en cambio, es un
estado sostenido; con velocidad **instantánea** (MVP) el muestreo continuo es exacto, y con
velocidad **con rampa** (esta feature) un cambio de dirección puede caer en un subpaso distinto a
30 vs 144 FPS, pero el desfase es de un subpaso y queda por debajo del umbral perceptible que
exige el Principio II ("imperceptible entre ~30 y ~144 FPS"). Construir "flancos de movimiento"
sería infraestructura no pedida (fuera de alcance, Principio III).

**Consecuencia para la verificación (crítica).** El test de determinismo de locomoción (US3)
DEBE mantener `moveAxis` **constante** durante toda la línea de tiempo (p. ej. avance constante o
diagonal constante) y comprobar que la **rampa** de aceleración/desaceleración es idéntica entre
cadencias. NO se debe escribir un test que cambie de dirección en un instante de reloj esperando
igualdad exacta: el banco de pruebas no puede expresarlo y la garantía no es esa. En `contracts/`
se documenta con honestidad: salto/soltado son exactos por evento; locomoción es "idéntica con
input mantenido".

**Alternativas.** (a) Flancos de movimiento con timestamp → exacto pero fuera de alcance y
sobre-ingeniería para una rampa cosmética. (b) Dejar el movimiento instantáneo (MVP) → renuncia
al "peso", que es un objetivo de US3. Rechazadas.

---

## R2 — Jump buffering medido en tiempo de simulación

**Decisión.** El jugador guarda `jumpBufferRemaining` (segundos). Cuando un flanco de salto cae
en un paso pero no se puede saltar (no apoyado y fuera de coyote), se arma el buffer:
`jumpBufferRemaining = config.jumpBufferTime`. Cada paso fijo se decrementa en `dt` y se acota a
0. En cualquier paso en que el personaje quede apoyado (o dentro de coyote) con
`jumpBufferRemaining > 0`, se ejecuta el salto y se limpia el buffer.

**Razón.** La ventana se mide en pasos × `dt` (tiempo de simulación), no por fotograma, y el
flanco ya está asignado a un paso fijo por su timestamp → reproducible a cualquier FPS. Una
pulsación cuya ventana caduca antes de aterrizar llega a 0 y no se ejecuta (FR-001, escenario 2
de US1).

**Alternativas.** Contar fotogramas de gracia (no determinista) → rechazado. Recordar solo "hubo
pulsación" sin ventana → no caduca, viola FR-001 → rechazado.

---

## R3 — Salto de altura variable: lanzar al máximo y cortar al soltar; suelo mínimo garantizado

**Decisión.** El salto lanza siempre a `config.jumpSpeed` (la altura **máxima**) y marca
`jumpAscending = true`. Al recibir un flanco `jumpRelease` en un paso mientras `jumpAscending` y
`verticalVelocity > 0`, se corta: `verticalVelocity = min(verticalVelocity, config.jumpReleaseVelocity)`,
con `config.jumpReleaseVelocity > 0`. Ese valor positivo es el **suelo de altura mínima** (FR-004,
clarificado): aunque se suelte de inmediato, el personaje conserva un impulso mínimo y hace un
"hop" perceptible, nunca un salto nulo. `jumpAscending` se limpia al pasar el ápice
(`verticalVelocity <= 0`) o al quedar apoyado.

**Orden dentro del paso (importante para el toque rápido).** Si el flanco de pulsar y el de
soltar caen en el **mismo** sim-step (toque muy rápido), se procesa **primero el lanzamiento**
(`vy = jumpSpeed`) y **después el corte** (`vy = min(vy, jumpReleaseVelocity)`) en ese mismo
paso. Así un toque del mismo paso rinde de forma determinista exactamente el suelo mínimo.

**Razón.** "Lanzar al máximo y recortar" es el modelo estándar y encaja con el flanco de soltado;
el corte ocurre en el sim-step del soltado → independiente de FPS. El suelo mínimo evita el salto
casi nulo que la clarificación de FR-004 descartó.

**Alternativas.** Acumular impulso mientras se mantiene (integrar fuerza por paso) → más difícil
de acotar y de hacer reproducible; equivalente en sensación. Rechazado por complejidad.

---

## R4 — Interacción buffer × soltado: una pulsación bufferizada y soltada antes de aterrizar es un salto MÍNIMO

**Decisión.** Si el personaje arma el buffer (pulsa en el aire) y **suelta** antes de que el
salto bufferizado se ejecute, al aterrizar el salto se lanza e **inmediatamente queda en estado
"soltado"**: nace ya recortado al suelo mínimo (`jumpReleaseVelocity`). Es decir, el buffer
recuerda también si el botón sigue mantenido en el instante del lanzamiento; un toque corto antes
de aterrizar produce un salto bajo, no uno máximo.

**Razón.** Es la lectura natural de la intención del jugador (un toque = salto bajo, también
cuando se bufferiza) y evita la sorpresa de que un toque rápido antes de tocar suelo dé el salto
más alto. Se implementa con un flag de "mantenido" derivado de los flancos pulsar/soltar dentro
del paso fijo, por lo que sigue siendo determinista.

**Alternativas.** El buffer recuerda solo la pulsación y lanza a altura máxima (ignora el
soltado) → determinista pero contraintuitivo; rechazado. Cancelar el buffer si se suelta → pierde
el perdón de timing que persigue US1; rechazado.

---

## R5 — Aceleración/desaceleración en suelo y control aéreo (rampas dentro del paso fijo)

**Decisión.** El jugador guarda velocidad horizontal `velX, velZ`. Cada paso se calcula la
velocidad objetivo `(tgtX, tgtZ) = dirNormalizada × moveSpeed` a partir de `moveAxis` (relativo a
la cámara, igual que el MVP) y se aproxima la velocidad actual al objetivo limitando el cambio por
paso a `rate × dt`, con `rate` según el estado:
- Apoyado y con input → `groundAccel`.
- Apoyado y sin input → `groundDecel` (objetivo cero).
- En el aire → `airAccel` hacia el objetivo cuando hay input (control aéreo); sin input en el
  aire, conserva la velocidad (sin frenado) para que no se sienta rígido.
La aproximación es **vectorial** (limita la magnitud del cambio del vector velocidad), no por eje,
para que los cambios diagonales no se sientan raros. El resultado `velX, velZ` alimenta el
desplazamiento deseado que consume el KCC.

**Razón.** Integrar la rampa con `dt` constante dentro del paso fijo la hace determinista (con el
matiz de R1 sobre cambios de dirección). Separar `groundAccel/Decel` de `airAccel` cumple FR-007
(afinar aire y suelo por separado). Conservar la velocidad en el aire sin input da el control
aéreo "no flotante ni rígido" de FR-005.

**Regresión a proteger.** El **empuje del obstáculo** (`knockbackX/Z`) sigue siendo una velocidad
aditiva que decae aparte; el desplazamiento horizontal es `(velX + knockbackX) · dt + carryDelta`.
No se fusiona el knockback en `velX/velZ` para que la rampa no amortigüe ni "coma" el empuje
(FR-012). El transporte portante (`computeCarryDelta`) y el `snapToGround` condicionado a
`verticalVelocity` no cambian.

**Alternativas.** Suavizado exponencial (lerp por factor) → válido, pero la rampa lineal por
`rate·dt` es más predecible de afinar. Aproximación por eje → artefactos en diagonal. Rechazadas.

---

## R6 — Curva de gravedad asimétrica

**Decisión.** Sustituir `verticalVelocity += gravity.y · dt` por una gravedad escalada por estado
dentro del paso fijo:
- Descendiendo (`verticalVelocity < 0`) → `gravity.y · config.fallGravityMult` (caída más rápida).
- Ascendiendo con el salto ya soltado (`!jumpAscending` y `verticalVelocity > 0`) →
  `gravity.y · config.lowJumpGravityMult` (corta el ascenso un poco más).
- Ascendiendo y mantenido → `gravity.y` base.

**Razón.** Es la técnica clásica de "better jump feel" y complementa el corte por soltado (R3): el
corte da el salto bajo inmediato; el `lowJumpGravityMult` modela la diferencia continua entre
mantener y soltar. Como la gravedad pasa a depender solo del signo de `verticalVelocity` y de
flags ya deterministas, es determinista por construcción (FR-009, FR-010 clarificado: entra en
este pase). Con los multiplicadores a 1.0 el comportamiento degenera al del MVP (afinado seguro).

**Cuidado de afinado.** El corte por soltado (R3) y el `lowJumpGravityMult` actúan ambos al
soltar; se afinan juntos en playtest para que no se sumen de forma brusca. Es ajuste de cifras, no
de diseño.

**Alternativas.** Gravedad constante (MVP) → renuncia a FR-010. Curva por tabla/función de altura
→ sobre-ingeniería. Rechazadas.

---

## R7 — Crecimiento de la puerta automática (test de determinismo) con muestreo de pico

**Decisión.** Ampliar `tests/determinism.test.ts` reutilizando `expectIdenticalAcrossCadences`
(4 cadencias, igual nº de pasos, igualdad exacta), añadiendo un **muestreo de la altura máxima
(pico-Y)** al estado canónico comparado, además de la aserción de comportamiento. Casos nuevos:
1. **Salto bufferizado**: el personaje cae hacia el suelo y un flanco de salto con timestamp justo
   antes del aterrizaje queda bufferizado; comparar entre cadencias e **incluir el pico-Y tras el
   aterrizaje** (verifica que el salto bufferizado se disparó en el mismo instante de juego).
2. **Salto variable — soltado temprano vs mantenido**: (a) determinismo del caso con soltado
   temprano entre cadencias; (b) determinismo del caso mantenido entre cadencias; (c)
   comportamiento: `pico(mantenido) > pico(soltado temprano)` con margen medible, y
   `pico(soltado temprano) ≥` el suelo mínimo (no nulo).
3. **Locomoción con rampa**: `moveAxis` **constante** (R1) durante toda la línea; comparar la
   trayectoria (posición + `velX/velZ`) entre cadencias.

**Razón (crítica).** Si el corte o el lanzamiento bufferizado caen en un paso distinto según la
cadencia, el ápice difiere pero el personaje aterriza en el mismo `(x, z)` con `y` de vuelta en el
suelo: el vector de estado **final** lo daría por "idéntico" y un fallo pasaría desapercibido. Por
eso el muestreo de pico-Y entra también en la comparación de determinismo, no solo en la aserción
de comportamiento.

**Implementación de soporte.** `runScenario` gana un seguimiento del máximo `player.position.y` a
lo largo de la línea de tiempo (solo lectura, sin afectar a la simulación). El vector canónico
añade `velX/velZ` del jugador (R8).

**Alternativas.** Comparar solo estado final → no detecta el bug del ápice (rechazado). Terminar
las líneas a mitad de ascenso → válido pero menos legible que el pico explícito. Se prefiere el
pico.

---

## R8 — Estado de lectura: añadir la velocidad horizontal

**Decisión.** `readPlayerState` y `PlayerStateView` exponen la velocidad horizontal del jugador
(`velX/velZ`) además de la vertical y del knockback. El vector de estado canónico del test la
incluye.

**Razón.** Con la velocidad horizontal ahora con estado (rampa), el test debe poder vigilar la
rampa, no solo la posición; si no, dos implementaciones con rampas distintas pero misma posición
final pasarían. También el HUD/depuración puede mostrarla. Es lectura pura, no rompe la frontera.

**Alternativas.** Mantener `velocity` solo con el knockback (MVP) → el test no vigila la rampa.
Rechazado.
