# Contrato — Máquina de estados del shell (`src/ui/shell.ts`)

Contrato de UI. El shell es una **vista pura** (Principio III): observa el estado de la simulación y
emite intención; NO contiene lógica que altere la física. `src/sim/` no importa este módulo.

## Estados

`title` · `playing` · `paused` · `results` (más un overlay modal `settings` sobre `title`/`paused`).

## Quién avanza la simulación

El bucle de render llama a `advance(sim, loop, now, input)` **solo** cuando `screen === 'playing'`. En
los demás estados se sigue renderizando (escena de fondo + menús) pero la simulación no avanza
(FR-012). La interpolación de render usa el último `loop.alpha` válido (escena congelada en pausa).

## Transiciones (intención → efecto)

| Desde | Intención / señal | Hacia | Efecto |
|---|---|---|---|
| `title` | Jugar | `playing` | **Intento nuevo: RE-ANCLAR el bucle** (`loop = createLoopState()`) + vaciar `frame.edges` (NO `pauseShift`); desbloquea audio (`resume`+`startMusic`), pide pointer lock (escritorio); si el día cambió, ya se reconstruyó el circuito (ver Entrada a `title`). |
| `playing` | pausar (Esc/tecla / `pointerlockchange` perdido / `visibilitychange` oculto) | `paused` | `pausedSince = now` (segundos, = `nowMs/1000`); vaciar `frame.edges`; mostrar pantalla de pausa. NO se llama a `advance`. |
| `paused` | reanudar (gesto explícito) | `playing` | **Reanudar el MISMO intento: `pauseShift(loop, nowSeg − pausedSince)`** (segundos); `pausedSince = null`; re-pedir pointer lock (escritorio). |
| `paused` | reiniciar | `playing` | **Intento nuevo: RE-ANCLAR el bucle** (`createLoopState()`) + vaciar flancos + flanco `restart` (resetea el run). NO `pauseShift`. |
| `paused` | volver al título | `title` | Descartar el intento (Entrada a `title`). |
| `playing` | `sim.getRunState().phase === 'won'` | `results` | Calcular `AttemptResult` (`recordBest`), mostrar resultados. Una sola vez por victoria (re-armar al reiniciar). |
| `results` | volver a jugar | `playing` | **Intento nuevo: RE-ANCLAR el bucle** (`createLoopState()`) + vaciar flancos + flanco `restart`; repite el circuito de la sesión (no re-resuelve el día). |
| `results` | volver al título | `title` | Entrada a `title`. |

**Entrada a `title`** (desde `paused`/`results` o al arrancar): re-resolver el día con
`resolveDailyCircuit(Date.now())`; si `dayUTC` difiere del circuito en sesión → `teardown()` +
`loadCircuit(nuevo)` (FR-024a, ver `research.md` R2). Mismo día → conservar el circuito; el próximo
"Jugar" reinicia el run.

## Invariantes (verificables)

1. La simulación SOLO avanza en `playing` (FR-012); el cronómetro no corre en `paused`/`results`/`title`
   (SC-003).
2. Reanudar tras pausa produce el mismo resultado que no haber pausado, para los mismos inputs
   (FR-013, SC-004; gate `tests/core/pause.test.ts`).
3. A `results` solo se llega observando `phase === 'won'`; el shell no decide la victoria (frontera
   headless).
4. El flujo `title → playing → results → (playing|title)` y la pausa se completan sin consola ni flags
   de dev (FR-010, SC-001). El modo captura `?shot` puede saltar el título (ruta de dev, FR-023).
5. Reanudar exige gesto explícito; ni la recuperación de foco ni nada reanudan solos (FR-009).

## Intenciones emitidas (no muta física directamente)

`play` · `pause` · `resume` · `restart` (→ flanco `restart` del paso fijo) · `toTitle` ·
`openSettings`/`closeSettings` · `changeSetting(k, v)` (→ `src/settings`). El reinicio reusa el flanco
`restart` ya existente (tecla R), consumido dentro del paso fijo.
