# Contract — API de simulación, delta del pase de feel

Extiende el contrato de `Simulation` del MVP. La frontera no cambia: `src/sim/` sigue headless
(no importa render ni carga assets) y el seam sigue siendo `Simulation.step(StepInput)` avanzando
**exactamente un paso fijo**. Este pase solo amplía el contrato de E/S del paso y enriquece la
lógica interna del controlador.

## Cambios de tipos

### `InputEdge.kind` (en `core/gameLoop.ts`)
Añade el valor `'jumpRelease'`:
```ts
kind: 'jump' | 'restart' | 'jumpRelease'
```
`advance()` lo ventanea igual que `'jump'`/`'restart'` (misma asignación por timestamp al sim-step)
y lo expone en `StepInput.jumpRelease`. Tras consumirlo, lo elimina del buffer como al resto.

### `StepInput` (en `types.ts`)
```ts
interface StepInput {
  moveAxis: { x: number; y: number } // continuo (held-sampled)
  cameraYaw: number                  // continuo
  jump: boolean                      // flanco: cayó en la ventana de este paso
  jumpRelease: boolean               // NUEVO flanco: soltado cayó en la ventana de este paso
  restart: boolean                   // flanco
}
```

### `PlayerStateView` (en `types.ts`)
Añade la velocidad horizontal con estado (R8). Sugerencia: exponerla explícita además del campo
`velocity` existente para no romper lectores actuales:
```ts
interface PlayerStateView {
  position: Vec3
  facingYaw: number
  velocity: Vec3            // se mantiene
  verticalVelocity: number  // se mantiene
  isGrounded: boolean       // se mantiene
  horizontalVelocity: { x: number; z: number } // NUEVO: velX/velZ (rampa)
}
```

## Garantías de paso fijo (Principio II)

1. **Flancos exactos por evento.** `jump` y `jumpRelease` se consumen una sola vez en el sim-step
   cuya ventana `[winStart, winEnd)` contiene su timestamp → idénticos a cualquier cadencia. El
   corte del salto variable y el lanzamiento bufferizado ocurren en el mismo sim-step a 30/144 FPS.
2. **Estado integrado con `dt` constante.** Buffer (`jumpBufferRemaining`), rampas (`velX/velZ`),
   gravedad asimétrica y altura variable se actualizan dentro de `step()` con `FIXED_DT` → función
   determinista del estado y del input ventaneado.
3. **Locomoción = "idéntica con input mantenido".** Como `moveAxis` es held-sampled, la igualdad
   exacta entre cadencias se garantiza con `moveAxis` **constante**; un cambio de dirección puede
   desfasarse un subpaso entre 30 y 144 FPS (imperceptible, R1). El test lo respeta: sus casos de
   locomoción mantienen `moveAxis` constante.
4. **Sin regresión del MVP.** El empuje del obstáculo (`knockbackX/Z`, aditivo y con decaimiento),
   el transporte portante (`carryDelta`) y el `snapToGround` condicionado a `verticalVelocity` se
   conservan. El desplazamiento horizontal del KCC es `(velX + knockbackX)·dt + carryDelta` (y Z).

## Crecimiento de la puerta automática

`tests/determinism.test.ts` añade casos (salto bufferizado; soltado-temprano vs mantenido;
locomoción con rampa) y un **muestreo de pico-Y** que entra en el vector de estado comparado, para
que un corte/lanzamiento desfasado entre cadencias no quede oculto por un estado final idéntico en
el suelo. `runScenario` gana el seguimiento del máximo `position.y` (solo lectura). El vector
canónico incluye además `horizontalVelocity` (R7, R8).
