# Data Model — Shell de juego (007)

Fase 1. Entidades del shell. El shell es vista pura: la mayoría son estructuras de presentación o de
preferencias, NO estado de simulación. Se reutilizan sin cambios las entidades del circuito diario
(`DailyCircuit`, `LocalDailyBest` en `src/daily/daily.ts`).

## ShellState (estado de presentación) — `src/ui/shell.ts`

Estado de la máquina de pantallas. No vive en `src/sim/` ni se persiste.

| Campo | Tipo | Notas |
|---|---|---|
| `screen` | `'title' \| 'playing' \| 'paused' \| 'results'` | Pantalla activa; gobierna si el bucle llama a `advance()` (solo `playing`). |
| `pausedSince` | `number \| null` | Reloj en SEGUNDOS (mismo que `advance`: `nowMs/1000`) de entrada en pausa; al reanudar, `pauseShift(loop, nowSeg − pausedSince)`. NO en ms (restar ms a un ancla en segundos sobredesplaza ×1000). `null` si no en pausa. |
| `settingsOpen` | `boolean` | El panel de ajustes es un overlay modal sobre `title` o `paused` (no es una pantalla propia). |
| `lastResult` | `AttemptResult \| null` | Resultado a mostrar en `results`; `null` fuera de `results`. |

**Transiciones** (detalladas en `contracts/shell-state.md`): `title→playing` (Jugar),
`playing→paused` (pausar/foco), `paused→playing` (reanudar), `playing→results` (run `won`),
`results→playing` (volver a jugar), `results→title` / `paused→title` (volver al título),
`paused→playing` (reiniciar). En `title`: re-resolver el día y reconstruir si cambió (FR-024a).

**Reglas de validación.**
- El bucle SOLO avanza la simulación en `screen === 'playing'` (FR-012).
- A `results` solo se entra al observar `sim.getRunState().phase === 'won'` (FR-004); el shell no
  decide la victoria.
- `pausedSince` se fija al pausar y se consume (→ `null`) al reanudar, alimentando el desplazamiento
  de ancla determinista (FR-013).
- **Re-anclaje en intento nuevo:** reanudar (`paused→playing`) usa `pauseShift`. Pero `title→Jugar`,
  `results→volver a jugar` y `paused→reiniciar` paran y rearrancan el reloj: ahí se **re-ancla** el
  `LoopState` (`createLoopState()`) y se vacían los flancos, NO se usa `pauseShift`. Reusar el bucle
  persistente correría pasos espurios al re-entrar (ver `research.md` R1).

## AttemptResult (resultado del intento) — derivado, no persistido

Lo que muestra la pantalla de resultados. Se deriva del estado de la simulación al cruzar la meta; no
introduce almacenamiento nuevo (la mejor marca la persiste `src/daily/`).

| Campo | Tipo | Origen |
|---|---|---|
| `timeMs` | `number` | `round(sim.getRunState().elapsedSimTime * 1000)` al entrar en `won`. |
| `best` | `LocalDailyBest \| null` | `recordBest(daily, timeMs)` (registra y devuelve la mejor del día). |
| `isNewBest` | `boolean` | `best.bestTimeMs === timeMs && competitive/coherencia` → dispara señal visual + SFX `new best` (FR-006). |
| `competitive` | `boolean` | `daily.competitive` (offline = no competitivo; ya lo expone la 006). |

**Reglas.** Si `localStorage` no está disponible, `best` puede ser `null`: se muestra solo `timeMs`
sin fallar (FR-004 escenario 5, SC-007). `isNewBest` reusa la detección existente de `recordBest`,
no se reimplementa.

## PlayerSettings (preferencias de jugador) — `src/settings/settings.ts`, persistido

Registro runtime mutable, sembrado desde los DEFAULTS de `config.ts` y persistido en `localStorage`
(FR-019/FR-019a). Unifica las preferencias de entrada ya existentes (004) con los volúmenes.

| Campo | Tipo | Default (de `config`) | Aplicación en caliente |
|---|---|---|---|
| `musicVolume` | `number` 0..1 | `config.audio.musicVolume` (0.5) | `AudioManager.setMusicVolume` |
| `sfxVolume` | `number` 0..1 | `config.audio.sfxVolume` (0.85) | `AudioManager.setSfxVolume` |
| `muted` | `boolean` | `config.audio.mutedByDefault` (false) | `AudioManager.setMuted` |
| `mouseSensitivity` | `number` | `config.mouseSensitivity` (0.0025) | leído por la mirada de cámara/ratón |
| `touchLookSensitivity` | `number` | `config.touchLookSensitivity` (0.005) | leído por la mirada táctil |
| `gamepadLookSpeed` | `number` | `config.gamepadLookSpeed` (2.6) | leído por la mirada de mando |
| `invertCameraY` | `boolean` | `config.invertCameraY` (false) | leído por la mirada (mando/táctil) |
| `inputBindings` | (reuso 004) | de `src/input/preferences.ts` | reasignación existente (`Scheme`/mapeos) |

**No incluido (sesión, no persistido):** el interruptor de **debug de físicas** arranca apagado en
cada carga (FR-018); su estado vive en `ShellState`/sesión, no en `PlayerSettings`.

**Esquema de guardado.** Un único registro JSON bajo una clave de `localStorage` (default en
`config.ts`, alineado con el patrón `cacheKeyPrefix`/`bestMarkKeyPrefix` de `config.daily`). Cargar al
arrancar; guardar en cada cambio del panel. Sin versionado de esquema multi-circuito (eso es de la
spec de persistencia posterior); aquí basta el registro plano.

**Reglas de validación / degradación.**
- Valores numéricos se acotan a su rango (volúmenes 0..1) antes de aplicar.
- Si `localStorage` no está disponible (incógnito/cuota/permisos): `PlayerSettings` vive solo en
  memoria con los defaults; el juego arranca y funciona (FR-024, SC-007/SC-008); los cambios se
  aplican en la sesión aunque no sobrevivan a la recarga.
- Determinismo (Principio II): la sensibilidad de mirada SÍ escala un input que llega al paso fijo
  (`cameraYaw` forma parte de `StepInput`, que el KCC usa para el movimiento relativo a cámara). No es
  violación: el determinismo es función de los INPUTS, y la sensibilidad es como un remapeo de
  control (cambia qué input se produce, no cómo la sim lo procesa). La puerta de determinismo inyecta
  `StepInput` sintético, así que es indiferente a la sensibilidad y sigue intacta. No se persiste
  estado de simulación; ningún ajuste cambia las trayectorias para una misma secuencia de `StepInput`.

## Entidades reutilizadas sin cambios (de la feature 006)

- **`DailyCircuit`** (`src/daily/daily.ts`): el circuito del día (seed, `circuit`, `provenance`,
  `competitive`, `structuralHash`). El shell lo recibe de `resolveDailyCircuit` y lo pasa al ciclo
  "cargar circuito"; al volver al título re-resuelve y reconstruye si cambió `dayUTC` (FR-024a).
- **`LocalDailyBest`** (`src/daily/daily.ts`): mejor marca local por día/circuito. El shell la lee
  (`loadBest`) para el título y la pantalla de resultados, y la registra (`recordBest`) al ganar.
