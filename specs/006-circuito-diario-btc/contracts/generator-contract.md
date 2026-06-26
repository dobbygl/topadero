# Contrato — Generador de circuito (src/circuitgen/)

Módulo **puro y headless**: sin red, sin DOM, sin Three.js, sin Rapier. Importable en Node (tests) y
en el navegador. No importa `src/sim/` ni es importado por él.

## seedFromHash(blockHash: string, varietySalt?: string): Promise<Uint8Array>

- Blanquea: `seed = SHA-256(utf8(varietySalt) || bytes(blockHash))` vía Web Crypto.
- Determinista: misma entrada → mismo seed en navegador y Node 22.
- Devuelve 32 bytes uniformes. Para el modo offline, `blockHash` se sustituye por un derivado de la
  fecha local (etiquetado no competitivo); el resto del pipeline es idéntico.

## PRNG (sfc32) — prng.ts

- `createPrng(seed: Uint8Array)`: estado = 4×uint32 de los primeros 16 bytes del seed.
- `nextU32(): number` — uint32; aritmética entera (`>>> 0`, `Math.imul`); **idéntica entre motores JS**.
- `intRange(min, maxExclusive): number` — entero sin sesgo (rechazo).
- `pick<T>(items: T[]): T`, `chance(num, den): boolean`.
- **Prohibido** `Math.random` / `Date` / coma flotante no derivada del PRNG.

## generateCircuit(seed: Uint8Array, params: GeneratorParams): CircuitDefinition

Precondiciones: `params` es el bloque **congelado** `GENERATION_CONSTANTS` versionado por
`generatorVersion` (rangos de generación **y** las constantes del envoltorio de salto con las que se
generó), **no** las perillas de *feel* vivas de `config.ts` (ver research §8). `seed` de `seedFromHash`.
El generador NO lee valores de *feel* vivos: así afinar el *feel* no altera circuitos pasados y un
cambio de constantes de generación obliga a subir `generatorVersion`.

Postcondiciones (verificables):
1. **Determinismo total**: mismo `seed` + misma `generatorVersion` → `CircuitDefinition` **idéntica**
   (mismo `structuralHash`) en cualquier dispositivo/navegador. (FR-003, SC-001, SC-005)
2. **Solo primitivas y catálogo validado**: `statics` usan `platform/wall/ramp`; `obstacles` usan
   `oscillate/rotateBar/pendulum/pusher/carry`. Sin tipos nuevos. (FR-004)
3. **Rejilla**: toda posición/medida = `entero · params.grid` (exactamente representable en float64).
4. **Completable**: el trazado pasa la comprobación de solubilidad (abajo). Si la primera tirada no es
   soluble, el generador **ajusta de forma determinista** (acortar hueco a la rejilla soluble / re-tirar
   el segmento con sub-contador del PRNG) hasta serlo, convergiendo todos al mismo circuito. (FR-007)
5. **Suelo de variedad/dificultad**: `segments >= segmentsRange.min` y al menos N obstáculos según
   `obstacleDensity`; nunca un trazado vacío o trivial.
6. **Forma idéntica a la fuente única**: la salida es una `CircuitDefinition` (la que consume el sim),
   sin campos extra que el sim no entienda.

No determinismo introducido: ninguno. El generador no lee reloj, red ni estado mutable global.

## solvability.ts

- `jumpEnvelope(constants): { maxRun: number, maxRise: number }` — derivado de los valores de
  `gravity`/`jumpSpeed`/`moveSpeed` del bloque **congelado** `GENERATION_CONSTANTS` (no de las perillas
  vivas), cinemática cerrada. Suelo de corrección, no simulación física. Mantener el bloque alineado
  con el *feel* publicado; divergencia material = subida de `generatorVersion`.
- `isReachable(fromPlatform, toPlatform, envelope, margin): boolean` — hueco horizontal ≤ `maxRun·margin`
  y desnivel ≤ `maxRise·margin`.
- `isSolvable(circuit, config): boolean` — toda transición consecutiva salida→…→meta es alcanzable.

## structuralHash(circuit: CircuitDefinition): Promise<string>

- `SHA-256` de la serialización canónica (orden de claves estable) de la `CircuitDefinition`.
- Identidad verificable del circuito (UI, caché, verificación de terceros, tests). (SC-001/005)

## Garantía de la puerta automática (Principio II)

`src/sim/` no se modifica. La verificación de determinismo/FPS existente sigue en verde. Se añaden:
- reproducibilidad: mismo seed → mismo `structuralHash`; seeds distintos → hashes distintos.
- solubilidad: ≥1000 seeds, `isSolvable` true en el 100% (SC-004).
