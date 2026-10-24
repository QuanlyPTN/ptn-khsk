// Service worker: lưu vỏ app để mở nhanh; dữ liệu vẫn lấy trực tiếp từ Google
var C = 'ptn-khsk-v12';
var FILES = ['./', 'index.html', 'app-cong-khai.js', 'don-phu-luc.js', 'don-qr.js', 'quan-ly/config.js', 'manifest.webmanifest', 'logo-mark.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(C).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return; // không can thiệp gọi Google
  // mạng trước (luôn lấy bản mới), mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(e.request).then(function (r) {
    var cp = r.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
