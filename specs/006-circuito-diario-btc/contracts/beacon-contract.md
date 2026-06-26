# Contrato — Adaptador de baliza y orquestación diaria (src/daily/)

Adaptador de **red de solo lectura** + caché local + orquestación. **Fuera del paso fijo** y de
`src/sim/` (la frontera headless: `src/sim/` NO importa `src/daily/`). Habilitado por la constitución
v2.2.0. No envía datos: sin backend propio, sin cuenta, sin telemetría.

## beacon.ts — adaptador de cadena (solo lectura)

Esplora REST (mempool.space principal, blockstream.info alternativa). Endpoints: `/blocks/tip/height`,
`/block-height/{h}`, `/block/{hash}`.

- `getTip(provider): Promise<{height, hash, timestamp}>`
- `getBlockAtHeight(provider, h): Promise<{height, hash, timestamp}>`
- `selectAnchor(provider, dayUTC): Promise<BeaconAnchor | null>`
  - `midnight = 00:00:00 UTC de dayUTC`.
  - Retroceder desde la punta hasta el primer bloque con `timestamp < midnight`.
  - Aceptar solo si `tip.height - anchor.height >= confirmations` (3). Si no, devolver `null`
    (ventana de medianoche: aún no final).
- Cualquier error de red/timeout → excepción capturada por la orquestación (cascada), nunca rompe el
  arranque.

## daily.ts — orquestación

`resolveDailyCircuit(config, now): Promise<DailyCircuit>` (construcción de escena, antes de jugar):

1. **Día (calendario UTC + chequeo de cordura)**: `today = día UTC de calendario` del reloj local,
   validado contra `tip.timestamp`; si el reloj diverge de la cadena más de ~2 h, avisar y/o preferir
   el día de la cadena. El día **no** se toma del timestamp de la punta (rompería el borde de
   medianoche; ver research §2). ⚠ Refina la Q3 — **confirmar antes de /speckit-tasks**.
2. **Caché-first**: si hay `DailyCircuit` cacheado para `today` con la `generatorVersion` actual,
   devolverlo (sin red) (FR-008, SC-008). **Excepción**: si el cacheado es `offline` y ahora hay red,
   intentar resolver competitivo y, si tiene éxito, reemplazarlo (un competitivo es inmutable el día;
   un offline es reemplazable — ver research §7).
3. **Resolver baliza**: `selectAnchor(principal)`; si falla o `null`, `selectAnchor(alternativa)`
   (FR-010). 
4. **Generar**: `seed = seedFromHash(anchor.hash)`; `circuit = generateCircuit(seed, params)`;
   `structuralHash`; `competitive = true`. Cachear y devolver.
5. **Degradación offline** (sin red y sin caché del día): `seed = seedFromHash(localDateSeed(today))`;
   generar; `competitive = false`, `source = 'offline'`. No se reutilizan circuitos de días anteriores
   (decisión /clarify, opción B). (FR-009)

Cascada completa: **principal → alternativa → caché del día → seed local de la fecha**. Nunca pantalla
en blanco; sin consola ni flags de dev (Principio VI).

Una vez resuelto y cacheado, el circuito del día **no se reemplaza** en la sesión, ni tras una reorg
(FR-013).

## storage.ts — persistencia local

- `loadDay(dayUTC) / saveDay(DailyCircuit)`: clave `cacheKeyPrefix + dayUTC`.
- `loadBest(dayUTC, circuitId) / saveBest(LocalDailyBest)`: mejor marca por día/circuito.
- Todo en `localStorage`; si no está disponible o lanza, degradar con elegancia (el juego sigue
  jugable, sin guardado). (FR-015)

## Integración (main.ts)

Antes de jugar: `const daily = await resolveDailyCircuit(config, ...)` →
`Simulation.create(config, daily.circuit)`. Igual patrón que la inyección de la escena de sandbox; la
latencia de red/generación NO entra en el paso fijo (FR-006). La UI mínima (`dailyHud`) muestra
`provenance` (fecha/altura/hash/versión), la etiqueta competitivo/offline, la cuenta atrás al próximo
00:00 UTC y la mejor marca local.

## Frontera headless (verificación)

- `src/sim/` no importa `src/daily/` ni `src/circuitgen/`.
- `src/daily/` puede importar `src/circuitgen/` (puro) y `src/circuit.ts` (tipos).
- La generación pura (`src/circuitgen/`) no importa red ni DOM (corre en Node para los tests).
