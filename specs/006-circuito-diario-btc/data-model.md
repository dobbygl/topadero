# Data Model — Circuito diario procedural (Fase 1)

Entidades de datos puros (sin Three.js ni Rapier). Las consume la construcción de escena; `src/sim/`
solo recibe la `CircuitDefinition` resultante.

## BeaconAnchor (ancla de baliza)

Bloque de Bitcoin que ancla el día.

| Campo | Tipo | Notas |
|---|---|---|
| `dayUTC` | string (`YYYY-MM-DD`) | Día UTC que ancla; derivado de la cadena, no del reloj local. |
| `height` | number (entero) | Altura del bloque ancla. |
| `hash` | string (64 hex) | Hash del bloque (fuente de aleatoriedad). |
| `timestamp` | number | Segundos UTC del bloque (debe ser `< 00:00 UTC de dayUTC`). |
| `confirmations` | number | `tip.height - height` en el momento de aceptar; regla: `>= 3`. |
| `source` | `'mempool' \| 'blockstream' \| 'cache' \| 'offline'` | Proveedor o degradación. |

Regla de identidad/selección: último bloque con `timestamp < midnight(dayUTC)` aceptado con
`confirmations >= 3`. Misma regla → mismo `BeaconAnchor` para todos.

## GeneratorVersion (versión del generador)

| Campo | Tipo | Notas |
|---|---|---|
| `generatorVersion` | string (p. ej. `"1.0.0"`) | Constante en `config.ts`; fija el algoritmo. |

Un cambio de algoritmo incrementa la versión y solo afecta a días futuros (FR-012). La reproducción
histórica fija `hash + generatorVersion`.

## DailyCircuit (circuito diario)

Salida de la resolución del día; envuelve la `CircuitDefinition` con su procedencia.

| Campo | Tipo | Notas |
|---|---|---|
| `dayUTC` | string | Día UTC. |
| `seedHex` | string | Seed blanqueado (SHA-256 del hash), hex; entrada del generador. |
| `circuit` | `CircuitDefinition` | Geometría generada (la fuente única que consume el sim). |
| `provenance` | `BeaconAnchor` | Para mostrar en UI y verificar. |
| `generatorVersion` | string | Versión usada. |
| `competitive` | boolean | `true` si deriva de la cadena; `false` en modo offline (seed local). |
| `structuralHash` | string | SHA-256 de la `CircuitDefinition` serializada; identidad verificable (SC-001/005). |

Estados: `resolving` (esperando baliza/finalidad) → `competitive` (baliza válida cacheada) |
`offline` (seed local de la fecha, no competitivo). Una vez resuelto y cacheado, no se reemplaza en la
sesión (FR-013).

## CircuitDefinition (sin cambios de tipo)

La estructura existente de `src/circuit.ts` (`spawn`, `statics[]`, `obstacles[]`, `zones[]`,
`theme?`). El generador la **produce**; el sim la **consume** igual que el circuito fijo de hoy. No se
añaden tipos de collider ni de obstáculo nuevos (FR-004): se reutilizan `platform/wall/ramp` y
`oscillate/rotateBar/pendulum/pusher/carry`.

## GeneratorParams (en config.ts)

| Campo | Tipo | Notas |
|---|---|---|
| `grid` | number | Paso de rejilla (m), p. ej. 0.5. Posiciones = entero·grid. |
| `segmentsRange` | `[min,max]` | Nº de plataformas del trazado (suelo de variedad). |
| `gapRange` | `[min,max]` | Hueco entre plataformas (m, múltiplos de grid), acotado por el envoltorio. |
| `platformWidthRange` | `[min,max]` | Ancho (X) de plataforma. |
| `obstacleDensity` | number | Prob. (num/den) de obstáculo por segmento; suelo mínimo de obstáculos. |
| `obstacleMix` | tipo→peso | Mezcla de tipos del catálogo a muestrear. |
| `varietySalt` | string | Sal opcional concatenada antes del SHA-256 (por defecto ""). |
| `envelope` | `{ gravity, jumpSpeed, moveSpeed }` | Constantes del salto con las que se genera la solubilidad. **Congeladas** bajo la versión; NO son las perillas de *feel* vivas. |
| `generatorVersion` | string | Ver arriba. |

**`GeneratorParams` es el bloque CONGELADO `GENERATION_CONSTANTS`** versionado por `generatorVersion`:
contiene el conjunto **completo** de entradas que afectan a la salida del generador (rangos + envoltorio).
El generador no lee perillas de *feel* vivas; afinar el *feel* no cambia circuitos pasados, y cambiar
cualquier constante de generación obliga a subir la versión (research §8).

## DailyConfig (en config.ts)

| Campo | Tipo | Notas |
|---|---|---|
| `providers` | string[] | URLs base Esplora: [mempool, blockstream]. |
| `confirmations` | number | 3 (finalidad). |
| `cacheKeyPrefix` | string | Prefijo de claves `localStorage` (circuito por día). |
| `bestMarkKeyPrefix` | string | Prefijo de claves de mejor marca por día/circuito. |

## LocalDailyBest (mejor marca diaria, local)

| Campo | Tipo | Notas |
|---|---|---|
| `dayUTC` | string | Día. |
| `circuitId` | string | `structuralHash` del circuito (ata la marca al circuito exacto). |
| `bestTimeMs` | number | Mejor tiempo del jugador para ese día/circuito. |
| `competitive` | boolean | `false` si se logró en modo offline. |

Persistencia estrictamente local (`localStorage`); degrada con elegancia si no está disponible
(FR-015). No contiene datos personales.
