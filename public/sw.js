const CACHE_STATIC_NAME = 'static-v14';
const CACHE_DYNAMIC_NAME = 'dynamic-v3';
const CACHED_STATIC_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];
const CACHE_LIMIT = 20;

// NOTE Currently not in use
// const trimCache = (cacheName, maxItems) => {
//   caches.open(cacheName).then(cache => {
//     return cache.keys().then(keys => {
//       if (keys.length > maxItems) {
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
//       }
//     });
//   });
// };

self.addEventListener('install', event => {
  // console.log("[Service Worker] Installing service worker...", event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(cache => {
      console.log('[Service Worker] Precaching App Shell');
      // NOTE  precaches application shell
      cache.addAll(CACHED_STATIC_URLS);
    })
  );
});

self.addEventListener('activate', event => {
  // console.log("[Service Worker] Activating service worker...", event);
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// NOTE helper method to ensure string is in cached array
const isInArray = (string, array) => {
  let cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    // console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
};

// NOTE Cache than network strategy with offline support. Set up with fetch.js
// you have to specify the url to add the listener to
self.addEventListener('fetch', event => {
  const url = 'https://pwagram-88a38.firebaseio.com/posts.json';
  // cache then network strategy for selected url
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      caches.open(CACHE_DYNAMIC_NAME).then(cache => {
        return fetch(event.request).then(res => {
          // trimCache(CACHE_DYNAMIC_NAME, CACHE_LIMIT);
          cache.put(event.request, res.clone());
          return res;
        });
      })
    );
  }
  // adds cache only for static cached files only update with new service worker install
  else if (isInArray(event.request.url, CACHED_STATIC_URLS)) {
    event.respondWith(caches.match(event.request));
  } else {
    // cache with network fallback
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(res => {
              return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
                // trimCache(CACHE_DYNAMIC_NAME, CACHE_LIMIT);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(err => {
              return caches.open(CACHE_STATIC_NAME).then(cache => {
                if (event.request.headers.get('accept').includes('text/html')) {
                  return cache.match('/offline.html');
                }
              });
            });
        }
      })
    );
  }
});

// NOTE Cache than network strategy. Set up with fetch.js
// this is super fast but does not offer offline support.
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.open(CACHE_DYNAMIC_NAME).then(cache => {
//       return fetch(event.request).then(res => {
//         cache.put(event.request, res.clone());
//         return res;
//       });
//     })
//   );
// });

// NOTE strategy service worker only

// self.addEventListener('fetch', event => {
//   event.respondWith(
//     caches.match(event.request).then(response => {
//       if (response) {
//         return response;
//       } else {
//         return fetch(event.request)
//           .then(res => {
//             return caches.open(CACHE_DYNAMIC_NAME).then(cache => {
//               cache.put(event.request.url, res.clone());
//               return res;
//             });
//           })
//           .catch(err => {
//             return caches.open(CACHE_STATIC_NAME).then(cache => {
//               return cache.match('/offline.html');
//             });
//           });
//       }
//     })
//   );
// });

//NOTE cache only strategy (doesnt make much sense to use)

// self.addEventListener('fetch', event => {
//   event.respondWith(caches.match(event.request));
// });

// NOTE network only strategy (doesnt make much sense to use)

// self.addEventListener('fetch', event => {
//   event.respondWith(fetch(event.request));
// });

// NOTE network with cache fallback strategy (not very common)
// used as fallback not as main source. does not load as fast
// also is slow on reverse network fallback due to response timeouts. will only trigger cache after timeout completes

// self.addEventListener('fetch', event => {
//   event.respondWith(
//     fetch(event.request).catch(err => {
//       return caches.match(event.request);
//     })
//   );
// });