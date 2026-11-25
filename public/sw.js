/* BioMotion 3D — service worker giúp trang chạy được khi không có mạng */
const CACHE = 'biomotion-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
// Tài nguyên nhận dạng tay (~19 MB) — lưu ngầm sau khi trang đã cài xong
const MEDIAPIPE = [
  './mediapipe/hand_landmarker.task',
  './mediapipe/wasm/vision_wasm_internal.js',
  './mediapipe/wasm/vision_wasm_internal.wasm'
];

async function precacheBuild(cache) {
  try {
    const res = await fetch('./precache-manifest.json', { cache: 'no-store' });
    if (!res.ok) return;
    const { files } = await res.json();
    await cache.addAll(files.map((f) => './' + f));
  } catch {
    /* đang chạy dev: không có manifest */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      await precacheBuild(cache);
      // Không chặn cài đặt vì file lớn; lỗi (ví dụ thiếu file) thì bỏ qua
      cache.addAll(MEDIAPIPE).catch(() => {});
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Trang HTML: ưu tiên mạng để luôn có bản mới, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const cacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'storage.googleapis.com';
  if (!cacheable || req.headers.has('range')) return;

  // Còn lại: lấy từ bộ nhớ đệm trước, chưa có thì tải và lưu lại
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
