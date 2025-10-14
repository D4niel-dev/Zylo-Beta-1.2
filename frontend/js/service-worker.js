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
  '/manifest.webmanifest',
  '/files/sw-register.js',
  '/files/style.css',
  // Local vendor assets to ensure full offline startup
  '/files/vendor/tailwindcss.js',
  '/files/vendor/feather-icons.js',
  '/files/vendor/socket.io.min.js',
  '/files/vendor/cropper.min.css',
  '/files/vendor/cropper.min.js',
  '/files/vendor/emoji-mart.css',
  '/files/vendor/emoji-mart.js',
  // Core images
  '/images/Zylo_icon.ico',
  '/images/Zylo_icon.png',
  '/images/default_avatar.png',
  '/images/default_banner.png',
  // Social icon assets referenced in signup
  '/images/devicons/google-original.svg',
  '/images/devicons/github-original.svg',
  '/images/devicons/discordjs-original.svg',
  '/images/devicons/windows8-original.svg'
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

  // HTML navigation: Cache first, then network, fallback to offline page
  if (wantsHTML(req)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached || caches.match('/offline.html'));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Same-origin API GETs: Network first with cache fallback (still works offline after first load)
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