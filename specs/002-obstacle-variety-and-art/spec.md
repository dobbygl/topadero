# Feature Specification: Variedad de obstáculos y vestido gráfico

**Feature Branch**: `002-obstacle-variety-and-art`  
**Created**: 2026-06-24  
**Status**: Draft  
**Input**: User description: "Segunda iteración de topadero: enriquecer el circuito y la variedad de obstáculos (más reto) y vestir el juego gráficamente con assets generados por IA (imágenes 2D y mallas 3D low-poly), sin romper el núcleo validado (determinismo, colisión sobre primitivas, frontera headless de la simulación)."

> **Dependencia de gobernanza (bloqueante para implementar).** Esta feature introduce
> mallas 3D y arte texturizado, hoy *Out of Scope* en la constitución (Principio III: "la
> escena se construye ÚNICAMENTE con primitivas; sin modelos 3D ni audio"). La spec puede
> redactarse y clarificarse, pero **la implementación está bloqueada hasta enmendar la
> constitución** (vía el proceso de constitución) para permitir mallas/texturas decorativas
> en la capa de render, dejando intactos el Principio II (determinismo), la frontera headless
> de `sim/`, la colisión sobre primitivas y la centralización en `config.ts`. Ver Assumptions.

## Clarifications

### Session 2026-06-24

- Q: ¿Se incluyen plataformas móviles portantes (el jugador viaja sobre ellas) y cómo se trata el caso vertical (rapier.js #488)? → A: Portantes solo horizontales; el transporte vertical queda excluido.
- Q: ¿El personaje recibe malla low-poly propia o se conserva la cápsula? → A: Malla low-poly del mascot que sustituye visualmente a la cápsula (el collider sigue siendo cápsula).
- Q: ¿Cuál es la dirección de arte (tema, paleta, mood) del escenario? → A: Reutilizar la identidad de `./marketing` (cartoon/pop "caramelo", paleta y mascot ya definidos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Circuito más rico y variedad de obstáculos deterministas (Priority: P1)

Como jugador quiero recorrer un circuito más largo y variado, con más plataformas, huecos y
rampas y **varios tipos de obstáculo en movimiento** (no solo el vaivén actual), de modo que
el reto sea mayor y cada obstáculo tenga un comportamiento legible y justo: al contacto me
empuja, me frena o me tira, pero siempre de forma predecible y reproducible.

**Why this priority**: Es la rebanada de mayor valor jugable y se apoya directamente en el
núcleo ya validado (control de la cápsula). Es además la parte más delicada para el Principio
II: cada obstáculo nuevo debe ser determinista. No depende del pipeline de arte, así que
entrega valor por sí sola y puede construirse primero (Principio IV).

**Independent Test**: Jugar el circuito con los nuevos obstáculos y comprobar que cada uno
empuja/frena/tira de forma predecible; correr el test de determinismo ampliado y verificar
que la trayectoria es idéntica a 30/60/144 FPS y con jitter, a igual número de pasos.

**Acceptance Scenarios**:

1. **Given** el circuito cargado, **When** el jugador lo recorre, **Then** encuentra al menos
   3 tipos nuevos de obstáculo en movimiento además del vaivén actual, cada uno con un
   comportamiento legible y justo (empuje/freno/tirón) y una trayectoria reproducible.
2. **Given** la misma secuencia de input, **When** se ejecuta a 30 y a 144 FPS, **Then** cada
   obstáculo produce la misma trayectoria y el recorrido resultante del jugador es idéntico a
   igual número de pasos (el test de determinismo sigue en verde, sin cambios de tolerancia).
3. **Given** un obstáculo en movimiento contacta al jugador, **When** lo empuja contra una
   pared o rampa, **Then** el jugador no atraviesa la geometría (sin tunneling) y desliza de
   forma estable.
4. **Given** el circuito más denso, **When** el jugador toma el atajo arriesgado opcional,
   **Then** dispone de una ruta alternativa de mayor riesgo sin romper las reglas de
   cronómetro ni de respawn.

---

### User Story 2 - Identidad visual 2D del escenario (Priority: P2)

Como jugador quiero que el escenario se vea bien: un entorno con identidad (cielo/fondo,
materiales diferenciados para plataformas, rampa y muros, señalización clara de salida y meta,
HUD estilizado), no cajas grises, para que el circuito tenga carácter y se lea con claridad
hacia dónde voy.

**Why this priority**: Convierte las cajas grises en una escena con identidad y es lo primero
que percibe el jugador del "vestido gráfico". Vive por completo en la capa de vista, así que
no toca la simulación. Depende de fijar la dirección de arte (ver clarificación).

**Independent Test**: Cargar la escena y comprobar que hay cielo/fondo, materiales
diferenciados, y señalización visible de salida y meta; HUD coherente con la identidad; y que
el test de determinismo sigue en verde (la capa visual no altera la trayectoria).

**Acceptance Scenarios**:

1. **Given** la escena cargada, **When** el jugador mira alrededor, **Then** ve un cielo/fondo,
   materiales diferenciados en plataformas/rampa/muros y señalización estilizada, no cajas
   grises sin textura.
2. **Given** el jugador arranca, **When** busca la salida y la meta, **Then** ambas son
   claramente identificables mediante señalización visible.
3. **Given** los assets visuales presentes, **When** corre la simulación, **Then** el
   determinismo no se ve afectado (los assets viven solo en la capa de vista).
4. **Given** un asset visual no carga, **When** se renderiza la escena, **Then** se usa una
   apariencia de reserva y el juego continúa sin fallo ni no-determinismo.

---

### User Story 3 - Mallas 3D low-poly: props, obstáculos y (opcional) personaje (Priority: P3)

Como jugador quiero que el entorno, los obstáculos y, opcionalmente, el personaje tengan una
representación visual con más carácter mediante mallas low-poly coherentes, manteniendo la
lectura clara de hacia dónde voy y qué me puede golpear.

**Why this priority**: Aporta carácter y remate visual sobre la identidad 2D. Vive por
completo en la capa de vista. Depende de la dirección de arte (US2) y de decidir si el
personaje recibe malla propia (ver clarificación).

**Independent Test**: Comprobar que hay props decorativos low-poly coherentes; que las mallas
de los obstáculos siguen la pose interpolada de la simulación alineadas a sus colliders
primitivos sin desincronización perceptible; y que se mantienen ≥60 FPS con los assets
cargados.

**Acceptance Scenarios**:

1. **Given** el entorno, **When** el jugador mira alrededor, **Then** ve props decorativos
   low-poly (vallas, banderines, conos, rocas, vegetación estilizada) que visten la escena de
   forma coherente.
2. **Given** un obstáculo en movimiento, **When** se mueve, **Then** su malla visual sigue la
   pose interpolada de la simulación, alineada a su collider primitivo, sin desincronización
   perceptible.
3. **Given** las mallas cargadas, **When** el jugador colisiona con un obstáculo, **Then** la
   colisión se resuelve contra el collider primitivo (la malla es decoración, nunca geometría
   de colisión).
4. **Given** todas las mallas cargadas, **When** se juega, **Then** el juego mantiene ≥60 FPS.

---

### Edge Cases

- **Asset ausente o que no carga**: la escena debe usar una apariencia de reserva (material
  sólido / primitiva sin decorar) y continuar sin fallo ni no-determinismo.
- **Tiempos de carga largos**: la carga ocurre fuera del paso fijo y antes de que arranque el
  juego; nunca bloquea ni introduce no-determinismo en la simulación.
- **Plataforma móvil que transporta al jugador**: caso conflictivo con el controlador
  cinemático (ver clarificación sobre plataformas portantes y rapier.js #488).
- **Desincronización malla/collider** a alta velocidad o con jitter: la malla visual debe
  seguir la pose interpolada de la simulación, sin separarse del collider de forma perceptible.
- **Obstáculo que empuja al jugador contra una pared**: debe mantenerse el suelo de corrección
  de colisiones (sin tunneling, deslizamiento estable).
- **Caída de FPS con todos los assets cargados**: debe existir una vía de reserva de
  rendimiento (ver Assumptions sobre el modo "solo primitivas").

## Requirements *(mandatory)*

### Functional Requirements

**Gameplay — circuito y obstáculos (US1)**

- **FR-001**: El circuito DEBE ofrecer al menos 3 tipos nuevos de obstáculo en movimiento
  además del vaivén actual, cada uno con un comportamiento legible y justo (empuje, freno o
  tirón) y predecible al contacto.
- **FR-002**: La trayectoria de cada obstáculo en movimiento DEBE ser una función pura del
  tiempo de simulación (determinista), consumida dentro del paso fijo y no por fotograma.
- **FR-003**: El circuito DEBE ser más largo y variado (más tramos, plataformas, huecos y
  rampas) e incluir al menos un atajo/bifurcación arriesgado opcional.
- **FR-004**: Se DEBEN conservar sin cambios las mecánicas ya validadas: cronómetro (arranca
  al primer input, para en meta), respawn al caer (sin checkpoints), reinicio en cualquier
  fase y cámara orbital en tercera persona.
- **FR-005**: La verificación de determinismo DEBE seguir en verde sin cambios de tolerancia,
  y los obstáculos nuevos DEBEN quedar cubiertos por dicha verificación.
- **FR-006**: La colisión DEBE seguir resolviéndose sobre primitivas (el controlador choca y
  desliza contra cuboides y cápsula); NO se introduce colisión basada en mallas.
- **FR-007**: Las plataformas móviles PUEDEN ser portantes (el jugador viaja sobre ellas)
  **solo en movimiento horizontal**; el transporte vertical (plataformas que suben/bajan bajo
  los pies) queda EXCLUIDO para evitar el hundimiento/rebote del controlador cinemático
  (rapier.js #488). El arrastre horizontal que la plataforma aplica al jugador se resuelve
  dentro del paso fijo, de forma determinista.

**Identidad visual 2D (US2)**

- **FR-008**: La escena DEBE presentar una identidad visual (cielo/fondo, materiales
  diferenciados para plataformas, rampa y muros, y señalización) en lugar de cajas grises sin
  textura, reutilizando la **dirección de arte de `./marketing`**: estilo cartoon/pop
  "caramelo", paleta cielo `#7EC8F3` / naranja `#FF7A1A` / teal `#2FD4C4` / rosa `#FF5FA2` /
  oro `#D4AF37` / tinta `#14233B`, coherente con el mascot y los props ya existentes.
- **FR-009**: La salida y la meta DEBEN ser claramente identificables mediante señalización
  visible.
- **FR-010**: El HUD y el banner de meta DEBEN presentarse con un estilo coherente con la
  identidad visual de la escena.

**Mallas 3D low-poly (US3)**

- **FR-011**: El entorno DEBE poder decorarse con props low-poly coherentes (p. ej. vallas,
  banderines, conos, rocas, vegetación estilizada).
- **FR-012**: Las mallas visuales de los obstáculos (y del jugador, si aplica) DEBEN seguir la
  pose interpolada de la simulación, alineadas a sus colliders primitivos, sin
  desincronización perceptible.
- **FR-013**: Las mallas visuales DEBEN ser decoración alineada a los colliders y NUNCA
  usarse como geometría de colisión.
- **FR-014**: El personaje DEBE representarse con una malla low-poly del mascot (la identidad
  ya existente en `./marketing`) que sustituya visualmente a la cápsula. El collider del
  jugador SIGUE siendo una cápsula; la malla es vista pura que sigue la pose interpolada de la
  simulación. Si la malla no carga, se usa la apariencia de reserva (cápsula/primitiva).

**Frontera y ajuste (transversal a US1–US3)**

- **FR-015**: La simulación DEBE permanecer headless: el núcleo de simulación NO importa la
  capa de render ni carga assets visuales; todo lo visual (mallas, texturas, fondo, carga de
  assets) vive en la capa de vista y no entra en la simulación.
- **FR-016**: La carga de assets NO DEBE bloquear ni introducir no-determinismo en el paso
  fijo; ocurre fuera de la simulación y antes de que el juego sea jugable.
- **FR-017**: Todos los valores de ajuste nuevos (velocidades y amplitudes de obstáculos,
  parámetros del circuito, etc.) DEBEN vivir como parámetros con nombre en el único lugar de
  ajuste, sin números mágicos dispersos.

### Key Entities

- **Obstáculo**: elemento del circuito que afecta al jugador. Tiene un *collider primitivo*
  (geometría de colisión), una *trayectoria* como función pura del tiempo de simulación, y una
  *malla visual* opcional alineada al collider e interpolada para el render.
- **Tramo de circuito**: sección del recorrido (plataformas, huecos, rampas), con su variante
  principal y, donde aplique, un atajo arriesgado opcional.
- **Asset visual**: recurso de la capa de vista. Dos clases: *imagen 2D* (fondo/cielo,
  textura/material, señalización, arte de HUD) y *malla 3D low-poly* (props, obstáculos,
  opcional personaje). Vive solo en render; nunca en la simulación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El circuito presenta al menos 3 comportamientos nuevos de obstáculo en
  movimiento además del existente, cada uno reproducible de forma idéntica entre ejecuciones
  con el mismo input.
- **SC-002**: La verificación de determinismo pasa sin cambios de tolerancia a 30/60/144 FPS y
  con jitter: la misma entrada produce la misma trayectoria con independencia de los FPS (la
  capa visual no altera la trayectoria).
- **SC-003**: En la prueba de juego manual, la escena se lee como un entorno diseñado (cielo,
  materiales, props, señalización) con salida y meta claramente identificables, no como cajas
  grises.
- **SC-004**: Las representaciones visuales del jugador y de los obstáculos siguen la pose de
  la simulación sin desincronización perceptible respecto a sus colliders durante el juego
  normal.
- **SC-005**: Se mantienen ≥60 FPS en un navegador de escritorio típico con todos los assets
  cargados; los tiempos de carga son razonables y los assets están listos antes de jugar.
- **SC-006**: Se conserva el suelo de corrección de colisiones (sin tunneling, deslizamiento
  estable) incluso cuando un obstáculo en movimiento empuja al jugador contra una pared.
- **SC-007**: No hay regresión en la sensación de control validada en el MVP (Principio I): el
  vestido gráfico y los obstáculos nuevos no degradan la respuesta del personaje.

## Assumptions

**Defaults adoptados ante detalles no especificados (ajustables en `/speckit-clarify`)**

- **Tipos de obstáculo (FR-001)**: candidatos por defecto entre los que elegir ≥3: barra/brazo
  giratorio, péndulo de vaivén perpendicular, empujador alternante y rodillo. El conjunto
  final exacto se afina en diseño/playtest.
- **Cifras de ajuste**: las magnitudes concretas (velocidades, amplitudes, longitudes,
  presupuesto de polígonos y peso de texturas) son ajuste por playtest, no parte de la spec; el
  presupuesto se mantiene acotado a propósito (es low-poly).
- **Distribución de assets**: los assets se versionan en el repo o se cargan estáticamente; no
  hay backend. Carga en runtime en la capa de vista al arrancar, antes de jugar.
- **Modo de reserva de rendimiento/robustez**: se asume disponible una apariencia de reserva
  (materiales sólidos sobre las primitivas) cuando un asset falta o no carga, que también sirve
  como vía "solo primitivas" si el rendimiento cae. La existencia de este modo de reserva puede
  reconsiderarse en clarificación.
- **Out of Scope (se mantiene salvo enmienda aparte)**: audio, multijugador o red, menús,
  progresión/desbloqueos, varios niveles independientes y colisión basada en mallas (collmesh).

**Dependencias**

- **Gobernanza (bloqueante para implementar)**: la implementación requiere enmendar antes la
  constitución (Principio III y la restricción "solo primitivas; sin modelos 3D") para permitir
  mallas/texturas decorativas en la capa de render, preservando el Principio II (determinismo),
  la frontera headless de la simulación, la colisión sobre primitivas y la centralización del
  ajuste. Hasta esa enmienda, esta spec puede clarificarse y planificarse, pero no implementarse.
- **Generación de assets (fase de implementación)**: las imágenes 2D se generan con un modelo
  externo de generación de imagen (gpt-image-2 de OpenAI; credencial `OPENAI_API_KEY` en el
  `.env` **local** del repo, gitignored); las mallas 3D low-poly con un servicio externo de
  generación 3D (Meshy, autenticado vía su servidor MCP, formato por defecto GLB).
  **Referencia de arte**: `./marketing` (paleta, mascot y props ya existentes: pendulum,
  cannon, ramp, finish). Estos detalles son de implementación y no condicionan los requisitos
  ni los criterios de éxito anteriores.
- **Núcleo validado (Feature 001)**: se reutiliza tal cual el paso fijo determinista, el
  controlador de la cápsula, la cámara orbital, el cronómetro y el respawn.
