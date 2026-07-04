const CACHE_NAME = 'neuralpaw-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
