/*
 * Service worker de Zentlet.
 *
 * Sólo guarda el "cascarón" de la app para que abra sin conexión. Los
 * datos NO pasan por aquí: viven en IndexedDB (cache persistida de
 * TanStack Query) y las escrituras van en su cola. Una sola fuente de
 * verdad para los datos; el SW nunca responde /api/* desde cache.
 *
 * - /_next/static/*, /icons/*: cache first (nombres con hash, inmutables).
 * - Navegaciones (HTML): network first con 3 s de espera; sin red o con
 *   red lenta, la última versión guardada de esa página.
 * - Todo lo demás (API, auth, Server Actions, métodos != GET): red, sin tocar.
 *
 * Al cambiar la estrategia, sube VERSION: la activación borra lo anterior.
 */

const VERSION = "v1";
const STATIC_CACHE = `zentlet-static-${VERSION}`;
// el prefijo "zentlet-pages" lo borra también el cierre de sesión
const PAGES_CACHE = `zentlet-pages-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const current = new Set([STATIC_CACHE, PAGES_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name.startsWith("zentlet-") && !current.has(name)).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/** Sólo respuestas finales y propias: nunca un redirect al login. */
function isCacheablePage(response) {
  return response.ok && response.type === "basic" && !response.redirected;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  const network = fetch(request).then((response) => {
    if (isCacheablePage(response)) cache.put(request, response.clone());
    return response;
  });
  // si gana el timeout y la red falla después, que no quede un rechazo suelto
  network.catch(() => {});

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS)),
    ]);
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // red lenta sin copia guardada: esperar a la red de todos modos
    try {
      return await network;
    } catch {
      return (await cache.match("/")) ?? Response.error();
    }
  }
}
