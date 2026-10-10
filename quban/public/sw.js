// 让 Privacy 可以“安装”到手机/电脑桌面，并在弱网时秒开
const C = 'privacy-v16';
const FILES = ['/', '/style.css?v=240', '/features.css?v=240', '/app.js?v=240', '/pv-core.js?v=240', '/pv-chat.js?v=240', '/pv-more.js?v=240', '/pv-settings.js?v=240', '/vendor/qrcode.js', '/logo.svg', '/icon-512.png', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return; // 翻译、识别组件等跨域请求不经过缓存，避免留下内容
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
