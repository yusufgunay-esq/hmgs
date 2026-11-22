/* HMGS 2026 â€” Service Worker
   AmaÃ§: uygulama telefonda internetsiz de aÃ§Ä±lsÄ±n; Drive trafiÄŸi ASLA Ã¶nbelleÄŸe girmesin. */
/* Â© 2026 Yusuf GÃœNAY â€” TÃ¼m HaklarÄ± SaklÄ±dÄ±r / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. Ä°zinsiz kopyalama, tÃ¼retme
   veya yeniden yayÄ±nlama yasaktÄ±r. Lisans: depo kÃ¶kÃ¼ndeki LICENSE dosyasÄ±. */

const VERSION = 'hmgs-v81';
const SHELL = VERSION + '-shell';

// UygulamanÄ±n kendi dosyalarÄ± + dÄ±ÅŸarÄ±dan gelen gÃ¶rÃ¼nÃ¼m dosyalarÄ± + StÃ¼dyo kabuÄŸu.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './book_guide_data.js',
  './book_guide_ui.js',
  './icon-192.png',
  './icon-512.png',
  './studio.html',
  './cikmis.html',
  './studio.webmanifest',
  './js/visual-engines-v3.js',
  './studio/css/studio.css',
  './studio/css/studio-mobile.css',
  './studio/js/main.js',
  './studio/js/adhd.js',
  './studio/js/data.js',
  './studio/js/labels.js',
  './studio/js/engine.js',
  './studio/js/elim.js',
  './studio/js/store.js',
  './studio/js/seans.js',
  './studio/js/ui.js',
  './studio/js/book-map.js',
  './studio/js/vault-client.js',
  './studio/js/kural.js',
  './studio/js/legacy-adapt.js',
  './studio/js/pregel.js',
  './studio/js/rota.js',
  './studio/js/koc.js',
  './studio/js/kitap.js',
  './studio/js/kitaplar.js',
  './studio/js/tuyolar.js',
  './studio/js/sinav-konulari.js',
  './studio/js/views/today.js',
  './studio/js/views/odevler.js',
  './studio/js/views/flow.js',
  './studio/js/views/practice.js',
  './studio/js/views/pratik.js',
  './studio/js/views/akim.js',
  './studio/js/views/exam.js',
  './studio/js/views/progress.js',
  './studio/js/gen/alacak_devri.js',
  './studio/js/gen/ciro.js',
  './studio/js/gen/ehliyet.js',
  './studio/js/gen/gaiplik.js',
  './studio/js/gen/icra.js',
  './studio/js/gen/miras.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];


// Bunlar asla Ã¶nbelleÄŸe alÄ±nmaz: kimlik doÄŸrulama ve Drive API canlÄ± olmak zorunda.
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
    // Tek bir dosya patlarsa kurulumun tamamÄ± dÃ¼ÅŸmesin.
    await Promise.all(PRECACHE.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('[sw] Ã¶nbelleÄŸe alÄ±namadÄ±:', url); }
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

  if (NEVER_CACHE.some(h => url.hostname.endsWith(h))) return;      // doÄŸrudan aÄŸa
  if (url.pathname.startsWith('/api/')) return;                      // yerel sunucu uÃ§larÄ±
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Sayfa aÃ§Ä±lÄ±ÅŸÄ± ve modÃ¼l dosyalarÄ±: AÄŸ Ã¶ncelikli (network-first), baÄŸlantÄ± yoksa Ã¶nbellek
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
        '<meta charset="utf-8"><body style="background:#0b0f19;color:#94a3b8;font:16px system-ui;padding:2rem">BaÄŸlantÄ± yok ve Ã¶nbellek henÃ¼z hazÄ±r deÄŸil. Ä°nternete baÄŸlandÄ±ÄŸÄ±nÄ±zda sayfa otomatik yÃ¼klenecektir.</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  })());
});

