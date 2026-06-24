# Feature Specification: Topadero — Prototipo de circuito de obstáculos

**Feature Branch**: `001-obstacle-platformer`  
**Created**: 2026-06-24  
**Status**: Draft (con clarificaciones pendientes para `/speckit-clarify`)  
**Input**: User description: "Prototipo de juego de plataformas de obstáculos en navegador, estilo Fall Guys, jugable por una sola persona en local. El objetivo del MVP es validar que el control de un personaje cápsula sobre un motor de físicas resulta divertido y responde bien, recorriendo un circuito corto hasta una meta. El juego se llama topadero."

## Clarifications

### Session 2026-06-24

- Q: Control de cámara — ¿quién controla la orientación? → A: Cámara orbital controlada por el jugador con el ratón (pointer lock); el movimiento del personaje es relativo a esa orientación (opción A).
- Q: Cronómetro — ¿cuándo arranca y se detiene? → A: Arranca con el primer input del jugador (movimiento o salto) y se detiene al entrar en la zona de meta (opción A).
- Q: Modelo de reaparición tras caída → A: Siempre reaparece en la salida; no hay checkpoints intermedios (opción A).
- Q: Efecto del obstáculo en movimiento al contacto → A: Empuje/derribo con impulso que desplaza al personaje y puede tirarlo de la plataforma (opción A).
- Q: Cronómetro al reaparecer tras una caída → A: Sigue corriendo (la caída penaliza el tiempo); el reinicio manual (FR-012) da un crono limpio (opción A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control y sensación del personaje en tercera persona (Priority: P1)

El jugador controla un personaje cápsula en un escenario 3D con el teclado: avanza en la dirección relativa a la cámara, salta para superar desniveles y ve al personaje en tercera persona con una cámara que lo sigue de forma suave. El personaje colisiona con el suelo y las superficies sin atravesarlas y desliza de forma razonable al rozar paredes y rampas.

**Why this priority**: Es la hipótesis central del MVP: validar que el control del personaje cápsula sobre el motor de físicas resulta divertido y responde bien. Sin un control que se sienta bien, el resto del circuito no aporta nada. Es la base sobre la que se apoya todo lo demás.

**Independent Test**: Se puede probar de forma aislada colocando al personaje sobre una superficie plana con algún desnivel: mover con el teclado en las cuatro direcciones relativas a la cámara, saltar, chocar contra una pared y una rampa, y comprobar que la cámara sigue al personaje sin saltos bruscos y que no se atraviesa la geometría. Entrega valor por sí solo: un "muñeco" jugable y agradable de mover.

**Acceptance Scenarios**:

1. **Given** el personaje apoyado en el suelo, **When** el jugador pulsa las teclas de movimiento, **Then** el personaje se desplaza en la dirección correspondiente relativa a la orientación de la cámara.
2. **Given** el personaje apoyado en una superficie, **When** el jugador pulsa saltar, **Then** el personaje salta; **When** el jugador pulsa saltar estando en el aire, **Then** no ocurre un segundo salto.
3. **Given** el personaje en movimiento hacia una pared o rampa, **When** colisiona con ella, **Then** no la atraviesa y desliza de forma continua a lo largo de la superficie en lugar de quedarse pegado o penetrarla.
4. **Given** el personaje desplazándose por el escenario, **When** cambia de posición, **Then** la cámara lo sigue de forma suave manteniéndolo encuadrado en tercera persona.

---

### User Story 2 - Recorrer el circuito hasta la meta con cronómetro (Priority: P2)

El jugador recorre un circuito corto de obstáculos hecho con primitivas (plataformas, al menos una rampa y al menos un obstáculo en movimiento) desde una salida hasta una zona de meta. Un cronómetro mide el intento y, al cruzar la meta, se detiene y se muestra un estado de victoria con el tiempo empleado.

**Why this priority**: Convierte el control validado en P1 en un reto con principio, fin y métrica. Es lo que da sentido a "recorrer hasta la meta" y a "mejorar el tiempo", el bucle de juego del prototipo.

**Independent Test**: Se puede probar recorriendo el circuito de salida a meta superando las plataformas, la rampa y el obstáculo en movimiento, y verificando que al entrar en la meta el cronómetro se detiene y aparece el estado de victoria con un tiempo coherente.

**Acceptance Scenarios**:

1. **Given** el jugador en la zona de salida sin haber movido aún al personaje, **When** realiza su primer input (movimiento o salto), **Then** el cronómetro arranca y el tiempo transcurrido es visible durante el recorrido.
2. **Given** el circuito con plataformas, rampa y al menos un obstáculo en movimiento, **When** el jugador avanza por él, **Then** puede apoyarse y desplazarse sobre las plataformas y la rampa, y el obstáculo en movimiento lo empuja con un impulso de derribo al contacto.
3. **Given** el jugador recorriendo el circuito, **When** entra en la zona de meta, **Then** el cronómetro se detiene y se muestra un estado de victoria con el tiempo empleado en el intento.

---

### User Story 3 - Recuperación tras caída y reinicio del intento (Priority: P3)

Si el jugador cae fuera del circuito, reaparece automáticamente en pocos segundos sin recargar la página. Además, puede reiniciar el intento cuando quiera para volver a empezar e intentar mejorar el tiempo.

**Why this priority**: Sostiene la sesión de juego sin recargas y habilita el "reintentar para mejorar el tiempo". Depende de que exista el circuito (P2), donde hay huecos y bordes por los que caer, por eso va después.

**Independent Test**: Se puede probar dejando caer al personaje por un hueco o borde del circuito y comprobando que reaparece en pocos segundos en una posición jugable; y pulsando la acción de reinicio en mitad de un intento para verificar que posición, estado y cronómetro vuelven al inicio.

**Acceptance Scenarios**:

1. **Given** el personaje cayendo por debajo del umbral de altura del circuito, **When** se supera ese umbral, **Then** el personaje reaparece en pocos segundos en una posición jugable sin recargar la página.
2. **Given** una partida en curso (en cualquier estado: corriendo, en el aire o en victoria), **When** el jugador activa el reinicio, **Then** el personaje vuelve a la posición de salida y el cronómetro y el estado del intento se reinician.

---

### Edge Cases

- ¿Cuenta como completado si el jugador llega a la meta saltándose parte del circuito (un atajo o saltando un tramo)? ¿La única condición es entrar en la zona de meta?
- ¿Cómo se comporta el salto justo en el borde de una plataforma, en el instante en que el personaje deja de estar apoyado (margen de tolerancia tipo "coyote time")?
- ¿Qué ocurre si un obstáculo en movimiento empuja al personaje contra una pared o tiende a introducirlo en la geometría? La colisión debe mantenerse estable.
- ¿Qué ocurre si el personaje cae pero vuelve a tocar una plataforma antes de superar el umbral de altura? No debería producirse respawn.
- ¿Qué pasa si el jugador reinicia mientras está en el aire, durante un respawn o ya en estado de victoria?
- ¿Qué le ocurre al cronómetro si la pestaña del navegador pierde el foco o se pausa el renderizado?
- ¿Qué pasa si el personaje queda atascado (por ejemplo, encajado entre un obstáculo en movimiento y una pared) sin llegar a caer por debajo del umbral? ¿La única salida es el reinicio manual?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST desplazar al personaje según la entrada de teclado, con la dirección del movimiento relativa a la orientación actual de la cámara (ver FR-002).
- **FR-002**: El sistema MUST mostrar al personaje en tercera persona con una cámara orbital que el jugador controla con el ratón (pointer lock) y que lo sigue de forma suave, sin saltos bruscos. La dirección del movimiento (FR-001) es relativa a la orientación de esta cámara.
- **FR-003**: El sistema MUST permitir el salto únicamente cuando el personaje está apoyado en una superficie; no debe existir salto en el aire ni doble salto.
- **FR-004**: El personaje MUST colisionar con el suelo y las plataformas sin atravesarlos en condiciones normales de juego.
- **FR-005**: Al chocar contra paredes y rampas, el personaje MUST deslizar de forma continua a lo largo de la superficie en lugar de quedarse pegado o penetrar la geometría.
- **FR-006**: El sistema MUST presentar un circuito de obstáculos construido con primitivas que incluya plataformas, al menos una rampa y al menos un obstáculo en movimiento.
- **FR-007**: Los obstáculos en movimiento MUST afectar al personaje al contacto aplicándole un impulso de empuje/derribo que lo desplaza y puede tirarlo de la plataforma.
- **FR-008**: El sistema MUST definir una posición de salida y una zona de meta claramente identificables dentro del circuito.
- **FR-009**: El sistema MUST llevar el cronómetro de cada intento y mostrar el tiempo transcurrido. El cronómetro arranca con el primer input del jugador (movimiento o salto) y se detiene al entrar en la zona de meta.
- **FR-010**: Cuando el personaje entra en la zona de meta, el sistema MUST detener el cronómetro y mostrar un estado de victoria con el tiempo empleado en el intento.
- **FR-011**: Cuando el personaje cae por debajo de un umbral de altura definido, el sistema MUST reaparecerlo en la posición de salida en pocos segundos, sin requerir recarga de página. No hay checkpoints intermedios. El respawn no reinicia el cronómetro del intento en curso (sigue corriendo); para un tiempo limpio el jugador usa el reinicio (FR-012).
- **FR-012**: El jugador MUST poder reiniciar el intento en cualquier momento, devolviendo el personaje a la salida y reseteando el estado del intento y el cronómetro, sin recargar la página.
- **FR-013**: El sistema MUST mantener una simulación física estable cuyo comportamiento sea independiente de la tasa de refresco de la pantalla: el mismo input debe producir la misma trayectoria a distintas tasas de fotogramas.

### Key Entities *(include if feature involves data)*

- **Personaje (cápsula)**: avatar controlado por el jugador. Atributos relevantes a nivel de comportamiento: posición, velocidad y estado de apoyo (apoyado en superficie / en el aire).
- **Cámara de seguimiento**: vista en tercera persona; orientación y posición relativas al personaje, base del movimiento relativo a la cámara.
- **Circuito / escenario**: conjunto de superficies y obstáculos construidos con primitivas que componen el recorrido: plataformas, al menos una rampa y al menos un obstáculo en movimiento.
- **Obstáculo en movimiento**: elemento del circuito con movimiento propio que interactúa con el personaje al contacto.
- **Zona de salida / Zona de meta**: regiones que marcan el inicio y el fin del recorrido; entrar en la meta dispara la condición de victoria.
- **Punto de reaparición**: posición a la que vuelve el personaje tras caer; siempre la salida del circuito (no hay checkpoints).
- **Intento (run)**: un recorrido medido por el cronómetro, con estados (en curso, completado/victoria, reiniciado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un jugador puede completar el circuito de la salida a la meta en un único intento continuo.
- **SC-002**: El salto se ejecuta en el 100 % de los intentos con el personaje apoyado y en el 0 % de los intentos estando en el aire (no hay doble salto).
- **SC-003**: Durante el juego normal, el personaje no atraviesa el suelo, las plataformas ni las paredes en ningún momento.
- **SC-004**: El mismo input produce la misma trayectoria (misma distancia y arco de salto, misma velocidad de avance) con independencia de la tasa de fotogramas; la diferencia de comportamiento entre una tasa baja (~30 FPS) y una alta (~144 FPS) es imperceptible para el jugador.
- **SC-005**: Al caer por debajo del umbral, el jugador recupera el control en una posición jugable en pocos segundos (objetivo ≤ 3 s), sin recargar la página.
- **SC-006**: Cruzar la meta detiene el cronómetro y muestra el tiempo del intento; el tiempo mostrado coincide con la duración real del recorrido.
- **SC-007**: El jugador puede reiniciar y repetir el recorrido cuantas veces quiera dentro de la misma sesión, sin recargar la página.
- **SC-008**: El prototipo se ejecuta de forma fluida en un navegador de escritorio típico (objetivo ≥ 60 FPS, sin caídas por debajo de un nivel jugable).

## Constraints *(restricciones dadas por el proyecto)*

- Plataforma de destino: navegador de escritorio, un solo jugador, en local.
- La escena se construye únicamente con primitivas (cápsulas, cajas, cilindros); sin modelos 3D ni audio.
- El personaje usa un collider cápsula y un controlador de personaje cinemático.

## Out of Scope *(no forma parte de este MVP)*

- Multijugador o red.
- Modelos 3D y animaciones.
- Audio.
- Menús.
- Progresión o desbloqueos.
- Varios niveles (el MVP es un único circuito corto).

## Assumptions

- El control de movimiento y salto es por teclado; el mapeo concreto de teclas (por ejemplo WASD/flechas y barra espaciadora) es un detalle de implementación y no condiciona la especificación.
- Los valores numéricos de ajuste (velocidad de movimiento, altura de salto, valor del umbral de caída, retardo exacto del respawn, número de obstáculos en movimiento más allá de "al menos uno") se dejan al ajuste de implementación; la spec fija el comportamiento cualitativo, no las cifras.
- Tras mostrar la victoria, la partida queda a la espera de que el jugador reinicie manualmente; no hay avance automático ni siguiente nivel (coherente con "sin progresión" y "sin menús").
- El cronómetro mide en una unidad legible para el jugador (por ejemplo, segundos con decimales); el formato concreto es un detalle de implementación.
