self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    return;
  }
});
