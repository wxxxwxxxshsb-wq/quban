/* Privacy 2.4 — 设置中心、隐私体检、应用锁、主题外观、成就与回顾、数据导出 */
'use strict';

const PV_ADD = { open: '任何人都能加我', confirm: '需要我确认', closed: '暂不接受新好友' };
const PV_AUTO = [[0, '立即'], [60, '1 分钟'], [300, '5 分钟'], [3600, '1 小时']];
async function pvSaveSettings(patch) { accountSettings = (await api('/settings', patch)).settings; return accountSettings; }

function pvAddModeSheet(done) {
  const cur = ((accountSettings || {}).privacy || {}).addMode || 'open';
  const sh = pvSheet(`<h3 class="pv-sh-t">谁能加我</h3>${Object.entries(PV_ADD).map(([k, t]) => `<button class="pv-act ${k === cur ? 'sel' : ''}" data-m="${k}">${k === cur ? pvI('check', 18) : '<i class="pv-sp"></i>'}<span>${t}</span></button>`).join('')}<p class="pv-hint">“需要我确认”时，别人添加你会先出现在聊天列表的“好友请求”里。</p>`);
  $$('[data-m]', sh).forEach(b => b.onclick = async () => { try { await pvSaveSettings({ privacy: { addMode: b.dataset.m } }); sh.close(); toast('已更新：' + PV_ADD[b.dataset.m]); done && done(); } catch (e) { toast(e.message); } });
}
function pvDisappearSheet(done) {
  const cur = Number(((accountSettings || {}).privacy || {}).defaultDisappear) || 0;
  const sh = pvSheet(`<h3 class="pv-sh-t">默认阅后即焚</h3>${Object.entries(PV_DIS).map(([k, t]) => `<button class="pv-act ${+k === cur ? 'sel' : ''}" data-d="${k}">${+k === cur ? pvI('check', 18) : '<i class="pv-sp"></i>'}<span>${t}</span></button>`).join('')}<p class="pv-hint">只影响你之后新开的聊天；每个聊天也可以在“聊天详情”里单独设置。</p>`);
  $$('[data-d]', sh).forEach(b => b.onclick = async () => { try { await pvSaveSettings({ privacy: { defaultDisappear: +b.dataset.d } }); sh.close(); toast(+b.dataset.d ? '新聊天将在 ' + PV_DIS[b.dataset.d] + ' 后自动清理' : '已关闭默认阅后即焚'); done && done(); } catch (e) { toast(e.message); } });
}

/* ---------- 设置中心：插在原设置页顶部 ---------- */
const _viewSettings = viewSettings;
viewSettings = async function () {
  await _viewSettings(); if (!me) return;
  const page = $('.settings-page'); if (!page) return;
  const head = page.querySelector('.row'), c = pvLockCfg(), p = pvPrefs(), pv = (accountSettings && accountSettings.privacy) || {}, sc = pvPrivacyScore(), vault = Object.values(pvChatPrefs()).filter(x => x.lock).length;
  const chip = t => `<em class="pv-chip-s">${t}</em>`;
  const html = `<div class="pv-center">
  ${pvLb('隐私与安全')}<div class="pv-card pv-rows">${pvRow('sPriv', '隐私体检', '检查你的隐私设置', chip(sc.score + ' 分'))}${pvRow('sLock', '应用锁', c.on ? `PIN · 离开${c.auto === 0 ? '后立即' : ' ' + (PV_AUTO.find(a => a[0] === c.auto) || [0, ''])[1] + ' 后'}锁定` : '给 Privacy 加一把锁', c.on ? '开启' : '关闭')}${pvRow('sVault', '密室', '需要 PIN 才能打开的聊天', vault + ' 个')}${pvRow('sAdd', '谁能加我', '', PV_ADD[pv.addMode || 'open'])}${pvRow('sDis', '默认阅后即焚', '新聊天自动清理', PV_DIS[pv.defaultDisappear || 0])}</div>
  ${pvLb('免打扰')}<div class="pv-card pv-rows">${pvTg('sQuiet', p.quiet.on, '免打扰时段', '这段时间不弹出消息和提醒通知')}<div class="pv-quiet" ${p.quiet.on ? '' : 'hidden'}><label>开始<input type="time" id="sQs" value="${p.quiet.start}"></label><label>结束<input type="time" id="sQe" value="${p.quiet.end}"></label></div></div>
  ${pvLb('外观与互动')}<div class="pv-card pv-rows">${pvRow('sLook', '主题与外观', '主题色、聊天背景、字号、动效', (PV_ACCENTS[p.accent] || PV_ACCENTS.amber)[0])}${pvRow('sAch', '成就与回顾', '徽章、打卡、本周回顾', pvBadges().filter(b => b.ok).length + ' / 9')}</div>
  ${pvLb('数据与存储')}<div class="pv-card pv-rows">${pvRow('sClear', '清理本机缓存', '收藏的文件、扫描图和草稿', '<span id="sSize">…</span>')}${pvRow('sExp', '导出我的数据', '下载聊天、备忘和设置', 'JSON')}</div></div>`;
  head.insertAdjacentHTML('afterend', html);
  [...page.querySelectorAll('h2')].forEach(h => { if (h.textContent.trim() === '外观') { const nx = h.nextElementSibling; h.remove(); if (nx) nx.remove(); } });
  $('#sPriv').onclick = () => viewPrivacyCheck(); $('#sLock').onclick = () => pvAppLockPage(); $('#sLook').onclick = () => viewAppearance(); $('#sAch').onclick = () => viewAchieve();
  $('#sVault').onclick = async () => { if (!(await pvNeedPin('输入 PIN 进入密室'))) return; chat.tabF = 'vault'; go('chat'); };
  $('#sAdd').onclick = () => pvAddModeSheet(viewSettings); $('#sDis').onclick = () => pvDisappearSheet(viewSettings);
  $('#sQuiet').onchange = e => { pvSetPrefs({ quiet: Object.assign(pvPrefs().quiet, { on: e.target.checked }) }); $('.pv-quiet').hidden = !e.target.checked; };
  $('#sQs').onchange = e => pvSetPrefs({ quiet: Object.assign(pvPrefs().quiet, { start: e.target.value }) }); $('#sQe').onchange = e => pvSetPrefs({ quiet: Object.assign(pvPrefs().quiet, { end: e.target.value }) });
  $('#sExp').onclick = pvExport; $('#sClear').onclick = pvClearCache;
  try { navigator.storage.estimate().then(e => { const s = $('#sSize'); if (s) s.textContent = e.usage > 1048576 ? (e.usage / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(e.usage / 1024)) + ' KB'; }); } catch {}
};
async function pvExport() {
  try {
    const r = await fetch('/api/export', { headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new Error('导出失败，请稍后重试');
    const srv = await r.json(), local = { notes: store.get('notes', []), todos: store.get('todos', []), reminders: pvRems(), collection: store.get('pv_collect', []).map(({ id, type, title, text, url, sub, t }) => ({ id, type, title, text, url, sub, t })), dailyLog: store.get('pv_daily', {}), stats: store.get('stats', {}), prefs: pvPrefs() };
    const d = new Date(), pd = x => String(x).padStart(2, '0'); pvDownload(new Blob([JSON.stringify({ server: srv, local }, null, 2)], { type: 'application/json' }), `privacy-data-${d.getFullYear()}${pd(d.getMonth() + 1)}${pd(d.getDate())}.json`); toast('已导出（不含收藏的文件本体）');
  } catch (e) { toast(e.message); }
}
async function pvClearCache() {
  if (!confirm('清理收藏里的图片、文件和扫描件？链接和文字会保留。清理后无法恢复。')) return;
  try { const db = await pvDB(); await new Promise(res => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').clear(); tx.oncomplete = res; tx.onerror = res; }); } catch {}
  store.set('pv_collect', store.get('pv_collect', []).filter(x => x.type !== 'image' && x.type !== 'file'));
  try { if (window.caches) (await caches.keys()).forEach(k => caches.delete(k)); } catch {}
  chat.mediaUrls.forEach(u => URL.revokeObjectURL(u)); chat.mediaUrls = []; toast('已清理'); viewSettings();
}

/* ---------- 隐私体检 ---------- */
function pvFix(k) {
  if (k === 'applock' || k === 'blur') return pvAppLockPage();
  if (k === 'bind') { viewSettings().then(() => { const e = $('#bindEmail'); if (e) { e.scrollIntoView({ block: 'center' }); e.focus(); } }); return; }
  if (k === 'addmode') return pvAddModeSheet(viewPrivacyCheck); if (k === 'disappear') return pvDisappearSheet(viewPrivacyCheck);
  if (k === 'notif') { const c = pvLockCfg(); if (c.on) { store.set('pv_lock', Object.assign(c, { hideNotif: true })); viewPrivacyCheck(); } else pvSaveSettings({ notifications: { preview: 'none' } }).then(() => { toast('通知将不再显示消息内容'); viewPrivacyCheck(); }).catch(e => toast(e.message)); return; }
  if (k === 'vault') { toast('在聊天详情里点“锁定”，就能把聊天放进密室'); chat.open = false; go('chat'); }
}
async function viewPrivacyCheck() {
  if (!me) return showAuth('login');
  try { accountSettings = (await api('/settings')).settings; } catch {}
  const r = pvPrivacyScore(), left = r.items.filter(x => !x.ok).length, C = 2 * Math.PI * 58, dash = C * r.score / 100;
  const item = x => `<div class="pv-ck-row ${x.ok ? 'ok' : 'bad'}"><span class="pv-ck-i">${x.ok ? pvI('check', 16) : pvI('more', 16).replace('<circle cx="5" cy="12" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="19" cy="12" r=".8"/>', '<path d="M12 7v6M12 17h.01"/>')}</span><span class="pv-ck-m"><b>${x.ok ? x.t : x.bad}</b><small>${x.ok ? x.s : x.sBad}</small></span>${x.ok ? `<em>+${x.pts}</em>` : `<button class="pv-btn ghost sm" data-fix="${x.k}">去设置</button>`}</div>`;
  const body = `<div class="pv-ring"><svg viewBox="0 0 140 140" aria-label="隐私分数 ${r.score}"><circle cx="70" cy="70" r="58" class="bg"/><circle cx="70" cy="70" r="58" class="fg" style="stroke-dasharray:${dash.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)"/></svg><div><b>${r.score}</b><small>/ 100 分</small></div></div><div class="pv-mood">${pvMascot(42, r.score < 50 ? 'sad' : '')}<b>${left ? `状态${r.score >= 85 ? '良好' : r.score >= 50 ? '一般' : '需要加强'}，还差 ${left} 项` : '满分！你的隐私很安全'}</b></div><p class="pv-sub center">满分可获得徽章「隐私满分」</p>
  ${pvLb('建议')}<div class="pv-card pv-rows">${r.items.filter(x => !x.ok).map(item).join('') || '<p class="pv-empty-s">全部完成了，保持住！</p>'}</div>${pvLb('已完成')}<div class="pv-card pv-rows">${r.items.filter(x => x.ok).map(item).join('') || '<p class="pv-empty-s">还没有完成的项目</p>'}</div>${pvNote('体检只读取你的设置，不会上传任何聊天内容')}`;
  pvPage('隐私体检', 'PRIVACY CHECKUP', body, { back: () => go('more') });
  $$('[data-fix]').forEach(b => b.onclick = () => pvFix(b.dataset.fix));
}

/* ---------- 应用锁 ---------- */
async function pvAppLockPage() {
  if (!me) return showAuth('login');
  const c = pvLockCfg(), vault = Object.values(pvChatPrefs()).filter(x => x.lock).length;
  const body = `<div class="pv-lockhero"><span>${pvLogo(40, '#19170d', 'var(--pv-accent)')}</span><b>${c.on ? '应用锁已开启' : '应用锁未开启'}</b><small>${c.on ? '打开 Privacy 需要输入 PIN' : '开启后，打开 Privacy 需要先输入 PIN'}</small></div>
  ${pvLb('保护方式')}<div class="pv-card pv-rows">${pvTg('alOn', c.on, '应用锁', '用 4 位数字 PIN 保护')}${c.on ? pvRow('alChg', '修改 PIN', '4 位数字') : ''}</div>
  ${c.on ? `${pvLb('自动锁定')}<div class="pv-card">${pvSeg('alAuto', PV_AUTO, c.auto)}<p class="pv-hint">离开 Privacy 超过这个时间后，再打开需要输入 PIN。</p></div>${pvLb('显示')}<div class="pv-card pv-rows">${pvTg('alBlur', c.blur, '切换应用时遮挡画面', '多任务界面中不显示聊天内容')}${pvTg('alNotif', c.hideNotif, '通知中隐藏内容', '只显示“收到一条新消息”')}${pvRow('alVault', '密室', '需要 PIN 才能打开的聊天', vault + ' 个')}</div>` : ''}${pvNote('PIN 只保存在本机；忘记 PIN 需要重新登录，本机的应用锁设置会被清除')}`;
  pvPage('应用锁', 'APP LOCK', body, { back: () => viewSettings() });
  $('#alOn').onchange = async e => {
    if (e.target.checked) {
      const a = await pvPad({ title: '设置 4 位 PIN', cancel: true }); if (!a) return pvAppLockPage();
      const b = await pvPad({ title: '再输入一次确认', cancel: true }); if (!b) return pvAppLockPage();
      if (a !== b) { toast('两次输入不一致，请重新设置'); return pvAppLockPage(); }
      await pvSetPin(a); pvChatUnlockedUntil = Date.now() + 5 * 60000; toast('应用锁已开启'); pvAppLockPage();
    } else {
      const ok = await pvPad({ title: '输入 PIN 关闭应用锁', cancel: true, check: pvCheckPin }); if (!ok) return pvAppLockPage();
      const locked = Object.values(pvChatPrefs()).filter(x => x.lock).length;
      if (locked && !confirm(`关闭应用锁后，${locked} 个密室聊天会恢复到普通聊天列表。继续吗？`)) return pvAppLockPage();
      const all = pvChatPrefs(); Object.keys(all).forEach(k => { delete all[k].lock; }); store.set('pv_chatprefs', all); store.set('pv_lock', { on: false }); toast('应用锁已关闭'); pvAppLockPage();
    }
  };
  if ($('#alChg')) $('#alChg').onclick = async () => { const o = await pvPad({ title: '输入当前 PIN', cancel: true, check: pvCheckPin }); if (!o) return; const a = await pvPad({ title: '输入新的 PIN', cancel: true }); if (!a) return; const b = await pvPad({ title: '再输入一次确认', cancel: true }); if (!b) return; if (a !== b) return toast('两次输入不一致，PIN 未修改'); await pvSetPin(a); toast('PIN 已修改'); };
  if (c.on) {
    pvSegBind('alAuto', v => { store.set('pv_lock', Object.assign(pvLockCfg(), { auto: +v })); toast('已更新自动锁定时间'); });
    $('#alBlur').onchange = e => store.set('pv_lock', Object.assign(pvLockCfg(), { blur: e.target.checked }));
    $('#alNotif').onchange = e => store.set('pv_lock', Object.assign(pvLockCfg(), { hideNotif: e.target.checked }));
    $('#alVault').onclick = async () => { if (!(await pvNeedPin('输入 PIN 进入密室'))) return; chat.tabF = 'vault'; go('chat'); };
  }
}

/* ---------- 主题与外观 ---------- */
function viewAppearance() {
  const p = pvPrefs();
  const bgs = [['dots', '像素点'], ['grid', '网格'], ['plain', '纯色']];
  const body = `${pvLb('预览')}<div class="pv-card pv-preview"><div class="pv-pbub l">新图标已经换好了</div><div class="pv-pbub r">看到了，干净很多</div></div>
  ${pvLb('主题色')}<div class="pv-sw">${Object.entries(PV_ACCENTS).map(([k, [n, hex]]) => `<button class="pv-swb ${p.accent === k ? 'on' : ''}" data-ac="${k}" aria-label="${n}" aria-pressed="${p.accent === k}"><span style="background:${hex}">${p.accent === k ? pvI('check', 20) : ''}</span><small>${n}</small></button>`).join('')}</div>
  ${pvLb('聊天背景')}<div class="pv-bgs">${bgs.map(([k, n]) => `<button class="pv-bgb ${p.bg === k ? 'on' : ''}" data-bg="${k}" aria-pressed="${p.bg === k}"><span class="bg-${k}"></span><small>${n}</small></button>`).join('')}</div>
  ${pvLb('文字大小')}<div class="pv-card"><div class="pv-fs"><span style="font-size:12px">A</span><input type="range" id="fsR" min="0" max="4" step="1" value="${p.fs}" aria-label="文字大小"><span style="font-size:20px">A</span></div><div class="pv-fs-n" id="fsN">${PV_FS_NAME[p.fs]}</div></div>
  ${pvLb('动效')}<div class="pv-card pv-rows">${pvTg('apRed', p.reduce, '减少动效', '关闭过渡和弹跳')}${pvTg('apSp', localStorage.getItem('pv_splash_off') !== '1', '启动锁扣动画', '每次打开 Privacy 播放一次')}</div>`;
  pvPage('主题与外观', 'LOOK & FEEL', body, { back: () => viewSettings() });
  $$('[data-ac]').forEach(b => b.onclick = () => { pvSetPrefs({ accent: b.dataset.ac }); viewAppearance(); });
  $$('[data-bg]').forEach(b => b.onclick = () => { pvSetPrefs({ bg: b.dataset.bg }); viewAppearance(); });
  $('#fsR').oninput = e => { pvSetPrefs({ fs: +e.target.value }); $('#fsN').textContent = PV_FS_NAME[+e.target.value]; };
  $('#apRed').onchange = e => pvSetPrefs({ reduce: e.target.checked });
  $('#apSp').onchange = e => { if (e.target.checked) localStorage.removeItem('pv_splash_off'); else localStorage.setItem('pv_splash_off', '1'); };
}

/* ---------- 成就与回顾 ---------- */
function viewAchieve() {
  if (!me) return showAuth('login');
  const lv = pvLevelInfo(), s = lv.s, ci = pvCheckins(), wk = pvWeek(), bs = pvBadges(), max = Math.max(1, ...wk.map(d => (d.msg || 0) + (d.voice || 0) + (d.todo || 0) + (d.translate || 0)));
  const sum = k => wk.reduce((n, d) => n + (d[k] || 0), 0);
  const body = `<div class="pv-hero row"><span class="pv-ic big">${pvLogo(24, '#19170d', 'var(--pv-accent)')}</span><div class="pv-grow"><b>Lv.${lv.no} · ${lv.name}</b><small>${s.points} 积分${lv.next ? `，距「${lv.next[1]}」还差 ${lv.next[0] - s.points}` : '，已是最高等级'}</small><div class="pv-prog"><i style="width:${lv.pct}%"></i></div></div></div>
  ${pvLb(`本周打卡 · 连续 ${s.streak} 天`)}<div class="pv-week">${wk.map(x => `<div><small>${x.label}</small><span class="${ci.has(x.date) ? 'done' : x.today ? 'today' : ''}">${ci.has(x.date) ? pvI('check', 16) : ''}</span></div>`).join('')}</div>
  ${pvLb(`徽章 ${bs.filter(b => b.ok).length} / 9`)}<div class="pv-badges">${bs.map(b => `<div class="pv-badge ${b.ok ? 'on' : ''}" title="${esc(b.how)}"><span>${pvI(b.ok ? b.ic : 'lock', 26)}</span><small>${b.n}</small>${b.ok ? '' : `<em>${esc(b.how)}</em>`}</div>`).join('')}</div>
  ${pvLb('本周回顾')}<div class="pv-card"><div class="pv-bars">${wk.map(d => { const v = (d.msg || 0) + (d.voice || 0) + (d.todo || 0) + (d.translate || 0); return `<span><i class="${d.today ? 'on' : ''}" style="height:${Math.max(4, Math.round(v / max * 60 / 4) * 4)}px"></i><small>${d.label}</small></span>`; }).join('')}</div><div class="pv-recap"><span>消息 ${sum('msg')}</span><span>语音 ${sum('voice')}</span><span>待办 ${sum('todo')}</span><span>翻译 ${sum('translate')}</span></div></div>`;
  pvPage('成就与回顾', 'ACHIEVEMENTS', body, { back: () => go('me') });
}

/* ---------- 我的：顶部加等级卡与入口 ---------- */
const _viewMe = viewMe;
viewMe = function () {
  _viewMe(); if (!me) return; const wrap = $('#main .wrap'); if (!wrap) return;
  const lv = pvLevelInfo(), head = wrap.querySelector('.row');
  [...wrap.querySelectorAll('h2')].forEach(h => { if (/^成就/.test(h.textContent.trim())) { const nx = h.nextElementSibling; h.remove(); if (nx && nx.classList.contains('badges')) nx.remove(); } });
  const cards = `<div class="pv-mecards"><button class="pv-privacy-row" id="meAch">${pvI('trophy', 18)}<span><b>成就与回顾</b><small>Lv.${lv.no} ${lv.name} · ${pvBadges().filter(b => b.ok).length} / 9 枚徽章</small></span>${pvI('chev', 14)}</button><button class="pv-privacy-row" id="mePriv">${pvI('shield', 18)}<span><b>隐私体检</b><small>当前 ${pvPrivacyScore().score} 分</small></span>${pvI('chev', 14)}</button></div>`;
  head.insertAdjacentHTML('afterend', cards); $('#meAch').onclick = viewAchieve; $('#mePriv').onclick = viewPrivacyCheck;
};

/* ---------- 个人头像用像素切角 ---------- */
document.addEventListener('DOMContentLoaded', pvApplyPrefs);
