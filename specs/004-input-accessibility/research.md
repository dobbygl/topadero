# Research — Entrada, accesibilidad y PWA (Fase 0)

Decisiones de diseño previas al Phase 1. Cada una: Decisión / Razón / Alternativas. El hilo
conductor: mando y táctil son adaptadores que rellenan el `FrameInput` ya existente, y la PWA es
empaquetado del cliente sobre el build estático; ninguno toca `src/sim/` ni el paso fijo.

## R1 — Polling del mando y timestamp de los flancos

- **Decisión**: leer `navigator.getGamepads()` una vez por fotograma dentro del adaptador de
  entrada. Detectar la transición no-pulsado → pulsado del botón de salto y empujar un
  `InputEdge { kind: 'jump', timestamp }`; la transición inversa empuja `jumpRelease`. El timestamp
  es el `now` del fotograma (mismo origen de reloj que `advance()` en el bucle).
- **Razón**: la Gamepad API no emite eventos de botón, solo estado por polling. Stampar el flanco
  con el `now` del fotograma reutiliza exactamente el mecanismo de ventaneo del teclado (los flancos
  caen en su sim-step por timestamp), así que el salto de mando es determinista igual que el de
  teclado. La latencia de ~1 fotograma es imperceptible y consistente.
- **Alternativas**: eventos de botón del mando (no existen en la API); librería de abstracción de
  gamepad (dependencia innecesaria para leer ejes y botones).

## R2 — Entrada táctil y multi-touch

- **Decisión**: usar Pointer Events (`pointerdown/move/up/cancel` con `pointerId`). Cada puntero se
  asigna a un rol según dónde empieza: mitad izquierda → joystick virtual; mitad derecha → arrastre
  de cámara; sobre el botón de salto → salto. El joystick captura su `pointerId` hasta soltar
  (aunque se arrastre fuera de su zona). El botón de salto empuja `InputEdge` jump con `e.timeStamp`
  en `pointerdown` y `jumpRelease` en `pointerup`.
- **Razón**: Pointer Events unifican táctil y puntero, soportan multi-touch por `pointerId` (mover y
  saltar a la vez), y `e.timeStamp` comparte origen con el bucle, así que los flancos táctiles se
  ventanean como los de teclado. La asignación por zona resuelve el conflicto arrastre-vs-joystick
  de los Edge Cases.
- **Alternativas**: Touch Events crudos (más verboso, peor con ratón/lápiz); una librería de joystick
  virtual (innecesaria; el overlay es simple y debe quedar barato para móvil).

## R3 — Normalización analógica y deadzone

- **Decisión**: stick del mando y joystick virtual producen `moveAxis` como vector de magnitud en
  [0, 1] con **deadzone radial** configurable (`config.ts`) y clamp de magnitud a 1. La cámara se
  alimenta del delta por fotograma (stick derecho / arrastre) integrando `yaw`/`pitch` como ya hace
  el ratón, con su sensibilidad e inversión configurables.
- **Razón**: `moveAxis` ya es el vector que consume la simulación (held-sampled, integrado con dt),
  así que la entrada analógica encaja sin tocar el sim y se mantiene determinista. La deadzone
  radial evita deriva del stick.
- **Alternativas**: deadzone por eje (peor sensación en diagonales); mapear analógico a digital
  on/off (perdería la intensidad proporcional que pide FR-002/FR-005).

## R4 — Detección del esquema activo

- **Decisión**: el esquema activo (teclado+ratón / mando / táctil) **sigue a la última entrada
  usada** (decidido en clarify). Cualquier evento o actividad de un dispositivo marca su esquema;
  el overlay táctil se muestra solo en esquema táctil. Sin selección ni override manual.
- **Razón**: cero fricción (coges el mando y funciona; tocas la pantalla y aparecen los controles).
  El override manual implicaría UI que pertenece a la spec del shell.
- **Alternativas**: selección fija al inicio (peor en dispositivos híbridos); override manual en
  ajustes (se difiere al shell, no necesario para el corte de 004).

## R5 — Rendimiento en móvil

- **Decisión**: objetivo >= 30 FPS estable en gama media (SC-005). El coste de la entrada (polling
  del mando, listeners de puntero) es trivial; el overlay táctil se dibuja barato (DOM/CSS o canvas
  2D simple, sin sombras ni materiales extra). El cuello de botella real (render 3D) lo aborda la
  spec de robustez/publicación.
- **Razón**: no convertir la capa de entrada en coste; mantener el overlay ligero protege el suelo
  de FPS sin recortar el render de escritorio.
- **Alternativas**: overlay táctil con WebGL/sprites en la escena 3D (más coste y acoplamiento al
  render; innecesario).

## R6 — Reduced motion y accesibilidad del HUD

- **Decisión**: una preferencia `reducedMotion` (default en `config.ts`) que la capa de render lee
  para atenuar u omitir movimiento no esencial de cámara (suavizado agresivo y cualquier juice
  futuro). El HUD ofrece opciones de contraste/tamaño aplicadas por CSS/escala. Nada de esto toca la
  pose del KCC ni el paso fijo.
- **Razón**: la accesibilidad es cosmética y vive en render/UI; respeta la frontera y el
  determinismo. Se puede sembrar el valor inicial desde `prefers-reduced-motion` del navegador.
- **Alternativas**: gestionar reduced motion en la simulación (rompería la frontera y el
  determinismo); sin defaults del sistema (peor experiencia inicial).

## R7 — Verificación de determinismo (extensión de la puerta)

- **Decisión**: extender `tests/determinism.test.ts` con (a) un escenario de `moveAxis` analógico
  parcial (p. ej. magnitud 0.5 en diagonal) idéntico a 60/jitter/30/144 Hz; (b) un escenario cuyos
  flancos de salto representan la fuente mando/táctil (mismos `InputEdge` con timestamp) y son
  idénticos entre cadencias. Reutiliza el harness `expectIdenticalAcrossCadences`.
- **Razón**: como toda fuente alimenta el mismo `FrameInput` y el mismo ventaneo, basta cubrir
  explícitamente la entrada analógica/parcial para documentar que la puerta protege mando y táctil.
  Un fallo aquí cazaría cualquier consumo por fotograma que se colara.
- **Alternativas**: tests de integración con eventos de DOM simulados (frágiles, fuera del seam
  headless; el harness por `FrameInput` es la unidad correcta).

## R8 — PWA: manifest, start_url y las dos superficies

- **Decisión**: el manifest y el service worker pertenecen al **juego** (servido bajo `/play`), con
  `scope` y `start_url` relativos a `/play` (display `standalone`/`fullscreen`). La **landing de
  marketing** (raíz) enlaza ese manifest y aloja la invitación a instalar; instalar desde la landing
  instala el juego, que se abre directamente en `/play` a pantalla completa (FR-018).
- **Razón**: lo instalable y lo que debe funcionar sin conexión es el juego, no la landing (FR-018,
  FR-019). Confinar el scope del SW a `/play` es suficiente y evita que el SW intercepte la landing.
  `base: './'` ya hace el build portable bajo subrutas.
- **Alternativas**: un único scope en la raíz que englobe landing + juego (el SW cachearía la
  landing innecesariamente y complica el start_url); dos manifests (innecesario; solo el juego se
  instala).

## R9 — PWA: cacheo offline y estrategia de actualización

- **Decisión**: el service worker precachea el build del juego (HTML, JS, CSS, assets de `public/` y,
  más adelante, el audio). **El WASM de Rapier va embebido en base64 dentro del bundle JS**, así que
  precachear el bundle ya deja el motor de físicas disponible offline: no hace falta tratar un
  `.wasm` aparte. Estrategia: cache-first para el shell precacheado; en cada arranque el SW comprueba
  si hay una versión nueva y la activa en la siguiente carga (evitar quedarse atascado en una versión
  vieja, edge case "actualización"). La generación puede usar `vite-plugin-pwa` (precache automático
  del manifest de assets de Vite) o un SW a mano.
- **Razón**: un juego de un jugador en local no necesita red para jugar (FR-019); el bundle
  autocontenido (incl. WASM embebido) hace el offline directo. Cache-first con activación diferida da
  arranque instantáneo offline sin congelar al jugador en builds viejas.
- **Alternativas**: network-first (innecesario, no hay datos de servidor); precache manual de rutas
  (frágil con los nombres hasheados de Vite; `vite-plugin-pwa` los resuelve).

## R10 — PWA: invitación a instalar e iOS Safari

- **Decisión**: en navegadores que lo soportan, capturar `beforeinstallprompt` en la landing,
  ofrecer un botón/aviso no intrusivo y descartable, y no reaparecer de forma molesta en la misma
  sesión (edge cases). En iOS Safari (sin `beforeinstallprompt`) mostrar instrucciones equivalentes
  ("Compartir → Añadir a pantalla de inicio"). Detectar si ya está instalado (display-mode standalone
  / `appinstalled`) para no insistir.
- **Razón**: cumplir FR-017 sin botones rotos donde la API no existe, respetando que instalar es
  opcional y nunca bloqueante (FR-022).
- **Alternativas**: depender solo de la UI nativa del navegador (incoherente entre plataformas, y en
  iOS no hay prompt); forzar la instalación (viola FR-022).

## Resumen para Fase 1

- Entidades nuevas/afectadas → `data-model.md` (esquema de entrada, bindings, preferencias, layout
  táctil, estado de instalación PWA).
- Contrato de la capa de entrada → `contracts/input-contract.md` (el seam `getFrameInput()` y sus
  invariantes de determinismo).
- Sin NEEDS CLARIFICATION pendientes: las dos decisiones abiertas (start_url/scope y estrategia de
  actualización offline) quedan resueltas aquí (R8, R9), no son ambigüedades de spec.
