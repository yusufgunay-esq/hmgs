/* HMGS 2026 — Service Worker
   Amaç: uygulama telefonda internetsiz de açılsın; Drive trafiği ASLA önbelleğe girmesin. */

const VERSION = 'hmgs-v11';
const SHELL = VERSION + '-shell';

// Uygulamanın kendi dosyaları + dışarıdan gelen görünüm dosyaları + Stüdyo kabuğu.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './book_guide_data.js',
  './book_guide_ui.js',
  './icon-192.png',
  './icon-512.png',
  './studio.html',
  './studio.webmanifest',
  './js/visual-engines-v3.js',
  './studio/css/studio.css',
  './studio/css/studio-mobile.css',
  './studio/js/main.js',
  './studio/js/data.js',
  './studio/js/engine.js',
  './studio/js/elim.js',
  './studio/js/store.js',
  './studio/js/ui.js',
  './studio/js/book-map.js',
  './studio/js/vault-client.js',
  './studio/js/views/today.js',
  './studio/js/views/odevler.js',
  './studio/js/views/flow.js',
  './studio/js/views/practice.js',
  './studio/js/views/pratik.js',
  './studio/js/views/exam.js',
  './studio/js/views/progress.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];


// Bunlar asla önbelleğe alınmaz: kimlik doğrulama ve Drive API canlı olmak zorunda.
const NEVER_CACHE = [
  'accounts.google.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'apis.google.com',
  'content.googleapis.com'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Tek bir dosya patlarsa kurulumun tamamı düşmesin.
    await Promise.all(PRECACHE.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('[sw] önbelleğe alınamadı:', url); }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  if (NEVER_CACHE.some(h => url.hostname.endsWith(h))) return;      // doğrudan ağa
  if (url.pathname.startsWith('/api/')) return;                      // yerel sunucu uçları
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Sayfa açılışı ve modül dosyaları: Ağ öncelikli (network-first), bağlantı yoksa önbellek
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        const cache = await caches.open(SHELL);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (_) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./studio.html') || await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return new Response(
        '<meta charset="utf-8"><body style="background:#0b0f19;color:#94a3b8;font:16px system-ui;padding:2rem">Bağlantı yok ve önbellek henüz hazır değil. İnternete bağlandığınızda sayfa otomatik yüklenecektir.</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  })());
});

