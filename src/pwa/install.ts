// Registro del service worker del juego (004 · US4). La PWA es empaquetado del lado del cliente:
// NO toca el paso fijo ni el determinismo (FR-020). El SW (public/sw.js) se sirve junto al juego
// (scope del juego), así que registrarlo aquí da offline tras la primera carga (FR-019). La
// invitación a instalar vive en la landing (marketing/landing); aquí solo se registra el SW.

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  // En DEV el SW NO debe correr: cachea los módulos servidos por Vite con estrategia cache-first,
  // así que serviría código viejo y rompería el HMR (síntoma: cambios que no se ven aunque el
  // server sirva lo nuevo). Si quedó uno registrado de una sesión previa, lo desregistramos y
  // borramos sus cachés para que el navegador deje de servir el build antiguo (auto-curado).
  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister()
    })
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        for (const k of keys) void caches.delete(k)
      })
    }
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err: unknown) => {
      // Degradar con elegancia: sin SW el juego sigue siendo jugable (solo se pierde el offline).
      console.warn('Service worker no registrado:', err)
    })
  })
}
