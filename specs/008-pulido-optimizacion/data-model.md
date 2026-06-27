# Data Model — 008 Pulido y optimización

Entidades de **build y UI**, no de simulación. Ninguna entra en `src/sim/` ni en el paso fijo.

## AssetBudgetManifest (`asset-budgets.json`)

Fuente única de los presupuestos (build-time). Valores de clarify (2026-06-27).

| Campo | Tipo | Descripción |
|---|---|---|
| `totalMaxBytes` | número | Peso máximo de la entrega de la primera jugada (assets + bundle). 20 MB. |
| `categories[]` | lista | Presupuesto por categoría de asset. |
| `categories[].id` | texto | `art-texture` · `sky-signage` · `mesh-character` · `mesh-obstacle-prop` · `audio`. |
| `categories[].match` | texto/patrón | Cómo se asignan los ficheros a la categoría (glob o lista). |
| `categories[].maxBytesPerFile` | número | Peso máximo por fichero (p. ej. textura de arte = 512 KB). |
| `categories[].maxResolution` | número? | Resolución máx. de textura standalone (1024). Solo texturas en fichero. |
| `categories[].maxTrianglesPerMesh` | número? | Techo de triángulos por malla (personaje 15k, obstáculo/prop 12k). Solo mallas. |
| `categories[].maxEmbeddedImageBytes` | número? | Peso máx. de cada textura WebP **embebida** en el GLB (512 KB). Solo mallas. |
| `sceneMaxTriangles` | número | Techo de triángulos de la escena visible (120k). **Referencia documental**, no build gate. |
| `sceneTrianglesEnforcement` | texto | `manual`: el comprobador NO usa `sceneMaxTriangles` para el código de salida. |

Medibilidad (clave, ver `contracts/asset-budgets.md`): la resolución de la textura de **arte** (en
GLB) la garantiza el **optimizador** (1024² por construcción), no el comprobador; el **peso** de esa
textura sí lo mide el comprobador parseando las imágenes embebidas del GLB. Los triángulos de **escena
visible** dependen del circuito procedural (varían por día): es **QA manual**, no build gate.

Reglas de validación: límites **inclusivos** (igual al máximo = dentro), definidos de forma inequívoca
en el contrato. Un asset publicado que no encaje en ninguna categoría es un **error** (evita que algo
escape al presupuesto por no estar clasificado).

## BudgetReport (salida del comprobador)

Resultado de `scripts/check-asset-budgets.mjs` sobre `dist/`.

| Campo | Tipo | Descripción |
|---|---|---|
| `items[]` | lista | Un registro por asset publicado. |
| `items[].path` | texto | Ruta dentro de `dist/`. |
| `items[].category` | texto | Categoría asignada (o `unclassified`). |
| `items[].bytes` | número | Peso medido. |
| `items[].triangles` | número? | Triángulos (solo mallas). |
| `items[].resolution` | número? | Lado máx. en px (solo texturas standalone). |
| `items[].embeddedImageBytes` | número[]? | Peso de cada imagen WebP embebida (solo GLB). |
| `items[].status` | enum | `ok` · `over-size` · `over-resolution` · `over-triangles` · `over-embedded-image` · `unclassified`. |
| `totalBytes` | número | Suma de la entrega medida (audio: solo el formato mayor de cada par mp3/ogg = descarga real). |
| `totalStatus` | enum | `ok` · `over`. |
| `exitCode` | número | 0 si todo `ok`; != 0 si cualquier `over-*`/`unclassified`. `sceneMaxTriangles` NO influye (build FALLA solo por lo medible en `dist/`). |

Estado/ciclo: el comprobador lee el manifest, recorre `dist/`, clasifica y mide, imprime un resumen
legible (qué se pasó y por cuánto) y devuelve el código de salida. No tiene estado persistente.

## BootPhase (estado de arranque, UI)

Estados visibles durante el arranque, gobernados por `main.ts`. No es estado de simulación.

| Estado | Cuándo | Vista |
|---|---|---|
| `loading` | Init de Rapier + resolución del día + carga de assets | `#boot` (ya existe) |
| `error` | Fallo catastrófico (sin WebGL, `RAPIER.init()` falla) | Pantalla de error (`bootError.ts`) con mensaje + Reintentar |
| `ready` | Init ok | Se retira `#boot`; arranca el shell (007) en `title` |

Transiciones: `loading → ready` (éxito) o `loading → error` (fallo catastrófico). El fallo **por
asset** NO transiciona a `error`: se queda en `loading → ready` con reserva a primitiva (lógica ya
existente en `assets.ts`). `error → loading` al pulsar Reintentar (recarga/reintento del arranque).

## BootError (modelo del mensaje de error)

| Campo | Tipo | Descripción |
|---|---|---|
| `kind` | enum | `no-webgl` · `wasm-init-failed` · `unknown`. |
| `title` | texto | Titular claro (p. ej. "Tu navegador no soporta gráficos 3D"). |
| `detail` | texto | Explicación breve + qué hacer. |
| `action` | enum | `retry` (botón Reintentar) · `info` (solo instrucción, p. ej. activar aceleración). |

## QAChecklist (`quickstart.md` / checklist publicable)

Lista repetible de comprobaciones de acabado, marcable en escritorio y móvil. No es código; es el
artefacto de la puerta manual del Principio VI.

| Grupo | Ejemplos de ítem |
|---|---|
| Robustez (P1) | Pantalla de carga visible; sin WebGL → mensaje; WASM falla → mensaje + reintentar; asset caído → reserva jugable. |
| Peso (P2) | `dist/` sin assets no referenciados; cada asset dentro de presupuesto; total <= 20 MB; comprobador falla al forzar exceso. |
| Rendimiento (P2, manual) | >= 60 FPS escritorio y >= 30 FPS móvil de gama media con todo cargado. |
| Visual/UI (P3) | Mallas alineadas a colliders; sin geometría que asome ni z-fighting; shell coherente en escritorio y móvil. |
| Distribución (P3) | Flujo de extremo a extremo sobre `vite preview`; offline; metadatos de compartición; créditos/licencias. |
| Determinismo (gate) | `tests/determinism.test.ts` en verde tras optimizar assets. |

## Reuso (sin cambios)

- `DailyCircuit`, `LocalDailyBest` (006), `PlayerSettings` (007): no se tocan.
- `src/render/assets.ts` `AssetCatalog`: misma forma y mismas rutas; consume los assets optimizados.
- `src/sim/`: intacto.
