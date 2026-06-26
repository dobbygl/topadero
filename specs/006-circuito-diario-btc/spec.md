# Feature Specification: Circuito diario procedural con baliza Bitcoin

**Feature Branch**: `006-circuito-diario-btc`
**Created**: 2026-06-25
**Status**: Draft — enmienda v2.2.0 redactada y 5 clarificaciones resueltas (Clarifications, Session 2026-06-25); lista para `/speckit-plan`
**Input**: User description: "Generar en base al día un circuito procedural único. El juego es competitivo y open source: metiendo la fecha de mañana, cualquiera podría calcular el circuito de mañana. Usar el hash de un bloque de Bitcoin como fuente pública para que no sea predecible."

## Resumen

Hoy el circuito es fijo (`src/circuit.ts`). Esta feature introduce un **circuito diario**: cada día UTC el juego genera un trazado distinto, idéntico para todos los jugadores de ese día, imposible de conocer por adelantado y verificable por cualquiera. La aleatoriedad no sale de la fecha (sería predecible en un repo abierto), sino del **hash de un bloque de Bitcoin** que ancla el día: ese bloque no existe hasta que se mina, así que el circuito de mañana no se puede precomputar hoy. El algoritmo de generación es determinista, vive en el lado de construcción de escena y respeta las reglas duras vigentes (primitivas, frontera headless, paso fijo).

## Clarifications

### Session 2026-06-25

- Q: Regla de selección del bloque ancla del día → A: El último bloque de Bitcoin con marca de tiempo anterior a las 00:00 UTC del día (con confirmaciones de finalidad); ya existe en el instante exacto de medianoche, sin hueco en el borde.
- Q: Profundidad de finalidad N frente a reorg → A: 3 confirmaciones.
- Q: Cómo se determina el día "hoy" con reloj desajustado → A: Día de **calendario UTC del reloj local** con **chequeo de cordura** contra la cadena (si el reloj diverge > ~2 h del tiempo de la cadena, avisar/preferir el día de la cadena). NO se toma del timestamp de la punta, porque los timestamps de bloque son laxos (MTP ±~2 h) y romperían el borde de medianoche. Sin red: reloj local + caché del día. (Refinado en diseño /plan; confirmado.)
- Q: Fallback offline cuando no hay red ni caché de hoy → A: Circuito generado con un seed local de la fecha en "modo offline no competitivo"; no se reutilizan cachés de días anteriores. Las marcas en ese modo no cuentan.
- Q: Alcance de la cuenta atrás y la "mejor marca diaria" en UI → A: Mínimo viable en esta feature (cuenta atrás al próximo 00:00 UTC + mejor marca local del día + procedencia, básicos); la integración pulida (menús, historial) se coordina con la spec del shell.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Circuito del día, igual para todos e impredecible (Priority: P1)

Como jugador competitivo, quiero que el circuito de hoy sea el mismo que el de cualquier otro jugador ese día, distinto cada día, y que nadie haya podido conocerlo ni entrenarlo por adelantado, para que los tiempos del día se puedan comparar con justicia.

**Why this priority**: es la razón de ser de la feature y lo que sostiene todo lo demás. Sin un circuito diario determinista e impredecible no hay competición diaria; la verificación (US2) y la resiliencia (US3) solo tienen sentido encima de esto.

**Independent Test**: simular dos clientes "limpios" en la misma fecha UTC y comprobar que producen un circuito idéntico (misma geometría y mismos parámetros de obstáculo); cambiar la fecha simulada y comprobar que el circuito cambia; intentar generar el circuito de una fecha futura cuyo bloque ancla aún no existe y comprobar que no se puede producir el circuito canónico.

**Acceptance Scenarios**:

1. **Given** dos dispositivos distintos el mismo día UTC, **When** ambos cargan el modo diario, **Then** obtienen exactamente el mismo circuito (salida, meta, segmentos y obstáculos coinciden).
2. **Given** el circuito de hoy ya generado, **When** avanza el día UTC y se vuelve a cargar, **Then** el circuito es distinto del de ayer.
3. **Given** la fecha de mañana, **When** se intenta derivar el circuito de mañana antes de que exista su bloque ancla, **Then** el sistema no puede producir el circuito canónico de mañana (la entrada todavía no existe).
4. **Given** una baliza (bloque) ya conocida, **When** se genera el circuito, **Then** el trazado resultante es completable de la salida a la meta con el envoltorio de salto del control validado.

---

### User Story 2 - Verificable por cualquiera (Priority: P2)

Como persona ajena (jugador o auditor), quiero poder comprobar que el circuito del día deriva del bloque de Bitcoin real y no de una elección amañada, para confiar en que la competición diaria es limpia.

**Why this priority**: la verificabilidad es lo que diferencia usar Bitcoin de usar un seed local. Es esencial para un juego competitivo y open source, pero se apoya en que US1 ya genere de forma determinista.

**Independent Test**: tomar el hash de bloque publicado para una fecha, ejecutar el código open source con la derivación documentada y comprobar que se reproduce el mismo circuito que ve el juego ese día.

**Acceptance Scenarios**:

1. **Given** el circuito del día en pantalla, **When** el jugador abre la información del circuito, **Then** ve la fecha UTC, la altura y el hash del bloque ancla y la versión del generador.
2. **Given** esos datos publicados, **When** un tercero ejecuta el generador open source con ese hash y esa versión, **Then** obtiene un circuito idéntico al del juego (verificación reproducible).
3. **Given** un hash de bloque distinto al real, **When** alguien intenta hacerlo pasar por el del día, **Then** la verificación independiente falla porque no coincide con la cadena pública.

---

### User Story 3 - Resiliencia: sin conexión y ante fallos (Priority: P3)

Como jugador, quiero que el juego siga arrancando y siendo jugable aunque no haya red o la fuente de la baliza falle, y que el circuito de hoy no cambie al recargar, para no quedarme con una pantalla en blanco ni perder mi intento.

**Why this priority**: la jugabilidad sin consola ni dependencia obligatoria de red es una puerta de "publicable" (Principio VI) y la PWA juega offline. Enriquece la experiencia base de US1 y la blinda, por eso va después.

**Independent Test**: con el circuito del día ya cacheado, activar modo avión, recargar y comprobar que el mismo circuito sigue jugable; sin caché y sin red en primera carga, comprobar que arranca un circuito offline claramente etiquetado y jugable, sin pantalla en blanco.

**Acceptance Scenarios**:

1. **Given** el circuito de hoy ya resuelto y cacheado, **When** el jugador recarga durante el mismo día UTC (con o sin red), **Then** obtiene el mismo circuito sin volver a depender de la red.
2. **Given** que no hay red y no hay caché del día, **When** el jugador entra, **Then** el juego carga un circuito offline etiquetado como tal (no competitivo) y permanece jugable, con un mensaje claro en vez de un error.
3. **Given** que la fuente principal de la baliza no responde, **When** se intenta resolver el día, **Then** el sistema prueba una fuente alternativa antes de degradar a caché u offline.
4. **Given** el modo diario activo, **When** el jugador mira la interfaz, **Then** ve cuánto falta para el próximo circuito (cuenta atrás al siguiente 00:00 UTC) y su mejor marca local para el circuito de hoy.

### Edge Cases

- **Reorganización de cadena (reorg)**: si el bloque ancla cambia tras una reorg, el circuito del día NO DEBE cambiar bajo los pies del jugador. La baliza se elige con profundidad de finalidad suficiente y, una vez cacheado el día, no se reemplaza en esa sesión.
- **Reloj del dispositivo desajustado**: el día UTC se toma del **calendario del reloj local** con **chequeo de cordura** contra la cadena (si diverge > ~2 h, avisar/preferir el día de la cadena). NO se deriva del timestamp de la punta (los timestamps de bloque son laxos → rompería el borde de medianoche). Sin red, reloj local más caché del día.
- **Cambio de día a mitad de intento**: si el jugador cruza las 00:00 UTC jugando, el intento en curso termina en el circuito actual; el nuevo circuito entra en la siguiente carga o refresco explícito.
- **Fuente de baliza caída o limitada por rate limit**: cascada fuente principal → fuente alternativa → caché del día → seed local de la fecha (offline no competitivo).
- **Ventana en el borde de medianoche**: el bloque que ancla el día puede no estar disponible o confirmado en el instante exacto de las 00:00; la regla de selección DEBE tolerar ese hueco sin producir un circuito distinto según el momento de carga.
- **Circuito degenerado**: la generación DEBE garantizar un suelo de variedad y dificultad (no un trazado vacío o trivial) además de ser completable.
- **Cambio futuro del algoritmo**: si se modifica el generador, los circuitos históricos cambiarían. La versión del generador queda fijada por circuito y un cambio solo aplica a días futuros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE generar el circuito a partir de una baliza pública impredecible y verificable, no de la fecha. La entrada de aleatoriedad DEBE ser tal que el circuito de un día futuro no se pueda computar antes de ese día.
- **FR-002**: La baliza DEBE ser el hash del **último bloque de Bitcoin con marca de tiempo anterior a las 00:00 UTC del día**, tomado con **3 confirmaciones** de finalidad. Regla única y determinista: misma regla → mismo bloque para todos.
- **FR-003**: La generación DEBE ser determinista: dado el mismo hash de baliza y la misma versión del generador, DEBE producir el mismo circuito en cualquier dispositivo y navegador, hasta la precisión definida para colocación de geometría.
- **FR-004**: El circuito generado DEBE construirse solo con primitivas (cajas, rampas, cilindros) y con los tipos de obstáculo ya validados en las features 001 y 002 (vaivén, barra giratoria, péndulo, empujador, plataforma portante). No introduce tipos nuevos de collider ni colisión por mallas.
- **FR-005**: El circuito generado DEBE alimentar la fuente única de geometría que consumen por igual simulación y render (la vía de `src/circuit.ts`), sin que la simulación (`src/sim/`) importe red, render, audio ni persistencia.
- **FR-006**: La resolución de la baliza y la generación DEBEN ocurrir fuera del paso fijo, como construcción de escena previa, y NO DEBEN introducir no-determinismo en la simulación (Principio II).
- **FR-007**: Todo circuito diario DEBE ser completable de la salida a la meta dentro del envoltorio de salto del control validado. La comprobación de jugabilidad DEBE ser determinista, de modo que, si la generación reintenta o ajusta para garantizar solubilidad, todos los jugadores converjan al mismo circuito final.
- **FR-008**: El sistema DEBE cachear localmente la baliza y el circuito resueltos del día (almacenamiento del navegador permitido por la constitución), de forma que las recargas durante el mismo día UTC devuelvan el mismo circuito sin volver a la red.
- **FR-009**: Si no hay red ni caché del día, el sistema DEBE degradar con elegancia a un circuito generado con un **seed local de la fecha**, claramente etiquetado como **offline no competitivo** (no se reutilizan circuitos de días anteriores), sin pantalla en blanco ni dependencia de consola o flags de desarrollo (Principio VI). Las marcas en este modo no cuentan como competitivas.
- **FR-010**: Ante fallo de la fuente principal de la baliza, el sistema DEBE intentar al menos una fuente alternativa antes de degradar.
- **FR-011**: El sistema DEBE exponer la procedencia del circuito del día (fecha UTC, altura y hash del bloque, versión del generador) en la interfaz, de forma que un tercero pueda reproducir y verificar el circuito con el código open source. La presentación en esta feature es básica; la integración pulida (menús, historial) se coordina con la spec del shell.
- **FR-012**: La generación DEBE estar versionada. Cada circuito diario registra la versión del generador con la que se creó; un cambio de algoritmo incrementa la versión y solo afecta a días futuros, preservando la reproducibilidad de días pasados.
- **FR-013**: La baliza elegida DEBE tomarse con **3 confirmaciones** de finalidad para que una reorg no cambie el circuito del día; una vez cacheado el día, el circuito no se reemplaza en esa sesión.
- **FR-014**: Los parámetros de ajuste de la generación (número y rango de segmentos, anchos de hueco, densidad y mezcla de obstáculos, longitud del trazado, semilla de variedad) DEBEN vivir centralizados en `config.ts` (Principio V), no dispersos como números mágicos.
- **FR-015**: El circuito diario, junto a las marcas locales, DEBE conservar la mejor marca por día/circuito en almacenamiento local, degradando con elegancia si no está disponible. Esta feature muestra de forma básica la mejor marca del día y la cuenta atrás al próximo 00:00 UTC; la integración pulida se coordina con la spec del shell.

### Key Entities *(include if feature involves data)*

- **Circuito diario**: fecha UTC, seed derivada de la baliza, definición del trazado (segmentos, obstáculos, salida y meta), referencia de procedencia y versión del generador.
- **Ancla de baliza**: altura de bloque, hash, marca de tiempo del bloque y profundidad/confirmaciones consideradas.
- **Versión del generador**: identificador del algoritmo de generación, usado para reproducir circuitos históricos.
- **Mejor marca diaria (local)**: fecha UTC, identificador del circuito/seed y mejor tiempo del jugador para ese día.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dos clientes independientes en la misma fecha UTC producen un circuito idéntico (el hash de la definición del circuito coincide) en el 100% de los casos.
- **SC-002**: El circuito cambia cada día UTC: dos días distintos producen circuitos distintos con probabilidad prácticamente total.
- **SC-003**: No es posible obtener el circuito de mañana antes de que exista su bloque ancla: la generación del día D+1 no produce el circuito canónico mientras su baliza no esté disponible.
- **SC-004**: El 100% de los circuitos diarios generados son completables de salida a meta en una muestra amplia (objetivo: >= 1000 días simulados, 0 circuitos imposibles).
- **SC-005**: Un tercero reproduce el circuito del día partiendo solo del hash de bloque publicado, la versión del generador y el código open source, obteniendo un circuito idéntico al del juego.
- **SC-006**: Con caché del día y sin red, el circuito carga y es jugable; sin caché y sin red, carga un circuito offline etiquetado y jugable, sin pantalla en blanco ni uso de consola.
- **SC-007**: La puerta automática de determinismo e independencia de FPS sigue en verde con los circuitos generados, a 30/60/144 Hz (Principio II).
- **SC-008**: Cargado el circuito del día, permanece idéntico en todas las recargas durante esa fecha UTC, incluso tras perder la conexión.

## Impacto en la constitución *(RESUELTO — enmienda v2.2.0 redactada)*

La constitución v2.1.0 fijaba "Sin backend y sin red". Esta feature introduce una **lectura de red de solo lectura** hacia una fuente pública de balizas (la cadena de Bitcoin vía API pública), sin backend propio, sin cuenta de usuario y sin telemetría a servidor.

- No es ranking online ni persistencia en servidor (eso sigue fuera de alcance y NO se incluye aquí).
- Tocaba la restricción "sin red", así que la gobernanza exigía **enmendar primero la constitución**.
- **Enmienda aplicada (MINOR, v2.2.0)**: la constitución ahora permite una lectura saliente a una fuente pública de aleatoriedad/baliza, fuera del paso fijo, como adaptador puro que no altera la física, con degradación offline obligatoria (el juego sigue jugable sin red). El determinismo, la frontera headless, la colisión sobre primitivas y la persistencia estrictamente local se mantienen intactos.

Con la enmienda v2.2.0 en la constitución, el **bloqueo constitucional queda levantado**. Resta cerrar las 5 clarificaciones en `/speckit-clarify` antes de `/speckit-plan` (el `Constitution Check` del plan ya debería pasar).

## Out of Scope

- Ranking o tabla de tiempos online y cualquier envío de marcas a servidor (requiere su propia spec y enmienda; la persistencia aquí es estrictamente local). El circuito diario lo habilita, pero no se construye en esta feature.
- Multijugador o red entre jugadores.
- Anti-trampa de tiempos enviados.
- Audio o assets nuevos específicos del modo diario: se reutiliza lo existente.

## Assumptions

- **Fuente de baliza**: hash de bloque de Bitcoin, leído de una API pública sin clave (p. ej. categoría mempool.space / blockstream), con al menos una alternativa. La elección concreta de proveedor y la derivación criptográfica (blanqueo del hash a seed uniforme, PRNG sembrado) se fijan en el plan.
- El **día se define en UTC** para que el circuito sea global y único por jornada.
- La generación coloca geometría sobre una **rejilla o con aritmética reproducible** para evitar divergencias de coma flotante entre dispositivos.
- Se **reutiliza el catálogo de obstáculos deterministas** ya validado (001/002); la novedad es su disposición procedural, no nuevos tipos.
- Día UTC = calendario del reloj local con chequeo de cordura contra la cadena (no desde el timestamp de la punta); ver Clarifications.
- Profundidad de finalidad: 3 confirmaciones (resuelto en Clarifications, Session 2026-06-25).
