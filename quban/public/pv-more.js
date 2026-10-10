/* Privacy 2.4 — 更多：工具入口、今天、提示词优化、备忘与提醒、收藏与文件 */
'use strict';

/* ---------- 更多（含“今天”） ---------- */
viewMore = function () {
  if (!me) {
    $('#main').innerHTML = `<div class="pv-page pv-hub"><div class="pv-hub-top"><div><small class="pv-eb">PRIVACY / WELCOME</small><h1>欢迎来到 Privacy</h1><p class="pv-sub">登录后解锁聊天、语音消息和全部工具</p></div><div class="pv-brandmark"><span>PRIVACY</span>${pvLogo(16)}</div></div><div class="pv-hero"><b>注重隐私的聊天空间</b><p>好友私聊、语音消息、阅后即焚、应用锁、AI 助手和日常工具，一个就够。</p><button class="pv-btn" id="hubLogin">登录 / 注册</button></div>${pvLb('先玩一会儿')}<div class="pv-grid"><button class="pv-tool" id="hubGames"><span class="pv-ic">${pvI('game')}</span><b>小游戏</b><small>离线可玩</small></button></div></div>`;
    $('#hubLogin').onclick = () => showAuth('login'); $('#hubGames').onclick = () => go('games'); return;
  }
  const s = stats(), chk = s.last === today(), d = s.daily, done = ['play', 'chat', 'todo'].filter(k => d[k]).length, sc = pvPrivacyScore().score;
  const tools = [
    ['rem', 'bell', '备忘与提醒', '待办与定时提醒', () => viewReminders()], ['col', 'folder', '收藏与文件', '链接、图片和文件', () => viewCollect()],
    ['scn', 'scan', '文档扫描', '拍照存为 PDF', () => viewScan()], ['trn', 'translate', '快捷翻译', '文字与图片翻译', () => viewTranslate()],
    ['srh', 'search', '全局搜索', '搜遍聊天与笔记', () => go('search')],
    pvSupportsSpeech() ? ['vox', 'mic', '语音转文字', '说话变文字', () => viewVoiceTool()] : ['ach', 'trophy', '成就与回顾', '徽章与本周回顾', () => viewAchieve()],
    ['sch', 'clock', '定时发送', '到点自动发出', () => viewScheduled()], ['cnt', 'id', '隐私联系卡', '二维码加好友', () => viewContactCard()]
  ];
  $('#main').innerHTML = `<div class="pv-page pv-hub"><div class="pv-hub-top"><div><small class="pv-eb">PRIVACY / YOUR EVERYDAY TOOLKIT</small><h1>更多</h1><p class="pv-sub">Privacy 的聊天、灵感和日常小工具</p></div><div class="pv-brandmark"><span>PRIVACY</span>${pvLogo(16)}</div></div>
  <div class="pv-hero"><div class="pv-hero-h"><span class="pv-ic big">${pvI('spark', 24)}</span><div><b>提示词优化器</b><small>把想法整理成清晰、可直接使用的提示词</small></div></div><div class="pv-quick"><input id="hubIdea" type="text" placeholder="输入目标，快速开始…" maxlength="300" aria-label="提示词目标"><button class="pv-btn sm" id="hubGo">优化</button></div></div>
  ${pvLb('实用工具')}<div class="pv-grid">${tools.map(t => `<button class="pv-tool" data-t="${t[0]}"><span class="pv-ic">${pvI(t[1])}</span><b>${t[2]}</b><small>${t[3]}</small><i class="pv-chev">${pvI('chev', 14)}</i></button>`).join('')}</div>
  <button class="pv-today-row" id="hubToday"><span><b>今天 · 轻松互动</b><small>${chk ? `已连续打卡 ${s.streak} 天` : '打卡 · 小游戏 · 表情包 · 每日记录'}</small></span>${chk ? '' : '<em class="pv-badge-pill">未打卡</em>'}${pvI('chev', 14)}</button>
  <button class="pv-privacy-row" id="hubPrivacy">${pvI('lock', 18)}<span><b>Privacy 优先保护你的选择</b><small>隐私体检 ${sc} 分 · ${sc >= 100 ? '已满分' : '点这里看看怎么变得更安全'}</small></span>${pvI('chev', 14)}</button></div>`;
  $$('.pv-tool').forEach(b => b.onclick = () => tools.find(t => t[0] === b.dataset.t)[4]());
  $('#hubToday').onclick = viewToday; $('#hubPrivacy').onclick = () => viewPrivacyCheck();
  const go2 = () => viewOptimizer($('#hubIdea').value.trim()); $('#hubGo').onclick = go2; $('#hubIdea').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) go2(); };
  $('#main').scrollTop = 0;
};
const _viewHome = viewHome; viewHome = function () { viewMore(); };

/* ---------- 今天 ---------- */
function viewToday() {
  if (!me) return showAuth('login');
  const s = stats(), chk = s.last === today(), d = s.daily, lv = pvLevelInfo(), dg = dailyGame(), log = store.get('pv_daily', {}), wk = pvWeek(), ci = pvCheckins();
  const hour = new Date().getHours(), greet = hour < 5 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const task = (k, t) => `<div class="pv-task ${d[k] ? 'done' : ''}"><span class="pv-ck">${d[k] ? pvI('check', 14) : ''}</span><span>${t}</span><em>+5</em></div>`;
  const body = `<div class="pv-today"><h2 class="pv-greet">${greet}，${esc(me.name)}</h2><p class="pv-sub">${new Date().toLocaleDateString('zh-CN', { dateStyle: 'full' })}</p>
  <div class="pv-hero row"><div class="pv-streak"><b>${s.streak}</b><small>天连续打卡</small></div><div class="pv-hero-m"><small>${lv.name} · ${s.points} 积分</small><small>连续越久，奖励越多</small></div><button class="pv-btn" id="ck" ${chk ? 'disabled' : ''}>${chk ? '今日已打卡' : '打卡 +积分'}</button></div>
  ${pvLb('本周')}<div class="pv-week">${wk.map(x => `<div><small>${x.label}</small><span class="${ci.has(x.date) ? 'done' : x.today ? 'today' : ''}">${ci.has(x.date) ? pvI('check', 16) : ''}</span></div>`).join('')}</div>
  ${pvLb(`今日任务 ${['play', 'chat', 'todo'].filter(k => d[k]).length} / 3`)}<div class="pv-card">${task('play', '玩一局游戏')}${task('chat', '和小伴或好友聊一句')}${task('todo', '完成一个待办')}<p class="pv-hint">三项全做完，额外 +20 积分</p></div>
  ${pvLb('一起玩')}<div class="pv-duo"><button class="pv-tool flat" id="tGame"><b>${dg.emo} 今日挑战</b><small>${dg.name} · 第一次玩 +15</small></button><button class="pv-tool flat" id="tGames"><b>小游戏</b><small>${GAMES.length} 个，含双人对战</small></button></div>
  <button class="pv-tool flat wide" id="tStick"><b>表情包库</b><small>预览贴纸包，在聊天里使用</small></button>
  ${pvLb('日常工具')}<div class="pv-duo four">${[['todo', '待办'], ['note', '备忘本'], ['calc', '计算器'], ['pomo', '番茄钟']].map(([k, t]) => `<button class="pv-chipbtn" data-tool="${k}">${t}</button>`).join('')}</div>
  ${pvLb('每日记录')}<div class="pv-card"><textarea id="dailyTxt" rows="2" maxlength="500" placeholder="用一句话记下今天…" aria-label="每日记录">${esc(log[today()] || '')}</textarea><div class="pv-cardfoot"><small>保存在这台设备上</small><button class="pv-btn sm" id="dailySave">保存</button></div></div>
  <button class="pv-privacy-row" id="goAch">${pvI('trophy', 18)}<span><b>成就与回顾</b><small>${pvBadges().filter(b => b.ok).length} / 9 枚徽章 · 本周回顾</small></span>${pvI('chev', 14)}</button></div>`;
  pvPage('今天 · 轻松互动', 'TODAY', body, { cls: 'pv-today' });
  $('#ck').onclick = pvCheckin; $('#tGame').onclick = () => openGame(dg.id); $('#tGames').onclick = () => go('games');
  $('#tStick').onclick = () => { pvOpenChat('ai'); setTimeout(() => $('#stickerBtn') && $('#stickerBtn').click(), 60); };
  $$('[data-tool]').forEach(b => b.onclick = () => { tool = b.dataset.tool; go('tools'); });
  $('#dailySave').onclick = () => { const l = store.get('pv_daily', {}); l[today()] = $('#dailyTxt').value.trim(); store.set('pv_daily', l); toast('已保存今天的记录'); };
  $('#goAch').onclick = viewAchieve;
}

/* ---------- 收藏与文件（IndexedDB 存文件） ---------- */
let _pvdb = null;
function pvDB() { return _pvdb || (_pvdb = new Promise((res, rej) => { const r = indexedDB.open('privacy-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
async function pvFilePut(id, blob) { const db = await pvDB(); return new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put({ id, blob }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function pvFileGet(id) { const db = await pvDB(); return new Promise((res, rej) => { const r = db.transaction('files').objectStore('files').get(id); r.onsuccess = () => res(r.result && r.result.blob); r.onerror = () => rej(r.error); }); }
async function pvFileDel(id) { const db = await pvDB(); return new Promise(res => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(id); tx.oncomplete = res; tx.onerror = res; }); }
function pvCollectAdd(it) { const list = store.get('pv_collect', []); it.id = it.id || Date.now() + '-' + Math.random().toString(36).slice(2, 7); it.t = it.t || Date.now(); list.unshift(it); store.set('pv_collect', list.slice(0, 500)); return it; }
const PV_CTYPE = { link: ['链接', 'link'], msg: ['消息', 'chat'], image: ['图片', 'image'], file: ['文件', 'file'], prompt: ['提示词', 'spark'], text: ['文字', 'note'] };
let pvColF = 'all', pvColQ = '';
function viewCollect() {
  if (!me) return showAuth('login');
  const all = store.get('pv_collect', []), q = pvColQ.toLowerCase();
  const list = all.filter(x => (pvColF === 'all' || x.type === pvColF || (pvColF === 'msg' && x.type === 'text')) && (!q || `${x.title} ${x.text || ''} ${x.sub || ''}`.toLowerCase().includes(q)));
  const chips = [['all', '全部'], ['link', '链接'], ['msg', '消息'], ['image', '图片'], ['file', '文件'], ['prompt', '提示词']];
  const body = `<div class="pv-search"><span>${pvI('search', 18)}</span><input id="colQ" type="search" placeholder="搜索收藏…" value="${esc(pvColQ)}" aria-label="搜索收藏"></div><div class="pv-chips">${chips.map(([k, t]) => `<button class="pv-chip ${pvColF === k ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
  <div class="pv-list">${list.length ? list.map(x => { const ty = PV_CTYPE[x.type] || PV_CTYPE.text; return `<button class="pv-item" data-id="${esc(x.id)}"><span class="pv-ic">${pvI(ty[1])}</span><span class="pv-item-m"><b>${esc(x.title || '未命名')}</b><small>${esc(x.sub || new Date(x.t).toLocaleDateString('zh-CN'))}</small></span><em>${ty[0]}</em></button>`; }).join('') : `<div class="pv-empty">${pvMascot(44)}<b>${all.length ? '没有找到匹配的收藏' : '这里还是空的'}</b><small>长按聊天消息选“收藏”，或在下面添加链接和文件</small></div>`}</div>
  <div class="pv-bar"><div class="pv-bar-row"><button class="pv-btn ghost" id="colText">添加链接或文字</button><button class="pv-btn" id="colFile">选择文件</button></div>${pvNote('保存在本机浏览器 · 单个文件 ≤ 10 MB · 清除浏览器数据会一并删除')}</div><input type="file" id="colPick" class="visually-hidden" multiple>`;
  pvPage('收藏与文件', 'SAVED', body, { cls: 'with-bar' });
  $('#colQ').oninput = e => { pvColQ = e.target.value; const pos = e.target.selectionStart; viewCollect(); const n = $('#colQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-f]').forEach(b => b.onclick = () => { pvColF = b.dataset.f; viewCollect(); });
  $$('.pv-item').forEach(b => b.onclick = () => pvColOpen(b.dataset.id));
  $('#colFile').onclick = () => $('#colPick').click();
  $('#colPick').onchange = async e => {
    const files = [...e.target.files]; e.target.value = ''; let n = 0;
    for (const f of files) { if (f.size > 10 * 1024 * 1024) { toast(f.name + ' 超过 10 MB，未添加'); continue; } try { const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7); await pvFilePut(id, f); pvCollectAdd({ id, type: f.type.startsWith('image/') ? 'image' : 'file', title: f.name, sub: (f.size / 1024 > 1024 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB') + ' · ' + f.type.split('/')[0], mime: f.type, name: f.name }); n++; } catch { toast('保存文件失败，可能是浏览器存储空间不足'); } }
    if (n) { toast(`已添加 ${n} 个文件`); viewCollect(); } try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  };
  $('#colText').onclick = () => {
    const sh = pvSheet(`<h3 class="pv-sh-t">添加到收藏</h3><textarea id="colNew" rows="4" maxlength="4000" placeholder="粘贴链接，或写下想保存的文字" aria-label="内容"></textarea><div class="pv-bar-row"><button class="pv-btn ghost" id="colCancel">取消</button><button class="pv-btn" id="colOk">保存</button></div>`);
    $('#colNew', sh).focus(); $('#colCancel', sh).onclick = sh.close;
    $('#colOk', sh).onclick = () => { const v = $('#colNew', sh).value.trim(); if (!v) return toast('先写点内容'); const link = /^https?:\/\/\S+$/i.test(v); let host = ''; if (link) try { host = new URL(v).hostname; } catch {} pvCollectAdd({ type: link ? 'link' : 'text', title: link ? v.replace(/^https?:\/\//, '').slice(0, 60) : v.slice(0, 40), text: v, url: link ? v : '', sub: link ? host : '文字' }); sh.close(); toast('已保存'); viewCollect(); };
  };
}
async function pvColOpen(id) {
  const it = store.get('pv_collect', []).find(x => x.id === id); if (!it) return;
  const del = `<button class="pv-btn ghost danger" id="colDel">${pvI('trash', 16)} 删除</button>`;
  if (it.type === 'link') { const sh = pvSheet(`<h3 class="pv-sh-t">${esc(it.title)}</h3><p class="pv-pre sm">${esc(it.text)}</p><div class="pv-bar-row">${del}<button class="pv-btn ghost" id="colCopy">复制</button><button class="pv-btn" id="colOpen">打开</button></div>`); $('#colOpen', sh).onclick = () => { window.open(it.url, '_blank', 'noopener'); }; $('#colCopy', sh).onclick = () => pvCopy(it.text); return pvColDelBind(sh, it); }
  if (it.type === 'image' || it.type === 'file') {
    let blob; try { blob = await pvFileGet(it.id); } catch {} if (!blob) return toast('这个文件在本机已找不到了');
    const url = URL.createObjectURL(blob), isImg = it.type === 'image';
    const sh = pvSheet(`<h3 class="pv-sh-t">${esc(it.title)}</h3>${isImg ? `<img class="pv-prev" src="${url}" alt="${esc(it.title)}">` : `<p class="pv-sub">${esc(it.sub)}</p>`}<div class="pv-bar-row">${del}<button class="pv-btn" id="colDl">${pvI('download', 16)} 保存到设备</button></div>`, { onClose: () => URL.revokeObjectURL(url) });
    $('#colDl', sh).onclick = () => pvDownload(blob, it.name || it.title); return pvColDelBind(sh, it);
  }
  const sh = pvSheet(`<h3 class="pv-sh-t">${esc(it.title)}</h3><div class="pv-pre">${esc(it.text || '')}</div><div class="pv-bar-row">${del}<button class="pv-btn ghost" id="colCopy">复制</button>${it.type === 'prompt' ? '<button class="pv-btn" id="colUse">用它优化</button>' : ''}</div>`);
  $('#colCopy', sh).onclick = () => pvCopy(it.text || ''); if ($('#colUse', sh)) $('#colUse', sh).onclick = () => { sh.close(); viewOptimizer(it.text); }; pvColDelBind(sh, it);
}
function pvColDelBind(sh, it) { $('#colDel', sh).onclick = async () => { if (!confirm('删除这条收藏？')) return; store.set('pv_collect', store.get('pv_collect', []).filter(x => x.id !== it.id)); if (it.type === 'image' || it.type === 'file') await pvFileDel(it.id); sh.close(); viewCollect(); }; }

/* ---------- 提示词优化器 ---------- */
let pvOptSel = new Set(['clear', 'role']);
function pvGuessRole(t) {
  const m = [[/邮件|信函|请假|通知|汇报/, '擅长职场沟通的写作助理'], [/代码|程序|bug|函数|接口|报错|脚本/i, '经验丰富的软件工程师'], [/翻译|译成|translate/i, '专业、地道的译者'], [/总结|摘要|概括|提炼/, '擅长提炼要点的编辑'], [/计划|安排|日程|目标|习惯/, '靠谱的效率顾问'], [/解释|讲解|学习|教我|为什么|原理/, '耐心、会举例子的老师'], [/文案|广告|标题|小红书|朋友圈|宣传/, '有创意的文案策划'], [/简历|面试|求职/, '资深的职业顾问'], [/旅行|行程|攻略/, '熟悉当地的旅行规划师']].find(([r]) => r.test(t));
  return m ? m[1] : '专业、靠谱的助手';
}
function pvOptimizeLocal(text, sel) {
  const reqs = [];
  if (sel.has('clear')) reqs.push('先给结论，再说明理由；表达清楚，没有废话');
  if (sel.has('detail')) reqs.push('分步骤说明，并给出一个具体的例子');
  if (sel.has('short')) reqs.push('控制篇幅，不超过 150 字');
  if (!reqs.length) reqs.push('表达清晰，重点突出');
  reqs.push('信息不足时，先向我确认再回答', '使用与我相同的语言');
  const fmtLine = sel.has('format') ? '用「小标题 + 要点列表」输出，最后给出下一步建议' : '直接给出可以使用的完整内容';
  return `${sel.has('role') ? `角色\n你是一位${pvGuessRole(text)}。\n\n` : ''}任务\n${text}\n\n要求\n${reqs.map(x => '- ' + x).join('\n')}\n\n输出\n${fmtLine}`;
}
let pvOptState = { text: '', out: '', mode: '' };
function viewOptimizer(seed) {
  if (!me) return showAuth('login');
  if (typeof seed === 'string') pvOptState = { text: seed, out: '', mode: '' };
  const st = pvOptState, opts = [['clear', '更清晰'], ['detail', '更详细'], ['short', '更简洁'], ['role', '定角色'], ['format', '定格式']];
  const body = `${pvLb('你的想法')}<div class="pv-card"><textarea id="optIn" rows="3" maxlength="1000" placeholder="例如：帮我写一封请假邮件，语气礼貌，下周一到周三" aria-label="你的想法">${esc(st.text)}</textarea><div class="pv-cardfoot"><small>越具体，结果越准</small><small id="optCount">${st.text.length} / 1000</small></div></div>
  ${pvLb('优化方向')}<div class="pv-chips tight">${opts.map(([k, t]) => `<button class="pv-chip ${pvOptSel.has(k) ? 'on' : ''}" data-o="${k}" aria-pressed="${pvOptSel.has(k)}">${t}</button>`).join('')}</div>
  <div class="pv-pad"><button class="pv-btn wide" id="optGo">优化提示词</button></div>
  ${st.out ? `${pvLb('优化结果')}<div class="pv-card gold"><div class="pv-pre" id="optOut">${esc(st.out)}</div><div class="pv-modeline">${st.mode === 'ai' ? '由 AI 优化' : '本地模板整理（未接入 AI 时使用）'}</div><div class="pv-bar-row"><button class="pv-btn" id="optCopy">复制</button><button class="pv-btn ghost" id="optAgain">再优化</button><button class="pv-btn ghost" id="optSave">收藏</button></div></div>` : ''}
  ${pvNote('仅在你点击“优化”时处理内容；接入 AI 后，文字会发送到你的 Privacy 服务器的 AI 接口')}`;
  pvPage('提示词优化器', 'PROMPT LAB', body);
  const inp = $('#optIn'); inp.oninput = () => { pvOptState.text = inp.value; $('#optCount').textContent = inp.value.length + ' / 1000'; };
  $$('[data-o]').forEach(b => b.onclick = () => { const k = b.dataset.o; pvOptSel.has(k) ? pvOptSel.delete(k) : pvOptSel.add(k); b.classList.toggle('on'); b.setAttribute('aria-pressed', pvOptSel.has(k)); });
  const run = async () => {
    const text = inp.value.trim(); if (!text) return toast('先写下你的想法'); const btn = $('#optGo'); btn.disabled = true; btn.textContent = '正在优化…';
    let out = '', mode = 'local';
    try {
      const h = await api('/health');
      if (h.aiConfigured) {
        const dirs = opts.filter(([k]) => pvOptSel.has(k)).map(([, t]) => t).join('、') || '更清晰';
        const r = await api('/ai', { messages: [{ role: 'user', content: `请把下面这段想法改写成一条结构清晰、可以直接发给 AI 使用的提示词。保持原意，不要回答问题本身，不要加任何解释或前后缀，只输出提示词。按「角色、任务、要求、输出」四个小节组织，每个小节用单独一行的小标题。优化方向：${dirs}。\n\n我的想法：${text}` }], context: '' });
        if (r.text && !['error', 'noset', 'nosetup', 'limit'].includes(r.mode)) { out = r.text.trim(); mode = 'ai'; }
      }
    } catch {}
    if (!out) out = pvOptimizeLocal(text, pvOptSel);
    pvOptState = { text, out, mode }; pvBump('optimize'); viewOptimizer(); $('#main').scrollTop = 9999;
  };
  $('#optGo').onclick = run; if ($('#optAgain')) $('#optAgain').onclick = run;
  if ($('#optCopy')) $('#optCopy').onclick = () => pvCopy(pvOptState.out);
  if ($('#optSave')) $('#optSave').onclick = () => { pvCollectAdd({ type: 'prompt', title: pvOptState.text.slice(0, 30), text: pvOptState.out, sub: '提示词优化器' }); toast('已收藏到「收藏与文件」'); };
}

/* ---------- 备忘与提醒 ---------- */
let pvRemF = 'all', pvRemTimer = null, pvDraft = { at: 0, repeat: 'none' };
const PV_REP = { none: '不重复', daily: '每天', weekly: '每周', monthly: '每月' };
function pvRems() { return store.get('pv_rem', []); }
function pvNextAt(at, rep) { const d = new Date(at); if (rep === 'daily') d.setDate(d.getDate() + 1); else if (rep === 'weekly') d.setDate(d.getDate() + 7); else if (rep === 'monthly') d.setMonth(d.getMonth() + 1); return d.getTime(); }
function pvStartReminders() {
  clearInterval(pvRemTimer); if (!me) return;
  const tick = () => {
    if (!me) return; const list = pvRems(), now = Date.now(); let changed = false, fired = [];
    list.forEach(r => { if (!r.done && !r.fired && r.at && r.at <= now) { r.fired = true; fired.push(r); changed = true; } });
    if (changed) { store.set('pv_rem', list); }
    if (fired.length && !pvQuiet()) {
      const text = fired.length === 1 ? '提醒：' + fired[0].t : `你有 ${fired.length} 条提醒到时间了`;
      toast(text); try { if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('Privacy', { body: pvLockCfg().on && pvLockCfg().hideNotif ? '你有一条提醒' : text }); } catch {}
    }
    if (changed && tab === 'more' && $('.pv-rem')) viewReminders();
  };
  tick(); pvRemTimer = setInterval(tick, 15000);
}
function viewReminders() {
  if (!me) return showAuth('login');
  const rems = pvRems(), todos = store.get('todos', []), now = Date.now(), end = new Date(); end.setHours(23, 59, 59, 999);
  const items = [...rems.map(r => ({ k: 'r', id: r.id, t: r.t, at: r.at, done: r.done, rep: r.repeat })), ...todos.map(t => ({ k: 't', id: t.id, t: t.t, at: 0, done: t.done }))];
  const f = pvRemF, vis = items.filter(x => f === 'done' ? x.done : !x.done && (f !== 'today' || (x.at && x.at <= end.getTime())));
  const overdue = vis.filter(x => x.at && x.at < now), today_ = vis.filter(x => x.at && x.at >= now && x.at <= end.getTime()), later = vis.filter(x => x.at > end.getTime()), plain = vis.filter(x => !x.at);
  const row = x => { const late = x.at && x.at < now && !x.done; return `<div class="pv-rem-row ${x.done ? 'done' : ''}" data-k="${x.k}" data-id="${esc(x.id)}"><button class="pv-ckb ${late ? 'late' : ''}" aria-label="${x.done ? '标记为未完成' : '完成'}" data-act="done">${x.done ? pvI('check', 16) : ''}</button><span class="pv-rem-m"><b>${esc(x.t)}</b><small>${x.k === 't' ? '待办' : x.rep && x.rep !== 'none' ? PV_REP[x.rep] : '提醒'}</small></span>${x.at ? `<em class="pv-time ${late ? 'late' : x.at <= end.getTime() ? 'hot' : ''}">${pvTimeLabel(x.at)}</em>` : ''}<button class="pv-ib sm" data-act="del" aria-label="删除">${pvI('close', 16)}</button></div>`; };
  const grp = (t, a) => a.length ? pvLb(t) + `<div class="pv-rem-list">${a.map(row).join('')}</div>` : '';
  const countToday = items.filter(x => !x.done && x.at && x.at <= end.getTime()).length;
  const empty = !vis.length ? `<div class="pv-empty">${pvMascot(44)}<b>${f === 'done' ? '还没有完成的事项' : '一切都安排好了'}</b><small>在下面写一件事，选个时间，到点我会提醒你</small></div>` : '';
  const body = `<div class="pv-chips"><button class="pv-chip ${f === 'all' ? 'on' : ''}" data-f="all">全部 ${items.filter(x => !x.done).length}</button><button class="pv-chip ${f === 'today' ? 'on' : ''}" data-f="today">今天 ${countToday}</button><button class="pv-chip ${f === 'done' ? 'on' : ''}" data-f="done">已完成</button></div>${f === 'done' ? grp('已完成', vis) : grp('已过期', overdue) + grp('今天', today_) + grp('稍后', later) + grp('待办', plain)}${empty}
  <div class="pv-bar"><div class="pv-addbar"><input id="remIn" type="text" maxlength="120" placeholder="添加备忘或提醒…" aria-label="新事项"><button class="pv-btn ghost sm" id="remAt">${pvDraft.at ? pvTimeLabel(pvDraft.at) : '选时间'}</button><button class="pv-btn sm" id="remAdd">添加</button></div>${pvNote('提醒只在 Privacy 打开时弹出；不选时间就是普通待办')}</div>`;
  pvPage('备忘与提醒', 'REMINDERS', body, { cls: 'with-bar pv-rem' });
  $$('[data-f]').forEach(b => b.onclick = () => { pvRemF = b.dataset.f; viewReminders(); });
  $$('.pv-rem-row [data-act]').forEach(b => b.onclick = () => { const row = b.closest('.pv-rem-row'); pvRemAct(row.dataset.k, row.dataset.id, b.dataset.act); });
  const add = async () => {
    const v = $('#remIn').value.trim(); if (!v) return toast('先写点内容');
    if (pvDraft.at) { if (pvDraft.at < Date.now() - 1000) return toast('提醒时间已经过去了'); const l = pvRems(); l.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), t: v, at: pvDraft.at, repeat: pvDraft.repeat, done: false }); store.set('pv_rem', l); try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch {} }
    else { const t = store.get('todos', []); t.unshift({ id: Date.now(), t: v, done: false }); store.set('todos', t); }
    pvDraft = { at: 0, repeat: 'none' }; viewReminders();
  };
  $('#remAdd').onclick = add; $('#remIn').onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) add(); };
  $('#remAt').onclick = pvPickTime;
}
function pvPickTime() {
  const d = new Date(), at = (h, m, plusDay) => { const x = new Date(); if (plusDay) x.setDate(x.getDate() + 1); x.setHours(h, m, 0, 0); return x.getTime(); };
  const quick = [['1 小时后', Date.now() + 3600000], ['今晚 20:00', at(20, 0, d.getHours() >= 20)], ['明早 9:00', at(9, 0, true)]];
  const sh = pvSheet(`<h3 class="pv-sh-t">提醒时间</h3><div class="pv-chips tight">${quick.map(([t, v]) => `<button class="pv-chip" data-at="${v}">${t}</button>`).join('')}</div><label class="pv-fld"><span>自定义</span><input type="datetime-local" id="remDt" value="${pvDraft.at ? pvInputDT(pvDraft.at) : ''}" min="${pvInputDT(Date.now())}"></label><div class="pv-fld"><span>重复</span>${pvSeg('remRep', Object.entries(PV_REP), pvDraft.repeat)}</div><div class="pv-bar-row"><button class="pv-btn ghost" id="remClear">不设时间</button><button class="pv-btn" id="remOk">确定</button></div>`);
  let chosen = pvDraft.at, rep = pvDraft.repeat; pvSegBind('remRep', v => rep = v);
  $$('[data-at]', sh).forEach(b => b.onclick = () => { chosen = +b.dataset.at; $('#remDt', sh).value = pvInputDT(chosen); $$('[data-at]', sh).forEach(x => x.classList.toggle('on', x === b)); });
  $('#remDt', sh).onchange = e => { chosen = e.target.value ? new Date(e.target.value).getTime() : 0; };
  $('#remClear', sh).onclick = () => { pvDraft = { at: 0, repeat: 'none' }; sh.close(); const b = $('#remAt'); if (b) b.textContent = '选时间'; };
  $('#remOk', sh).onclick = () => { pvDraft = { at: chosen, repeat: rep }; sh.close(); const b = $('#remAt'); if (b) b.textContent = chosen ? pvTimeLabel(chosen) : '选时间'; };
}
function pvRemAct(k, id, act) {
  if (k === 't') {
    const todos = store.get('todos', []), t = todos.find(x => String(x.id) === String(id)); if (!t) return;
    if (act === 'del') store.set('todos', todos.filter(x => x !== t));
    else { t.done = !t.done; store.set('todos', todos); if (t.done) { const s = stats(); s.todosDone++; store.set('stats', s); addPoints(3, '完成待办'); mark('todo'); } }
  } else {
    let l = pvRems(); const r = l.find(x => x.id === id); if (!r) return;
    if (act === 'del') l = l.filter(x => x !== r);
    else { r.done = !r.done; if (r.done) { pvAct('todo', 1); const s = stats(); s.todosDone++; store.set('stats', s); mark('todo'); if (r.repeat && r.repeat !== 'none') { let n = pvNextAt(r.at, r.repeat); while (n < Date.now()) n = pvNextAt(n, r.repeat); l.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 6), t: r.t, at: n, repeat: r.repeat, done: false }); } } }
    store.set('pv_rem', l);
  }
  viewReminders();
}

/* ---------- 文档扫描：拍照 → 拖角裁剪 → 透视矫正 → 滤镜 → 多页 PDF（全程在本机） ---------- */
let pvScan = { pages: [], cur: 0, filter: 'enhance' };
async function pvScanLoad(file) {
  let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { try { bmp = await createImageBitmap(file); } catch { return toast('这张图片无法读取，请换一张'); } }
  const sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const page = { src: c, corners: pvScanAuto(c) || [{ x: .06, y: .06 }, { x: .94, y: .06 }, { x: .94, y: .94 }, { x: .06, y: .94 }], filter: pvScan.filter, out: null };
  return page;
}
/* 自动找纸张四角：大津法分出“最亮的大块区域”，取四个方向上的极值点；找不到就让用户手动拖 */
function pvScanAuto(src) {
  try {
    const w = 160, h = Math.max(1, Math.round(src.height * w / src.width)), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), hist = new Uint32Array(256);
    for (let i = 0; i < w * h; i++) { const v = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) | 0; g[i] = v; hist[v]++; }
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sB = 0, wB = 0, best = 0, thr = 128; const tot = w * h;
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; thr = t; } }
    // 取最大的连通亮区域（4 邻域洪水填充）
    const lab = new Int32Array(w * h), st = []; let bestN = 0, bestId = 0, id = 0;
    for (let s = 0; s < w * h; s++) { if (lab[s] || g[s] <= thr) continue; id++; let n = 0; st.push(s); lab[s] = id; while (st.length) { const p = st.pop(); n++; const px = p % w, py = (p / w) | 0; if (px > 0 && !lab[p - 1] && g[p - 1] > thr) { lab[p - 1] = id; st.push(p - 1); } if (px < w - 1 && !lab[p + 1] && g[p + 1] > thr) { lab[p + 1] = id; st.push(p + 1); } if (py > 0 && !lab[p - w] && g[p - w] > thr) { lab[p - w] = id; st.push(p - w); } if (py < h - 1 && !lab[p + w] && g[p + w] > thr) { lab[p + w] = id; st.push(p + w); } } if (n > bestN) { bestN = n; bestId = id; } }
    if (bestN < tot * .12 || bestN > tot * .93) return null;
    let tl = null, tr = null, br = null, bl = null, a = 1e9, b = -1e9, cc = -1e9, dd = 1e9;
    for (let p = 0; p < w * h; p++) { if (lab[p] !== bestId) continue; const px = p % w, py = (p / w) | 0, s1 = px + py, s2 = px - py; if (s1 < a) { a = s1; tl = [px, py]; } if (s2 > b) { b = s2; tr = [px, py]; } if (s1 > cc) { cc = s1; br = [px, py]; } if (s2 < dd) { dd = s2; bl = [px, py]; } }
    const q = [tl, tr, br, bl].map(([px, py]) => ({ x: Math.max(0, Math.min(1, px / (w - 1))), y: Math.max(0, Math.min(1, py / (h - 1))) }));
    const area = Math.abs((q[0].x * q[1].y - q[1].x * q[0].y) + (q[1].x * q[2].y - q[2].x * q[1].y) + (q[2].x * q[3].y - q[3].x * q[2].y) + (q[3].x * q[0].y - q[0].x * q[3].y)) / 2;
    return area > .15 ? q : null;
  } catch { return null; }
}
function pvScanProcess(p) {
  const src = p.src, W = src.width, H = src.height, q = p.corners.map(c => ({ x: c.x * W, y: c.y * H })), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let w = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), h = Math.max(dist(q[0], q[3]), dist(q[1], q[2])); const sc = Math.min(1, 1600 / Math.max(w, h, 1)); w = Math.max(40, Math.round(w * sc)); h = Math.max(40, Math.round(h * sc));
  const out = document.createElement('canvas'); out.width = w; out.height = h; const ctx = out.getContext('2d');
  if (!p.sdata) p.sdata = src.getContext('2d').getImageData(0, 0, W, H).data; const sd = p.sdata, od = ctx.createImageData(w, h), o = od.data;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = [q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y, q[3].x, q[3].y];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, den = dx1 * dy2 - dy1 * dx2;
  let g = 0, hh = 0; if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { g = (dx3 * dy2 - dy3 * dx2) / den; hh = (dx1 * dy3 - dy1 * dx3) / den; }
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c0 = x0, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x + .5) / w, v = (y + .5) / h, k = g * u + hh * v + 1, X = (a * u + b * v + c0) / k, Y = (d * u + e * v + f) / k;
    const ix = Math.max(0, Math.min(W - 1.001, X - .5)), iy = Math.max(0, Math.min(H - 1.001, Y - .5)), xi = ix | 0, yi = iy | 0, fx = ix - xi, fy = iy - yi, i00 = (yi * W + xi) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, oi = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) o[oi + ch] = sd[i00 + ch] * (1 - fx) * (1 - fy) + sd[i10 + ch] * fx * (1 - fy) + sd[i01 + ch] * (1 - fx) * fy + sd[i11 + ch] * fx * fy; o[oi + 3] = 255;
  }
  if (p.filter === 'enhance') {
    const hist = new Uint32Array(256); for (let i = 0; i < o.length; i += 4) hist[(o[i] * .299 + o[i + 1] * .587 + o[i + 2] * .114) | 0]++;
    const tot = w * h; let acc = 0, lo = 0, hi = 255; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= tot * .02) { lo = i; break; } } acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= tot * .02) { hi = i; break; } }
    const s = 255 / Math.max(20, hi - lo); for (let i = 0; i < o.length; i += 4) for (let ch = 0; ch < 3; ch++) o[i + ch] = Math.max(0, Math.min(255, (o[i + ch] - lo) * s));
  } else if (p.filter === 'bw') {
    const gray = new Float32Array(w * h), I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, gv = o[i] * .299 + o[i + 1] * .587 + o[i + 2] * .114; gray[y * w + x] = gv; row += gv; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
    const r = Math.max(6, Math.round(Math.min(w, h) / 40));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1), ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1), area = (xb - xa) * (yb - ya), sum = I[yb * (w + 1) + xb] - I[ya * (w + 1) + xb] - I[yb * (w + 1) + xa] + I[ya * (w + 1) + xa], v = gray[y * w + x] < (sum / area) * .9 ? 0 : 255, i = (y * w + x) * 4; o[i] = o[i + 1] = o[i + 2] = v; }
  }
  ctx.putImageData(od, 0, 0); p.out = out; return out;
}
function pvMakePdf(pages) {
  const enc = new TextEncoder(), chunks = [], offs = []; let len = 0; const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); len += u.length; };
  const obj = (n, fn) => { offs[n] = len; push(`${n} 0 obj\n`); fn(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n'); const n = pages.length;
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>')); obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`));
  pages.forEach((p, i) => {
    const po = 3 + i * 3, co = po + 1, io = po + 2, W = 595, H = Math.max(100, Math.round(595 * p.h / p.w)), content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(po, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${io} 0 R >> >> /Contents ${co} 0 R >>`));
    obj(co, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(io, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); push(p.bytes); push('\nendstream'); });
  });
  const total = 2 + n * 3, xr = len; push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`); for (let i = 1; i <= total; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`); return new Blob(chunks, { type: 'application/pdf' });
}
function viewScan() {
  if (!me) return showAuth('login');
  const P = pvScan.pages, cur = P[pvScan.cur];
  let body;
  if (!P.length) body = `<div class="pv-hero"><b>把文档变成 PDF</b><p>放在深色桌面上，光线均匀，四角入镜。拍完拖动四个圆点对齐文档边缘，会自动拉直并增强。</p><div class="pv-bar-row"><button class="pv-btn" id="scCam">${pvI('camera', 18)} 拍摄文档</button><button class="pv-btn ghost" id="scGal">从相册选择</button></div></div>${pvNote('拍照、裁剪和生成 PDF 都在本机完成，不会上传')}<input type="file" id="scIn" class="visually-hidden" accept="image/*" capture="environment"><input type="file" id="scIn2" class="visually-hidden" accept="image/*" multiple>`;
  else body = `<div class="pv-stage" id="scStage"><canvas id="scCv" aria-label="文档照片"></canvas><svg id="scPoly" class="pv-poly"><polygon/></svg>${[0, 1, 2, 3].map(i => `<button class="pv-hd" data-i="${i}" aria-label="拖动角点 ${i + 1}"></button>`).join('')}</div>
  <div class="pv-chips"><button class="pv-chip ${cur.filter === 'orig' ? 'on' : ''}" data-fl="orig">原图</button><button class="pv-chip ${cur.filter === 'enhance' ? 'on' : ''}" data-fl="enhance">增强</button><button class="pv-chip ${cur.filter === 'bw' ? 'on' : ''}" data-fl="bw">黑白</button><span class="pv-grow"></span><small class="pv-hintr">拖动圆点对齐边缘</small></div>
  ${pvLb(`已拍 ${P.length} 页`)}<div class="pv-pages">${P.map((p, i) => `<button class="pv-pg ${i === pvScan.cur ? 'on' : ''}" data-pg="${i}" aria-label="第 ${i + 1} 页"><canvas width="52" height="68"></canvas></button>`).join('')}<button class="pv-pg add" id="scAdd" aria-label="添加一页">${pvI('plus', 20)}</button></div>
  <div class="pv-bar"><div class="pv-bar-row"><button class="pv-btn ghost" id="scRot">${pvI('rotate', 16)} 旋转</button><button class="pv-btn ghost" id="scDel">删除此页</button><button class="pv-btn ghost" id="scPrev">预览</button></div><div class="pv-bar-row"><button class="pv-btn wide" id="scSave">保存为 PDF（${P.length} 页）</button></div>${pvNote('拍照、裁剪和生成 PDF 都在本机完成，不会上传')}</div><input type="file" id="scIn" class="visually-hidden" accept="image/*" capture="environment"><input type="file" id="scIn2" class="visually-hidden" accept="image/*" multiple>`;
  pvPage('文档扫描', 'SCAN', body, { cls: P.length ? 'with-bar' : '' });
  const addFiles = async files => { for (const f of files) { const pg = await pvScanLoad(f); if (pg) { P.push(pg); pvScan.cur = P.length - 1; } } viewScan(); };
  const pick = (id, multi) => { const i = $(id); i.onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) addFiles(fs); }; return i; };
  const cam = pick('#scIn'), gal = pick('#scIn2');
  if ($('#scCam')) { $('#scCam').onclick = () => cam.click(); $('#scGal').onclick = () => gal.click(); }
  if (!P.length) return;
  $('#scAdd').onclick = () => cam.click();
  const stage = $('#scStage'), cv = $('#scCv'), maxW = Math.min(stage.parentElement.clientWidth || 340, 420), sc = Math.min(maxW / cur.src.width, 380 / cur.src.height), dw = Math.round(cur.src.width * sc), dh = Math.round(cur.src.height * sc);
  cv.width = cur.src.width; cv.height = cur.src.height; cv.style.width = dw + 'px'; cv.style.height = dh + 'px'; cv.getContext('2d').drawImage(cur.src, 0, 0); stage.style.width = dw + 'px'; stage.style.height = dh + 'px'; $('#scPoly').setAttribute('width', dw); $('#scPoly').setAttribute('height', dh);
  const place = () => { const pts = cur.corners.map(c => `${c.x * dw},${c.y * dh}`); $('#scPoly polygon').setAttribute('points', pts.join(' ')); $$('.pv-hd', stage).forEach((h, i) => { h.style.left = cur.corners[i].x * dw + 'px'; h.style.top = cur.corners[i].y * dh + 'px'; }); }; place();
  const thumbs = () => $$('.pv-pg canvas').forEach((t, i) => { const p = P[i]; if (!p) return; const o = p.out || pvScanProcess(p), c = t.getContext('2d'), s = Math.min(52 / o.width, 68 / o.height); c.clearRect(0, 0, 52, 68); c.drawImage(o, 0, 0, o.width * s, o.height * s); }); setTimeout(thumbs, 0);
  $$('.pv-hd', stage).forEach(h => {
    h.onpointerdown = e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add('drag'); };
    h.onpointermove = e => { if (!h.hasPointerCapture(e.pointerId)) return; const r = stage.getBoundingClientRect(), i = +h.dataset.i; cur.corners[i] = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / dw)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / dh)) }; place(); };
    h.onpointerup = h.onpointercancel = () => { h.classList.remove('drag'); cur.out = null; setTimeout(thumbs, 0); };
  });
  $$('[data-fl]').forEach(b => b.onclick = () => { cur.filter = b.dataset.fl; pvScan.filter = cur.filter; cur.out = null; $$('[data-fl]').forEach(x => x.classList.toggle('on', x === b)); thumbs(); });
  $$('[data-pg]').forEach(b => b.onclick = () => { pvScan.cur = +b.dataset.pg; viewScan(); });
  $('#scRot').onclick = () => { const s = cur.src, c = document.createElement('canvas'); c.width = s.height; c.height = s.width; const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(s, 0, 0); cur.src = c; cur.sdata = null; cur.out = null; cur.corners = pvScanAuto(c) || [{ x: .06, y: .06 }, { x: .94, y: .06 }, { x: .94, y: .94 }, { x: .06, y: .94 }]; viewScan(); };
  $('#scDel').onclick = () => { P.splice(pvScan.cur, 1); pvScan.cur = Math.max(0, pvScan.cur - 1); viewScan(); };
  $('#scPrev').onclick = () => { const o = pvScanProcess(cur), sh = pvSheet(`<h3 class="pv-sh-t">第 ${pvScan.cur + 1} 页预览</h3><img class="pv-prev" alt="处理后的文档" src="${o.toDataURL('image/jpeg', .8)}"><div class="pv-bar-row"><button class="pv-btn" id="pvOk">好的</button></div>`); $('#pvOk', sh).onclick = sh.close; };
  $('#scSave').onclick = async () => {
    const btn = $('#scSave'); btn.disabled = true; btn.textContent = '正在生成 PDF…';
    try {
      const pages = []; for (const p of P) { const o = p.out || pvScanProcess(p), blob = await new Promise(r => o.toBlob(r, 'image/jpeg', .88)); pages.push({ w: o.width, h: o.height, bytes: new Uint8Array(await blob.arrayBuffer()) }); }
      const pdf = pvMakePdf(pages), d = new Date(), pd = x => String(x).padStart(2, '0'), name = `Privacy-scan-${d.getFullYear()}${pd(d.getMonth() + 1)}${pd(d.getDate())}-${pd(d.getHours())}${pd(d.getMinutes())}.pdf`;
      pvBump('scan'); const file = new File([pdf], name, { type: 'application/pdf' });
      const sh = pvSheet(`<h3 class="pv-sh-t">PDF 已生成</h3><p class="pv-sub">${esc(name)} · ${(pdf.size / 1024).toFixed(0)} KB</p><div class="pv-bar-row"><button class="pv-btn ghost" id="pdfCol">存入收藏</button>${navigator.canShare && navigator.canShare({ files: [file] }) ? '<button class="pv-btn ghost" id="pdfShare">分享</button>' : ''}<button class="pv-btn" id="pdfDl">${pvI('download', 16)} 保存</button></div>`);
      $('#pdfDl', sh).onclick = () => { pvDownload(pdf, name); sh.close(); };
      $('#pdfCol', sh).onclick = async () => { try { const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7); await pvFilePut(id, pdf); pvCollectAdd({ id, type: 'file', title: name, sub: (pdf.size / 1024).toFixed(0) + ' KB · pdf', mime: 'application/pdf', name }); toast('已存入收藏与文件'); sh.close(); } catch { toast('存入失败'); } };
      if ($('#pdfShare', sh)) $('#pdfShare', sh).onclick = () => navigator.share({ files: [file], title: name }).catch(() => {});
    } catch (e) { toast('生成失败：' + e.message); } finally { btn.disabled = false; btn.textContent = `保存为 PDF（${P.length} 页）`; }
  };
}

/* ---------- 快捷翻译（MyMemory 免费服务 + 本机 OCR） ---------- */
const PV_LANGS = [['zh-CN', '中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'], ['fr', '法语'], ['de', '德语'], ['es', '西班牙语'], ['ru', '俄语'], ['pt', '葡萄牙语'], ['it', '意大利语'], ['ar', '阿拉伯语'], ['th', '泰语'], ['vi', '越南语'], ['id', '印尼语']];
const PV_OCR = { 'zh-CN': 'chi_sim+eng', en: 'eng', ja: 'jpn+eng', ko: 'kor+eng', fr: 'fra', de: 'deu', es: 'spa', ru: 'rus', pt: 'por', it: 'ita', ar: 'ara', th: 'tha', vi: 'vie', id: 'ind' };
function pvDetect(t) { if (/[\u3040-\u30ff]/.test(t)) return 'ja'; if (/[\uac00-\ud7af]/.test(t)) return 'ko'; if (/[\u4e00-\u9fff]/.test(t)) return 'zh-CN'; if (/[\u0400-\u04ff]/.test(t)) return 'ru'; if (/[\u0600-\u06ff]/.test(t)) return 'ar'; if (/[\u0e00-\u0e7f]/.test(t)) return 'th'; return 'en'; }
function pvChunks(t, max) {
  const enc = new TextEncoder(), parts = t.match(/[^。！？!?.\n；;]+[。！？!?.\n；;]*/g) || [t], out = []; let cur = '';
  for (const p of parts) { if (enc.encode(cur + p).length <= max) { cur += p; continue; } if (cur) { out.push(cur); cur = ''; } if (enc.encode(p).length <= max) { cur = p; continue; } let buf = ''; for (const ch of p) { if (enc.encode(buf + ch).length > max) { out.push(buf); buf = ''; } buf += ch; } cur = buf; }
  if (cur.trim()) out.push(cur); return out;
}
function pvDecode(s) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
async function pvMyMemory(q, src, tgt) {
  let r; try { r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(src + '|' + tgt)}`); } catch { throw new Error('网络不通，翻译需要联网'); }
  if (r.status === 429) throw new Error('今天的免费翻译额度用完了，明天再来');
  if (!r.ok) throw new Error('翻译服务暂时不可用，请稍后重试');
  const j = await r.json(), txt = (j.responseData && j.responseData.translatedText) || '';
  if (/MYMEMORY WARNING|QUOTA/i.test(txt + ' ' + (j.responseDetails || ''))) throw new Error('今天的免费翻译额度用完了，明天再来');
  if (+j.responseStatus !== 200) throw new Error(j.responseDetails || '翻译失败，请换个说法再试');
  return pvDecode(txt);
}
function pvLoadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[data-pv="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.async = true; s.dataset.pv = src; s.onload = res; s.onerror = () => rej(new Error('识别组件加载失败，请检查网络')); document.head.appendChild(s); }); }
let pvTr = { src: 'auto', tgt: 'zh-CN', mode: 'text', text: '', out: '' };
function viewTranslate() {
  if (!me) return showAuth('login');
  const st = pvTr, hist = store.get('pv_trans', []).slice(0, 5), opt = (v, sel, auto) => `${auto ? `<option value="auto" ${sel === 'auto' ? 'selected' : ''}>自动检测</option>` : ''}${PV_LANGS.map(([c, n]) => `<option value="${c}" ${sel === c ? 'selected' : ''}>${n}</option>`).join('')}`;
  const body = `<div class="pv-langs"><select id="trSrc" aria-label="原文语言">${opt(0, st.src, true)}</select><button class="pv-ib gold" id="trSwap" aria-label="互换语言">${pvI('swap')}</button><select id="trTgt" aria-label="译文语言">${opt(0, st.tgt)}</select></div>
  <div class="pv-chips"><button class="pv-chip ${st.mode === 'text' ? 'on' : ''}" data-m="text">文字</button>${pvSupportsSpeech() ? `<button class="pv-chip ${st.mode === 'voice' ? 'on' : ''}" data-m="voice">语音</button>` : ''}<button class="pv-chip ${st.mode === 'image' ? 'on' : ''}" data-m="image">图片取字</button></div>
  <div class="pv-card"><textarea id="trIn" rows="4" maxlength="2000" placeholder="${st.mode === 'voice' ? '点下面的麦克风，说话会变成文字' : st.mode === 'image' ? '选择一张有文字的图片，识别出的文字会出现在这里' : '输入要翻译的文字'}" aria-label="原文">${esc(st.text)}</textarea>${st.mode === 'voice' ? `<div class="pv-microw"><button class="pv-btn ghost" id="trMic">${pvI('mic', 16)} 开始听写</button><small id="trSt"></small></div>` : ''}${st.mode === 'image' ? `<div class="pv-microw"><button class="pv-btn ghost" id="trImg">${pvI('image', 16)} 选择图片</button><small id="trSt">首次识别需下载识别包（约 20 MB），之后会缓存</small></div><input type="file" id="trImgIn" class="visually-hidden" accept="image/*">` : ''}<div class="pv-cardfoot"><small id="trInfo">${st.text ? (PV_LANGS.find(l => l[0] === pvDetect(st.text)) || [0, '英语'])[1] + ' · ' : ''}${st.text.length} / 2000</small><button class="pv-btn sm" id="trGo">翻译</button></div></div>
  ${st.out ? `${pvLb('译文')}<div class="pv-card gold"><div class="pv-trout" id="trOut">${esc(st.out)}</div><div class="pv-bar-row"><button class="pv-btn ghost" id="trCopy">复制</button><button class="pv-btn ghost" id="trSpeak">朗读</button><button class="pv-btn ghost" id="trMemo">存入备忘</button></div></div>` : ''}
  ${hist.length ? `${pvLb('最近翻译')}<div class="pv-list">${hist.map((h, i) => `<button class="pv-item" data-h="${i}"><span class="pv-item-m"><b>${esc(h.src.slice(0, 40))}</b><small>${esc(h.out.slice(0, 40))}</small></span></button>`).join('')}</div><div class="pv-pad"><button class="pv-link-s" id="trClr">清除最近记录</button></div>` : ''}
  ${pvNote('译文由 MyMemory 免费服务提供 · 点击翻译才会发送文字 · 每天约 5000 字')}`;
  pvPage('快捷翻译', 'TRANSLATE', body);
  const inp = $('#trIn'), setSt = t => { const s = $('#trSt'); if (s) s.textContent = t; };
  inp.oninput = () => { st.text = inp.value; $('#trInfo').textContent = (PV_LANGS.find(l => l[0] === pvDetect(inp.value)) || [0, '英语'])[1] + ' · ' + inp.value.length + ' / 2000'; };
  $('#trSrc').onchange = e => st.src = e.target.value; $('#trTgt').onchange = e => st.tgt = e.target.value;
  $('#trSwap').onclick = () => { const from = st.src === 'auto' ? pvDetect(st.text || '') : st.src; st.src = st.tgt; st.tgt = from; st.text = st.out || st.text; st.out = ''; viewTranslate(); };
  $$('[data-m]').forEach(b => b.onclick = () => { st.mode = b.dataset.m; st.text = inp.value; viewTranslate(); });
  $$('[data-h]').forEach(b => b.onclick = () => { const h = hist[+b.dataset.h]; st.text = h.src; st.out = h.out; viewTranslate(); });
  if ($('#trClr')) $('#trClr').onclick = () => { store.set('pv_trans', []); viewTranslate(); };
  $('#trGo').onclick = async () => {
    const text = inp.value.trim(); if (!text) return toast('先输入要翻译的文字'); const src = st.src === 'auto' ? pvDetect(text) : st.src;
    if (src === st.tgt) { st.out = text; return viewTranslate(); }
    const btn = $('#trGo'); btn.disabled = true; btn.textContent = '翻译中…';
    try { const out = []; for (const c of pvChunks(text, 450)) out.push(await pvMyMemory(c, src, st.tgt)); st.text = text; st.out = out.join(' ').replace(/\s+([，。！？、；：])/g, '$1'); const h = store.get('pv_trans', []); h.unshift({ src: text, out: st.out }); store.set('pv_trans', h.slice(0, 20)); pvBump('translate'); viewTranslate(); }
    catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '翻译'; }
  };
  if ($('#trCopy')) { $('#trCopy').onclick = () => pvCopy(st.out); $('#trMemo').onclick = () => { const n = store.get('notes', []), now = new Date().toISOString(); n.unshift({ id: Date.now() + '-t', title: '翻译：' + st.text.slice(0, 12), content: st.text + '\n\n' + st.out, createdAt: now, updatedAt: now, pinned: false }); store.set('notes', n); toast('已存入备忘'); }; $('#trSpeak').onclick = () => { if (!window.speechSynthesis) return toast('这个浏览器不支持朗读'); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(st.out); u.lang = st.tgt; speechSynthesis.speak(u); }; }
  if ($('#trMic')) { let sr = null; $('#trMic').onclick = () => { if (sr) { sr.stop(); return; } if (!pvConsentSR()) return; sr = pvMakeSR(pvSpeechLang(), (fin, interim) => { inp.value = (st.text ? st.text + ' ' : '') + fin + interim; }, err => { sr = null; st.text = inp.value; $('#trMic').innerHTML = pvI('mic', 16) + ' 开始听写'; setSt(err ? (err === 'not-allowed' ? '请允许麦克风权限' : '听写暂不可用') : ''); }); try { sr.start(); $('#trMic').innerHTML = pvI('close', 16) + ' 停止'; setSt('正在听…'); } catch { sr = null; } }; }
  if ($('#trImg')) { $('#trImg').onclick = () => $('#trImgIn').click(); $('#trImgIn').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { setSt('正在加载识别组件…'); await pvLoadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'); const lang = PV_OCR[st.src === 'auto' ? 'zh-CN' : st.src] || 'eng'; const r = await Tesseract.recognize(f, lang, { logger: m => { if (m.status) setSt((m.status.includes('recognizing') ? '识别中 ' : '准备中 ') + Math.round((m.progress || 0) * 100) + '%'); } }); const t = (r.data.text || '').replace(/[ \t]+/g, ' ').trim(); if (!t) { setSt('没有识别到文字，换张更清晰的图片试试'); return; } st.text = t.slice(0, 2000); st.mode = 'text'; toast('已识别出文字，可以翻译了'); viewTranslate(); }
    catch (err) { setSt(err.message || '识别失败'); }
  }; }
}
let pvSRConsent = false;
function pvConsentSR() { if (pvSRConsent) return true; if (!window.isSecureContext) { toast('语音识别需要 HTTPS 安全连接'); return false; } if (!confirm('语音将由浏览器的语音识别服务处理，请勿口述密码等敏感信息。继续吗？')) return false; pvSRConsent = true; return true; }
function pvMakeSR(lang, onText, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, r = new SR(); r.lang = lang; r.continuous = true; r.interimResults = true; let fin = '';
  r.onresult = e => { let it = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else it += t; } onText(fin, it); };
  r.onerror = e => { onEnd(e.error || 'error'); }; r.onend = () => onEnd(''); return { start: () => r.start(), stop: () => r.stop() };
}

/* ---------- 语音转文字 ---------- */
let pvVox = { text: '' };
function viewVoiceTool() {
  if (!me) return showAuth('login'); if (!pvSupportsSpeech()) return toast('这个浏览器不支持语音识别');
  const langs = [['zh-CN', '中文（普通话）'], ['en-US', 'English'], ['ja-JP', '日本語'], ['ko-KR', '한국어'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['es-ES', 'Español']];
  const body = `<div class="pv-langs one"><select id="voxLang" aria-label="识别语言">${langs.map(([v, n]) => `<option value="${v}" ${v === pvSpeechLang() ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="pv-card big"><textarea id="voxTxt" rows="8" placeholder="点下面的麦克风，开始说话" aria-label="识别结果">${esc(pvVox.text)}</textarea></div>
  <div class="pv-micbig"><button id="voxMic" class="pv-mic" aria-label="开始听写">${pvPx('mic', '#19170d', 4)}</button><small id="voxSt">点按开始</small></div>
  <div class="pv-bar-row pv-pad"><button class="pv-btn ghost" id="voxCopy">复制</button><button class="pv-btn ghost" id="voxMemo">存入备忘</button><button class="pv-btn ghost" id="voxSend">发给好友</button><button class="pv-btn ghost" id="voxClr">清空</button></div>${pvNote('语音识别由浏览器或系统提供，音频可能由其服务商处理；结果不会自动发送')}`;
  pvPage('语音转文字', 'VOICE TO TEXT', body);
  const txt = $('#voxTxt'), st = t => $('#voxSt').textContent = t; let sr = null, base = '';
  txt.oninput = () => pvVox.text = txt.value;
  $('#voxMic').onclick = () => {
    if (sr) { sr.stop(); return; } if (!pvConsentSR()) return; base = txt.value ? txt.value.replace(/\s*$/, ' ') : '';
    sr = pvMakeSR($('#voxLang').value, (fin, it) => { txt.value = base + fin + it; pvVox.text = txt.value; }, err => { sr = null; $('#voxMic').classList.remove('on'); st(err ? (err === 'not-allowed' ? '请允许麦克风权限后重试' : '听写暂不可用，请重试') : '点按开始'); });
    try { sr.start(); $('#voxMic').classList.add('on'); st('正在听… 点按停止'); } catch { sr = null; }
  };
  $('#voxCopy').onclick = () => txt.value.trim() ? pvCopy(txt.value) : toast('还没有内容');
  $('#voxMemo').onclick = () => { const t = txt.value.trim(); if (!t) return toast('还没有内容'); const n = store.get('notes', []), now = new Date().toISOString(); n.unshift({ id: Date.now() + '-v', title: t.slice(0, 16), content: t, createdAt: now, updatedAt: now, pinned: false }); store.set('notes', n); toast('已存入备忘'); };
  $('#voxClr').onclick = () => { txt.value = ''; pvVox.text = ''; };
  $('#voxSend').onclick = () => { const t = txt.value.trim(); if (!t) return toast('还没有内容'); if (!chat.friends.length) return toast('还没有好友可以发送'); const sh = pvSheet(`<h3 class="pv-sh-t">发给</h3>${chat.friends.map(f => `<button class="pv-act" data-to="${esc(f.name)}"><span class="pv-mini-av">${esc(f.name[0])}</span><span>${esc(f.name)}</span></button>`).join('')}`); $$('[data-to]', sh).forEach(b => b.onclick = async () => { sh.close(); try { await api('/messages', { to: b.dataset.to, text: t.slice(0, 1000) }); toast('已发送给 ' + b.dataset.to); } catch (e) { toast(e.message); } }); };
}

/* ---------- 全局搜索 ---------- */
let pvSrQ = '', pvSrScope = 'all';
function pvHl(text, q) { const s = String(text), i = s.toLowerCase().indexOf(q.toLowerCase()); if (!q || i < 0) return esc(s.slice(0, 120)); const a = Math.max(0, i - 24); return (a ? '…' : '') + esc(s.slice(a, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length, i + q.length + 80)); }
viewGlobalSearch = async function () {
  if (!me) return showAuth('login');
  pvPage('全局搜索', 'FIND IT FAST', `<div class="pv-search on"><span>${pvI('search', 18)}</span><input id="gq" type="search" maxlength="120" placeholder="搜索聊天、收藏、备忘、提示词" autocomplete="off" value="${esc(pvSrQ)}" aria-label="搜索"><button class="pv-ib sm" id="gx" aria-label="清除" ${pvSrQ ? '' : 'hidden'}>${pvI('close', 16)}</button></div><div class="pv-chips" id="gsc"></div><div id="gres"></div>${pvNote('只搜索你参与的聊天，以及保存在这台设备上的内容')}`, { back: () => go('chat') });
  const inp = $('#gq'); let timer, seq = 0;
  const run = async () => {
    const q = inp.value.trim(); pvSrQ = q; $('#gx').hidden = !q; const my = ++seq, needle = q.toLowerCase();
    if (!q) { $('#gsc').innerHTML = ''; $('#gres').innerHTML = `<div class="pv-empty">${pvMascot(44)}<b>想找什么？</b><small>输入关键词，一次搜遍聊天、收藏、备忘和提示词</small></div>`; return; }
    const G = { chat: [], col: [], note: [], prompt: [] };
    const col = store.get('pv_collect', []); col.forEach(x => { if (`${x.title} ${x.text || ''}`.toLowerCase().includes(needle)) (x.type === 'prompt' ? G.prompt : G.col).push({ t: x.title || x.text, tx: x.text || x.sub, sub: PV_CTYPE[x.type] ? PV_CTYPE[x.type][0] + ' · 本机' : '收藏', go: () => { pvColQ = q; pvColF = 'all'; viewCollect(); } }); });
    store.get('notes', []).forEach(n => { if (`${n.title} ${n.content}`.toLowerCase().includes(needle)) G.note.push({ t: n.title || '备忘', tx: n.content, sub: '备忘 · 本机', go: () => { tool = 'note'; noteFilter = q; go('tools'); } }); });
    store.get('todos', []).forEach(t => { if (t.t.toLowerCase().includes(needle)) G.note.push({ t: t.t, tx: '', sub: '待办 · 本机', go: () => viewReminders() }); });
    pvRems().forEach(r => { if (r.t.toLowerCase().includes(needle)) G.note.push({ t: r.t, tx: '', sub: '提醒 · ' + pvTimeLabel(r.at), go: () => viewReminders() }); });
    aiHist().filter(x => x.content && x.content.toLowerCase().includes(needle)).slice(-5).forEach(x => G.chat.push({ t: '小伴对话（仅本机）', tx: x.content, sub: '', go: () => pvOpenChat('ai') }));
    try { const r = (await api('/search?q=' + encodeURIComponent(q))).results || []; if (my !== seq) return; r.forEach(x => G.chat.push({ t: '与 ' + x.peer + ' 的聊天', tx: x.text, sub: pvTimeLabel(x.t), go: () => pvOpenChat(x.peer) })); } catch {}
    if (my !== seq) return;
    const defs = [['chat', '聊天'], ['col', '收藏'], ['note', '备忘'], ['prompt', '提示词']], total = defs.reduce((n, [k]) => n + G[k].length, 0);
    $('#gsc').innerHTML = `<button class="pv-chip ${pvSrScope === 'all' ? 'on' : ''}" data-s="all">全部 ${total}</button>` + defs.map(([k, t]) => `<button class="pv-chip ${pvSrScope === k ? 'on' : ''}" data-s="${k}">${t}</button>`).join('');
    const flat = []; const html = defs.filter(([k]) => pvSrScope === 'all' || pvSrScope === k).map(([k, t]) => G[k].length ? pvLb(`${t} · ${G[k].length}`) + `<div class="pv-card flush">${G[k].slice(0, 30).map(x => { flat.push(x); return `<button class="pv-res" data-r="${flat.length - 1}"><span>${pvHl(x.tx || x.t, q)}</span><small>${esc(x.t)}${x.sub ? ' · ' + esc(x.sub) : ''}</small></button>`; }).join('')}</div>` : '').join('');
    $('#gres').innerHTML = html || `<div class="pv-empty">${pvMascot(44, 'sad')}<b>没有找到匹配内容</b><small>换个关键词试试</small></div>`;
    $$('[data-r]').forEach(b => b.onclick = () => flat[+b.dataset.r].go()); $$('[data-s]').forEach(b => b.onclick = () => { pvSrScope = b.dataset.s; run(); });
  };
  inp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 220); }; $('#gx').onclick = () => { inp.value = ''; run(); inp.focus(); }; run(); if (innerWidth > 760) inp.focus();
};

/* ---------- 定时发送 ---------- */
viewScheduled = async function () {
  if (!me) return showAuth('login');
  pvPage('定时发送', 'SEND LATER', '<div id="schBody"><p class="pv-sub">正在读取好友…</p></div>');
  let friends = []; try { friends = (await api('/friends')).friends; } catch (e) { toast(e.message); }
  const d = new Date(), at = (h, plus) => { const x = new Date(); if (plus) x.setDate(x.getDate() + 1); x.setHours(h, 0, 0, 0); return x.getTime(); };
  const quick = [['1 小时后', Date.now() + 3600000], ['今晚 20:00', at(20, d.getHours() >= 20)], ['明早 9:00', at(9, true)]]; let chosen = 0;
  $('#schBody').innerHTML = friends.length ? `<div class="pv-card"><label class="pv-fld inline"><span>发给</span><select id="schTo">${friends.map(f => `<option value="${esc(f.name)}">${esc(f.name)}</option>`).join('')}</select></label><textarea id="schTx" rows="3" maxlength="1000" placeholder="写下想发送的内容" aria-label="消息内容"></textarea><div class="pv-cardfoot"><small></small><small id="schN">0 / 1000</small></div></div>${pvLb('发送时间')}<div class="pv-chips tight">${quick.map(([t, v]) => `<button class="pv-chip" data-q="${v}">${t}</button>`).join('')}<button class="pv-chip" data-q="custom">自定义</button></div><label class="pv-fld pv-card dt"><span>将在</span><input type="datetime-local" id="schAt" min="${pvInputDT(Date.now() + 120000)}"></label><div class="pv-pad"><button class="pv-btn wide" id="schGo">安排发送</button></div>${pvLb('待发送')}<div id="schList"></div>${pvNote('消息在服务器运行时发送，休眠或重启可能延迟；仅限已添加的好友')}` : '<div class="pv-empty">' + pvMascot(44) + '<b>还没有好友</b><small>先在聊天里添加好友，再来安排定时消息</small></div>';
  if (friends.length) {
    $('#schTx').oninput = e => $('#schN').textContent = e.target.value.length + ' / 1000';
    $$('[data-q]').forEach(b => b.onclick = () => { $$('[data-q]').forEach(x => x.classList.toggle('on', x === b)); if (b.dataset.q === 'custom') { $('#schAt').focus(); try { $('#schAt').showPicker(); } catch {} } else { chosen = +b.dataset.q; $('#schAt').value = pvInputDT(chosen); } });
    $('#schAt').onchange = e => { chosen = e.target.value ? new Date(e.target.value).getTime() : 0; $$('[data-q]').forEach(x => x.classList.toggle('on', x.dataset.q === 'custom')); };
    $('#schGo').onclick = async () => { const text = $('#schTx').value.trim(), t = $('#schAt').value ? new Date($('#schAt').value).getTime() : chosen; if (!text) return toast('先写下要发送的消息'); if (!t) return toast('请选择发送时间'); try { await api('/messages/schedule', { to: $('#schTo').value, text, at: t }); toast('已安排发送'); viewScheduled(); } catch (e) { toast(e.message); } };
  }
  try { const rows = (await api('/messages/scheduled')).scheduled; const box = $('#schList'); if (box) { box.innerHTML = rows.length ? rows.map(x => `<div class="pv-card sched"><span><b>发给 ${esc(x.to)}</b><small>${esc(x.text)}</small><em>${pvTimeLabel(x.at)}</em></span><button class="pv-btn ghost sm" data-c="${esc(x.id)}">取消</button></div>`).join('') : '<p class="pv-empty-s">暂时没有待发送消息</p>'; $$('[data-c]').forEach(b => b.onclick = async () => { try { await apiDelete('/messages/scheduled/' + b.dataset.c); toast('已取消'); viewScheduled(); } catch (e) { toast(e.message); } }); } } catch {}
};

/* ---------- 隐私联系卡 ---------- */
viewContactCard = function () {
  if (!me) return showAuth('login');
  const url = new URL(location.pathname, location.origin); url.searchParams.set('addPrivacy', me.name);
  const canScan = !!window.BarcodeDetector && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  pvPage('隐私联系卡', 'YOUR ID', `<div class="pv-qrwrap"><div class="pv-qr" id="cQr"></div><b class="pv-qname">${esc(me.name)}</b><small>Privacy ID</small></div>${pvLb('卡片包含的资料')}<div class="pv-card pv-rows"><div class="pv-row"><span><b>Privacy ID</b><small>必选，用于添加好友</small></span><i class="pv-lockedtag">${pvI('lock', 14)} 始终包含</i></div><div class="pv-row"><span><b>邮箱和手机号</b><small>不会放进二维码，也不会展示给好友</small></span><i class="pv-lockedtag off">不包含</i></div></div><div class="pv-bar-row pv-pad">${canScan ? '<button class="pv-btn ghost" id="cScan">扫一扫</button>' : ''}<button class="pv-btn ghost" id="cCopy">复制 ID</button><button class="pv-btn" id="cShare">分享</button></div>${pvNote(canScan ? '二维码在本机生成，不上传；对方扫码后会请你确认添加' : '二维码在本机生成，不上传；用手机相机扫码会打开 Privacy 并请你确认添加')}`);
  try { const qr = qrcode(0, 'M'); qr.addData(url.toString(), 'Byte'); qr.make(); $('#cQr').innerHTML = qr.createImgTag(6, 4); const img = $('img', $('#cQr')); if (img) { img.alt = 'Privacy ID 联系二维码'; img.style.imageRendering = 'pixelated'; } } catch { $('#cQr').textContent = '二维码暂不可用'; }
  $('#cCopy').onclick = () => pvCopy(me.name);
  $('#cShare').onclick = async () => { try { if (navigator.share) await navigator.share({ title: 'Privacy 联系卡', text: `通过 Privacy ID ${me.name} 找到我`, url: url.toString() }); else { await navigator.clipboard.writeText(url.toString()); toast('联系卡链接已复制'); } } catch (e) { if (e.name !== 'AbortError') toast('分享暂不可用'); } };
  if ($('#cScan')) $('#cScan').onclick = async () => {
    const sh = pvSheet(`<h3 class="pv-sh-t">扫一扫</h3><video id="scVid" class="pv-scanvid" playsinline muted></video><p class="pv-sub" id="scSt">把对方的联系卡二维码放进框内</p><div class="pv-bar-row"><button class="pv-btn ghost" id="scX">取消</button></div>`);
    let stream, stop = false; const end = () => { stop = true; try { stream && stream.getTracks().forEach(t => t.stop()); } catch {} sh.close(); }; $('#scX', sh).onclick = end;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); const v = $('#scVid', sh); v.srcObject = stream; await v.play(); const det = new BarcodeDetector({ formats: ['qr_code'] });
      const loop = async () => { if (stop) return; try { const r = await det.detect(v); if (r.length) { let name = ''; try { name = new URL(r[0].rawValue).searchParams.get('addPrivacy') || ''; } catch {} if (name) { end(); sessionStorage.setItem('privacy_pending_add', name); return handlePendingPrivacyInvite(); } $('#scSt', sh) && ($('#scSt', sh).textContent = '这不是 Privacy 联系卡，换一个试试'); } } catch {} setTimeout(loop, 300); }; loop();
    } catch { end(); toast('无法使用相机，请允许相机权限'); }
  };
};
