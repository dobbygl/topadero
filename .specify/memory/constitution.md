<!--
SYNC IMPACT REPORT
==================
Version change: 2.1.0 -> 2.2.0
Ratification: 2026-06-24 (sin cambios)
Amendment date: 2026-06-25
Bump rationale: MINOR. Amplía materialmente una guía del Principio III (Alcance de producto) y de la
sección "Restricciones técnicas y de plataforma": se permite UNA lectura de red SALIENTE y de SOLO
LECTURA a una fuente pública (baliza/aleatoriedad), fuera del paso fijo, como adaptador puro, con
degradación offline OBLIGATORIA. Desbloquea la spec 006 (circuito diario procedural anclado al hash
de un bloque de Bitcoin). NO redefine ni elimina ningún principio: los seis (I-VI) quedan intactos.
Sigue siendo un jugador, en local, web estática SIN BACKEND PROPIO; el determinismo, la frontera
headless, la colisión sobre primitivas y la persistencia estrictamente local se mantienen sin cambios.

Principios: I-VI CONSERVADOS sin cambios de texto. El Principio III conserva su redacción y solo
amplía sus listas de alcance: añade la lectura de solo lectura como permitida con guardarraíl y afina
"fuera de alcance" para distinguir la red ENTRE JUGADORES / backend propio de una lectura pública que
no envía datos.

Secciones modificadas:
  - Principio III (Alcance de producto): nuevo ítem "en alcance" (lectura de red de solo lectura a
    fuente pública, con degradación offline) + guardarraíl duro (adaptador puro fuera del paso fijo,
    src/sim no lo importa, sin envío de datos) + afinado de la lista "fuera de alcance".
  - Restricciones técnicas y de plataforma: "Plataforma" pasa de "Sin backend y sin red" a "Sin
    backend propio; se permite una lectura de red de SOLO LECTURA a fuente pública con degradación
    offline". Nuevo bullet "Red de solo lectura (v2.2.0)". "Distribución" aclara que el build no
    requiere backend y que el juego arranca y es jugable sin red.
  - Governance (Cambios de alcance): afinada la lista de lo que exige enmienda.

Secciones añadidas/eliminadas: ninguna (solo ampliación de guías existentes).

Estado de plantillas y documentos dependientes:
  ✅ .specify/templates/plan-template.md  (Constitution Check genérico que apunta a este archivo; sin cambios)
  ✅ .specify/templates/spec-template.md  (genérica; sin cambios)
  ✅ .specify/templates/tasks-template.md (sin cambios)
  ✅ .specify/templates/checklist-template.md (genérica; sin cambios)
  ⚠ CLAUDE.md (raíz) — OPCIONAL: mencionar la lectura de baliza de solo lectura al aterrizar la spec 006.
  ⚠ README.md — PENDIENTE: reencuadre prototipo -> juego al cerrar el corte mínimo publicable.

Follow-up TODOs:
  - La spec 006 fija proveedor(es) de baliza, derivación criptográfica y regla de selección de bloque.
  - Actualizar CLAUDE.md y README.md al cerrar el corte mínimo publicable.
-->

# Constitución de Topadero

Topadero nació como prototipo (MVP) para validar una hipótesis: que controlar un personaje
cápsula sobre un motor de físicas resulta divertido y responde bien. Esa hipótesis se da por
validada con el MVP jugable (specs 001-002) y se está afinando con la pasada de sensación de
control (spec 003). A partir de la versión 2.0.0 el objetivo cambia: convertir ese prototipo en
un **juego completo y publicable** en navegador, para un jugador en local, construido sobre el
control ya validado.

Esta constitución protege lo que hizo bueno el prototipo (un control que se siente bien, físicas
deterministas y una frontera limpia entre simulación y render) mientras abre el alcance a lo que
hace falta para publicar: audio, un shell de juego, persistencia local de la marca, más circuitos
y una progresión básica. El corte mínimo publicable es audio más shell mínimo más persistencia
local de la mejor marca, encima del feel encaminado en las specs 003-007. Las reglas de abajo son
no negociables: fijan lo que no cambia aunque el alcance crezca.

## Core Principles

### I. La sensación de juego manda

El control del personaje es el cimiento del juego; todo lo demás existe para servirlo. Ninguna
funcionalidad nueva (audio, menús, contenido, progresión, persistencia) DEBE degradar la respuesta
o la sensación del control validado en la User Story 1 de la spec 001, aunque sea "técnicamente
correcta": eso cuenta como regresión y bloquea la entrega.

Para que esto sea verificable y no una opinión, la puerta de aceptación de cada historia es la
prueba manual contra sus *Acceptance Scenarios* y los *Success Criteria* de la spec, no la mera
ausencia de errores de compilación. En concreto, una entrega que toque el control DEBE cumplir
como mínimo: la cámara sigue al personaje sin saltos bruscos, el personaje no atraviesa la
geometría y desliza de forma continua al rozar paredes y rampas (US1), el salto solo ocurre con el
personaje apoyado y nunca en el aire (SC-002), y el juego se ejecuta de forma fluida (objetivo
SC-008: >= 60 FPS, sin caídas por debajo de un nivel jugable).

**Razón**: aunque el proyecto pase de prototipo a producto, lo que de verdad vende el juego es que
el control se siente bien. Medir contra escenarios concretos convierte "se siente bien" en algo que
se puede aprobar o rechazar, y evita que el contenido y el lustre tapen una regresión de feel.

### II. Física determinista e independiente de la tasa de refresco (NO NEGOCIABLE)

La simulación física DEBE correr con un paso de tiempo fijo, desacoplado de la tasa de render. El
mismo input DEBE producir la misma trayectoria (misma distancia y arco de salto, misma velocidad de
avance) con independencia de los FPS; la diferencia de comportamiento entre ~30 FPS y ~144 FPS DEBE
ser imperceptible para el jugador (FR-013, SC-004). La lógica de movimiento y físicas NO DEBE
escalar por el delta de fotograma crudo de forma que altere la trayectoria según los FPS.

El audio, la interfaz/shell de juego y la persistencia local corren FUERA del paso fijo y NO DEBEN
introducir no-determinismo: son adaptadores y vistas que reaccionan al estado de la simulación, no
fuentes que alteren la trayectoria. No se persiste ni se reproduce estado de simulación de forma
que cambie las trayectorias entre ejecuciones.

Esta invariante DEBE verificarse de forma automática. El mecanismo concreto (test de determinismo,
simulación a pasos forzados, etc.) lo decide el plan; lo que esta constitución exige es que la
verificación exista y se ejecute, no que sea manual.

**Razón**: es la única propiedad de corrección a la vez esencial para el juego y objetivamente
comprobable; dejarla a la inspección visual la convierte en una promesa rota en silencio. Crecer en
alcance (audio, UI, guardado) no puede comprarse a costa de esta garantía.

### III. Alcance de producto y disciplina de acabado

El trabajo DEBE respetar el alcance declarado en la spec acordada. El alcance del proyecto es ahora
un **juego publicable** en navegador para un jugador en local. Crecer no significa renunciar a la
disciplina: dentro de este alcance sigue vigente YAGNI (no se añade infraestructura "por si acaso").

**En alcance a partir de v2.0.0** (antes vetado en el prototipo, ahora permitido con
guardarraíles):

- **Audio**: música y efectos de sonido.
- **Shell de juego**: pantalla de título, pausa, pantalla de victoria/derrota y ajustes.
- **Persistencia local**: mejor marca y preferencias, mediante el almacenamiento del navegador.
- **Más circuitos** y una **progresión básica** (por ejemplo selección o desbloqueo de circuitos y
  mejores tiempos por circuito).
- **Lectura de red de solo lectura (v2.2.0)**: el juego PUEDE leer una fuente pública externa de
  aleatoriedad/baliza (por ejemplo el hash de un bloque de Bitcoin) como entrada de construcción de
  escena, fuera del paso fijo. Es de SOLO LECTURA: no hay backend propio, ni cuenta, ni envío de datos
  o marcas, ni telemetría. La lectura DEBE degradar con elegancia (el juego sigue plenamente jugable
  sin red, Principio VI) y su resultado PUEDE cachearse en el almacenamiento local del navegador.

**Sigue fuera de alcance** (requiere enmienda antes de implementar):

- Multijugador o red ENTRE JUGADORES (P2P o coordinada por servidor).
- Backend propio, cuenta de usuario, ranking online, envío de marcas o telemetría a servidor; la
  persistencia es estrictamente local. (La lectura de SOLO LECTURA a una fuente pública de v2.2.0 NO es
  un backend propio ni envía datos, por eso queda permitida.)
- Colisión basada en mallas (collmesh): la colisión sigue resolviéndose sobre primitivas.

**Guardarraíles duros (no negociables, se mantienen de v1.x):**

- La GEOMETRÍA DE SIMULACIÓN Y COLISIÓN se construye ÚNICAMENTE con primitivas (cápsulas, cajas,
  cilindros) y el personaje usa un collider cápsula con controlador de personaje cinemático. La
  colisión por mallas sigue fuera de alcance.
- **Frontera headless**: la simulación (`src/sim/`) NO importa la capa de render, ni audio, ni
  interfaz/shell, ni persistencia, ni carga assets. El audio, la UI, el shell y el guardado son
  adaptadores y vistas puras que leen el estado de la simulación; no contienen lógica de juego que
  altere la física.
- **Arte y animación en render (excepción v1.1.0 + v1.2.0, ahora alcance normal)**: se permite
  vestir el juego con mallas 3D low-poly y texturas/imágenes 2D, y reproducir animación esqueletal
  del personaje, SOLO en `src/render` como vista pura, alineado al collider, interpolado y conducido
  por el TIEMPO DE RENDER (`AnimationMixer`), NUNCA como geometría de colisión ni afectando a la
  posición/rumbo (los determina el KCC) ni a la verificación de determinismo.
- **Persistencia local**: solo almacenamiento del navegador (localStorage/IndexedDB), sin datos
  personales, degradando con elegancia si no está disponible, y sin tocar el paso fijo ni el
  determinismo.
- **Red de solo lectura (v2.2.0)**: si una funcionalidad lee una fuente pública externa de baliza/
  aleatoriedad, lo hace como adaptador/vista PURA fuera del paso fijo; `src/sim/` NO la importa. NO introduce no-determinismo
  (Principio II) y DEBE tener degradación offline (Principio VI): sin red, el juego arranca y es
  jugable. Solo lectura: sin backend propio, sin envío de datos ni telemetría.
- Los valores de ajuste asociados siguen centralizados en `config.ts` (Principio V).

Cualquier trabajo fuera de este alcance DEBE bloquearse hasta enmendar antes la spec y, si toca un
principio, esta constitución. No se añade infraestructura no pedida (ni red, ni motores de UI
pesados, ni sistemas de guardado complejos): se prefiere lo más simple que pase la prueba de juego.

**Razón**: el pivote a producto abre justo lo que separaba el prototipo de un juego que alguien
puede instalarse delante y completar (audio, shell, guardado, contenido). Pero la frontera headless,
la colisión sobre primitivas y la centralización del ajuste son lo que mantiene el determinismo y la
iteración de feel baratos; por eso se conservan como reglas duras aunque el alcance crezca.

### IV. Rebanadas verticales jugables

La construcción DEBE seguir el orden de prioridad de las historias de cada spec; cada historia DEBE
ser jugable y testable de forma independiente y entregar valor por sí sola. No DEBE iniciarse una
historia de menor prioridad antes de validar la superior contra sus *Acceptance Scenarios*. Cada
checkpoint es un punto de PARAR y validar.

Esta disciplina nació con las historias P1 -> P2 -> P3 de la spec 001 (control, luego circuito con
meta y cronómetro, luego caída/respawn y reinicio) y se mantiene para toda spec posterior: primero
lo que sostiene la experiencia, encima lo que la enriquece.

**Razón**: valida la base antes de apoyar nada encima y mantiene cada entrega jugable, lo que en un
juego en evolución evita acumular trabajo a medias que no se puede probar.

### V. Comportamiento sobre cifras: simplicidad y ajuste fácil

La spec fija el comportamiento cualitativo, no las cifras. Los valores de ajuste (velocidad de
movimiento, altura de salto, umbral de caída, retardo de respawn, suavizado de cámara, volúmenes de
audio, etc.) DEBEN vivir como parámetros con nombre y reunidos en un solo lugar (`config.ts`), no
como números mágicos dispersos por el código. Iterar sobre la sensación significa cambiar esas
cifras a menudo: tienen que ser triviales de encontrar y modificar.

Se DEBE preferir el enfoque más simple que pase la prueba de juego; se DEBE evitar la abstracción
prematura. La estabilidad de colisiones es un suelo de corrección duro: sin atravesar geometría
(tunneling) y con deslizamiento razonable, incluso cuando un obstáculo en movimiento empuja al
personaje contra una pared.

**Razón**: un juego de "feel" se afina cambiando números constantemente; centralizarlos y mantener
el código simple es lo que hace rápida esa iteración, también para las nuevas perillas de audio y
ajustes.

### VI. Acabado de producto publicable

Un juego publicable se TERMINA, no se simula. El producto DEBE ser jugable de extremo a extremo sin
tocar la consola del navegador ni parámetros de URL de desarrollo: arrancar en una pantalla de
título, jugar, ver el resultado (victoria y tiempo), y volver a jugar o cambiar de circuito desde la
propia interfaz.

- DEBE tener audio, al menos efectos de las acciones núcleo (salto, aterrizaje, golpe/empuje del
  obstáculo y meta), con un control de volumen o silencio accesible.
- DEBE recordar localmente la mejor marca y las preferencias entre sesiones, y degradar con
  elegancia si el almacenamiento no está disponible (el juego sigue siendo jugable sin guardado).
- DEBE manejar los fallos esperables sin pantalla en blanco: WebGL o WASM no disponibles, carga de
  assets fallida, con un mensaje claro en lugar de una excepción silenciosa.
- Las URLs o teclas de depuración (debug de físicas, cámaras de inspección, flags `?...`) PUEDEN
  existir, pero el juego NO DEBE depender de ellas para completarse ni dejarlas accesibles como única
  salida.

Estos requisitos son la puerta de "publicable": una entrega no se considera publicable mientras
dependa de la consola, de flags de dev o deje al jugador sin salida.

**Razón**: el prototipo se evaluaba por feel; el producto se evalúa además por si una persona ajena
puede ponerse delante, entender qué hacer y completar un intento sin ayuda. Sin shell, audio y
guardado, el juego sigue leyéndose como demo técnica por bueno que sea el control.

## Restricciones técnicas y de plataforma

- **Plataforma (ampliada en v2.1.0)**: navegador de escritorio y móvil, un solo jugador, en local.
  Sin backend propio. Se permite UNA lectura de red saliente y de SOLO LECTURA a una fuente pública
  (baliza/aleatoriedad), fuera del paso fijo, como adaptador puro; el juego DEBE seguir plenamente
  jugable sin red (degradación offline obligatoria, Principio VI). SÍ se permite persistencia LOCAL
  mediante el almacenamiento del navegador
  (mejor marca, preferencias). En móvil se admiten controles táctiles (joystick virtual para mover,
  botón de salto en pantalla, gesto de arrastre para la cámara); como cualquier otra entrada, sus
  flancos (p. ej. el toque del botón de salto) y los ejes del joystick virtual se traducen en
  `src/input` y se consumen DENTRO del paso fijo, igual que teclado y mando, sin romper el
  determinismo (Principio II). El destino sigue siendo la web (ahora también web móvil); las apps
  nativas en tiendas quedan fuera de alcance.
- **Construcción de escena**: la geometría de simulación y colisión usa solo primitivas (cápsulas,
  cajas, cilindros). Personaje con collider cápsula y controlador de personaje cinemático. La capa de
  render PUEDE vestir la escena con mallas low-poly, texturas decorativas y animación esqueletal del
  personaje (Principio III): son vista pura alineada a los colliders, nunca geometría de colisión.
- **Audio (v2.0.0)**: permitido (música y efectos). Se reproduce fuera del paso fijo y no introduce
  no-determinismo (Principio II).
- **Red de solo lectura (v2.2.0)**: permitida UNA lectura saliente a una fuente pública (baliza/
  aleatoriedad, p. ej. el hash de un bloque de Bitcoin vía API pública), como adaptador puro fuera del
  paso fijo. Es de SOLO LECTURA: sin backend propio, sin cuenta, sin envío de marcas ni telemetría.
  `src/sim/` no la importa; no introduce no-determinismo (Principio II). Degradación offline
  OBLIGATORIA: sin red el juego arranca y es plenamente jugable (Principio VI), y el resultado PUEDE
  cachearse en local.
- **Físicas**: paso de tiempo fijo y desacoplado del render (ver Principio II).
- **Rendimiento**: objetivo >= 60 FPS en un navegador de escritorio típico, sin caer por debajo de
  un nivel jugable (SC-008), con el audio, la interfaz y el arte decorativo cargados. En navegador
  móvil el objetivo PUEDE relajarse a un suelo de FPS propio (a concretar en la spec 004) si el
  hardware lo exige, pero el determinismo y el paso fijo NO cambian. El arte es low-poly y de peso
  acotado a propósito; su carga no debe degradar este objetivo ni el paso fijo.
- **Recuperación**: tras caer por debajo del umbral, el jugador recupera el control en una posición
  jugable en pocos segundos (objetivo <= 3 s, SC-005), sin recargar la página.
- **Distribución (v2.0.0)**: el juego DEBE poder publicarse como web estática autocontenida (por
  ejemplo GitHub Pages o itch.io), accesible también desde navegador móvil, sin servidor en
  ejecución. El build de producción no DEBE requerir un backend propio. Una funcionalidad PUEDE leer
  una fuente pública externa de baliza/aleatoriedad (v2.2.0), pero el juego DEBE arrancar y ser jugable
  sin red (degradación offline); la red enriquece, no es requisito para ejecutarse.
- **Stack concreto**: el motor de render y la biblioteca de físicas se eligen en el plan
  (`/speckit-plan`). La elección DEBE ser ejecutable en navegador y respetar estas restricciones;
  esta constitución no fija librerías concretas.

## Flujo de desarrollo y puertas de calidad

- **Orientado a la spec**: el flujo es spec -> (clarify) -> plan -> tasks -> implement. Todo
  `[NEEDS CLARIFICATION]` que afecte a un comportamiento DEBE resolverse antes de implementar ese
  comportamiento.
- **Puerta principal (manual)**: prueba de juego de la historia entregada contra sus *Acceptance
  Scenarios* y los *Success Criteria* aplicables.
- **Puerta automática (mínima)**: verificación de determinismo e independencia de FPS de las físicas
  (Principio II). Más allá de eso, los tests automáticos son OPCIONALES y se añaden donde compensen;
  no se exigen por cada funcionalidad.
- **Estabilidad de colisiones**: antes de dar por terminada una historia con circuito, se DEBE
  comprobar la ausencia de tunneling y el deslizamiento estable.
- **Frontera render/simulación**: cuando una historia añada arte, audio, interfaz/shell o
  persistencia, se DEBE comprobar que `src/sim/` no importa esas capas ni carga assets, y que las
  vistas siguen la pose interpolada alineadas a sus colliders primitivos sin desincronización
  perceptible.
- **Puerta de publicable (v2.0.0)**: antes de dar por publicable una entrega, se DEBE comprobar el
  flujo de extremo a extremo sin consola ni flags de dev (Principio VI): título, jugar, resultado y
  rejugar/cambiar de circuito desde la interfaz, con audio y persistencia local activos.
- **Cadencia**: cada tarea se valida en su checkpoint antes de avanzar; se hace commit tras cada
  grupo lógico de cambios.

## Governance

Esta constitución prevalece sobre las prácticas ad hoc durante el desarrollo del juego.

- **Enmiendas**: se documentan en este archivo, se versionan según la política de abajo y se
  propagan a las plantillas dependientes (plan, spec, tasks) y a cualquier guía de ejecución que
  exista en su momento.
- **Política de versionado (SemVer)**: MAJOR cuando se elimina o redefine de forma incompatible un
  principio o una regla de gobernanza (como el pivote de prototipo a producto de v2.0.0); MINOR
  cuando se añade un principio o sección, o se amplía materialmente una guía; PATCH para
  aclaraciones, redacción y arreglos no semánticos.
- **Cumplimiento**: el *Constitution Check* de cada plan DEBE confirmar que el trabajo respeta estos
  principios. Las violaciones se justifican en *Complexity Tracking* con una alternativa más simple
  razonada, o el trabajo se rechaza.
- **Cambios de alcance**: cualquier cosa listada como fuera de alcance (multijugador o red entre
  jugadores, backend propio o persistencia en servidor, ranking o envío de marcas online, collmesh)
  requiere enmendar primero la spec, y esta constitución si toca un principio, antes de implementarse.
  La lectura de red de SOLO LECTURA a fuente pública con degradación offline quedó permitida en v2.2.0.

**Version**: 2.2.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-25
