# Feature Specification: Topadero — Audio (efectos y música)

**Feature Branch**: `005-audio`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Añadir audio al juego (música y efectos de sonido), en alcance tras la v2.0.0. SFX de las acciones núcleo (salto, aterrizaje, golpe del obstáculo, meta) con control de volumen, música de fondo loopable y efectos secundarios. El audio se reproduce fuera del paso fijo (no afecta al determinismo) y src/sim no carga assets; los SFX se obtienen con licencia comercial verificada y la música procede de fuentes royalty-free/CC0."

## Clarifications

### Session 2026-06-25

- Q: ¿Qué efectos entran de verdad en la 005? → A: núcleo (salto, aterrizaje, golpe, meta) + reaparición + música de juego; los efectos de menú/pausa/"nueva marca" se difieren al shell (006) y la persistencia (007), donde se disparan y validan.
- Q: ¿Control de volumen mínimo en la 005? → A: tecla de silencio (mute) global + volúmenes ajustables por config.ts + seam estable para la UI; los sliders en pantalla llegan con el shell (006).
- Q: ¿Pistas de música en la 005? → A: una única música de juego (loop); la música de menú se difiere al shell (006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Oír las acciones núcleo y poder silenciar (Priority: P1)

El jugador quiere oír el juego: que el salto, el aterrizaje, el golpe del obstáculo y el cruce de
la meta suenen en el momento justo, con efectos coherentes con la estética. Y quiere poder bajar el
volumen o silenciar el audio sin salir del juego.

**Why this priority**: Es lo que exige el Principio VI (un juego publicable tiene audio y un control
de volumen accesible) y el primer multiplicador de "feel" (Principio I): sin sonido, el juego se
lee como demo técnica por bueno que sea el control. Es la base sobre la que se apoyan la música y
los efectos secundarios.

**Independent Test**: Se puede probar en el circuito actual: saltar y oír el salto; aterrizar y oír
el aterrizaje; recibir el empuje de un obstáculo y oír el golpe; cruzar la meta y oír el sonido de
victoria; y silenciar/ajustar el volumen y comprobar que el audio responde, sin tocar nada más.

**Acceptance Scenarios**:

1. **Given** el personaje apoyado, **When** el jugador salta, **Then** suena el efecto de salto en
   ese instante.
2. **Given** el personaje cayendo, **When** aterriza sobre una superficie, **Then** suena el efecto
   de aterrizaje.
3. **Given** un obstáculo móvil que contacta con el personaje, **When** lo empuja (knockback),
   **Then** suena el efecto de golpe.
4. **Given** el personaje en juego, **When** cruza la meta, **Then** suena el efecto de victoria.
5. **Given** el audio sonando, **When** el jugador silencia o baja el volumen, **Then** el audio se
   silencia o se atenúa de inmediato; al subirlo de nuevo, vuelve a oírse.
6. **Given** un navegador que no permite reproducir audio hasta una interacción del usuario,
   **When** el jugador aún no ha interactuado, **Then** no suena nada ni aparece ningún error; el
   audio arranca tras la primera interacción.

---

### User Story 2 - Música de fondo (Priority: P2)

El jugador quiere una música de fondo alegre que acompañe la partida y se repita sin cortes, con su
propio control de volumen, separado del de los efectos, para poder bajar la música sin perder los
efectos (o al revés).

**Why this priority**: La música sube el acabado y la sensación de producto, pero se apoya en que los
efectos núcleo ya funcionen (US1); por eso va después y es independiente de los efectos secundarios.

**Independent Test**: Se puede probar entrando a jugar y comprobando que la música suena y se repite
en bucle sin corte perceptible; y ajustando el volumen de música de forma independiente del de los
efectos (bajar la música no silencia los efectos).

**Acceptance Scenarios**:

1. **Given** el jugador en una partida, **When** transcurre el tiempo, **Then** suena una música de
   fondo que se repite en bucle sin un corte perceptible al empalmar.
2. **Given** la música y los efectos sonando, **When** el jugador baja solo el volumen de la música,
   **Then** la música se atenúa pero los efectos siguen al volumen anterior (y viceversa).
3. **Given** la música y los efectos sonando a la vez, **When** coinciden varios sonidos, **Then** la
   mezcla no satura ni distorsiona (niveles equilibrados).

---

### User Story 3 - Efectos secundarios (Priority: P3)

El jugador quiere que el resto de acciones tengan su sonido: navegar y confirmar en los menús,
pausar y reanudar, reaparecer tras caer y batir su mejor marca. Refuerzan la respuesta y el premio.

**Why this priority**: Pulen la capa sonora pero no condicionan la jugabilidad; además, varios
dependen de piezas de specs posteriores (los de menú y pausa, del shell de juego; el de "nueva mejor
marca", de la persistencia), así que cierran la feature y se coordinan con ellas.

**Independent Test**: Se puede probar lo que ya existe hoy: caer por un borde y oír el efecto de
reaparición. Los efectos de menú, pausa y "nueva marca" se validan cuando aterricen el shell y la
persistencia; en esta feature quedan disponibles y conectados a esos puntos.

**Acceptance Scenarios**:

1. **Given** el personaje cae por debajo del umbral, **When** reaparece en la salida, **Then** suena
   el efecto de reaparición.
2. **Given** el jugador navega o confirma en un menú (cuando exista el shell), **When** lo hace,
   **Then** suena el efecto de navegación o de confirmación correspondiente.
3. **Given** el jugador bate su mejor marca (cuando exista la persistencia), **When** cruza la meta
   con un tiempo mejor, **Then** suena un efecto de celebración de "nueva marca".

---

### Edge Cases

- **Audio bloqueado por el navegador**: hasta la primera interacción del usuario, no suena nada y no
  se produce ningún error; el audio arranca al primer gesto (clic/tecla/toque).
- **Fallo de carga de un asset de audio**: si un sonido o la música no carga, el juego sigue jugable
  en silencio para esa pista, sin pantalla en blanco ni excepción visible.
- **Pestaña en segundo plano / pérdida de foco**: al volver, el audio no debe quedar desincronizado
  ni reproducir una ráfaga de sonidos acumulados.
- **Muchos efectos a la vez** (varios golpes/saltos seguidos): no debe saturar la mezcla ni cortar
  bruscamente; se solapan de forma controlada.
- **Silencio activado**: con el audio silenciado, ninguna acción produce sonido, pero el juego se
  comporta exactamente igual (el silencio no afecta a la física ni al cronómetro).
- **Respawn o reinicio durante la música**: la música sigue su bucle sin reiniciarse de forma
  abrupta en cada respawn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reproducir efectos de sonido para las acciones núcleo (salto,
  aterrizaje, golpe/empuje del obstáculo y meta/victoria), disparados por los eventos
  correspondientes del estado de la simulación, en el momento en que ocurren.
- **FR-002**: El sistema DEBE ofrecer un control de silencio accesible durante el juego (una tecla de
  silencio global) y volúmenes ajustables como parámetros (`config.ts`), más un seam estable para que
  la UI de ajustes del shell (006) los exponga. Los sliders en pantalla se difieren al shell.
- **FR-003**: El sistema DEBE permitir ajustar por separado el volumen de la música y el de los
  efectos.
- **FR-004**: El sistema DEBE reproducir una única música de fondo de juego que se repite en bucle
  sin un corte perceptible al empalmar. La música de menú se difiere al shell (006).
- **FR-005**: La mezcla de audio DEBE estar equilibrada: a volúmenes por defecto, varios sonidos
  simultáneos no saturan ni distorsionan.
- **FR-006**: El sistema DEBE reproducir el efecto de reaparición (validable hoy). Los demás efectos
  secundarios (navegación/confirmación de menú, pausa/reanudar y "nueva mejor marca") quedan
  definidos y conectados a sus puntos, pero su entrega y validación se difieren al shell (006) y a la
  persistencia (007); no forman parte del alcance entregable de esta iteración.
- **FR-007**: El audio DEBE respetar las políticas de autoplay del navegador: no suena hasta la
  primera interacción del usuario y esa espera no produce errores.
- **FR-008**: El audio se reproduce FUERA del paso fijo de física y NO DEBE introducir
  no-determinismo: la verificación de determinismo / independencia de FPS (Principio II) sigue en
  verde sin cambios de tolerancia.
- **FR-009**: La capa de audio NO DEBE romper la frontera headless: `src/sim/` no importa la capa de
  audio ni carga assets; el audio es un adaptador/vista que reacciona al estado de solo lectura de
  la simulación.
- **FR-010**: Los valores de ajuste del audio (volúmenes de música y efectos, rutas de los assets,
  política de arranque tras la primera interacción) DEBEN vivir como parámetros con nombre reunidos
  en el único lugar de ajuste del proyecto (Principio V).
- **FR-011**: Todos los assets de audio DEBEN tener una licencia de uso comercial verificada: los
  efectos de sonido con licencia comercial confirmada y la música de fuentes royalty-free/CC0, con
  sus créditos registrados.
- **FR-012**: Los assets de audio DEBEN servirse en formato web ligero (`.ogg`/`.webm` con respaldo
  `.mp3`), con una precarga que no bloquea el arranque del juego.
- **FR-013**: El sistema DEBE degradar con elegancia: si el audio no carga o el navegador lo bloquea,
  el juego sigue siendo plenamente jugable en silencio.
- **FR-014**: El audio NO DEBE requerir backend ni CDN propio: se sirve como parte de la web estática
  autocontenida.
- **FR-015**: El audio NO DEBE degradar el control ni la sensación ya validados ni el rendimiento
  objetivo (>= 60 FPS en escritorio); es una capa aditiva sobre la simulación.

### Key Entities *(include if data involved)*

- **Efecto de sonido (SFX)**: sonido corto asociado a un evento del juego (salto, aterrizaje, golpe,
  meta, reaparición, navegación/confirmación de menú, pausa, "nueva marca"). Atributos: clave, evento
  que lo dispara, archivo de audio.
- **Pista de música**: audio de fondo loopable con su propio nivel de volumen.
- **Preferencias de audio**: volumen de música, volumen de efectos y silencio. Son preferencias
  locales del jugador (su UI llega con el shell y su guardado con la persistencia).
- **Evento de audio**: cambio observable del estado de la simulación que dispara un efecto (flanco de
  salto, transición a apoyado, contacto del obstáculo, fase de victoria, reaparición); lo detecta la
  capa de audio leyendo el estado, sin tocar la simulación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las cuatro acciones núcleo (salto, aterrizaje, golpe, meta) producen su efecto en el
  momento correcto en el 100 % de las veces que ocurren.
- **SC-002**: La música y los efectos tienen volumen independiente y se pueden silenciar por separado;
  silenciar uno no afecta al otro.
- **SC-003**: La música se repite en bucle sin un corte perceptible para el jugador.
- **SC-004**: La verificación automática de determinismo / independencia de FPS sigue en verde tras
  integrar el audio, sin cambios de tolerancia.
- **SC-005**: Si el navegador bloquea o falla el audio, el jugador completa el circuito igualmente
  (el juego es plenamente jugable en silencio).
- **SC-006**: A volúmenes por defecto, con varios sonidos simultáneos, la mezcla no satura
  (sin distorsión por clipping).
- **SC-007**: El control y la sensación de juego se perciben igual que antes del audio, y el juego se
  mantiene fluido (>= 60 FPS en escritorio).

## Constraints *(restricciones dadas por el proyecto)*

- El audio se reproduce fuera del paso fijo y no afecta al determinismo ni a su verificación
  (Principio II).
- Frontera headless: `src/sim/` no importa audio ni carga assets.
- Todo el ajuste numérico se centraliza como parámetros con nombre (Principio V).
- Licencia: efectos con licencia comercial verificada; música royalty-free/CC0; créditos registrados.
- Web estática autocontenida, sin backend ni CDN propio.

## Out of Scope *(no forma parte de esta iteración)*

- Voces o diálogo.
- Audio posicional 3D complejo (basta un paneo o volumen simple si se quiere).
- Música adaptativa o dinámica (que cambie según el estado del juego).
- Audio servido desde un backend o CDN propio.
- La interfaz completa de ajustes de volumen: vive en la spec del shell de juego. Aquí basta un
  control accesible mínimo y un punto de conexión para esa UI.
- El guardado de las preferencias de audio entre sesiones: vive en la spec de persistencia local.

## Assumptions

- **Control de volumen mínimo en esta feature**: se asume un control accesible mínimo (silencio y
  volúmenes ajustables) más un seam estable; la UI completa de ajustes llega con el shell.
- **Persistencia de las preferencias de audio**: se asume que el guardado entre sesiones lo aporta la
  spec de persistencia; aquí las preferencias viven en memoria con sus valores por defecto.
- **Fuente de los assets** (decidido): los efectos de sonido se obtienen con una licencia comercial
  verificada y la música de fuentes royalty-free/CC0.
- **Eventos de audio**: los efectos se disparan leyendo transiciones del estado de simulación que ya
  existen hoy (flanco de salto, apoyo/aterrizaje, contacto del obstáculo, fase de victoria,
  reaparición); la capa de audio las detecta en el tiempo de render, sin tocar la simulación.
- **Acciones que aún no existen** (navegación de menú, pausa, "nueva marca"): sus efectos quedan
  definidos y conectados a los puntos correspondientes; se validan al aterrizar el shell (006) y la
  persistencia (007).
- **Alcance del audio**: solo el juego; la web de presentación (marketing) no entra en esta feature.
