# Research — Shell de juego (007)

Fase 0. Decisiones de diseño que resuelven las incógnitas del Technical Context, ancladas al código
existente (`src/core/gameLoop.ts`, `src/main.ts`, `src/audio/audio.ts`, `src/daily/daily.ts`,
`src/config.ts`). Formato: Decisión · Razón · Alternativas descartadas.

## R1. Pausa determinista (FR-007/008/012/013, SC-003/004) — la decisión central

**Decisión.** La pausa se implementa FUERA de `advance()` y de `src/sim/`. El bucle de render deja de
llamar a `advance()` mientras el estado del shell es `paused`. Al reanudar, se desplaza el ancla
`state.simStartWall += (segReanudar − segPausa)`. Como `advance()` calcula
`dueSteps = floor((now − simStartWall)/DT)`, desplazar el ancla por el tiempo pausado hace que NO se
generen pasos por el intervalo de pausa (no se acumula dt). Se añade un helper PURO en
`src/core/gameLoop.ts`, p. ej. `pauseShift(state, pausedSec)`, sin tocar el cuerpo de `advance()`.

**Unidades (cuidado).** `advance` recibe `now = nowMs/1000` (SEGUNDOS) y `simStartWall` está en
segundos. Por tanto `pausedSince` y el desplazamiento van en SEGUNDOS, mismo reloj que `now` (no en
ms). Restar ms a un ancla en segundos sobredesplazaría ×1000 y rompería la reanudación.

**DOS rutas distintas para entrar en `playing` (no confundir).** `pauseShift` es SOLO para
`paused→playing` (reanudar el MISMO intento). Los **intentos nuevos** —`title→Jugar` (tras haber
jugado antes), `results→volver a jugar`, `paused→reiniciar`— paran y rearrancan el reloj: ahí NO se
usa `pauseShift`, se **re-ancla el bucle** creando un `LoopState` nuevo (`createLoopState()`, que pone
`simStartWall=0`, `stepIndex=0`, `started=false`) y se vacía `frame.edges`. Si en su lugar se reusa el
`LoopState` persistente, en la re-entrada `dueSteps = floor((now − simStartWall)/DT)` incluye TODO el
tiempo fuera del juego y `toRun` se topa en `MAX_SUBSTEPS` (5): correrían **5 pasos espurios con el
input bufferizado** y el personaje se movería al instante de pulsar "Jugar". El flanco `restart` NO
basta: pone `elapsedSimTime=0`, pero esos 5 pasos lo vuelven a avanzar. Re-anclar es obligatorio.

**Flancos colgados (FR-008).** Tras desplazar el ancla, un flanco de salto bufferizado antes de la
pausa tiene `timestamp` cuya ventana cae en el pasado respecto al nuevo ancla → el propio `advance()`
lo elimina en su barrido final (`target < stepIndex` → `splice`). Además, al entrar en pausa se vacía
`frame.edges` de forma explícita (defensa equivalente al caso de pérdida de foco de la spec 003), así
el gesto de reanudar nunca se interpreta como salto.

**Razón.** Es la única forma de cumplir el Principio II sin riesgo: si `advance()` y `src/sim/` no
cambian, `tests/determinism.test.ts` sigue válido y verde por construcción. La pausa queda como una
propiedad del *bucle/host*, no de la simulación.

**Verificación automática (nuevo gate).** `tests/core/pause.test.ts`: dada una secuencia de inputs y
un reloj sintético, una corrida con una o varias pausas (ancla desplazada) produce exactamente los
mismos sim-steps y el mismo estado final que la corrida sin pausas. Cubre FR-013 y SC-004. **Debe
incluir una pausa MÁS LARGA que `MAX_SUBSTEPS × DT` (> 5 fotogramas)** y aseverar cero pasos espurios
+ `frame.edges` vaciado + desplazamiento aplicado antes del siguiente `advance`: una pausa corta puede
pasar incluso con la implementación rota (el clamp anti-espiral no se dispara), así que es el caso
largo el que ejercita de verdad el mecanismo. Conviene también un caso de re-anclaje en intento nuevo
(que `createLoopState()` no produzca pasos espurios al re-entrar tras un tiempo fuera).

**Alternativas descartadas.**
- *Acumulador con flag `paused` dentro de `advance()`*: mete estado de pausa en el camino determinista
  y obliga a re-validar/retocar el test de determinismo. Rechazada (toca el Principio II de frente).
- *Congelar con `dt = 0` por fotograma*: el bucle es timestamp-driven (no acumula dt por frame), así
  que “dt=0” no aplica; reintroducirlo sería un rediseño del bucle.
- *Parar `requestAnimationFrame`*: dejaría de renderizar la pantalla de pausa y de animar el menú;
  además, al volver, el salto de `now` exigiría igualmente desplazar el ancla. Seguimos pintando; solo
  no avanzamos la sim.

## R2. Reconstrucción del circuito al cambiar el día (FR-024a, FR-025)

**Decisión.** Extraer de `main.ts` un ciclo **"cargar circuito"**:
`loadCircuit(daily) → { sim = Simulation.create(config, daily.circuit); assets = await loadAssets(...);
view = new SceneView(...) }`, con un `teardown()` que libera los recursos Three del circuito anterior
(geometrías/materiales/texturas vía `dispose()`) **reutilizando el mismo renderer/contexto WebGL**
(no se recrea el `WebGLRenderer`, solo su contenido de escena). Al volver al título, el shell llama a
`resolveDailyCircuit(Date.now())`; si `dayUTC` difiere del de la sesión, hace `teardown()` + `loadCircuit`
del nuevo día antes del siguiente "Jugar". Mismo-día: no reconstruye (solo resetea el run en el
siguiente intento).

**Razón.** Q4 = B exige recoger el día nuevo al pasar por el título. Reusar un único renderer evita
fugas de contexto WebGL y mantiene el coste como el de un arranque. Esta costura es justo el
"cargar un circuito en la entrada de juego" que la futura selección de circuito (FR-025) reutilizará.

**Notas de implementación.** La resolución de baliza del día nuevo sigue su degradación offline
existente (deadline global → circuito offline; `src/daily/daily.ts`), así que el cambio de día nunca
deja pantalla en blanco. La reconstrucción ocurre fuera del paso fijo (construcción de escena), como
el boot; no afecta al determinismo.

**Alternativas descartadas.**
- *Recargar la página (`location.reload`) al cambiar el día* (era la opción A): más simple, pero el
  usuario eligió B; además no construye la costura de FR-025.
- *Recrear el `WebGLRenderer` entero por circuito*: caro y propenso a fugas de contexto; innecesario.

## R3. Capa de ajustes en caliente + persistencia (FR-016/017/019/019a, SC-005/008)

**Decisión.** `config.ts` es `as const` (inmutable, son los DEFAULTS, Principio V). Se introduce un
registro runtime **`PlayerSettings`** (mutable) sembrado desde esos defaults, persistido en
`localStorage`, y leído por los adaptadores/vistas:
- Volúmenes → `AudioManager.setMusicVolume/setSfxVolume/setMuted` (ya existen; hot-apply inmediato).
- Sensibilidad → valores de mirada (`mouseSensitivity`, `touchLookSensitivity`, `gamepadLookSpeed`,
  `invertCameraY`) que hoy se leen de `config`; pasan a leerse del `PlayerSettings` vivo (los
  consumidores en `src/input`/cámara reciben el valor actual, con el default de `config` como base).
- Reasignación de entrada → reusa el mecanismo de la spec 004 (`src/input/preferences.ts`,
  `src/input/scheme.ts`); NO se reimplementa.
- Toggle de debug de físicas → estado de SESIÓN (no se persiste; arranca apagado, FR-018).

La persistencia se **unifica** con las preferencias de entrada ya existentes (un único registro de
"preferencias de jugador" que ahora añade los volúmenes), para no tener dos sistemas de guardado.

**Razón.** Cumple FR-019 (defaults centralizados) y FR-019a (recordar todas las preferencias) sin
romper la inmutabilidad de `config`. Aprovecha que `AudioManager` ya expone setters: el "hot-apply"
de volumen es trivial (SC-005). Degradación: si `localStorage` falla, `PlayerSettings` se queda en
memoria con los defaults y el juego arranca igual (FR-024, SC-008).

**Alternativas descartadas.**
- *Mutar `config` en runtime*: imposible/incoherente (`as const`) y rompe el contrato de "defaults".
- *Dos almacenes separados (entrada vs. audio)*: duplica esquema y claves; se prefiere un registro.

## R4. Disparador de pausa: escritorio vs. móvil (FR-007a, FR-009)

**Decisión.**
- **Escritorio**: pausa explícita por teclado (p. ej. `Esc`/`P`). Como el juego usa pointer lock,
  `Esc` ya suelta el lock; se escucha `pointerlockchange`: perder el lock durante `playing` → pausar.
  Así la pausa de escritorio y la salida de pointer lock son el mismo gesto natural.
- **Móvil**: NO hay botón de pausa en pantalla. La pausa móvil es la pérdida de foco
  (`visibilitychange`/`blur`): backgrounding o bloqueo → auto-pausa (FR-009). La pantalla de pausa
  (reanudar/reiniciar/volver/ajustes) se ve al recuperar el foco.
- **Ambos**: la auto-pausa por pérdida de foco (FR-009) usa la MISMA pantalla de pausa; reanudar
  exige gesto explícito (no se reanuda solo).

**Razón.** Unifica el manejo: un solo "pausar()" disparado por teclado, por `pointerlockchange` o por
`visibilitychange`. Cumple la aclaración Q3 (móvil = foco) y FR-009. Reusar pointer lock evita inventar
un botón de pausa flotante en escritorio.

**Alternativas descartadas.**
- *Botón de pausa en pantalla también en móvil*: el usuario lo descartó (Q3); recargaría el HUD táctil.
- *Reanudar automático al recuperar el foco*: arriesga reanudar sin que la persona esté lista; FR-009
  exige gesto explícito.

## R5. Máquina de estados del shell (FR-001/004/005/007/010)

**Decisión.** Un estado de presentación `ShellState ∈ {title, playing, paused, results}` en `src/ui`,
con transiciones por intención del jugador y por estado de la simulación:
- `title --Jugar--> playing` (desbloquea audio, R6; pide pointer lock en escritorio)
- `playing --pausar/foco--> paused` ; `paused --reanudar--> playing`
- `playing --(run.phase==='won')--> results` (el shell OBSERVA el run, no lo decide)
- `results --volver a jugar--> playing` (reinicia el run) ; `results --título--> title`
- `paused --reiniciar--> playing` (reinicia) ; `paused --título--> title`
- En `title`: re-resolver el día y reconstruir si cambió (R2).

El bucle de render llama a `advance()` **solo** en `playing`. En `paused/results/title` se sigue
renderizando (la escena de fondo, los menús), pero la simulación no avanza. La detección de victoria
es el shell leyendo `sim.getRunState().phase === 'won'` (ya disponible), no lógica nueva en el sim.

**Razón.** Mantiene el shell como vista pura (Principio III): emite intención y observa estado. Centrar
quién llama a `advance()` en el estado del shell es lo que hace la pausa y los resultados triviales y
deterministas.

**Alternativas descartadas.**
- *Mover el estado de pantallas a `src/sim`*: rompe la frontera headless. Rechazada.
- *Detección de victoria por evento empujado desde el sim*: el run ya expone `phase`; observar es más
  simple y no añade acoplamiento.

## R6. Desbloqueo de audio desde "Jugar" (FR-003)

**Decisión.** El botón "Jugar" del título absorbe lo que hoy hace el overlay `#click-to-play`:
`input.requestLock()` (escritorio), `audio.resume()` y `audio.startMusic()`. Es el primer gesto del
usuario, que satisface la política de autoplay del navegador. El overlay técnico actual desaparece;
el título es la primera pantalla.

**Razón.** Un único punto de entrada (el título) cumple FR-001 y FR-003 a la vez, y elimina el overlay
de dev de cara al jugador (Principio VI). El modo captura `?shot` salta el título directo a la escena
(FR-023) y no necesita audio.

## R7. Reiniciar / volver a jugar reusando el flanco `restart` (FR-005/007/008)

**Decisión.** "Volver a jugar" (resultados) y "reiniciar el intento" (pausa) emiten el MISMO flanco
`restart` que hoy dispara la tecla R (`InputEdge.kind === 'restart'`, consumido dentro del paso fijo),
reinicializando el run en el sim. El shell solo pasa a `playing` y deja que el sim resetee. La tecla R
se mantiene como atajo (supuesto de la spec), pero deja de ser la única vía (Principio VI).

**Razón.** Reutiliza una ruta determinista ya validada; el shell no añade lógica de reinicio propia.
"Volver a jugar"/"reiniciar" repiten el circuito de la sesión (no re-resuelven el día, R2).

## R8. Navegación por teclado y mando en las pantallas (P3, FR-020/021/022)

**Decisión.** Las pantallas del shell son DOM con elementos focusables nativos (botones) y orden de
tabulación; la navegación por mando mapea D-pad/stick a mover el foco y el botón A a activar
(reutilizando la lectura de mando de `src/input/gamepad.ts`). Foco visible por CSS (`:focus-visible`).
Transiciones suaves con CSS (opacity/transform), sin parpadeo. Ayuda de controles en el título por
esquema (teclado/mando/toque), reutilizando la detección de `Scheme` (004).

**Razón.** Aprovecha accesibilidad nativa del DOM y la entrada ya existente; mantiene el pulido en la
capa de vista. Es P3: no bloquea el flujo de extremo a extremo.

## Resumen de impacto en la frontera (Principios II/III)

- `src/sim/` **no se toca**. `advance()` no cambia. Determinismo intacto + nuevo test de
  pausa-equivalencia.
- El shell, los ajustes y la reconstrucción de circuito viven en `src/ui`, `src/settings`, `src/core`
  (helper de pausa) y `src/main.ts`; ninguno es importado por `src/sim/`.
- Persistencia estrictamente local; degradación offline y sin storage garantizada (Principio VI).
