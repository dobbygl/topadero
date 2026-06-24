# Quickstart — Topadero

Cómo levantar, ejecutar y validar el prototipo. Pensado para una sola persona en local, en navegador de escritorio.

## Jugar online

El MVP publicado está disponible en <https://dobbygl.github.io/topadero/>.

## Requisitos

- Node.js 22 y npm.
- Navegador de escritorio con WebGL2 y WebAssembly.

## Puesta en marcha

```bash
npm ci                      # instalación reproducible desde package-lock.json
npm run dev                 # arranca Vite; abrir la URL que imprime (p. ej. http://localhost:5173)
npm run typecheck           # TypeScript estricto, sin emitir archivos
npm run build               # build de producción
npm run preview             # sirve el build
npm test                    # 4 pruebas Vitest de determinismo
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

Debe pasar `tests/determinism.test.ts`: crea una `Simulation` fresca por corrida y alimenta la misma línea de inputs con timestamps sobre 60 Hz, jitter 5/40/8 ms, 30 Hz y 144 Hz. `gameLoop.advance()` asigna cada flanco al intervalo fijo correspondiente y construye un `StepInput`; el estado final debe coincidir a igual número de pasos con un epsilon de `1e-6`.

La suite contiene cuatro casos: salto cerca de una frontera de paso, recorrido largo con saltos y posibles respawns, caída lateral con respawn y trayectoria/derivada del obstáculo.

## Puerta principal (manual) — prueba de juego por historia

La validación inicial del MVP terminó. Este checklist se conserva vacío para repetirlo como prueba manual de regresión:

### US1 — Control y sensación (P1)
- [ ] El personaje se mueve en las 4 direcciones **relativas a la cámara** (FR-001).
- [ ] La cámara orbita con el ratón y **sigue sin saltos bruscos** (FR-002).
- [ ] Salta estando apoyado; **no** hay segundo salto en el aire (FR-003, SC-002).
- [ ] **Salto en el borde**: comprobar que `coyoteTime = 0.08 s` ofrece un margen razonable.
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
- [ ] Sin tunneling, incluso cuando el **obstáculo empuja al personaje contra una pared** (Principio V; mitigaciones: KCC, colliders gruesos y límite de impulso).

## CI/CD y despliegue

El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main` con Node 22:

```text
npm ci → npm test → npm run build → publicar dist/ en GitHub Pages
```

Las pruebas o el build bloquean el despliegue si fallan. `vite.config.ts` usa `base: './'` para resolver los assets tanto en raíz como bajo `/topadero/`.

El build puede advertir que el chunk principal supera 500 kB porque `@dimforge/rapier3d-compat` embebe el WASM. La optimización de carga queda como mejora futura y no afecta a la validación funcional.
