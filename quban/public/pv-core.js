/* Privacy 2.4 — 核心：偏好与主题、图标、页面骨架、应用锁、成就与隐私体检计分 */
'use strict';

/* ---------- 图标：线性图标 + 像素图标 ---------- */
const PVI = {
  back: '<path d="M15 6l-6 6 6 6"/>', chev: '<path d="M9 6l6 6-6 6"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  mic: '<rect x="9" y="4" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v3"/>', lock: '<rect x="6" y="11" width="12" height="8" rx="2"/><path d="M9 11V8a3 3 0 016 0v3"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15zM10 20h4"/>', folder: '<path d="M4 7h6l2 2h8v9H4z"/>', scan: '<path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3M8 12h8"/>',
  translate: '<path d="M4 6h8M8 4v2M6 6c0 4 3 7 6 8M11 6c0 3-3 6-6 8M14 20l3-8 3 8M15 18h4"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  id: '<rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 11h4M14 14h3"/>', spark: '<path d="M12 4v6M12 14v6M4 12h6M14 12h6"/>',
  chat: '<path d="M5 5h14v10H10l-4 4v-4H5z"/>', grid: '<rect x="5" y="5" width="5" height="5"/><rect x="14" y="5" width="5" height="5"/><rect x="5" y="14" width="5" height="5"/><rect x="14" y="14" width="5" height="5"/>',
  user: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-4 4-5 7-5s6 1 7 5"/>', check: '<path d="M5 12l5 5 9-10"/>', close: '<path d="M7 7l10 10M17 7L7 17"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>', copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>', star: '<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
  reply: '<path d="M9 7L4 12l5 5M4 12h10a6 6 0 016 6"/>', fwd: '<path d="M15 7l5 5-5 5M20 12H10a6 6 0 00-6 6"/>', note: '<path d="M6 4h12v16H6zM9 9h6M9 13h6"/>', send: '<path d="M5 12l14-7-5 14-3-6z"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 1M9 3h6"/>', mute: '<path d="M5 9v6h4l5 4V5L9 9zM18 9l4 6M22 9l-4 6"/>', pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/>', file: '<path d="M6 4h8l4 4v12H6z"/>', link: '<path d="M10 14a4 4 0 005 0l3-3a4 4 0 00-5-5l-1 1M14 10a4 4 0 00-5 0l-3 3a4 4 0 005 5l1-1"/>',
  swap: '<path d="M5 9h13l-3-3M19 15H6l3 3"/>', speaker: '<path d="M5 10v4h4l5 4V6l-5 4zM17 9a4 4 0 010 6"/>', download: '<path d="M12 4v10M8 11l4 4 4-4M5 19h14"/>', camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  rotate: '<path d="M5 12a7 7 0 107-7M5 5v5h5"/>', shield: '<path d="M12 4l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V7z"/>', export: '<path d="M12 15V4M8 8l4-4 4 4M5 14v5h14v-5"/>', eye: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
  palette: '<path d="M12 4a8 8 0 100 16c1.3 0 2-.8 2-1.8 0-1.3-1-1.5-1-2.7 0-1 .8-1.5 2-1.5h2a3 3 0 003-3C20 6.5 16.5 4 12 4z"/>', moon: '<path d="M18 14.5A7 7 0 019.5 6 7 7 0 1018 14.5z"/>', trophy: '<path d="M8 5h8v5a4 4 0 01-8 0zM8 7H5v1a3 3 0 003 3M16 7h3v1a3 3 0 01-3 3M12 14v4M9 19h6"/>',
  game: '<rect x="3" y="8" width="18" height="10" rx="3"/><path d="M8 11v4M6 13h4M15 12h.01M17 14h.01"/>', sticker: '<path d="M13 4H7a3 3 0 00-3 3v10a3 3 0 003 3h7l6-6V7a3 3 0 00-3-3z"/><path d="M14 20v-3a3 3 0 013-3h3"/>',
  more: '<circle cx="5" cy="12" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="19" cy="12" r=".8"/>', ban: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>', refresh: '<path d="M19 12a7 7 0 11-2-5M19 5v4h-4"/>'
};
function pvI(n, s) { return `<svg class="pv-i" viewBox="0 0 24 24" ${s ? `style="width:${s}px;height:${s}px"` : ''} aria-hidden="true">${PVI[n] || ''}</svg>`; }
const PVX = {
  heart: ['........', '.##..##.', '########', '########', '.######.', '..####..', '...##...'], star: ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '##....##'],
  check: ['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....'], bolt: ['...###.', '..###..', '.####..', '..#####', '...###.', '..##...', '.##....'],
  ask: ['.####.', '##..##', '....##', '...##.', '..##..', '......', '..##..'], bang: ['##', '##', '##', '##', '##', '..', '##'],
  lock: ['..##..', '.#..#.', '.#..#.', '######', '##..##', '##..##', '######'], play: ['##....', '####..', '######', '######', '####..', '##....'], pause: ['###..###', '###..###', '###..###', '###..###', '###..###', '###..###'],
  mic: ['..##..', '.####.', '.####.', '.####.', '#.##.#', '#....#', '.#..#.', '..##..', '..##..', '.####.'], spark: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...']
};
function pvPx(n, col, s) {
  const rows = PVX[n] || [], w = Math.max(...rows.map(r => r.length));
  return `<svg class="pv-px" viewBox="0 0 ${w} ${rows.length}" style="width:${w * (s || 2)}px;height:${rows.length * (s || 2)}px;fill:${col || 'currentColor'}" aria-hidden="true">${rows.map((r, y) => [...r].map((c, x) => c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '').join('')).join('')}</svg>`;
}
const PV_REACT = ['heart', 'star', 'check', 'bolt', 'ask', 'bang'];
function pvLogo(w, col, bg) {
  col = col || 'var(--pv-accent)'; bg = bg || '#191a18';
  return `<svg class="pv-logo" viewBox="0 0 64 96" style="width:${w}px;height:${Math.round(w * 1.5)}px" aria-hidden="true"><path fill="${col}" d="M24 6h16v6H24zM18 12h6v18h-6zM40 12h6v18h-6zM10 30h44v34H10z"/><path fill="${bg}" d="M17 36h30v22H17z"/><path fill="${col}" d="M23 40h16v4H23zM23 40h4v18h-4zM35 40h4v9h-4zM23 47h16v4H23z"/></svg>`;
}
function pvMascot(w, mood) {
  const m = ['....######....', '...##....##...', '...##....##...', '...##....##...', '.############.', '##############', '###oo####oo###', '###oo####oo###', '##############', mood === 'sad' ? '####oooooo####' : '###o######o###', mood === 'sad' ? '###o######o###' : '####oooooo####', '##############', '.############.'];
  return `<svg class="pv-mascot" viewBox="0 0 14 13" style="width:${w}px;height:${Math.round(w * 13 / 14)}px;shape-rendering:crispEdges" aria-hidden="true">${m.map((r, y) => [...r].map((c, x) => c === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === '#' ? 'var(--pv-accent)' : '#19170d'}"/>`).join('')).join('')}</svg>`;
}

/* ---------- 偏好：主题色、背景、字号、动效、免打扰 ---------- */
const PV_ACCENTS = { amber: ['暖黄', '#f4c91c'], mint: ['薄荷', '#6fc5a4'], sky: ['天蓝', '#7cc4ff'], coral: ['珊瑚', '#e8806d'], lavender: ['薰衣草', '#b79cf0'] };
const PV_FS = [.9, .95, 1, 1.1, 1.2], PV_FS_NAME = ['小', '较小', '标准', '较大', '大'];
function pvShade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f))); return '#' + [16, 8, 0].map(i => c(i).toString(16).padStart(2, '0')).join(''); }
function pvPrefs() {
  return Object.assign({ accent: 'amber', bg: 'dots', fs: 2, reduce: false, quiet: { on: false, start: '22:00', end: '07:00' }, voiceText: false }, store.get('pv_prefs', {}));
}
function pvSetPrefs(patch) { store.set('pv_prefs', Object.assign(pvPrefs(), patch)); pvApplyPrefs(); }
function pvApplyPrefs() {
  const p = pvPrefs(), hex = (PV_ACCENTS[p.accent] || PV_ACCENTS.amber)[1], r = document.documentElement, n = parseInt(hex.slice(1), 16);
  r.style.setProperty('--pv-accent', hex); r.style.setProperty('--pv-accent2', pvShade(hex, .87)); r.style.setProperty('--pv-accent3', pvShade(hex, .55));
  r.style.setProperty('--pv-accent-rgb', [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','));
  r.style.setProperty('--pv-fs', PV_FS[p.fs] || 1);
  document.body.dataset.pvBg = p.bg; document.body.classList.toggle('pv-reduce', !!p.reduce);
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = '#191a18';
}
function pvQuiet() {
  const q = pvPrefs().quiet; if (!q || !q.on) return false;
  const d = new Date(), now = d.getHours() * 60 + d.getMinutes(), t = s => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const a = t(q.start), b = t(q.end); return a <= b ? now >= a && now < b : now >= a || now < b;
}
function pvPreview(n) { const c = pvLockCfg(); if (c.on && c.hideNotif) return 'none'; return (n && n.preview) || 'name'; }

/* ---------- 活动与计数（成就、每周回顾） ---------- */
function pvBump(key, n) { const c = store.get('pv_cnt', {}); c[key] = (c[key] || 0) + (n || 1); store.set('pv_cnt', c); pvAct(key, n); }
function pvCnt(key) { return (store.get('pv_cnt', {})[key]) || 0; }
function pvAct(key, n) {
  const a = store.get('pv_act', {}), d = today(); a[d] = a[d] || {}; a[d][key] = (a[d][key] || 0) + (n || 1);
  const keep = Object.keys(a).sort().slice(-60), o = {}; keep.forEach(k => o[k] = a[k]); store.set('pv_act', o);
}
function pvWeek() {
  const a = store.get('pv_act', {}), out = [], now = new Date(), dow = (now.getDay() + 6) % 7;
  for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() - dow + i); const k = fmt(d); out.push({ date: k, label: '一二三四五六日'[i], future: d > now && k !== today(), today: k === today(), ...(a[k] || {}) }); }
  return out;
}
function pvCheckins() {
  const set = new Set(store.get('pv_checkins', [])), s = stats();
  if (s.last) for (let i = 0; i < s.streak; i++) { const d = new Date(s.last + 'T00:00:00'); d.setDate(d.getDate() - i); set.add(fmt(d)); }
  return set;
}
function pvCheckin() {
  const s = stats(); if (s.last === today()) return toast('今天已经打过卡啦');
  s.streak = s.last === yesterday() ? s.streak + 1 : 1; s.last = today();
  const gain = 10 + Math.min(s.streak, 7) * 2; s.points += gain; store.set('stats', s);
  const list = store.get('pv_checkins', []); list.push(today()); store.set('pv_checkins', list.slice(-120));
  pvAct('checkin', 1); toast(`打卡成功！连续 ${s.streak} 天，+${gain} 积分`);
  if (typeof viewToday === 'function' && $('.pv-today')) viewToday(); else render();
}
checkin = pvCheckin;
function pvLevelInfo() {
  const s = stats(), idx = LEVELS.map(l => l[0]).filter(v => v <= s.points).length - 1, nx = LEVELS[idx + 1];
  return { s, no: idx + 1, name: LEVELS[idx][1], next: nx, pct: nx ? Math.round((s.points - LEVELS[idx][0]) / (nx[0] - LEVELS[idx][0]) * 100) : 100 };
}
(function nightOwl() { const h = new Date().getHours(); if (h < 5) try { const c = store.get('pv_cnt', {}); c.night = 1; store.set('pv_cnt', c); } catch {} })();
mark = (function (orig) { return function (flag) { if (flag === 'todo') pvAct('todo', 1); return orig(flag); }; })(mark);

/* ---------- 隐私体检 ---------- */
function pvPrivacyScore() {
  const c = pvLockCfg(), st = accountSettings || {}, pv = st.privacy || {}, nt = st.notifications || {};
  const vault = Object.values(pvChatPrefs()).some(x => x.lock);
  const items = [
    { k: 'applock', ok: !!c.on, pts: 25, t: '已开启应用锁', bad: '开启应用锁', s: '离开后自动锁定', sBad: '打开 Privacy 需要输入 PIN' },
    { k: 'bind', ok: !!(me && (me.email || me.phone)), pts: 15, t: '已绑定邮箱或手机', bad: '绑定邮箱或手机', s: '账号可找回', sBad: '忘记密码时才能找回账号' },
    { k: 'addmode', ok: (pv.addMode || 'open') !== 'open', pts: 15, t: '已限制谁能加我', bad: '限制谁能加我', s: '需要你确认或暂不接受', sBad: '现在知道你 ID 的人都能直接加你' },
    { k: 'disappear', ok: Number(pv.defaultDisappear) > 0, pts: 15, t: '已设置默认阅后即焚', bad: '设置默认阅后即焚', s: '新聊天自动清理', sBad: '新聊天的消息会一直保存' },
    { k: 'notif', ok: (c.on && c.hideNotif) || nt.preview === 'none', pts: 10, t: '通知不显示内容', bad: '隐藏通知中的内容', s: '锁屏只显示“收到新消息”', sBad: '锁屏通知可能暴露消息内容' },
    { k: 'blur', ok: !!(c.on && c.blur), pts: 5, t: '切换应用时遮挡画面', bad: '开启切换应用时遮挡', s: '多任务界面不显示内容', sBad: '需要先开启应用锁' },
    { k: 'vault', ok: vault, pts: 15, t: '用密室保护了聊天', bad: '把重要聊天放进密室', s: '需要 PIN 才能打开', sBad: '在聊天详情里点“锁定”' }
  ];
  return { items, score: items.reduce((n, x) => n + (x.ok ? x.pts : 0), 0) };
}

/* ---------- 成就徽章 ---------- */
function pvBadges() {
  const s = stats(), visits = store.get('visits', []), c = pvLockCfg();
  return [
    { n: '首次打卡', ic: 'check', ok: !!s.last, how: '完成第一次打卡' },
    { n: '第一条语音', ic: 'mic', ok: pvCnt('voice') >= 1, how: '在聊天里发一条语音' },
    { n: '翻译达人', ic: 'translate', ok: pvCnt('translate') >= 5, how: '使用快捷翻译 5 次' },
    { n: '锁扣守护者', ic: 'lock', ok: !!c.on, how: '开启应用锁' },
    { n: '连续 7 天', ic: 'clock', ok: s.streak >= 7 || (s.best && s.best.streak >= 7), how: '连续打卡 7 天' },
    { n: '隐私满分', ic: 'shield', ok: pvPrivacyScore().score >= 100, how: '隐私体检拿到 100 分' },
    { n: '小游戏王', ic: 'game', ok: s.plays >= 20, how: '玩 20 局小游戏' },
    { n: '夜猫子', ic: 'moon', ok: !!pvCnt('night'), how: '凌晨 5 点前打开 Privacy' },
    { n: '回头客 30 天', ic: 'star', ok: visits.length >= 30, how: '累计 30 天打开 Privacy' }
  ];
}

/* ---------- 页面骨架与小组件 ---------- */
function pvPage(title, eyebrow, body, o) {
  o = o || {};
  $('#main').innerHTML = `<div class="pv-page ${o.cls || ''}"><div class="pv-head"><button class="pv-ib" id="pvBack" aria-label="返回">${pvI('back')}</button><h1><small class="pv-eb">PRIVACY / ${eyebrow}</small>${title}</h1>${o.right || ''}</div>${body}</div>`;
  $('#pvBack').onclick = o.back || (() => go('more')); $('#main').scrollTop = 0;
}
const pvLb = t => `<div class="pv-lb">${t}</div>`;
const pvNote = t => `<div class="pv-foot">${pvI('lock', 14)}<span>${t}</span></div>`;
const pvTg = (id, on, label, sub) => `<label class="pv-row"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><input class="pv-tg" type="checkbox" id="${id}" ${on ? 'checked' : ''} role="switch"></label>`;
const pvRow = (id, label, sub, val) => `<button class="pv-row pv-link" id="${id}"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>${val ? `<em>${val}</em>` : ''}${pvI('chev', 14)}</button>`;
const pvSeg = (id, opts, sel) => `<div class="pv-seg" id="${id}" role="group">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(v) === String(sel) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
function pvSegBind(id, cb) { $$('#' + id + ' button').forEach(b => b.onclick = () => { $$('#' + id + ' button').forEach(x => x.classList.toggle('on', x === b)); cb(b.dataset.v); }); }
function pvSheet(html, o) {
  o = o || {}; const old = $('#pvSheet'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'pvSheet'; el.className = 'pv-sheet'; el.innerHTML = `<div class="pv-sheet-bg"></div><div class="pv-sheet-box ${o.cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); if (o.onClose) o.onClose(); }; el.querySelector('.pv-sheet-bg').onclick = close; el.close = close;
  return el;
}
function pvDownload(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
function pvCopy(t) { return navigator.clipboard.writeText(t).then(() => toast('已复制')).catch(() => toast('复制失败，请手动选择文字')); }
function pvTimeLabel(ms) { const d = new Date(ms), n = new Date(), p = x => String(x).padStart(2, '0'); const same = d.toDateString() === n.toDateString(); const y = new Date(n.getTime() - 864e5).toDateString() === d.toDateString(); return (same ? '今天 ' : y ? '昨天 ' : `${d.getMonth() + 1}月${d.getDate()}日 `) + `${p(d.getHours())}:${p(d.getMinutes())}`; }
function pvInputDT(ms) { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
const pvSupportsSpeech = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/* ---------- 应用锁：PIN、遮挡、密室验证 ---------- */
function pvLockCfg() { return Object.assign({ on: false, salt: '', hash: '', auto: 60, blur: true, hideNotif: true }, store.get('pv_lock', {})); }
function pvSha(str) {
  const k = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const b = new TextEncoder().encode(str), l = b.length, pad = new Uint8Array(((l + 9 + 63) >> 6) << 6); pad.set(b); pad[l] = 0x80;
  const dv = new DataView(pad.buffer); dv.setUint32(pad.length - 4, l * 8 >>> 0); dv.setUint32(pad.length - 8, Math.floor(l * 8 / 4294967296));
  let h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]); const w = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < pad.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + k[i] + w[i]) >>> 0, S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0; hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
    h = h.map((v, i) => (v + [a, bb, c, d, e, f, g, hh][i]) >>> 0);
  }
  return [...h].map(v => v.toString(16).padStart(8, '0')).join('');
}
async function pvHash(pin, salt) {
  const text = 'privacy-lock:' + salt + ':' + pin;
  try { if (window.crypto && crypto.subtle) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); } } catch {}
  return pvSha(text);
}
async function pvSetPin(pin) { const salt = [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join(''); store.set('pv_lock', Object.assign(pvLockCfg(), { on: true, salt, hash: await pvHash(pin, salt) })); }
async function pvCheckPin(pin) { const c = pvLockCfg(); return !!c.hash && (await pvHash(pin, c.salt)) === c.hash; }
let pvPadOpen = null, pvFail = { n: 0, until: 0 };
/* 通用 PIN 键盘：返回 Promise<string|null>。opts: title, sub, cancel(可取消), check(pin)->Promise<bool>, full(锁屏), forgot */
function pvPad(o) {
  return new Promise(resolve => {
    if (pvPadOpen) pvPadOpen.remove();
    const el = document.createElement('div'); el.className = 'pv-lock' + (o.full ? ' full' : ''); pvPadOpen = el; let pin = '';
    const keys = '123456789'.split('').map(k => `<button type="button" data-k="${k}">${k}</button>`).join('');
    el.innerHTML = `<div class="pv-lock-box">${o.cancel ? `<button class="pv-ib pv-lock-x" aria-label="取消">${pvI('close')}</button>` : ''}${pvLogo(o.full ? 52 : 36)}<div class="pv-wordmark">PRIVACY</div><b class="pv-lock-t">${o.title || '输入 PIN'}</b><div class="pv-dots" aria-label="已输入位数">${'<i></i>'.repeat(4)}</div><div class="pv-lock-msg" role="status">${o.sub || ''}</div><div class="pv-keys">${keys}<span></span><button type="button" data-k="0">0</button><button type="button" data-k="del" aria-label="删除">${pvI('back')}</button></div>${o.forgot ? '<button class="pv-lock-forgot" type="button">忘记 PIN？重新登录</button>' : ''}</div>`;
    document.body.appendChild(el);
    const dots = () => $$('.pv-dots i', el).forEach((d, i) => d.classList.toggle('on', i < pin.length)), msg = t => $('.pv-lock-msg', el).textContent = t;
    const done = v => { el.remove(); if (pvPadOpen === el) pvPadOpen = null; document.removeEventListener('keydown', onKey); resolve(v); };
    const press = async k => {
      if (pvFail.until > Date.now() && o.check) return msg(`输错次数过多，请 ${Math.ceil((pvFail.until - Date.now()) / 1000)} 秒后再试`);
      if (k === 'del') { pin = pin.slice(0, -1); dots(); return; }
      if (pin.length >= 4) return; pin += k; dots();
      if (pin.length < 4) return;
      if (o.check) {
        if (await o.check(pin)) { pvFail.n = 0; return done(pin); }
        pvFail.n++; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); pin = ''; dots();
        if (pvFail.n >= 5) { pvFail.until = Date.now() + 30000; pvFail.n = 0; msg('输错 5 次，请 30 秒后再试'); } else msg(`PIN 不正确，还可以再试 ${5 - pvFail.n} 次`);
      } else done(pin);
    };
    $$('.pv-keys button', el).forEach(b => b.onclick = () => press(b.dataset.k));
    const onKey = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Escape' && o.cancel) done(null); };
    document.addEventListener('keydown', onKey);
    if ($('.pv-lock-x', el)) $('.pv-lock-x', el).onclick = () => done(null);
    if ($('.pv-lock-forgot', el)) $('.pv-lock-forgot', el).onclick = () => {
      if (!confirm('忘记 PIN 需要重新登录，并清除这台设备上的应用锁设置。继续吗？')) return;
      store.set('pv_lock', { on: false }); localStorage.removeItem('qb_token'); token = ''; me = null; if (es) es.close(); done(null); go('home'); showAuth();
    };
  });
}
async function pvShowLock() {
  if (pvPadOpen && pvPadOpen.classList.contains('full')) return;
  pvLockedNow = true;
  await pvPad({ title: '输入 PIN 解锁', full: true, forgot: true, check: pvCheckPin });
  pvLockedNow = false; pvChatUnlockedUntil = Date.now() + 5 * 60000;
}
let pvLockedNow = false, pvChatUnlockedUntil = 0;
/* 进入密室或锁定聊天前，要求再次输入 PIN（5 分钟内免输） */
async function pvNeedPin(why) {
  const c = pvLockCfg();
  if (!c.on) { toast('先开启应用锁，才能使用密室'); if (typeof pvAppLockPage === 'function') pvAppLockPage(); return false; }
  if (Date.now() < pvChatUnlockedUntil) return true;
  const ok = await pvPad({ title: why || '输入 PIN 继续', cancel: true, check: pvCheckPin });
  if (ok) { pvChatUnlockedUntil = Date.now() + 5 * 60000; return true; } return false;
}
function pvCover(on) {
  let c = $('#pvCover');
  if (on && !c) { c = document.createElement('div'); c.id = 'pvCover'; c.className = 'pv-cover'; c.innerHTML = pvLogo(52) + '<div class="pv-wordmark">PRIVACY</div>'; document.body.appendChild(c); }
  else if (!on && c) c.remove();
}
let pvHiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (!me) return; const c = pvLockCfg();
  if (document.hidden) { pvHiddenAt = Date.now(); if (c.on && c.blur) pvCover(true); }
  else { pvCover(false); if (c.on && pvHiddenAt && Date.now() - pvHiddenAt >= c.auto * 1000) pvShowLock(); }
});

/* ---------- 聊天本机偏好（钉住 / 静音 / 密室 / 限时照片 / 本机清空） ---------- */
function pvChatPrefs() { return store.get('pv_chatprefs', {}); }
function pvSetChatPref(name, patch) { const all = pvChatPrefs(); all[name] = Object.assign(all[name] || {}, patch); store.set('pv_chatprefs', all); }

/* 直接打开某个聊天（go('chat') 会把 chat.open 重置成列表页） */
function pvOpenChat(peer) { if (stopGame) { stopGame(); stopGame = null; } tab = 'chat'; chat.peer = peer; chat.unread[peer] = 0; chat.open = true; render(); updateDot(); }

/* ---------- 启动 / 切换账号 ---------- */
let pvAcct = null;
function pvSync() {
  const who = me ? me.name : '';
  if (who === pvAcct) return; pvAcct = who; pvApplyPrefs();
  if (typeof pvStartReminders === 'function') pvStartReminders();
}
go = (function (orig) { return function (t) { pvSync(); return orig(t); }; })(go);
function pvBoot() {
  pvSync(); if (me && pvLockCfg().on) pvShowLock();
  if (me && !pvLockCfg().on && store.get('pv_cnt', {}).night) { /* 夜猫子已记录 */ }
  render();
}
if (window.__qbReady) pvBoot(); else addEventListener('qb-ready', pvBoot, { once: true });
