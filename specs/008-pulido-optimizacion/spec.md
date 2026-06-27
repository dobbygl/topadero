# Feature Specification: Pulido y optimización para el corte mínimo publicable

**Feature Branch**: `008-pulido-optimizacion`
**Created**: 2026-06-27
**Status**: Draft
**Input**: User description: "Octava iteración de Topadero: dejar el juego listo para publicar como web estática autocontenida y, en la misma pasada, pulido y optimizado: robustez ante fallos, una pasada de rendimiento (escritorio y móvil), presupuestos verificables de peso y triángulos de los assets, una pasada de QA y acabado, y el empaquetado de distribución."

## User Scenarios & Testing *(mandatory)*

Topadero ya es jugable de extremo a extremo: título, circuito del día, pausa, resultados, ajustes,
audio y persistencia local (specs 001-007). Lo que falta para poder publicarlo es el acabado: que
no se rompa con una pantalla en blanco cuando el navegador o un asset fallan, que cargue rápido y
vaya fluido también en móvil, que el arte pese lo que debe pesar y no haya peso muerto en la
entrega, y que el empaquetado se pueda servir como web estática sin sorpresas. Esta iteración es la
puerta final del Principio VI (acabado de producto publicable) y de la restricción de distribución
de la constitución (web estática, sin backend propio).

Hoy el peso de la entrega es el problema medible más claro: hay del orden de 40+ MB de texturas
sueltas que el build publica pero que no se cargan en tiempo de ejecución, y las texturas de arte
que sí se usan van a resolución y peso muy por encima de lo necesario. Los triángulos, en cambio,
están bajo control. Esta spec convierte el "arte de peso acotado a propósito" que ya enuncia la
constitución en presupuestos concretos, verificados de forma automática en el build.

Cada historia es una rebanada vertical verificable por separado y se valida antes de empezar la
siguiente (Principio IV). Juntas dejan el juego en estado publicable.

### User Story 1 - El juego nunca deja al jugador ante una pantalla en blanco (Priority: P1)

Una persona abre el juego en un navegador cualquiera. Mientras el motor de físicas y los assets
cargan, ve una pantalla de carga, no un lienzo en negro. Si su navegador no soporta lo que el juego
necesita (aceleración 3D o el módulo de físicas), o si un asset no llega a descargarse, ve un
mensaje claro que explica qué pasa y le ofrece una acción razonable (reintentar o una instrucción),
en lugar de quedarse colgada sin pistas. Todo el recorrido de jugar, de principio a fin, funciona
sin abrir la consola del navegador ni usar parámetros de desarrollo.

**Why this priority**: Es el suelo del Principio VI: una entrega que se queda en blanco ante un
fallo esperable no es publicable, por bueno que sea el juego detrás. Es lo primero que ve cualquier
persona ajena y lo que decide si el producto se percibe como terminado o como demo rota.

**Independent Test**: Cargar el juego en un navegador sano (aparece pantalla de carga y luego el
título), y luego forzar cada fallo esperable (sin aceleración 3D, sin el módulo de físicas, con un
asset que no descarga) y comprobar que cada caso muestra un mensaje claro con una acción, nunca una
pantalla en blanco ni un error solo visible en consola.

**Acceptance Scenarios**:

1. **Given** la página recién abierta, **When** el motor de físicas y los assets están cargando,
   **Then** se muestra una pantalla de carga (no un lienzo en blanco ni negro) hasta que el juego
   está listo para el título.
2. **Given** un navegador sin soporte de aceleración 3D, **When** el juego intenta arrancar,
   **Then** se muestra un mensaje claro que explica el requisito, sin excepción silenciosa ni
   pantalla en blanco.
3. **Given** un navegador donde el módulo de físicas no puede inicializarse, **When** el juego
   intenta arrancar, **Then** se muestra un mensaje claro con una acción (reintentar o instrucción).
4. **Given** un asset que no llega a descargarse (textura, malla o audio), **When** el juego carga,
   **Then** o bien continúa con una reserva visible y jugable, o bien informa del fallo con una
   acción; en ningún caso se queda en blanco ni rompe el arranque.
5. **Given** el juego ya cargado, **When** una persona juega de principio a fin (título, jugar,
   resultado, rejugar o cambiar de circuito), **Then** completa el recorrido sin tocar la consola ni
   parámetros de desarrollo.

---

### User Story 2 - El juego carga ligero y va fluido, también en móvil (Priority: P2)

Una persona abre el juego desde una conexión y un dispositivo normales, incluido un móvil. La
descarga inicial es ligera porque cada asset (textura, malla, audio) está dentro de un presupuesto
de peso declarado, no hay peso muerto en la entrega, y el juego se mueve con fluidez con el audio,
la interfaz, el arte y los obstáculos cargados a la vez. Los presupuestos están en un único lugar y
el propio proceso de construcción avisa o falla cuando un asset o el total los superan, de modo que
el peso no se descontrola en futuras iteraciones.

**Why this priority**: Es la diferencia entre un juego web que la gente espera a que cargue y uno
que abandona antes de jugar, y entre uno fluido y uno que da tirones en móvil. Además, fijar los
presupuestos de forma verificable evita que el peso vuelva a crecer sin control. Va después de la
robustez (P1) porque optimizar sobre una base que no se rompe es lo que tiene sentido validar.

**Independent Test**: Medir el peso total de descarga de la primera jugada y el peso de cada asset
contra su presupuesto; comprobar que el build no incluye assets no referenciados; y medir la tasa de
fotogramas con todo cargado en un navegador de escritorio típico y en un móvil objetivo. Forzar un
asset por encima de su presupuesto y comprobar que la construcción avisa o falla.

**Acceptance Scenarios**:

1. **Given** el build de producción, **When** se inspecciona lo que se publica, **Then** no contiene
   assets que el juego no carga en tiempo de ejecución (sin peso muerto en la entrega).
2. **Given** el catálogo de assets, **When** se comprueba cada asset contra su presupuesto, **Then**
   ninguna textura, malla ni pista de audio supera el peso declarado para su categoría, y ninguna
   malla supera su techo de triángulos.
3. **Given** los presupuestos de assets, **When** un asset o el peso total superan su límite,
   **Then** el proceso de construcción lo señala de forma automática (aviso o fallo), sin depender de
   una revisión manual.
4. **Given** el juego con audio, interfaz, arte y obstáculos cargados, **When** se juega un intento
   completo en un navegador de escritorio típico, **Then** se sostiene el objetivo de fluidez
   (>= 60 FPS) sin caídas por debajo de un nivel jugable.
5. **Given** el juego en un móvil de gama media, **When** se juega un intento completo, **Then** se
   sostiene >= 30 FPS estables (suelo de la spec 004), sin tirones que impidan jugar.
6. **Given** una misma secuencia de inputs antes y después de la optimización de assets y de la
   pasada de rendimiento, **When** se ejecuta la verificación de determinismo, **Then** sigue en
   verde: la trayectoria y el tiempo final no cambian con los FPS.

---

### User Story 3 - El juego se siente terminado y se puede publicar (Priority: P3)

Una persona juega y todo encaja: el personaje y los obstáculos están bien alineados con lo que
toca, sin geometría que asome ni parpadeos, las escalas y la iluminación son coherentes, y la
interfaz se ve cuidada en escritorio y en móvil. Por el lado de quien publica, el juego se puede
servir como web estática en una plataforma como GitHub Pages o itch.io sin ningún servidor en
marcha, el recorrido completo funciona sobre el build real (no solo en el entorno de desarrollo), y
la entrega lleva sus metadatos para compartir y los créditos y licencias de los assets.

**Why this priority**: Es el lustre que separa "jugable" de "publicable" y la mecánica de poner el
juego delante de la gente. Va al final porque el pulido de acabado y la verificación de publicación
solo tienen sentido sobre un juego ya robusto (P1) y optimizado (P2).

**Independent Test**: Recorrer una checklist de QA repetible sobre el juego integrado (consistencia
visual, coherencia de la interfaz, ausencia de glitches) en escritorio y móvil; construir la
entrega de producción, servirla como ficheros estáticos sin servidor y completar el recorrido de
extremo a extremo sobre ese build; y comprobar que están los metadatos para compartir y los créditos
y licencias.

**Acceptance Scenarios**:

1. **Given** el juego integrado, **When** se recorre la checklist de QA, **Then** no hay
   desalineación visible entre las mallas y los colliders, ni geometría que asome, ni parpadeo
   (z-fighting), y las escalas e iluminación son coherentes.
2. **Given** la interfaz y el shell (título, pausa, resultados, ajustes), **When** se revisan en
   escritorio y en móvil, **Then** se ven cuidados y coherentes, sin elementos cortados ni
   solapados.
3. **Given** la entrega de producción construida, **When** se sirve como ficheros estáticos sin
   ningún servidor en ejecución, **Then** el juego arranca y el recorrido de extremo a extremo se
   completa sobre ese build (no solo en el entorno de desarrollo).
4. **Given** la entrega de producción, **When** se inspeccionan sus metadatos, **Then** incluye los
   datos de publicación (título, icono y la información para compartir en redes) y los créditos y
   licencias de los assets de audio y arte.
5. **Given** el juego servido como web estática, **When** se abre sin conexión a la fuente externa de
   baliza, **Then** arranca y es plenamente jugable (degradación offline), porque la red enriquece
   pero no es requisito.

---

### Edge Cases

- ¿Qué pasa si el navegador soporta aceleración 3D pero pierde el contexto gráfico a mitad de
  partida? Debe informarse o recuperarse sin pantalla en blanco.
- ¿Qué pasa si solo falla parte de los assets (por ejemplo una textura de un obstáculo)? El juego
  debe seguir jugable con reserva visible, no abortar.
- ¿Qué pasa si la conexión es muy lenta? La pantalla de carga debe seguir siendo informativa y no
  confundirse con un cuelgue.
- ¿Qué pasa si un asset entra justo en el límite de su presupuesto? La regla de aviso/fallo debe ser
  inequívoca (límite inclusivo o exclusivo definido).
- ¿Qué pasa si se sirve el build desde un subdirectorio (por ejemplo `/play`) en lugar de la raíz
  del dominio? Las rutas de los assets deben resolverse igual.
- ¿Qué pasa en un móvil de gama baja que no alcanza los 30 FPS del suelo de gama media? Debe quedar
  definido si se degrada algo visual o se acepta como fuera del objetivo.

## Clarifications

### Session 2026-06-27

- Q: ¿Presupuesto de peso total de descarga de la primera jugada? → A: <= 20 MB (assets más el código de la aplicación).
- Q: ¿Cómo actúa la construcción al superar un presupuesto? → A: el build FALLA siempre que un asset o el total superen su presupuesto (límite duro, no solo aviso).
- Q: ¿Presupuesto de las texturas de arte (obstáculos, props, personaje)? → A: máximo 1024x1024 y <= 512 KB por textura.
- Q: ¿Techo de triángulos por malla? → A: personaje <= 15k, obstáculo/prop <= 12k (exige reducir el péndulo, hoy ~20k); total de escena <= 120k.
- Nota: el suelo de fluidez móvil no se preguntó: ya está cuantificado en la spec 004 como >= 30 FPS estables en gama media (en escritorio se mantiene >= 60 FPS). Se adopta tal cual.

## Requirements *(mandatory)*

### Functional Requirements

**Robustez y acabado (P1)**

- **FR-001**: El juego MUST mostrar una pantalla de carga mientras el motor de físicas y los assets
  se inicializan, en lugar de un lienzo en blanco o negro.
- **FR-002**: El juego MUST detectar la falta de soporte de aceleración 3D y mostrar un mensaje
  claro con el requisito, sin excepción silenciosa.
- **FR-003**: El juego MUST detectar el fallo de inicialización del módulo de físicas y mostrar un
  mensaje claro con una acción (reintentar o instrucción).
- **FR-004**: El juego MUST manejar el fallo de carga de cualquier asset (textura, malla, audio) sin
  romper el arranque: o continúa con una reserva visible y jugable, o informa del fallo con una
  acción.
- **FR-005**: El recorrido de extremo a extremo (título, jugar, resultado, rejugar o cambiar de
  circuito) MUST completarse sin la consola del navegador ni parámetros de desarrollo.

**Peso de assets y rendimiento (P2)**

- **FR-006**: Cada asset (textura, malla, audio) MUST tener un presupuesto de peso declarado por
  categoría, y cada malla un techo de triángulos por categoría.
- **FR-007**: El conjunto de la entrega MUST tener un presupuesto de peso total para la primera
  jugada.
- **FR-008**: Los presupuestos MUST vivir en un único lugar declarativo y centralizado (Principio
  V), no dispersos por el código.
- **FR-009**: El proceso de construcción MUST verificar de forma automática el cumplimiento de los
  presupuestos y FALLAR cuando un asset o el peso total los superan (límite duro, no solo aviso).
- **FR-010**: La entrega de producción MUST NOT incluir assets que el juego no carga en tiempo de
  ejecución (sin peso muerto en la salida del build). Este requisito es sobre lo que se publica, no
  obliga a borrar ficheros del árbol de trabajo.
- **FR-011**: El juego MUST sostener el objetivo de fluidez (>= 60 FPS) en un navegador de escritorio
  típico con audio, interfaz, arte y obstáculos cargados a la vez, sin caer por debajo de un nivel
  jugable.
- **FR-012**: El juego MUST sostener >= 30 FPS estables en un móvil de gama media (suelo definido en
  la spec 004).
- **FR-013**: La verificación de determinismo e independencia de FPS (Principio II) MUST seguir en
  verde tras la optimización de assets y la pasada de rendimiento; ninguna optimización puede acoplar
  la física a la tasa de fotogramas.

**QA, pulido y distribución (P3)**

- **FR-014**: MUST existir una checklist de QA publicable y repetible que cubra consistencia visual,
  coherencia de la interfaz y ausencia de glitches, ejecutable en escritorio y móvil.
- **FR-015**: La capa de render MUST mantener las mallas y texturas optimizadas alineadas a los
  colliders primitivos, como vista pura, sin desalineación visible, geometría que asome ni parpadeo.
- **FR-016**: La entrega de producción MUST poder servirse como web estática autocontenida, sin
  servidor en ejecución ni backend propio.
- **FR-017**: El recorrido de extremo a extremo MUST verificarse sobre el build de producción, no
  solo en el entorno de desarrollo.
- **FR-018**: La entrega MUST incluir metadatos de publicación (título, icono e información para
  compartir en redes).
- **FR-019**: La entrega MUST incluir los créditos y las licencias de los assets de audio y arte, y
  las licencias comerciales MUST estar verificadas.
- **FR-020**: El juego MUST arrancar y ser plenamente jugable sin conexión a la fuente externa de
  baliza (degradación offline obligatoria).

### Key Entities *(include if feature involves data)*

- **Presupuesto de asset**: límite declarado para una categoría de asset. Atributos: categoría
  (textura de arte, skybox/señalética, malla de personaje, malla de obstáculo/prop, pista de audio),
  peso máximo, y para mallas un techo de triángulos. Vive centralizado.
- **Presupuesto total de entrega**: peso máximo de la descarga de la primera jugada (assets más el
  código de la aplicación).
- **Informe de presupuestos**: resultado de la verificación automática en construcción; por asset y
  total, con estado dentro/fuera de presupuesto.
- **Checklist de QA publicable**: lista repetible de comprobaciones de acabado (visual, interfaz,
  flujo de extremo a extremo) marcable en escritorio y móvil.
- **Catálogo de assets de la entrega**: conjunto de assets efectivamente referenciados y publicados,
  frente a los no referenciados que quedan fuera.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ante cada fallo esperable (sin aceleración 3D, sin módulo de físicas, asset que no
  descarga) el juego muestra un mensaje claro o una reserva jugable; en el 100% de esos casos no
  aparece una pantalla en blanco ni un error visible solo en consola.
- **SC-002**: La entrega de producción no contiene ningún asset no referenciado en tiempo de
  ejecución (0 MB de peso muerto publicado).
- **SC-003**: El peso total de descarga de la primera jugada es <= 20 MB (assets más el código de la
  aplicación; hoy, contando el peso muerto, supera con holgura ese número).
- **SC-004**: Ninguna textura de arte (obstáculos, props, personaje) supera 1024x1024 de resolución
  ni 512 KB de peso (hoy son 2048x2048 de ~5 MB).
- **SC-005**: Ninguna malla supera su techo de triángulos por categoría: personaje <= 15k, cada
  obstáculo o prop <= 12k (exige reducir el péndulo, hoy ~20k); el total de escena visible se
  mantiene <= 120k.
- **SC-006**: El proceso de construcción FALLA automáticamente cuando un asset o el peso total
  superan su presupuesto, sin revisión manual (verificable forzando un asset por encima del límite).
- **SC-007**: El juego sostiene >= 60 FPS en un navegador de escritorio típico con todo cargado,
  durante un intento completo, sin caer por debajo de un nivel jugable.
- **SC-008**: El juego sostiene >= 30 FPS estables en un móvil de gama media (suelo definido en la
  spec 004) durante un intento completo; en escritorio se mantiene >= 60 FPS.
- **SC-009**: La verificación automática de determinismo e independencia de FPS sigue en verde tras
  la optimización: para una misma secuencia de inputs, el tiempo final y la trayectoria no cambian
  entre ~30 y ~144 FPS.
- **SC-010**: Una persona ajena completa el recorrido de extremo a extremo sobre el build de
  producción servido como web estática, sin consola ni parámetros de desarrollo, también sin
  conexión a la fuente de baliza.
- **SC-011**: La entrega incluye metadatos de publicación y los créditos y licencias de todos los
  assets de audio y arte, con las licencias comerciales verificadas.

## Assumptions

- Los presupuestos numéricos (peso total <= 20 MB, texturas <= 1024x1024 y 512 KB, triángulos
  personaje <= 15k y obstáculo/prop <= 12k, total de escena <= 120k) quedaron fijados en clarify
  (2026-06-27) y se centralizan en el manifest de presupuestos.
- El suelo de fluidez móvil es >= 30 FPS estables en gama media, ya cuantificado en la spec 004; en
  escritorio se mantiene >= 60 FPS.
- Superar cualquier presupuesto (por asset o total) hace FALLAR la construcción (límite duro, fijado
  en clarify 2026-06-27).
- Las `*_base_color.png` sueltas y otros subproductos del pipeline de assets son la fuente plausible
  de las texturas embebidas en las mallas; el requisito es que no se publiquen en la entrega, no
  borrarlas del árbol de trabajo.
- El objetivo de distribución es web (escritorio y móvil web), servida como ficheros estáticos en una
  plataforma tipo GitHub Pages o itch.io.
- La PWA instalable ya entregada en la spec 004 se mantiene; esta iteración no la amplía ni la
  retira.

## Dependencies

- Specs 001-007 ya integradas: control, obstáculos y arte, feel, entrada/móvil/PWA, audio, circuito
  diario con baliza y mejor marca, y shell de juego con preferencias persistidas.
- Constitución v2.2.0: Principio II (determinismo, no negociable), Principio V (ajuste centralizado),
  Principio VI (acabado publicable) y la restricción de distribución (web estática sin backend
  propio) y de rendimiento (>= 60 FPS con todo cargado; suelo móvil propio).
- Suelo de fluidez móvil definido en la spec 004 (entrada y accesibilidad).

## Out of Scope

- Más circuitos y progresión básica: es la spec 009-content, otro eje; se apoya en este corte pero no
  entra aquí.
- Elegir el toolchain concreto de optimización y compresión (formatos de textura comprimida,
  compresión de geometría, herramientas de procesado): el qué (presupuestos y verificación) es de la
  spec; el cómo se decide en `/speckit-plan`.
- Rediseño o regeneración de arte desde cero: esta iteración optimiza los assets existentes, no los
  reemplaza.
- Analítica o telemetría (implicaría servidor) y CDN propio.
- Higiene de exposición del repositorio (rotación de claves, repo privado, reescritura de historial,
  sacar documentos internos del repo): es seguridad de operaciones en otro eje; ver
  `auditoria-exposicion-publica.md` como track aparte. La única pieza solapada que sí entra aquí es
  "el build no publica assets no referenciados" (FR-010).
- Distribución en tiendas de aplicaciones nativas.
