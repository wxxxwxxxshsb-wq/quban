/* Privacy 2.3.2 前端 */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => fmt(new Date());
const yesterday = () => fmt(new Date(Date.now() - 864e5));
const pick = a => a[Math.random() * a.length | 0];

const STANDALONE = location.protocol === 'file:';
const APP_VERSION = '2.3.2';
/* ---------- 错误上报：页面里的任何报错都会自动发回服务器，和后端日志用同一个错误码关联 ---------- */
let lastRid = '', reportCount = 0;
const reported = new Set();
function reportError(kind, msg, extra) {
  if (STANDALONE || reportCount >= 5) return;
  const key = kind + msg; if (reported.has(key)) return;
  reported.add(key); reportCount++;
  try { fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify(Object.assign({ kind, msg: String(msg).slice(0, 300), url: location.pathname, rid: lastRid, v: APP_VERSION }, extra)) }).catch(() => {}); } catch {}
}
addEventListener('error', e => reportError('js', e.message, { src: (e.filename || '').split('/').pop(), line: e.lineno, stack: e.error && e.error.stack }));
addEventListener('unhandledrejection', e => { const r = e.reason; reportError('promise', (r && r.message) || r, { stack: r && r.stack }); });
let token = localStorage.getItem('qb_token') || '';
let me = null;           // { name } 或 null（游客）
let accountSettings = null;
let tab = 'home';
let stopGame = null;     // 当前游戏的清理函数
let es = null;           // SSE
let activeOnlineGame = null;
let inviteDialogId = null;
const handledInvites = new Set();

/* ---------- 本地存储（按账号分开） ---------- */
const store = {
  k: k => 'qb_' + (me ? me.name : 'guest') + '_' + k,
  get(k, d) { try { const v = localStorage.getItem(this.k(k)); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { localStorage.setItem(this.k(k), JSON.stringify(v)); }
};

/* ---------- 每日打开记录（只保存在当前设备/浏览器） ---------- */
function recordVisit() {
  const rows = store.get('visits', []);
  const stamp = new Date();
  const day = today();
  let row = rows.find(x => x.date === day);
  if (!row) { row = { date: day, count: 0, first: '', last: '' }; rows.push(row); }
  row.count++;
  if (!row.first) row.first = stamp.toISOString();
  row.last = stamp.toISOString();
  store.set('visits', rows.slice(-180));
}

/* ---------- 网络 ---------- */
async function api(path, body) {
  if (STANDALONE) throw new Error('这个功能（AI 助手、好友聊天、排行榜）需要联网版，单文件版暂不支持');
  const opt = { headers: { 'Content-Type': 'application/json' } };
  if (token) opt.headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) { opt.method = 'POST'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch('/api' + path, opt); } catch (e) { throw new Error('网络不通，请检查网络后重试'); }
  const rid = r.headers.get('X-Request-Id') || ''; lastRid = rid;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const er = new Error((j.error || '请求失败') + (r.status >= 500 && rid ? '（错误码 ' + rid + '）' : '')); er.rid = rid; er.status = r.status; throw er; }
  return j;
}
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 积分 / 连续打卡 / 每日任务 ---------- */
const LEVELS = [[0, '新朋友'], [60, '常客'], [200, '老伙伴'], [500, '趣味达人'], [1000, 'Privacy传说']];
function stats() {
  const s = store.get('stats', { points: 0, streak: 0, last: '', plays: 0, todosDone: 0, pomos: 0, aiAsks: 0, best: {}, daily: {} });
  if (s.daily.date !== today()) s.daily = { date: today(), play: false, chat: false, todo: false, bonus: false };
  return s;
}
function addPoints(n, why) {
  const s = stats(); s.points += n; store.set('stats', s);
  toast(`+${n} 积分${why ? '：' + why : ''}`);
}
function mark(flag) {
  const s = stats();
  if (!s.daily[flag]) { s.daily[flag] = true; store.set('stats', s); if (s.daily.play && s.daily.chat && s.daily.todo && !s.daily.bonus) { s.daily.bonus = true; store.set('stats', s); addPoints(20, '今日任务全部完成'); } }
}
const level = p => [...LEVELS].reverse().find(l => p >= l[0]);
function checkin() {
  const s = stats();
  if (s.last === today()) return toast('今天已经打过卡啦');
  s.streak = s.last === yesterday() ? s.streak + 1 : 1; s.last = today();
  const gain = 10 + Math.min(s.streak, 7) * 2; s.points += gain; store.set('stats', s);
  toast(`打卡成功！连续 ${s.streak} 天，+${gain} 积分`); render();
}

/* ---------- 游戏登记 ---------- */
const GAMES = [
  { id: 'g2048', name: '2048', emo: '🔢', desc: '滑动合并，凑出 2048', how: '方向键 / 滑动', fn: g2048 },
  { id: 'snake', name: '贪吃蛇', emo: '🐍', desc: '越吃越长，别撞墙', how: '方向键 / WASD / 滑动', fn: snake },
  { id: 'memory', name: '翻牌记忆', emo: '🃏', desc: '找出 8 对相同的图案', how: '点击翻牌', fn: memory },
  { id: 'whack', name: '打地鼠', emo: '🐹', desc: '30 秒内打得越多越好', how: '点击地鼠', fn: whack },
  { id: 'gomoku', name: '五子棋', emo: '⚫', desc: '和 AI 比谁先连成五子', how: '点击落子，你执黑先手', fn: gomoku },
  { id: 'gomoku2', name: '双人五子棋', emo: '🧑‍🤝‍🧑', desc: '两个人轮流落子，同屏来一盘', how: '黑白双方轮流点击落子', fn: gomoku2 },
  { id: 'react', name: '反应力测试', emo: '⚡', desc: '变绿的瞬间点下去', how: '点击方块', fn: react }
];
const dailyGame = () => { let h = 0; for (const c of today()) h = (h * 31 + c.charCodeAt(0)) >>> 0; return GAMES[h % GAMES.length]; };

/* ---------- 成就 ---------- */
function achievements() {
  const s = stats();
  return [
    { e: '🌱', n: '第一次打卡', ok: !!s.last },
    { e: '🔥', n: '连续 3 天', ok: s.streak >= 3 },
    { e: '🏆', n: '连续 7 天', ok: s.streak >= 7 },
    { e: '🎮', n: '玩过 5 局游戏', ok: s.plays >= 5 },
    { e: '🤖', n: '问过小伴 5 次', ok: s.aiAsks >= 5 },
    { e: '✅', n: '完成 10 个待办', ok: s.todosDone >= 10 },
    { e: '🍅', n: '完成一个番茄钟', ok: s.pomos >= 1 },
    { e: '💯', n: '积分破 200', ok: s.points >= 200 }
  ];
}

/* ---------- 路由 / 渲染 ---------- */
function go(t) {
  if (stopGame) { stopGame(); stopGame = null; }
  if (t !== 'games') activeOnlineGame = null;
  tab = t; chat.open = false; render();
}
function render() {
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  ({ home: viewHome, chat: viewChat, games: viewGames, tools: viewTools, me: viewMe })[tab]();
  $('#main').scrollTop = 0;
}

/* ===== 首页 ===== */
function viewHome() {
  const s = stats(), dg = dailyGame(), d = s.daily, hr = new Date().getHours();
  const hello = hr < 6 ? '夜深了' : hr < 11 ? '早上好' : hr < 14 ? '中午好' : hr < 18 ? '下午好' : '晚上好';
  const todos = store.get('todos', []).filter(t => !t.done);
  const chk = s.last === today();
  $('#main').innerHTML = `<div class="wrap">
    <h1>${hello}，${me ? esc(me.name) : '朋友'}</h1>
    <p class="sub">${new Date().toLocaleDateString('zh-CN', { dateStyle: 'full' })}</p>
    <div class="hero">
      <div class="card sun">
        <div class="row"><div><div class="streak">${s.streak}</div><div>天连续打卡</div></div><div class="sp"></div>
          <button class="btn ${chk ? 'ghost' : 'coral'}" id="ck">${chk ? '今日已打卡 ✓' : '打卡 +积分'}</button></div>
        <p class="sub" style="margin-top:10px">${level(s.points)[1]} · ${s.points} 积分　每天来一次，连续越久奖励越多</p>
      </div>
      <div class="card">
        <b>今日任务</b>
        ${[['play', '玩一局游戏'], ['chat', '和小伴或好友聊一句'], ['todo', '完成一个待办']].map(([k, t]) => `<div class="task"><span class="chk ${d[k] ? 'done' : ''}">${d[k] ? '✓' : ''}</span>${t}</div>`).join('')}
        <p class="sub" style="margin-top:6px">三项全做完，额外 +20 积分</p>
      </div>
    </div>
    <h2>今日挑战</h2>
    <div class="card mint tile" id="dg"><div class="row"><span style="font-size:44px">${dg.emo}</span><div><b style="font-size:20px">${dg.name}</b><div>${dg.desc}。今天第一次玩额外 +15 积分</div></div><div class="sp"></div><span class="btn">开玩</span></div></div>
    <h2>待办（${todos.length}）</h2>
    <div class="card">${todos.length ? todos.slice(0, 4).map(t => `<div class="task">○ ${esc(t.t)}</div>`).join('') : '<div class="sub">暂时没有待办。去「工具」里加一个，或者直接让小伴帮你安排。</div>'}</div>
    <h2>快捷入口</h2>
    <div class="grid">
      <div class="card sky tile quick" data-go="chat"><span class="big">🤖</span><b>问问小伴</b><span class="sub">写作、计算、做决定</span></div>
      <div class="card tile quick" data-go="tools"><span class="big">🍅</span><b>番茄钟</b><span class="sub">25 分钟专注一下</span></div>
      <div class="card sky tile quick" data-tool="note"><span class="big">📝</span><b>写备忘</b><span class="sub">灵感和小事，随手记下来</span></div>
      <div class="card tile quick" data-go="games"><span class="big">🎮</span><b>来一局</b><span class="sub">${GAMES.length} 个小游戏</span></div>
    </div></div>`;
  $('#ck').onclick = checkin;
  $('#dg').onclick = () => openGame(dg.id);
  $$('[data-go]').forEach(e => e.onclick = () => go(e.dataset.go));
  $$('[data-tool]').forEach(e => e.onclick = () => { tool = e.dataset.tool; go('tools'); });
}

/* ===== 聊天 ===== */
const chat = { peer: 'ai', friends: [], unread: {}, msgs: {}, open: false, busy: false };
const AI_HELLO = { role: 'assistant', content: '我是小伴 👋 你可以让我算数、写文案、翻译、解释概念、帮你安排今天的待办，或者只是聊聊天。' };
const aiHist = () => store.get('aihist', [AI_HELLO]);
const fmtMsg = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

async function loadFriends() {
  if (!me) return;
  try { chat.friends = (await api('/friends')).friends; } catch {}
}
async function viewChat() {
  if (me) await loadFriends();
  const list = chat.friends;
  $('#main').innerHTML = `<div class="chat ${chat.open ? 'open' : ''}">
    <aside class="clist">
      <div class="head"><b>聊天</b></div>
      <div class="items">
        <button class="ci ${chat.peer === 'ai' ? 'on' : ''}" data-p="ai"><span class="av ai">🤖</span><div class="sp"><b>小伴</b><div class="sub">AI 助手 · 随时在线</div></div></button>
        ${list.map(f => `<button class="ci ${chat.peer === f.name ? 'on' : ''}" data-p="${esc(f.name)}"><span class="av">${esc(f.name[0])}${f.online ? '<i class="on"></i>' : ''}</span><div class="sp"><b>${esc(f.name)}</b></div>${chat.unread[f.name] ? `<span class="badge">${chat.unread[f.name]}</span>` : ''}</button>`).join('')}
        ${me ? '' : '<div class="empty sub">登录后才能加好友聊天</div>'}
      </div>
      ${me ? '<div class="head" style="border-top:var(--line);border-bottom:none"><div class="row"><input type="text" id="addf" placeholder="输入好友昵称"><button class="btn sm" id="addb">加好友</button></div></div>' : '<div class="head" style="border-top:var(--line);border-bottom:none"><button class="btn" id="lg" style="width:100%">登录 / 注册</button></div>'}
    </aside>
    <section class="cpane" id="cp"></section></div>`;
  $$('.ci').forEach(b => b.onclick = () => { chat.peer = b.dataset.p; chat.unread[chat.peer] = 0; chat.open = true; updateDot(); viewChat(); });
  if ($('#addb')) $('#addb').onclick = async () => {
    const n = $('#addf').value.trim(); if (!n) return;
    try { await api('/friends/add', { name: n }); toast('已添加好友 ' + n); viewChat(); } catch (e) { toast(e.message); }
  };
  if ($('#lg')) $('#lg').onclick = showAuth;
  renderPane();
}
async function renderPane() {
  const cp = $('#cp'); if (!cp) return;
  const isAI = chat.peer === 'ai';
  if (!isAI && !me) { chat.peer = 'ai'; return renderPane(); }
  let msgs;
  if (isAI) msgs = aiHist().map(m => ({ me: m.role === 'user', text: m.content }));
  else {
    if (!chat.msgs[chat.peer]) { try { chat.msgs[chat.peer] = (await api('/messages?with=' + encodeURIComponent(chat.peer))).messages; } catch { chat.msgs[chat.peer] = []; } }
    msgs = chat.msgs[chat.peer].map(m => ({ me: m.from === me.name, text: m.text }));
  }
  cp.innerHTML = `<div class="chead"><button class="btn sm ghost back" id="bk">←</button><span class="av ${isAI ? 'ai' : ''}" style="width:32px;height:32px">${isAI ? '🤖' : esc(chat.peer[0])}</span>${isAI ? '小伴' : esc(chat.peer)}</div>
    <div class="msgs" id="ms">${msgs.map(m => `<div class="bub ${m.me ? 'me' : ''}">${fmtMsg(m.text)}</div>`).join('') || '<div class="empty">还没有消息，打个招呼吧 👋</div>'}</div>
    <div class="sendbar"><input type="text" id="inp" placeholder="${isAI ? '问小伴任何事…' : '说点什么…'}" autocomplete="off"><button class="btn" id="snd">发送</button></div>`;
  const ms = $('#ms'); ms.scrollTop = ms.scrollHeight;
  $('#bk').onclick = () => { chat.open = false; viewChat(); };
  const inp = $('#inp'); inp.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) send(); };
  $('#snd').onclick = send;
  if (innerWidth > 760) inp.focus();
}
function appendBub(text, mine, cls = '') {
  const ms = $('#ms'); if (!ms) return null;
  const e = ms.querySelector('.empty'); if (e) e.remove();
  const b = document.createElement('div'); b.className = 'bub ' + (mine ? 'me ' : '') + cls; b.innerHTML = fmtMsg(text);
  ms.appendChild(b); ms.scrollTop = ms.scrollHeight; return b;
}
async function send() {
  const inp = $('#inp'); const text = inp.value.trim(); if (!text || chat.busy) return;
  inp.value = '';
  if (chat.peer === 'ai') {
    chat.busy = true;
    const h = aiHist(); h.push({ role: 'user', content: text }); store.set('aihist', h.slice(-60));
    appendBub(text, true); const wait = appendBub('小伴想一想…', false, 'typing');
    const s = stats(); s.aiAsks++; store.set('stats', s); mark('chat');
    const todos = store.get('todos', []).filter(t => !t.done).map(t => t.t).join('；') || '无';
    try {
      const r = await api('/ai', { messages: h.slice(-20), context: `现在是 ${new Date().toLocaleString('zh-CN')}。用户的未完成待办：${todos}` });
      h.push({ role: 'assistant', content: r.text }); store.set('aihist', h.slice(-60));
      if (wait) { wait.classList.remove('typing'); wait.innerHTML = fmtMsg(r.text); }
    } catch (e) { if (wait) wait.textContent = (STANDALONE ? '' : '网络不通：') + e.message; }
    chat.busy = false; const ms = $('#ms'); if (ms) ms.scrollTop = ms.scrollHeight;
  } else {
    try {
      const { message } = await api('/messages', { to: chat.peer, text });
      (chat.msgs[chat.peer] = chat.msgs[chat.peer] || []).push(message); appendBub(text, true); mark('chat');
    } catch (e) { toast(e.message); }
  }
}
function updateDot() { $('#dot').hidden = !Object.values(chat.unread).some(n => n > 0); }
function connectStream() {
  if (es) es.close(); if (!me) return;
  es = new EventSource('/api/stream?token=' + token);
  es.addEventListener('account-deleted', () => { if(me)clearLocalAccountData(me.name);localStorage.removeItem('qb_token');localStorage.removeItem('qb_last_user');token='';me=null;accountSettings=null;es?.close();toast('账号已删除');go('home'); });
  es.addEventListener('game-invite', e => showGameInvite(JSON.parse(e.data)));
  es.addEventListener('game-update', e => {
    const game = JSON.parse(e.data);
    if (activeOnlineGame === game.id && tab === 'games') renderOnlineBoard(game);
    if (game.status === 'declined' && game.players[0] === me?.name) toast(`${game.players[1]} 暂时无法对战`);
  });
  es.addEventListener('msg', e => {
    const m = JSON.parse(e.data);
    (chat.msgs[m.from] = chat.msgs[m.from] || []).push(m);
    if (tab === 'chat' && chat.peer === m.from) appendBub(m.text, false);
    else { chat.unread[m.from] = (chat.unread[m.from] || 0) + 1; updateDot(); const n = accountSettings?.notifications; if (n?.enabled !== false && n?.messages !== false) { toast(n?.preview === 'none' ? '收到一条新消息' : n?.preview === 'all' ? `${m.from}：${m.text.slice(0, 20)}` : `${m.from} 发来新消息`); if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Privacy', { body: n?.preview === 'none' ? '收到一条新消息' : n?.preview === 'all' ? `${m.from}：${m.text.slice(0, 80)}` : `${m.from} 发来新消息`, silent: n?.sound === false }); } if (tab === 'chat') viewChat(); }
  });
  es.addEventListener('friend', e => { const who = JSON.parse(e.data).name; if (accountSettings?.notifications?.enabled !== false && accountSettings?.notifications?.security !== false) toast(who + ' 加你为好友了'); if (tab === 'chat') viewChat(); });
  api('/games/invites').then(({ invites }) => invites.forEach(showGameInvite)).catch(() => {});
}

/* ===== 游戏大厅 ===== */
function viewGames() {
  const s = stats(), dg = dailyGame();
  $('#main').innerHTML = `<div class="wrap"><h1>游戏</h1><p class="sub">轻松玩一局，或者邀请好友来场真正的对决。</p>
    <div class="online-challenge" id="onlineChallenge"><div class="online-mark">✦</div><div class="online-copy"><span class="eyebrow">REAL FRIENDS · NO BOTS</span><h2>好友五子棋</h2><p>邀请好友实时对弈，轮到谁走一目了然。</p></div><button class="btn" id="inviteFriend">邀好友开局 ↗</button></div>
    <div class="grid" style="margin-top:18px">${GAMES.map(g => `<div class="card gcard tile" data-g="${g.id}"><span class="emo">${g.emo}</span><b style="font-size:19px">${g.name}${g.id === dg.id ? ' <span class="tag">今日挑战</span>' : ''}</b><span class="sub">${g.desc}</span><span class="sub">最佳：${s.best[g.id] ?? '—'}</span></div>`).join('')}</div>
    <p class="sub" style="margin-top:22px">离线小游戏随时开局；好友对战需要双方都登录并在线。</p></div>`;
  $$('[data-g]').forEach(e => e.onclick = () => openGame(e.dataset.g));
  $('#inviteFriend').onclick = showFriendPicker;
}

async function showFriendPicker() {
  if (!me) return showAuth();
  await loadFriends();
  const a = $('#auth'); a.hidden = false;
  a.innerHTML = `<div class="box friend-picker"><img src="/logo.svg" alt="Privacy"><h1>约好友开一局</h1><p class="sub">选一位在线好友，马上开始五子棋。</p>${chat.friends.length ? chat.friends.map(f => `<button class="friend-choice" data-friend="${esc(f.name)}" ${f.online ? '' : 'disabled'}><span>${esc(f.name[0])}</span><b>${esc(f.name)}</b><small>${f.online ? '在线' : '暂时离线'}</small></button>`).join('') : '<div class="sub">你还没有好友。先到聊天页添加好友，就能邀请对战。</div>'}<button class="btn ghost" id="closePicker">关闭</button></div>`;
  $$('[data-friend]', a).forEach(b => b.onclick = () => { a.hidden = true; inviteOnlineGame(b.dataset.friend); });
  $('#closePicker').onclick = () => { a.hidden = true; };
}

async function inviteOnlineGame(friend) {
  try {
    const { game } = await api('/games/invite', { friend });
    toast(`已邀请 ${friend}，等对方接受…`); openOnlineGame(game.id);
  } catch (e) { toast(e.message); }
}

async function openOnlineGame(id) {
  try {
    const { game } = await api('/games/' + encodeURIComponent(id));
    activeOnlineGame = id; tab = 'games'; $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'games'));
    renderOnlineBoard(game);
  } catch (e) { toast(e.message); go('games'); }
}

function renderOnlineBoard(game) {
  const mine = me && game.players.includes(me.name);
  const mark = game.board.map((v, i) => `<button class="og-cell ${v === 1 ? 'black' : v === 2 ? 'white' : ''}" data-cell="${i}" aria-label="${v ? (v === 1 ? '黑棋' : '白棋') : '空位'}" ${game.status !== 'active' || game.turn !== me?.name || v ? 'disabled' : ''}>${v === 1 ? '●' : v === 2 ? '○' : ''}</button>`).join('');
  let status = game.status === 'pending' ? (game.players[0] === me?.name ? `正在等 ${esc(game.players[1])} 接受邀请…` : '等待对方开始') : game.status === 'declined' ? '对方暂时不方便，改天再战。' : game.status === 'finished' ? (game.winner ? `${game.winner === me?.name ? '🎉 你赢了！' : `${esc(game.winner)} 赢了！`}` : '平局，再来一盘？') : game.turn === me?.name ? '轮到你了，落一子！' : `等 ${esc(game.players.find(n => n !== me?.name) || '')} 落子…`;
  const meMark = game.players[0] === me?.name ? '黑棋' : '白棋';
  $('#main').innerHTML = `<div class="gview online-gview"><div class="row"><button class="btn sm ghost" id="onlineBack">← 游戏大厅</button><div class="sp"></div><span class="live-pill">● LIVE</span></div><div class="online-scoreboard"><div class="online-player ${game.turn === game.players[0] && game.status === 'active' ? 'active' : ''}"><span class="piece black-piece">●</span><b>${esc(game.players[0])}${game.players[0] === me?.name ? '（你）' : ''}</b><small>${game.players[0] === me?.name ? '你执黑' : '黑棋'}</small></div><span class="online-vs">VS</span><div class="online-player ${game.turn === game.players[1] && game.status === 'active' ? 'active' : ''}"><span class="piece white-piece">○</span><b>${esc(game.players[1])}${game.players[1] === me?.name ? '（你）' : ''}</b><small>${game.players[1] === me?.name ? '你执白' : '白棋'}</small></div></div><div class="online-status ${game.status === 'finished' ? 'finished' : ''}">${status}</div><div class="online-board" role="grid">${mark}</div><div class="online-controls">${game.status === 'finished' ? `<button class="btn" id="rematch">再来一盘</button>` : ''}<button class="btn ghost" id="onlineExit">离开对局</button></div><p class="sub online-note">你执${meMark} · ${game.moves} 手 · 对局状态实时同步</p></div>`;
  $('#onlineBack').onclick = () => { activeOnlineGame = null; go('games'); };
  $('#onlineExit').onclick = () => { activeOnlineGame = null; go('games'); };
  $$('[data-cell]', $('#main')).forEach(b => b.onclick = async () => {
    try { const result = await api(`/games/${encodeURIComponent(id)}/move`, { index: +b.dataset.cell }); renderOnlineBoard(result.game); }
    catch (e) { toast(e.message); }
  });
  if ($('#rematch')) $('#rematch').onclick = () => inviteOnlineGame(game.players.find(n => n !== me?.name));
}

async function showGameInvite(game) {
  if (!game || handledInvites.has(game.id) || inviteDialogId === game.id) return;
  handledInvites.add(game.id); inviteDialogId = game.id;
  const from = game.players[0], a = $('#auth'); a.hidden = false;
  a.innerHTML = `<div class="box"><img src="/logo.svg" alt="Privacy"><h1>好友来挑战啦</h1><p class="sub"><b>${esc(from)}</b> 邀请你来一场五子棋。</p><div class="row"><button class="btn ghost" id="declineGame">稍后再说</button><button class="btn" id="acceptGame">接受，开局</button></div></div>`;
  $('#declineGame').onclick = async () => { a.hidden = true; inviteDialogId = null; try { await api(`/games/${encodeURIComponent(game.id)}/decline`, {}); } catch {} };
  $('#acceptGame').onclick = async () => { try { const { game: accepted } = await api(`/games/${encodeURIComponent(game.id)}/accept`, {}); a.hidden = true; inviteDialogId = null; activeOnlineGame = game.id; renderOnlineBoard(accepted); } catch (e) { a.hidden = true; inviteDialogId = null; toast(e.message); } };
}
function openGame(id) {
  if (stopGame) { stopGame(); stopGame = null; }
  tab = 'games'; $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'games'));
  const g = GAMES.find(x => x.id === id);
  $('#main').innerHTML = `<div class="gview"><div class="row"><button class="btn sm ghost" id="gb">← 返回</button><h1 style="font-size:24px">${g.emo} ${g.name}</h1><div class="sp"></div><button class="btn sm ghost" id="rk">排行榜</button></div>
    <p class="sub" style="margin-top:6px">操作：${g.how}　最佳：<span id="best">${stats().best[id] ?? '—'}</span></p><div class="gbox" id="gx"></div></div>`;
  $('#gb').onclick = () => go('games');
  $('#rk').onclick = () => showRank(g);
  const run = () => {
    const box = $('#gx'); box.innerHTML = '';
    stopGame = g.fn(box, (score, msg) => finish(g, box, score, msg, run));
  };
  run();
}
async function finish(g, box, score, msg, again) {
  const s = stats(); s.plays++;
  const isBest = score > (s.best[g.id] || 0); if (isBest) s.best[g.id] = score;
  const dg = dailyGame(); let gain = 5;
  if (g.id === dg.id && !s.daily.bonus15) { s.daily.bonus15 = true; gain += 15; }
  store.set('stats', s); addPoints(gain, '完成一局'); mark('play');
  $('#best') && ($('#best').textContent = s.best[g.id]);
  if (me) api('/score', { game: g.id, score }).catch(() => {});
  const o = document.createElement('div'); o.className = 'over';
  o.innerHTML = `<div>${msg || '游戏结束'}</div><div class="big">${score}</div><div class="sub">${isBest ? '🎉 新纪录！' : '最佳 ' + s.best[g.id]}</div><div class="row"><button class="btn" id="ag">再来一局</button><button class="btn ghost" id="rk2">排行榜</button></div>`;
  box.appendChild(o);
  $('#ag').onclick = again; $('#rk2').onclick = () => showRank(g);
}
async function showRank(g) {
  let rows = [];
  try { rows = (await api('/rank?game=' + g.id)).rows; } catch {}
  const w = document.createElement('div'); w.id = 'auth';
  w.innerHTML = `<div class="box" style="text-align:left"><h1 style="font-size:22px">${g.emo} ${g.name} 排行榜</h1>${rows.length ? rows.map((r, i) => `<div class="task"><b style="width:28px">${['🥇', '🥈', '🥉'][i] || i + 1}</b><span class="sp">${esc(r.name)}${me && r.name === me.name ? '（你）' : ''}</span><b>${r.score}</b></div>`).join('') : '<p class="sub">还没人上榜。登录后玩一局，你就是第一名。</p>'}<button class="btn" id="x">关闭</button></div>`;
  document.body.appendChild(w); $('#x', w).onclick = () => w.remove();
}

/* ---------- 6 个游戏 ---------- */
const swipe = (el, cb) => {
  let sx, sy;
  const st = e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; };
  const en = e => { const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 3 : 1)); };
  el.addEventListener('touchstart', st, { passive: true }); el.addEventListener('touchend', en, { passive: true });
};
const KEYDIR = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3, a: 0, w: 1, d: 2, s: 3, A: 0, W: 1, D: 2, S: 3 };

function g2048(box, end) {
  let b = Array(16).fill(0), score = 0, dead = false;
  const add = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[pick(e)] = Math.random() < .9 ? 2 : 4; };
  add(); add();
  const draw = () => { box.innerHTML = `<div class="score-row">分数 <b>${score}</b></div><div class="b2048">${b.map(v => `<div class="t t${v}">${v || ''}</div>`).join('')}</div>`; };
  const line = a => { const r = a.filter(Boolean); let s = 0; for (let i = 0; i < r.length - 1; i++) if (r[i] === r[i + 1]) { r[i] *= 2; s += r[i]; r.splice(i + 1, 1); } while (r.length < 4) r.push(0); return [r, s]; };
  const can = () => b.some((v, i) => !v || (i % 4 < 3 && v === b[i + 1]) || (i < 12 && v === b[i + 4]));
  const move = d => {
    if (dead) return; let moved = false; const nb = b.slice();
    for (let k = 0; k < 4; k++) {
      const idx = [0, 1, 2, 3].map(j => d === 0 ? k * 4 + j : d === 2 ? k * 4 + 3 - j : d === 1 ? j * 4 + k : (3 - j) * 4 + k);
      const [r, s] = line(idx.map(i => b[i])); score += s;
      idx.forEach((i, j) => { if (nb[i] !== r[j]) moved = true; nb[i] = r[j]; });
    }
    if (!moved) return; b = nb; add(); draw();
    if (!can()) { dead = true; end(score, '没有可以移动的格子了'); }
  };
  const key = e => { if (e.key in KEYDIR) { e.preventDefault(); move(KEYDIR[e.key]); } };
  addEventListener('keydown', key); swipe(box, move); draw();
  return () => removeEventListener('keydown', key);
}

function snake(box, end) {
  const N = 20, C = 18; let sn = [[10, 10], [9, 10], [8, 10]], dir = 2, nd = 2, food, score = 0, timer, dead = false;
  box.innerHTML = `<div class="score-row">分数 <b id="sc">0</b></div><canvas width="${N * C}" height="${N * C}"></canvas>`;
  const cv = $('canvas', box), cx = cv.getContext('2d');
  const place = () => { do food = [Math.random() * N | 0, Math.random() * N | 0]; while (sn.some(p => p[0] === food[0] && p[1] === food[1])); };
  place();
  const draw = () => {
    cx.fillStyle = '#FFF9EC'; cx.fillRect(0, 0, N * C, N * C);
    cx.fillStyle = '#FF6B57'; cx.beginPath(); cx.arc(food[0] * C + C / 2, food[1] * C + C / 2, C / 2 - 2, 0, 7); cx.fill();
    sn.forEach((p, i) => { cx.fillStyle = i ? '#3CCFA0' : '#1C2340'; cx.fillRect(p[0] * C + 1, p[1] * C + 1, C - 2, C - 2); });
  };
  const D = [[-1, 0], [0, -1], [1, 0], [0, 1]];
  const tick = () => {
    if ((nd + 2) % 4 !== dir) dir = nd;
    const h = [sn[0][0] + D[dir][0], sn[0][1] + D[dir][1]];
    if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || sn.some(p => p[0] === h[0] && p[1] === h[1])) { dead = true; clearInterval(timer); return end(score, '撞到了'); }
    sn.unshift(h);
    if (h[0] === food[0] && h[1] === food[1]) { score += 10; $('#sc', box).textContent = score; place(); clearInterval(timer); timer = setInterval(tick, Math.max(55, 130 - score / 2)); } else sn.pop();
    draw();
  };
  const key = e => { if (e.key in KEYDIR) { e.preventDefault(); nd = KEYDIR[e.key]; } };
  addEventListener('keydown', key); swipe(box, d => nd = d); draw(); timer = setInterval(tick, 130);
  return () => { clearInterval(timer); removeEventListener('keydown', key); };
}

function memory(box, end) {
  const em = ['🍎', '🐶', '🚀', '🎸', '🌈', '🍕', '⚽', '🐱']; const cards = [...em, ...em].sort(() => Math.random() - .5);
  let first = null, lock = false, moves = 0, found = 0; const t0 = Date.now();
  box.innerHTML = `<div class="score-row">步数 <b id="mv">0</b></div><div class="mem">${cards.map((_, i) => `<button class="mc" data-i="${i}">?</button>`).join('')}</div>`;
  $$('.mc', box).forEach(c => c.onclick = () => {
    if (lock || c.classList.contains('open') || c.classList.contains('ok')) return;
    c.classList.add('open'); c.textContent = cards[c.dataset.i];
    if (!first) { first = c; return; }
    moves++; $('#mv', box).textContent = moves;
    if (cards[first.dataset.i] === cards[c.dataset.i]) {
      first.classList.add('ok'); c.classList.add('ok'); first = null; found++;
      if (found === 8) { const sec = (Date.now() - t0) / 1000 | 0; end(Math.max(10, 1000 - moves * 20 - sec * 5), `${moves} 步 · ${sec} 秒全部配对`); }
    } else { lock = true; const a = first; first = null; setTimeout(() => { a.classList.remove('open'); c.classList.remove('open'); a.textContent = c.textContent = '?'; lock = false; }, 650); }
  });
  return () => {};
}

function whack(box, end) {
  let score = 0, left = 30, cur = -1, over = false;
  box.innerHTML = `<div class="score-row">得分 <b id="sc">0</b>　剩余 <b id="tm">30</b> 秒</div><div class="holes">${Array.from({ length: 9 }, (_, i) => `<button class="hole" data-i="${i}"></button>`).join('')}</div>`;
  const holes = $$('.hole', box);
  holes.forEach(h => h.onclick = () => { if (+h.dataset.i === cur) { score += 10; $('#sc', box).textContent = score; h.textContent = '💥'; cur = -1; } });
  const show = () => { if (cur >= 0) holes[cur].textContent = ''; cur = Math.random() * 9 | 0; holes[cur].textContent = '🐹'; };
  const t1 = setInterval(show, 700);
  const t2 = setInterval(() => { left--; $('#tm', box).textContent = left; if (left <= 0) { clearInterval(t1); clearInterval(t2); if (!over) { over = true; end(score, '时间到'); } } }, 1000);
  return () => { clearInterval(t1); clearInterval(t2); over = true; };
}

function gomoku(box, end) {
  const N = 15, C = 28, P = 16, W = N * C; const bd = Array.from({ length: N }, () => Array(N).fill(0)); let moves = 0, over = false, busy = false;
  box.innerHTML = `<div class="score-row" id="st">轮到你（黑）</div><canvas width="${W}" height="${W}"></canvas>`;
  const cv = $('canvas', box), cx = cv.getContext('2d');
  const draw = () => {
    cx.fillStyle = '#FFD98A'; cx.fillRect(0, 0, W, W); cx.strokeStyle = '#1C2340'; cx.lineWidth = 1;
    for (let i = 0; i < N; i++) { cx.beginPath(); cx.moveTo(P + i * (C - 1.1), P); cx.lineTo(P + i * (C - 1.1), W - P); cx.moveTo(P, P + i * (C - 1.1)); cx.lineTo(W - P, P + i * (C - 1.1)); cx.stroke(); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (bd[y][x]) { cx.beginPath(); cx.arc(P + x * (C - 1.1), P + y * (C - 1.1), 11, 0, 7); cx.fillStyle = bd[y][x] === 1 ? '#1C2340' : '#fff'; cx.fill(); cx.stroke(); }
  };
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const get = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? -1 : bd[y][x];
  const run = (x, y, p, dx, dy) => { let n = 1, open = 0; for (const s of [1, -1]) { let i = 1; while (get(x + s * dx * i, y + s * dy * i) === p) { n++; i++; } if (get(x + s * dx * i, y + s * dy * i) === 0) open++; } return [n, open]; };
  const won = (x, y, p) => DIRS.some(([dx, dy]) => run(x, y, p, dx, dy)[0] >= 5);
  const val = (x, y, p) => { let t = 0; for (const [dx, dy] of DIRS) { const [n, o] = run(x, y, p, dx, dy); t += n >= 5 ? 100000 : n === 4 ? (o === 2 ? 10000 : o === 1 ? 1000 : 0) : n === 3 ? (o === 2 ? 1000 : o === 1 ? 100 : 0) : n === 2 ? (o === 2 ? 100 : o === 1 ? 10 : 0) : o; } return t; };
  const aiMove = () => {
    let best = -1, bs = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!bd[y][x]) { const s = val(x, y, 2) * 1.05 + val(x, y, 1); if (s > best) { best = s; bs = [[x, y]]; } else if (s === best) bs.push([x, y]); }
    return pick(bs);
  };
  cv.onclick = e => {
    if (over || busy) return; const r = cv.getBoundingClientRect(), k = W / r.width;
    const x = Math.round(((e.clientX - r.left) * k - P) / (C - 1.1)), y = Math.round(((e.clientY - r.top) * k - P) / (C - 1.1));
    if (get(x, y) !== 0) return; bd[y][x] = 1; moves++; draw();
    if (won(x, y, 1)) { over = true; return end(Math.max(20, 300 - moves * 3), '你赢了！'); }
    busy = true; $('#st', box).textContent = '小伴思考中…';
    setTimeout(() => {
      const [ax, ay] = aiMove(); bd[ay][ax] = 2; draw(); busy = false; $('#st', box).textContent = '轮到你（黑）';
      if (won(ax, ay, 2)) { over = true; end(0, 'AI 赢了，再试一次'); }
    }, 300);
  };
  draw(); return () => { over = true; };
}

function gomoku2(box, end) {
  const N = 15, C = 28, P = 16, W = N * C;
  const bd = Array.from({ length: N }, () => Array(N).fill(0));
  let moves = 0, over = false, turn = 1;
  box.innerHTML = `<div class="duel-head"><div class="duel-player active" id="p1">⚫ 黑棋 <small>玩家 1</small></div><div class="duel-vs">VS</div><div class="duel-player" id="p2">⚪ 白棋 <small>玩家 2</small></div></div><div class="score-row" id="st">黑棋先手，把手机/电脑交给对方轮流下</div><canvas width="${W}" height="${W}" aria-label="双人五子棋棋盘"></canvas><button class="btn ghost" id="undo">↶ 悔一步</button>`;
  const cv = $('canvas', box), cx = cv.getContext('2d'), history = [];
  const draw = last => {
    cx.fillStyle = '#F4CC86'; cx.fillRect(0, 0, W, W); cx.strokeStyle = '#71522C'; cx.lineWidth = 1;
    for (let i = 0; i < N; i++) { cx.beginPath(); cx.moveTo(P + i * (C - 1.1), P); cx.lineTo(P + i * (C - 1.1), W - P); cx.moveTo(P, P + i * (C - 1.1)); cx.lineTo(W - P, P + i * (C - 1.1)); cx.stroke(); }
    [[3,3],[11,3],[7,7],[3,11],[11,11]].forEach(([x,y]) => { cx.beginPath(); cx.arc(P + x * (C - 1.1), P + y * (C - 1.1), 3, 0, 7); cx.fillStyle = '#71522C'; cx.fill(); });
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (bd[y][x]) { cx.beginPath(); cx.arc(P + x * (C - 1.1), P + y * (C - 1.1), 11, 0, 7); cx.fillStyle = bd[y][x] === 1 ? '#1C2340' : '#fff'; cx.fill(); cx.strokeStyle = '#1C2340'; cx.stroke(); if (last && last[0] === x && last[1] === y) { cx.beginPath(); cx.arc(P + x * (C - 1.1), P + y * (C - 1.1), 3, 0, 7); cx.fillStyle = '#FF6B57'; cx.fill(); } }
  };
  const won = (x, y, p) => [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy]) => {
    let n = 1;
    for (const dir of [1,-1]) { let i = 1; while (x + dx * i * dir >= 0 && x + dx * i * dir < N && y + dy * i * dir >= 0 && y + dy * i * dir < N && bd[y + dy * i * dir][x + dx * i * dir] === p) { n++; i++; } }
    return n >= 5;
  });
  const status = () => { $('#st', box).textContent = turn === 1 ? '轮到黑棋 · 玩家 1' : '轮到白棋 · 玩家 2'; $('#p1', box).classList.toggle('active', turn === 1); $('#p2', box).classList.toggle('active', turn === 2); };
  cv.onclick = e => {
    if (over) return;
    const r = cv.getBoundingClientRect(), k = W / r.width;
    const x = Math.round(((e.clientX - r.left) * k - P) / (C - 1.1)), y = Math.round(((e.clientY - r.top) * k - P) / (C - 1.1));
    if (x < 0 || y < 0 || x >= N || y >= N || bd[y][x]) return;
    bd[y][x] = turn; history.push([x,y,turn]); moves++; draw([x,y]);
    if (won(x,y,turn)) { over = true; return end(turn === 1 ? 100 : 90, `${turn === 1 ? '黑棋' : '白棋'}赢了！${moves} 手分出胜负`); }
    if (moves === N * N) { over = true; return end(50, '棋盘满了，平局！'); }
    turn = turn === 1 ? 2 : 1; status();
  };
  $('#undo', box).onclick = () => { if (over || !history.length) return; const [x,y,p] = history.pop(); bd[y][x] = 0; turn = p; moves--; draw(); status(); };
  draw(); status(); return () => { over = true; };
}

function react(box, end) {
  let state = 'idle', t0 = 0, timer; box.innerHTML = `<div class="react" id="rb" style="background:var(--sky)">点击开始</div><div class="sub">成绩 = 1000 − 反应毫秒数，越高越好</div>`;
  const rb = $('#rb', box);
  rb.onclick = () => {
    if (state === 'idle') { state = 'wait'; rb.style.background = 'var(--coral)'; rb.textContent = '等变绿再点…'; timer = setTimeout(() => { state = 'go'; t0 = performance.now(); rb.style.background = 'var(--mint)'; rb.textContent = '现在！'; }, 1500 + Math.random() * 2500); }
    else if (state === 'wait') { clearTimeout(timer); state = 'idle'; rb.style.background = 'var(--sun)'; rb.textContent = '太急了！点击重来'; }
    else if (state === 'go') { const ms = Math.round(performance.now() - t0); state = 'done'; end(Math.max(0, 1000 - ms), `你的反应是 ${ms} 毫秒`); }
  };
  return () => clearTimeout(timer);
}

/* ===== 工具 ===== */
let tool = 'todo';
let noteFilter = '';
let activeNoteId = null;
function viewTools() {
  $('#main').innerHTML = `<div class="wrap"><h1>工具</h1><div class="tabs">${[['todo', '✅ 待办'], ['note', '📝 备忘录'], ['calc', '🧮 计算器'], ['pomo', '🍅 番茄钟']].map(([k, n]) => `<button class="pill ${tool === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div id="tb"></div></div>`;
  $$('[data-t]').forEach(p => p.onclick = () => { tool = p.dataset.t; viewTools(); });
  ({ todo: toolTodo, note: toolNote, calc: toolCalc, pomo: toolPomo })[tool]($('#tb'));
}
function toolTodo(el) {
  const todos = store.get('todos', []);
  el.innerHTML = `<div class="row"><input type="text" id="ti" placeholder="要做什么？回车添加"><button class="btn" id="ta">添加</button></div>
    <div class="card" style="margin-top:16px">${todos.length ? todos.map(t => `<div class="todo ${t.done ? 'done' : ''}"><button class="chk ${t.done ? 'done' : ''}" data-c="${t.id}">${t.done ? '✓' : ''}</button><span class="sp">${esc(t.t)}</span><button class="btn sm ghost" data-d="${t.id}">删除</button></div>`).join('') : '<div class="sub">空空如也。写下今天最重要的一件事吧。</div>'}</div>`;
  const add = () => { const v = $('#ti').value.trim(); if (!v) return; todos.unshift({ id: Date.now(), t: v, done: false }); store.set('todos', todos); toolTodo(el); };
  $('#ta').onclick = add; $('#ti').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) add(); };
  $$('[data-c]', el).forEach(b => b.onclick = () => {
    const t = todos.find(x => x.id == b.dataset.c); t.done = !t.done; store.set('todos', todos);
    if (t.done) { const s = stats(); s.todosDone++; store.set('stats', s); addPoints(3, '完成待办'); mark('todo'); }
    toolTodo(el);
  });
  $$('[data-d]', el).forEach(b => b.onclick = () => { store.set('todos', todos.filter(x => x.id != b.dataset.d)); toolTodo(el); });
}
function toolNote(el) {
  let notes = store.get('notes', null);
  if (!Array.isArray(notes)) {
    const old = store.get('note', '');
    notes = old.trim() ? [{ id: Date.now(), title: '我的第一条备忘', content: old, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false }] : [];
    store.set('notes', notes);
  }
  const query = noteFilter.trim().toLowerCase();
  const filtered = notes.filter(n => !query || `${n.title} ${n.content}`.toLowerCase().includes(query)).sort((a,b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (!filtered.some(n => String(n.id) === String(activeNoteId))) activeNoteId = filtered[0]?.id ?? null;
  const active = notes.find(n => String(n.id) === String(activeNoteId));
  const dateLabel = value => value ? new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
  el.innerHTML = `<div class="memo-toolbar"><input id="noteSearch" type="text" placeholder="搜标题或内容" value="${esc(noteFilter)}"><button class="btn" id="noteAdd">＋ 新建备忘</button></div>
    <div class="memo-layout"><aside class="memo-list">${filtered.length ? filtered.map(n => `<button class="memo-item ${String(n.id) === String(activeNoteId) ? 'selected' : ''}" data-note="${esc(n.id)}"><div class="memo-item-top"><b>${n.pinned ? '📌 ' : ''}${esc(n.title || '无标题')}</b><small>${dateLabel(n.updatedAt)}</small></div><span>${esc((n.content || '').replace(/\s+/g, ' ').slice(0, 86)) || '空白备忘'}</span></button>`).join('') : `<div class="memo-empty">${query ? '没有找到这条备忘' : '还没有备忘，记下第一个灵感吧 ✨'}</div>`}</aside>
    <section class="memo-editor">${active ? `<div class="memo-edit-head"><span class="sub" id="noteSaved">自动保存到这台设备</span><div class="row"><button class="btn sm ghost" id="notePin">${active.pinned ? '📌 已置顶' : '📍 置顶'}</button><button class="btn sm ghost" id="noteDelete">删除</button></div></div><input type="text" id="noteTitle" maxlength="80" placeholder="给备忘起个标题" value="${esc(active.title || '')}"><textarea id="noteContent" rows="14" maxlength="12000" placeholder="写下想法、计划、灵感……内容会自动保存">${esc(active.content || '')}</textarea><div class="memo-foot"><span>创建于 ${dateLabel(active.createdAt)}</span><span id="noteCount">${(active.content || '').length} / 12000</span></div>` : `<div class="memo-empty memo-empty-large">📝<b>${query ? '换个关键词试试' : '随手记下，之后再整理'}</b><span>备忘只保存在当前设备和浏览器中。</span></div>`}</section></div>`;
  $('#noteSearch').oninput = e => { noteFilter = e.target.value; toolNote(el); const f = $('#noteSearch'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); };
  $('#noteAdd').onclick = () => { const now = new Date().toISOString(); const n = { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, title: '', content: '', createdAt: now, updatedAt: now, pinned: false }; notes.unshift(n); store.set('notes', notes); activeNoteId = n.id; noteFilter = ''; toolNote(el); $('#noteTitle').focus(); };
  $$('[data-note]', el).forEach(b => b.onclick = () => { activeNoteId = b.dataset.note; toolNote(el); });
  if (!active) return;
  let saveTimer;
  const save = () => {
    active.title = $('#noteTitle').value.trimStart(); active.content = $('#noteContent').value; active.updatedAt = new Date().toISOString(); store.set('notes', notes);
    $('#noteCount').textContent = `${active.content.length} / 12000`;
    $('#noteSaved').textContent = '已保存';
    const card = $(`[data-note="${CSS.escape(String(active.id))}"]`, el);
    if (card) { const title = $('b', card); title.textContent = `${active.pinned ? '📌 ' : ''}${active.title || '无标题'}`; $('span', card).textContent = active.content.replace(/\s+/g, ' ').slice(0, 86) || '空白备忘'; }
    clearTimeout(saveTimer); saveTimer = setTimeout(() => { if ($('#noteSaved')) $('#noteSaved').textContent = '自动保存到这台设备'; }, 1300);
  };
  $('#noteTitle').oninput = save; $('#noteContent').oninput = save;
  $('#notePin').onclick = () => { active.pinned = !active.pinned; store.set('notes', notes); toolNote(el); };
  $('#noteDelete').onclick = () => { if (!confirm('删除这条备忘？')) return; store.set('notes', notes.filter(n => String(n.id) !== String(active.id))); activeNoteId = null; toolNote(el); };
}
function toolCalc(el) {
  const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];
  el.innerHTML = `<div class="card" style="max-width:320px;margin-bottom:14px;text-align:right"><div class="sub" id="ch" style="min-height:1.5em"></div><div style="font-size:34px;font-weight:900;overflow:auto" id="cd">0</div></div><div class="calc">${keys.map(k => `<button class="btn ${k === '=' ? 'coral' : /[÷×−+]/.test(k) ? '' : 'ghost'}">${k}</button>`).join('')}</div>`;
  let ex = '';
  $$('.calc .btn', el).forEach(b => b.onclick = () => {
    const k = b.textContent;
    if (k === 'C') ex = ''; else if (k === '⌫') ex = ex.slice(0, -1);
    else if (k === '=') { try { const f = ex.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'); if (/^[\d+\-*/.() ]+$/.test(f)) { const r = Function('"use strict";return(' + f + ')')(); $('#ch', el).textContent = ex + ' ='; ex = String(+r.toFixed(10)); } } catch { ex = ''; toast('算式有误'); } }
    else ex += k;
    $('#cd', el).textContent = ex || '0';
  });
}
let pomo = { end: 0, timer: null, mins: 25, left: 25 * 60 };
function toolPomo(el) {
  el.innerHTML = `<div class="card" style="max-width:420px"><div class="cd" id="pc"></div><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="ps">开始</button><button class="btn ghost" id="pr">重置</button></div>
    <div class="row" style="justify-content:center;margin-top:12px">${[15, 25, 45].map(m => `<button class="pill ${pomo.mins === m ? 'on' : ''}" data-m="${m}">${m} 分钟</button>`).join('')}</div><p class="sub" style="text-align:center;margin-top:10px">专注完成一个番茄 +20 积分</p></div>`;
  const show = () => { const l = pomo.timer ? Math.max(0, Math.round((pomo.end - Date.now()) / 1000)) : pomo.left; const e = $('#pc'); if (e) e.textContent = String(l / 60 | 0).padStart(2, '0') + ':' + String(l % 60).padStart(2, '0'); return l; };
  show();
  const tickp = () => { if (show() <= 0) { clearInterval(pomo.timer); pomo.timer = null; pomo.left = pomo.mins * 60; const s = stats(); s.pomos++; store.set('stats', s); addPoints(20, '专注完成'); try { new Notification('Privacy', { body: '番茄钟结束，休息一下吧 🍅' }); } catch {} const b = $('#ps'); if (b) b.textContent = '开始'; show(); } };
  if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = setInterval(tickp, 500); $('#ps').textContent = '暂停'; }
  $('#ps').onclick = () => {
    if (pomo.timer) { pomo.left = Math.round((pomo.end - Date.now()) / 1000); clearInterval(pomo.timer); pomo.timer = null; $('#ps').textContent = '继续'; }
    else { pomo.end = Date.now() + pomo.left * 1000; pomo.timer = setInterval(tickp, 500); $('#ps').textContent = '暂停'; try { Notification.requestPermission(); } catch {} }
  };
  $('#pr').onclick = () => { clearInterval(pomo.timer); pomo.timer = null; pomo.left = pomo.mins * 60; toolPomo(el); };
  $$('[data-m]', el).forEach(b => b.onclick = () => { clearInterval(pomo.timer); pomo.timer = null; pomo.mins = +b.dataset.m; pomo.left = pomo.mins * 60; toolPomo(el); });
}

/* ===== 我的 ===== */
function viewMe() {
  const s = stats(), lv = level(s.points), nx = LEVELS.find(l => l[0] > s.points), ach = achievements();
  const visits = store.get('visits', []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const openCount = visits.reduce((sum, v) => sum + (v.count || 0), 0);
  $('#main').innerHTML = `<div class="wrap"><div class="row"><span class="av" style="width:64px;height:64px;font-size:26px">${me ? esc(me.name[0]) : '游'}</span><div><h1>${me ? esc(me.name) : '游客'}</h1><div class="sub">${lv[1]} · ${s.points} 积分${nx ? `（距「${nx[1]}」还差 ${nx[0] - s.points}）` : ''}</div></div></div>
    <h2>每天来看看 · 打开日志</h2><div class="visit-summary"><div class="visit-total"><strong>${openCount}</strong><span>累计打开</span></div><div class="visit-days"><strong>${visits.length}</strong><span>记录天数</span></div><div class="visit-list">${visits.length ? visits.slice(0, 10).map(v => `<div class="visit-row"><span class="visit-dot"></span><b>${v.date === today() ? '今天' : esc(v.date)}</b><span class="sp"></span><span>${v.count} 次打开</span><small>${v.first ? new Date(v.first).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}</small></div>`).join('') : '<div class="sub">从今天开始，帮你记下每次来Privacy的日子。</div>'}</div></div>
    <h2>成就 ${ach.filter(a => a.ok).length}/${ach.length}</h2>
    <div class="badges">${ach.map(a => `<div class="ach ${a.ok ? '' : 'lock'}"><div class="e">${a.e}</div><b>${a.n}</b></div>`).join('')}</div>
    <h2>设置</h2><div class="card">
      <button class="task settings-link" id="openSettings"><span class="sp">应用设置</span><span class="sub">语言、通知、隐私与安全</span><b>›</b></button>
      <div class="task"><span class="sp">安装到桌面 / 手机主屏幕</span><span class="sub">浏览器菜单 → 安装「Privacy」</span></div>
      <div class="task"><span class="sp">清除聊天记录（小伴）</span><button class="btn sm ghost" id="clr">清除</button></div>
      <div class="task"><span class="sp">${me ? '退出登录' : '登录 / 注册，解锁好友聊天和排行榜'}</span><button class="btn sm" id="lo">${me ? '退出' : '登录'}</button></div></div>
    <p class="sub" style="margin-top:20px">Privacy v2.3.2 · 隐私优先的聊天空间</p></div>`;
  $('#clr').onclick = () => { store.set('aihist', [AI_HELLO]); toast('已清除'); };
  $('#openSettings').onclick = viewSettings;
  $('#lo').onclick = () => { if (me) { localStorage.removeItem('qb_token'); token = ''; me = null; if (es) es.close(); go('home'); showAuth(); } else showAuth(); };
}
function clearLocalAccountData(name) { const prefix='qb_'+name+'_'; for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith(prefix))localStorage.removeItem(k);} }

const LANGS = [['zh-CN','简体中文'],['en','English'],['ja','日本語'],['de','Deutsch'],['fr','Français'],['es','Español'],['ko','한국어']];
const NAV_I18N = { 'zh-CN':['今天','聊天','游戏','工具','我的'],en:['Today','Chat','Games','Tools','Profile'],ja:['今日','チャット','ゲーム','ツール','マイページ'],de:['Heute','Chat','Spiele','Tools','Profil'],fr:["Aujourd’hui",'Chat','Jeux','Outils','Profil'],es:['Hoy','Chat','Juegos','Herramientas','Perfil'],ko:['오늘','채팅','게임','도구','내 정보'] };
function applyLanguage(lang) { const labels=NAV_I18N[lang]||NAV_I18N['zh-CN']; $$('#nav button').forEach((b,i)=>{const s=$('span',b);if(s)s.textContent=labels[i]}); document.documentElement.lang=lang||'zh-CN'; }
async function viewSettings() {
  const main = $('#main');
  main.innerHTML = '<div class="wrap"><p class="sub">正在读取设置…</p></div>';
  if (me) { try { accountSettings = (await api('/settings')).settings; } catch (e) { toast(e.message); return viewMe(); } }
  accountSettings = accountSettings || store.get('settings', {language:'zh-CN',notifications:{enabled:true,messages:true,security:true,preview:'name',sound:true},security:{autoDeleteOnFailedLogin:false,failedLoginLimit:6}});
  const s = accountSettings, nt = s.notifications, sec = s.security;
  main.innerHTML = `<div class="wrap settings-page"><div class="row"><button class="btn sm ghost" id="settingsBack">← 返回</button><div><h1>设置</h1><p class="sub">控制你的 Privacy 使用体验</p></div></div>
    <h2>语言</h2><div class="card settings-card"><label class="setting-row"><span><b>界面语言</b><small>选择常用语言</small></span><select id="setLang">${LANGS.map(([v,n])=>`<option value="${v}" ${s.language===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
    <h2>通知</h2><div class="card settings-card">
      ${settingToggle('notifyEnabled','应用通知',nt.enabled,'接收 Privacy 的消息和提醒')}
      ${settingToggle('notifyMessages','新消息',nt.messages,'收到好友私信时提醒')}
      ${settingToggle('notifySecurity','好友与安全提醒',nt.security,'好友动态及账号相关提醒')}
      <label class="setting-row"><span><b>通知预览</b><small>锁屏或后台时显示的内容</small></span><select id="notifyPreview"><option value="all" ${nt.preview==='all'?'selected':''}>名称和消息</option><option value="name" ${nt.preview==='name'?'selected':''}>只显示名称</option><option value="none" ${nt.preview==='none'?'selected':''}>隐藏内容</option></select></label>
      ${settingToggle('notifySound','提示音',nt.sound,'允许浏览器通知播放提示音')}
      <button class="btn sm ghost" id="enableNotifications">开启设备通知</button><p class="sub">设备通知还需要在浏览器或手机系统设置中允许 Privacy。</p>
    </div>
    <h2>外观</h2><div class="card settings-card"><label class="setting-row"><span><b>聊天背景</b><small>选择低干扰的聊天氛围</small></span><select id="chatSkin"><option value="paper">暖纸黄</option><option value="cream">纯净奶油白</option><option value="pixel">细腻像素点</option></select></label></div>
    <h2>隐私与安全</h2><div class="card settings-card">
      ${me ? settingToggle('autoDelete','输错密码后自动删除账号',sec.autoDeleteOnFailedLogin,'达到你设定的次数后，账号及关联聊天、好友和记录将永久删除。') : '<p class="sub">登录后可配置账号安全选项。</p>'}
      ${me ? `<label class="setting-row"><span><b>密码错误次数</b><small>可设置 3 到 20 次</small></span><input id="failedLimit" type="number" min="3" max="20" value="${Number(sec.failedLoginLimit)||6}" ${sec.autoDeleteOnFailedLogin?'':'disabled'}></label>
      <p class="settings-danger">此选项开启后，知道你昵称的人可能故意输错密码触发删除。开启或关闭时都需要输入当前密码确认。</p>` : ''}
      <button class="btn" id="saveSettings">保存设置</button>
    </div>
    ${me ? `<h2>账号与联系方式</h2><div class="card settings-card"><p>已登录：<b>${esc(me.name)}</b></p><p class="sub">绑定邮箱：${esc(me.email||'未绑定')}　·　手机号：${esc(me.phone||'未绑定')}</p><input type="email" id="bindEmail" placeholder="绑定或更换邮箱"><div class="otp-row"><input type="text" id="bindEmailCode" placeholder="邮箱验证码" inputmode="numeric" maxlength="6"><button class="btn sm ghost" id="sendBindEmail">获取邮箱码</button></div><input type="tel" id="bindPhone" placeholder="绑定或更换手机号，含国家区号"><div class="otp-row"><input type="text" id="bindPhoneCode" placeholder="短信验证码" inputmode="numeric" maxlength="6"><button class="btn sm ghost" id="sendBindPhone">获取短信码</button></div><button class="btn" id="saveContacts">保存验证通过的联系方式</button><hr><button class="btn coral" id="deleteAccount">注销并删除账号</button><p class="settings-danger">注销会删除账号及关联数据，且无法撤销。</p></div>` : ''}
    <p class="sub settings-foot">通知内容预览仅影响设备提醒；聊天内容仍按当前服务端存储方式保存。</p></div>`;
  $('#settingsBack').onclick = viewMe;
  const savedSkin=store.get('chatSkin','paper');
  $('#chatSkin').value=['paper','cream','pixel'].includes(savedSkin)?savedSkin:'paper';
  document.body.dataset.chatSkin=$('#chatSkin').value;
  $('#chatSkin').onchange = () => { store.set('chatSkin',$('#chatSkin').value); document.body.dataset.chatSkin=$('#chatSkin').value; };
  if ($('#autoDelete')) $('#autoDelete').onchange = () => { $('#failedLimit').disabled = !$('#autoDelete').checked; };
  $('#enableNotifications').onclick = async () => { if (!('Notification' in window)) return toast('此浏览器不支持系统通知'); const p = await Notification.requestPermission(); toast(p === 'granted' ? '设备通知已开启' : '请在浏览器设置中允许通知'); };
  $('#saveSettings').onclick = saveSettings;
  if ($('#deleteAccount')) $('#deleteAccount').onclick = async () => { const pass = prompt('输入当前密码以确认永久删除账号：'); if (pass === null) return; if (!confirm('确定删除账号及其关联数据？此操作无法撤销。')) return; try { const oldName=me.name; await api('/account/delete',{pass}); clearLocalAccountData(oldName); localStorage.removeItem('qb_token'); localStorage.removeItem('qb_last_user'); token='';me=null;accountSettings=null;if(es)es.close();toast('账号已删除');go('home'); } catch(e){toast(e.message);} };
  if ($('#saveContacts')) {
    $('#sendBindEmail').onclick=async()=>{try{await api('/otp/send',{purpose:'bind',channel:'email',address:$('#bindEmail').value.trim()});toast('邮箱验证码已发送');}catch(e){toast(e.message);}};
    $('#sendBindPhone').onclick=async()=>{try{await api('/otp/send',{purpose:'bind',channel:'phone',address:$('#bindPhone').value.trim()});toast('短信验证码已发送');}catch(e){toast(e.message);}};
    $('#saveContacts').onclick=async()=>{try{const email=$('#bindEmail').value.trim().toLowerCase(),phone=$('#bindPhone').value.trim();if(email){await api('/otp/verify',{purpose:'bind',channel:'email',address:email,code:$('#bindEmailCode').value.trim()});await api('/contact',{channel:'email',address:email});}if(phone){await api('/otp/verify',{purpose:'bind',channel:'phone',address:phone,code:$('#bindPhoneCode').value.trim()});await api('/contact',{channel:'phone',address:phone});}if(!email&&!phone)return toast('请至少填写一个新联系方式');me=(await api('/me')).me;toast('联系方式已更新');viewSettings();}catch(e){toast(e.message);}};
  }
}
function settingToggle(id, label, checked, help) { return `<label class="setting-row"><span><b>${label}</b><small>${help}</small></span><input id="${id}" type="checkbox" ${checked?'checked':''}></label>`; }
async function saveSettings() {
  const next = { language: $('#setLang').value, notifications: { enabled: $('#notifyEnabled').checked, messages: $('#notifyMessages').checked, security: $('#notifySecurity').checked, preview: $('#notifyPreview').value, sound: $('#notifySound').checked }, security: { autoDeleteOnFailedLogin: $('#autoDelete')?.checked || false, failedLoginLimit: Math.max(3, Math.min(20, Number($('#failedLimit')?.value) || Number(accountSettings.security.failedLoginLimit) || 6)) } };
  let pass;
  if (next.security.autoDeleteOnFailedLogin !== !!accountSettings.security.autoDeleteOnFailedLogin) { pass = prompt('请再次输入当前密码确认更改自动删除功能：'); if (pass === null) return; }
  try { if (me) accountSettings = (await api('/settings', Object.assign(next, {pass}))).settings; else { accountSettings = next; store.set('settings', next); }
    applyLanguage(next.language); document.body.dataset.chatSkin = store.get('chatSkin','paper'); toast('设置已保存'); viewSettings();
  } catch(e) { toast(e.message); }
}

/* ===== 登录 ===== */
function showAuth() {
  if (STANDALONE) return toast('好友聊天需要联网版，单文件版暂不支持');
  const a = $('#auth'); a.hidden = false; let mode = 'login', verifiedEmail = '', verifiedPhone = '', recoveryVerified = false;
  const paint = () => {
    const registerFields = mode === 'reg' ? `<div class="auth-intro"><b>以隐私为先</b><p>邮箱和手机号用于验证与找回密码，不会展示在好友资料中；验证码由邮件和短信服务商发送。当前版本聊天内容会保存在应用服务器，请勿发送高度敏感信息。</p></div>
      <input type="email" id="authEmail" placeholder="邮箱地址" autocomplete="email"><div class="otp-row"><input type="text" id="emailCode" placeholder="邮箱验证码" inputmode="numeric" maxlength="6"><button class="btn sm ghost" id="sendEmail">获取邮箱码</button></div>
      <input type="tel" id="authPhone" placeholder="手机号，含国家区号，例如 +8613800138000" autocomplete="tel"><div class="otp-row"><input type="text" id="phoneCode" placeholder="短信验证码" inputmode="numeric" maxlength="6"><button class="btn sm ghost" id="sendPhone">获取短信码</button></div>` : '';
    const recoveryFields = mode === 'recover' ? `<input type="email" id="recoverAddress" placeholder="填写注册时绑定的邮箱或手机号"><div class="row"><button class="pill on" id="recEmail">邮箱</button><button class="pill" id="recPhone">手机号</button></div><div class="otp-row"><input type="text" id="recoverCode" placeholder="验证码" inputmode="numeric" maxlength="6"><button class="btn sm ghost" id="sendRecover">获取验证码</button></div><input type="password" id="newPass" placeholder="新密码（至少 8 位）" autocomplete="new-password" minlength="8">` : '';
    a.innerHTML = `<div class="box"><img src="/logo.svg" alt="Privacy"><h1>Privacy</h1><p class="sub">聊天、AI 助手、小游戏、日常工具，一个就够</p>
      <div class="row" style="justify-content:center"><button class="pill ${mode === 'login' ? 'on' : ''}" data-m="login">登录</button><button class="pill ${mode === 'reg' ? 'on' : ''}" data-m="reg">注册</button></div>
      <input type="text" id="un" placeholder="昵称（好友通过它找到你）" maxlength="12" autocomplete="username" value="${esc(localStorage.getItem('qb_last_user') || '')}">
      ${mode !== 'recover' ? `<input type="password" id="pw" placeholder="${mode==='login'?'密码':'新密码（至少 8 位）'}" autocomplete="${mode==='login'?'current-password':'new-password'}" ${mode==='reg'?'minlength="8"':''}>${registerFields}` : recoveryFields}
      <div class="err" id="er"></div><button class="btn" id="go">${mode === 'login' ? '登录' : mode==='reg' ? '验证并注册' : '重置密码'}</button>
      ${mode==='login' ? '<button class="btn ghost" id="forgot">忘记密码？</button>' : ''}<button class="btn ghost" id="sk">先逛逛（游客）</button></div>`;
    $$('[data-m]', a).forEach(b => b.onclick = () => { mode = b.dataset.m; paint(); });
    const status = t => { const e=$('#er'); if(e)e.textContent=t; };
    if (mode === 'reg') {
      $('#sendEmail').onclick = async () => { const address=$('#authEmail').value.trim().toLowerCase(); try { await api('/otp/send',{purpose:'register',channel:'email',address}); status('邮箱验证码已发送，请查收邮件'); } catch(e){status(e.message);} };
      $('#sendPhone').onclick = async () => { const address=$('#authPhone').value.trim(); try { await api('/otp/send',{purpose:'register',channel:'phone',address}); status('短信验证码已发送'); } catch(e){status(e.message);} };
    }
    if (mode === 'recover') {
      let channel='email';
      $('#recEmail').onclick=()=>{channel='email';$('#recEmail').classList.add('on');$('#recPhone').classList.remove('on');};
      $('#recPhone').onclick=()=>{channel='phone';$('#recPhone').classList.add('on');$('#recEmail').classList.remove('on');};
      $('#sendRecover').onclick=async()=>{const address=$('#recoverAddress').value.trim();try{await api('/otp/send',{purpose:'recover',channel,address,name:$('#un').value.trim()});status('如果账号和联系方式匹配，验证码已发送');}catch(e){status(e.message);}};
    }
    const submit = async () => {
      try {
        const name=$('#un').value.trim();
        if(mode==='recover') {
          const channel=$('#recPhone').classList.contains('on')?'phone':'email', address=$('#recoverAddress').value.trim(), code=$('#recoverCode').value.trim(), pass=$('#newPass').value;
          if(!recoveryVerified){await api('/otp/verify',{purpose:'recover',channel,address,code});recoveryVerified=true;}
          await api('/password/reset',{name,channel,address,pass}); mode='login';paint();status('密码已重置，请登录');return;
        }
        const pass=$('#pw').value;
        let r;
        if(mode==='login') r=await api('/login',{name,pass});
        else {
          const email=$('#authEmail').value.trim().toLowerCase(),phone=$('#authPhone').value.trim();
          if(verifiedEmail!==email){await api('/otp/verify',{purpose:'register',channel:'email',address:email,code:$('#emailCode').value.trim()});verifiedEmail=email;}
          if(verifiedPhone!==phone){await api('/otp/verify',{purpose:'register',channel:'phone',address:phone,code:$('#phoneCode').value.trim()});verifiedPhone=phone;}
          r=await api('/register',{name,pass,email,phone});
        }
        token = r.token; me = (await api('/me')).me; accountSettings = (await api('/settings')).settings; applyLanguage(accountSettings.language); localStorage.setItem('qb_token', token); localStorage.setItem('qb_last_user', me.name); a.hidden = true; connectStream(); go('home');
      } catch (e) { if(e.status===410){clearLocalAccountData($('#un').value.trim());localStorage.removeItem('qb_last_user');} status(e.message); }
    };
    $('#go').onclick = submit; if($('#pw')) $('#pw').onkeydown = e => { if (e.key === 'Enter') submit(); };
    if($('#forgot')) $('#forgot').onclick=()=>{mode='recover';paint();};
    $('#sk').onclick = () => { a.hidden = true; };
  };
  paint();
}

/* ===== 启动 ===== */
$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.tab));
(async function init() {
  let sessionExpired = false;
  if (token) { try { me = (await api('/me')).me; accountSettings = (await api('/settings')).settings; if(accountSettings.language) applyLanguage(accountSettings.language); connectStream(); } catch { token = ''; localStorage.removeItem('qb_token'); sessionExpired = true; } }
  document.body.dataset.chatSkin = store.get('chatSkin','paper');
  if(!me) applyLanguage(store.get('settings',{language:'zh-CN'}).language||'zh-CN');
  recordVisit();
  render();
  if (!STANDALONE && sessionExpired) { showAuth(); $('#er').textContent = '登录状态失效了，请先用原昵称和密码登录。'; }
  else if (!STANDALONE && !me && !localStorage.getItem('qb_seen')) { localStorage.setItem('qb_seen', '1'); showAuth(); }
  if (!STANDALONE && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  window.__qbReady = true; window.dispatchEvent(new Event('qb-ready'));
})();
