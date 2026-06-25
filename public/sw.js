// Service worker del juego (004 · US4). Empaquetado del lado del cliente: NO toca el paso fijo ni
// el determinismo (FR-020). Cacheo en runtime (no precache de nombres hasheados): la primera carga
// online cachea el shell del juego (HTML + JS con el WASM de Rapier embebido + CSS + assets), y a
// partir de ahí arranca y se juega sin conexión (FR-019). Navegación network-first (recoge
// actualizaciones); estáticos cache-first (rápidos e inmutables). El cambio de versión de CACHE +
// skipWaiting/clients.claim evita quedarse atascado en un build viejo (edge case "actualización").

const CACHE = 'topadero-pwa-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // HTML: network-first para recoger nuevas versiones; sin conexión → cache.
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(CACHE)
          cache.put(req, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(req)
          return cached || (await caches.match('./')) || Response.error()
        }
      })(),
    )
    return
  }

  // Estáticos (JS/CSS/assets): cache-first, y cachear en la primera carga online.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      const fresh = await fetch(req)
      const cache = await caches.open(CACHE)
      cache.put(req, fresh.clone())
      return fresh
    })(),
  )
})
