# Contract — Controles (entrada → acción), delta del pase de feel

Extiende el contrato de controles del MVP. Las teclas concretas son detalle de implementación
(Principio V); lo que fija este contrato es **qué tipo de input dispara qué** y, en especial, qué
es flanco exacto y qué es muestreo continuo (clave para el determinismo).

## Mapeo (cambios y conservados)

| Acción | Entrada por defecto | Tipo | Afecta a |
|---|---|---|---|
| Mover | `W A S D` / flechas | **continuo (held-sampled)** | `velX/velZ` con rampa (US3) |
| Saltar | `Espacio` (keydown) | **flanco con timestamp** | lanza o se bufferiza (US1) / inicia salto variable (US2) |
| **Soltar salto (NUEVO)** | `Espacio` (keyup) | **flanco con timestamp** | corta el ascenso del salto variable (US2) |
| Mirar / cámara | ratón (pointer lock) | continuo | `cameraYaw` (no arranca el crono) |
| Reiniciar | `R` | flanco | `RunState → idle` |

## Reglas del contrato

1. **Flanco de soltado (nuevo).** `Input` captura el `keyup` de Salto con su `event.timeStamp` y
   lo conserva en `FrameInput.edges` como `{ kind: 'jumpRelease', timestamp }`. `advance()` lo
   consume **una sola vez** en la ventana del sim-step que contiene su timestamp y entrega
   `StepInput.jumpRelease = true`. Igual tratamiento que el flanco de salto: por eso el corte cae
   en el **mismo sim-step a 30/60/jitter/144 FPS** (FR-009).
2. **Salto = altura variable.** Mantener pulsado prolonga el ascenso hasta el máximo
   (`jumpSpeed`); soltar pronto lo recorta al suelo mínimo (`jumpReleaseVelocity > 0`). Un toque
   ultracorto siempre produce al menos el salto mínimo (FR-004). Si pulsar y soltar caen en el
   mismo paso, se lanza y luego se corta en ese paso → exactamente el mínimo.
3. **Jump buffering.** Un flanco de salto pulsado dentro de `jumpBufferTime` antes de aterrizar se
   ejecuta al quedar apoyado; si la ventana caduca antes, no se ejecuta. La ventana se mide en
   tiempo de simulación (pasos × `dt`), no en fotogramas.
4. **Coyote time.** Un salto pulsado dentro de `coyoteTime` tras dejar el borde se ejecuta como si
   siguiera apoyado. Coyote y buffer nunca producen doble salto (un único salto por apoyo).
5. **Movimiento = held-sampled, no flanco.** `moveAxis` es el mismo valor para todos los subpasos
   de un fotograma. Con velocidad con rampa, un **cambio de dirección** puede caer en un subpaso
   distinto a 30 vs 144 FPS; el desfase es de un subpaso y queda por debajo del umbral perceptible
   del Principio II. **La garantía de independencia de FPS para locomoción es "misma trayectoria
   con input mantenido", no exactitud por evento.** El salto y su soltado sí son exactos por
   evento. (Decisión R1.)
6. **Arranque del crono.** Igual que el MVP: movimiento o salto arrancan `idle → running`; la
   cámara no. (El soltado del salto no arranca el crono.)

## Salidas hacia el jugador

Sin cambios de HUD obligatorios en este pase (no es contenido). El control mejorado se valida por
prueba de juego manual (`quickstart.md`); opcionalmente la depuración puede mostrar `velX/velZ`.
