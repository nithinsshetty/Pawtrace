const CACHE_NAME = 'pawtrace-v9';
const BUILD_VERSION = '2.0.9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './api-config.js',
  './router.js',
  './utils.js',
  './auth.js',
  './app.js',
  './dashboard.js',
  './pets.js',
  './scan.js',
  './medical.js',
  './reminders.js',
  './journal.js',
  './caregiver.js',
  './vets.js',
  './vet-portal.js',
  './ngo.js',
  './community.js',
  './notifications.js',
  './settings.js',
  './ai.js',
  './manifest.json'
];

// Install Service Worker and cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`PawTrace SW: Pre-caching static app shell resources for build ${BUILD_VERSION}`);
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean up stale cache blocks
self.addEventListener('activate', (event) => {
  console.log(`PawTrace SW: Active build version ${BUILD_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('PawTrace SW: Deleting outdated cache instance', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first falling back to Cache strategy for asset retrieval
self.addEventListener('fetch', (event) => {
  // Only intercept and cache successful GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Do not intercept or cache:
  // - Custom backend API requests (/api/*)
  // - Firebase Legacy APIs
  const url = event.request.url;
  if (
    url.includes('/api/') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('google-analytics.com') ||
    url.includes('googletagmanager.com') ||
    url.includes('google.firestore') ||
    url.includes('/google.firestore.') ||
    url.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone and cache it
        if (
          response &&
          response.status === 200 &&
          (response.type === 'basic' || response.type === 'cors')
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network offline fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default offline page loader fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
