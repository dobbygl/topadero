# Feature Specification: Shell de juego (título, pausa, resultados y ajustes)

**Feature Branch**: `007-game-shell`
**Created**: 2026-06-26
**Status**: Draft
**Input**: User description: "Shell jugable de extremo a extremo (título, pausa, resultados/victoria y ajustes) que envuelve el circuito diario, en alcance tras la enmienda v2.0.0 y exigido por el Principio VI."

## User Scenarios & Testing *(mandatory)*

Topadero hoy arranca directo al circuito del día: una persona que abre la página cae dentro del
juego sin saber qué hacer, reinicia con una tecla (R) y no tiene forma de pausar ni de ver su
resultado de forma clara. Esta funcionalidad da al juego la envoltura que el Principio VI considera
la puerta de "publicable": arrancar en un título, jugar, ver el resultado y volver a jugar o
ajustar el juego, todo desde la propia interfaz, sin consola ni flags de desarrollo, y usable con
toque en móvil tanto como con ratón, teclado o mando.

Cada historia es una rebanada vertical jugable y verificable por separado; juntas, las tres P1
completan el flujo de extremo a extremo.

### User Story 1 - Arrancar y empezar a jugar desde un título (Priority: P1)

Una persona abre el juego y lo primero que ve es una pantalla de título con el nombre del juego,
una acción clara para empezar a jugar e indicaciones básicas de control. Al elegir "Jugar" entra
al circuito del día y empieza el intento.

**Why this priority**: Es la entrada del juego. Sin un título que explique qué hacer y desde el que
arrancar, el producto se lee como demo técnica y no cumple el Principio VI. Además, el gesto de
"Jugar" es lo que desbloquea el audio bajo la política de autoplay del navegador, sustituyendo al
overlay técnico actual.

**Independent Test**: Abrir la página recién cargada: aparece el título sin que el personaje se
mueva; al activar "Jugar" comienza el intento (el cronómetro corre) y suena el audio. Verificable
sin tocar consola ni teclas de desarrollo, en escritorio y en móvil (toque).

**Acceptance Scenarios**:

1. **Given** la página recién cargada, **When** termina la inicialización, **Then** se muestra la
   pantalla de título con la acción "Jugar" e indicaciones de control, y la simulación NO avanza
   (el cronómetro está a cero y el personaje quieto).
2. **Given** la pantalla de título, **When** la persona activa "Jugar" (toque, clic, tecla o
   botón de mando), **Then** entra al circuito del día, el cronómetro empieza a contar y el audio
   queda desbloqueado.
3. **Given** un dispositivo táctil en retrato o apaisado, **When** se muestra el título, **Then**
   los controles caben en pantalla con objetivos táctiles cómodos y la acción "Jugar" es accesible
   sin desplazamiento.

---

### User Story 2 - Ver el resultado y volver a jugar (Priority: P1)

Al cruzar la meta, la persona ve una pantalla de resultados con el tiempo de su intento y la mejor
marca del día (si existe), con la opción de volver a jugar el mismo circuito o regresar al título.
Si bate su mejor marca, se reconoce.

**Why this priority**: Cerrar el bucle (jugar → resultado → rejugar) es el corazón del Principio VI.
Sin una pantalla de resultados, el tiempo del intento no significa nada para el jugador y no hay
salida clara tras ganar salvo una tecla.

**Independent Test**: Completar un intento hasta la meta: aparece la pantalla de resultados con el
tiempo del intento; "Volver a jugar" reinicia un intento limpio; "Volver al título" regresa al
título. Verificable sin consola ni teclas de desarrollo.

**Acceptance Scenarios**:

1. **Given** un intento en curso, **When** el personaje cruza la meta, **Then** se muestra la
   pantalla de resultados con el tiempo del intento y, si está disponible, la mejor marca del día.
2. **Given** la pantalla de resultados, **When** la persona elige "Volver a jugar", **Then**
   comienza un intento nuevo desde el inicio con el cronómetro a cero.
3. **Given** la pantalla de resultados, **When** la persona elige "Volver al título", **Then**
   regresa a la pantalla de título.
4. **Given** un intento cuyo tiempo mejora la mejor marca del día, **When** se muestra el
   resultado, **Then** se reconoce que es una nueva mejor marca (señal visual y sonora).
5. **Given** que el almacenamiento local no está disponible, **When** se muestra el resultado,
   **Then** se ve el tiempo del intento aunque no haya mejor marca persistida (el juego no falla).

---

### User Story 3 - Pausar, reanudar, reiniciar y salir al título (Priority: P1)

Durante el juego, la persona puede pausar. En pausa, el juego se congela y aparecen las opciones de
reanudar, reiniciar el intento y volver al título. Reanudar continúa exactamente donde estaba, sin
acciones colgadas.

**Why this priority**: Pausar es un mínimo de cualquier juego publicable y es la salida segura
mientras se juega. Es también el punto donde el Principio II (determinismo) se pone a prueba: la
pausa no puede acumular tiempo ni disparar un salto colgado al reanudar.

**Independent Test**: Pausar a mitad de intento: el personaje y el cronómetro se detienen; reanudar
continúa sin saltos espurios; reiniciar arranca un intento limpio; volver al título regresa al
título. El resultado de un intento jugado con una pausa intermedia coincide con el de jugarlo sin
pausa para los mismos inputs.

**Acceptance Scenarios**:

1. **Given** un intento en curso, **When** la persona pausa, **Then** la simulación se congela (el
   personaje no se mueve y el cronómetro del intento no avanza) y aparecen reanudar, reiniciar y
   volver al título.
2. **Given** el juego en pausa, **When** la persona reanuda, **Then** el juego continúa desde el
   mismo estado sin un salto u otra acción colgada por el tiempo en pausa.
3. **Given** el juego en pausa, **When** la persona reinicia el intento, **Then** comienza un
   intento nuevo desde el inicio con el cronómetro a cero.
4. **Given** el juego en pausa, **When** la persona vuelve al título, **Then** se muestra el título
   y el intento en curso se descarta.
5. **Given** la ventana o pestaña pierde el foco durante el juego, **When** ocurre, **Then** el
   juego se pausa automáticamente en lugar de seguir corriendo sin la persona.

---

### User Story 4 - Ajustar el juego desde la interfaz (Priority: P2)

Desde el título y desde la pausa, la persona abre un panel de ajustes para cambiar el volumen de
música y de efectos, la sensibilidad y la reasignación de la entrada, y un interruptor del modo de
depuración de físicas (apagado por defecto). Los cambios se aplican en caliente.

**Why this priority**: El Principio VI exige un control de volumen accesible y que las preferencias
se puedan cambiar sin la consola. Apoya la siguiente iteración (persistencia de preferencias), pero
no bloquea el flujo de extremo a extremo, por eso va después de las P1.

**Independent Test**: Abrir ajustes desde el título y desde la pausa; bajar el volumen y oír el
cambio de inmediato; cambiar la sensibilidad y notarla al jugar; activar el debug de físicas y
verlo aplicarse. Verificable sin consola ni teclas de desarrollo.

**Acceptance Scenarios**:

1. **Given** la pantalla de título, **When** la persona abre ajustes, **Then** ve y puede cambiar
   volumen de música, volumen de efectos, sensibilidad de entrada, reasignación de entrada y el
   interruptor del debug de físicas.
2. **Given** el panel de ajustes abierto, **When** la persona cambia el volumen de música o de
   efectos, **Then** el cambio se aplica de inmediato (en caliente) sin reiniciar.
3. **Given** el panel de ajustes abierto desde la pausa, **When** la persona cambia la
   sensibilidad y reanuda, **Then** el juego usa el nuevo valor sin perder el estado del intento.
4. **Given** el interruptor de debug de físicas apagado por defecto, **When** la persona no lo
   toca, **Then** el juego se presenta sin overlay de depuración.

---

### User Story 5 - Navegación pulida y ayuda de controles (Priority: P3)

Las pantallas se encadenan con transiciones suaves; toda la interfaz se puede recorrer con teclado
y con mando además de ratón y toque, con un foco visible; y el título muestra una ayuda de controles
clara.

**Why this priority**: Pulido que eleva la sensación de producto y la accesibilidad, pero el juego
ya es completable sin ello. Va al final.

**Independent Test**: Recorrer título, pausa, resultados y ajustes solo con teclado y solo con
mando, con un foco visible en cada paso; leer la ayuda de controles en el título; ver transiciones
sin saltos bruscos.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla del shell, **When** la persona navega solo con teclado o solo con
   mando, **Then** puede alcanzar y activar todas las opciones con un indicador de foco visible.
2. **Given** un cambio de pantalla (p. ej. título → juego o juego → resultados), **When** ocurre,
   **Then** la transición es suave y no hay un salto brusco ni un parpadeo.
3. **Given** la pantalla de título, **When** la persona la observa, **Then** encuentra una ayuda de
   controles clara para teclado, mando y toque.

---

### Edge Cases

- **Pausa durante un salto**: al reanudar no se ejecuta un salto colgado por el tiempo en pausa
  (coherente con el caso de pérdida de foco de la spec 003).
- **Pérdida de foco**: si la ventana o pestaña se oculta durante el juego, se auto-pausa; al volver,
  la persona reanuda explícitamente (no se reanuda sola sin gesto).
- **Cambio de día (UTC) mientras el shell está abierto**: al volver al título, el shell re-resuelve
  el día y, si cambió, carga el circuito del día nuevo para el siguiente intento (con la degradación
  offline de la baliza, feature 006); "volver a jugar" repite el mismo circuito recién jugado aunque
  el día ya haya cambiado, sin recargar el mundo a mitad de acción (FR-024a).
- **Circuito diario en modo offline degradado**: el shell funciona igual (título, pausa, resultados,
  ajustes) sobre el circuito de respaldo; ninguna pantalla queda en blanco.
- **Sin almacenamiento local** (incógnito, cuota, permisos): el flujo completo sigue funcionando; la
  pantalla de resultados muestra el tiempo del intento aunque no haya mejor marca ni preferencias
  guardadas.
- **Volúmenes a cero**: el juego sigue plenamente jugable en silencio.
- **Ganar y volver al título**: al rejugar tras una victoria, el cronómetro y el estado se reinician
  limpiamente y un nuevo récord se vuelve a poder detectar.
- **Entrada mixta**: cambiar de toque a teclado o a mando a mitad de sesión no rompe la navegación de
  la interfaz.

## Clarifications

### Session 2026-06-26

- Q: ¿Persiste el shell los ajustes editados en el panel (sobre todo los volúmenes) en esta
  iteración, o se aplica solo en caliente y la persistencia se deja a la spec siguiente? → A: El
  shell persiste TODAS las preferencias de jugador entre sesiones (volúmenes incluidos) reusando el
  almacenamiento local existente; la spec de persistencia futura se centra en mejor marca por
  circuito y versionado de esquema.
- Q: La auto-pausa al perder el foco (FR-009), ¿es MUST con menú de pausa, solo congelar sin menú, o
  fuera de alcance en 007? → A: MUST de P1: al perder el foco se auto-pausa y se muestra la pantalla
  de pausa; reanudar requiere un gesto explícito (FR-009 confirmado).
- Q: ¿Cómo pausa un jugador táctil durante el juego (botón en pantalla, gesto, control reusado)? → A:
  En móvil NO hay botón de pausa en pantalla; la pausa móvil ES la pérdida de foco (backgrounding o
  bloqueo de pantalla), que dispara la auto-pausa (FR-009), y la pantalla de pausa aparece al volver.
  En escritorio se mantiene además una pausa explícita por teclado.
- Q: Si se cruza la medianoche UTC con el shell abierto, ¿qué circuito se juega al rejugar o volver
  al título? → A: Al volver al título, el shell re-resuelve el día actual y, si cambió, carga el
  circuito del día nuevo para el siguiente intento. "Volver a jugar" y "reiniciar" repiten el mismo
  circuito recién jugado (sin re-resolver, sin recargar el mundo a mitad de acción).

## Requirements *(mandatory)*

### Functional Requirements

**Flujo de extremo a extremo (P1)**

- **FR-001**: El juego MUST arrancar en una pantalla de título, sin avanzar la simulación, mostrando
  el nombre del juego, una acción para empezar a jugar e indicaciones básicas de control.
- **FR-002**: La persona MUST poder iniciar un intento desde el título mediante toque, clic, teclado
  o mando, entrando al circuito del día.
- **FR-003**: El primer gesto de "Jugar" MUST desbloquear la reproducción de audio conforme a la
  política de autoplay del navegador (sustituyendo al overlay técnico de "click para jugar" actual).
- **FR-004**: Al cruzar la meta, el sistema MUST mostrar una pantalla de resultados con el tiempo del
  intento y, si está disponible, la mejor marca del día.
- **FR-005**: La pantalla de resultados MUST ofrecer "volver a jugar" (intento nuevo desde el inicio)
  y "volver al título".
- **FR-006**: Cuando un intento mejora la mejor marca del día, el sistema MUST reconocerlo con una
  señal visual y la señal sonora de nueva mejor marca.
- **FR-007**: La persona MUST poder pausar durante el juego; en pausa el sistema MUST ofrecer
  reanudar, reiniciar el intento y volver al título.
- **FR-007a**: La pausa se dispara así: en escritorio, mediante un control explícito de teclado
  (además de la auto-pausa por foco); en móvil, mediante la pérdida de foco (backgrounding/bloqueo),
  que dispara la auto-pausa de FR-009. NO hay un botón de pausa en pantalla en móvil; la pantalla de
  pausa (con reanudar, reiniciar y volver al título, y acceso a ajustes) se ve al recuperar el foco.
- **FR-008**: Reanudar MUST continuar el intento desde el mismo estado, sin ejecutar acciones de
  entrada colgadas (p. ej. un salto) acumuladas durante la pausa.
- **FR-009**: El sistema MUST auto-pausar el juego cuando la ventana o pestaña pierde el foco, y MUST
  requerir un gesto explícito para reanudar.
- **FR-010**: El flujo título → jugar → resultados → (rejugar | volver al título) → pausa MUST
  completarse íntegramente sin usar la consola del navegador ni parámetros de URL de desarrollo.
- **FR-011**: La interfaz MUST ser responsive y usable con toque, adaptándose a retrato y apaisado,
  con objetivos táctiles cómodos.

**Determinismo y frontera (no negociables)**

- **FR-012**: Mientras el juego está en pausa, el sistema MUST NOT acumular tiempo de simulación ni
  avanzar el cronómetro del intento.
- **FR-013**: El resultado (tiempo y trayectoria) de un intento jugado con una o varias pausas
  intermedias MUST coincidir con el del mismo intento sin pausas para la misma secuencia de inputs.
- **FR-014**: La capa de interfaz MUST limitarse a leer el estado de la simulación y a emitir
  intención (jugar, pausar, reanudar, reiniciar, volver al título, cambiar un ajuste); MUST NOT
  contener lógica que altere la física.

**Ajustes (P2)**

- **FR-015**: La persona MUST poder abrir un panel de ajustes tanto desde el título como desde la
  pausa.
- **FR-016**: El panel de ajustes MUST permitir cambiar el volumen de música y el de efectos por
  separado, con efecto inmediato (en caliente).
- **FR-017**: El panel de ajustes MUST permitir cambiar la sensibilidad de entrada y la reasignación
  de controles, reutilizando las capacidades existentes de la spec 004 sin reimplementarlas.
- **FR-018**: El panel de ajustes MUST exponer un interruptor del modo de depuración de físicas,
  apagado por defecto.
- **FR-019**: Los valores de ajuste con un valor por defecto (volúmenes, sensibilidad, defaults de la
  interfaz) MUST quedar centralizados como configuración, sin números mágicos dispersos.
- **FR-019a**: El shell MUST recordar entre sesiones las preferencias de jugador editadas en el
  panel (volúmenes de música y efectos, sensibilidad y mapeos de entrada), reusando el
  almacenamiento local ya existente; si el almacenamiento no está disponible, los ajustes funcionan
  en la sesión y el juego arranca con los defaults sin fallar (degradación con elegancia). El
  interruptor de depuración de físicas NO se persiste: arranca apagado en cada carga (FR-018).

**Pulido y entrada (P3)**

- **FR-020**: Toda la interfaz del shell MUST ser navegable y activable solo con teclado y solo con
  mando, además de con ratón y toque, con un indicador de foco visible.
- **FR-021**: Los cambios de pantalla MUST presentarse con transiciones suaves, sin saltos bruscos
  ni parpadeos.
- **FR-022**: La pantalla de título MUST incluir una ayuda de controles clara para teclado, mando y
  toque.

**Convivencia con depuración y degradación**

- **FR-023**: Las teclas y URLs de depuración (debug de físicas, cámaras de inspección, flags `?...`)
  MAY seguir existiendo, pero el juego MUST NOT depender de ellas para completarse ni dejarlas como
  única salida. En particular, el modo de captura de desarrollo (flag `?shot` y similares) MAY saltar
  el título y entrar directo al escenario para sacar pantallazos limpios sin overlay; esto es una
  ruta de desarrollo, no la ruta de jugador (que SIEMPRE pasa por el título, FR-001).
- **FR-024**: El shell MUST funcionar de extremo a extremo aunque la persistencia local o la lectura
  de red del circuito diario no estén disponibles (degradación con elegancia, sin pantalla en
  blanco).

**Circuito diario y entrada de juego**

- **FR-024a**: Al volver a la pantalla de título, el shell MUST re-resolver el día UTC actual; si
  difiere del día del circuito en sesión, MUST cargar el circuito del día nuevo (resolviendo su
  baliza con la degradación offline de la feature 006) de modo que el siguiente "Jugar" use el
  circuito de hoy. "Volver a jugar" (desde resultados) y "reiniciar el intento" (desde pausa) MUST
  repetir el circuito de la sesión sin re-resolver el día ni recargar el mundo a mitad de un intento.

**Hueco previsto (no implementar aquí)**

- **FR-025**: El punto de entrada "Jugar" MUST quedar diseñado de modo que una futura pantalla de
  selección de circuito (varios circuitos o archivo de días pasados) pueda anteponerse sin rehacer
  el flujo, SIN construir dicha selección en esta iteración. La re-resolución del circuito del día al
  volver al título (FR-024a) ya ejercita esta costura de "cargar un circuito en la entrada de juego",
  incluyendo reconstruir el mundo de simulación y su vestido para el nuevo circuito.

### Key Entities *(include if feature involves data)*

- **Pantalla activa del shell**: el estado de presentación en curso (título, jugando, pausa,
  resultados). Determina qué se muestra y qué intenciones se aceptan; gobierna las transiciones del
  flujo. No es estado de simulación.
- **Resultado del intento**: el desenlace mostrado al ganar (tiempo del intento, y si supera la
  mejor marca del día). Se deriva del estado de la simulación al cruzar la meta; no introduce datos
  nuevos persistidos por esta funcionalidad (la mejor marca ya la gestiona el circuito diario).
- **Ajustes de jugador (vista)**: el conjunto de preferencias editables desde el panel (volúmenes,
  sensibilidad, mapeos de entrada, interruptor de debug). Esta funcionalidad los presenta, aplica en
  caliente y los persiste entre sesiones reusando el almacenamiento local existente (salvo el
  interruptor de debug, que arranca apagado en cada carga). La mejor marca por circuito y el
  versionado del esquema de guardado son de la spec de persistencia posterior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona que nunca ha visto el juego completa el flujo título → jugar → cruzar la
  meta → ver el resultado → volver a jugar usando solo la interfaz, sin consola ni teclas de
  desarrollo, en su primer intento de navegación.
- **SC-002**: El 100% del flujo de extremo a extremo (título, jugar, resultados, rejugar y ajustes
  de volumen) es realizable solo con toque en un móvil, en retrato y en apaisado; la pausa en móvil
  se alcanza saliendo de la app (pérdida de foco) y la pantalla de pausa aparece al volver.
- **SC-003**: El cronómetro del intento no avanza mientras el juego está en pausa: el tiempo
  mostrado al reanudar es igual al que había justo antes de pausar.
- **SC-004**: Para una misma secuencia de inputs, el tiempo final y el recorrido de un intento con
  una o varias pausas intermedias son idénticos a los del mismo intento jugado sin pausas.
- **SC-005**: Un cambio de volumen, sensibilidad o del interruptor de debug hecho desde el panel se
  percibe aplicado antes del siguiente segundo de juego, sin recargar.
- **SC-006**: Toda opción de toda pantalla del shell es alcanzable y activable solo con teclado y
  solo con mando, con foco visible en cada paso.
- **SC-007**: El juego arranca y el flujo completo funciona aunque el almacenamiento local esté
  bloqueado y aunque el circuito diario esté en modo offline degradado, sin ninguna pantalla en
  blanco.
- **SC-008**: Tras cambiar volúmenes o sensibilidad desde el panel y recargar la página, los valores
  elegidos se conservan; con el almacenamiento bloqueado, el juego arranca con los defaults sin
  fallar.

## Assumptions

- La pantalla de título se muestra siempre al arrancar, también en visitas repetidas; no se añade un
  "saltar al título" en esta iteración (el juego es corto y diario).
- "Volver a jugar" (desde resultados) y "reiniciar el intento" (desde pausa) repiten el MISMO
  circuito recién jugado, aunque el día UTC haya cambiado; el circuito del día nuevo se recoge al
  pasar por el título (FR-024a), no a mitad de un intento.
- El reconocimiento de nueva mejor marca reutiliza la detección y la señal sonora ya existentes
  (mejor marca del día de la feature 006 y SFX de la feature 005); esta funcionalidad las presenta,
  no las reimplementa.
- La auto-pausa por pérdida de foco no muestra un diálogo distinto al de la pausa normal; reusa la
  misma pantalla de pausa.
- El reinicio del intento se mantiene también disponible por la tecla actual (R) por comodidad, pero
  deja de ser la única vía: la interfaz es suficiente para completar el juego (Principio VI).
- El juego está en español; no se aborda localización a otros idiomas.

## Dependencies

- **Feature 006 (circuito diario)**: el shell envuelve el circuito del día; lee su procedencia,
  cuenta atrás y mejor marca local ya existentes.
- **Feature 005 (audio)**: volúmenes de música y efectos y las señales sonoras (meta, nueva mejor
  marca) que el shell presenta y controla.
- **Feature 004 (entrada y accesibilidad)**: sensibilidad, reasignación de entrada y soporte de
  mando/táctil que el panel de ajustes expone, y la base responsive/táctil del shell.
- **Constitución v2.0.0+**: Principio VI (acabado publicable) es la razón de ser de esta
  funcionalidad; Principio II (determinismo) acota la pausa; Principios III (frontera headless) y V
  (configuración centralizada) acotan dónde vive la interfaz y sus parámetros.

## Out of Scope

- Selección de circuito, varios circuitos o archivo de días pasados (iteración de contenido
  posterior); aquí solo se deja el hueco arquitectónico (FR-025).
- Mejor marca POR circuito y versionado del esquema de guardado (iteración de persistencia
  posterior). Aquí el shell sí recuerda las preferencias de jugador (incluidos volúmenes) reusando
  el almacenamiento local (FR-019a), pero no aborda el esquema multi-circuito ni su migración.
- Menús de tienda o monetización.
- Localización a varios idiomas.
- Animaciones de interfaz complejas más allá de transiciones simples.
- Pantallas de error de arranque (WebGL/WASM/assets) y la pasada de rendimiento/empaquetado, que
  pertenecen a la iteración de robustez y publicación.
