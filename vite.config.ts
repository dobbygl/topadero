import { defineConfig } from 'vite'

// @dimforge/rapier3d-compat embebe el WASM en base64: no necesita vite-plugin-wasm,
// optimizeDeps.exclude ni top-level-await (research R2).
export default defineConfig({})
