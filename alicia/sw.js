// Offline support: app shell from cache; trip data network-first with cached fallback.
const CACHE = "trip-board-alicia-v48";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("trips.enc.json") || e.request.mode === "navigate") {
    // network first so updates show up; fall back to the last copy when offline
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(url.pathname.endsWith("trips.enc.json") ? "trips.enc.json" : "index.html", copy));
      return r;
    }).catch(() => caches.match(url.pathname.endsWith("trips.enc.json") ? "trips.enc.json" : "index.html")));
    return;
  }
  // everything else (app shell, logos): cache first, and keep a copy of anything new (e.g. a new brand's logo)
  e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  })));
});
