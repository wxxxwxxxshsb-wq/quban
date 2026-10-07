// 趣伴 QuBan 1.0 — 后端服务（零依赖：只用 Node 内置模块）
// 运行：node server.js  → 打开 http://localhost:3000
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------- 读取 .env（可选）----------
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {}

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
// Render ephemeral storage is cleared during redeploys. Set DATA_DIR to a mounted
// persistent disk (for example /var/data) to keep accounts and messages.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// ---------- 简易数据库（JSON 文件）----------
let db = { users: {}, sessions: {}, messages: [], scores: {}, games: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch {}
db.games = db.games || {};
let saveTimer = null;
function flushSave() {
  clearTimeout(saveTimer);
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db));
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) { console.error('Database save failed:', e.message); }
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 150); }
const shutdown = () => { flushSave(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ---------- 工具函数 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { r({}); } });
});
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const authUser = (req, url) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '') || url.searchParams.get('token');
  const name = t && db.sessions[t];
  return name && db.users[name] ? db.users[name] : null;
};
const publicGame = g => ({ id: g.id, game: g.game, players: g.players, board: g.board, turn: g.turn, status: g.status, winner: g.winner, moves: g.moves, created: g.created });
function fiveInARow(board, index, mark) {
  const x = index % 15, y = Math.floor(index / 15);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let n = 1;
    for (const sign of [1, -1]) { let i = 1; while (true) { const nx = x + dx * i * sign, ny = y + dy * i * sign; if (nx < 0 || ny < 0 || nx >= 15 || ny >= 15 || board[ny * 15 + nx] !== mark) break; n++; i++; } }
    if (n >= 5) return true;
  }
  return false;
}

// ---------- 实时推送（SSE）----------
const streams = new Map(); // name -> Set(res)
const online = n => streams.has(n) && streams.get(n).size > 0;
function push(name, event, data) {
  (streams.get(name) || []).forEach(res => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

// ---------- AI 助手「小伴」----------
const SYSTEM = `你是「小伴」，趣伴 App 里的 AI 助手。你聪明、靠谱、有点幽默，像一个什么都懂的好朋友。
原则：
1. 先给结论，再解释；能三句话说清楚就不写三段。
2. 遇到计算、推理、写作、编程、学习、生活决策等问题，认真思考后给出具体可执行的答案。
3. 不确定的事直接说不确定，不编造。
4. 用户使用什么语言就用什么语言回答，默认简体中文。
5. 用户的待办和日期会作为背景信息提供，相关时可以主动帮他安排。`;

function normalize(msgs) {
  const out = [];
  for (const m of (msgs || []).slice(-20)) {
    if (!m || !m.content) continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content).slice(0, 4000);
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += '\n' + content;
    else out.push({ role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function askOllama(messages, context) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
      stream: false,
      messages: [{ role: 'system', content: SYSTEM + (context ? '\n\n【背景】' + String(context).slice(0, 1500) : '') }, ...messages]
    });
    const r = http.request({
      hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, resp => {
      let s = '';
      resp.on('data', c => s += c);
      resp.on('end', () => {
        try {
          const j = JSON.parse(s);
          if (j.error) return reject(new Error(j.error));
          resolve((j.message && j.message.content) || '');
        } catch (e) { reject(e); }
      });
    });
    r.on('error', reject);
    r.setTimeout(120000, () => r.destroy(new Error('timeout')));
    r.end(payload);
  });
}

function askGitHub(messages, context) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: process.env.GH_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 1000,
      messages: [{ role: 'system', content: SYSTEM + (context ? '\n\n【背景】' + String(context).slice(0, 1500) : '') }, ...messages]
    });
    const r = https.request({
      hostname: 'models.github.ai', path: '/inference/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + process.env.GH_MODELS_TOKEN, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Length': Buffer.byteLength(payload) }
    }, resp => {
      let s = '';
      resp.on('data', c => s += c);
      resp.on('end', () => {
        try {
          if (resp.statusCode === 429) return reject(new Error('免费额度暂时用完了，稍后再试'));
          const j = JSON.parse(s);
          if (j.error) return reject(new Error(j.error.message || j.error));
          resolve(j.choices[0].message.content);
        } catch (e) { reject(new Error('GitHub 返回异常（状态 ' + resp.statusCode + '）')); }
      });
    });
    r.on('error', reject);
    r.setTimeout(60000, () => r.destroy(new Error('timeout')));
    r.end(payload);
  });
}

function askClaude(messages, context) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: process.env.AI_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM + (context ? '\n\n【背景】' + String(context).slice(0, 1500) : ''),
      messages
    });
    const r = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(payload) }
    }, resp => {
      let s = '';
      resp.on('data', c => s += c);
      resp.on('end', () => {
        try {
          const j = JSON.parse(s);
          if (j.error) return reject(new Error(j.error.message));
          resolve(j.content.filter(b => b.type === 'text').map(b => b.text).join('\n'));
        } catch (e) { reject(e); }
      });
    });
    r.on('error', reject);
    r.setTimeout(60000, () => r.destroy(new Error('timeout')));
    r.end(payload);
  });
}

// ---------- API 路由 ----------
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/register' && m === 'POST') {
    const { name, pass } = await readBody(req);
    if (!/^[\u4e00-\u9fa5\w]{2,12}$/.test(name || '')) return send(res, 400, { error: '昵称需要 2-12 个字（中文、字母、数字、下划线）' });
    if (!pass || pass.length < 4) return send(res, 400, { error: '密码至少 4 位' });
    if (db.users[name]) return send(res, 400, { error: '这个昵称已经被用了，换一个吧' });
    const salt = crypto.randomBytes(8).toString('hex');
    db.users[name] = { name, salt, pw: hash(pass, salt), friends: [], created: Date.now() };
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = name; save();
    return send(res, 200, { token, me: { name } });
  }
  if (p === '/api/login' && m === 'POST') {
    const { name, pass } = await readBody(req);
    const u = db.users[name];
    if (!u || hash(pass || '', u.salt) !== u.pw) return send(res, 400, { error: '昵称或密码不对' });
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = name; save();
    return send(res, 200, { token, me: { name } });
  }

  // AI 不强制登录（游客也能问）
  if (p === '/api/ai' && m === 'POST') {
    const { messages, context } = await readBody(req);
    const msgs = normalize(messages);
    if (!msgs.length) return send(res, 400, { error: '消息为空' });
    const cloud = process.env.ANTHROPIC_API_KEY || process.env.GH_MODELS_TOKEN;
    if (cloud) {
      const u = authUser(req, url);
      if (!u) return send(res, 401, { error: '登录后才能问小伴（防止被人刷爆额度）' });
      const day = new Date().toISOString().slice(0, 10), lim = +process.env.AI_DAILY_LIMIT || 50;
      u.ai = u.ai && u.ai.day === day ? u.ai : { day, n: 0 };
      if (u.ai.n >= lim) return send(res, 200, { text: `今天的 ${lim} 次提问用完了，明天再来 🙂`, mode: 'limit' });
      u.ai.n++; save();
    }
    const SETUP = process.env.RENDER ? '小伴暂时还没有接上 AI，请联系管理员配置。' : '小伴还没有接上 AI。最简单的办法（免费、不用密钥）：\n1. 安装 Ollama：ollama.com\n2. 打开终端运行：ollama pull ' + (process.env.OLLAMA_MODEL || 'qwen2.5:3b') + '\n3. 回到这里再问我一次就行，不用重启。';
    if (process.env.ANTHROPIC_API_KEY) {
      try { return send(res, 200, { text: await askClaude(msgs, context), mode: 'claude' }); }
      catch (e) { return send(res, 200, { text: '小伴连不上 Claude（' + e.message + '）。检查网络和 API 密钥。', mode: 'error' }); }
    }
    if (process.env.GH_MODELS_TOKEN) {
      try { return send(res, 200, { text: await askGitHub(msgs, context), mode: 'github' }); }
      catch (e) { return send(res, 200, { text: '小伴暂时答不上来：' + e.message, mode: 'error' }); }
    }
    try { return send(res, 200, { text: await askOllama(msgs, context), mode: 'ollama' }); }
    catch (e) {
      if (e.code === 'ECONNREFUSED' || /not found/i.test(e.message)) return send(res, 200, { text: SETUP, mode: 'nosetup' });
      return send(res, 200, { text: '本地 AI 出错了：' + e.message, mode: 'error' });
    }
  }

  if (p === '/api/rank' && m === 'GET') {
    const g = url.searchParams.get('game');
    const rows = Object.entries(db.scores[g] || {}).map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score).slice(0, 10);
    return send(res, 200, { rows });
  }

  const me = authUser(req, url);
  if (!me) return send(res, 401, { error: '请先登录' });

  if (p === '/api/me') return send(res, 200, { me: { name: me.name } });

  if (p === '/api/games/invites' && m === 'GET') {
    const invites = Object.values(db.games).filter(g => g.game === 'gomoku-online' && g.status === 'pending' && g.players[1] === me.name).map(publicGame);
    return send(res, 200, { invites });
  }
  if (p === '/api/games/invite' && m === 'POST') {
    const { friend } = await readBody(req);
    if (!friend || friend === me.name || !me.friends.includes(friend) || !db.users[friend]) return send(res, 400, { error: '只能邀请已添加的好友' });
    const id = crypto.randomBytes(12).toString('hex');
    const game = { id, game: 'gomoku-online', players: [me.name, friend], board: Array(225).fill(0), turn: me.name, status: 'pending', winner: null, moves: 0, created: Date.now() };
    db.games[id] = game; save(); push(friend, 'game-invite', publicGame(game));
    return send(res, 200, { game: publicGame(game) });
  }
  const gameMatch = p.match(/^\/api\/games\/([a-f0-9]+)(?:\/(accept|decline|move))?$/);
  if (gameMatch) {
    const game = db.games[gameMatch[1]], action = gameMatch[2];
    if (!game || !game.players.includes(me.name)) return send(res, 404, { error: '找不到这场对局' });
    if (!action && m === 'GET') return send(res, 200, { game: publicGame(game) });
    if (action === 'accept' && m === 'POST') {
      if (game.players[1] !== me.name || game.status !== 'pending') return send(res, 400, { error: '这场邀请已无法接受' });
      game.status = 'active'; save(); game.players.forEach(n => push(n, 'game-update', publicGame(game)));
      return send(res, 200, { game: publicGame(game) });
    }
    if (action === 'decline' && m === 'POST') {
      if (game.status !== 'pending') return send(res, 400, { error: '这场邀请已处理' });
      game.status = 'declined'; save(); game.players.forEach(n => push(n, 'game-update', publicGame(game)));
      return send(res, 200, { game: publicGame(game) });
    }
    if (action === 'move' && m === 'POST') {
      if (game.status !== 'active') return send(res, 400, { error: '对局还没有开始或已经结束' });
      if (game.turn !== me.name) return send(res, 403, { error: '还没轮到你' });
      const { index } = await readBody(req);
      if (!Number.isInteger(index) || index < 0 || index >= 225 || game.board[index]) return send(res, 400, { error: '这个位置不能落子' });
      const mark = game.players[0] === me.name ? 1 : 2;
      game.board[index] = mark; game.moves++;
      if (fiveInARow(game.board, index, mark)) { game.status = 'finished'; game.winner = me.name; }
      else if (game.moves === 225) { game.status = 'finished'; game.winner = null; }
      else game.turn = game.players.find(n => n !== me.name);
      save(); game.players.forEach(n => push(n, 'game-update', publicGame(game)));
      return send(res, 200, { game: publicGame(game) });
    }
  }

  if (p === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 3000\n\n');
    if (!streams.has(me.name)) streams.set(me.name, new Set());
    streams.get(me.name).add(res);
    const hb = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(hb); streams.get(me.name).delete(res); });
    return;
  }

  if (p === '/api/friends' && m === 'GET')
    return send(res, 200, { friends: me.friends.map(n => ({ name: n, online: online(n) })) });

  if (p === '/api/friends/add' && m === 'POST') {
    const { name } = await readBody(req);
    const f = db.users[name];
    if (!f) return send(res, 404, { error: '没找到这个昵称，让朋友先注册吧' });
    if (f.name === me.name) return send(res, 400, { error: '不能加自己为好友' });
    if (me.friends.includes(name)) return send(res, 400, { error: '你们已经是好友了' });
    me.friends.push(name); f.friends.push(me.name); save();
    push(name, 'friend', { name: me.name });
    return send(res, 200, { ok: true });
  }

  if (p === '/api/messages' && m === 'GET') {
    const w = url.searchParams.get('with');
    const list = db.messages.filter(x => (x.from === me.name && x.to === w) || (x.from === w && x.to === me.name)).slice(-100);
    return send(res, 200, { messages: list });
  }
  if (p === '/api/messages' && m === 'POST') {
    const { to, text } = await readBody(req);
    if (!me.friends.includes(to)) return send(res, 400, { error: '你们还不是好友' });
    const t = String(text || '').trim().slice(0, 1000);
    if (!t) return send(res, 400, { error: '消息为空' });
    const msg = { from: me.name, to, text: t, t: Date.now() };
    db.messages.push(msg); if (db.messages.length > 20000) db.messages.splice(0, 5000); save();
    push(to, 'msg', msg);
    return send(res, 200, { message: msg });
  }

  if (p === '/api/score' && m === 'POST') {
    const { game, score } = await readBody(req);
    if (!game || typeof score !== 'number' || !isFinite(score)) return send(res, 400, { error: '参数错误' });
    db.scores[game] = db.scores[game] || {};
    if ((db.scores[game][me.name] || 0) < score) { db.scores[game][me.name] = Math.round(score); save(); }
    return send(res, 200, { best: db.scores[game][me.name] });
  }

  send(res, 404, { error: 'not found' });
}

// ---------- 静态文件 ----------
function serveStatic(req, res, url) {
  let f = decodeURIComponent(url.pathname);
  if (f === '/') f = '/index.html';
  const full = path.normalize(path.join(PUB, f));
  if (!full.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: '服务器出错了' }); }
}).listen(PORT, () => {
  console.log(`\n  趣伴 QuBan 已启动 → http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? '  AI 助手：Claude（云端）' : process.env.GH_MODELS_TOKEN ? '  AI 助手：GitHub Models（免费）' : '  AI 助手：本地 Ollama（模型 ' + (process.env.OLLAMA_MODEL || 'qwen2.5:3b') + '）。还没装的话，小伴会在聊天里告诉你怎么装');
  console.log('  手机访问：电脑和手机连同一个 Wi-Fi，用电脑的局域网 IP + 端口打开\n');
});
