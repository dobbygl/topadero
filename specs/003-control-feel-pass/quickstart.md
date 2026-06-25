# Quickstart — Pase de feel del control

Cómo validar la feature. Dos puertas (constitución): la **manual** (prueba de juego, Principio I)
por historia, y la **automática** (determinismo, Principio II), no negociable.

## Arrancar

```bash
npm install
npm run dev        # servidor de Vite; abrir la URL que imprime
```

Controles: `W A S D` / flechas mover, `Espacio` saltar (mantener para salto alto, toque para
salto bajo), ratón para la cámara (clic para capturar el puntero), `R` reiniciar.

## Puerta automática (NO NEGOCIABLE) — ejecutar siempre

```bash
npm test                                   # toda la suite, incluida la puerta de determinismo
npx vitest run tests/determinism.test.ts   # solo la puerta
```
Debe pasar en **verde a las 4 cadencias** (60 / jitter / 30 / 144 Hz) con igualdad exacta a igual
nº de pasos, incluidos los casos nuevos: salto bufferizado, salto soltado-temprano vs mantenido
(con muestreo de pico-Y) y locomoción con rampa (input mantenido). **Si falla, ninguna historia
se considera terminada.**

## Puerta manual por historia (orden P1 → P2 → P3)

Validar cada historia antes de empezar la siguiente. No iniciar una de menor prioridad sin la
superior en verde.

### US1 — Salto que perdona (P1)
1. **Jump buffering**: corre hacia una caída, déjate caer hacia una plataforma y pulsa saltar un
   instante **antes** de aterrizar → el personaje salta al tocar suelo (no se "come" la
   pulsación).
2. **Buffer caduca**: pulsa saltar mucho antes de aterrizar → al tocar suelo NO salta solo.
3. **Coyote**: sal corriendo del borde de una plataforma y pulsa saltar justo después → salta.
4. **Sin salto aéreo**: en pleno aire (fuera de coyote) pulsa saltar → no pasa nada; nunca doble
   salto.
- ✅ Criterio: SC-001, SC-005. La puerta automática del salto bufferizado en verde.

### US2 — Salto de altura variable (P2)
1. **Toque vs mantenido**: desde el mismo punto, da un toque breve y luego mantén pulsado → el
   mantenido sube claramente más alto (hasta el tope).
2. **Soltar pronto**: en pleno ascenso, suelta el botón → el ascenso se corta y el salto queda
   más bajo.
3. **Suelo mínimo**: da el toque más corto que puedas → siempre hace un "hop" perceptible, nunca
   un salto nulo (FR-004).
- ✅ Criterio: SC-002. La puerta automática soltado-temprano vs mantenido (pico-Y) en verde.

### US3 — Movimiento con peso y control aéreo (P3)
1. **Arranque/frenado**: arranca desde parado → acelera con una rampa breve (no a tope de golpe);
   suelta el movimiento → desacelera con peso (no parada en seco ni patinazo de hielo).
2. **Cambio de dirección**: invierte el sentido a velocidad de crucero → se siente con peso.
3. **Control aéreo**: durante un salto, mueve lateralmente → la trayectoria se ajusta de forma
   perceptible pero contenida (ni flotante ni rígida).
- ✅ Criterio: SC-003, SC-004. La puerta automática de locomoción con rampa en verde.

## No regresión (todas las historias)
- Sin tunneling: el personaje no atraviesa suelo, plataformas ni paredes (SC-007).
- Deslizamiento continuo en paredes y rampas (SC-007).
- El obstáculo móvil sigue empujando al contacto (FR-012).
- Veredicto global (Principio I): el control se siente **claramente mejor** que el MVP, sin
  regresiones (SC-008).
