# Contract — Controles (entrada → acción)

Mapeo de entrada del jugador a acciones de juego. Las teclas concretas son detalle de implementación (Principio V / Assumptions de la spec); lo que fija este contrato es **qué tipo de input dispara qué** y, en especial, qué cuenta como "input que arranca el cronómetro".

## Mapeo por defecto

| Acción | Entrada por defecto | Tipo | Afecta a |
|---|---|---|---|
| Mover (adelante/atrás/izq/der) | `W A S D` y/o flechas | continuo | `PlayerState` (relativo a la cámara, FR-001) |
| Saltar | `Espacio` | **flanco** (recién pulsado) | `PlayerState` solo si `isGrounded` (FR-003) |
| Mirar / orientar cámara | movimiento del ratón (pointer lock) | continuo | `CameraState` (FR-002) |
| Reiniciar intento | `R` | **flanco** | `RunState` → `idle` (FR-012) |
| Capturar el ratón | clic sobre el canvas | evento | activa Pointer Lock |

## Reglas del contrato

1. **Arranque del cronómetro (Q2)**: solo el input de **movimiento** o **salto** arranca el intento (`idle → running`). El input de **cámara (ratón)** NO lo arranca: el jugador puede mirar alrededor en la salida sin que corra el tiempo.
2. **Salto edge-triggered**: "saltar" es un flanco, no un estado mantenido; se captura con su `event.timeStamp` (reloj) y se consume **una sola vez**, en el paso fijo cuyo intervalo de sim-time contiene ese timestamp (no "primer paso tras el fotograma"). Así el salto se dispara al mismo sim-step a cualquier FPS (ver R7 y simulation-api invariante 3). Mantener pulsado no produce saltos repetidos en el aire.
3. **Movimiento relativo a la cámara**: el eje de movimiento del teclado se transforma por el yaw de la cámara antes de entrar en la simulación.
4. **Reinicio en cualquier fase**: `R` funciona en `idle`, `running` y `won`.
5. **Pointer lock**: el ratón solo controla la cámara mientras el puntero está capturado; al perder el lock (Esc), el movimiento de ratón se ignora y **re-bloquear exige un nuevo clic** (requisito de gesto de usuario). El delta de ratón por fotograma se **acota** (`mouseDeltaClamp`) o se pide `requestPointerLock({ unadjustedMovement: true })` para evitar saltos bruscos de cámara por picos de `movementX/Y`.

## Salidas hacia el jugador (HUD)

| Señal | Cuándo | Requisito |
|---|---|---|
| Cronómetro visible | durante `running` | FR-009 |
| Banner de victoria + tiempo final | al entrar en `won` | FR-010, SC-006 |
| Aviso de reinicio | siempre / en victoria | FR-012 |
