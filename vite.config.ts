import { defineConfig } from 'vite'

// @dimforge/rapier3d-compat embebe el WASM en base64: no necesita vite-plugin-wasm,
// optimizeDeps.exclude ni top-level-await (research R2).
// base relativa: el sitio se sirve bajo /topadero/ en GitHub Pages y en raíz en dev/preview;
// './' resuelve los assets relativos a index.html en ambos casos (es una sola página sin router).
export default defineConfig({
  base: './',
})
