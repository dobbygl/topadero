# Contrato — Presupuestos de assets (manifest + comprobador)

Interfaz de build que hace cumplir FR-006..FR-010 y SC-002..SC-006. Sin runtime: es una puerta de
construcción.

## Qué se mide dónde (medibilidad)

Importante: la textura de arte (mascota, obstáculos, props) va **embebida en WebP dentro del GLB** y
los `*_base_color.png` se mueven a `assets-src/` (no se publican). Por eso no toda cifra del spec es
una propiedad de ficheros de `dist/`. Reparto explícito de la verificación:

| Dimensión | Cómo se hace cumplir |
|---|---|
| Peso por textura **standalone** (sky, señalética, tex-platform/ramp/wall, flecha) | **Build gate**: son ficheros en `dist/`; bytes y resolución medibles del propio fichero. |
| Resolución de textura de **arte embebida** (<= 1024²) | **Optimize-time por construcción**: el optimizador redimensiona a 1024² (única vía por la que la textura adquiere resolución). Spot-check manual en QA. |
| Peso de textura de **arte embebida** (<= 512 KB) | **Build gate**: el comprobador parsea el GLB y mide los bytes de cada imagen embebida (`images[]`/`bufferViews`), igual que cuenta triángulos. |
| Peso por **GLB** (con su textura embebida) | **Build gate**: bytes del fichero GLB. |
| Triángulos por **malla** (personaje <= 15k, obstáculo/prop <= 12k) | **Build gate**: parseo del GLB (como `tris.mjs`). |
| **Peso total** de la entrega (<= 20 MB) | **Build gate**: suma de `dist/` (ver nota de audio dual). |
| **Triángulos de escena** visibles (<= 120k) | **NO build gate**: el circuito es procedural (varía por día). Se trata como **QA manual** o como cota derivada del máximo del generador (`circuitgen`/`circuit.ts`), no como aserción del comprobador sobre `dist/`. |

## Manifest: `asset-budgets.json`

Forma (valores de clarify 2026-06-27):

```json
{
  "totalMaxBytes": 20971520,
  "categories": [
    { "id": "texture-standalone",   "match": "assets/sky.*|assets/sign-*.*|assets/tex-*.*",              "maxBytesPerFile": 524288, "maxResolution": 1024 },
    { "id": "mesh-character",        "match": "assets/mascot.glb|assets/player-rigged.glb",                 "maxBytesPerFile": 1048576, "maxTrianglesPerMesh": 15000, "maxEmbeddedImageBytes": 524288 },
    { "id": "mesh-obstacle-prop",    "match": "assets/obstacle-*.glb|assets/prop-*.glb",                    "maxBytesPerFile": 1048576, "maxTrianglesPerMesh": 12000, "maxEmbeddedImageBytes": 524288 },
    { "id": "audio",                 "match": "audio/*",                                                    "maxBytesPerFile": 786432 }
  ],
  "sceneMaxTriangles": 120000,
  "sceneTrianglesEnforcement": "manual"
}
```

Notas:
- Bytes en binario (1 MB = 1048576). El total cuenta **lo publicado en `dist/`** (assets + JS/CSS del
  bundle), que es lo que descarga la primera jugada.
- `maxEmbeddedImageBytes` aplica a cada imagen WebP **embebida** en el GLB (peso de la textura de arte,
  SC-004); la resolución <= 1024² la garantiza el optimizador, no el comprobador.
- `sky-signage` admite su propio presupuesto; aquí se unifica en `texture-standalone`. La señalética
  (`sign-finish`) y el cielo (`sky`) pueden subirse a 2048² si hace falta nitidez: ajustar
  `maxResolution` por sub-grupo si se separan.
- `sceneMaxTriangles` queda en el manifest como **referencia documental** con
  `sceneTrianglesEnforcement: "manual"`; el comprobador NO lo usa para el código de salida.
- El `match` exacto se ajusta a las rutas reales (las texturas standalone pasan a `.webp`); lo
  normativo es que **toda** ruta publicada caiga en una categoría.
- **Audio dual**: se publican `.mp3` y `.ogg` de cada pista, pero el navegador descarga **solo uno**.
  El total cuenta **solo el formato mayor de cada par** (descarga real, implementado en T026). El
  presupuesto POR fichero sí aplica a cada `.mp3` y `.ogg` por separado.

## Comprobador: `scripts/check-asset-budgets.mjs`

**Entrada**: el manifest + el directorio `dist/` (tras `vite build`).
**Proceso**: recorre los ficheros publicados; clasifica cada uno por categoría; mide bytes (todos),
resolución (texturas standalone), y para GLB parsea el chunk JSON: triángulos y bytes de cada imagen
**embebida** (como `tris.mjs`); compara con el presupuesto; suma el total. **No** evalúa
`sceneMaxTriangles` (es manual; ver tabla de medibilidad).
**Salida**: imprime un resumen legible (por asset: categoría, peso/tris/res, estado; y el total) y
termina con un **código de salida**:

| Condición | exitCode |
|---|---|
| Todos los assets dentro de presupuesto y total dentro | `0` |
| Algún asset supera peso de fichero o resolución | `!= 0` |
| Alguna malla supera su techo de triángulos | `!= 0` |
| Alguna textura embebida en un GLB supera `maxEmbeddedImageBytes` | `!= 0` |
| El total supera `totalMaxBytes` | `!= 0` |
| Algún asset publicado sin categoría (`unclassified`) | `!= 0` |

(`sceneMaxTriangles` NO entra en el código de salida: se verifica en QA manual o como cota derivada
del generador.)

Regla de límite: **inclusiva**. Un asset de exactamente `maxBytesPerFile` o una malla de exactamente
`maxTrianglesPerMesh` están DENTRO (ok); solo lo **estrictamente mayor** falla. El total a exactamente
`totalMaxBytes` está dentro.

## Enganche en el build

`package.json`:

```jsonc
{
  "scripts": {
    "assets:optimize": "node scripts/optimize-assets.mjs",   // OFFLINE, no en cada build
    "build": "tsc --noEmit && vite build && node scripts/check-asset-budgets.mjs"
  }
}
```

Garantías:
- `npm run build` **falla** (código != 0) si algún presupuesto se excede → no se produce despliegue
  (CI corre `npm run build`).
- `assets:optimize` NO está en `build`: la optimización es offline; CI construye desde el
  `public/assets/` ya optimizado y versionado.

## Test (`tests/build/asset-budgets.test.ts`)

- Dado un manifest y un conjunto sintético de ficheros (tamaños/tris/resolución/imágenes embebidas),
  el comprobador clasifica correctamente y marca `ok`/`over-size`/`over-resolution`/`over-triangles`/
  `over-embedded-image`/`unclassified`.
- Un asset exactamente en el límite → `ok` (regla inclusiva).
- Un asset por encima (peso, resolución, triángulos o imagen embebida) → `exitCode != 0`.
- Un asset sin categoría → `exitCode != 0`.
- `sceneMaxTriangles` NO afecta al `exitCode` (se afirma que el comprobador lo ignora).
