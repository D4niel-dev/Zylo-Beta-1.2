const CACHE_VERSION = 'v1-zylo';
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const CORE_ASSETS = [
  '/',
  '/login.html',
  '/signup.html',
  '/forgot.html',
  '/reset.html',
  '/mainapp.html',
  '/loading.html',
  '/offline.html',
  '/files/style.css',
  '/images/Zylo_icon.ico',
  '/images/Zylo_icon.png',
  '/images/default_avatar.png',
  '/images/default_banner.png',
  // CDN dependencies used across pages (opaque cached if no-cors)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/feather-icons',
  'https://cdn.socket.io/4.7.2/socket.io.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css',
  'https://cdn.jsdelivr.net/npm/emoji-mart@latest/css/emoji-mart.css',
  'https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![CORE_CACHE, RUNTIME_CACHE, API_CACHE].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function wantsHTML(req) {
  return req.headers.get('accept')?.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML navigation: Network first, fallback to cache, then offline page
  if (wantsHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/offline.html')))
    );
    return;
  }

  // Same-origin API GETs: Network first with cache fallback
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/') && req.method === 'GET') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(API_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Static assets (images, files, uploads): Cache first
  if (url.origin === self.location.origin && (url.pathname.startsWith('/images/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/files/'))) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
      )
    );
    return;
  }

  // Third-party scripts/styles/fonts: Stale-while-revalidate
  if (['script', 'style', 'font'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
