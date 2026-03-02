// CollegeVault Service Worker v2
const CACHE = 'cv-v2';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => { })));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE && k !== 'cv-share-queue').map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // ── Handle Web Share Target POST (from Viber / any app) ──
    if (e.request.method === 'POST') {
        e.respondWith((async () => {
            try {
                const fd = await e.request.formData();
                const file = fd.get('file');
                if (file) {
                    const cache = await caches.open('cv-share-queue');
                    await cache.put('incoming-file', new Response(file, {
                        headers: {
                            'content-type': file.type || 'application/octet-stream',
                            'x-filename': file.name || 'shared-file',
                        }
                    }));
                }
            } catch (err) { console.warn('Share target error:', err); }
            // Redirect to app with ?share=1
            return Response.redirect('./index.html?share=1', 303);
        })());
        return;
    }

    // ── Cache-first for GET ──
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res && res.status === 200 && res.type !== 'opaque') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => {
                if (e.request.destination === 'document') return caches.match('./index.html');
            });
        })
    );
});
