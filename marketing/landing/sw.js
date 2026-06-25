// Service worker del sitio (004 · US4), registrado desde la landing (scope raíz: cubre landing y
// /play). Empaquetado del cliente: no toca el juego ni el determinismo. Cacheo runtime: la primera
// visita online cachea lo que se va pidiendo (landing + juego, incluido el WASM embebido en el
// bundle); luego arranca y se juega sin conexión (FR-019). Navegación network-first; estáticos
// cache-first. El cambio de versión de CACHE + skipWaiting/clients.claim evita builds atascados.

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
