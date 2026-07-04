const CACHE_NAME = 'neuralpaw-v2'
const STATIC_ASSETS = [
  '/',
  '/index.html'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Clear old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. API calls go network-only
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // 2. HTML documents go Network-First (ensures latest chunk mappings)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 3. Static assets go Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        const copy = response.clone()
        // Only cache successful requests to same origin
        if (response.status === 200 && url.origin === location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
    })
  )
})
