# Contrato — Robustez de arranque (sin pantalla en blanco)

Interfaz de arranque que hace cumplir FR-001..FR-005 y SC-001. Vive en `main.ts` + `src/render` +
`src/ui`; `src/sim/` no participa.

## Secuencia de arranque

1. Mostrar `#boot` (ya en `index.html`, visible desde el primer paint).
2. **Detectar WebGL** antes de crear el renderer: `isWebGLAvailable()` (intento de obtener contexto
   `webgl2`/`webgl` en un canvas desechable). Si no hay → `error` (`kind: no-webgl`), no se intenta
   crear `SceneView`.
3. `await RAPIER.init()` dentro de try/catch. Si lanza → `error` (`kind: wasm-init-failed`,
   `action: retry`).
4. Resolver circuito del día (ya con su propio try/catch → cae al circuito fijo) y `loadAssets`
   (ya degrada por-asset a primitiva). Estos fallos **no** son catastróficos: no van a `error`.
5. Montar el shell (007) y retirar `#boot`. Estado `ready`.
6. Todo el `main()` va envuelto en try/catch externo: cualquier excepción no prevista →
   `error` (`kind: unknown`, `action: retry`), nunca pantalla en blanco.

## Pantalla de error (`src/ui/bootError.ts`)

- Reusa el contenedor `#boot` y sus estilos (mismo look de marca), o un overlay equivalente.
- Contenido por `kind`:
  - `no-webgl`: titular "Tu navegador no soporta gráficos 3D"; detalle con cómo activar la
    aceleración por hardware o probar otro navegador; `action: info` (sin botón Reintentar, o
    Reintentar opcional).
  - `wasm-init-failed`: titular "No se pudo iniciar el motor del juego"; detalle breve;
    `action: retry` (botón Reintentar → recarga/reintenta el arranque).
  - `unknown`: titular genérico "Algo salió mal al cargar"; `action: retry`.
- Accesible: botón enfocable y activable con teclado; texto legible; sin depender de la consola.

## Degradación por-asset (SIN CAMBIOS, conservar)

`src/render/assets.ts` ya resuelve siempre (nunca rechaza): si una textura o malla no carga, marca
`loaded=false` y `scene.ts` usa la reserva (primitiva/color de paleta). La pantalla de error es
**solo** para fallos catastróficos (WebGL/WASM), no para un asset suelto. Este comportamiento no se
reescribe.

## Fuera de alcance del contrato

- **Pérdida de contexto WebGL a mitad de partida** (edge case de la spec): tratar como **informar**
  (mensaje no bloqueante / aviso), no recuperación completa del contexto. La recuperación total queda
  fuera del corte publicable.

## Verificación

- Manual (quickstart): forzar cada `kind` (navegador/flag sin WebGL; simular fallo de WASM; cortar la
  descarga de un asset) y comprobar mensaje claro o reserva jugable, nunca pantalla en blanco.
- Opcional automático: test unitario de `isWebGLAvailable()` y del mapeo `kind → {title, detail,
  action}`.
