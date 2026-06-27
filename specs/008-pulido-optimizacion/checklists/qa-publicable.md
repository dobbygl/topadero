# Checklist de QA publicable — Topadero (Principio VI)

Lista repetible para decidir si una entrega es publicable. Marca [auto] lo que verifica una puerta
automática y [manual] lo que exige prueba humana (en dispositivo / navegador). No publicar mientras
quede un ítem [manual] sin marcar o una puerta [auto] en rojo. Detalle de pasos en `quickstart.md`.

## Puertas automáticas (las verifica el CI / la build)

- [ ] [auto] `npm test` en verde, incluido `tests/determinism.test.ts` (Principio II) y
  `tests/build/asset-budgets.test.ts`.
- [ ] [auto] `npm run build` pasa: el comprobador de presupuestos no reporta `over-*` ni `unclassified`.
- [ ] [auto] Peso total de `dist/` <= 20 MB.
- [ ] [auto] `dist/` no contiene assets no referenciados (sin `*_base_color.png`, sin originales 2048²).

## Robustez de arranque (P1) — [manual]

- [ ] [manual] Al cargar se ve la pantalla de carga `#boot`, nunca lienzo en blanco/negro.
- [ ] [manual] Sin WebGL2 → mensaje claro "no puede mostrar gráficos 3D" (no error solo en consola).
- [ ] [manual] Fallo de WASM (Rapier) → mensaje "no se pudo iniciar el motor" + botón Reintentar.
- [ ] [manual] Un asset que no descarga → el juego sigue con reserva (primitiva/paleta), no aborta.
- [ ] [manual] Flujo completo título→jugar→resultado→rejugar sin consola ni flags `?...`.

## Rendimiento (P2) — [manual, dispositivos reales]

- [ ] [manual] >= 60 FPS en escritorio típico con audio + UI + arte + obstáculos cargados.
- [ ] [manual] >= 30 FPS estables en un móvil de gama media.
- [ ] [manual] Triángulos de escena <= ~120k a ojo en el circuito del día (los techos por malla los
  garantiza la build).

## Acabado visual y UI (P3) — [manual]

- [ ] [manual] Mallas alineadas a sus colliders (el personaje y los obstáculos no flotan ni se hunden).
- [ ] [manual] Sin geometría que asome ni parpadeo (z-fighting); escalas e iluminación coherentes.
- [ ] [manual] Las texturas WebP cargan (cielo, plataformas, señalética, obstáculos): el circuito NO
  se ve con colores de reserva por un 404. (Las pruebas automáticas no renderizan: confirmar a ojo.)
- [ ] [manual] Shell (título, pausa, resultados, ajustes) coherente en escritorio y móvil
  (retrato/apaisado), sin elementos cortados ni solapados.

## Distribución (P3)

- [ ] [manual] Flujo de extremo a extremo completo sobre `npm run preview` (el build), no solo `dev`.
- [ ] [manual] Offline: con la red de baliza cortada, arranca y es plenamente jugable.
- [ ] [auto/manual] Servido bajo subruta `/play`, los assets resuelven (base relativa `./`).
- [ ] [manual] Metadatos de compartición presentes (Open Graph/Twitter) y preview correcta al compartir.
- [ ] [manual] `CREDITS.md` completo: sin ningún ⚠ pendiente; licencias comerciales verificadas.
