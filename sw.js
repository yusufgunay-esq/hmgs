/* HMGS 2026 — Service Worker
   Amaç: uygulama telefonda internetsiz de açılsın; Drive trafiği ASLA önbelleğe girmesin. */

const VERSION = 'hmgs-v3';
const SHELL = VERSION + '-shell';

// Uygulamanın kendi dosyaları + dışarıdan gelen görünüm dosyaları.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './book_guide_data.js',
  './book_guide_ui.js',
  './icon-192.png',
  './icon-512.png',
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
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
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

  // Sayfa açılışı: önce ağ, olmazsa önbellekteki kabuk (uçakta da açılır).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await caches.match('./index.html');
        return cached || new Response(
          '<meta charset="utf-8"><body style="background:#0b0f19;color:#94a3b8;font:16px system-ui;padding:2rem">Bağlantı yok ve önbellek boş. Bir kez internetli açman gerekiyor.</body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Diğer dosyalar: önbellekten ver, arka planda tazele.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        caches.open(SHELL).then(c => c.put(req, res.clone())).catch(() => {});
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
