# Contract — Capa de entrada (`src/input`) y su seam con el bucle

Define el contrato que la capa de entrada DEBE cumplir para que mando y táctil entren sin romper el
determinismo (Principio II) ni la frontera headless (Principio III). Es el seam estable que las
specs posteriores (shell, persistencia) consumen.

## Productor: `src/input` → `FrameInput`

La capa de entrada expone, por fotograma, un `FrameInput` y posee el estado de orientación de
cámara (yaw/pitch). Forma estable (no cambia respecto al MVP):

```
getFrameInput(): {
  moveAxis: { x: number, y: number },  // |moveAxis| <= 1; analógico permitido (mando/joystick)
  cameraYaw: number,                   // yaw crudo de cámara (la entrada también posee el pitch)
  edges: InputEdge[]                   // flancos pendientes con timestamp (reloj del bucle)
}
```

**Invariantes (DEBEN cumplirse):**

1. **Origen de reloj único**: el `timestamp` de cada `InputEdge` comparte origen con el `now` que
   recibe `advance()` (el del `requestAnimationFrame`). Teclado/ratón y táctil usan `e.timeStamp`;
   el mando (polling, sin eventos) usa el `now` del fotograma en que se detecta la transición.
2. **Flancos por ventana, no por fotograma**: la capa de entrada solo ACUMULA flancos; es el bucle
   quien los consume ventaneándolos a su paso fijo. La entrada nunca decide "saltar este fotograma".
3. **`moveAxis` held-sampled**: es un estado continuo (no un flanco); el bucle lo aplica a los pasos
   que corra en el fotograma. La magnitud analógica se integra con `dt` igual que el valor discreto
   del teclado → misma trayectoria a cualquier FPS.
4. **Agnóstica de la fuente**: `keyboardMouse`, `gamepad` y `touch` rellenan el mismo `FrameInput`.
   El esquema activo (`scheme.ts`) solo decide qué fuentes están activas y si se dibuja el overlay
   táctil; no cambia la forma del `FrameInput`.
5. **Frontera headless**: `src/input` NO importa `src/sim/` ni la lógica de render; no lee ni muta
   estado de simulación. La simulación no importa `src/input`.

## Adaptadores

- **keyboardMouse**: como hoy. Teclas → `moveAxis` discreto; ratón (pointer lock) → yaw/pitch;
  `Space`/`KeyR` → flancos jump/jumpRelease/restart con `e.timeStamp`.
- **gamepad**: polling de `navigator.getGamepads()` por fotograma. Stick izquierdo → `moveAxis`
  (deadzone radial, magnitud ≤ 1); stick derecho → delta de yaw/pitch; botón de salto → flanco
  jump/jumpRelease con timestamp = `now` del fotograma.
- **touch**: Pointer Events. Joystick virtual (mitad izq) → `moveAxis` proporcional; zona derecha →
  delta de cámara; botón de salto → flanco jump/jumpRelease con `e.timeStamp`. Multi-touch por
  `pointerId`; el joystick captura su puntero hasta soltar.

## Contrato de determinismo (puerta automática)

Para una MISMA secuencia de `FrameInput` (mismos `moveAxis` por fotograma y mismos `edges` con sus
timestamps), la simulación DEBE producir la MISMA secuencia de `StepInput` y la MISMA trayectoria a
30 / 60 / jitter / 144 Hz. Verificación: `tests/determinism.test.ts`, extendido con:

- Escenario de `moveAxis` analógico parcial (p. ej. `{ x: 0.0, y: 0.5 }` o diagonal de magnitud 0.5)
  idéntico entre cadencias.
- Escenario con flancos de salto que representan la fuente mando/táctil (mismos `InputEdge` con
  timestamp) idéntico entre cadencias.

Si esta puerta falla, la feature no se considera terminada (Principio II, NO NEGOCIABLE).

## Fuera de este contrato

- La PWA (manifest + service worker) no participa del seam de entrada; es empaquetado del cliente y
  no toca el `FrameInput` ni el paso fijo (FR-020).
- La UI de reasignación/sensibilidad y el guardado de preferencias se exponen con las specs de shell
  y persistencia; aquí los valores viven en `config.ts` (defaults) y en memoria.
