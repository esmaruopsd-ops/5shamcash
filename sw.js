/* =====================================================
   SERVICE WORKER — شام كاش الأرشيف العسكري
   ===================================================== */

const CACHE_NAME = "sham-cash-v1.0.0";
const OFFLINE_URL = "./index.html";

// Files to cache on install
const PRECACHE_URLS = [
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

/* ---- INSTALL ---- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local files; external fonts may fail offline, that's OK
      return cache.addAll([OFFLINE_URL, "./manifest.json"]).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

/* ---- ACTIVATE ---- */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- FETCH ---- */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // For navigation requests — serve index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
    );
    return;
  }

  // For Google Fonts & CDN — network first, fallback cache
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("cdnjs.cloudflare.com")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // For same-origin requests — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});

/* ---- BACKGROUND SYNC (for future use) ---- */
self.addEventListener("sync", event => {
  if (event.tag === "sync-archive") {
    // Placeholder for future sync functionality
    console.log("[SW] Background sync triggered");
  }
});

/* ---- PUSH NOTIFICATIONS (for future use) ---- */
self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "شام كاش", {
      body: data.body || "إشعار جديد",
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-72.png",
      dir: "rtl",
      lang: "ar"
    })
  );
});
