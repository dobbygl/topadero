# Quickstart — Validación manual 008 (pulido y optimización)

Puerta principal (manual) del Principio VI. Se valida en orden P1 → P2 → P3; cada rebanada se
comprueba antes de seguir (Principio IV). Las puertas **automáticas** (determinismo y presupuestos) se
indican aparte.

## Preparación

```bash
npm install
npm run assets:optimize   # offline: genera public/assets/ optimizado desde assets-src/
npm run build             # tsc + vite build + comprobador de presupuestos (FALLA si excede)
npm run preview           # sirve el BUILD real (no el dev server)
```

## P1 — Robustez (sin pantalla en blanco)

1. **Carga**: abrir el juego; se ve la pantalla de carga `#boot` (TOPADERO / Cargando…), no un lienzo
   en blanco ni negro, hasta que aparece el título.
2. **Sin WebGL**: abrir en un navegador o perfil con la aceleración 3D desactivada (o forzar el fallo
   de `isWebGLAvailable`); aparece un mensaje claro ("no soporta gráficos 3D"), no pantalla en blanco
   ni error solo en consola.
3. **WASM falla**: simular el fallo de `RAPIER.init()` (p. ej. bloquear el módulo); aparece mensaje
   "no se pudo iniciar el motor" con botón **Reintentar**.
4. **Asset caído**: bloquear la descarga de una textura o malla concreta; el juego sigue jugable con
   la reserva (primitiva/paleta), sin abortar ni quedarse en blanco.
5. **Flujo completo sin consola**: jugar título → jugar → resultado → rejugar/cambiar, todo desde la
   interfaz, sin abrir la consola ni usar flags `?...`.

**Checkpoint P1**: ningún fallo esperable deja pantalla en blanco. ✅ antes de seguir.

## P2 — Peso y rendimiento

Automático (puerta de build):

6. **Presupuestos**: `npm run build` pasa con los assets optimizados; el resumen del comprobador
   muestra cada asset y el total dentro de presupuesto.
7. **Falla al exceder**: meter temporalmente un asset por encima de su presupuesto (o subir el total);
   `npm run build` **falla** con código != 0 y dice qué asset y por cuánto. Revertir.
8. **Sin peso muerto**: inspeccionar `dist/assets/`; no hay ningún asset que el juego no cargue (las
   `*_base_color.png` y demás originales viven en `assets-src/`, no en `dist/`).
9. **Total**: el peso de descarga de la primera jugada es <= 20 MB.

Manual / derivado (no entran en el código de salida del comprobador):

9b. **Triángulos de escena** <= ~120k: el circuito es procedural, así que se comprueba a ojo en el
    circuito del día (o como cota derivada del máximo de colocaciones del generador), no con el build
    gate. Los techos POR MALLA (personaje 15k, obstáculo/prop 12k) sí los verifica el build (paso 6).

Manual (dispositivos reales; la captura headless NO sirve para FPS):

10. **Escritorio**: en un navegador de escritorio típico, un intento completo se mantiene a >= 60 FPS
    con audio + UI + arte + obstáculos, sin caídas que rompan el juego.
11. **Móvil**: en un móvil de gama media, un intento completo se mantiene a >= 30 FPS estables.

Automático (gate de determinismo):

12. `npm test` (incluye `tests/determinism.test.ts`) en **verde** tras optimizar assets: misma
    secuencia de inputs → mismo tiempo y trayectoria a ~30/~144 FPS. La optimización es de render; no
    debe mover la física.

**Checkpoint P2**: presupuestos en verde, sin peso muerto, FPS objetivo en escritorio y móvil,
determinismo intacto. ✅ antes de seguir.

## P3 — QA, pulido y distribución

13. **Visual**: recorrer el circuito; las mallas están alineadas con los colliders (el personaje y los
    obstáculos no flotan ni se hunden), sin geometría que asome ni parpadeo (z-fighting); escalas e
    iluminación coherentes.
14. **Interfaz**: revisar título, pausa, resultados y ajustes en escritorio y en móvil
    (retrato/apaisado); nada cortado ni solapado.
15. **Build real**: el recorrido de extremo a extremo se completa sobre `npm run preview` (el build),
    no solo en `npm run dev`.
16. **Offline**: con la red de baliza cortada, el juego arranca y es plenamente jugable (cae al
    circuito que corresponda; degradación offline).
17. **Subruta**: servir bajo `/play` (como en Pages) y comprobar que los assets resuelven (base
    relativa).
18. **Metadatos y créditos**: `index.html` tiene los metadatos de compartición (Open Graph/Twitter);
    `CREDITS.md` lista créditos y licencias de audio y arte, con las licencias comerciales verificadas.

**Checkpoint P3 (publicable)**: checklist completa en verde sobre el build → listo para desplegar
(`deploy.yml` ya publica a Pages, juego en `/play`).

## Resumen de puertas

| Puerta | Tipo | Mecanismo |
|---|---|---|
| Sin pantalla en blanco (P1) | Manual | Pasos 1-5 |
| Presupuestos de assets (P2) | **Automática** | `npm run build` (comprobador, falla al exceder) |
| Rendimiento FPS (P2) | Manual | Pasos 10-11 en dispositivos reales |
| Determinismo (P2) | **Automática** | `npm test` (`determinism.test.ts`) |
| Acabado visual + distribución (P3) | Manual | Pasos 13-18 sobre el build |
