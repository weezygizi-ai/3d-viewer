// Service Worker: speichert die App für die Offline-Nutzung.
const CACHE = '3d-viewer-v1';
const ASSETS = [
  './',
  './app.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './index.html',
  './manifest.json',
  './style.css',
  './vendor/three/jsm/controls/OrbitControls.js',
  './vendor/three/jsm/curves/NURBSCurve.js',
  './vendor/three/jsm/curves/NURBSUtils.js',
  './vendor/three/jsm/environments/RoomEnvironment.js',
  './vendor/three/jsm/libs/basis/basis_transcoder.js',
  './vendor/three/jsm/libs/basis/basis_transcoder.wasm.b64',
  './vendor/three/jsm/libs/draco/draco_decoder.js',
  './vendor/three/jsm/libs/fflate.module.js',
  './vendor/three/jsm/libs/ktx-parse.module.js',
  './vendor/three/jsm/libs/meshopt_decoder.module.js',
  './vendor/three/jsm/libs/zstddec.module.js',
  './vendor/three/jsm/loaders/DRACOLoader.js',
  './vendor/three/jsm/loaders/FBXLoader.js',
  './vendor/three/jsm/loaders/GLTFLoader.js',
  './vendor/three/jsm/loaders/KTX2Loader.js',
  './vendor/three/jsm/math/ColorSpaces.js',
  './vendor/three/jsm/utils/BufferGeometryUtils.js',
  './vendor/three/jsm/utils/WorkerPool.js',
  './vendor/three/three.module.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    // einzeln laden, damit eine fehlende Datei nicht alles blockiert
    await Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || net;
    })
  );
});
