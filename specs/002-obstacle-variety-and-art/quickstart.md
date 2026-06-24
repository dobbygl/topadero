# Quickstart — Feature 002 (variedad de obstáculos y vestido gráfico)

Cómo ejecutar y cómo validar manualmente cada rebanada. La puerta principal (Principio I) es la
prueba de juego; la puerta automática (Principio II) es el test de determinismo.

## Ejecutar

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest, incluye la puerta de determinismo (debe estar en VERDE)
npm run build      # tsc --noEmit && vite build
```

Assets estáticos en `public/assets/` (skybox, texturas, `*.glb`). Si faltan, el juego arranca
igual con apariencia primitiva (reserva).

## Puerta automática (Principio II) — bloqueante

```bash
npx vitest run tests/determinism.test.ts
```

Debe pasar en VERDE a las 4 cadencias (60 / jitter / 30 / 144) con **igualdad exacta** a igual
nº de pasos, incluidos los casos nuevos:

- Trayectoria del jugador frente a la **barra giratoria**, el **péndulo** y el **empujador**.
- **Transporte** sobre plataforma portante (misma distancia a 30 y a 144).
- Pureza de `pose()`/velocidad por tipo.

Si cualquiera falla, **ninguna historia de gameplay se considera terminada**.

## Validación manual por rebanada

### P1 — Variedad de obstáculos + circuito más rico (sin arte)

Se valida con primitivas, sin un solo asset.

1. Recorrer el circuito: hay **≥3 tipos nuevos** de obstáculo en movimiento además del vaivén.
2. Cada obstáculo empuja/frena/tira de forma **legible y predecible**; al repetir el mismo
   recorrido, se comporta igual (determinista).
3. **Plataforma portante horizontal**: al subirse, el jugador **viaja con ella**; al bajarse, se
   suelta limpio. No hay hundimiento ni rebote (no hay portantes verticales).
4. Un obstáculo empuja al jugador contra una pared: **no atraviesa geometría** (sin tunneling) y
   desliza estable.
5. Existe al menos un **atajo arriesgado opcional**; tomarlo no rompe cronómetro ni respawn.

### P2 — Identidad visual 2D

1. La escena tiene **cielo/fondo**, materiales diferenciados (plataformas/rampa/muros) y
   señalización: no cajas grises.
2. **Salida y meta** claramente identificables por señalización visible.
3. HUD coherente con la identidad (`./marketing`).
4. Forzar un fallo de carga (renombrar un asset) → la escena usa **reserva primitiva** y el
   juego sigue; el test de determinismo sigue en verde (el arte no toca la trayectoria).

### P3 — Mallas low-poly

1. Props decorativos low-poly (vallas/banderines/conos/rocas/vegetación) coherentes.
2. Las mallas de los obstáculos **siguen la pose interpolada** alineadas a sus colliders, sin
   desincronización perceptible (probar a 144 y a 30).
3. El personaje se ve como la **malla del mascot**; al colisionar, la respuesta sigue siendo la
   de la **cápsula** (collider).
4. Con todo cargado, **≥60 FPS** en escritorio típico (SC-005).

## Regresión (no romper el MVP)

- Sin doble salto ni salto en el aire; salto solo apoyado.
- Cámara orbital sin saltos bruscos; cronómetro arranca al primer input y para en meta; respawn
  al caer sin recargar.
- El control se siente igual o mejor que el MVP (Principio I); el vestido gráfico no introduce
  stutter (interpolación/slerp activos).
