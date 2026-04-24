const CACHE_NAME = "task-manager-v3";

// ── Scheduled Notification Timers ─────────────────────────────────────────
/** Map of notification id -> setTimeout timer id */
const scheduledTimers = new Map();

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SCHEDULE_NOTIFICATIONS") {
    const { notifications } = event.data;

    // Cancel all existing timers
    for (const timerId of scheduledTimers.values()) {
      clearTimeout(timerId);
    }
    scheduledTimers.clear();

    const now = Date.now();
    for (const notif of notifications) {
      const delay = notif.scheduledAt - now;
      if (delay <= 0) continue; // Already past, skip

      const timerId = setTimeout(() => {
        self.registration.showNotification(notif.title, {
          body: notif.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: notif.id,
          renotify: false,
        });
        scheduledTimers.delete(notif.id);
      }, delay);

      scheduledTimers.set(notif.id, timerId);
    }
  }

  if (event.data.type === "TEST_NOTIFICATION") {
    self.registration.showNotification("タスク管理 — テスト通知", {
      body: "通知が正常に動作しています！締切前日・当日の朝9:00にリマインドします。",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
    });
  }
});

// Notification click: focus the app window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow("/");
      })
  );
});

// App shell assets to cache on install
const APP_SHELL = ["/", "/all", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Skip Next.js internal routes
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation requests: network-first (ensures fresh HTML after deployments)
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Network error", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 503 });
  }
}
