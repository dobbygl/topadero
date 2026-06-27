// Detección de WebGL (008 · US1). Robustez de arranque: comprobar el soporte ANTES de crear el
// renderer (SceneView) para poder mostrar una pantalla de error clara en vez de dejar que
// `new THREE.WebGLRenderer` lance y deje pantalla en blanco (Principio VI, FR-002). Vista pura: no
// toca src/sim ni el paso fijo. Solo render/E-S.

/** true si el navegador puede crear un contexto WebGL2 (lo que three necesita para renderizar). */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    // three.js (r163+) es WebGL2-only; comprobar webgl2 ESPECÍFICAMENTE. Un navegador con solo webgl1
    // no puede crear el renderer, así que NO debe pasar este check: si pasara, `new SceneView` lanzaría
    // y el jugador vería el error genérico en vez del claro "no soporta 3D" (FR-002).
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch {
    // Algunos navegadores lanzan al pedir el contexto si la aceleración está bloqueada.
    return false
  }
}
