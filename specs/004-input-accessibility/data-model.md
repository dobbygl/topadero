# Data Model — Entrada, accesibilidad y PWA (Fase 1)

Entidades a nivel de comportamiento. La mayoría son estructuras de la capa de entrada/UI y de
ajuste (`config.ts`); ninguna vive en `src/sim/` ni altera el estado de simulación. Se reutiliza el
seam existente (`FrameInput` / `StepInput`) sin cambiar su forma.

## Reutilizadas (sin cambios de forma)

### FrameInput  *(existe en `src/core/gameLoop.ts`)*
La intención del jugador en el fotograma actual, agnóstica de la fuente.
- `moveAxis: { x, y }` — vector de desplazamiento. **Ahora puede ser analógico**: magnitud en
  [0, 1] (teclado produce los valores discretos -1/0/1 de siempre; mando y joystick virtual
  producen valores continuos). x = lateral (+derecha), y = avance (+adelante).
- `cameraYaw: number` — yaw crudo de cámara (la capa de entrada también posee el pitch).
- `edges: InputEdge[]` — buffer de flancos pendientes con timestamp.

### InputEdge  *(existe)*
- `kind: 'jump' | 'jumpRelease' | 'restart'`
- `timestamp: number` — mismo origen de reloj que `advance()` del bucle. **Invariante**: todo flanco,
  venga de tecla, botón de mando (timestamp = `now` del fotograma) o toque (timestamp = `e.timeStamp`),
  se ventanea a su paso fijo. No se añaden tipos nuevos en esta feature.

### StepInput  *(existe en `src/types.ts`, sin cambios)*
Entrada ya ventaneada para un paso fijo (la construye el bucle). No se modifica.

## Nuevas (capa de entrada / UI / ajuste)

### InputScheme
Esquema de entrada activo.
- `kind: 'keyboardMouse' | 'gamepad' | 'touch'`
- Regla: `kind` = la última fuente con actividad (sin override manual). Determina si se muestra el
  overlay táctil.

### ActionBinding / BindingMap
Asignación de controles físicos a acciones, por esquema.
- Acciones: `moveForward/Back/Left/Right` (teclado), `jump`, `restart`, ejes de movimiento y cámara
  (mando/táctil).
- `default` (en `config.ts`) + `custom` opcional del jugador.
- Validación: una acción crítica (salto) no puede quedar sin asignar; reasignar salto desasigna su
  control anterior (US2 escenario 1).
- Persistencia del `custom`: vía la spec de persistencia local (aquí en memoria + defaults).

### InputPreferences
- `cameraSensitivity: number` (≥ 0)
- `invertX: boolean`, `invertY: boolean`
- `deadzone: number` en [0, 1) — deadzone radial del stick/joystick.
- Defaults en `config.ts`.

### AccessibilityPreferences
- `reducedMotion: boolean` — atenúa/omite movimiento de cámara no esencial (semilla desde
  `prefers-reduced-motion`).
- `hudScale: number`, `hudHighContrast: boolean`.
- No afectan a la simulación ni al determinismo.

### TouchControlLayout
Disposición del overlay táctil (en `config.ts`, adaptable a tamaño/orientación).
- Zona joystick (mitad izquierda), zona cámara (mitad derecha), botón de salto (abajo-derecha).
- Tamaños mínimos cómodos de los objetivos táctiles; no ocultan el centro de la pantalla (FR-010).

### PwaInstallState  *(capa PWA / landing)*
- `canPrompt: boolean` — hay `beforeinstallprompt` disponible.
- `installed: boolean` — abierto en display-mode standalone o evento `appinstalled`.
- `dismissedThisSession: boolean` — el aviso no reaparece de forma molesta.
- `needsManualInstructions: boolean` — navegador sin prompt (iOS Safari) → instrucciones.

### AppManifest  *(empaquetado, no runtime de juego)*
Identidad de la app instalada (Web App Manifest del juego, servido bajo `/play`).
- `name`/`short_name` = Topadero, `theme_color`/`background_color` coherentes con la marca.
- `display` = `standalone`/`fullscreen`; `start_url`/`scope` relativos a `/play` (abre el juego, no
  la landing).
- `icons` del juego.
