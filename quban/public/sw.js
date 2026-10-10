// 让 Privacy 可以“安装”到手机/电脑桌面，并秒开
const C = 'privacy-v17';
const FILES = ['/', '/style.css?v=241', '/features.css?v=241', '/mobile.css?v=241', '/desktop.css?v=241', '/app.js?v=241', '/pv-core.js?v=241', '/pv-chat.js?v=241', '/pv-more.js?v=241', '/pv-settings.js?v=241', '/vendor/qrcode.js', '/logo.svg', '/icon-512.png', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return; // 跨域（翻译、识别组件）和接口都不经过缓存
  const put = r => { if (r && r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; };
  if (e.request.mode === 'navigate' || u.pathname === '/') {
    // 页面本身：优先联网，但最多等 2.5 秒，超时就先用缓存打开（服务器刚醒时不再白屏）
    e.respondWith(Promise.race([fetch(e.request).then(put), new Promise((_, rej) => setTimeout(rej, 2500))]).catch(() => caches.match('/').then(r => r || fetch(e.request))));
    return;
  }
  // 带版本号的脚本、样式、图标：缓存优先，打开瞬间就有
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(put)));
});
