# Implementation Plan: Pulido y optimización para el corte mínimo publicable

**Branch**: `008-pulido-optimizacion` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-pulido-optimizacion/spec.md`

## Summary

Cerrar el corte mínimo publicable con tres rebanadas: (P1) **robustez de arranque** sin pantalla en
blanco, (P2) **peso de assets y rendimiento** con presupuestos verificados que fallan el build, y
(P3) **QA, pulido y distribución**. La frontera headless no se toca: `src/sim/` no cambia y la
puerta de determinismo sigue intacta. Las decisiones de fondo:

- **Robustez (P1):** envolver el arranque de `main.ts` en un manejador que, ante un fallo
  catastrófico (WebGL no disponible, `RAPIER.init()` falla), reemplaza la pantalla de carga `#boot`
  (ya existe) por una **pantalla de error** clara con acción (reintentar / requisito), en lugar de
  dejar el `#boot` colgado o el lienzo en blanco. Se **conserva** la degradación por-asset que ya
  hace `src/render/assets.ts` (cae a primitiva/paleta): la pantalla de error es solo para fallos
  catastróficos, no para un asset suelto.
- **Optimización (P2):** el peso lo manda la **textura embebida** en los GLB (2048², no la
  geometría). Pipeline **offline** (`npm run assets:optimize`, no en cada build) que redimensiona a
  1024² y recodifica a **WebP** (verificado: el `GLTFLoader` de three@0.184 decodifica WebP embebido
  vía `EXT_texture_webp`), decima la única malla por encima de techo (péndulo, ~20k) y emite **solo
  los assets referenciados** y optimizados. La compresión de geometría (Draco/meshopt) se **descarta**
  (ganancia marginal con 74k tris; añadiría un decodificador). El **peso muerto se elimina por
  construcción**: los originales (incl. `*_base_color.png`) se mueven a `assets-src/` (no servido) y
  el pipeline emite a `public/assets/` solo lo que el juego carga.
- **Cumplimiento (P2):** un **manifest único** de presupuestos (`asset-budgets.json`) y un
  comprobador (`scripts/check-asset-budgets.mjs`, extensión del prototipo `tris.mjs`) que mide
  `dist/` contra el manifest y **sale con error** si un asset o el total exceden (clarify fijó "el
  build FALLA"). Se engancha en `npm run build` (tras `vite build`) y por tanto también en CI.
- **Distribución y QA (P3):** verificación del flujo de extremo a extremo **sobre el build**
  (`vite preview`), metadatos de compartición (Open Graph/Twitter en `index.html`), `CREDITS.md` de
  audio y arte enlazado, y una **checklist de QA publicable** repetible (consistencia visual,
  interfaz, offline). Reuso del despliegue ya existente (`deploy.yml` → Pages, juego en `/play`).

**Aviso de alcance del plan (clave):** los presupuestos y el determinismo son puertas
**automáticas**; el rendimiento (>= 60 FPS escritorio / >= 30 FPS móvil) es puerta **manual** sobre
dispositivos reales (la captura headless usa SwiftShader por software, inservible para medir FPS).
El plan no promete una puerta automática de FPS.

## Technical Context

**Language/Version**: TypeScript (proyecto Vite existente); Node 22 en CI/tests/scripts.
**Primary Dependencies**: Three.js y Rapier existentes (sin librerías de runtime nuevas). Nuevas
**devDependencies** solo para el pipeline offline: `@gltf-transform/core` + `@gltf-transform/functions`
y `sharp` (redimensionado/recodificado WebP de texturas embebidas). El comprobador de presupuestos es
Node puro (sin dependencias).
**Storage**: N/A nuevo. La persistencia local (preferencias 007, mejor marca 006) no se toca.
**Testing**: Vitest. `tests/determinism.test.ts` **no cambia** y sigue en verde tras optimizar assets
(los cambios son solo de render; la colisión es de primitivas). Nuevo test del comprobador de
presupuestos (`tests/build/asset-budgets.test.ts`): dado un manifest y un set de tamaños, detecta
dentro/fuera de presupuesto y el código de salida. Opcional: test de la utilidad de detección WebGL.
**Target Platform**: navegador de escritorio y móvil (web estática), v2.2.0; servido bajo subruta
(`/play`) con `base: './'`. Sin backend propio; arranca y es jugable offline.
**Project Type**: aplicación web de un solo proyecto. Estructura existente
`src/{sim,core,render,ui,input,audio,daily,circuitgen,settings,pwa}` + nuevos `scripts/` y
`assets-src/`.
**Performance Goals**: >= 60 FPS escritorio y >= 30 FPS móvil de gama media (SC-007/SC-008), con
audio + UI + arte + obstáculos cargados; **verificación manual** en dispositivos reales (quickstart).
**Constraints**: `src/sim/` no se modifica (Principio II); los presupuestos viven en un manifest
único de build, separado de `config.ts` que es para feel de runtime (Principio V honrado por dominio);
web estática sin backend; flujo completo offline y sin red de baliza (Principio VI). El pipeline de
assets es offline (no ralentiza el build); el comprobador de presupuestos sí corre en cada build.
**Scale/Scope**: ~9 mallas + ~6 texturas sueltas + audio. Cambios: pantalla de error + detección
WebGL/WASM (P1); manifest + comprobador + pipeline offline + reubicación `assets-src/`→`public/assets/`
(P2); metadatos + créditos + checklist + verificación sobre build (P3). Cero cambios en `src/sim/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design (ver abajo).*

- **I. La sensación de juego manda** — PASA. No se toca el control ni la física. La optimización es
  de render (texturas/mallas) y de empaquetado; la pantalla de error y la de carga no afectan al
  feel. Puerta = prueba de juego manual del quickstart (el control se siente igual antes/después).
- **II. Determinismo / independencia de FPS (NO NEGOCIABLE)** — PASA, por diseño. `src/sim/` **no se
  toca**; las mallas/texturas son vista pura en `src/render` alineada a colliders primitivos (la
  colisión sigue sobre primitivas, sin collmesh). Decimar el péndulo y recodificar texturas no toca
  la simulación. **Puerta automática: `tests/determinism.test.ts` debe seguir en verde tras los
  cambios de assets** (se re-ejecuta como gate, igual que en CI antes de desplegar).
- **III. Alcance de producto y disciplina de acabado** — PASA. "Robustez ante fallos, rendimiento y
  distribución (web estática)" es exactamente el corte publicable (Principio VI) y la restricción de
  distribución v2.0.0/v2.2.0. La frontera headless se mantiene (`src/sim/` no importa render, UI,
  persistencia ni assets). Arte low-poly + texturas en `src/render` (excepción v1.1.0). Se respeta
  YAGNI: WebP en vez de KTX2, sin compresión de geometría, pipeline offline simple.
- **IV. Rebanadas verticales jugables** — PASA. Orden P1 (robustez) → P2 (peso + rendimiento) → P3
  (QA + distribución); cada una se valida en su checkpoint del quickstart antes de seguir.
- **V. Comportamiento sobre cifras: `config.ts`** — PASA, y se honra por dominio. Los presupuestos
  son cifras de **build**, no perillas de feel de runtime: meterlas en `config.ts` lo ensuciaría.
  Viven en un manifest único (`asset-budgets.json`), "un solo sitio" para su dominio igual que
  `config.ts` para el suyo. No se introducen números mágicos dispersos.
- **VI. Acabado de producto publicable** — PASA: ES la razón de ser de la spec. Sin pantalla en
  blanco ante WebGL/WASM/assets (FR-001..004); flujo de extremo a extremo sin consola ni flags sobre
  el build (FR-005/FR-017); offline (FR-020); metadatos y créditos/licencias (FR-018/FR-019).

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño confina la robustez a `main.ts` + una
utilidad de `src/ui` (pantalla de error) + detección WebGL en `src/render`; la optimización a
`scripts/` + `assets-src/`/`public/assets/` + `vite.config`/`package.json`; nada entra en `src/sim/`
ni en el paso fijo. Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/008-pulido-optimizacion/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (WebP vs KTX2, geometría skip, prebuild vs plugin, manifest, dead-weight, robustez, perf manual)
├── data-model.md        # Fase 1 (AssetBudgetManifest, BudgetReport, BootError, QAChecklist; entidades de build/UI, no de sim)
├── quickstart.md        # Fase 1 (validación manual P1/P2/P3: errores de arranque, pesos/FPS, build+offline, checklist QA)
├── contracts/
│   ├── asset-budgets.md # Contrato del manifest + comprobador (formato, regla inclusiva/exclusiva, código de salida)
│   └── boot-robustness.md # Contrato de arranque: estados boot|error, detección WebGL/WASM, degradación por-asset
└── checklists/
    └── requirements.md  # Checklist de calidad de la spec (de /speckit-specify + clarify)
```

### Source Code (repository root)

```text
assets-src/                 # NUEVO (no servido): originales pesados (GLB 2048², *_base_color.png).
                            #   Entradas del pipeline; NO los copia Vite (fuera de public/).
public/
└── assets/                 # SOLO salida optimizada y referenciada (WebP 1024² embebido, péndulo decimado).
                            #   Mismas RUTAS que hoy (assets/mascot.glb, ...) → src/render/assets.ts NO cambia.
scripts/
├── optimize-assets.mjs     # NUEVO: pipeline OFFLINE (gltf-transform + sharp): resize→WebP, decimar péndulo,
│                           #   emitir a public/assets solo lo referenciado. Comando: npm run assets:optimize
└── check-asset-budgets.mjs # NUEVO: mide dist/ contra asset-budgets.json; SALE != 0 si excede (extiende tris.mjs)
asset-budgets.json          # NUEVO: manifest único de presupuestos (por categoría, total, techos de tris)
src/
├── main.ts                 # ENVOLVER el arranque en try/catch → showBootError() ante fallo catastrófico;
│                           #   detección WebGL antes de crear el renderer; mensaje claro si RAPIER.init falla
├── render/
│   ├── webgl.ts            # NUEVO (o util en scene.ts): isWebGLAvailable() — detección previa al renderer
│   ├── assets.ts           # SIN CAMBIOS de lógica (rutas idénticas); ya degrada por-asset a primitiva
│   └── scene.ts            # SIN CAMBIOS de colisión; consume las mallas optimizadas igual
└── ui/
    └── bootError.ts        # NUEVO: pantalla de error de arranque (reusa #boot/estilos); botón Reintentar
index.html                  # Pantalla #boot YA existe; AÑADIR metadatos Open Graph/Twitter (compartir) y
                            #   estilos de la pantalla de error
package.json                # AÑADIR scripts: assets:optimize (offline) y build = tsc && vite build && check-asset-budgets;
                            #   devDeps: @gltf-transform/core, @gltf-transform/functions, sharp
vite.config.ts             # SIN plugin de optimización (es offline); el comprobador va como paso del script build
CREDITS.md                  # YA existe; completar/enlazar créditos y licencias de audio y arte (FR-019)

tests/
├── determinism.test.ts     # SIN CAMBIOS; gate: debe seguir en verde tras optimizar assets
└── build/
    └── asset-budgets.test.ts # NUEVO: el comprobador clasifica dentro/fuera y devuelve el código de salida correcto
```

**Structure Decision**: proyecto único existente. La novedad estructural es separar **entradas**
(`assets-src/`, no servidas) de **salidas servidas** (`public/assets/`, solo optimizado y
referenciado): así "sin peso muerto en la entrega" (FR-010) queda garantizado por construcción y las
rutas de runtime no cambian (`src/render/assets.ts` intacto). El pipeline pesado es **offline**
(`npm run assets:optimize`); el **comprobador de presupuestos** es rápido y corre en cada `npm run
build` (y por tanto en CI), fallando el build al exceder. `src/sim/` no se modifica y la puerta de
determinismo no cambia.

## Complexity Tracking

> Sin violaciones de la constitución que justificar: el corte de robustez/rendimiento/distribución
> está en alcance (Principio VI); los presupuestos son cifras de build en un manifest único (no
> ensucian `config.ts`); `src/sim/` y la puerta de determinismo no se tocan; se elige lo más simple
> que pasa la prueba (WebP, sin compresión de geometría, pipeline offline). Sección no aplicable.
