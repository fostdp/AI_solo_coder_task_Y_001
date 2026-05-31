const CACHE_NAME = 'quantum-tunneling-v1.0.0';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/quantum-worker.js',
    '/manifest.json',
    '/favicon.ico'
];

const API_CACHE_NAME = 'quantum-tunneling-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
    console.log('[PWA] Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[PWA] Caching app shell:', ASSETS_TO_CACHE);
                return cache.addAll(
                    ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' }))
                );
            })
            .then(() => {
                console.log('[PWA] All resources cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[PWA] Cache installation failed:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[PWA] Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log('[PWA] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[PWA] Activation complete, claiming clients');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') {
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.html') || url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        fetch(request)
                            .then((response) => {
                                if (response && response.status === 200) {
                                    caches.open(CACHE_NAME).then((cache) => {
                                        cache.put(request, response.clone());
                                    });
                                }
                            })
                            .catch(() => {});
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then((response) => {
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                            return response;
                        });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request)
                    .then((response) => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                        return response;
                    });
            })
    );
});

function handleApiRequest(request) {
    return fetch(request)
        .then((response) => {
            if (!response || response.status !== 200) {
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[PWA] Serving stale API data from cache:', request.url);
                        return cachedResponse;
                    }
                    return response || new Response(
                        JSON.stringify({ error: 'Offline and no cached data available' }),
                        { status: 503, headers: { 'Content-Type': 'application/json' } }
                    );
                });
            }
            
            const responseToCache = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
                const headers = new Headers(responseToCache.headers);
                headers.append('sw-cache-time', Date.now().toString());
                cache.put(request, new Response(responseToCache.body, {
                    status: responseToCache.status,
                    statusText: responseToCache.statusText,
                    headers: headers
                }));
            });
            
            return response;
        })
        .catch(() => {
            return caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[PWA] Offline: Serving cached API response:', request.url);
                    return cachedResponse;
                }
                return new Response(
                    JSON.stringify({ 
                        error: '网络连接失败，请检查网络设置',
                        offline: true 
                    }),
                    { 
                        status: 503, 
                        headers: { 'Content-Type': 'application/json' } 
                    }
                );
            });
        });
}

self.addEventListener('message', (event) => {
    switch (event.data.action) {
        case 'skipWaiting':
            self.skipWaiting();
            break;
        case 'getVersion':
            event.source.postMessage({
                type: 'version',
                version: CACHE_NAME
            });
            break;
        case 'clearCache':
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.source.postMessage({ type: 'cacheCleared' });
            });
            break;
    }
});

self.addEventListener('sync', (event) => {
    console.log('[PWA] Background sync:', event.tag);
    if (event.tag === 'sync-experiments') {
        event.waitUntil(syncQueuedExperiments());
    }
});

async function syncQueuedExperiments() {
    console.log('[PWA] Syncing queued experiments...');
}

self.addEventListener('periodicsync', (event) => {
    console.log('[PWA] Periodic sync:', event.tag);
});
