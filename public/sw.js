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

  // HTML Navigation: Network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        // Cache the latest HTML for offline use
        const cacheCopy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, cacheCopy);
        });
        return response;
      }).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        // If neither network nor cache is available
        return new Response(
          "<html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>Offline | Clinic</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:50px 20px;background:#fef2f2;color:#991b1b;margin:0;}h1{font-size:24px;margin-bottom:10px;}p{font-size:16px;line-height:1.5;}</style></head><body><h1> لا يوجد اتصال بالإنترنت</h1><p>لقد انقطع الاتصال وتم تحديث الصفحة. يرجى الانتظار حتى عودة الإنترنت ثم قم بتحديث الصفحة مرة أخرى.</p><p style='margin-top:20px;font-size:14px;opacity:0.8;'>You lost connection and refreshed the page. Please wait for the internet to return, then refresh again.</p></body></html>",
          { headers: { "Content-Type": "text/html" } }
        );
      })
    );
    return;
  }

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

// ── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener("sync", function (event) {
  if (event.tag === "sync-queue") {
    // Notify clients to start syncing
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: "SYNC_QUEUE" });
        }
      })
    );
  }
});
