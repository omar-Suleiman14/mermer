self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

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
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (
          clientUrl.origin === self.location.origin &&
          `${clientUrl.pathname}${clientUrl.search}${clientUrl.hash}` === targetUrl &&
          "focus" in client
        ) {
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});
