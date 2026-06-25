# Feature Specification: Topadero — Entrada, accesibilidad y app instalable (mando · táctil/móvil · PWA)

**Feature Branch**: `004-input-accessibility`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Ampliar la entrada y la plataforma para que el control le siente bien a más jugadores y dispositivos: soporte de mando (gamepad), controles táctiles para móvil, reasignación y opciones de accesibilidad. La capa src/input sigue siendo adaptador puro y los flancos se consumen dentro del paso fijo (determinismo, Principio II). La ampliación de plataforma a escritorio + móvil/táctil ya está ratificada en la constitución v2.1.0. Además, el juego debe poder instalarse como app web (PWA) en el móvil: la web de presentación (raíz, p. ej. /topadero/) sugiere instalar, y lo que se instala y se abre desde el icono es el juego (p. ej. /topadero/play) a pantalla completa."

## Clarifications

### Session 2026-06-25

- Q: Suelo de rendimiento en móvil objetivo → A: >= 30 FPS estable en un móvil de gama media (el objetivo de >= 60 FPS se mantiene en escritorio); el determinismo no cambia (paso fijo, Principio II).
- Q: Disposición del control de cámara en táctil → A: joystick en la mitad izquierda, mitad derecha como zona de arrastre de cámara, botón de salto superpuesto abajo a la derecha (movimiento, cámara y salto independientes, multi-touch).
- Q: Regla de cambio de esquema de entrada cuando conviven varios → A: el esquema activo sigue automáticamente a la última entrada usada, sin selección ni override manual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jugar con mando o con los dedos, sin teclado (Priority: P1)

Un jugador con un mando conectado, o uno que abre el juego en el móvil, quiere recorrer el
circuito de principio a fin sin tocar el teclado: moverse, saltar y orientar la cámara con su
dispositivo. Con mando usa los sticks y un botón de salto; en táctil usa un joystick virtual para
moverse, un botón de salto en pantalla y el arrastre del dedo para la cámara. El jugador de
teclado y ratón sigue jugando exactamente igual que hoy, y si conecta o desconecta un mando a
mitad de partida, el juego cambia de esquema sin recargar.

**Why this priority**: Es el corazón de la feature y lo que de verdad amplía a quién le sienta
bien el control (Principio I): hoy el juego solo se puede jugar con teclado y ratón. Un mando o
una pantalla táctil son la puerta de entrada para la mayoría de jugadores casuales del género.
Sin esto, nada de la reasignación ni de la accesibilidad tiene sobre qué apoyarse.

**Independent Test**: Se puede probar de forma aislada en el circuito actual: (a) con un mando
conectado, completar el recorrido moviéndose, saltando y girando la cámara solo con el mando;
(b) en un navegador móvil o en modo táctil, completar el recorrido con joystick virtual, botón de
salto y arrastre de cámara; (c) conectar/desconectar el mando durante la partida y comprobar que
el control no se pierde. Entrega valor por sí solo: el juego pasa de jugarse solo con teclado a
jugarse también con mando o táctil.

**Acceptance Scenarios**:

1. **Given** un mando conectado, **When** el jugador mueve el stick izquierdo, **Then** el
   personaje se desplaza en esa dirección relativa a la cámara, igual que con WASD.
2. **Given** un mando conectado y el personaje apoyado, **When** el jugador pulsa el botón de
   salto del mando, **Then** el personaje salta exactamente como con la barra espaciadora (solo
   apoyado, nunca en el aire).
3. **Given** un mando conectado, **When** el jugador mueve el stick derecho, **Then** la cámara
   orbita alrededor del personaje, como con el ratón.
4. **Given** el juego abierto en una pantalla táctil, **When** el jugador arrastra el joystick
   virtual, **Then** el personaje se mueve en esa dirección con intensidad proporcional al
   desplazamiento del joystick.
5. **Given** el juego en táctil, **When** el jugador toca el botón de salto en pantalla estando
   apoyado, **Then** el personaje salta; **When** lo toca en el aire, **Then** no ocurre nada.
6. **Given** el juego en táctil, **When** el jugador arrastra un dedo en la zona de cámara,
   **Then** la cámara orbita sin que ese arrastre dispare un salto ni un movimiento.
7. **Given** una partida en curso con teclado, **When** el jugador conecta un mando y empieza a
   usarlo (o al revés), **Then** el juego adopta el nuevo esquema de entrada sin recargar la
   página y sin perder el control de forma perceptible.
8. **Given** el mismo patrón de entrada equivalente (p. ej. "mantener avance y saltar al apoyar")
   ejecutado con teclado, con mando o con los controles táctiles, **When** se reproduce a ~30,
   ~60 y ~144 FPS, **Then** la trayectoria, la altura y el arco del salto son los mismos: el
   método de entrada y los FPS no alteran la física (Principio II).

---

### User Story 2 - Ajustar sensibilidad y reasignar controles (Priority: P2)

El jugador quiere adaptar la entrada a su gusto: cambiar la sensibilidad de la cámara, invertir un
eje si lo prefiere, y reasignar qué tecla o botón hace cada acción. Las asignaciones por defecto
son sensatas, pero deben poder cambiarse y, una vez cambiadas, recordarse.

**Why this priority**: Aumenta la comodidad y el alcance (zurdos, preferencias de cámara, mandos
no estándar), pero se apoya en US1 (primero tiene que haber entrada de mando y táctil que
reasignar) y en piezas de specs posteriores (el panel de ajustes vive en el shell; el guardado de
las asignaciones, en la persistencia). Por eso va después y su exposición en interfaz se completa
con esas specs.

**Independent Test**: Se puede probar a nivel de comportamiento cambiando un valor de asignación o
de sensibilidad (mediante el único lugar de ajuste del proyecto) y verificando que la acción
responde al nuevo control y que la cámara responde a la nueva sensibilidad o al eje invertido,
sin tocar el resto del juego.

**Acceptance Scenarios**:

1. **Given** una asignación de salto cambiada a otra tecla o botón, **When** el jugador usa el
   nuevo control estando apoyado, **Then** el personaje salta; la asignación anterior deja de
   disparar el salto.
2. **Given** una sensibilidad de cámara más alta, **When** el jugador mueve la cámara la misma
   cantidad física, **Then** la cámara gira más que con la sensibilidad por defecto.
3. **Given** la inversión del eje vertical de cámara activada, **When** el jugador la mueve hacia
   arriba, **Then** la cámara mira en el sentido contrario al de por defecto.
4. **Given** unas asignaciones personalizadas establecidas, **When** el jugador vuelve a abrir el
   juego más tarde, **Then** sus asignaciones y sensibilidad se conservan (a través de la
   persistencia local, dependiente de la spec de persistencia).

---

### User Story 3 - Accesibilidad básica (Priority: P3)

El jugador quiere opciones de accesibilidad: reducir el movimiento de cámara y los efectos
visuales agresivos si le marean ("reduced motion"), y un HUD legible (contraste y tamaño
cómodos). En táctil, los controles en pantalla deben ser lo bastante grandes y estar colocados de
forma que no tapen la acción.

**Why this priority**: Mejora la inclusión y la comodidad, pero no condiciona la jugabilidad
básica; se construye sobre el control ya disponible (US1) y sobre las preferencias que se ajustan
y guardan con el shell y la persistencia. Cierra la feature.

**Independent Test**: Se puede probar activando la preferencia de "reduced motion" y comprobando
que el movimiento o sacudida de cámara se atenúa de forma perceptible sin afectar a la posición
del personaje ni a la física; y comprobando que los objetivos táctiles tienen un tamaño cómodo y
no solapan zonas críticas de la pantalla.

**Acceptance Scenarios**:

1. **Given** la preferencia "reduced motion" activada, **When** ocurre un evento que normalmente
   movería o sacudiría la cámara, **Then** ese movimiento se reduce o se omite, sin que cambie la
   trayectoria del personaje ni la física.
2. **Given** el juego en táctil, **When** el jugador mira la pantalla, **Then** el joystick y el
   botón de salto son lo bastante grandes para acertarlos con comodidad y no ocultan al personaje
   ni la meta.
3. **Given** una opción de HUD de mayor contraste o tamaño activada, **When** el jugador juega,
   **Then** el cronómetro y los textos del HUD se leen con claridad.

---

### User Story 4 - Instalar el juego en el móvil como app (PWA) (Priority: P2)

Un jugador que llega a la web de presentación desde el móvil quiere quedarse el juego como una
app: que la propia página le sugiera instalarlo, instalarlo con un toque y, a partir de ahí,
abrirlo desde un icono en la pantalla de inicio como una aplicación a pantalla completa, sin la
barra del navegador. Lo que se instala y se abre es el juego, no la web de presentación, y una vez
instalado se puede jugar aunque no haya conexión.

**Why this priority**: Convierte el destino "web móvil" (US1) en un producto que se queda en el
dispositivo, que es lo que dispara que un jugador vuelva: un icono en la pantalla de inicio retiene
mucho más que un enlace. Depende de que la experiencia táctil de US1 ya funcione (instalar algo que
no se juega bien en el móvil no aporta), pero es independiente de la reasignación (US2) y de la
accesibilidad (US3): se puede entregar y demostrar por sí sola.

**Independent Test**: Se puede probar en un móvil real o emulado: (a) abrir la web de presentación
y comprobar que aparece una invitación a instalar clara y descartable (o, donde el navegador no la
ofrece, instrucciones equivalentes); (b) instalar y verificar que queda un icono de Topadero en la
pantalla de inicio; (c) abrir desde ese icono y comprobar que arranca el juego a pantalla completa,
no la web de presentación; (d) en modo avión, tras haber cargado una vez, comprobar que el juego
arranca y se juega sin conexión.

**Acceptance Scenarios**:

1. **Given** la web de presentación abierta en un móvil/navegador compatible, **When** el jugador
   la visita, **Then** se le ofrece de forma no intrusiva instalar el juego (aviso o botón de
   "Instalar"/"Añadir a la pantalla de inicio").
2. **Given** un navegador que no expone la invitación automática (p. ej. iOS Safari), **When** el
   jugador visita la web de presentación, **Then** se le muestran instrucciones equivalentes para
   añadir el juego a la pantalla de inicio.
3. **Given** la invitación a instalar visible, **When** el jugador la descarta, **Then** la
   navegación sigue normal y la invitación no reaparece de forma molesta en la misma sesión.
4. **Given** el jugador ha instalado el juego, **When** abre el icono desde la pantalla de inicio,
   **Then** arranca directamente el juego a pantalla completa (standalone), sin la barra del
   navegador y sin pasar por la web de presentación.
5. **Given** el juego ya cargado una vez en el dispositivo, **When** el jugador lo abre sin
   conexión a internet, **Then** el juego arranca y es jugable de principio a fin.
6. **Given** el juego instalado y abierto como app, **When** se compara su física con la de la
   versión en pestaña de navegador, **Then** es idéntica: instalarlo no cambia la trayectoria, la
   altura del salto ni el determinismo (Principio II).

---

### Edge Cases

- **Mando desconectado a mitad de salto o movimiento**: el personaje no debe quedarse con una
  entrada "pegada" (avanzando o saltando solo); al perderse el mando, las entradas continuas se
  consideran sueltas de forma limpia.
- **Mando conectado pero inactivo**: tener un mando enchufado sin usarlo no debe bloquear ni
  interferir con el teclado y el ratón; el esquema activo lo decide la última entrada usada.
- **Toques múltiples simultáneos en táctil**: mover con el joystick y saltar a la vez con la otra
  mano deben funcionar como dos entradas independientes (multi-touch), no anularse.
- **Toque que empieza en el joystick y se arrastra fuera de su zona**: el joystick mantiene el
  control de ese dedo hasta que se suelta, sin saltar a controlar la cámara.
- **Botón de salto mantenido en táctil**: coherente con el salto del MVP/feel; mantener pulsado no
  produce salto en el aire ni doble salto, y el flanco se consume dentro del paso fijo.
- **Pérdida de foco con una entrada activa** (cambiar de pestaña con el stick o el joystick
  movido): al volver no debe quedar movimiento o salto colgado.
- **Dispositivo híbrido** (portátil táctil con teclado, o navegador con mando y pantalla táctil):
  los esquemas conviven; el activo sigue a la última entrada usada, sin estados contradictorios.
- **Orientación del móvil** (retrato/apaisado) y distintos tamaños de pantalla: los controles
  táctiles se reubican para seguir siendo alcanzables y no tapar la acción.
- **Navegador sin invitación de instalación** (iOS Safari, o de escritorio que no la soporta): no
  debe quedar un botón roto; se muestran instrucciones equivalentes o, donde no aplica, no se
  ofrece nada.
- **Juego ya instalado**: la web de presentación no debe seguir insistiendo en instalar si el
  jugador ya tiene la app (o, al menos, no de forma molesta).
- **Primera carga sin conexión**: si el jugador abre por primera vez sin red y los recursos aún no
  están cacheados, el fallo se comunica con claridad (coherente con la robustez de la spec de
  publicación), no con una pantalla en blanco.
- **Actualización del juego ya instalado**: una versión nueva debe poder reemplazar a la cacheada
  sin dejar al jugador atascado en una versión vieja indefinidamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE aceptar entrada de mando (gamepad) para las acciones de juego:
  desplazamiento (stick analógico), salto (botón) y orientación de cámara (stick analógico),
  conviviendo con el esquema de teclado y ratón ya existente.
- **FR-002**: El sistema DEBE ofrecer controles táctiles para pantallas táctiles con esta
  disposición: joystick virtual de desplazamiento en la mitad izquierda (pulgar izquierdo, con
  intensidad proporcional), la mitad derecha como zona de arrastre para orientar la cámara, y un
  botón de salto superpuesto abajo a la derecha. Movimiento, cámara y salto funcionan de forma
  independiente (multi-touch) y no ocultan el centro de la pantalla.
- **FR-003**: El sistema DEBE detectar qué método de entrada está usando el jugador (teclado y
  ratón, mando, o táctil) y permitir cambiar entre ellos en caliente, sin recargar la página y sin
  pérdida perceptible de control, incluida la conexión o desconexión de un mando en plena partida.
  El esquema activo sigue automáticamente a la última entrada usada, sin selección ni override
  manual.
- **FR-004**: Toda entrada (teclado, ratón, mando, táctil) DEBE traducirse a un único marco de
  entrada por paso (inputFrame) que se consume DENTRO del paso fijo. En particular, los flancos de
  salto (tecla, botón de mando o toque del botón en pantalla) se consumen dentro del paso fijo,
  igual que hoy con el teclado, para no romper el determinismo (Principio II).
- **FR-005**: Las entradas analógicas (stick del mando, joystick virtual) DEBEN tratarse de forma
  equivalente a la entrada direccional de teclado en cuanto al efecto sobre la física, y su consumo
  DEBE ser determinista e independiente de la tasa de fotogramas.
- **FR-006**: El sistema DEBE permitir reasignar qué tecla, botón o control realiza cada acción,
  partiendo de unas asignaciones por defecto sensatas. Las asignaciones personalizadas se conservan
  entre sesiones mediante la persistencia local (dependiente de la spec de persistencia).
- **FR-007**: El sistema DEBE permitir ajustar la sensibilidad de la cámara y la inversión de sus
  ejes, como valores con nombre.
- **FR-008**: El sistema DEBE honrar una preferencia de "reduced motion" que reduzca u omita el
  movimiento o la sacudida de cámara y otros efectos visuales agresivos, sin alterar la posición
  del personaje ni la física ni la verificación de determinismo.
- **FR-009**: El sistema DEBE ofrecer opciones de legibilidad del HUD (contraste y/o tamaño) que no
  afecten a la jugabilidad ni a la física.
- **FR-010**: Los controles táctiles DEBEN tener objetivos de tamaño cómodo y una disposición que
  no oculte elementos críticos de juego (el personaje y la meta), adaptándose a distintos tamaños y
  orientaciones de pantalla.
- **FR-011**: El comportamiento del control DEBE ser independiente del método de entrada y de la
  tasa de fotogramas: un mismo patrón de entrada equivalente (con teclado, mando o táctil) DEBE
  producir la misma trayectoria, altura de salto y arco a ~30, ~60 y ~144 FPS.
- **FR-012**: La feature NO DEBE degradar el control de teclado y ratón ya validado (Principio I):
  se conservan el seguimiento de cámara sin saltos bruscos, el salto solo apoyado, la ausencia de
  tunneling y el deslizamiento estable.
- **FR-013**: El sistema NO DEBE enviar datos de entrada ni telemetría a ningún backend; toda la
  gestión de entrada y preferencias es local.
- **FR-014**: Los valores de ajuste de esta feature (asignaciones por defecto, sensibilidades,
  inversión de ejes, tamaños y posiciones de los controles táctiles, parámetros del joystick
  virtual) DEBEN vivir como parámetros con nombre reunidos en el único lugar de ajuste del proyecto
  (Principio V).
- **FR-015**: El soporte táctil DEBE funcionar en el juego servido como web (web móvil), sin
  requerir una app nativa ni un backend; el destino de distribución sigue siendo web estática.
- **FR-016**: El juego DEBE poder instalarse como aplicación web (PWA) en el dispositivo del
  jugador, en especial en móvil: añadirse a la pantalla de inicio con icono y nombre propios y
  abrirse como aplicación independiente (a pantalla completa, sin la barra del navegador), sin
  requerir tienda de aplicaciones ni backend.
- **FR-017**: La web de presentación (servida en la raíz del despliegue, p. ej. `/topadero/`) DEBE
  sugerir la instalación de forma no intrusiva y descartable cuando el dispositivo y el navegador la
  permiten (un aviso o botón de "Instalar"/"Añadir a la pantalla de inicio"). Cuando el navegador no
  expone esa invitación automática (p. ej. iOS Safari), DEBE mostrar instrucciones equivalentes.
- **FR-018**: Al lanzarse desde el icono instalado, la aplicación DEBE abrir directamente el JUEGO
  (la ruta de juego, p. ej. `/topadero/play`) a pantalla completa, no la web de presentación.
- **FR-019**: Tras la primera carga (o tras instalarse), el juego DEBE poder arrancar y jugarse de
  principio a fin SIN conexión a internet; sus recursos, incluido el motor de físicas, quedan
  disponibles en local. Como juego de un jugador en local, no depende de la red para jugar.
- **FR-020**: La instalación y el funcionamiento como PWA NO DEBEN alterar la simulación ni el
  determinismo (Principio II): son una capa de empaquetado y entrega del lado del cliente; el núcleo
  de simulación y el paso fijo no cambian, y el cacheo de recursos para uso sin conexión no
  introduce no-determinismo en el paso fijo.
- **FR-021**: La app instalada DEBE tener una identidad coherente con la marca Topadero (nombre,
  icono, color de tema) y respetar la orientación de juego en móvil de forma coherente con los
  controles táctiles reubicables (FR-010), sin forzar una orientación que rompa la disposición.
- **FR-022**: La instalación nunca DEBE ser forzada ni bloqueante: el juego se puede usar igual en
  el navegador sin instalar; instalar es una mejora opcional ofrecida desde la web de presentación.

### Key Entities *(include if feature involves data)*

- **Marco de entrada (inputFrame)**: instantánea de la intención del jugador en un paso de
  simulación, agnóstica del origen: ejes de desplazamiento, ejes/delta de cámara y flanco de salto.
  Es lo que consume el paso fijo; teclado, ratón, mando y táctil son fuentes que lo rellenan.
- **Esquema de entrada activo**: el método en uso (teclado y ratón, mando, o táctil), con su
  detección y la regla de cambio (sigue a la última entrada usada).
- **Asignación de controles (binding)**: relación entre controles físicos (teclas, botones del
  mando, zonas táctiles) y acciones del juego; existe un conjunto por defecto y, opcionalmente, uno
  personalizado por el jugador.
- **Preferencias de entrada y accesibilidad**: sensibilidad de cámara, inversión de ejes, "reduced
  motion", y opciones de legibilidad del HUD. Son preferencias locales del jugador.
- **App instalable (PWA)**: identidad de la aplicación instalada (nombre, icono, color de tema,
  modo a pantalla completa) y la ruta que abre al lanzarse (el juego, no la web de presentación).
  Vive en la capa de entrega/cliente, no toca la simulación.
- **Invitación a instalar**: el ofrecimiento de instalación que muestra la web de presentación
  (botón/aviso o instrucciones), con su estado de descartado por sesión.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un jugador puede completar el circuito de principio a fin usando únicamente un mando
  (moverse, saltar y orientar la cámara), sin tocar el teclado ni el ratón, en el 100 % de los
  intentos válidos.
- **SC-002**: Un jugador puede completar el circuito de principio a fin en una pantalla táctil
  (joystick virtual, botón de salto y arrastre de cámara), sin teclado, en el 100 % de los intentos
  válidos.
- **SC-003**: Al conectar o desconectar un mando durante la partida, el juego cambia de esquema de
  entrada sin recargar y sin que el jugador pierda el control de forma perceptible.
- **SC-004**: El mismo patrón de entrada equivalente produce la misma trayectoria, altura y arco de
  salto con teclado, mando o táctil, y a ~30, ~60 y ~144 FPS; el método de entrada y los FPS no
  cambian la física (verificación de determinismo, Principio II).
- **SC-005**: En un móvil de gama media, el juego se mantiene jugable con los controles táctiles en
  pantalla a >= 30 FPS estables (en escritorio se mantiene el objetivo de >= 60 FPS).
- **SC-006**: Con los controles táctiles activos, el jugador puede ver al personaje y la meta
  mientras usa el joystick y el botón de salto; los controles no ocultan elementos críticos.
- **SC-007**: Con "reduced motion" activado, el movimiento o sacudida de cámara y los efectos
  agresivos se reducen de forma perceptible para el jugador, sin que cambien la trayectoria del
  personaje ni la jugabilidad.
- **SC-008**: El control de teclado y ratón se percibe igual de bueno que antes de esta feature
  (sin regresiones de feel ni de estabilidad de colisiones), en la prueba de juego manual.
- **SC-009**: En un móvil compatible, el jugador puede instalar Topadero desde la web de
  presentación (o mediante las instrucciones equivalentes) y le queda un icono en la pantalla de
  inicio.
- **SC-010**: Al abrir Topadero desde el icono instalado, arranca directamente el juego a pantalla
  completa (standalone), sin la barra del navegador y sin pasar por la web de presentación.
- **SC-011**: La web de presentación muestra una invitación a instalar clara y descartable cuando
  el dispositivo lo permite; descartarla no rompe la navegación ni reaparece de forma molesta en la
  misma sesión.
- **SC-012**: Tras cargarse una vez (o instalarse), el juego arranca y se juega de principio a fin
  sin conexión a internet.
- **SC-013**: Instalar el juego como PWA no cambia la física: la verificación de determinismo sigue
  en verde y el feel no se degrada (Principios II y I).

## Constraints *(restricciones dadas por el proyecto)*

- La capa de entrada (`src/input`) se mantiene como adaptador puro que produce el inputFrame; no
  contiene lógica de juego que altere la física, y `src/sim/` no la importa (frontera headless).
- Todas las mecánicas de entrada nuevas se resuelven de forma determinista e independiente de la
  tasa de fotogramas, verificable de forma automática (Principio II); los flancos se consumen
  dentro del paso fijo.
- La geometría de simulación y colisión sigue siendo de primitivas; esta feature no toca el
  circuito ni el arte.
- Todo el ajuste numérico se centraliza como parámetros con nombre en el único lugar de ajuste
  (Principio V).
- Plataforma: navegador de escritorio y móvil, un jugador, en local, web estática sin backend
  (constitución v2.1.0).
- La instalación como PWA y el uso sin conexión se resuelven solo en el cliente (recursos estáticos
  cacheados); no introducen backend, cuentas ni telemetría, y no tocan `src/sim/` ni el paso fijo.

## Out of Scope *(no forma parte de esta iteración)*

- El panel de ajustes en interfaz desde el que el jugador cambia asignaciones y sensibilidad: vive
  en la spec del shell de juego. Esta feature expone los valores configurables y un punto de
  conexión estable; la UI para tocarlos llega con el shell.
- El mecanismo de guardado de las asignaciones y preferencias personalizadas: vive en la spec de
  persistencia local. Esta feature deja las preferencias listas para persistirse.
- Control por voz y vibración háptica avanzada (un rumble simple del mando es opcional, no
  requisito).
- Publicación en tiendas de aplicaciones nativas: el destino sigue siendo la web (ahora también web
  móvil). La instalación es como PWA (añadir a la pantalla de inicio), no a través de tiendas.
- Capacidades de PWA más allá de instalar y jugar sin conexión: notificaciones push, sincronización
  en segundo plano, badging o atajos de app. No entran en esta iteración.
- La estrategia fina de actualización de la versión cacheada (más allá de no dejar al jugador
  atascado en una versión vieja) se coordina con la spec de robustez/publicación.
- Los efectos de "juice" en sí (sacudida de cámara, etc.) son pulido aparte; aquí solo se exige que
  la preferencia de "reduced motion" los atenúe cuando existan.

## Assumptions

- **Suelo de rendimiento en móvil**: se mantiene el objetivo de >= 60 FPS en escritorio; en un móvil
  de gama media el suelo es >= 30 FPS estables (decidido en clarify). El determinismo y el paso fijo
  no cambian con los FPS.
- **Exposición en interfaz de la reasignación y los ajustes**: se asume que la UI para cambiarlos
  llega con la spec del shell; en esta feature las asignaciones y sensibilidades son configurables
  como valores con nombre y accesibles a través de un seam estable.
- **Persistencia de las preferencias**: se asume que el guardado entre sesiones lo aporta la spec de
  persistencia local; aquí las preferencias se mantienen en memoria y como valores por defecto,
  listas para persistirse.
- **Estado de "reduced motion"**: el "juice" de cámara puede no existir todavía (es pulido
  diferido); la preferencia se honra para el movimiento de cámara actual y para cualquier efecto que
  se añada después.
- **Esquema de teclado y ratón**: se mantiene sin cambios; esta feature añade mando y táctil junto
  a él, no lo sustituye.
- **Detección de esquema**: el esquema activo sigue automáticamente a la última entrada usada, sin
  selección ni override manual (decidido en clarify).
- **Un jugador, local, sin red**: igual que el resto del proyecto; no hay cuentas ni telemetría.
- **Rutas de despliegue**: la web de presentación vive en la raíz del despliegue (p. ej.
  `/topadero/`) y el juego bajo `/play/` (p. ej. `/topadero/play/`), coherente con el despliegue
  actual de GitHub Pages (marketing en la raíz, juego en `/play/`). El ámbito de la app instalada
  cubre la ruta del juego, y la invitación a instalar vive en la web de presentación.
- **Funcionamiento sin conexión**: al ser un juego de un jugador en local, jugar sin conexión es
  viable y esperable de una PWA; los recursos del juego (incluido el motor de físicas) se cachean en
  el cliente tras la primera carga. No hay datos de servidor que sincronizar.
- **iOS**: Safari no ofrece la invitación automática de instalación; se asume mostrar instrucciones
  equivalentes ("Compartir → Añadir a inicio"). El resto de la experiencia instalada es equivalente.
- **Alcance constitucional**: una PWA instalable es web (no app de tienda nativa), del lado del
  cliente y sin backend, así que encaja en la plataforma "escritorio + móvil, web estática" de la
  constitución v2.1.0 sin requerir nueva enmienda.
