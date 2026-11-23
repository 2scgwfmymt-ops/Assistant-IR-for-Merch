const CACHE_NAME = 'merchandiser-offline-v4';

function buildRange(prefix, count, exclude = []) {
    const excludedSet = new Set(exclude);
    const list = [];
    for (let i = 1; i <= count; i++) {
        if (!excludedSet.has(i)) {
            list.push(`./${prefix}${i}.PNG`);
        }
    }
    return list;
}

// Все файлы приложения, схем, фона и актуальные маски в регистре .PNG
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './image.PNG',
    './schema1.PNG',
    './schema2.PNG',
    ...buildRange('G', 14, [2, 7, 9]),
    ...buildRange('MC', 29, [2, 4, 8, 12, 16, 18, 20, 26, 28]),
    ...buildRange('GS', 7),
    ...buildRange('SH', 14),
    ...buildRange('W', 7, [5]),
    ...buildRange('WC', 16, [2, 4, 6, 8, 9, 11, 12, 14, 16]),
    ...buildRange('WS', 4)
];

// Установка Service Worker и загрузка актуальных файлов в кэш
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of ASSETS_TO_CACHE) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn('Не удалось закэшировать файл:', url, err);
                }
            }
        })
    );
});

// Очистка старых версий кэша при обновлении CACHE_NAME
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Приём команды мгновенной активации от страницы
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Отдача файлов из кэша в офлайн-режиме и при обычной работе
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
        })
    );
});
