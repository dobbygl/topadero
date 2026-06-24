# Quickstart — Topadero

Cómo levantar, ejecutar y validar el prototipo. Pensado para una sola persona en local, en navegador de escritorio.

## Requisitos

- Node.js 20+ y npm.
- Navegador de escritorio con WebGL2 y WebAssembly.

## Puesta en marcha (prevista tras `/speckit-tasks` + `/speckit-implement`)

```bash
npm install                 # incluye three, @dimforge/rapier3d-compat, vite, vitest, typescript
npm run dev                 # arranca Vite; abrir la URL que imprime (p. ej. http://localhost:5173)
npm run build               # build de producción
npm run preview             # sirve el build
npm test                    # Vitest: incluye la puerta de determinismo (Principio II)
```

> `@dimforge/rapier3d-compat` requiere `await RAPIER.init()` una vez al arrancar (en `main.ts` para el navegador y en el setup del test para Node). Mismo paquete en ambos entornos.

## Controles

- Mover: `W A S D` / flechas (relativo a la cámara).
- Saltar: `Espacio` (solo apoyado).
- Cámara: ratón (clic en el canvas para capturar el puntero / pointer lock).
- Reiniciar intento: `R`.

(El cronómetro arranca con el primer movimiento o salto, no al mover la cámara.)

## Puerta automática (obligatoria) — independencia de FPS

```bash
npm test
```

Debe pasar `tests/determinism.test.ts`: corre el núcleo de simulación (Simulation fresca por corrida) con la **misma línea de inputs con timestamps** sobre 4 cadencias de fotograma (60 Hz, jitter 5/40/8 ms, **30 Hz** y 144 Hz) y comprueba que el estado coincide a igual número de pasos fijos con **igualdad exacta** (solo epsilon de redondeo float, sin tolerancia ajustable). La pareja 30 vs 144 casa con SC-004. Incluye una pulsación de salto cerca de una frontera de subpaso: como los flancos se consumen por timestamp (no "primer paso tras el fotograma"), el salto cae en el mismo sim-step a cualquier FPS; una regresión a consumo ingenuo desplazaría el salto y el test fallaría. El test crece por historia (salto P1, empuje P2, respawn/umbral P3). Si falla, el Principio II está roto: **no se considera terminada ninguna historia**.

## Puerta principal (manual) — prueba de juego por historia

La constitución exige validar cada historia contra sus *Acceptance Scenarios* y *Success Criteria* antes de avanzar a la siguiente (Principio IV). Checklist:

### US1 — Control y sensación (P1)
- [ ] El personaje se mueve en las 4 direcciones **relativas a la cámara** (FR-001).
- [ ] La cámara orbita con el ratón y **sigue sin saltos bruscos** (FR-002).
- [ ] Salta estando apoyado; **no** hay segundo salto en el aire (FR-003, SC-002).
- [ ] **Salto en el borde**: decidir conscientemente `coyoteTime` tras la prueba de juego (no dejarlo en 0 por inercia); el salto al borde debe sentirse generoso, no tacaño (Edge Case, Principio I).
- [ ] El snap-to-ground no "se come" el inicio del salto (se desactiva ese paso).
- [ ] No atraviesa suelo/plataformas; **desliza** de forma continua contra paredes y **rampa** (FR-004, FR-005, SC-003).
- [ ] Fluido a ojo (objetivo ≥ 60 FPS, SC-008).

### US2 — Circuito hasta la meta con cronómetro (P2)
- [ ] El crono **arranca con el primer input** de movimiento/salto y es visible durante el recorrido (FR-009).
- [ ] Hay plataformas, **una rampa** y **al menos un obstáculo en movimiento**; el obstáculo **empuja/derriba** al contacto (FR-006, FR-007).
- [ ] Entrar en la meta **detiene el crono** y muestra **victoria con el tiempo** (FR-010, SC-006).

### US3 — Caída/respawn y reinicio (P3)
- [ ] Caer bajo el umbral reaparece en la **salida** en pocos segundos (objetivo ≤ 3 s), **sin recargar** (FR-011, SC-005).
- [ ] Tras respawn por caída, **el crono sigue corriendo** (Q5).
- [ ] `R` reinicia en cualquier fase: posición, obstáculo, fase y crono a cero (FR-012, SC-007).

### Estabilidad de colisiones (suelo de corrección duro)
- [ ] Sin tunneling, incluso cuando el **obstáculo empuja al personaje contra una pared** (Principio V; mitigaciones: colliders gruesos / límite de impulso / CCD si hace falta).

## Orden de construcción

P1 → P2 → P3 (rebanadas verticales jugables, Principio IV). Cada checkpoint es un punto de parar y validar antes de seguir. El detalle de tareas lo genera `/speckit-tasks`.
