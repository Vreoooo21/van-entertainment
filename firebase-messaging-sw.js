const CACHE_NAME = "van-cms-pwa-v5";
const APP_SHELL = [
  "./admin-login.html",
  "./dashboard.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./css/admin.css",
  "./js/admin-mobile.js",
  "./js/admin.js",
  "./js/admin-extended.js",
  "./js/admin-push.js",
  "./js/pwa.js",
  "./js/firebase-config.js",
  "./images/app-icons/icon-192.png",
  "./images/app-icons/icon-512.png",
  "./images/app-icons/badge-96.png"
];

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "./dashboard.html#applications";
  event.waitUntil((async () => {
    const absoluteUrl = new URL(targetUrl, self.location.origin).href;
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(absoluteUrl);
        return client.focus();
      }
    }
    return clients.openWindow(absoluteUrl);
  })());
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        return (await caches.match(event.request)) || (await caches.match("./offline.html"));
      }
    })());
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});

try {
  importScripts("./js/firebase-config.js");
  const cfg = self.VAN_FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_") && cfg.projectId && !String(cfg.projectId).startsWith("PASTE_");
  if (configured) {
    importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");
    firebase.initializeApp(cfg);
    firebase.messaging();
  }
} catch (error) {
  console.warn("VAN CMS push worker belum dikonfigurasi:", error);
}
