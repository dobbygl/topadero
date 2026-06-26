# Implementation Plan: Circuito diario procedural con baliza Bitcoin

**Branch**: `006-circuito-diario-btc` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-circuito-diario-btc/spec.md`

## Summary

Sustituir el circuito fijo por un **circuito diario** generado de forma determinista a partir del
hash de un bloque de Bitcoin que ancla el día UTC. El núcleo es un **generador puro**
`generateCircuit(seed, config) -> CircuitDefinition`: aritmética entera sobre una rejilla y un PRNG
sembrado (sin `Math.random`, sin coma flotante divergente), que coloca primitivas y los tipos de
obstáculo ya validados (001/002), y garantiza solubilidad con una comprobación **determinista** del
envoltorio de salto. La baliza se resuelve con un **adaptador de red de solo lectura** (mempool.space
con blockstream.info de alternativa), fuera del paso fijo, con caché local del día y **degradación
offline obligatoria** (seed local de la fecha, no competitivo). `src/sim/` **no se modifica**: la
puerta de determinismo/FPS sigue en verde; se añaden tests del generador (reproducibilidad +
solubilidad). Habilitado por la enmienda constitucional **v2.2.0** (lectura de red de solo lectura).

## Technical Context

**Language/Version**: TypeScript (proyecto Vite); Node 22 en CI/tests.
**Primary Dependencies**: Three.js y Rapier (existentes; sin cambios). Sin librerías nuevas: la
baliza se lee con `fetch` del navegador; el blanqueo hash→seed usa **Web Crypto** (`crypto.subtle`,
disponible en navegador y en Node 22). PRNG propio (función pura, ~30 líneas).
**Storage**: `localStorage` (Principio III): caché del día resuelto (baliza + definición del circuito
+ versión del generador) y mejor marca por día/circuito. Degrada con elegancia si no está disponible.
**Testing**: Vitest. `tests/determinism.test.ts` **no cambia** (`src/sim/` intacto) y sigue en verde.
Nuevos: reproducibilidad del generador (mismo seed → mismo circuito; SC-001/002/005), solubilidad
sobre ≥1000 seeds (SC-004), y unidad de la regla de selección de bloque con datos simulados.
**Target Platform**: navegador de escritorio y móvil (web estática), v2.2.0; sin backend propio; una
lectura de red de solo lectura a fuente pública con degradación offline.
**Performance Goals**: >= 60 FPS escritorio / >= 30 FPS móvil. La resolución de baliza + generación
ocurren **antes de jugar** (construcción de escena), no en el paso fijo ni por fotograma; objetivo de
generación < ~50 ms para no notar latencia de arranque (FR-006).
**Constraints**: generación determinista hasta la rejilla; baliza y generación **fuera del paso
fijo**; frontera headless (`src/sim/` no importa red, render, audio ni persistencia, ni el generador
de red); ajuste centralizado en `config.ts`; web estática sin backend propio; assets reutilizados (sin
nuevos). Solo lectura de red, sin envío de datos ni telemetría. El generador lee un bloque **congelado**
de constantes de generación versionado (rangos + envoltorio de salto), **no** las perillas de *feel*
vivas: afinar el *feel* no altera circuitos pasados y un cambio de constantes obliga a subir la versión
(research §8).
**Scale/Scope**: un juego, un circuito por día UTC. Generador + adaptador de baliza + caché local +
UI mínima (cuenta atrás + mejor marca + procedencia). El resto de UI se coordina con el shell.

**✅ Regla del día (confirmada, refina la Q3)**: el **día** = calendario UTC del reloj local + **chequeo
de cordura** contra la cadena (si el reloj diverge > ~2 h del tiempo de la cadena, avisar/preferir el
día de la cadena). No se deriva del `timestamp` de la punta (laxo, MTP ±~2 h → rompería el borde de
medianoche). Ver research §2.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design (ver abajo).*

- **I. La sensación de juego manda** — PASA. Se reutilizan los tipos de obstáculo ya validados; la
  comprobación de solubilidad garantiza que cada circuito es completable dentro del envoltorio de
  salto del control (FR-007). Puerta = prueba de juego manual del quickstart.
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — PASA, y de forma fuerte. `src/sim/`
  **no se modifica**: el generador produce datos (`CircuitDefinition`) que el sim consume igual que el
  circuito fijo de hoy. El generador es **puro y determinista** (PRNG sembrado entero, posiciones en
  rejilla exactamente representables en float64), así que mismo seed → mismo circuito en cualquier
  dispositivo/navegador (FR-003). La resolución de baliza es construcción de escena previa, fuera del
  paso fijo (FR-006). El test de determinismo/FPS sigue en verde sin tocar tolerancias (SC-007).
- **III. Alcance de producto y disciplina de acabado** — PASA bajo **v2.2.0**. La lectura de baliza es
  de SOLO LECTURA a fuente pública, como adaptador puro fuera del paso fijo; `src/sim/` **no** importa
  `src/daily/` ni `src/circuitgen/`. Sin backend propio, sin cuenta, sin envío de marcas ni telemetría.
  Degradación offline obligatoria (el juego arranca y es jugable sin red). Colisión solo primitivas;
  persistencia estrictamente local.
- **IV. Rebanadas verticales jugables** — PASA. US1 (circuito diario determinista e impredecible) es
  el MVP; US2 (verificable) se apoya en la pureza del generador; US3 (resiliencia offline) encima.
- **V. Comportamiento sobre cifras: config.ts** — PASA. Rango de segmentos, anchos de hueco, densidad
  y mezcla de obstáculos, longitud del trazado, tamaño de rejilla, sal de variedad, URLs de proveedor,
  confirmaciones (3), claves de caché y versión del generador viven en `config.ts`.
- **VI. Acabado de producto publicable** — PASA. Sin red → circuito offline jugable y etiquetado, sin
  pantalla en blanco ni flags de dev (FR-009). Procedencia visible (FR-011) y mejor marca local
  (FR-015) en UI básica; integración pulida ↔ shell.

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño confina la red a `src/daily/` y la
generación pura a `src/circuitgen/`, ambos fuera de `src/sim/` y del paso fijo. Sin violaciones →
*Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/006-circuito-diario-btc/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (baliza/proveedores, hash→seed, PRNG, rejilla, solubilidad, caché)
├── data-model.md        # Fase 1 (Circuito diario, Ancla de baliza, Versión del generador, Mejor marca)
├── quickstart.md        # Fase 1 (prueba manual: mismo circuito 2 clientes, cambio de día, offline, verificar)
├── contracts/
│   ├── generator-contract.md  # seed -> CircuitDefinition (puro, determinista, solubilidad)
│   └── beacon-contract.md     # adaptador de baliza (selección de bloque, confirmaciones, cascada, caché)
└── checklists/
    └── requirements.md  # Checklist de calidad (de /speckit-specify + clarify)
```

### Source Code (repository root)

```text
src/
├── circuitgen/
│   ├── prng.ts           # NUEVO: PRNG determinista entero (sfc32) + helpers (intRange, pick) — PURO
│   ├── seed.ts           # NUEVO: blanqueo hash→seed (SHA-256 vía Web Crypto) — determinista
│   ├── solvability.ts    # NUEVO: envoltorio de salto (de config) + comprobación de completable — PURO
│   └── generate.ts       # NUEVO: generateCircuit(seed, config) -> CircuitDefinition — PURO, headless
├── daily/
│   ├── beacon.ts         # NUEVO: adaptador de red SOLO LECTURA: tip + selección del bloque ancla + 3 conf,
│   │                     #        proveedor principal (mempool.space) + alternativa (blockstream.info)
│   ├── daily.ts          # NUEVO: orquesta día (desde cadena) -> baliza (caché-first) -> seed -> generate;
│   │                     #        etiqueta competitivo/offline; expone procedencia
│   └── storage.ts        # NUEVO: caché localStorage del día + mejor marca; degrada con elegancia
├── circuit.ts            # SIN CAMBIOS de tipos: CircuitDefinition sigue siendo la fuente única de geometría
├── main.ts               # cablear: resolver circuito diario (async, antes de jugar) -> Simulation.create
├── ui/
│   └── dailyHud.ts       # NUEVO (mínimo): cuenta atrás al próximo 00:00 UTC + mejor marca + procedencia
└── config.ts             # bloques `daily` (proveedores, 3 conf, cachés, versión) y `circuitgen` (rangos)

tests/
├── determinism.test.ts            # SIN CAMBIOS (src/sim intacto); debe seguir en verde
└── circuitgen/
    ├── reproducibility.test.ts     # mismo seed -> circuito idéntico; distinto seed -> distinto (SC-001/002/005)
    ├── solvability.test.ts         # >=1000 seeds, 0 imposibles (SC-004)
    └── beacon.test.ts              # regla de selección de bloque con datos simulados (sin red real)
```

**Structure Decision**: proyecto único existente. Dos módulos nuevos y aislados: `src/circuitgen/`
(generación **pura** seed→`CircuitDefinition`, importable en Node) y `src/daily/` (adaptador de red de
solo lectura + caché + orquestación). `src/main.ts` resuelve el circuito diario antes de jugar y lo
inyecta en `Simulation.create`, igual que ya hace con la escena de sandbox. **`src/sim/` no se toca**
y la puerta de determinismo no cambia. La generación no entra en el paso fijo ni por fotograma.

## Complexity Tracking

> Sin violaciones de la constitución que justificar (v2.2.0 habilita la lectura de red de solo
> lectura con degradación offline). Sección no aplicable.
