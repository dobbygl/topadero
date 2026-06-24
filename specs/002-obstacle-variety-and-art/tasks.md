---
description: "Task list — Topadero Feature 002 (variedad de obstáculos y vestido gráfico)"
---

# Tasks: Topadero — Variedad de obstáculos y vestido gráfico

**Input**: Design documents from `specs/002-obstacle-variety-and-art/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (verificados de forma adversarial)
**Status**: Pendiente de implementación. El código de 001 YA EXISTE; esta feature MODIFICA los archivos existentes y CREA solo los nuevos (`src/render/assets.ts`, assets bajo `public/assets/`).

**Tests**: Por la constitución (Principio II, NO NEGOCIABLE), el ÚNICO test automático obligatorio es la **puerta de determinismo / independencia de FPS** (`tests/determinism.test.ts`), que **crece por historia** e incluye en 002 un caso de **transporte sobre plataforma portante** (misma distancia a 30 y 144). El resto de tests son OPCIONALES y no se generan. La puerta principal de cada historia es la **prueba de juego manual** del `quickstart.md`.

**Organization**: Tareas agrupadas por historia (P1 → P2 → P3), rebanadas verticales jugables (Principio IV). Foundational hace el **refactor de forma** (Transform pasa a quaternion, `obstacleBase` único pasa a `obstacles[]`, despacho `pose`/`velocity` por tipo) dejando vivo solo el comportamiento `oscillate` de 001, para que el proyecto quede compilando y con la puerta de determinismo en VERDE antes de añadir comportamientos. Cada historia añade su capa **encima** de esa forma; las tareas US no rehacen el refactor, lo extienden (deps apuntan a las tareas Foundational correspondientes).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencia pendiente del mismo grupo)
- **[Story]**: `[US1]`/`[US2]`/`[US3]`; Setup/Foundational/Polish sin etiqueta
- Rutas exactas en cada tarea de código; las tareas-puerta (prueba de juego, rendimiento) referencian la sección del `quickstart.md` que validan
- Las tareas de generación de assets (Meshy / gpt-image-2) deben CONFIRMAR coste/credenciales antes de ejecutar, usar `./marketing` como referencia de arte y leer la clave del `.env` LOCAL del repo

## Path Conventions

Proyecto único de frontend: `src/`, `tests/` en la raíz; assets estáticos en `public/assets/` (los sirve Vite, ya con `base: './'` apto para GitHub Pages). Frontera clave NO NEGOCIABLE: `src/sim/` es núcleo **headless**; no importa Three.js ni assets ni toca el DOM (FR-015). Esa pureza es lo que hace ejecutable el test en Node.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la raíz de assets estáticos. No hace falta tocar `package.json` (GLTFLoader/TextureLoader vienen con `three ^0.184` vía `three/addons/*`) ni `vite.config.ts` (ya sirve `public/` con `base: './'`).

- [X] T001 CREAR `public/assets/` con `public/assets/.gitkeep` como raíz de assets estáticos servidos por Vite (skybox, texturas, `*.glb`). El `.gitkeep` hace rastreable la carpeta aunque empiece vacía; los assets se versionan aquí (van commiteados por diseño, NO añadir regla de `.gitignore` para ellos). `.env`/`.env.*` ya están ignorados, así que la `OPENAI_API_KEY` local queda fuera de git. Sin tocar código fuente

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor de forma compartido por US1 y US3 (vía Polish): Transform pasa a quaternion, `obstacleBase` único pasa a `obstacles[]`, `pose`/`velocity` despachan por tipo, los getters devuelven arrays con quaternion y el render interpola con slerp. Solo se conserva vivo el comportamiento `oscillate` de 001; los demás tipos quedan como stub (guard/throw) que US1 implementa. La fase deja el proyecto COMPILANDO y la puerta de determinismo en VERDE.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta completar esta fase, incluida su tarea-puerta de determinismo (T010).

- [X] T002 MODIFICAR `src/types.ts`: añadir `export type ObstacleKind = 'oscillate' | 'rotateBar' | 'pendulum' | 'pusher' | 'carry'` (data-model). Cambiar `Transform` de `{ position: Vec3; rotationY: number }` a `{ position: Vec3; quaternion: { x: number; y: number; z: number; w: number } }` (quaternion PLANO, NUNCA `THREE.Quaternion`: `types.ts` lo comparte el núcleo headless). `StepInput`, `PlayerStateView` y `RunStateView` sin cambios. Es el cambio raíz que rompe firmas aguas abajo; va primero (data-model § Transform; contracts/simulation-api.md R1)
- [X] T003 [P] MODIFICAR `src/circuit.ts`: sustituir el campo singular `obstacleBase: Vec3` de `CircuitDefinition` por `obstacles: ObstacleDef[]`. Definir AHORA los TIPOS de la unión discriminada: `ObstacleDefBase { id; kind: ObstacleKind; base: Vec3; color: number; meshUrl?: string }` (con `color`/`meshUrl` visual-only ignorados por `sim/`), las variantes por tipo y `CarryingPlatformDef extends ObstacleDefBase { kind:'carry'; halfExtents: Vec3; axis:'x'|'z' }`. En el dato `circuit`, migrar el obstáculo existente a UNA sola instancia `kind:'oscillate'` (base = el antiguo `obstacleBase` `{x:0,y:3,z:-31}`); NO añadir instancias de los demás tipos ni alargar el circuito (eso es US1). Opcional: `meshUrl?`/`texture?` visual-only en `StaticBox` (depende de T002)
- [X] T004 [P] MODIFICAR `src/sim/movingObstacle.ts`: generalizar las funciones PURAS. Sustituir `obstaclePosition(base,t,config)` por `pose(def: ObstacleDef, simTime, config) -> { position: Vec3; quaternion: {x,y,z,w} }` (dispatch sobre `def.kind`) y `obstacleVelocity(t,config)` por `velocity(def, simTime, config) -> { linear: Vec3; angular?: Vec3 }`, sin Three ni assets. Implementar SOLO la rama `oscillate` (migrada del seno actual en X; quaternion identidad `{0,0,0,1}`); las ramas `rotateBar`/`pendulum`/`pusher`/`carry` quedan como guard/throw 'no implementado en Foundational' hasta US1. NO codificar el knockback tangencial (US1) (R1; depende de T002)
- [ ] T005 [P] MODIFICAR `src/config.ts`: reorganizar el bloque '--- Obstáculo móvil ---' para admitir parámetros POR TIPO (sub-objetos `oscillate`, `rotateBar`, `pendulum`, `pusher`, `carry`), conservando los valores actuales del vaivén (`obstacleAmplitude` 4.5, `obstacleSpeed` 1.6, `halfExtents`, `knockback*`, `contactPrediction`) bajo la clave `oscillate`. Añadir secciones placeholder (comentadas o neutras) para portantes y presupuesto de assets, sin números mágicos dispersos (Principio V/FR-017). NO afinar magnitudes de los tipos nuevos (US1) ni rutas de assets (US2) (depende de T002)
- [X] T006 MODIFICAR `src/sim/simulation.ts` (convergencia del refactor, HEADLESS, cero imports de Three/assets): sustituir el único `obstacleBody`/`prevObstaclePos` por un array `{ body: RAPIER.RigidBody (kinematicPositionBased); def: ObstacleDef }[]` creado iterando `circuit.obstacles` (collider primitivo por tipo; solo `oscillate` vivo). En `step()`: capturar `prevObstaclePoses[]`; por cada obstáculo programar `pose(def, t+dt)` con `setNextKinematicTranslation` Y `setNextKinematicRotation`; mantener el knockback existente del `oscillate`. Getters: `getObstacleTransforms()` y `getPreviousObstacleTransforms()` devuelven `Transform[]` (orden de `circuit.obstacles`) con quaternion; `getPreviousPlayerTransform()` convierte `facingYaw` a quaternion de eje Y con MATEMÁTICA PLANA (sin Three) en la frontera de lectura. Adaptar `reset()`/`capturePrev()` a N obstáculos. NO integrar delta de portante ni knockback tangencial (US1) (contracts/simulation-api.md, orden de step; depende de T002, T003, T004, T005)
- [X] T007 [P] MODIFICAR `src/render/scene.ts`: leer el ARRAY de obstáculos. Sustituir el `obstacleMesh` único por una lista de mallas recorriendo `circuit.obstacles` (`BoxGeometry`/color por instancia; sin assets todavía). En `updateDynamic(...)` aceptar arrays `prevObstacles: Transform[]` / `curObstacles: Transform[]` e, por cada obstáculo, interpolar posición con lerp y aplicar rotación por SLERP del quaternion (`THREE.Quaternion.slerpQuaternions`); el slerp vive SOLO aquí, en render. Actualizar la cápsula del jugador para leer el quaternion del Transform en vez de `rotationY`. Sin texturas/skybox/mallas GLB (US2/US3) (R1 slerp; depende de T006)
- [X] T008 [P] MODIFICAR `tests/determinism.test.ts`: migrar la FORMA al modelo de N obstáculos con quaternion, manteniendo verdes los 4 escenarios de 001 sin tocar la tolerancia (`FLOAT_EPSILON`). (a) Ampliar el vector de estado canónico para iterar `getObstacleTransforms()` (todos los obstáculos) incluyendo las componentes del quaternion, no solo `[0].position`. (b) Migrar el caso de pureza (actuales líneas 131-141) que llama `obstaclePosition`/`obstacleVelocity` a las nuevas firmas `pose(def,...)`/`velocity(def,...)` para el def `oscillate` migrado. Esta tarea es la ÚNICA dueña de la migración del plumbing del test; los casos por tipo nuevo y de transporte llegan en US1 (T017) de forma aditiva. NO añadir casos por tipo ni de transporte aquí (depende de T006)
- [X] T009 MODIFICAR `src/main.ts`: actualizar el cableado para el cambio de forma (si no, no compila ni pasa build/CI). En `frame()`, sustituir `getPreviousObstacleTransforms()[0]`/`getObstacleTransforms()[0]` por los arrays completos y pasarlos a `view.updateDynamic(...)`; construir el Transform del jugador con quaternion (eje Y desde `facingYaw`) en vez de `{ rotationY: ps.facingYaw }`. NO añadir `await loadAssets()` todavía (US2/FR-016) (depende de T006, T007)
- [X] T010 TAREA-PUERTA de determinismo (Principio II, NO NEGOCIABLE): ejecutar `npx vitest run tests/determinism.test.ts` y verificar VERDE a las 4 cadencias (60 / jitter 5-40-8 / 30 / 144) con igualdad EXACTA a igual nº de pasos (`FLOAT_EPSILON`), sin cambios de tolerancia. Confirmar además que el test CARGA en Node (frontera headless intacta: `src/sim/` sin imports de Three/asset). Foundational muta toda la superficie del Principio II (Transform quaternion, getters de array, API `pose`/`velocity`, cableado), así que debe cerrar en verde antes de abrir cualquier historia (depende de T006, T007, T008, T009)

**Checkpoint**: refactor de forma listo — el proyecto compila, el `oscillate` sigue jugable end-to-end y la puerta de determinismo está en VERDE. Solo entonces empiezan las historias.

---

## Phase 3: User Story 1 — Variedad de obstáculos y circuito más rico (Priority: P1) 🎯 MVP

**Goal**: Añadir ≥3 tipos nuevos de obstáculo (barra giratoria, péndulo, empujador) sobre el vaivén, plataformas portantes horizontales que transportan al jugador, y un circuito más rico (8-12 tramos con un atajo arriesgado opcional). Todo se valida con primitivas, sin un solo asset.

**Independent Test**: con la forma de Foundational ya en su sitio, recorrer el circuito enriquecido y comprobar que cada tipo nuevo empuja/frena/tira de forma legible y determinista, que la plataforma portante transporta y suelta limpio, y que empujar contra una pared no produce tunneling (quickstart P1). La puerta automática (determinismo) crece con casos por tipo + transporte + pureza.

> US1 EXTIENDE la forma de Foundational; no rehace el refactor. Las firmas `pose`/`velocity`, el Transform con quaternion, `obstacles[]` y el cableado de `main.ts` YA EXISTEN desde la fase Foundational.

- [X] T011 [P] [US1] MODIFICAR `src/config.ts`: añadir los parámetros con nombre de los 3 tipos nuevos y de las portantes (Principio V; FR-017) bajo las claves por tipo ya creadas en Foundational. Barra giratoria (velocidad angular Y, longitud/halfExtents del brazo, sentido), péndulo (longitud, amplitud angular, velocidad angular en X, halfExtents de la masa), empujador (carrera/amplitud Z, periodo/velocidad, halfExtents) y portante (amplitud y velocidad de traslación horizontal, banda Y del test de cara superior `carrySupportBandY`). Knockback: factores de las variantes push/throw/brake (p. ej. `knockbackThrowStrength`, `brakeFactor`) reutilizando `knockbackMax`/`knockbackDecay`. Conservar los del vaivén por compatibilidad. NINGÚN número mágico nuevo fuera de aquí (depende de T005)
- [X] T012 [US1] MODIFICAR `src/circuit.ts`: poblar el circuito enriquecido (FR-003). Sobre los tipos de la unión ya definidos en Foundational, instanciar en `obstacles[]` el vaivén actual + barra giratoria + péndulo + empujador + al menos una plataforma portante horizontal (`kind:'carry'`, `axis:'x'|'z'`), y alargar el circuito a ≈8-12 tramos (plataformas, huecos, rampas) con al menos un atajo/bifurcación arriesgado opcional. Aquí solo id/kind/base/eje/longitud/fase por instancia; las magnitudes viven en config (T011). NO redefinir los tipos (ya están en Foundational) (depende de T003, T011)
- [X] T013 [P] [US1] MODIFICAR `src/sim/movingObstacle.ts`: implementar las ramas que Foundational dejó como stub, funciones PURAS sin Three ni estado oculto (sin `Date.now`/`Math.random`). `rotateBar` (rotación alrededor de Y: quaternion de eje Y a partir de ω·t; velocidad angular Y), `pendulum` (arco alrededor de X: ángulo = amplitud·sin(ω·t), quaternion de eje X; velocidad angular X), `pusher` (traslación alternante en Z: posición senoidal/triangular determinista; velocidad lineal Z), `carry` (traslación horizontal en `axis` x|z; quaternion identidad; velocidad lineal en el eje). Mantener exportadas las formas usables por el test para pureza/derivada (FR-001/FR-002, invariante 6; depende de T004, T011, T012)
- [X] T014 [P] [US1] MODIFICAR `src/sim/player.ts`: en `stepPlayer` aceptar un delta horizontal de plataforma portante y sumarlo al desplazamiento deseado ANTES de `computeColliderMovement` (R-carry: el transporte se integra dentro del paso fijo, no por fotograma). Añadir parámetro `carryDelta: Vec3` (o {x,z}) a la firma; sumar `carryDelta.x`/`carryDelta.z` a `desired.x`/`desired.z` junto a input+knockback. Añadir la variante de knockback 'brake' como escalado (`brakeFactor`<1 de config) sobre la velocidad horizontal de input (moveX/moveZ se recomputan cada paso, por eso el freno se aplica aquí, no en `simulation.ts`); push/throw siguen alimentándose por `knockbackX/Z`. NO usar consultas de contacto de Rapier; el delta llega ya calculado desde `simulation.ts`. Sigue headless (R-carry, SC-006, invariante 7; depende de T011)
- [X] T015 [US1] MODIFICAR `src/sim/simulation.ts` (el integrador, reúne toda la cadena): (1) crear el collider primitivo correcto por cada tipo nuevo desde `circuit.obstacles[]` (cuboide alargado para barra, masa para péndulo, cuboide para empujador, cuboide para portante), reutilizando el array de cuerpos de Foundational. (2) En `step()`, para los tipos nuevos `pose(def, t+dt)` -> `setNextKinematicTranslation` + `setNextKinematicRotation`. (3) Knockback por obstáculo con variantes push/throw/brake; para barra y péndulo derivar dirección/magnitud de la velocidad TANGENCIAL (ω × r) en el punto de contacto, reutilizando `knockbackX/Z` y respetando `knockbackMax`. (4) Soporte de portante: test AABB de cara superior determinista (pies del jugador dentro de XZ + banda Y sobre la cara superior, apoyado/descendente) sobre la pose ANTERIOR del jugador; si soporta, `delta = pose(t+dt).position − pose(t).position` horizontal y pasarlo a `stepPlayer(..., carryDelta)`; soltar cuando el AABB falle; reutilizar `inAABB` de `zones.ts`. (5) SEAM DE TEST: parámetro opcional `circuitDef` en `static create(config = defaultConfig, circuitDef: CircuitDefinition = circuit)` para inyectar circuitos mínimos aislados; backward-compatible. Mantener el orden de `step()` del contrato (capturar previos -> restart -> programar N obstáculos -> knockback -> soporte portante -> stepPlayer -> world.step() -> crono/meta/respawn). Sigue sin importar Three ni assets (R1, R-carry; depende de T006, T012, T013, T014)
- [X] T016 [P] [US1] MODIFICAR `src/render/scene.ts`: crear una malla primitiva por cada obstáculo nuevo de `circuit.obstacles[]` (`BoxGeometry` según halfExtents/longitud por tipo + color de la def; SIN assets/texturas/GLB aquí), reutilizando el camino de interpolación lerp+SLERP que Foundational ya añadió. La escena es vista pura: lee del seam, no escribe en él (FR-012/SC-004 sin desincronización; depende de T007, T015)
- [X] T017 [US1] MODIFICAR `tests/determinism.test.ts` (crece de forma ADITIVA sobre el plumbing ya migrado en Foundational; NO reconcilia nada: el vector de estado de N obstáculos+quaternion y la API `pose`/`velocity` ya están en el test). Sobre las 4 cadencias (60 / jitter 5-40-8 / 30 / 144) con igualdad EXACTA a igual nº de pasos (`FLOAT_EPSILON`): (a) un caso por tipo NUEVO (barra giratoria, péndulo, empujador) que mida el efecto en la trayectoria del jugador, usando el seam `Simulation.create(config, circuitDef)` con un circuito mínimo aislado (suelo + 1 obstáculo) por caso para garantizar contacto determinista. (b) un caso de TRANSPORTE sobre plataforma portante horizontal: jugador apoyado recorre la MISMA distancia a 30 y a 144 (invariante 7). (c) pureza de `pose()`/`velocity()` por tipo (misma simTime -> misma pose; sin estado oculto), llamando a las funciones directamente. Conservar verdes los 4 escenarios de 001. Sin cambios de tolerancia (R5, NO NEGOCIABLE; depende de T013, T014, T015)
- [ ] T018 [US1] TAREA-PUERTA: prueba de juego manual del checklist P1 de `quickstart.md` (sin un solo asset). Verificar: ≥3 tipos nuevos en movimiento además del vaivén, cada uno empuja/frena/tira de forma legible y predecible; plataforma portante horizontal transporta al subirse y suelta limpio al bajarse (sin hundimiento ni rebote, no hay portantes verticales); un obstáculo empuja al jugador contra una pared sin tunneling y desliza estable; existe al menos un atajo arriesgado opcional que no rompe cronómetro ni respawn; el control se siente igual o mejor que el MVP (Principio I, sin stutter, slerp activo). Confirmar `npm test` en VERDE (puerta del Principio II, T017). Si la puerta de determinismo o la sensación fallan, la rebanada P1 NO está terminada (depende de T017)

**Checkpoint**: US1 plenamente funcional y testable por sí sola (MVP) — variedad de obstáculos y portantes con primitivas, puerta de determinismo en verde.

---

## Phase 4: User Story 2 — Identidad visual 2D (Priority: P2)

**Goal**: Vestir la escena con cielo/fondo, materiales texturizados diferenciados (plataformas/rampa/muros), señalización visible de salida y meta, y un HUD coherente con la identidad de `./marketing`, con reserva a primitiva por recurso si un asset falta. El arte NO toca la trayectoria.

**Independent Test**: arrancar y ver una escena que se lee como entorno diseñado (cielo, materiales, señalización), HUD con la identidad, y al forzar un fallo de carga la escena cae a primitiva sin romper el juego ni el determinismo (quickstart P2). SC-002/SC-003.

> La carga es asíncrona y ocurre ANTES de jugar (FR-016): ninguna latencia entra en el paso fijo.

- [X] T019 [P] [US2] MODIFICAR `src/config.ts`: añadir SOLO cifras de ajuste visual 2D (Principio V): repetición/tiling de texturas por superficie (p. ej. `textureRepeat`), tamaños/escala de los marcadores de señalización de salida y meta, y presupuesto orientativo de assets 2D (máx. lado de textura ≤1024, skybox ligero, R6). NO meter rutas de archivo aquí: las rutas (`skyboxUrl`, `texture`) son campos visual-only y viven en `circuit.ts` (FR-017)
- [X] T020 [P] [US2] MODIFICAR `src/circuit.ts`: añadir campos VISUAL-ONLY (los lee solo `render/`, `sim/` los ignora igual que `StaticBox.color`): (a) en `CircuitDefinition` un opcional `theme?: { palette: {...colores de ./marketing}; skyboxUrl?: string }`; (b) en `StaticBox` un opcional `texture?: string` (ruta a `public/assets/`) por tipo de superficie (platform/ramp/wall); (c) `signageUrl?: string` visual-only en `ZoneDef` para la señalización de start/finish (FR-009). Rellenar la paleta cartoon de `./marketing` (cielo #7EC8F3 / naranja #FF7A1A / teal #2FD4C4 / rosa #FF5FA2 / oro #D4AF37 / tinta #14233B). NO definir rutas concretas de los assets todavía (eso lo hace T024 cuando existan los ficheros) ni tocar la estructura de obstáculos (FR-015)
- [X] T021 [P] [US2] CREAR `src/render/assets.ts` (NUEVO, SOLO render, cero imports alcanzables desde `sim/`): pipeline de carga ASÍNCRONA 2D. Exportar `async function loadAssets(circuit: CircuitDefinition): Promise<AssetCatalog>` y la interfaz `AssetCatalog { textures: Map<string,THREE.Texture>; meshes: Map<string,THREE.Object3D>; skybox?: THREE.Texture; loaded: Map<string,boolean> }`. Implementar SOLO la ruta 2D: cargar texturas y skybox de `circuit.theme`/`StaticBox.texture` con `TextureLoader`; marcar por recurso si cargó o falló (cada fallo -> usar primitiva). Definir el campo `meshes` (Map) en el catálogo pero dejarlo SIN poblar (US3 lo rellena con GLTFLoader sin tocar la firma de `loadAssets()` ni `main.ts`/`scene.ts`). Devolver siempre un catálogo válido aunque falten assets (sin throw que rompa el arranque) (contracts/assets.md, R3)
- [X] T022 [P] [US2] CURAR (reutilizar) los PNG ya existentes de `./marketing/assets/` que cubren necesidades 2D directamente, SIN llamar a ninguna API: copiar `bg-horizontal.png` -> `public/assets/` como fondo/skybox 2D; `prop-finish.png` -> señalización de meta; `logo.png` y/o un mascot -> arte del HUD/banner. Los props de `./marketing` son ilustraciones isométricas, no tileables: sirven como fondo/señalización/HUD, NO como textura de superficie repetible. Escribe SOLO en `public/assets/` (las rutas se registran en `circuit.ts` en T024). Sin coste de API ni dependencia externa
- [X] T023 [US2] GENERAR (solo los huecos que la curación T022 no cubre) imágenes 2D con gpt-image-2 (OpenAI, `OPENAI_API_KEY` del `.env` LOCAL del repo, NO `../allbrands/.env`), usando `./marketing` como referencia de arte: texturas de SUPERFICIE TILEABLES para plataformas/rampa/muros (los props isométricos de marketing no sirven como textura repetible) y señalización de SALIDA (start) si no hay equivalente curado. Salida -> `public/assets/`. CONFIRMAR coste antes de ejecutar cada generación. Respetar el presupuesto 2D de config (≤1024 lado). Escribe SOLO en `public/assets/` (rutas registradas en T024) (depende de T022)
- [X] T024 [US2] MODIFICAR `src/circuit.ts`: registrar las RUTAS concretas de los assets 2D (curados en T022 + generados en T023) en los campos visual-only ya definidos en T020 (`theme.skyboxUrl`, `StaticBox.texture` por superficie, `ZoneDef.signageUrl`). Tarea única dueña de la escritura de rutas en `circuit.ts` para evitar conflicto de mismo-archivo con T020; no redefine tipos (depende de T020, T022, T023)
- [X] T025 [US2] MODIFICAR `src/main.ts`: cablear la carga de assets ANTES de jugar. Tras `await RAPIER.init()` y crear la `Simulation`, hacer `const assets = await loadAssets(sim.getCircuitDefinition())` ANTES de instanciar `SceneView` y arrancar el bucle; pasar `assets` al constructor de `SceneView`. Ninguna latencia de carga entra en el paso fijo. No cambia el contrato del bucle ni la frontera de `sim/` (FR-016, R3; depende de T021, T026)
- [X] T026 [US2] MODIFICAR `src/render/scene.ts`: aplicar identidad visual 2D leyendo el `AssetCatalog` (nuevo parámetro del constructor) y los campos visual-only del circuito. (a) skybox/fondo desde `catalog.skybox` o `circuit.theme` (sustituye el `scene.background = 0x0e0f12` hardcodeado); (b) materiales texturizados diferenciados para plataformas/rampa/muros (`MeshStandardMaterial` con `map` desde `catalog.textures`, tiling de config T019) en el bucle de `circuit.statics`, con RESERVA al color plano actual si la textura no cargó (`catalog.loaded === false`); (c) señalización VISIBLE y estilizada de salida y meta (FR-009) sobre las losas de zona, con reserva a la losa coloreada actual si falta. Mantener las mallas de jugador/obstáculo como están (US1/US3 las visten); NO introducir GLTFLoader aquí (US3). La reserva por recurso es requisito de build, no solo de playtest (FR-008/FR-009, SC-002; depende de T019, T020, T021)
- [X] T027 [P] [US2] MODIFICAR `src/ui/hud.ts` y `index.html`: estilizar HUD y banner de meta coherentes con la identidad de `./marketing` (FR-010). El CSS del HUD vive en el bloque `<style>` de `index.html` (clases `.timer`/`.hint`/`.banner`/`#click-to-play`): aplicar paleta cartoon (tinta #14233B sobre fondo claro / acentos naranja-oro), bordes redondeados y jerarquía de `./marketing`; `hud.ts` ajusta markup/clases si hace falta (sin lógica de juego, sigue leyendo `RunStateView`). SUB-DECISIÓN a resolver y documentar en la tarea: las fuentes de marca (Fraunces / Hanken Grotesk / Spline Sans Mono) NO están cargadas hoy -> o empaquetar `@font-face` desde `public/assets/fonts/`, o aproximar con fuentes del sistema; documentar la elección, no asumir que existen
- [X] T028 [US2] TAREA-PUERTA de no-regresión (Principio II): ejecutar `npx vitest run tests/determinism.test.ts` y verificar que sigue en VERDE a las 4 cadencias tras el vestido 2D. El arte NO toca la simulación, así que esta tarea NO añade casos al test (el crecimiento del test es de US1); su valor es confirmar que (a) ningún cambio de US2 introdujo un import de three/asset alcanzable desde `src/sim/` (eso impediría cargar el test en Node) y (b) la trayectoria no cambió (SC-002; depende de T025, T026, T027)
- [ ] T029 [US2] TAREA-PUERTA: prueba de juego manual del checklist P2 de `quickstart.md`: (1) la escena tiene cielo/fondo, materiales diferenciados en plataformas/rampa/muros y señalización, no cajas grises; (2) salida y meta claramente identificables por señalización visible; (3) HUD coherente con la identidad de `./marketing`; (4) forzar un fallo de carga (renombrar un asset) -> la escena usa reserva primitiva y el juego sigue sin fallo, y el test de determinismo sigue en verde. Valida FR-008..FR-010, SC-003 y el edge case de asset ausente (depende de T028, T022, T023)

**Checkpoint**: US1 y US2 funcionan de forma independiente — la escena se lee como entorno diseñado y la reserva a primitiva funciona al forzar un fallo.

---

## Phase 5: User Story 3 — Mallas low-poly (Priority: P3)

**Goal**: Vestir personaje, obstáculos y entorno con mallas low-poly GLB generadas con Meshy (referencia de arte `./marketing`), alineadas a los colliders primitivos (que NUNCA cambian) y siguiendo la pose interpolada con slerp. Reserva a primitiva por recurso si una GLB falta.

**Independent Test**: con todo cargado, los obstáculos y el mascot se ven como mallas que siguen la pose interpolada sin desincronización a 144 y 30 FPS; el collider del jugador sigue siendo la cápsula; al forzar el fallo de una GLB cae a primitiva; ≥60 FPS en escritorio (quickstart P3). US3 es render-only: el test de determinismo no crece aquí.

- [X] T030 [P] [US3] GENERAR la malla low-poly del MASCOT (personaje) con Meshy vía MCP image-to-3d, sembrada desde una pose de referencia en `marketing/assets/mascot-*.png` (p. ej. `mascot-wave.png`/`mascot-run.png`); formato GLB, `target_formats` GLB fijado en la creación; salida -> `public/assets/mascot.glb`. CONFIRMAR coste en créditos antes de generar (Meshy Rule 1). Malla ESTÁTICA: NO usar `meshy_rig` ni `meshy_animate` (animación riggeada fuera de alcance, Constitution Check III); el mascot seguirá la pose interpolada del jugador (facingYaw->quaternion vía slerp) en render (FR-014)
- [X] T031 [P] [US3] GENERAR las mallas low-poly de los OBSTÁCULOS con Meshy vía MCP (text-to-3d o image-to-3d sembrado desde `marketing/assets/prop-*.png`: prop-pendulum, prop-cannon, prop-ramp, prop-finish), una por tipo del circuito; formato GLB con `target_formats` GLB; salida -> `public/assets/obstacle-oscillate.glb`, `obstacle-rotatebar.glb`, `obstacle-pendulum.glb`, `obstacle-pusher.glb`, `obstacle-carry.glb`. CONFIRMAR coste en créditos antes de CADA generación (Meshy Rule 1). Mallas ESTÁTICAS (sin rig); decoración alineada al collider primitivo, nunca geometría de colisión. Los nombres deben coincidir EXACTAMENTE con los `meshUrl` que escribe T034 y el catálogo que carga T033 (FR-012/FR-013/SC-004)
- [X] T032 [P] [US3] GENERAR mallas low-poly de PROPS decorativos con Meshy vía MCP text-to-3d (vallas, banderines, conos, rocas, vegetación estilizada), coherentes con la paleta cartoon/pop de `./marketing`; formato GLB con `target_formats` GLB; salida -> `public/assets/prop-fence.glb`, `prop-banner.glb`, `prop-cone.glb`, `prop-rock.glb`, `prop-plant.glb`. CONFIRMAR coste en créditos antes de CADA generación (Meshy Rule 1). Mallas estáticas; pura decoración de la escena (NO entran en `CircuitDefinition`) (FR-011)
- [X] T033 [P] [US3] MODIFICAR (EXTENDER) `src/render/assets.ts` y `src/config.ts`: añadir `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`) a la carga asíncrona; cargar las GLB de `public/assets/` (mascot, obstáculos por kind, props) hacia `AssetCatalog.meshes` como `Object3D` clonables, registrando estado de carga por recurso para decidir reserva a primitiva. La URL del MASCOT no es obstáculo, así que NO va en `circuit.ts`: su clave/ruta vive en `assets.ts` o `config.ts` de forma consistente. `assets.ts` ya existe (creado en US2 para texturas/skybox); US3 lo EXTIENDE sin cambiar la firma de `loadAssets()`. SOLO render: NO importar nada en `src/sim/`. El código se escribe contra la API catálogo+fallback y no necesita que existan las GLB todavía (convergen en la puerta T037) (contracts/assets.md)
- [X] T034 [P] [US3] MODIFICAR `src/circuit.ts`: poblar el campo visual-only `meshUrl` en cada obstáculo de `obstacles[]` apuntando a su GLB (`public/assets/obstacle-<kind>.glb`). El tipo `meshUrl?` ya existe en `ObstacleDefBase` desde Foundational; esta tarea solo lo POBLA. Es dato visual-only que solo lee `render/`, igual que `.color`; NO toca `src/sim/` ni la geometría de colisión. Los nombres deben casar con T031 y T033 (data-model.md, assets.md)
- [X] T035 [US3] MODIFICAR `src/render/scene.ts`: enlazar cada obstáculo por id con su malla GLB (clon del catálogo de T033 según `circuit.obstacles[].meshUrl` de T034) y colocarla con la POSE INTERPOLADA existente (`getPreviousObstacleTransforms` + `getObstacleTransforms` + alpha, con lerp de posición y SLERP del quaternion), alineada al collider primitivo sin desincronización. Si la malla falta o no carga (estado del catálogo), reserva a la primitiva actual (`BoxGeometry` + color). NO cambia la colisión (sigue sobre el collider primitivo) (FR-012/FR-013/SC-004; depende de T033, T034)
- [X] T036 [US3] MODIFICAR `src/render/scene.ts`: SUSTITUIR visualmente la cápsula del jugador por un clon de la malla del MASCOT (del catálogo de T033), siguiendo la pose interpolada del jugador (lerp de posición + slerp de `facingYaw` codificado como quaternion de eje Y). El COLLIDER del jugador sigue siendo cápsula; la malla es vista pura. Si la malla no carga, dibujar la cápsula de reserva (apariencia actual). Colocar también los PROPS decorativos (clones de T032) como decoración view-only de la escena (no provienen de `CircuitDefinition`) (FR-014, FR-011; depende de T033, T035)
- [ ] T037 [US3] TAREA-PUERTA: prueba de juego manual del checklist P3 de `quickstart.md`. Verificar: (1) props decorativos low-poly coherentes; (2) las mallas de obstáculos y del mascot SIGUEN la pose interpolada alineadas a sus colliders sin desincronización perceptible, probando a 144 y a 30 FPS; (3) el mascot se ve como malla pero al colisionar la respuesta sigue siendo la de la cápsula (collider); (4) forzar fallo de carga de una GLB -> reserva a primitiva sin fallo; (5) con todo cargado, ≥60 FPS en escritorio (SC-005). El test de determinismo sigue en verde (el arte no toca la trayectoria; no se añaden casos en US3). El fallback a primitiva ya da la vía 'solo primitivas' (depende de T030, T031, T032, T035, T036)

**Checkpoint**: las tres historias funcionan de forma independiente — escena vestida con mallas low-poly que siguen la pose, con reserva a primitiva.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Estabilidad de colisiones, rendimiento con arte cargado y documentación, transversales a las tres historias.

> Polish depende de las tres historias entregadas; su gate de fase es la tarea-puerta final de US3 (T037).

- [ ] T038 MODIFICAR `src/config.ts`: comprobación de estabilidad de colisiones SIN tunneling en los DOS casos de 002, ajustando solo perillas con nombre (Principio V): (a) un obstáculo en movimiento empuja al jugador contra una pared/rampa (SC-006, hereda 001) y (b) NUEVO en 002: el jugador VIAJA sobre una plataforma portante horizontal sin hundirse, rebotar ni colarse al sumar el delta de transporte al KCC (R-carry). Perillas a revisar: `knockbackMax` y los topes de push/throw/brake (R4), la magnitud del knockback TANGENCIAL de barra/péndulo (ω×r, R1), `contactPrediction` (debe ser >= el desplazamiento por paso del obstáculo más rápido y de los rotatorios, ahora que hay varios tipos) y la tolerancia de la banda Y del AABB de cara superior (`carrySupportBandY`). Validar contra `quickstart.md` P1 puntos 3-4. No toca lógica: solo perillas (depende de T037)
- [ ] T039 [P] Comprobar rendimiento ≥ 60 FPS en navegador de escritorio típico con TODOS los assets cargados (skybox, texturas, mallas low-poly de props/obstáculos/mascot), no solo primitivas (SC-005, distinto del SC-008 de 001 que medía solo primitivas). Validar contra `quickstart.md` P3 punto 4. Incluir nota sobre tamaño de bundle/assets frente al presupuesto de arte (R6: props ≲1-2k tris, mallas de obstáculo/personaje ≲3-5k tris, texturas ≤1024², skybox ligero; el bundle ya arrastra Rapier WASM ~2,76 MB, así que el arte debe sumar poco) y confirmar que la vía de reserva 'solo primitivas' sirve como escape de rendimiento si los FPS caen. Mide sobre `public/assets/`; NO modifica simulación. Si la remediación tocara `src/config.ts`, secuenciarla tras T038 por conflicto de archivo (depende de T037)
- [X] T040 [P] MODIFICAR `README.md` y `.specify/memory/constitution.md` para reflejar el alcance de 002. (1) En `README.md`: eliminar/corregir las afirmaciones 'sin modelos 3D', 'solo primitivas' y 'la escena se construye solo con cápsulas, cajas y cilindros' (líneas ~35 y la lista de Características), distinguiendo geometría de COLISIÓN (sigue siendo solo primitivas) de la CAPA DE RENDER (ahora con arte decorativo permitido por la excepción v1.1.0); documentar la variedad de obstáculos (barra giratoria, péndulo, empujador) y las portantes horizontales; mencionar identidad visual 2D, mallas low-poly y mascot, con la reserva a primitiva; repuntar la tabla de Documentación a `specs/002-obstacle-variety-and-art/`. (2) SUB-DECISIÓN del implementador (cierra el follow-up TODO del Sync Impact Report de la constitución): actualizar `README.md` YA satisface el TODO; opcionalmente y de forma defendible, editar `constitution.md` para pasar el marcador '⚠ README.md' a '✅' y eliminar la línea 'Follow-up TODOs: actualizar README.md'. Dejarlo como decisión explícita, no como hueco (depende de T037)
- [ ] T041 Validación completa final (puerta del Principio I + Principio II). (1) Prueba de juego manual de TODO `quickstart.md`: P1 (≥3 tipos nuevos legibles/deterministas + portante horizontal sin hundimiento + sin tunneling al empujar contra pared + atajo arriesgado), P2 (cielo/fondo, materiales diferenciados, señalización de salida/meta, HUD coherente, y fallo de carga de asset -> reserva primitiva sin no-determinismo) y P3 (props low-poly, mallas que siguen la pose interpolada sin desincronización a 144 y 30, mascot con collider cápsula, ≥60 FPS), MÁS la sección 'Regresión' del `quickstart.md`, que debe verificar FR-004 completo de forma EXPLÍCITA: sin doble salto ni salto en el aire (solo apoyado), cámara orbital sin saltos bruscos, cronómetro arranca al primer input y para en meta, respawn al caer sin recargar, reinicio en cualquier fase, slerp/interpolación sin stutter (SC-007). (2) `npm test` en VERDE: la puerta de determinismo a las 4 cadencias (60/jitter/30/144) con igualdad exacta y SIN cambios de tolerancia (FR-005); confirmar que el test CARGA en Node = frontera headless intacta, `src/sim/` sin imports de Three/asset (FR-015). No CREA ni amplía casos de test (esos crecen en US1, T017); aquí solo se EJECUTA la puerta (depende de T038, T039, T040)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **BLOQUEA todas las historias**. Hace el refactor de forma y cierra con la puerta de determinismo en VERDE (T010).
- **Historias (Phase 3–5)**: dependen de Foundational; orden P1 → P2 → P3 (Principio IV: validar cada una antes de la siguiente).
- **Polish (Phase 6)**: depende de las historias entregadas; su gate de fase es T037 (tarea-puerta final de US3).

### User Story Dependencies

- **US1 (P1)**: tras Foundational. EXTIENDE la forma (quaternion, `obstacles[]`, `pose`/`velocity`) sin rehacerla; sus tareas dependen de las tareas Foundational correspondientes (T012→T003, T013→T004, T015→T006, T016→T007, T017 sobre el plumbing de T008). MVP independiente: el refactor ya dejó el `oscillate` jugable.
- **US2 (P2)**: tras US1 (el circuito enriquecido de T012 es lo que se viste). El arte es visual-only; reutiliza la geometría/seam de US1 y no toca la trayectoria.
- **US3 (P3)**: tras US2; extiende `assets.ts`/`scene.ts` (creados/preparados en US2) con mallas GLB. Render-only: el test de determinismo no crece aquí.

> US2 y US3 reutilizan piezas de las anteriores, así que en la práctica se construyen en secuencia (no en paralelo entre historias), como recomienda la constitución.

### Within Each Story

- El test de determinismo crece **tras** la implementación (puerta del Principio II creciendo, no TDD): T008 (migración de forma, Foundational) → T010 (puerta verde de Foundational) → T017 (casos por tipo + transporte + pureza, P1). US2/US3 NO añaden casos: solo no-regresión (T028) y la confirmación final (T041).
- Orden de `step()` (contrato): capturar previos → reinicio opcional → programar N obstáculos → knockback (push/throw/brake, tangencial en rotatorios) → soporte portante (delta horizontal al KCC) → `stepPlayer` → `world.step()` → crono/meta/respawn.
- Validar el checkpoint manual antes de pasar de historia.

### Parallel Opportunities

- **Foundational**: T003 (`circuit.ts`), T004 (`movingObstacle.ts`), T005 (`config.ts`) en paralelo entre sí tras T002 (archivos distintos). Tras T006: T007 (`scene.ts`) y T008 (`tests/determinism.test.ts`) en paralelo (archivos distintos). T009 (`main.ts`) y T010 (puerta) son secuenciales.
- **US1**: T011 (`config.ts`) [P]. T013 (`movingObstacle.ts`) y T014 (`player.ts`) en paralelo entre sí (archivos distintos). T016 (`scene.ts`) [P] respecto al test. T015 (`simulation.ts`) e T017 (test) son los puntos de convergencia.
- **US2**: T019 (`config.ts`), T020 (`circuit.ts`), T021 (`assets.ts`) en paralelo (archivos distintos, deps de Foundational/US1 ya hechas). T022 (curar) y T027 (`hud.ts`+`index.html`) [P]. T024 reúne las rutas en `circuit.ts` (no [P] con T020). T026 (`scene.ts`) no [P]: depende de la API de T021.
- **US3**: T030/T031/T032 (generación de assets, escriben en `public/assets/`) [P] entre sí. T033 (`assets.ts`+`config.ts`) [P] y T034 (`circuit.ts`) [P] (archivos distintos, ninguna otra tarea US3 los toca en paralelo). T035 y T036 comparten `scene.ts` → secuenciales.
- **Polish**: T039 (rendimiento) y T040 (`README.md`/constitución) [P]. T038 toca `config.ts`; si la remediación de T039 tocara `config.ts`, secuenciar tras T038.

---

## Parallel Example: Foundational

```bash
# Tras T002 (Transform quaternion + ObstacleKind en types.ts), en paralelo (archivos distintos):
Task: "MODIFICAR src/circuit.ts (obstacleBase -> obstacles[] + tipos de la unión; solo oscillate vivo)"   # T003
Task: "MODIFICAR src/sim/movingObstacle.ts (pose/velocity por tipo; solo rama oscillate, resto stub)"      # T004
Task: "MODIFICAR src/config.ts (bloque por tipo; valores del vaivén bajo la clave oscillate)"              # T005
# Tras T006 (simulation.ts con N cuerpos), en paralelo:
Task: "MODIFICAR src/render/scene.ts (array de obstáculos + interpolación lerp/slerp)"                     # T007
Task: "MODIFICAR tests/determinism.test.ts (vector de estado de N obstáculos + quaternion; pureza migrada)" # T008
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational, CRÍTICO: refactor de forma + puerta verde T010) → 3. Phase 3 (US1) → 4. **PARAR y VALIDAR** US1 con la prueba de juego → demo de variedad de obstáculos y portantes con primitivas.

### Incremental Delivery

1. Setup + Foundational → el proyecto compila con la nueva forma y el test en verde (solo `oscillate` vivo).
2. US1 → validar → demo (≥3 tipos nuevos + portante + circuito rico, todo con primitivas; la hipótesis de gameplay de 002).
3. US2 → validar → demo (identidad visual 2D: cielo, materiales, señalización, HUD; reserva a primitiva).
4. US3 → validar → demo (mallas low-poly de mascot/obstáculos/props que siguen la pose; reserva a primitiva).
5. Polish → estabilidad de colisiones (incl. transporte portante), rendimiento con arte, docs, quickstart completo en verde.

---

## Notes

- La puerta automática obligatoria es `tests/determinism.test.ts` (Principio II); crece con la migración de forma (Foundational, T008/T010) y los casos por tipo + transporte portante + pureza (US1, T017). US2/US3 solo enforcean no-regresión. Si falla, ninguna historia se considera terminada.
- `src/sim/` no importa Three.js ni assets ni toca el DOM (FR-015); por eso el test carga en Node. El propio load en Node enforcea esa frontera: un import de three/loader desde `sim/` rompería el test.
- El quaternion es PLANO (`{x,y,z,w}`) en `types.ts`/`sim/`; el slerp con `THREE.Quaternion` vive SOLO en `src/render/scene.ts`.
- Los campos `meshUrl`/`texture`/`theme`/`skyboxUrl`/`signageUrl` son visual-only: viven en `circuit.ts`/`assets.ts` y `sim/` los ignora, igual que `StaticBox.color` hoy.
- Las cifras de ajuste viven en `src/config.ts` (Principio V); las RUTAS de asset viven en `circuit.ts`/`assets.ts`, no en config.
- Generación de assets (Meshy/gpt-image-2): CONFIRMAR coste/créditos antes de cada generación, `./marketing` como referencia, clave en el `.env` LOCAL del repo (NO `../allbrands/.env`), salida a `public/assets/`. Reusar (curar) antes de generar.
- Commit tras cada tarea o grupo lógico (solo cuando el usuario lo pida; hay hooks de git por fase).
- Evitar: tareas vagas, conflictos en el mismo archivo entre tareas [P], dependencias entre historias que rompan su independencia.

---

## Cierre (estado real, 2026-06-24)

**Code-complete (34/41).** Implementadas P1+P2+P3 (gameplay determinista, identidad 2D, mallas
low-poly), más trabajo EXTRA no listado en estas 41 tareas, pedido durante la implementación:
- **Personaje riggeado + animado** (idle/andar/correr/saltar) → requirió enmendar la
  constitución a **v1.2.0** (animación esqueletal solo en render, conducida por el tiempo de
  render, sin tocar la simulación). Textura optimizada a 512² con gltf-transform.
- **Escenario al estilo del key art**: NeutralToneMapping + IBL glossy, plataformas candy
  redondeadas, flechas/lane, cielo limpio, globos/molinillos, portal FINISH dorado. Diseño
  guiado por un workflow ultracode + iteración por capturas headless.

**Puerta automática (Principio II) en VERDE:** `tests/determinism.test.ts` 9/9 a 60/jitter/30/144
con igualdad exacta; frontera headless intacta (`src/sim/` sin three/asset); build OK.

**Pendiente — todo es prueba de juego MANUAL (Principio I), que solo el dueño puede firmar:**
- T018 / T029 / T037 — playtests P1 / P2 / P3 (sensación, sin tunneling al ojo, mallas
  alineadas, identidad visual, fallback de asset).
- T038 — verificación visual de no-tunneling (perillas ya conservadoras: `contactPrediction`
  0.2, `knockbackMax` 18; falta confirmar a ojo bajo empuje y sobre portante).
- T039 — ≥60 FPS con todos los assets en hardware real (no medible headless de forma fiable).
- T041 — mitad automática HECHA (npm test verde + frontera); mitad manual = recorrer todo el
  `quickstart.md` + regresión FR-004.

**Desviación consciente:**
- T005 — NO se refactorizó `config.ts` a sub-objetos por tipo para `oscillate` (quedó plano;
  los tipos nuevos sí están anidados). Funcionalmente equivalente (params centralizados,
  Principio V cumplido); se evita churn en `sim/` no verificable sin playtest. Cerrada como
  wontfix cosmético.

"002 terminada" de verdad = los playtests anteriores en verde.
