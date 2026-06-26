# Quickstart — Circuito diario procedural (prueba manual)

Valida las historias contra sus Acceptance Scenarios. La puerta automática (determinismo/FPS) +
tests del generador van aparte; esto es la prueba de juego.

## Preparación

- `npm run dev`, abrir el modo diario. Tener a mano la consola de red para simular fallos.
- Para reproducibilidad entre "clientes", usar dos navegadores/perfiles limpios (sin caché).

## US1 — Circuito del día, igual para todos e impredecible (P1)

1. **Igual para todos**: abrir el juego en dos perfiles limpios el mismo día UTC. → Mismo circuito
   (misma salida/meta/segmentos/obstáculos); el `structuralHash` mostrado en procedencia coincide.
2. **Cambia cada día**: simular el día siguiente (mock de la fuente con un bloque de otro día, o
   esperar al cambio de día). → Circuito distinto al de ayer.
3. **No precomputable**: intentar derivar el circuito de mañana (cuyo bloque ancla aún no existe). →
   No se produce el circuito canónico de mañana (la baliza no está disponible).
4. **Completable**: jugar el circuito del día de salida a meta usando el control validado. → Se
   completa sin saltos imposibles (la solubilidad lo garantiza).

## US2 — Verificable por cualquiera (P2)

1. Abrir la información del circuito. → Se ven fecha UTC, altura y hash del bloque, y versión del
   generador.
2. Tomar ese hash + versión y ejecutar el generador open source (o el test de reproducibilidad). →
   Produce un circuito con el **mismo `structuralHash`** que el del juego.
3. Probar con un hash distinto al real. → La reproducción NO coincide (verificación falla), como debe.

## US3 — Resiliencia: sin conexión y ante fallos (P3)

1. **Caché + sin red**: con el circuito de hoy ya cargado y cacheado, activar modo avión y recargar.
   → Mismo circuito, jugable, sin volver a la red.
2. **Sin caché + sin red**: perfil limpio, modo avión, entrar. → Arranca un **circuito offline
   etiquetado "no competitivo"** (seed local de la fecha), jugable, con mensaje claro; **sin pantalla
   en blanco**.
3. **Proveedor caído**: bloquear mempool.space en la consola de red y recargar. → Resuelve con la
   **alternativa** (blockstream.info) antes de degradar.
4. **UI**: con el modo diario activo, se ve la **cuenta atrás** al próximo 00:00 UTC y la **mejor
   marca local** del día.

## Puertas que deben seguir verdes

- `npx vitest run tests/determinism.test.ts` → en verde (`src/sim/` no se tocó), a 30/60/144 Hz (SC-007).
- `npx vitest run tests/circuitgen/` → reproducibilidad (mismo seed → mismo circuito; distinto →
  distinto) y solubilidad (≥1000 seeds, 0 imposibles, SC-004).
- Flujo sin consola ni flags de dev (Principio VI): el modo diario arranca, juega y muestra resultado;
  offline incluido.
