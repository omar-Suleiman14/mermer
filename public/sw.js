const CACHE_VERSION = "v3";
const STATIC_CACHE = `mermer-static-${CACHE_VERSION}`;
const FONT_CACHE = `mermer-fonts-${CACHE_VERSION}`;

// Assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  "/icon.svg",
  "/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", function (event) {
  // Clean up old cache versions
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener("fetch", function (event) {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API calls
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.hostname.includes("fonts")) return;

  // Next.js static assets: cache-first (immutable hashes)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Public static files (icons, manifest): cache-first
  if (
    PRECACHE_ASSETS.some((a) => url.pathname === a) ||
    url.pathname.match(/\.(ico|png|svg|webp|avif|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Google Fonts: stale-while-revalidate (fonts rarely change)
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// ── Push notifications ─────────────────────────────────────────────────────────
function safeSameOriginPath(value) {
  try {
    const url = new URL(value || "/", self.location.origin);
    if (url.origin !== self.location.origin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function cleanText(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = {};
  }

  const options = {
    body: cleanText(data.body, "", 240),
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: safeSameOriginPath(data.url),
    },
  };

  event.waitUntil(
    self.registration.showNotification(cleanText(data.title, "mermer", 80), options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = safeSameOriginPath(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Find any existing app window (same origin)
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          // Navigate to the exact target URL (handles ?chat=1, ?userId=..., etc.)
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((c) => c && c.focus());
          }
          return client.focus();
        }
      }
      // No existing window — open a new one
      return clients.openWindow(targetUrl);
    })
  );
});
