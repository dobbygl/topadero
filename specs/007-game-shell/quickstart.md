# Quickstart — Shell de juego (007)

Prueba de juego manual (Principio I/IV) y puertas de calidad. Cada bloque se valida en su checkpoint
antes de pasar a la siguiente historia (rebanadas verticales).

## Preparación

```bash
npm install
npm run dev        # servidor Vite; abrir la URL que imprime
```

La puerta automática de determinismo y el nuevo test de pausa:

```bash
npx vitest run tests/determinism.test.ts   # debe seguir en verde (src/sim y advance intactos)
npx vitest run tests/core/pause.test.ts    # pausa-equivalencia (FR-013, SC-004)
```

## US1 — Arrancar y empezar a jugar (P1)

1. Abrir la página recién cargada. **Esperado:** aparece la pantalla de **título** con el nombre del
   juego, el botón **Jugar** e indicaciones de control. El personaje está quieto y el cronómetro a 0
   (la simulación no avanza). [FR-001]
2. Pulsar **Jugar** (clic en escritorio; toque en móvil). **Esperado:** entra al circuito del día, el
   cronómetro empieza y suena el audio (música + SFX). [FR-002/FR-003]
3. En móvil, en retrato y en apaisado: los controles táctiles y **Jugar** caben sin desplazamiento,
   con objetivos cómodos. [FR-011]

**Checkpoint US1:** no se ha tocado la consola ni ningún flag. (Dev: `?shot` salta el título para
capturas; ruta de desarrollo, no de jugador — FR-023.)

## US2 — Resultados y volver a jugar (P1)

1. Completar un intento hasta la meta. **Esperado:** pantalla de **resultados** con el tiempo del
   intento y, si existe, la mejor marca del día. [FR-004]
2. Si el tiempo bate la mejor marca: señal visual de récord + SFX `new best`. [FR-006]
3. **Volver a jugar** → intento nuevo desde el inicio, cronómetro a 0, mismo circuito. [FR-005]
4. **Volver al título** → vuelve al título. [FR-005]
5. En incógnito (storage bloqueado): los resultados muestran el tiempo del intento aunque no haya
   mejor marca; el juego no falla. [FR-004 esc. 5, SC-007]

## US3 — Pausa, reanudar, reiniciar, salir (P1)

1. Durante el juego, pausar (escritorio: `Esc`/tecla de pausa). **Esperado:** la escena se congela
   (personaje quieto, cronómetro detenido) y aparecen **reanudar / reiniciar / volver al título**.
   [FR-007, FR-012, SC-003]
2. **Reanudar** → continúa desde el mismo punto, **sin** un salto colgado. [FR-008]
3. **Reiniciar** → intento nuevo desde el inicio. [FR-007]
4. **Volver al título** → título; el intento se descarta. [FR-007]
5. **Móvil:** durante el juego, salir de la app / bloquear pantalla y volver. **Esperado:** al volver,
   el juego está en **pausa** (no siguió corriendo) con su pantalla; reanudar exige gesto. [FR-007a,
   FR-009]
6. **Pausa durante un salto:** pausar a mitad de salto y reanudar no dispara un salto extra. [FR-008]

**Checkpoint US3 (puerta de determinismo de la pausa):** jugar un tramo, pausar y reanudar varias
veces, y comprobar que el tiempo y el recorrido son los mismos que sin pausar (lo respalda
`tests/core/pause.test.ts`). [FR-013, SC-004]

## US4 — Ajustes desde la interfaz (P2)

1. Abrir **ajustes** desde el título y desde la pausa. **Esperado:** volumen de música, volumen de
   efectos, sensibilidad, reasignación de entrada y el toggle de **debug de físicas** (apagado).
   [FR-015, FR-018]
2. Bajar el volumen de música/efectos: el cambio se oye de inmediato, sin recargar. [FR-016, SC-005]
3. Desde la pausa, cambiar la sensibilidad y reanudar: el juego usa el nuevo valor sin perder el
   intento. [FR-016]
4. Cambiar volumen y sensibilidad, **recargar** la página: los valores se conservan. [FR-019a, SC-008]
5. En incógnito: los ajustes se aplican en la sesión y, al recargar, vuelven a los defaults sin fallar.
   [FR-024, SC-008]

## US5 — Pulido (P3)

1. Recorrer título, pausa, resultados y ajustes **solo con teclado** y **solo con mando**, con foco
   visible en cada paso. [FR-020, SC-006]
2. Cambios de pantalla suaves, sin parpadeo. [FR-021]
3. Ayuda de controles clara en el título (teclado, mando, toque). [FR-022]

## Puertas de calidad (constitución)

- **Determinismo (Principio II):** `tests/determinism.test.ts` en verde **sin cambios**; nuevo
  `pause.test.ts` en verde. `src/sim/` y el núcleo de `advance()` no se han modificado.
- **Frontera headless (Principio III):** comprobar que `src/sim/` no importa `src/ui`, `src/settings`
  ni la persistencia, y que el shell solo lee estado y emite intención.
- **Publicable (Principio VI):** el flujo completo (título → jugar → resultados → rejugar/volver, más
  pausa y ajustes de volumen) se realiza sin consola ni flags de dev, en escritorio y en móvil.
- **Día UTC (FR-024a):** simular cambio de día (reloj o `dayUTC` cacheado) y volver al título: el
  siguiente "Jugar" usa el circuito del día nuevo; "volver a jugar" repetía el de la sesión. Offline:
  el día nuevo cae a circuito offline sin pantalla en blanco.
