const CACHE = "gas-booking-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const CDN = [
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(async u => {
      try { await c.put(u, await fetch(new Request(u, {mode: "no-cors"}))); } catch (_) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isApp = url.origin === location.origin;
  const isCdn = CDN.includes(req.url);
  if (!isApp && !isCdn) return; // Firestore/API calls: SDK handles them

  // cache first, update in background (next open gets the new version)
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(req, {ignoreSearch: true}) ||
                   (req.mode === "navigate" ? await c.match("./index.html") : null);
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
    return cached || (await net) || new Response("Offline", {status: 503});
  })());
});
