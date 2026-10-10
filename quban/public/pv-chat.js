/* Privacy 2.4 — 聊天：列表、语音消息、印章、消息菜单、聊天详情、密室 */
'use strict';
chat.sum = {}; chat.tabF = 'all'; chat.replyTo = null;
const PV_DIS = { 0: '关闭', 3600: '1 小时', 86400: '24 小时', 604800: '7 天', 2592000: '30 天' };
const pvMine = m => !!(me && m.from === me.name);
const pvJ = (k, d) => store.get(k, d);
const pvDur = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const pvSpeechLang = () => ({ 'zh-CN': 'zh-CN', en: 'en-US', ja: 'ja-JP', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ko: 'ko-KR' })[(accountSettings && accountSettings.language) || 'zh-CN'] || 'zh-CN';

/* 发给好友的照片/视频：该聊天开启“限时查看”时自动带上 once 标记 */
api = (function (orig) { return function (path, body) { if (path === '/media' && body && pvChatPrefs()[body.to] && pvChatPrefs()[body.to].once && /^(image|video)\//.test(body.mime || '')) body.once = true; return orig(path, body); }; })(api);

/* ---------- 消息渲染 ---------- */
function pvWaveBars(wave, n) {
  const src = (wave && wave.length) ? wave : Array.from({ length: n }, (_, i) => 30 + ((i * 37) % 50)), out = [];
  for (let i = 0; i < n; i++) { const a = Math.floor(i * src.length / n), b = Math.max(a + 1, Math.floor((i + 1) * src.length / n)); out.push(Math.max(...src.slice(a, b))); }
  return out.map(v => Math.max(4, Math.round(v / 100 * 28 / 4) * 4));
}
function voiceHtml(m, mine) {
  const v = m.voice, played = new Set(pvJ('pv_played', [])), unread = !mine && !played.has(m.id);
  const bars = pvWaveBars(v.wave, 24).map(h => `<i style="height:${h}px"></i>`).join('');
  return `<div class="pv-voice" data-vid="${escapeAttr(v.id)}" data-mid="${escapeAttr(m.id || '')}" data-dur="${v.dur}"><button class="pv-play" type="button" aria-label="播放语音">${pvPx('play', 'currentColor', 3)}</button><div class="pv-wv"><div class="pv-wave">${bars}</div><div class="pv-vmeta"><span class="pv-vt">${pvDur(v.dur)}</span>${unread ? '<b class="pv-unread" aria-label="未听">■</b>' : ''}</div></div><button class="pv-speed" type="button" aria-label="播放速度">${pvSpeed}×</button></div>${v.transcript ? `<button class="pv-trbtn" type="button">转文字 ▾</button><div class="pv-tr" hidden><span class="pv-tag">转写</span> ${esc(v.transcript)}<small>由发送方设备转写，仅供参考</small></div>` : ''}`;
}
let pvSpeed = 1;
function onceHtml(m, mine, f) {
  const seen = new Set(pvJ('pv_once', [])).has(f.id);
  if (mine) return `<div class="pv-once mine" data-once="${escapeAttr(f.id)}">${pvI('timer', 18)}<span><b>限时照片</b><small>${seen ? '对方已查看' : '对方只能看一次'}</small></span></div>`;
  return `<button class="pv-once" type="button" data-once="${escapeAttr(f.id)}" ${seen ? 'disabled' : ''}>${pvI('timer', 18)}<span><b>限时照片</b><small>${seen ? '已查看，已销毁' : '点按查看，只能看一次'}</small></span></button>`;
}
function reactsHtml(m) {
  const r = m.reactions || {}, ks = PV_REACT.filter(k => r[k] && r[k].length);
  if (!ks.length) return '';
  return `<div class="pv-reacts">${ks.map(k => `<button type="button" class="pv-react ${me && r[k].includes(me.name) ? 'mine' : ''}" data-react="${k}" aria-label="印章 ${r[k].length}">${pvPx(k, 'currentColor', 2)}<span>${r[k].length}</span></button>`).join('')}</div>`;
}
messageHtml = function (m, mine) {
  const reply = m.reply ? `<button class="pv-quote" type="button" data-qid="${escapeAttr(m.reply.id)}"><b>${me && m.reply.from === me.name ? '我' : esc(m.reply.from)}</b><span>${esc(m.reply.text)}</span></button>` : '';
  const media = (m.media || []).map(f => f.once ? onceHtml(m, mine, f) : mediaHtml(f)).join('');
  const content = `${reply}${m.voice ? voiceHtml(m, mine) : ''}${m.sticker ? `<div class="sticker-sent" aria-label="贴纸">${esc(m.sticker)}</div>` : ''}${m.text ? `<div class="message-text">${fmtMsg(m.text)}</div>` : ''}${media}`;
  const stamp = new Date(m.t || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const searchText = (m.text || '') + ' ' + ((m.voice && m.voice.transcript) || '');
  return `<div class="msg-row ${mine ? 'mine' : ''}" ${m.id ? `data-mid="${escapeAttr(m.id)}"` : ''} ${m.exp ? `data-exp="${m.exp}"` : ''} data-message-text="${escapeAttr(searchText.trim())}"><div class="bub ${mine ? 'me' : ''}">${content}${reactsHtml(m)}<span class="msg-meta">${m.exp ? `<i class="pv-exp" title="阅后即焚">${pvI('timer', 11)}</i>` : ''}${stamp}${mine ? `<i class="pv-sent" aria-label="已送达">${pvPx('lock', 'currentColor', 1.5)}</i>` : ''}</span>${m.id ? `<button class="pv-bub-more" type="button" aria-label="消息选项">${pvI('more', 16)}</button>` : ''}</div></div>`;
};

/* ---------- 语音播放 ---------- */
let pvAud = null;
function pvStopVoice() { if (!pvAud) return; try { pvAud.a.pause(); } catch {} pvAud.box.classList.remove('playing'); $('.pv-play', pvAud.box).innerHTML = pvPx('play', 'currentColor', 3); $$('.pv-wave i', pvAud.box).forEach(i => i.classList.remove('on')); $('.pv-vt', pvAud.box).textContent = pvDur(+pvAud.box.dataset.dur); pvAud = null; }
async function pvPlayVoice(box) {
  const id = box.dataset.vid;
  if (pvAud && pvAud.box === box) return pvStopVoice();
  pvStopVoice();
  const btn = $('.pv-play', box); btn.disabled = true;
  try {
    if (!box._url) { const r = await fetch('/api/media/' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new Error('语音暂时无法读取'); box._url = URL.createObjectURL(await r.blob()); chat.mediaUrls.push(box._url); }
    const a = new Audio(box._url); a.playbackRate = pvSpeed; const dur = +box.dataset.dur, bars = $$('.pv-wave i', box);
    pvAud = { a, box }; box.classList.add('playing'); btn.innerHTML = pvPx('pause', 'currentColor', 3);
    a.ontimeupdate = () => { const t = a.currentTime, p = Math.min(1, t / dur); bars.forEach((b, i) => b.classList.toggle('on', i < Math.round(p * bars.length))); $('.pv-vt', box).textContent = pvDur(t) + ' / ' + pvDur(dur); };
    a.onended = () => { const mid = box.dataset.mid; if (mid) { const p = pvJ('pv_played', []); if (!p.includes(mid)) { p.push(mid); store.set('pv_played', p.slice(-600)); } } box.querySelector('.pv-unread')?.remove(); pvStopVoice(); };
    a.onerror = () => { toast('这条语音无法播放'); pvStopVoice(); };
    await a.play();
  } catch (e) { toast(e.message || '语音无法播放'); pvStopVoice(); } finally { btn.disabled = false; }
}
function pvCycleSpeed() { pvSpeed = pvSpeed === 1 ? 1.5 : pvSpeed === 1.5 ? 2 : 1; $$('.pv-speed').forEach(b => b.textContent = pvSpeed + '×'); if (pvAud) pvAud.a.playbackRate = pvSpeed; }

/* ---------- 限时照片 ---------- */
async function pvOpenOnce(btn) {
  const id = btn.dataset.once; btn.disabled = true;
  try {
    const r = await fetch('/api/media/' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + token } });
    const seen = pvJ('pv_once', []); if (!seen.includes(id)) { seen.push(id); store.set('pv_once', seen.slice(-300)); }
    if (!r.ok) { const j = await r.json().catch(() => ({})); btn.querySelector('small').textContent = '已查看，已销毁'; return toast(j.error || '这张照片无法查看'); }
    const blob = await r.blob(), url = URL.createObjectURL(blob), video = blob.type.startsWith('video/');
    const el = document.createElement('div'); el.className = 'pv-viewer';
    el.innerHTML = `<div class="pv-viewer-top"><span>${pvI('timer', 16)} 限时照片 · 关闭后无法再看</span><button class="pv-ib" aria-label="关闭">${pvI('close')}</button></div>${video ? `<video src="${url}" controls autoplay playsinline></video>` : `<img src="${url}" alt="限时照片">`}`;
    document.body.appendChild(el); $('button', el).onclick = () => { el.remove(); URL.revokeObjectURL(url); btn.querySelector('small').textContent = '已查看，已销毁'; };
  } catch (e) { toast(e.message); btn.disabled = false; }
}

/* ---------- 在缓存里找消息 / 同步更新 ---------- */
function pvFind(id) { for (const peer of Object.keys(chat.msgs)) { const m = (chat.msgs[peer] || []).find(x => x.id === id); if (m) return { peer, m }; } return null; }
function pvDrop(id) { for (const peer of Object.keys(chat.msgs)) chat.msgs[peer] = (chat.msgs[peer] || []).filter(x => x.id !== id); $$(`[data-mid="${CSS.escape(id)}"].msg-row`).forEach(r => r.remove()); }
chat.loaded = {};
async function pvLoadMsgs(peer) {
  if (!chat.loaded[peer]) {
    let list = []; try { list = (await api('/messages?with=' + encodeURIComponent(peer))).messages; chat.loaded[peer] = true; } catch {}
    const have = chat.msgs[peer] || [], ids = new Set(list.map(x => x.id));
    chat.msgs[peer] = list.concat(have.filter(x => !(x.id && ids.has(x.id)) && !list.some(y => y.t === x.t && y.from === x.from)));
  }
  const hidden = new Set(pvJ('pv_hidden', [])), cleared = (pvJ('pv_cleared', {}))[peer] || 0, now = Date.now();
  chat.msgs[peer] = chat.msgs[peer].filter(m => !(m.id && hidden.has(m.id)) && m.t > cleared && !(m.exp && m.exp <= now));
}
const _renderPane = renderPane;
renderPane = async function () {
  if (chat.peer !== 'ai' && me) await pvLoadMsgs(chat.peer);
  await _renderPane(); pvEnhancePane();
};
setInterval(() => { const now = Date.now(); $$('.msg-row[data-exp]').forEach(r => { if (+r.dataset.exp <= now) { const id = r.dataset.mid; if (id) pvDrop(id); else r.remove(); } }); }, 10000);

/* ---------- 聊天窗口增强 ---------- */
function pvReplyBar() {
  let bar = $('#replyBar'); const wrap = $('.compose-wrap'); if (!wrap) return;
  if (!chat.replyTo) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'replyBar'; bar.className = 'pv-replybar'; wrap.insertBefore(bar, wrap.firstChild); }
  bar.innerHTML = `<span class="pv-reply-i">${pvI('reply', 16)}</span><span class="pv-reply-t"><b>回复 ${chat.replyTo.from === (me && me.name) ? '自己' : esc(chat.replyTo.from)}</b><small>${esc(chat.replyTo.text)}</small></span><button class="pv-ib" aria-label="取消回复">${pvI('close', 18)}</button>`;
  $('button', bar).onclick = () => { chat.replyTo = null; pvReplyBar(); };
}
function pvToggleSendMic() {
  const inp = $('#inp'), snd = $('#snd'), rec = $('#recBtn'); if (!inp || !snd || !rec) return;
  const has = !!inp.value.trim(); snd.hidden = !has; rec.hidden = has;
}
function pvEnhancePane() {
  const cp = $('#cp'); if (!cp || !$('#ms')) return;
  const isAI = chat.peer === 'ai', ms = $('#ms');
  pvLastRead(chat.peer);
  if (!isAI) {
    const vb = $('#voiceBtn'); if (vb) { vb.id = 'recBtn'; vb.className = 'chat-icon-btn pv-recbtn'; vb.setAttribute('aria-label', '按住录音，松开发送；轻点开始录音'); vb.title = '按住录音'; vb.innerHTML = pvPx('mic', 'currentColor', 2); vb.onclick = null; pvBindRec(vb); }
    const inp = $('#inp'); inp.addEventListener('input', pvToggleSendMic); pvToggleSendMic();
    const sm = chat.sum[chat.peer], title = $('.chat-title small'); if (title && sm && sm.disappear) title.insertAdjacentHTML('beforeend', `<span class="pv-chip-timer">${pvI('timer', 12)} ${PV_DIS[sm.disappear]}</span>`);
    else if (!sm) api('/chats').then(r => { r.chats.forEach(c => chat.sum[c.name] = c); }).catch(() => {});
    const det = $('#chatDetails'); if (det) det.onclick = () => pvChatInfo(chat.peer);
  }
  pvReplyBar();
  ms.onclick = pvMsClick; ms.oncontextmenu = e => { const row = e.target.closest('.msg-row'); if (row && row.dataset.mid) { e.preventDefault(); pvMsgMenu(row); } };
  let lp = null, sx = 0, sy = 0;
  ms.onpointerdown = e => { const b = e.target.closest('.bub'); if (!b || e.target.closest('button,a,video,audio,input') || e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; lp = setTimeout(() => { const row = b.closest('.msg-row'); if (row) { ms._noClick = true; if (navigator.vibrate) navigator.vibrate(12); pvMsgMenu(row); } }, 480); };
  ms.onpointermove = e => { if (lp && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(lp); lp = null; } };
  ms.onpointerup = ms.onpointercancel = () => { clearTimeout(lp); lp = null; setTimeout(() => ms._noClick = false, 60); };
}
function pvMsClick(e) {
  const ms = $('#ms'); if (ms._noClick) return;
  const t = e.target;
  const play = t.closest('.pv-play'); if (play) return pvPlayVoice(play.closest('.pv-voice'));
  if (t.closest('.pv-speed')) return pvCycleSpeed();
  const tr = t.closest('.pv-trbtn'); if (tr) { const box = tr.nextElementSibling; box.hidden = !box.hidden; tr.textContent = box.hidden ? '转文字 ▾' : '收起 ▴'; return; }
  const once = t.closest('button.pv-once'); if (once) return pvOpenOnce(once);
  const q = t.closest('.pv-quote'); if (q) { const el = $(`[data-mid="${CSS.escape(q.dataset.qid)}"].msg-row`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } else toast('原消息已不在这里'); return; }
  const re = t.closest('.pv-react'); if (re) { const row = re.closest('.msg-row'); return pvReact(row.dataset.mid, re.dataset.react); }
  const more = t.closest('.pv-bub-more'); if (more) return pvMsgMenu(more.closest('.msg-row'));
}
async function pvReact(id, key) { try { await api('/messages/react', { id, key }); } catch (e) { toast(e.message); } }
function pvLastRead(peer) { const r = pvJ('pv_lastread', {}); r[peer] = Date.now(); store.set('pv_lastread', r); }

/* ---------- 消息菜单（长按 / 右键 / ⋯） ---------- */
function pvMsgMenu(row) {
  if (!row) return; const id = row.dataset.mid, found = id ? pvFind(id) : null, m = found && found.m, mine = row.classList.contains('mine');
  const text = (m && (m.text || (m.voice && m.voice.transcript))) || row.dataset.messageText || ($('.message-text', row) && $('.message-text', row).textContent) || '';
  const stamps = id ? `<div class="pv-stamps"><span>印章</span>${PV_REACT.map(k => `<button data-st="${k}" aria-label="印章">${pvPx(k, 'var(--pv-accent)', 3)}</button>`).join('')}</div>` : '';
  const act = (k, ic, t, cls) => `<button class="pv-act ${cls || ''}" data-a="${k}">${pvI(ic, 18)}<span>${t}</span></button>`;
  const html = `${stamps}<div class="pv-acts">${id ? act('reply', 'reply', '回复') : ''}${id && (m && (m.text || m.sticker)) ? act('fwd', 'fwd', '转发') : ''}${text.trim() ? act('fav', 'star', '收藏') + act('copy', 'copy', '复制文字') + act('note', 'note', '转为备忘') : ''}${id && mine ? act('delall', 'trash', '为所有人删除', 'danger') : ''}${id && !mine ? act('delme', 'trash', '仅从我这里删除', 'danger') : ''}</div>`;
  const sh = pvSheet(html, { cls: 'pv-menu' });
  $$('[data-st]', sh).forEach(b => b.onclick = () => { sh.close(); pvReact(id, b.dataset.st); });
  $$('[data-a]', sh).forEach(b => b.onclick = async () => {
    sh.close(); const a = b.dataset.a;
    if (a === 'reply') { chat.replyTo = { id, from: m.from, text: (m.text || (m.voice ? '语音消息' : m.sticker || '照片或视频')).slice(0, 60) }; pvReplyBar(); $('#inp') && $('#inp').focus(); }
    else if (a === 'fwd') pvForward(m);
    else if (a === 'fav') { pvCollectAdd({ type: 'msg', title: text.slice(0, 40), text, sub: ((m && m.from) ? '来自 ' + m.from : '聊天') }); toast('已收藏到「收藏与文件」'); }
    else if (a === 'copy') pvCopy(text);
    else if (a === 'note') { const notes = store.get('notes', []), now = new Date().toISOString(); notes.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), title: text.slice(0, 16), content: text, createdAt: now, updatedAt: now, pinned: false }); store.set('notes', notes); toast('已转为备忘'); }
    else if (a === 'delall') { if (!confirm('为所有人删除这条消息？对方的聊天里也会消失。')) return; try { await api('/messages/delete', { id }); } catch (e) { toast(e.message); } }
    else if (a === 'delme') { const h = pvJ('pv_hidden', []); h.push(id); store.set('pv_hidden', h.slice(-1000)); pvDrop(id); toast('已从这台设备删除'); }
  });
}
function pvForward(m) {
  const list = chat.friends.filter(f => f.name !== chat.peer);
  const sh = pvSheet(`<h3 class="pv-sh-t">转发给</h3>${list.length ? list.map(f => `<button class="pv-act" data-to="${esc(f.name)}"><span class="pv-mini-av">${esc(f.name[0])}</span><span>${esc(f.name)}</span></button>`).join('') : '<p class="pv-empty-s">还没有其他好友可以转发</p>'}`);
  $$('[data-to]', sh).forEach(b => b.onclick = async () => { sh.close(); try { await api('/messages', { to: b.dataset.to, text: m.text || '', sticker: m.sticker }); toast('已转发给 ' + b.dataset.to); } catch (e) { toast(e.message); } });
}

/* ---------- 语音录制 ---------- */
let pvRec = null;
function pvBindRec(btn) {
  btn.onpointerdown = e => { if (e.button > 0) return; e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch {} pvRecPress(e.clientX, e.clientY); };
  btn.onpointermove = e => { if (pvRec && pvRec.pressing) pvRecMove(e.clientX, e.clientY); };
  btn.onpointerup = btn.onpointercancel = e => { if (pvRec && pvRec.pressing) pvRecRelease(e.type === 'pointercancel'); };
  btn.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && !pvRec) { e.preventDefault(); pvRecPress(0, 0, true); } };
  btn.oncontextmenu = e => e.preventDefault();
}
async function pvRecPress(x, y, kb) {
  if (pvRec || !me || chat.peer === 'ai') return;
  if (!navigator.mediaDevices || !window.MediaRecorder) return toast('此浏览器暂不支持录音');
  if (!window.isSecureContext) return toast('录音需要 HTTPS 安全连接');
  pvStopVoice();
  pvRec = { peer: chat.peer, pressing: !kb, sx: x, sy: y, t0: Date.now(), state: 'hold', lock: false, cancel: false, levels: [], chunks: [], tr: '', ready: false };
  pvRecUI();
  try { await pvRecInit(); } catch (e) { pvRecClean(); return toast(e && e.name === 'NotAllowedError' ? '请允许麦克风权限后重试' : '无法使用麦克风'); }
  if (!pvRec) return pvRecStopTracks(); // 已在授权期间被取消
  pvRec.ready = true; pvRec.t0 = Date.now();
  if (kb) pvRecLock();
  else if (!pvRec.pressing) { if (pvRec.firstGrant) { pvRecClean(); toast('麦克风已允许，请再按住说话'); } else pvRecLock(); }
}
async function pvRecInit() {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  pvRec.firstGrant = false; pvRec.stream = st;
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
  const mr = new MediaRecorder(st, mime ? { mimeType: mime } : {}); pvRec.mr = mr; pvRec.mime = mr.mimeType || mime || 'audio/webm';
  mr.ondataavailable = e => { if (e.data && e.data.size) pvRec && pvRec.chunks.push(e.data); };
  mr.start(250);
  try { const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), src = ctx.createMediaStreamSource(st), an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an); pvRec.ctx = ctx; pvRec.an = an; pvRec.buf = new Uint8Array(an.fftSize); } catch {}
  pvRec.timer = setInterval(pvRecTick, 90);
  if (pvPrefs().voiceText && pvSupportsSpeech()) pvRecStartSR();
}
function pvRecStartSR() {
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, r = new SR(); r.lang = pvSpeechLang(); r.continuous = true; r.interimResults = false;
    r.onresult = ev => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal && pvRec) pvRec.tr += ev.results[i][0].transcript; };
    r.onerror = () => {}; r.onend = () => { if (pvRec && pvRec.srOn && pvRec.state !== 'review') { try { r.start(); } catch {} } };
    pvRec.sr = r; pvRec.srOn = true; r.start();
  } catch { pvRec.srOn = false; }
}
function pvRecStopSR() { if (pvRec && pvRec.sr) { pvRec.srOn = false; try { pvRec.sr.stop(); } catch {} } }
function pvRecTick() {
  if (!pvRec || !pvRec.ready) return;
  let lv = 0; if (pvRec.an) { pvRec.an.getByteTimeDomainData(pvRec.buf); let s = 0; for (const v of pvRec.buf) s += (v - 128) * (v - 128); lv = Math.sqrt(s / pvRec.buf.length) / 128; }
  pvRec.levels.push(Math.min(100, Math.round(lv * 320)));
  const el = (Date.now() - pvRec.t0) / 1000;
  if (el >= 300) return pvRecStopReview();
  const t = $('#recT'); if (t) t.textContent = pvDur(el);
  const w = $('#recW'); if (w) { const last = pvRec.levels.slice(-22); w.innerHTML = last.map(v => `<i style="height:${Math.max(4, Math.round(v / 100 * 28 / 4) * 4)}px"></i>`).join(''); }
}
function pvRecMove(x, y) {
  if (!pvRec || !pvRec.pressing) return; const dx = x - pvRec.sx, dy = y - pvRec.sy;
  pvRec.cancel = dx < -90; const nearLock = dy < -40; const bar = $('#recBar'); if (bar) { bar.classList.toggle('cancelling', pvRec.cancel); bar.classList.toggle('nearlock', nearLock); }
  if (dy < -80 && !pvRec.cancel) { pvRec.pressing = false; pvRecLock(); }
}
function pvRecRelease(canceled) {
  if (!pvRec) return; pvRec.pressing = false;
  const held = Date.now() - pvRec.t0;
  if (!pvRec.ready) return; // 还在等权限：授权完成后处理
  if (canceled || pvRec.cancel) return pvRecClean();
  if (held < 350) return pvRecLock();
  pvRecFinish(true);
}
function pvRecLock() { if (!pvRec) return; pvRec.state = 'locked'; pvRecUI(); }
function pvRecUI() {
  const wrap = $('.compose-wrap'); if (!wrap || !pvRec) return; let bar = $('#recBar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'recBar'; wrap.appendChild(bar); }
  const st = pvRec.state, wave = '<span class="pv-livewave" id="recW"></span>', dot = '<i class="pv-recdot"></i>';
  bar.className = 'pv-recbar ' + st;
  if (st === 'hold') bar.innerHTML = `<div class="pv-rec-row">${dot}<b id="recT">0:00</b>${wave}<span class="pv-rec-hint">${pvI('back', 14)}左滑取消</span></div><div class="pv-rec-ring"><span>${pvPx('mic', '#19170d', 3)}</span></div><div class="pv-rec-lockcap">${pvPx('lock', 'var(--pv-accent)', 3)}${pvI('back', 14).replace('pv-i', 'pv-i up')}</div><div class="pv-rec-tip">松开发送 · 上滑锁定 · 少于 1 秒不发送</div>`;
  else if (st === 'locked') bar.innerHTML = `${pvSupportsSpeech() ? `<label class="pv-rec-tr"><input class="pv-tg" type="checkbox" id="recTr" ${pvPrefs().voiceText ? 'checked' : ''} role="switch"><span><b>同时附带文字</b><small>用本机识别，对方可点“转文字”查看</small></span></label>` : ''}<div class="pv-rec-row2"><button class="pv-ib danger" id="recDel" aria-label="删除录音">${pvI('trash')}</button><div class="pv-rec-pill">${dot}<b id="recT">${pvDur((Date.now() - pvRec.t0) / 1000)}</b>${wave}</div><button class="pv-ib" id="recStop" aria-label="停止并试听">${pvPx('pause', 'var(--pv-accent)', 2)}</button><button class="pv-send" id="recSend" aria-label="发送语音">${pvI('send', 22)}</button></div>`;
  else bar.innerHTML = `<div class="pv-rec-row2"><button class="pv-ib danger" id="recDel" aria-label="删除录音">${pvI('trash')}</button><div class="pv-rec-pill"><button class="pv-ib" id="recPlay" aria-label="试听">${pvPx('play', 'var(--pv-accent)', 2)}</button><b>${pvDur(pvRec.dur)}</b><span class="pv-livewave">${pvWaveBars(pvRecWave(), 22).map(h => `<i style="height:${h}px"></i>`).join('')}</span></div><button class="pv-send" id="recSend" aria-label="发送语音">${pvI('send', 22)}</button></div>`;
  if ($('#recDel')) $('#recDel').onclick = () => pvRecClean();
  if ($('#recSend')) $('#recSend').onclick = () => st === 'locked' ? pvRecFinish(true) : pvRecSendReview();
  if ($('#recStop')) $('#recStop').onclick = pvRecStopReview;
  if ($('#recPlay')) $('#recPlay').onclick = () => { if (!pvRec.audio) { pvRec.audio = new Audio(URL.createObjectURL(pvRec.blob)); pvRec.audio.onended = () => { $('#recPlay').innerHTML = pvPx('play', 'var(--pv-accent)', 2); }; } const a = pvRec.audio; if (a.paused) { a.play(); $('#recPlay').innerHTML = pvPx('pause', 'var(--pv-accent)', 2); } else { a.pause(); $('#recPlay').innerHTML = pvPx('play', 'var(--pv-accent)', 2); } };
  if ($('#recTr')) $('#recTr').onchange = e => { pvSetPrefs({ voiceText: e.target.checked }); if (e.target.checked) pvRecStartSR(); else pvRecStopSR(); };
}
function pvRecWave() { const lv = pvRec.levels, n = 40, out = []; for (let i = 0; i < n; i++) { const a = Math.floor(i * lv.length / n), b = Math.max(a + 1, Math.floor((i + 1) * lv.length / n)); out.push(Math.max(8, ...lv.slice(a, b))); } return out; }
function pvRecStopTracks() { try { pvRec && pvRec.stream && pvRec.stream.getTracks().forEach(t => t.stop()); } catch {} try { pvRec && pvRec.ctx && pvRec.ctx.close(); } catch {} }
function pvRecClean() { if (!pvRec) return; clearInterval(pvRec.timer); pvRecStopSR(); try { if (pvRec.mr && pvRec.mr.state !== 'inactive') pvRec.mr.stop(); } catch {} pvRecStopTracks(); try { pvRec.audio && pvRec.audio.pause(); } catch {} pvRec = null; const bar = $('#recBar'); if (bar) bar.remove(); }
function pvRecStopMR() { return new Promise(res => { const mr = pvRec.mr; if (!mr || mr.state === 'inactive') return res(); mr.onstop = () => res(); try { mr.stop(); } catch { res(); } }); }
async function pvRecStopReview() {
  if (!pvRec || pvRec.state === 'review') return; clearInterval(pvRec.timer); pvRecStopSR();
  const dur = (Date.now() - pvRec.t0) / 1000; await pvRecStopMR(); pvRecStopTracks();
  if (!pvRec) return; pvRec.dur = Math.round(dur); pvRec.blob = new Blob(pvRec.chunks, { type: pvRec.mime });
  if (dur < 1) { pvRecClean(); return toast('录音时间太短'); }
  pvRec.state = 'review'; pvRecUI();
}
function pvRecSendReview() { if (!pvRec) return; const r = pvRec; pvRec = null; $('#recBar') && $('#recBar').remove(); try { r.audio && r.audio.pause(); } catch {} pvVoiceSend(r.peer, r.blob, r.dur, pvRecWaveOf(r), (r.tr || '').trim()); }
function pvRecWaveOf(r) { const lv = r.levels, n = 40, out = []; for (let i = 0; i < n; i++) { const a = Math.floor(i * lv.length / n), b = Math.max(a + 1, Math.floor((i + 1) * lv.length / n)); out.push(Math.max(8, ...lv.slice(a, b), 0)); } return out; }
async function pvRecFinish(send) {
  if (!pvRec) return; const r = pvRec, hadSR0 = r.srOn; clearInterval(r.timer); pvRecStopSR();
  const hadSR = hadSR0, dur = (Date.now() - r.t0) / 1000; await pvRecStopMR(); pvRecStopTracks(); pvRec = null; $('#recBar') && $('#recBar').remove();
  if (!send) return; if (hadSR) await new Promise(x => setTimeout(x, 500)); if (dur < 1) return toast('录音时间太短，没有发送');
  pvVoiceSend(r.peer, new Blob(r.chunks, { type: r.mime }), Math.round(dur), pvRecWaveOf(r), (r.tr || '').trim());
}
async function pvVoiceSend(peer, blob, dur, wave, transcript) {
  if (blob.size > 5 * 1024 * 1024) return toast('语音超过 5 MB，请缩短后重试');
  const mime = (blob.type || 'audio/webm').split(';')[0], ext = mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : 'weba';
  toast('正在发送语音…');
  try {
    const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(new Error('读取录音失败')); fr.readAsDataURL(blob); });
    const up = await api('/media', { to: peer, name: 'voice.' + ext, mime, data: b64 });
    const body = { to: peer, voice: { id: up.media.id, dur, wave, transcript: transcript || undefined } };
    if (chat.replyTo) { body.reply = { id: chat.replyTo.id }; chat.replyTo = null; pvReplyBar(); }
    const { message } = await api('/messages', body);
    (chat.msgs[peer] = chat.msgs[peer] || []).push(message); if (chat.peer === peer && tab === 'chat') appendMessage(message, true);
    mark('chat'); pvBump('voice'); pvBump('msg');
  } catch (e) { toast(e.message || '语音发送失败'); }
}

/* ---------- 聊天列表 ---------- */
const _viewChat = viewChat;
viewChat = async function () { await _viewChat(); if (me) pvEnhanceList(); };
let pvListTimer = null;
function pvRefreshList() { clearTimeout(pvListTimer); pvListTimer = setTimeout(() => { if (tab === 'chat' && $('.clist') && me) pvEnhanceList(); }, 250); }
async function pvEnhanceList() {
  const aside = $('.clist'); if (!aside) return;
  let chats = [], reqs = [];
  try { chats = (await api('/chats')).chats; } catch {}
  try { reqs = (await api('/friends/requests')).requests; } catch {}
  if (!aside.isConnected) return;
  chats.forEach(c => chat.sum[c.name] = c);
  pvListRender(aside, chats, reqs);
}
function pvAvatar(name, o) {
  o = o || {}; const cols = ['#3b5a4a', '#5a4a6b', '#6b4a3b', '#3b4f6b', '#6b3b4f', '#4f6b3b']; let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="pv-av ${o.ai ? 'ai' : ''}" style="--c:${cols[h % cols.length]}">${o.ai ? pvPx('spark', '#19170d', 3) : esc(name[0])}${o.on ? '<i class="pv-on"></i>' : ''}</span>`;
}
function pvListTime(ms) { const d = new Date(ms), n = new Date(), p = x => String(x).padStart(2, '0'); if (d.toDateString() === n.toDateString()) return p(d.getHours()) + ':' + p(d.getMinutes()); if (n - d < 864e5 * 2 && new Date(n - 864e5).toDateString() === d.toDateString()) return '昨天'; if (n - d < 864e5 * 6) return '周' + '日一二三四五六'[d.getDay()]; return (d.getMonth() + 1) + '/' + d.getDate(); }
function pvPreviewHtml(c) {
  const l = c.last; if (!l) return '<span class="pv-pv">还没有消息</span>'; const who = l.from === (me && me.name) ? '我：' : '';
  const ic = { voice: pvPx('mic', 'var(--pv-accent)', 1.5), photo: pvI('image', 14), video: pvI('image', 14), once: pvI('timer', 14), sticker: '' }[l.kind] || '';
  const t = l.kind === 'voice' ? '语音 ' + pvDur(l.dur || 0) : l.kind === 'photo' ? '照片' : l.kind === 'video' ? '视频' : l.kind === 'once' ? '限时照片' : l.kind === 'sticker' ? '贴纸 ' + esc(l.text) : esc(l.text);
  return `<span class="pv-pv">${who}${ic}${t}</span>`;
}
function pvListRender(aside, chats, reqs) {
  const prefs = pvChatPrefs(), lr = pvJ('pv_lastread', {}), tabF = chat.tabF;
  const unreadOf = c => chat.unread[c.name] || (c.last && c.last.from === c.name && c.last.t > (lr[c.name] || 0) ? 1 : 0);
  const aiHistArr = aiHist(), aiLast = [...aiHistArr].reverse().find(x => x.role === 'assistant' || x.role === 'user');
  const rows = chats.map(c => ({ c, p: prefs[c.name] || {}, un: unreadOf(c) }));
  const locked = rows.filter(r => r.p.lock), open = rows.filter(r => !r.p.lock);
  const aiPinned = (prefs.ai || {}).pin !== false;
  const sortFn = (a, b) => ((b.p.pin ? 1 : 0) - (a.p.pin ? 1 : 0)) || ((b.c.last ? b.c.last.t : 0) - (a.c.last ? a.c.last.t : 0));
  const row = (r) => `<button class="ci pv-ci ${chat.peer === r.c.name ? 'on' : ''} ${r.p.pin ? 'pinned' : ''}" data-p="${esc(r.c.name)}">${pvAvatar(r.c.name, { on: r.c.online })}<span class="pv-ci-m"><span class="pv-ci-top"><b>${esc(r.c.name)}</b><small class="${r.un ? 'hot' : ''}">${r.c.last ? pvListTime(r.c.last.t) : ''}</small></span><span class="pv-ci-bot">${pvPreviewHtml(r.c)}<span class="pv-ci-ic">${r.p.mute ? pvI('mute', 14) : ''}${r.c.disappear ? pvI('timer', 14) : ''}${r.un ? `<span class="badge">${r.un}</span>` : ''}</span></span></span></button>`;
  const aiRow = `<button class="ci pv-ci ${chat.peer === 'ai' ? 'on' : ''} ${aiPinned ? 'pinned' : ''}" data-p="ai">${pvAvatar('小伴', { ai: true })}<span class="pv-ci-m"><span class="pv-ci-top"><b>小伴 <em class="pv-aitag">AI</em></b></span><span class="pv-ci-bot"><span class="pv-pv">${aiLast ? esc(String(aiLast.content).replace(/\s+/g, ' ').slice(0, 30)) : 'AI 助手 · 随时在线'}</span></span></span></button>`;
  let list = '';
  if (tabF === 'vault') list = locked.length ? locked.sort(sortFn).map(row).join('') : '<p class="pv-empty-s">密室里还没有聊天。在聊天详情里点“锁定”，就会放到这里。</p>';
  else {
    let pool = open; if (tabF === 'unread') pool = open.filter(r => r.un); if (tabF === 'ai') pool = [];
    const pinned = pool.filter(r => r.p.pin).sort(sortFn), rest = pool.filter(r => !r.p.pin).sort(sortFn);
    const showAI = tabF === 'all' || tabF === 'ai';
    list = (showAI && aiPinned ? aiRow : '') + (pinned.length ? (tabF === 'all' ? '<div class="pv-lb">钉住</div>' : '') + pinned.map(row).join('') : '') + (rest.length || (showAI && !aiPinned) ? (tabF === 'all' ? '<div class="pv-lb">所有聊天</div>' : '') + (showAI && !aiPinned ? aiRow : '') + rest.map(row).join('') : '');
    if (!list) list = tabF === 'unread' ? '<p class="pv-empty-s">没有未读消息</p>' : '<p class="pv-empty-s">还没有好友。输入好友的 Privacy ID 添加，或让对方扫你的联系卡。</p>';
    if (tabF === 'all' && locked.length) list += `<button class="pv-vaultrow" data-tab="vault"><span>${pvPx('lock', 'var(--pv-accent)', 3)}</span><span><b>密室</b><small>${locked.length} 个聊天 · 需要 PIN 才能打开</small></span>${pvI('chev', 14)}</button>`;
  }
  const unreadN = open.filter(r => r.un).length;
  const reqHtml = reqs.length ? `<div class="pv-lb">好友请求 · ${reqs.length}</div>` + reqs.map(n => `<div class="pv-req"><span class="pv-mini-av">${esc(n[0])}</span><span><b>${esc(n)}</b><small>想加你为好友</small></span><button class="pv-mini ok" data-rq="${esc(n)}" data-acc="1">接受</button><button class="pv-mini" data-rq="${esc(n)}" data-acc="0">忽略</button></div>`).join('') : '';
  const tabs = [['all', '全部'], ['unread', '未读' + (unreadN ? ' ' + unreadN : '')], ['friends', '好友'], ['ai', '小伴'], ['vault', '密室']];
  aside.innerHTML = `<div class="head pv-chead"><span>${pvLogo(20)}</span><h1><small class="pv-eb">PRIVACY / CHATS</small>聊天</h1><button class="pv-ib" id="pvListSearch" aria-label="搜索">${pvI('search')}</button></div><div class="pv-tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${tabF === k ? 'on' : ''}">${k === 'vault' ? pvI('lock', 13) : ''}${t}</button>`).join('')}</div><div class="items">${reqHtml}${list}</div><div class="head pv-addrow"><div class="row"><input type="text" id="addf" placeholder="输入好友的 Privacy ID" maxlength="12"><button class="btn sm" id="addb">加好友</button></div></div>`;
  $('#pvListSearch').onclick = () => go('search');
  $$('.pv-tabs [data-tab]', aside).forEach(b => b.onclick = async () => { const k = b.dataset.tab; if (k === 'vault' && !(await pvNeedPin('输入 PIN 进入密室'))) return; chat.tabF = k; pvListRender(aside, chats, reqs); });
  $$('.pv-vaultrow', aside).forEach(b => b.onclick = async () => { if (!(await pvNeedPin('输入 PIN 进入密室'))) return; chat.tabF = 'vault'; pvListRender(aside, chats, reqs); });
  $$('.ci', aside).forEach(b => b.onclick = () => {
    chat.selectedFiles.forEach(f => URL.revokeObjectURL(f.preview)); chat.selectedFiles = []; chat.tray = ''; chat.replyTo = null;
    chat.peer = b.dataset.p; chat.unread[chat.peer] = 0; chat.open = true; updateDot(); viewChat();
  });
  $$('[data-rq]', aside).forEach(b => b.onclick = async () => { try { await api('/friends/respond', { name: b.dataset.rq, accept: b.dataset.acc === '1' }); toast(b.dataset.acc === '1' ? '已添加好友 ' + b.dataset.rq : '已忽略'); viewChat(); } catch (e) { toast(e.message); } });
  $('#addb').onclick = async () => { const n = $('#addf').value.trim(); if (!n) return; try { const fr = await api('/friends/add', { name: n }); toast(fr.pending ? '好友请求已发送，等对方确认' : '已添加好友 ' + n); viewChat(); } catch (e) { toast(e.message); } };
  $('#addf').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) $('#addb').click(); };
}

/* ---------- 聊天详情 ---------- */
async function pvChatInfo(peer) {
  const p = pvChatPrefs()[peer] || {}, sm = chat.sum[peer] || {}, f = chat.friends.find(x => x.name === peer) || {};
  let blocked = !!sm.blocked; await pvLoadMsgs(peer);
  const media = (chat.msgs[peer] || []).flatMap(m => (m.media || []).filter(x => !x.once && (x.mime || '').startsWith('image/')));
  const tile = (id, ic, t, on) => `<button class="pv-tile ${on ? 'on' : ''}" id="${id}" aria-pressed="${!!on}">${pvI(ic, 20)}<span>${t}</span></button>`;
  const body = `<div class="pv-info-top">${pvAvatar(peer, { on: f.online })}<b>${esc(peer)}</b><small>Privacy ID · ${esc(peer)} · ${f.online ? '在线' : '离线'}</small></div><div class="pv-tiles">${tile('tMute', 'mute', p.mute ? '已静音' : '静音', p.mute)}${tile('tSearch', 'search', '搜索')}${tile('tPin', 'pin', p.pin ? '已钉住' : '钉住', p.pin)}${tile('tLock', 'lock', p.lock ? '已锁定' : '锁定', p.lock)}</div>${pvLb('阅后即焚')}<div class="pv-card">${pvSeg('disSeg', Object.entries(PV_DIS).map(([v, t]) => [v, t]), sm.disappear || 0)}<p class="pv-hint">新消息发送后超过所选时间，会从服务器和双方设备中移除。已有消息不受影响，双方都可以修改。</p></div>${pvLb('隐私')}<div class="pv-card pv-rows">${pvTg('oncePhoto', p.once, '限时查看照片', '发给 TA 的照片和视频，对方只能看一次')}</div>${pvLb('共享媒体 · ' + media.length)}<div class="pv-media">${media.length ? media.slice(-8).reverse().map(x => `<div class="pv-thumb"><img data-media-id="${escapeAttr(x.id)}" alt="${escapeAttr(x.name)}"></div>`).join('') : '<p class="pv-empty-s">还没有共享的照片</p>'}</div><div class="pv-card pv-rows pv-danger"><button class="pv-row pv-link" id="clearChat"><span><b>清空聊天记录</b><small>只在这台设备上清空</small></span></button><button class="pv-row pv-link" id="blockBtn"><span><b>${blocked ? '解除屏蔽 ' : '屏蔽 '}${esc(peer)}</b><small>${blocked ? '恢复后可以继续聊天' : '屏蔽后双方都无法发送消息'}</small></span></button></div>`;
  pvPage('聊天详情', 'CHAT INFO', body, { back: () => pvOpenChat(peer) });
  loadMediaNodes($('.pv-media'));
  const flip = async (key, id, onLabel, offLabel, needPin) => { const cur = (pvChatPrefs()[peer] || {})[key]; if (!cur && needPin && !(await pvNeedPin('输入 PIN 锁定聊天'))) return; pvSetChatPref(peer, { [key]: !cur }); pvChatInfo(peer); };
  $('#tMute').onclick = () => flip('mute'); $('#tPin').onclick = () => flip('pin'); $('#tLock').onclick = () => flip('lock', null, null, null, true);
  $('#tSearch').onclick = () => { pvOpenChat(peer); setTimeout(() => $('#findMsg') && $('#findMsg').click(), 120); };
  pvSegBind('disSeg', async v => { try { await api('/chat/prefs', { with: peer, disappear: +v }); chat.sum[peer] = Object.assign(chat.sum[peer] || { name: peer }, { disappear: +v }); toast(+v ? `已开启阅后即焚：${PV_DIS[v]}` : '已关闭阅后即焚'); } catch (e) { toast(e.message); pvChatInfo(peer); } });
  $('#oncePhoto').onchange = e => { pvSetChatPref(peer, { once: e.target.checked }); toast(e.target.checked ? '之后发给 TA 的照片只能看一次' : '已关闭限时查看'); };
  $('#clearChat').onclick = () => { if (!confirm('清空这段聊天记录？只会清空这台设备上的显示，对方不受影响。')) return; const c = pvJ('pv_cleared', {}); c[peer] = Date.now(); store.set('pv_cleared', c); chat.msgs[peer] = []; toast('已清空'); };
  $('#blockBtn').onclick = async () => { if (!blocked && !confirm(`屏蔽 ${peer}？屏蔽后你们都无法互相发送消息。`)) return; try { await api('/blocks', { name: peer, on: !blocked }); chat.sum[peer] = Object.assign(chat.sum[peer] || { name: peer }, { blocked: !blocked }); toast(blocked ? '已解除屏蔽' : '已屏蔽'); pvChatInfo(peer); } catch (e) { toast(e.message); } };
}

/* ---------- 实时事件 ---------- */
connectStream = (function (orig) {
  return function () {
    orig(); if (!es) return;
    es.addEventListener('reaction', e => { const d = JSON.parse(e.data), f = pvFind(d.id); if (f) f.m.reactions = d.reactions; const row = $(`.msg-row[data-mid="${CSS.escape(d.id)}"] .bub`); if (row && f) { row.querySelector('.pv-reacts')?.remove(); const html = reactsHtml(f.m); if (html) row.querySelector('.msg-meta').insertAdjacentHTML('beforebegin', html); } });
    const gone = e => { const d = JSON.parse(e.data); pvDrop(d.id); pvRefreshList(); }; es.addEventListener('msg-delete', gone); es.addEventListener('msg-expire', gone);
    es.addEventListener('chat-prefs', e => { const d = JSON.parse(e.data); chat.sum[d.with] = Object.assign(chat.sum[d.with] || { name: d.with }, { disappear: d.disappear }); toast(d.disappear ? `${d.with} 开启了阅后即焚：${PV_DIS[d.disappear]}` : `${d.with} 关闭了阅后即焚`); if (tab === 'chat' && chat.peer === d.with) renderPane(); });
    es.addEventListener('once-viewed', e => { const d = JSON.parse(e.data), s = pvJ('pv_once', []); s.push(d.id); store.set('pv_once', s.slice(-300)); const el = $(`.pv-once[data-once="${CSS.escape(d.id)}"] small`); if (el) el.textContent = '对方已查看'; });
    es.addEventListener('friend-request', e => { toast(JSON.parse(e.data).name + ' 请求添加你为好友'); pvRefreshList(); });
    es.addEventListener('msg', e => { const m = JSON.parse(e.data); if (tab === 'chat' && chat.peer === m.from) pvLastRead(m.from); pvRefreshList(); });
  };
})(connectStream);

/* ---------- 密室内“发送”封装：支持回复 ---------- */
send = (function (orig) {
  return async function () {
    if (chat.peer === 'ai') return orig();
    const inp = $('#inp'); if (!inp) return; const text = inp.value.trim(); if (!text || chat.busy) return;
    inp.value = ''; pvToggleSendMic();
    try {
      const body = { to: chat.peer, text }; if (chat.replyTo) body.reply = { id: chat.replyTo.id };
      const { message } = await api('/messages', body); chat.replyTo = null; pvReplyBar();
      (chat.msgs[chat.peer] = chat.msgs[chat.peer] || []).push(message); appendMessage(message, true); mark('chat'); pvBump('msg');
    } catch (e) { inp.value = text; pvToggleSendMic(); toast(e.message); }
  };
})(send);
