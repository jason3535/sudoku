// 离线缓存：联网时先拿最新版（修 bug 后立刻生效），4 秒没回应或断网才用缓存
var CACHE = 'sudoku-v2';
var FILES = ['./', 'index.html', 'core.js', 'puzzles.js', 'app.js', 'manifest.json', 'icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    var net = fetch(e.request, { cache: 'no-cache' }).then(function (r) { if (r.ok) c.put(e.request, r.clone()); return r; });
    var slow = new Promise(function (res) { setTimeout(res, 4000); }).then(function () { return c.match(e.request, { ignoreSearch: true }); });
    return Promise.race([net.catch(function () { return c.match(e.request, { ignoreSearch: true }); }), slow.then(function (h) { return h || net; })]);
  }));
});
