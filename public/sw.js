// BACAPASMUIN Service Worker - PWA Offline Caching
const CACHE_NAME = "bacapasmuin-pwa-v1"

const STATIC_PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/BACAPASMUIN.webp",
  "/favicon.svg",
  "/opengraph.png"
]

// Install: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled so individual asset failures don't abort install
      return Promise.allSettled(
        STATIC_PRECACHE.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => {
              if (res.ok) return cache.put(url, res)
            })
            .catch((err) => {
              console.warn("[SW] Precache skipped for:", url, err)
            })
        )
      )
    }).then(() => self.skipWaiting())
  )
})

// Activate: Clean up older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", key)
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Bypass caching for Supabase, Google Auth, and external APIs
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("google.com") ||
    url.hostname.includes("googleapis.com") ||
    url.pathname.startsWith("/api/")
  ) {
    return
  }

  // Handle SPA navigation: Network first, fall back to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match("/index.html").then((cached) => cached || caches.match("/"))
        })
    )
    return
  }

  // Handle static assets: Cache-First with Network fallback & revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Asynchronously revalidate cache in the background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse)
              })
            }
          })
          .catch(() => {}) // Ignore background network errors
        return cachedResponse
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse
        }
        const clone = networkResponse.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone)
        })
        return networkResponse
      })
    })
  )
})
