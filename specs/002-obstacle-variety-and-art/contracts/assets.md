# Contract — Frontera render ↔ assets · Feature 002

Define cómo entra el arte (excepción v1.1.0) sin cruzar la frontera headless. Vive entero en
`src/render`; `src/sim/` no participa.

## Regla dura de frontera

- **Cero imports de Three.js o de assets alcanzables desde `src/sim/`.** Si un módulo de `sim/`
  importara `three` o un loader, el test de determinismo en Node dejaría de cargar. Esta es la
  línea que protege el Principio II y la excepción v1.1.0.
- Los campos visual-only (`meshUrl`, `color`, `theme`, `skyboxUrl`, `texture`) viven en
  `circuit.ts` junto a la geometría, pero **solo los lee `render/`**. `sim/` los ignora (igual
  que hoy ignora `StaticBox.color`).

## Carga (en `render/assets.ts`, NUEVO)

```ts
async function loadAssets(circuit: CircuitDefinition): Promise<AssetCatalog>
```

- Se llama en `main.ts` **después de `RAPIER.init()` y ANTES de arrancar el bucle** → ninguna
  latencia de carga entra en el paso fijo (FR-016).
- Texturas/skybox con `TextureLoader`; mallas low-poly con `GLTFLoader` (three/examples);
  formato **GLB**; rutas estáticas bajo `public/assets/` (servidas por Vite).
- Devuelve un catálogo (texturas, mallas clonables, skybox) + estado de carga por recurso.

## Reserva (fallback) — obligatoria

- Si un asset **falta o falla** al cargar, `scene.ts` usa la **apariencia primitiva** actual
  (BoxGeometry/CapsuleGeometry/CylinderGeometry + color plano). El juego continúa sin fallo y
  **sin no-determinismo** (la simulación no depende del asset). Esto preserva de facto un modo
  "solo primitivas".

## Alineación malla ↔ collider (invariante visible)

- Cada malla de obstáculo se enlaza a su obstáculo por `id` y se coloca con la **pose
  interpolada** (`getObstacleTransforms`/`getPrevious...` + `alpha`, con **slerp** del
  quaternion). Debe quedar alineada con su collider primitivo sin desincronización perceptible
  (SC-004).
- La malla del personaje (mascot) sustituye visualmente a la cápsula; el **collider sigue siendo
  cápsula** (FR-014). Si la malla no carga, se dibuja la cápsula.
- Las mallas **nunca** son geometría de colisión (FR-013).

## Identidad visual (FR-008..FR-010)

- Dirección de arte de `./marketing`: paleta cartoon (cielo `#7EC8F3` / naranja `#FF7A1A` /
  teal `#2FD4C4` / rosa `#FF5FA2` / oro `#D4AF37` / tinta `#14233B`), mascot y props.
- Skybox/fondo, materiales texturizados de plataformas/rampa/muros, señalización de salida y
  meta visibles, HUD coherente.

## Generación de assets (fase implement, fuera del runtime)

- Imágenes 2D: **gpt-image-2** (OpenAI, `OPENAI_API_KEY` en `.env` local gitignored).
- Mallas low-poly: **Meshy** (vía MCP; confirmar coste en créditos antes de cada generación).
- Salida → `public/assets/`. Referencia y posibles semillas: `./marketing`.
