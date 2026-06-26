# Research — Circuito diario procedural con baliza Bitcoin (Fase 0)

Resuelve los unknowns del plan. Formato: Decisión / Razón / Alternativas.

## 1. Fuente de baliza y proveedores

**Decisión**: API pública Esplora, sin clave, vía `fetch` del navegador. Principal **mempool.space**
(`https://mempool.space/api`), alternativa **blockstream.info** (`https://blockstream.info/api`).
Endpoints usados (mismos en ambas, compatibles Esplora):
- `GET /blocks/tip/height` → altura de la punta (entero).
- `GET /block-height/{height}` → hash del bloque a esa altura (texto).
- `GET /block/{hash}` → objeto del bloque, incluye `height` y `timestamp` (segundos UTC).

**Razón**: ambas son APIs públicas, sin registro ni clave, ampliamente usadas desde navegador y con
CORS habilitado. Dos proveedores independientes cumplen FR-010 (alternativa antes de degradar). Es de
SOLO LECTURA: no se envía nada (sin backend propio, sin telemetría), encaja con la enmienda v2.2.0.

**Alternativas**: un nodo propio (= backend, fuera de alcance); WebSocket de mempool (innecesario,
basta REST puntual); blockchain.info (menos consistente con Esplora). **Verificación en
implementación**: confirmar cabeceras CORS de ambos endpoints; si uno fallara, la cascada
(principal → alternativa → caché → offline) lo cubre sin romper el arranque.

## 2. Regla de selección del bloque ancla (resuelto en /clarify)

**Decisión**: el ancla del día D es el **último bloque con marca de tiempo anterior a las 00:00:00
UTC de D**, aceptado con **3 confirmaciones**.

El **día D** se toma del **día UTC de calendario** (reloj del dispositivo), **no** del timestamp de la
punta, con un **chequeo de cordura** contra la cadena: si el reloj local diverge del tiempo de la
cadena más allá de un umbral (p. ej. > 2 h), se avisa y/o se prefiere el día derivado de la cadena.
Es decir: el reloj fija el día (estable en medianoche), la cadena vigila que no esté groseramente mal.

Algoritmo (determinista, misma regla → mismo bloque para todos):
1. `today = día UTC de calendario` (reloj local), validado contra `tip.timestamp` (guarda de skew
   grosero). `midnight = 00:00:00 UTC de today`.
2. Buscar hacia atrás desde la punta el primer bloque con `timestamp < midnight` (alturas decrecientes;
   ~145 bloques/día, pocas peticiones; se puede acotar por estimación de altura y afinar).
3. Aceptar ese bloque como ancla solo si `tip.height - anchor.height >= 3` (finalidad). Si aún no
   (ventana de medianoche), el día no está resuelto: se reintenta luego o se juega offline-práctica
   hasta que esté disponible; una vez resuelto se cachea y ya no cambia (FR-013).

**Razón**: el bloque anterior a medianoche **ya existe** en el instante 00:00 (sin hueco) y mañana no
se puede precomputar. 3 confirmaciones (~30 min) bastan frente a reorg. Tomar el **día** del reloj de
calendario (no del timestamp de la punta) evita el bug del borde de medianoche: los timestamps de
bloque solo están laxamente atados al reloj (regla MTP; la punta puede ir hasta ~2 h adelantada y no
es estrictamente monótona), así que dos clientes a la misma hora real podrían derivar **días distintos**
del timestamp de la punta y, por tanto, **circuitos distintos** (rompería SC-001 justo en el borde que
la spec exige tolerar). El chequeo de cordura conserva la intención de la Q3 (no dejar que un reloj
muy mal puesto te saque del día).

> ✅ **CONFIRMADO (refina la Q3)**: día = **calendario UTC del reloj local + chequeo de cordura contra
> la cadena**. Sustituye a la formulación literal de la Q3 ("día derivado de la cadena"), que tomada
> como `UTC_day(tip.timestamp)` rompía el borde de medianoche. El chequeo de cordura conserva la
> intención de la Q3 frente a relojes muy mal puestos.

**Alternativas**: día = `UTC_day(tip.timestamp)` (rompe el borde de medianoche, ver arriba); primer
bloque posterior a 00:00 (no existe a medianoche → hueco); día por ventana de altura de bloque
(determinista pero se desfasa del calendario). Descartadas.

## 3. Blanqueo hash → seed

**Decisión**: `seed = SHA-256(bytes del hash de bloque)` con Web Crypto (`crypto.subtle.digest`).
El seed son 32 bytes uniformes; el PRNG toma sus primeros 128 bits como estado inicial.

**Razón**: el hash de un bloque NO es uniforme en sus bits altos (la prueba de trabajo fuerza ceros a
la izquierda). Pasarlo por SHA-256 lo blanquea a una cadena uniforme, evitando sesgos en la
generación. SHA-256 es determinista e idéntico en navegador y Node 22 → reproducible (FR-003, SC-005).

**Alternativas**: usar el hash crudo (sesgado por los ceros de PoW); HMAC con sal fija (innecesario,
no hay secreto). La **sal de variedad** (config) se concatena antes del SHA-256 para poder variar la
familia de circuitos sin cambiar la versión si se quisiera; por defecto vacía.

## 4. PRNG determinista

**Decisión**: **sfc32** (Simple Fast Counter, 32-bit), sembrado con 4×uint32 del seed blanqueado.
Aritmética entera de 32 bits con `>>> 0` y `Math.imul` → **bit-idéntica** entre motores JS
(navegador/Node). Helpers: `nextU32()`, `intRange(minInclusive, maxExclusive)` por rechazo (sin
sesgo), `pick(array)`, `chance(num, den)`.

**Razón**: pequeño, rápido, sin dependencias, y crucialmente **entero** → sin divergencia de coma
flotante entre dispositivos (causa clásica de circuitos distintos). `Math.random` queda PROHIBIDO en
el generador (no determinista).

**Alternativas**: mulberry32 (32 bits de estado, periodo corto), xoshiro128** (válido también),
PCG32. sfc32 es el equilibrio simple/calidad habitual para semillas de 128 bits.

## 5. Colocación determinista (rejilla)

**Decisión**: todo el trazado se dispone a lo largo de **-Z** (convención existente) sobre una
**rejilla** de paso `grid` (config, p. ej. 0.5 m). Posiciones, anchos y huecos = `entero * grid`, que
son **exactamente representables en float64** (múltiplos de 0.5), así que no hay redondeo divergente.
El generador elige del PRNG: número de segmentos, ancho/posición X de cada plataforma, longitud del
hueco al siguiente, y por segmento si lleva obstáculo y de qué tipo (del catálogo 001/002). Las
**magnitudes** del obstáculo (amplitud, velocidad, halfExtents del collider) se toman de `config.ts`
por tipo (sin cambios); el generador solo fija la **instancia** (id/kind/base/eje), igual que hoy
`circuit.ts`.

**Razón**: la rejilla entera es la garantía práctica de FR-003/SC-001 (mismo circuito bit a bit).
Reutilizar el catálogo cumple FR-004 (solo primitivas y tipos validados).

**Alternativas**: posiciones en float libre (riesgo de divergencia); cuantizar a posteriori (más
frágil). La rejilla desde el origen es lo más simple que pasa la prueba (Principio V).

## 6. Comprobación de solubilidad (FR-007)

**Decisión**: comprobación **geométrica determinista** del envoltorio de salto, no simulación física.
Del `config` se derivan, con la gravedad y `jumpSpeed`/`moveSpeed`, el **alcance horizontal máximo** y
la **altura máxima** de un salto. El generador valida cada transición entre plataformas consecutivas
(hueco horizontal ≤ alcance·margen y desnivel ≤ altura·margen). Si una transición no es soluble, se
**ajusta de forma determinista** (se acorta el hueco a la rejilla soluble más cercana, o se re-tira
ese segmento con un sub-contador del PRNG) hasta que lo sea. Como el ajuste depende solo del seed,
todos los clientes convergen al **mismo circuito final** (FR-007).

**Razón**: una comprobación cerrada y barata es determinista y testeable a escala (SC-004: ≥1000
seeds, 0 imposibles) sin meter física en la generación. Un suelo de variedad/dificultad (mínimo de
segmentos y de obstáculos en `config`) evita el circuito degenerado.

**Alternativas**: micro-simulación con Rapier en la generación (introduciría dependencia y coste, y
arriesga no-determinismo si no se hace con paso fijo); validación a ojo (no escalable, no testeable).

## 7. Caché local y degradación offline (resuelto en /clarify)

**Decisión**: `localStorage`. Clave por día UTC. Se cachea `{ dayUTC, height, hash, generatorVersion,
circuit }` la primera vez que se resuelve; recargas del mismo día devuelven ese objeto sin red
(FR-008, SC-008). Mejor marca por día/circuito en otra clave (FR-015). Cascada de resolución:
**principal → alternativa → caché del día → seed local de la fecha** (offline, no competitivo;
FR-009/FR-010). En modo offline las marcas no cuentan. Todo degrada con elegancia si `localStorage`
no está disponible (el juego sigue jugable, solo se pierde el guardado).

**Política competitivo vs offline (evita quedar atrapado)**: un circuito **competitivo** cacheado es
**inmutable** ese día (estabilidad frente a reorg, FR-013). Un circuito **offline** cacheado es
**reemplazable**: en cuanto una resolución competitiva tiene éxito (vuelve la red), sustituye al
offline. Así, si entras offline a las 08:00 y la red vuelve a mediodía, pasas a competitivo en la
siguiente carga/refresco en vez de quedarte en "no competitivo" todo el día. La inmutabilidad de
FR-013 protege el circuito competitivo, no fija el fallback.

**Razón**: cumple resiliencia y "publicable" (Principio VI) sin pantalla en blanco. El seed local de
la fecha usa el **mismo generador** (circuito de calidad equivalente), solo que etiquetado y no
verificable contra la cadena.

**Alternativas**: reutilizar el circuito real de un día anterior cacheado (descartado en /clarify:
opción B = siempre seed local); IndexedDB (innecesario para el volumen actual).

## 8. Versionado del generador (FR-012) — cubre TODO el input que afecta a la generación

**Decisión**: la `generatorVersion` versiona un bloque **congelado** `GENERATION_CONSTANTS` que
contiene el **conjunto completo** de entradas que afectan a la salida del generador, **separado** de
las perillas de *feel* que se afinan en vivo (Principio V). Ese bloque incluye:
- los `GeneratorParams` (grid, rangos de segmentos/huecos/anchos, densidad y mezcla de obstáculos, sal);
- **las constantes del envoltorio de salto** que usa la comprobación de solubilidad (los valores de
  `gravity`, `jumpSpeed`, `moveSpeed` con los que se generó), **no** las perillas vivas de `config.ts`.

El generador lee `GENERATION_CONSTANTS`, **no** los valores de *feel* vivos. Reproducción y `structuralHash`
se fijan por `hash + generatorVersion` (que pinta el bloque congelado completo). Afinar el *feel* en
vivo NO cambia los circuitos pasados; cambiar cualquier constante de generación **obliga** a subir la
`generatorVersion` y solo afecta a días futuros.

**Razón (lo que esto evita)**: si el generador leyera los valores vivos, afinar `jumpSpeed` o un rango
(algo que el Principio V invita a hacer a menudo) cambiaría en silencio los circuitos históricos
(rompe FR-012/SC-005) y, peor, el **skew de versión entre clientes** (p. ej. un service worker que
sirve un build viejo, riesgo ya visto en este proyecto) generaría circuitos distintos el mismo día
(rompe SC-001). Congelar el conjunto bajo la versión cierra ambos.

**Coherencia generación↔juego**: el envoltorio congelado debe mantenerse alineado con el *feel*
publicado; si una pasada de *feel* cambia materialmente el salto, es un evento de **subida de versión
del generador** (documentado), para que FR-007 (completable con el control validado) siga siendo cierto.

**Invariante de test**: "cambiar `jumpSpeed` (o cualquier perilla viva) NO altera el `structuralHash`
de un día pasado" — el generador no depende de las perillas vivas, solo del bloque congelado.

**Alternativas**: clavear solo `hash + versión` ignorando que la salida depende de params + envoltorio
(falso: rompe reproducibilidad al primer ajuste); acoplar generación a las perillas vivas (rompe
Principio V o la reproducibilidad). Descartadas.

## 9. Verificación por terceros (US2 / SC-005)

**Decisión**: el generador es open source y puro; la UI muestra fecha UTC, altura, hash y versión
(FR-011). Reproducir = ejecutar `generateCircuit(seedFrom(hash), config@version)` y comparar el **hash
estructural** de la `CircuitDefinition` con el del juego. El test `reproducibility.test.ts` fija esta
propiedad (mismo hash+versión → mismo circuito).

**Razón**: la verificabilidad es lo que distingue Bitcoin de un seed local; con generador determinista
y datos de procedencia, cualquiera reproduce el circuito del día.
