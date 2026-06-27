# Research — 008 Pulido y optimización

Decisiones de fondo de la Fase 0. Cada una: decisión, razón, alternativas descartadas.

## R1. Formato de compresión de texturas: WebP (no KTX2)

**Decisión**: redimensionar las texturas de arte a 1024² y recodificarlas a **WebP**, embebidas en
los GLB. Verificado: el `GLTFLoader` de three@0.184 decodifica WebP embebido vía la extensión
`EXT_texture_webp` (`GLTFTextureWebPExtension` presente en el loader), que es la que escribe
`gltf-transform` al recomprimir. Las texturas sueltas referenciadas (sky, tex-platform/ramp/wall,
sign-finish) van a WebP igualmente.

**Razón**: el presupuesto mide **peso de descarga** (<= 20 MB total, <= 512 KB por textura). WebP +
resize ataca directamente esa restricción con la herramienta más simple. KTX2/Basis solo aporta
extra en memoria de GPU y subida de textura, que **no está medido como problema**: adoptarlo ahora es
complejidad especulativa (YAGNI, Principio III) y añade transcoder + `KTX2Loader`.

**Alternativas descartadas**:
- **KTX2/Basis (KHR_texture_basisu)**: mejor VRAM, pero requiere transcoder y setup del loader; se
  reserva como **escalado condicional** solo si la pasada de rendimiento (P2) muestra que el móvil
  falla por memoria de textura.
- **PNG/JPEG redimensionado**: PNG no comprime fotográficamente; JPEG no soporta alfa. WebP cubre
  ambos casos con mejor ratio.

## R2. Compresión de geometría: descartada

**Decisión**: **no** usar Draco ni meshopt. Solo **decimar** la única malla por encima de techo (el
péndulo, ~20k → <= 12k).

**Razón**: el total es ~74k tris y el peso de los GLB lo domina la **textura embebida**, no la
geometría. Draco/meshopt añadirían un decodificador en runtime para una ganancia marginal. Decimar el
péndulo es una operación puntual y barata que mantiene la promesa low-poly.

**Alternativas descartadas**: Draco (mejor ratio, decoder pesado), meshopt (decoder ligero, ganancia
igualmente marginal aquí).

## R3. Dónde corre el pipeline: prebuild offline, no plugin de Vite

**Decisión**: dos cosas separadas.
- **Optimización** (lenta, determinista): script **offline** `npm run assets:optimize`
  (`gltf-transform` + `sharp`). Se ejecuta cuando cambian los assets fuente, no en cada build.
- **Comprobación de presupuestos** (rápida): `scripts/check-asset-budgets.mjs`, enganchada en
  `npm run build` tras `vite build`. Sale con código != 0 si excede → **el build falla** (lo fijado en
  clarify). Corre también en CI (que ejecuta `npm run build`).

**Razón**: meter `gltf-transform`/`sharp` en un plugin que dispara en cada `vite build` (y en cada CI)
sería lento e innecesario; los assets cambian rara vez. La puerta que SÍ debe correr siempre es la
verificación de presupuestos, que es barata. El prototipo `tris.mjs` (scratchpad) ya cuenta
triángulos; se extiende con tamaños de fichero contra el manifest.

**Alternativas descartadas**: plugin de Vite que optimiza en cada build (lento, acopla build y
optimización); optimización manual a ojo (no reproducible, no verificable).

## R4. Eliminación del peso muerto: estructural, no limpieza

**Decisión**: separar **entradas** de **salidas servidas**.
- Originales pesados (GLB con textura 2048², `*_base_color.png` y demás subproductos) → `assets-src/`,
  **fuera de `public/`** (Vite no los copia).
- El pipeline emite a `public/assets/` **solo** los assets referenciados y optimizados, con las
  **mismas rutas** de runtime (p. ej. `assets/mascot.glb`). Así `src/render/assets.ts` no cambia y
  "la entrega no publica assets no referenciados" (FR-010) queda garantizado **por construcción**, no
  por acordarse de podar.

**Razón**: `public/` se copia tal cual al build; cualquier fichero ahí se publica. Sacar las entradas
de `public/` es la única forma robusta de que el peso muerto no llegue a `dist/`.

**Sub-decisión (reproducibilidad)**: `assets-src/` se **versiona** (es la entrada del pipeline) y
`public/assets/` optimizado también se versiona (lo necesita el `vite build` de CI, que NO corre el
pipeline). La reducción del peso del **repositorio** (los originales siguen en git) es un eje aparte:
lo cubre `auditoria-exposicion-publica.md`, fuera de esta spec (que solo exige que el **build** no los
publique).

**Alternativas descartadas**: mover los assets al grafo de imports (`import url from ...`) para que
Vite haga tree-shaking; obligaría a reescribir la carga por-URL de `assets.ts` (GLTFLoader/Texture
por ruta) sin beneficio sobre la separación de directorios.

## R5. Manifest de presupuestos: archivo único de build, separado de config.ts

**Decisión**: `asset-budgets.json` en la raíz, con presupuesto por categoría (textura de arte,
skybox/señalética, malla de personaje, malla de obstáculo/prop, audio), techo de triángulos por
categoría de malla, y peso total de la entrega. Valores de clarify (2026-06-27).

**Razón**: son cifras de **build**, no perillas de feel de runtime. `config.ts` es para lo segundo
(Principio V); mezclarlas lo ensuciaría. "Un solo sitio" se honra por dominio: `config.ts` para
runtime, `asset-budgets.json` para presupuestos.

**Valores iniciales** (de clarify): total <= 20 MB; textura de arte <= 1024² y 512 KB; skybox y
señalética con su propio presupuesto; personaje <= 15k tris; obstáculo/prop <= 12k tris; escena
<= 120k tris; audio mantenido (sfx pequeños, música ~0,6 MB).

## R6. Robustez de arranque: error catastrófico vs degradación por-asset

**Decisión**: dos niveles, sin reescribir lo que ya funciona.
- **Catastrófico** (sin WebGL, `RAPIER.init()` falla): `main()` se envuelve en try/catch; se detecta
  WebGL **antes** de crear el renderer; ante el fallo, una **pantalla de error** (reusa `#boot` y sus
  estilos) reemplaza la carga con mensaje claro + botón Reintentar. Nunca pantalla en blanco ni error
  solo en consola.
- **Por-asset** (una textura/malla no descarga): **se conserva** la degradación que ya hace
  `src/render/assets.ts` (cae a primitiva/paleta y el juego sigue). No se toca.

**Razón**: la pantalla en blanco aparece hoy porque no hay try/catch de arranque ni detección previa
de WebGL; ese es el hueco real. La carga `#boot` ya existe. La degradación por-asset ya está resuelta.

**Alcance acotado**: la **pérdida de contexto WebGL a mitad de partida** (edge case de la spec) se
trata como **informar**, no recuperación completa (es un agujero más allá del corte publicable).

**Alternativas descartadas**: recuperación total de contexto WebGL (sobre-ingeniería); rehacer la
degradación por-asset (ya funciona).

## R7. Puerta de rendimiento: MANUAL

**Decisión**: la verificación de >= 60 FPS escritorio / >= 30 FPS móvil es **manual**, sobre
dispositivos reales, vía `quickstart.md`. Las puertas **automáticas** son el comprobador de
presupuestos (build) y `tests/determinism.test.ts`.

**Razón**: la infraestructura de captura headless usa SwiftShader (render por software): mide imagen,
no framerate real. Medir FPS de forma fiable exige hardware real. La constitución ya define la puerta
principal como manual (prueba de juego). El plan no promete una puerta automática de FPS.

**Alternativas descartadas**: medir FPS en CI headless (SwiftShader lo falsea); presupuesto de
"tiempo de frame" sintético (no representa GPU real).

## R8. Distribución: reuso del despliegue existente

**Decisión**: no cambia el mecanismo. `deploy.yml` ya hace `npm ci` → `npm test` → `npm run build` →
ensambla `site/` (landing en raíz, juego en `/play`) → Pages con OIDC. `base: './'` ya soporta la
subruta. Esta spec añade: metadatos de compartición (Open Graph/Twitter) en `index.html`, completar
`CREDITS.md`, y verificar el flujo **sobre el build** con `vite preview` (no solo dev server). El
fallo del comprobador de presupuestos en `npm run build` aborta el despliegue, igual que ya lo hace el
fallo de `npm test`.

**Razón**: el empaquetado ya cumple la restricción (web estática sin backend, itch.io igual de
servible). Solo falta el acabado de publicación y la verificación sobre el artefacto real.

## R9. Impacto cruzado en el structuralHash de la spec 006 (descubierto en implementación)

**Hecho**: el `structuralHash` de 006 (`src/circuitgen/hash.ts`) es SHA-256 de la `CircuitDefinition`
ENTERA, incluido `theme.textures`. Mover las texturas standalone a `.webp` (necesario para el
presupuesto de 512 KB/textura) cambió las URLs dentro de la definición y, por tanto, el hash. El
vector golden de reproducibilidad (006, SC-005) cambió de
`83d0888…` a `8e0315f…`.

**Decisión**: actualizar el snapshot golden (es la consecuencia honesta de que la definición cambió).
NO se redefine qué cubre el hash (eso sería un cambio de invariante de 006 colado en un pase de
pulido) ni se bumpea `generatorVersion` (verificado: es etiqueta/clave de caché manual, NO alimenta
la derivación de la semilla; bumpearlo no cambiaría layouts pero tampoco hace falta). La PROPIEDAD de
reproducibilidad sigue intacta: "misma baliza → mismo hash" y "balizas distintas → circuitos
distintos" siguen en verde; solo cambió la constante fijada.

**Consecuencia aceptada (pre-lanzamiento)**: las mejores marcas locales se indexan por
`bestMarkKeyPrefix + structuralHash`, así que las marcas guardadas con el hash viejo quedan
huérfanas. Es local y pre-lanzamiento: aceptable.

**Follow-up (fuera de 008, para 006)**: valorar que el `structuralHash` represente solo la ESTRUCTURA
(geometría/layout/semilla) y excluya campos cosméticos (URLs de textura/malla, color), para que
optimizar o cambiar assets no cambie la identidad del circuito ni resetee marcas. Requiere su propia
spec/clarify; no se hace aquí.
