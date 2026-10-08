// Privacy — 后端服务（零依赖：只用 Node 内置模块）
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

// ---------- 错误追踪（出问题时 1 分钟内定位）----------
// 每个请求有一个「错误码」(X-Request-Id)，页面报错时会显示它，拿它在日志里一搜就能找到完整原因。
const VERSION = (() => { try { return require('./package.json').version; } catch { return 'unknown'; } })();
const START = Date.now();
const recentErrors = [];
const stat = { req: 0, s4xx: 0, s5xx: 0 };
const checks = [];
let lastSaveError = null;
const ERR_LOG = path.join(DATA_DIR, 'errors.log');
function log(level, msg, extra) {
  const line = JSON.stringify(Object.assign({ t: new Date().toISOString(), level, msg }, extra));
  (level === 'error' ? console.error : console.log)(line);
}
function recordError(src, msg, extra) {
  const e = Object.assign({ t: new Date().toISOString(), src, msg }, extra);
  recentErrors.push(e); if (recentErrors.length > 50) recentErrors.shift();
  log('error', msg, Object.assign({ src }, extra));
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try { if (fs.statSync(ERR_LOG).size > 1e6) fs.renameSync(ERR_LOG, ERR_LOG + '.old'); } catch {}
    fs.appendFileSync(ERR_LOG, JSON.stringify(e) + '\n');
  } catch {}
}
process.on('uncaughtException', e => { recordError('uncaught', e.message, { stack: e.stack }); flushSave(); setTimeout(() => process.exit(1), 200); });
process.on('unhandledRejection', r => recordError('rejection', (r && r.message) || String(r), { stack: r && r.stack }));
const cerr = new Map();
function clientErrOk(ip) {
  if (cerr.size > 1000) cerr.clear();
  const now = Date.now(), r = cerr.get(ip) || { n: 0, t: now };
  if (now - r.t > 60000) { r.n = 0; r.t = now; }
  r.n++; cerr.set(ip, r); return r.n <= 20;
}
function diag() {
  let dbWritable = true;
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); const f = path.join(DATA_DIR, '.diag'); fs.writeFileSync(f, '1'); fs.unlinkSync(f); } catch (e) { dbWritable = e.message; }
  return {
    version: VERSION, node: process.version, uptimeSec: Math.round((Date.now() - START) / 1000),
    memoryMB: Math.round(process.memoryUsage().rss / 1048576), dataDir: DATA_DIR, dbWritable,
    users: Object.keys(db.users).length, messages: db.messages.length, onlineUsers: [...streams.keys()].filter(online).length,
    ai: process.env.ANTHROPIC_API_KEY ? 'claude' : process.env.GH_MODELS_TOKEN ? 'github' : 'ollama',
    requests: stat, lastSaveError, startupChecks: checks, recentErrors: recentErrors.slice().reverse()
  };
}
function selfCheck() {
  const add = (level, msg) => { checks.push({ level, msg }); log(level === 'ok' ? 'info' : level, '启动自检：' + msg); };
  if (+process.versions.node.split('.')[0] < 18) add('error', 'Node 版本过低，需要 18 以上');
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); const f = path.join(DATA_DIR, '.write-test'); fs.writeFileSync(f, '1'); fs.unlinkSync(f); add('ok', '数据目录可写：' + DATA_DIR); }
  catch (e) { add('error', '数据目录不可写（' + DATA_DIR + '）：' + e.message); }
  if (process.env.RENDER && !process.env.DATA_DIR) add('warn', '在 Render 上没有设置 DATA_DIR：账号和消息存在临时磁盘，重启或重新部署后会丢失');
  if (process.env.RENDER && !process.env.ANTHROPIC_API_KEY && !process.env.GH_MODELS_TOKEN) add('warn', '没有配置 AI 密钥，小伴无法回答');
  if (!process.env.DIAG_KEY) add('info', '没有设置 DIAG_KEY，/api/diag 诊断接口已关闭');
}

// ---------- 简易数据库（JSON 文件）----------
let db = { users: {}, sessions: {}, messages: [], scores: {}, games: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch {}
db.games = db.games || {};
db.users = db.users || {}; db.sessions = db.sessions || {}; db.messages = db.messages || []; db.scores = db.scores || {};
const otpChallenges = new Map(), otpGrants = new Map(), otpRate = new Map();
let saveTimer = null;
function flushSave() {
  clearTimeout(saveTimer);
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db));
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) { lastSaveError = { t: new Date().toISOString(), msg: e.message }; recordError('db', '数据库保存失败：' + e.message, { stack: e.stack }); }
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 150); }
const shutdown = () => { flushSave(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ---------- 工具函数 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { if (code >= 400 && res._rid) obj.requestId = res._rid; res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch { log('warn', '请求体不是合法 JSON', { id: req._rid, p: req.url }); r({}); } });
});
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const otpKey = (purpose, channel, address) => `${purpose}:${channel}:${String(address).trim().toLowerCase()}`;
function grantOtp(purpose, channel, address) { otpGrants.set(otpKey(purpose, channel, address), Date.now() + 10 * 60 * 1000); }
function hasOtp(purpose, channel, address) { return (otpGrants.get(otpKey(purpose, channel, address)) || 0) > Date.now(); }
function consumeOtp(purpose, channel, address) { const k = otpKey(purpose, channel, address), exp = otpGrants.get(k) || 0; otpGrants.delete(k); return exp > Date.now(); }
function cleanPhone(v) { return String(v || '').replace(/[\s()-]/g, ''); }
async function deliverOtp(channel, address, code) {
  const text = `Privacy 验证码：${code}，10 分钟内有效。请勿告诉任何人。`;
  if (channel === 'email') {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) throw new Error('邮件验证码服务尚未配置（RESEND_API_KEY / RESEND_FROM）');
    const r = await fetch('https://api.resend.com/emails', { method:'POST', headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify({from:process.env.RESEND_FROM,to:[address],subject:'Privacy 验证码',text}) });
    if (!r.ok) throw new Error(`邮件发送失败（${r.status}）`);
    return;
  }
  if (channel === 'phone') {
    throw new Error('手机号验证码请使用 Twilio Verify 流程');
  }
  throw new Error('不支持的验证码方式');
}
async function twilioVerify(address, code, sendCode=false) {
  const { TWILIO_ACCOUNT_SID:sid, TWILIO_AUTH_TOKEN:secret, TWILIO_VERIFY_SERVICE_SID:service }=process.env;
  if(!sid||!secret||!service)throw new Error('短信验证码服务尚未配置（Twilio Verify 环境变量）');
  const auth=Buffer.from(`${sid}:${secret}`).toString('base64'), suffix=sendCode?'Verifications':'VerificationCheck';
  const body=new URLSearchParams(sendCode?{To:address,Channel:'sms'}:{To:address,Code:code});
  const r=await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(service)}/${suffix}`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body});
  const payload=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(sendCode?`短信发送失败（${r.status}）`:`验证码校验失败（${r.status}）`);
  return sendCode ? true : payload.status==='approved';
}
async function otpRoute(req, res, url) {
  const b = await readBody(req), purpose = b.purpose;
  if (!['register','recover','bind'].includes(purpose)) return send(res,400,{error:'验证用途不正确'});
  const channel = b.channel, address = channel === 'phone' ? cleanPhone(b.address) : String(b.address || '').trim().toLowerCase();
  if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return send(res,400,{error:'请输入有效邮箱'});
  if (channel === 'phone' && !/^\+[1-9]\d{7,14}$/.test(address)) return send(res,400,{error:'手机号请包含国家区号，例如 +8613800138000'});
  if (!['email','phone'].includes(channel)) return send(res,400,{error:'请选择邮箱或手机号'});
  const k = otpKey(purpose,channel,address), now = Date.now(), bucket = otpRate.get(k) || {n:0,until:now+3600000};
  if (now > bucket.until) { bucket.n=0; bucket.until=now+3600000; }
  if (bucket.n >= 5) return send(res,429,{error:'该联系方式验证码请求次数已达上限，请稍后再试'});
  if (otpChallenges.get(k)?.sentAt > now - 60000) return send(res,429,{error:'请稍等一分钟后再获取验证码'});
  if (purpose === 'register' && Object.values(db.users).some(u => (channel==='email'?u.email:u.phone) === address)) return send(res,400,{error:'这个联系方式已绑定账号'});
  if (purpose === 'bind') { const me=authUser(req,url); if(!me)return send(res,401,{error:'请先登录'}); if(Object.values(db.users).some(u=>u.name!==me.name&&(channel==='email'?u.email:u.phone)===address))return send(res,400,{error:'这个联系方式已绑定其他账号'}); }
  if (purpose === 'recover') {
    const u = db.users[String(b.name || '')];
    if (!u || (channel==='email'?u.email:u.phone) !== address) return send(res,200,{ok:true,message:'如果账号和联系方式匹配，验证码已发送'});
  }
  bucket.n++; otpRate.set(k,bucket);
  const code = channel==='email'?String(crypto.randomInt(0,1000000)).padStart(6,'0'):'';
  try { if(channel==='phone')await twilioVerify(address,'',true); else await deliverOtp(channel,address,code); }
  catch (e) { recordError('otp-send',e.message,{channel}); return send(res,503,{error:e.message}); }
  otpChallenges.set(k,{salt:crypto.randomBytes(16).toString('hex'),digest:'',provider:channel==='phone'?'twilio':'local',expires:now+10*60000,tries:0,sentAt:now});
  const challenge=otpChallenges.get(k); if(channel==='email')challenge.digest=crypto.createHash('sha256').update(challenge.salt+code).digest('hex');
  return send(res,200,{ok:true,message:'验证码已发送，10 分钟内有效'});
}
const authUser = (req, url) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '') || url.searchParams.get('token');
  const name = t && db.sessions[t];
  if (name && db.users[name]) { req._user = name; return db.users[name]; }
  return null;
};
const defaultSettings = () => ({ language: 'zh-CN', notifications: { enabled: true, messages: true, security: true, preview: 'name', sound: true }, security: { autoDeleteOnFailedLogin: false, failedLoginLimit: 6 } });
function deleteAccount(name) {
  const user = db.users[name]; if (!user) return;
  const live=streams.get(name); if(live){for(const res of live){try{res.write('event: account-deleted\ndata: {}\n\n');res.end();}catch{}}streams.delete(name);}
  for (const friendName of user.friends || []) { const friend = db.users[friendName]; if (friend) friend.friends = (friend.friends || []).filter(n => n !== name); }
  for (const [t, n] of Object.entries(db.sessions)) if (n === name) delete db.sessions[t];
  db.messages = db.messages.filter(m => m.from !== name && m.to !== name);
  for (const scores of Object.values(db.scores)) delete scores[name];
  for (const [id, game] of Object.entries(db.games)) if (game.players && game.players.includes(name)) delete db.games[id];
  delete db.users[name]; save();
}
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
const SYSTEM = `你是「小伴」，Privacy App 里的 AI 助手。你聪明、靠谱、有点幽默，像一个什么都懂的好朋友。
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

  if (p === '/api/health' && m === 'GET') {
    const provider = process.env.ANTHROPIC_API_KEY ? 'claude' : process.env.GH_MODELS_TOKEN ? 'github-models' : process.env.RENDER ? '' : 'ollama';
    return send(res, 200, { ok: true, aiConfigured: !!provider, aiProvider: provider || null });
  }
  if (p === '/api/diag') {
    const k = process.env.DIAG_KEY;
    if (!k || (req.headers['x-diag-key'] || url.searchParams.get('key')) !== k) return send(res, 404, { error: 'not found' });
    return send(res, 200, diag());
  }
  if (p === '/api/client-error' && m === 'POST') {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!clientErrOk(ip)) return send(res, 429, { error: 'too many' });
    const b = await readBody(req), cut = (v, n) => String(v == null ? '' : v).slice(0, n);
    recordError('client', cut(b.msg, 300), { kind: cut(b.kind, 20), page: cut(b.url, 100), rid: cut(b.rid, 20), v: cut(b.v, 20), file: cut(b.src, 80), line: +b.line || 0, stack: cut(b.stack, 1200), ua: cut(req.headers['user-agent'], 160) });
    return send(res, 200, { ok: true });
  }

  if (p === '/api/otp/send' && m === 'POST') return otpRoute(req,res,url);
  if (p === '/api/otp/verify' && m === 'POST') {
    const b=await readBody(req),channel=b.channel,purpose=b.purpose,address=channel==='phone'?cleanPhone(b.address):String(b.address||'').trim().toLowerCase();
    if(!['register','recover','bind'].includes(purpose)||!['email','phone'].includes(channel))return send(res,400,{error:'验证参数不正确'});
    const k=otpKey(purpose,channel,address),challenge=otpChallenges.get(k);
    if(!challenge||challenge.expires<Date.now())return send(res,400,{error:'验证码已过期，请重新获取'});
    if(++challenge.tries>5){otpChallenges.delete(k);return send(res,429,{error:'验证次数过多，请重新获取验证码'});}
    if(challenge.provider==='twilio') { try { if(!await twilioVerify(address,String(b.code||''),false))return send(res,400,{error:'验证码不正确'}); } catch(e){ recordError('otp-check',e.message,{channel}); return send(res,503,{error:e.message}); } }
    else { const digest=crypto.createHash('sha256').update(challenge.salt+String(b.code||'')).digest('hex'); if(digest!==challenge.digest)return send(res,400,{error:'验证码不正确'}); }
    otpChallenges.delete(k); grantOtp(purpose,channel,address); return send(res,200,{ok:true});
  }

  if (p === '/api/register' && m === 'POST') {
    const b=await readBody(req), name=b.name, pass=b.pass, email=String(b.email||'').trim().toLowerCase(), phone=cleanPhone(b.phone);
    if (typeof name !== 'string' || !/^[\u4e00-\u9fa5\w]{2,12}$/.test(name)) return send(res, 400, { error: '昵称需要 2-12 个字（中文、字母、数字、下划线）' });
    if (typeof pass !== 'string' || pass.length < 8) return send(res, 400, { error: '新密码至少 8 位' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+[1-9]\d{7,14}$/.test(phone)) return send(res,400,{error:'请填写有效邮箱和含国家区号的手机号'});
    if (db.users[name]) return send(res, 400, { error: '这个昵称已经被用了，换一个吧' });
    if (Object.values(db.users).some(u => u.email === email || u.phone === phone)) return send(res,400,{error:'邮箱或手机号已绑定其他账号'});
    if (!hasOtp('register','email',email) || !hasOtp('register','phone',phone)) return send(res,403,{error:'请先完成邮箱和手机验证码验证'});
    consumeOtp('register','email',email); consumeOtp('register','phone',phone);
    const salt = crypto.randomBytes(8).toString('hex');
    db.users[name] = { name, email, phone, salt, pw: hash(pass, salt), friends: [], created: Date.now(), settings: defaultSettings() };
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = name; save();
    return send(res, 200, { token, me: { name } });
  }
  if (p === '/api/password/reset' && m === 'POST') {
    const b=await readBody(req), name=String(b.name||''), channel=b.channel, address=channel==='phone'?cleanPhone(b.address):String(b.address||'').trim().toLowerCase(), pass=b.pass, u=db.users[name];
    if(typeof pass!=='string'||pass.length<8)return send(res,400,{error:'新密码至少 8 位'});
    if(!u||!['email','phone'].includes(channel)||(channel==='email'?u.email:u.phone)!==address||!hasOtp('recover',channel,address))return send(res,403,{error:'请先使用绑定的邮箱或手机号完成验证'});
    consumeOtp('recover',channel,address); u.salt=crypto.randomBytes(16).toString('hex'); u.pw=hash(pass,u.salt); u.failedLoginCount=0;
    for(const [t,n] of Object.entries(db.sessions))if(n===name)delete db.sessions[t]; save();
    return send(res,200,{ok:true,message:'密码已重置，请重新登录'});
  }
  if (p === '/api/login' && m === 'POST') {
    const { name, identifier, method, pass } = await readBody(req);
    const loginId = String(identifier || name || '').trim();
    let u = null;
    if (typeof pass === 'string') {
      if (method === 'email') u = Object.values(db.users).find(x => String(x.email || '').toLowerCase() === loginId.toLowerCase());
      else if (method === 'phone') u = Object.values(db.users).find(x => cleanPhone(x.phone) === cleanPhone(loginId));
      else u = db.users[loginId];
    }
    if (!u || hash(pass, u.salt) !== u.pw) {
      if (u) {
        u.settings = Object.assign(defaultSettings(), u.settings || {});
        u.settings.security = Object.assign(defaultSettings().security, u.settings.security || {});
        if (u.settings.security.autoDeleteOnFailedLogin) {
          u.failedLoginCount = (u.failedLoginCount || 0) + 1;
          const limit = Math.max(3, Math.min(20, Number(u.settings.security.failedLoginLimit) || 6));
          if (u.failedLoginCount >= limit) { deleteAccount(u.name); return send(res, 410, { error: `已达到你设置的 ${limit} 次输错上限，账号及关联数据已删除。` }); }
          save();
        }
      }
      return send(res, 400, { error: '昵称或密码不对' });
    }
    u.failedLoginCount = 0;
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = u.name; save();
    return send(res, 200, { token, me: { name: u.name } });
  }

  // Privacy 的 AI 仅对已登录账号开放，游客不能消耗服务额度。
  if (p === '/api/ai' && m === 'POST') {
    const u = authUser(req, url);
    if (!u) return send(res, 401, { error: '请先登录 Privacy 账号，再使用小伴 AI。' });
    const { messages, context } = await readBody(req);
    const msgs = normalize(messages);
    if (!msgs.length) return send(res, 400, { error: '消息为空' });
    const cloud = process.env.ANTHROPIC_API_KEY || process.env.GH_MODELS_TOKEN;
    if (cloud) {
      const day = new Date().toISOString().slice(0, 10), lim = +process.env.AI_DAILY_LIMIT || 50;
      u.ai = u.ai && u.ai.day === day ? u.ai : { day, n: 0 };
      if (u.ai.n >= lim) return send(res, 200, { text: `今天的 ${lim} 次提问用完了，明天再来 🙂`, mode: 'limit' });
      u.ai.n++; save();
    }
    const SETUP = process.env.RENDER ? '小伴暂时还没有接上 AI，请联系管理员配置。' : '小伴还没有接上 AI。最简单的办法（免费、不用密钥）：\n1. 安装 Ollama：ollama.com\n2. 打开终端运行：ollama pull ' + (process.env.OLLAMA_MODEL || 'qwen2.5:3b') + '\n3. 回到这里再问我一次就行，不用重启。';
    if (process.env.RENDER && !cloud) return send(res, 200, { text: '小伴暂时还不能回答：Render 还没有配置 AI 服务密钥。请管理员在 Render → Privacy 服务 → Environment 添加 GH_MODELS_TOKEN 或 ANTHROPIC_API_KEY，再重新部署。', mode: 'nosetup' });
    if (process.env.ANTHROPIC_API_KEY) {
      try { return send(res, 200, { text: await askClaude(msgs, context), mode: 'claude' }); }
      catch (e) { recordError('ai', 'Claude: ' + e.message, { u: req._user }); return send(res, 200, { text: '小伴连不上 Claude（' + e.message + '）。检查网络和 API 密钥。', mode: 'error' }); }
    }
    if (process.env.GH_MODELS_TOKEN) {
      try { return send(res, 200, { text: await askGitHub(msgs, context), mode: 'github' }); }
      catch (e) { recordError('ai', 'GitHub Models: ' + e.message, { u: req._user }); return send(res, 200, { text: '小伴暂时答不上来：' + e.message, mode: 'error' }); }
    }
    try { return send(res, 200, { text: await askOllama(msgs, context), mode: 'ollama' }); }
    catch (e) {
      if (e.code === 'ECONNREFUSED' || /not found/i.test(e.message)) return send(res, 200, { text: SETUP, mode: 'nosetup' });
      recordError('ai', 'Ollama: ' + e.message, { u: req._user });
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

  if (p === '/api/me') { const email=me.email||'',phone=me.phone||''; return send(res, 200, { me: { name: me.name, email:email?email.replace(/^(.).+(@.*)$/,'$1•••$2'):'', phone:phone?phone.replace(/(\+\d{1,3})\d{3,7}(\d{2,4})$/,'$1••••$2'):'' } }); }
  if (p === '/api/settings' && m === 'GET') {
    const defaults = defaultSettings();
    me.settings = Object.assign(defaults, me.settings || {});
    me.settings.notifications = Object.assign(defaults.notifications, me.settings.notifications || {});
    me.settings.security = Object.assign(defaults.security, me.settings.security || {});
    const email=me.email||'',phone=me.phone||'';
    return send(res, 200, { settings: me.settings, contacts:{email:email?email.replace(/^(.).+(@.*)$/,'$1•••$2'):'',phone:phone?phone.replace(/(\+\d{1,3})\d{3,7}(\d{2,4})$/,'$1••••$2'):''} });
  }
  if (p === '/api/settings' && m === 'POST') {
    const b = await readBody(req), defaults = defaultSettings();
    me.settings = Object.assign(defaults, me.settings || {});
    me.settings.notifications = Object.assign(defaults.notifications, me.settings.notifications || {});
    me.settings.security = Object.assign(defaults.security, me.settings.security || {});
    const security = b.security || {};
    if (security.autoDeleteOnFailedLogin !== undefined && !!security.autoDeleteOnFailedLogin !== me.settings.security.autoDeleteOnFailedLogin) {
      if (typeof b.pass !== 'string' || hash(b.pass, me.salt) !== me.pw) return send(res, 403, { error: '更改自动删除设置前，请输入当前密码验证身份' });
    }
    if (security.failedLoginLimit !== undefined) {
      const limit = Number(security.failedLoginLimit);
      if (!Number.isInteger(limit) || limit < 3 || limit > 20) return send(res, 400, { error: '输错次数请设置为 3–20 的整数' });
      me.settings.security.failedLoginLimit = limit; me.failedLoginCount=0;
    }
    if (security.autoDeleteOnFailedLogin !== undefined) { if (!!security.autoDeleteOnFailedLogin !== me.settings.security.autoDeleteOnFailedLogin) me.failedLoginCount=0; me.settings.security.autoDeleteOnFailedLogin = !!security.autoDeleteOnFailedLogin; }
    const n = b.notifications || {};
    for (const key of ['enabled', 'messages', 'security', 'sound']) if (n[key] !== undefined) me.settings.notifications[key] = !!n[key];
    if (n.preview && ['all', 'name', 'none'].includes(n.preview)) me.settings.notifications.preview = n.preview;
    if (b.language && ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'ko'].includes(b.language)) me.settings.language = b.language;
    save(); return send(res, 200, { settings: me.settings });
  }
  if (p === '/api/contact' && m === 'POST') {
    const b=await readBody(req),channel=b.channel,address=channel==='phone'?cleanPhone(b.address):String(b.address||'').trim().toLowerCase();
    if(!['email','phone'].includes(channel)||!hasOtp('bind',channel,address))return send(res,403,{error:'请先完成该联系方式的验证码验证'});
    if(Object.values(db.users).some(u=>u.name!==me.name&&(channel==='email'?u.email:u.phone)===address))return send(res,400,{error:'这个联系方式已绑定其他账号'});
    consumeOtp('bind',channel,address);me[channel]=address;save();return send(res,200,{ok:true});
  }
  if (p === '/api/account/delete' && m === 'POST') {
    const { pass } = await readBody(req);
    if (typeof pass !== 'string' || hash(pass, me.salt) !== me.pw) return send(res, 403, { error: '密码不正确' });
    deleteAccount(me.name); return send(res, 200, { ok: true });
  }

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

const server = http.createServer(async (req, res) => {
  const t0 = Date.now(), rid = crypto.randomBytes(4).toString('hex');
  req._rid = rid; res._rid = rid; res.setHeader('X-Request-Id', rid);
  const url = new URL(req.url, 'http://x'), isApi = url.pathname.startsWith('/api/');
  res.on('finish', () => {
    if (!isApi || url.pathname === '/api/stream') return;
    stat.req++; if (res.statusCode >= 500) stat.s5xx++; else if (res.statusCode >= 400) stat.s4xx++;
    const ms = Date.now() - t0;
    log(res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 || ms > 1500) ? 'warn' : 'info', 'req', { id: rid, m: req.method, p: url.pathname, s: res.statusCode, ms, u: req._user });
  });
  try {
    if (url.pathname === '/healthz') return send(res, 200, { ok: true, version: VERSION, uptimeSec: Math.round((Date.now() - START) / 1000) });
    if (isApi) await api(req, res, url); else serveStatic(req, res, url);
  } catch (e) {
    recordError('server', e.message, { id: rid, m: req.method, p: url.pathname, u: req._user, stack: e.stack });
    if (!res.headersSent) send(res, 500, { error: '服务器出错了' }); else res.end();
  }
});
server.on('clientError', (e, sock) => { log('warn', '客户端连接异常', { err: e.message }); if (sock.writable) sock.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
server.listen(PORT, () => {
  selfCheck();
  console.log(`\n  Privacy 已启动 → http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? '  AI 助手：Claude（云端）' : process.env.GH_MODELS_TOKEN ? '  AI 助手：GitHub Models（免费）' : '  AI 助手：本地 Ollama（模型 ' + (process.env.OLLAMA_MODEL || 'qwen2.5:3b') + '）。还没装的话，小伴会在聊天里告诉你怎么装');
  console.log('  手机访问：电脑和手机连同一个 Wi-Fi，用电脑的局域网 IP + 端口打开\n');
});
