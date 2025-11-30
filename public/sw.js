// Minimal service worker to prevent 404 errors
// This service worker does not cache or intercept requests
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

// No fetch event handler - all requests pass through normally


