# Feature Specification: Topadero — Pase de feel del control

**Feature Branch**: `003-control-feel-pass`  
**Created**: 2026-06-24  
**Status**: Draft  
**Input**: User description: "Tercera iteración de topadero. Pase de 'feel' del control: pulir la respuesta del personaje (saltar y moverse más satisfactorio y que perdone más), sin añadir contenido ni cambiar el alcance. Sirve al Principio I (la sensación de juego manda). Incorpora/afina jump buffering, coyote time, salto de altura variable, control aéreo y aceleración/desaceleración en suelo, todo como parámetros de ajuste, consumido de forma determinista e independiente de los FPS."

## Clarifications

### Session 2026-06-24

- Q: ¿El salto de altura variable garantiza una altura mínima de salto (un toque siempre
  produce un salto perceptible) o un toque ultracorto puede quedar en un salto casi nulo? →
  A: Sí, altura mínima garantizada: un toque ultracorto siempre produce un salto perceptible
  (un "hop" mínimo) y mantener pulsado prolonga el ascenso hasta la altura máxima.
- Q: ¿La curva de gravedad asimétrica (caída más rápida y/o ápice más suave) entra en este
  pase de feel o se difiere a una iteración posterior? → A: Entra en este pase, como parámetro
  de ajuste y cubierta por la verificación de determinismo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Salto que perdona errores de timing (Priority: P1)

El jugador quiere que el salto le perdone pequeños errores de sincronización. Si pulsa saltar
una fracción de segundo antes de aterrizar, el personaje salta en cuanto toca el suelo en
lugar de "comerse" la pulsación. Y si pulsa saltar justo después de abandonar el borde de una
plataforma, el salto sigue saliendo dentro de un margen breve y generoso.

**Why this priority**: Es la mejora de feel de mayor impacto y la más directa al Principio I
(la sensación de juego manda): convierte fallos de timing que hoy frustran en saltos exitosos,
sin añadir contenido. Es la base del pase: sin un salto que responda y perdone, el resto de
ajustes de control se construyen sobre algo que sigue sintiéndose injusto.

**Independent Test**: Se puede probar de forma aislada en el circuito ya existente: (a) pulsar
saltar un instante antes de aterrizar y comprobar que el personaje salta al tocar suelo en vez
de ignorar la pulsación; (b) salir corriendo de un borde y pulsar saltar justo después,
comprobando que el salto sale dentro del margen. Entrega valor por sí solo: un salto que
"engancha" la intención del jugador.

**Acceptance Scenarios**:

1. **Given** el personaje cayendo hacia una superficie, **When** el jugador pulsa saltar
   dentro de la ventana de margen previa al aterrizaje, **Then** el personaje salta en el
   instante en que queda apoyado, sin que la pulsación se pierda.
2. **Given** el personaje pulsando saltar demasiado pronto (antes de la ventana de margen),
   **When** finalmente aterriza, **Then** NO salta automáticamente: una pulsación caducada no
   se ejecuta al tocar suelo.
3. **Given** el personaje que acaba de abandonar el borde de una plataforma y está empezando a
   caer, **When** el jugador pulsa saltar dentro del margen de gracia, **Then** el salto se
   ejecuta como si siguiera apoyado.
4. **Given** el personaje en el aire fuera de toda ventana de gracia, **When** el jugador pulsa
   saltar, **Then** no ocurre ningún salto (no hay salto en el aire ni doble salto).
5. **Given** un mismo patrón de pulsación bufferizada (pulsar saltar justo antes de aterrizar),
   **When** se reproduce a distintas tasas de fotogramas (~30 frente a ~144), **Then** el salto
   se dispara en el mismo instante de juego y produce un salto idéntico: el buffer no depende de
   los FPS.

---

### User Story 2 - Salto de altura modulable (Priority: P2)

El jugador quiere modular la altura del salto con la duración de la pulsación: un toque corto
produce un salto bajo y mantener pulsado produce un salto más alto, hasta un máximo. Soltar el
botón pronto durante el ascenso recorta el salto; mantenerlo lo prolonga.

**Why this priority**: Da expresividad y control fino al salto, una de las mejoras de feel más
reconocibles en plataformas. Se apoya en el salto ya validado (US1 le da un salto que responde
y perdona) y lo enriquece, por eso va después.

**Independent Test**: Se puede probar comparando dos saltos desde el mismo punto: un toque
breve frente a una pulsación mantenida. La altura máxima alcanzada con la pulsación mantenida
debe ser perceptible y medible por encima de la del toque; soltar pronto debe acortar el arco
de forma visible.

**Acceptance Scenarios**:

1. **Given** el personaje apoyado, **When** el jugador da un toque breve a saltar, **Then** el
   personaje realiza un salto bajo.
2. **Given** el personaje apoyado, **When** el jugador mantiene pulsado saltar, **Then** el
   personaje alcanza una altura claramente mayor que con el toque, hasta un tope máximo.
3. **Given** el personaje en pleno ascenso de un salto, **When** el jugador suelta el botón
   antes de llegar al ápice, **Then** el ascenso se corta y el salto resulta más bajo que si
   hubiera mantenido pulsado.
4. **Given** un mismo patrón de pulsación (mismo momento de pulsar y de soltar), **When** se
   reproduce a distintas tasas de fotogramas, **Then** la altura del salto resultante es la
   misma: el corte por soltado no depende de los FPS.

---

### User Story 3 - Movimiento con peso y control aéreo (Priority: P3)

El jugador quiere que arrancar, frenar y cambiar de dirección en el suelo se sientan con peso
pero respondan (ni patinazo de hielo ni parada instantánea de robot), y poder ajustar la
trayectoria en el aire de forma perceptible sin que el personaje se sienta flotante ni rígido.

**Why this priority**: Pule la locomoción base alrededor del salto ya afinado en US1–US2.
Aporta el "peso" del personaje y la corrección de trayectoria en el aire; es valioso pero
secundario respecto a que el salto perdone y sea expresivo, por eso cierra el pase.

**Independent Test**: Se puede probar en suelo plano: arrancar desde parado y observar una
breve rampa de aceleración en vez de velocidad máxima instantánea; soltar el movimiento y
observar una desaceleración con peso en vez de frenado seco; y en el aire, mover lateralmente
durante un salto y comprobar que la trayectoria se ajusta de forma perceptible pero contenida.

**Acceptance Scenarios**:

1. **Given** el personaje parado en suelo, **When** el jugador empieza a moverse, **Then** el
   personaje acelera con una rampa breve hasta su velocidad de crucero (no salta a velocidad
   máxima de golpe).
2. **Given** el personaje moviéndose a velocidad de crucero, **When** el jugador suelta el
   movimiento, **Then** el personaje desacelera con peso hasta detenerse, sin patinar de forma
   exagerada ni pararse en seco.
3. **Given** el personaje en el aire durante un salto, **When** el jugador pulsa una dirección,
   **Then** la trayectoria horizontal se ajusta de forma perceptible pero acotada (ni flotante
   ni rígida).
4. **Given** un mismo patrón de entrada de movimiento, **When** se reproduce a distintas tasas
   de fotogramas, **Then** la trayectoria resultante (distancia recorrida y arco) es la misma a
   FPS altos y bajos.

---

### Edge Cases

- **Pulsación bufferizada que caduca**: si la pulsación de salto se hace demasiado pronto y la
  ventana de margen expira antes de aterrizar, NO debe ejecutarse al tocar suelo (US1 escenario
  2). El buffer recuerda, pero solo dentro de su ventana.
- **Solapamiento de coyote time y buffer**: el jugador pulsa saltar tras dejar el borde y antes
  de tocar el suelo siguiente; debe resolverse en un único salto, nunca en dos.
- **Soltar el salto ya en caída**: soltar el botón cuando el personaje ya pasó el ápice y
  desciende no debe alterar la velocidad (no hay nada de ascenso que cortar).
- **Toque mínimo**: un toque extremadamente breve produce siempre el salto mínimo garantizado
  (FR-004), nunca un salto nulo.
- **Cambio de dirección brusco en suelo**: invertir el sentido a velocidad de crucero debe
  sentirse con peso (transición por la desaceleración), no como un giro instantáneo.
- **Empuje del obstáculo durante el ajuste de movimiento**: el control aéreo y las rampas de
  aceleración no deben anular ni amplificar de forma incorrecta el empuje del obstáculo móvil
  ya validado; el suelo de corrección de colisiones (sin tunneling) se mantiene.
- **Pérdida de foco con el salto pulsado**: al pausarse el render no debe quedar un estado de
  "salto mantenido" colgado que dispare un salto anómalo al volver.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE recordar una pulsación de salto realizada dentro de una ventana
  de margen previa al aterrizaje y ejecutarla en el instante en que el personaje queda apoyado
  (jump buffering). Una pulsación cuya ventana caduca antes del aterrizaje NO se ejecuta.
- **FR-002**: El sistema DEBE conservar un margen de gracia tras abandonar una superficie
  durante el cual un salto pulsado se ejecuta como si el personaje siguiera apoyado (coyote
  time), con un valor afinado en prueba de juego.
- **FR-003**: El sistema DEBE permitir modular la altura del salto según la duración de la
  pulsación: una pulsación corta produce un salto bajo y mantener pulsado lo prolonga hasta una
  altura máxima; soltar el botón durante el ascenso recorta la subida (salto de altura
  variable).
- **FR-004**: El salto de altura variable DEBE garantizar una altura mínima de salto: un toque
  ultracorto produce siempre un salto perceptible (un salto mínimo), nunca un salto nulo; a
  partir de ese mínimo, mantener pulsado prolonga el ascenso hasta la altura máxima.
- **FR-005**: El sistema DEBE permitir ajustar la trayectoria horizontal del personaje mientras
  está en el aire (control aéreo) de forma perceptible pero acotada, sin que resulte flotante
  ni rígida.
- **FR-006**: El sistema DEBE aplicar una rampa de aceleración al arrancar y de desaceleración
  al frenar en suelo, de modo que el movimiento tenga peso sin perder respuesta (ni patinazo
  exagerado ni parada instantánea).
- **FR-007**: El control aéreo (FR-005) y la locomoción en suelo (FR-006) DEBEN ser ajustables
  por separado, para poder afinar el aire y el suelo de forma independiente.
- **FR-008**: El sistema DEBE seguir permitiendo el salto únicamente cuando el personaje está
  apoyado (o dentro del margen de coyote time) y NUNCA en el aire fuera de ese margen: ni el
  jump buffering ni el salto de altura variable habilitan salto en el aire ni doble salto. Una
  pulsación bufferizada produce como máximo un salto, y solo al quedar apoyado (se conserva sin
  cambios la garantía del MVP: no hay doble salto ni salto en el aire).
- **FR-009**: El comportamiento del control DEBE ser independiente de la tasa de refresco: el
  mismo patrón de entrada (incluidos el momento de pulsar y de soltar el salto) DEBE producir
  la misma trayectoria, la misma altura de salto y el mismo arco a tasas de fotogramas altas y
  bajas. Esto se extiende a TODAS las mecánicas nuevas de este pase (jump buffering, salto de
  altura variable, control aéreo, aceleración/desaceleración en suelo y curva de gravedad
  asimétrica), no solo al salto base.
- **FR-010**: El sistema DEBE aplicar una curva de gravedad asimétrica (caída más rápida y/o
  ápice más suave) para mejorar la sensación del salto. Su intensidad es un valor de ajuste
  (FR-011) y su comportamiento DEBE ser independiente de la tasa de fotogramas (FR-009).
- **FR-011**: Todos los parámetros de este pase (ventanas de buffer y de coyote time, fuerzas y
  topes del salto, parámetros del corte por soltado, aceleraciones y velocidades de aire y
  suelo, y la intensidad de la curva de gravedad asimétrica) DEBEN ser valores de ajuste con
  nombre, reunidos en el único lugar de ajuste del proyecto, fáciles de encontrar e iterar.
- **FR-012**: El pase de feel NO DEBE degradar las mecánicas de control ya validadas en el MVP:
  se conservan la colisión sin atravesar geometría (sin tunneling), el deslizamiento continuo
  en paredes y rampas, y el empuje del obstáculo móvil al contacto.
- **FR-013**: El pase NO DEBE añadir contenido ni cambiar el esquema de control: sigue siendo
  teclado para el movimiento/salto y ratón para la cámara, sobre el mismo circuito y el mismo
  modelo de cámara; no se introducen niveles, obstáculos, menús, audio ni modelos nuevos.

### Key Entities *(include if feature involves data)*

- **Personaje (cápsula)**: avatar controlado por el jugador. Atributos relevantes a nivel de
  comportamiento para este pase: posición, velocidad horizontal y vertical, estado de apoyo
  (apoyado / en el aire), y el estado transitorio de la intención de salto (pulsación
  recordada y vigente, salto en ascenso en curso) que gobierna el buffering y la altura
  variable.
- **Intención de salto**: la pulsación de salto y su soltado como eventos con momento preciso
  dentro del intento, base del jump buffering (recordar la pulsación) y del salto de altura
  variable (cuándo se suelta corta el ascenso).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una pulsación de salto hecha dentro de la ventana de margen antes de aterrizar se
  ejecuta al tocar suelo en el 100 % de los intentos; una pulsación fuera de la ventana se
  ejecuta en el 0 % de los casos.
- **SC-002**: Mantener pulsado el salto produce una altura máxima medible y claramente mayor
  que la de un toque breve desde el mismo punto; soltar pronto acorta el salto de forma
  perceptible; y un toque ultracorto produce siempre un salto mínimo perceptible (nunca nulo).
- **SC-003**: El control aéreo permite desviar la trayectoria del salto de forma perceptible
  por el jugador, sin que el personaje se sienta flotante ni incontrolable.
- **SC-004**: Arrancar y frenar en suelo muestran una rampa de aceleración/desaceleración
  perceptible (movimiento con peso), sin patinazo exagerado ni parada instantánea.
- **SC-005**: Se mantiene la garantía del MVP: el salto se ejecuta en el 100 % de los intentos
  con el personaje apoyado (o en coyote time) y en el 0 % de los intentos estando en el aire
  fuera de ese margen; no hay doble salto.
- **SC-006**: El mismo patrón de entrada produce la misma trayectoria, altura y arco con
  independencia de la tasa de fotogramas; en particular, una pulsación bufferizada y un salto
  con soltado temprano frente a mantenido son idénticos a tasa baja (~30 FPS), con jitter, a
  60 FPS y a tasa alta (~144 FPS), con igualdad exacta a igual número de pasos de simulación.
- **SC-007**: Se conserva el suelo de corrección de colisiones del MVP: durante el juego normal
  el personaje no atraviesa suelo, plataformas ni paredes, y desliza de forma continua en
  paredes y rampas.
- **SC-008**: En la prueba de juego manual (puerta principal, Principio I), el control se
  percibe claramente mejor que en el MVP (salto más justo y expresivo, movimiento con peso y
  respuesta), sin regresiones respecto a lo ya validado.

## Constraints *(restricciones dadas por el proyecto)*

- El pase opera sobre el control ya existente: mismo circuito, mismo esquema de entrada
  (teclado para movimiento/salto, ratón para cámara) y mismo modelo de cámara.
- La geometría de simulación y colisión sigue siendo de primitivas; la colisión se resuelve
  contra el collider cápsula del personaje (sin colisión por mallas).
- Todas las mecánicas de control nuevas deben resolverse de forma determinista e independiente
  de la tasa de fotogramas, verificable de forma automática (Principio II de la constitución).
- Todo el ajuste numérico se centraliza como parámetros con nombre en un único lugar
  (Principio V).

## Out of Scope *(no forma parte de esta iteración)*

- Cualquier cosa del *Out of Scope* de la constitución: audio, modelos 3D y animaciones nuevas,
  menús, multijugador o red, progresión o desbloqueos, y varios niveles.
- Los obstáculos nuevos y el vestido gráfico de la Feature 002 (esta iteración no añade ni
  modifica contenido del circuito ni arte).
- Cambiar el esquema de control (sigue siendo teclado + ratón para la cámara) o el modelo de
  cámara.
- Fijar valores numéricos concretos de feel: las cifras (ventanas, fuerzas, aceleraciones,
  curvas) son ajuste de implementación por prueba de juego, no parte de esta especificación.

## Assumptions

- **Valores numéricos de feel**: las magnitudes concretas (duración de las ventanas de buffer y
  de coyote time, velocidad y tope del salto, parámetros del corte por soltado, aceleraciones y
  velocidades de aire y suelo, e intensidad de la curva de gravedad asimétrica) se dejan al
  ajuste por prueba de juego; la especificación fija el comportamiento cualitativo, no las
  cifras (Principio V).
- **Coyote time ya existe**: el margen de gracia al dejar el borde ya está parametrizado en el
  proyecto; este pase lo afina y lo valida, no lo introduce de cero.
- **Modelo de entrada del salto variable**: cómo se modela internamente el momento de soltar el
  botón (para que el corte ocurra de forma reproducible e independiente de los FPS) es un
  detalle de implementación que se resuelve en el plan, siempre que cumpla FR-009; no condiciona
  esta especificación.
- **Esquema de teclas**: el mapeo concreto de teclas de movimiento y salto es un detalle de
  implementación heredado del MVP; no cambia en este pase.
- **Cobertura de la verificación de determinismo**: la verificación automática de independencia
  de FPS crece para cubrir los casos nuevos (pulsación bufferizada y salto con soltado temprano
  frente a mantenido); sin esos casos cubiertos, la feature no se considera terminada (puerta
  automática, Principio II).
- **Curva de gravedad asimétrica (FR-010)**: entra en este pase (clarificada). La verificación
  de determinismo la cubre como al resto de mecánicas nuevas; su intensidad se afina por prueba
  de juego.
