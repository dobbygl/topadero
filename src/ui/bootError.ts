// Pantalla de error de arranque (008 · US1). Si el arranque falla de forma CATASTRÓFICA (sin WebGL,
// el WASM de Rapier no inicia, o una excepción no prevista), mostramos un mensaje claro con una acción
// en vez de dejar pantalla en blanco o un error solo en consola (Principio VI, FR-002/003/005).
//
// NO confundir con la degradación POR-ASSET (una textura/malla que no carga), que ya resuelve
// src/render/assets.ts cayendo a primitiva sin romper el arranque: eso NO llega aquí.
//
// Reutiliza el contenedor estático #boot de index.html (mismo look de marca). #boot solo se retira en
// el arranque correcto (main.ts), así que ante un fallo sigue presente para repintarlo como error.

export type BootErrorKind = 'no-webgl' | 'wasm-init-failed' | 'unknown'

interface BootErrorContent {
  title: string
  detail: string
  action: 'retry' | 'info'
}

/** Texto por tipo de fallo. Exportado para poder testearlo sin DOM (puro). */
export const BOOT_ERROR_CONTENT: Record<BootErrorKind, BootErrorContent> = {
  'no-webgl': {
    title: 'Tu navegador no puede mostrar gráficos 3D',
    detail:
      'Topadero necesita aceleración por hardware (WebGL). Activa la aceleración gráfica en los ajustes del navegador, o prueba con Chrome, Edge, Firefox o Safari actualizados.',
    action: 'info',
  },
  'wasm-init-failed': {
    title: 'No se pudo iniciar el motor del juego',
    detail:
      'Falló la carga del módulo de físicas. Suele resolverse al reintentar; comprueba también tu conexión.',
    action: 'retry',
  },
  unknown: {
    title: 'Algo salió mal al cargar',
    detail: 'No se pudo arrancar el juego. Reintenta; si persiste, prueba a recargar la página.',
    action: 'retry',
  },
}

/** Repinta #boot (o crea un overlay equivalente) como pantalla de error clara. Nunca pantalla en blanco. */
export function showBootError(kind: BootErrorKind): void {
  const content = BOOT_ERROR_CONTENT[kind]
  let root = document.getElementById('boot')
  if (!root) {
    root = document.createElement('div')
    root.id = 'boot'
    document.body.appendChild(root)
  }
  root.classList.add('error')
  root.replaceChildren()

  const title = document.createElement('b')
  title.textContent = content.title
  const detail = document.createElement('span')
  detail.className = 'boot-error-detail'
  detail.textContent = content.detail
  root.append(title, detail)

  if (content.action === 'retry') {
    const btn = document.createElement('button')
    btn.className = 'boot-btn'
    btn.type = 'button'
    btn.textContent = 'Reintentar'
    btn.addEventListener('click', () => location.reload())
    root.append(btn)
    // Foco para que sea activable con teclado de inmediato (accesibilidad, sin depender de consola).
    btn.focus()
  }
}
