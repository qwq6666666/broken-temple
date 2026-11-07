// 玩家操作：把 DOM 事件（data-act / data-change）轉成對 core 的呼叫。
import { meditate } from '../core/meditate.js';
import { fmt } from '../core/format.js';
import * as B from '../core/buildings.js';
import * as R from '../core/realm.js';
import * as G from '../core/gacha.js';
import * as D from '../core/disciples.js';
import * as E from '../core/endure.js';
import * as X from '../core/burst.js';
import * as Sq from '../core/squad.js';
import * as Exp from '../core/exploration.js';
import * as I from '../core/incidents.js';
import * as Dao from '../core/dao.js';
import * as Asc from '../core/ascend.js';
import * as St from '../core/stories.js';
import * as Sp from '../core/spec.js';
import { autoAssign } from '../core/autoAssign.js';
import * as Ach from '../core/achievements.js';
import * as Off from '../core/offlineEvent.js';
import * as Eq from '../core/equip.js';
import * as Ins from '../core/insight.js';
import * as Cm from '../core/commissions.js';
import * as Ex from '../core/expeditions.js';
import { toast, quote } from '../core/events.js';
import { LINES } from '../data/lines.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { playBreakthrough, playBurst, closeOverlay, showBurstPreview, showRebirthConfirm, showHelp, showOfflineResult, showStory, showStoryLog, showAscend } from './overlay.js';
import { sfx, unlock } from './audio.js';
import { getPrefs, setPref } from './prefs.js';
import { ghostOut, ripple } from './fx.js';
import { burstAt, converge, centerOf } from './particles.js';
import { playPull } from './pullFx.js';
import { saveNow, openExport, copyExport, openImport, doImport, resetSave } from './saveMenu.js';

export function bindActions(s, ui, rerender) {
  const act = {
    tab: el => {
      ui.tab = el.dataset.tab; ui.lastPull = null; ui.dModal = null;        // 招賢結果只顯示一次：離開分頁就清掉；弟子彈出面板也關掉
      // 手機版：全景在上、內容在下，切換分頁後自動捲到內容區
      if (globalThis.matchMedia?.('(max-width: 860px)').matches) setTimeout(() => document.getElementById('right')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    },
    expFocus: el => { ui.tab = 'world'; ui.expPick = el.dataset.id; ui.expTeam = []; if (globalThis.matchMedia?.('(max-width: 860px)').matches) setTimeout(() => document.getElementById('right')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); },
    toggleScene: el => { const on = document.body.classList.toggle('scene-open'); el.setAttribute('aria-pressed', String(on)); el.textContent = on ? '🏞 收合全景' : '🏞 展開全景'; },
    gotoScene: () => { document.getElementById('left')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },      // 手機：回到訪客卡與引爆鈕所在的上方區域
    meditate: (el, ev) => {
      const gain = meditate(s);
      if (!gain) return;
      sfx('click');
      const tile = document.querySelector('.bld[data-id=temple]');           // 靈氣匯聚到破廟
      if (tile) { const c = centerOf(tile); converge(ev.clientX, ev.clientY, c.x, c.y, { n: 14 }); setTimeout(() => burstAt(c.x, c.y, { n: 8, speed: 70, color: 'rgba(143,207,168,1)', life: 0.5 }), 520); }
      const sc = document.getElementById('scene'), r = sc.getBoundingClientRect();
      const f = document.createElement('span'); f.className = 'float'; f.textContent = '+' + fmt(gain);
      f.style.left = (ev.clientX - r.left) + 'px'; f.style.top = (ev.clientY - r.top - 10) + 'px';
      sc.appendChild(f); setTimeout(() => f.remove(), 900);
    },
    selectBuilding: el => { ui.selBuilding = ui.selBuilding === el.dataset.id ? null : el.dataset.id; sfx('click'); },
    chooseSpec: el => { if (Sp.choose(s, el.dataset.id, el.dataset.opt)) sfx('goal'); },
    expPick: el => { ui.expPick = ui.expPick === el.dataset.id ? null : el.dataset.id; ui.expTeam = []; },
    expToggle: el => {
      const uid = +el.dataset.uid, t = ui.expTeam || [];
      ui.expTeam = t.includes(uid) ? t.filter(x => x !== uid) : t.length < 3 ? [...t, uid] : t;
    },
    expAuto: () => { const bt = Ex.bestTeam(s, ui.expPick); if (bt) { ui.expTeam = [...bt.uids]; sfx('click'); } },
    expClear: () => { ui.expTeam = []; },
    expClaimAll: () => { let n = 0; for (let i = s.expeditions.length - 1; i >= 0; i--) if (Ex.claim(s, i)) n++; if (n) { sfx('goal'); toast(`已領取 ${n} 份秘境獎勵`, 'good'); } },
    expGo: () => { if (Ex.start(s, ui.expPick, ui.expTeam || [])) { ui.expTeam = []; ui.expPick = null; sfx('upgrade'); toast('隊伍出發了', 'good'); } },
    expClaim: el => {
      const r = Ex.claim(s, +el.dataset.i);
      if (r) { sfx(r.success ? 'goal' : 'click'); toast(r.success ? '秘境獎勵已領取' : '探索失敗，帶回一點收穫', r.success ? 'good' : 'warn'); }
    },
    exResolve: el => {
      const r = Exp.resolve(s, el.dataset.id, +el.dataset.lv, el.dataset.c || 'x');
      if (r) { sfx('goal'); const g = Object.entries(r.got).map(([k, v]) => ({ qi: '✨', stone: '💎', token: '🎫', shard: '🧩' }[k] + fmt(v))).join(' '); toast(`${r.e.emoji}${r.title}${g ? '：' + g : ''}${r.perm ? '（永久加成）' : ''}`, 'good'); }
    },
    closeBuilding: () => { ui.selBuilding = null; },
    upgrade: el => { if (B.upgrade(s, el.dataset.id)) sfx('upgrade'); },
    upgradeN: el => { const n = B.upgradeN(s, el.dataset.id, el.dataset.n === 'max' ? Infinity : +el.dataset.n); if (n) { sfx('upgrade'); toast(`升了 ${n} 級`, 'good'); } },
    breakthrough: async () => {
      if (ui.busy) return;
      const res = R.breakthrough(s);
      if (!res) return;
      ui.busy = true; rerender();
      try { await playBreakthrough(res); }
      catch (e) { console.error(e); closeOverlay(); }      // 演出出錯也不能卡住遊戲（突破本身已結算）
      finally { ui.busy = false; }
    },
    pull: async el => {
      if (ui.busy) return;
      const r = G.pull(s, +el.dataset.n);
      if (!r) return;
      ui.busy = true; rerender();
      try { await playPull(r); } catch (e) { console.error(e); }
      finally {
        ui.busy = false; rerender();
      }
    },
    meritToken: el => { if (G.exchangeMerit(s, +el.dataset.n)) sfx('coin'); },
    buyToken: el => { if (G.buyTokens(s, +el.dataset.n)) sfx('coin'); },
    levelUp: el => { if (D.levelUp(s, +el.dataset.uid)) sfx('upgrade'); },
    starUp: el => { if (D.starUp(s, +el.dataset.uid)) { toast('升星成功！', 'good'); sfx('goal'); } },
    rebirth: () => { if (!ui.busy && Dao.canRebirth(s)) showRebirthConfirm(s); },
    confirmRebirth: () => {
      const sel = document.getElementById('mutsel'), mut = sel ? sel.value : '';     // 先讀選單，再關閉彈窗
      closeOverlay();
      const gain = Dao.rebirth(s, mut || null);
      if (gain != null) { sfx('fanfare'); ui.tab = 'dao'; ui.lastPull = null; }
    },
    daoExchange: el => { if (Dao.exchange(s, el.dataset.id)) sfx('coin'); },
    ascendClaim: el => { const r = Asc.claim(s, el.dataset.id); if (r) { sfx('fanfare'); showAscend(r); } },
    daoBuy: el => { if (Dao.buy(s, el.dataset.id)) sfx('upgrade'); },
    incident: el => {
      const rect = ghostOut('.incident-card', 'exit-event');
      const sum = I.resolve(s, +el.dataset.i);
      if (sum) { sfx('coin'); if (rect) burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { n: 18, speed: 150, color: /-|暫停/.test(sum) ? 'rgba(209,88,76,1)' : 'rgba(217,182,74,1)' }); }
    },
    acceptPlea: () => { ghostOut('.visitor-card', 'exit-beat'); if (E.acceptPlea(s)) sfx('coin'); },
    rejectPlea: () => { ghostOut('.visitor-card', 'exit-endure'); if (E.rejectPlea(s)) sfx('endure'); },
    endure: () => { ghostOut('.visitor-card', 'exit-endure'); if (E.endure(s)) sfx('endure'); },
    show: () => {
      const cur = s.visitor.current, win = cur && E.assess(s, cur).showKind === 'beat';
      const rect = ghostOut('.visitor-card', win ? 'exit-beat' : 'exit-show');
      if (rect && win) burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { n: 24, speed: 200, color: 'rgba(143,207,168,1)' });
      const r = E.showOff(s);
      if (r) { toast(r.line, r.outcome === 'beat' ? 'good' : 'info'); sfx(r.outcome === 'beat' ? 'crush' : 'show'); }
    },
    dismiss: el => { const r = E.dismiss(s, +el.dataset.gid); if (r) { sfx('click'); toast(`已請「${r.name}」離開（−${r.cost} 靈石），名額 +1`, 'info'); } else toast('靈石不夠，或這位不能逐出', 'warn'); },
    recruit: el => {
      const r = X.recruit(s, +el.dataset.uid);
      if (r) { toast(r.isNew ? `${DISCIPLES_BY_ID[r.disciple.defId].name} 加入宗門！` : `已有此弟子，轉為 🧬專屬碎片 +${r.shards}${r.uni ? `、🧩+${r.uni}` : ''}`, 'good'); sfx('coin'); }
    },
    // 第一步：先看預覽（可以反悔）
    burst: () => {
      if (ui.busy) return;
      if (!X.canBurst(s)) { quote(LINES.noGrudge); return; }
      showBurstPreview(X.previewBurst(s));
    },
    squadToggle: el => { Sq.toggleSquad(s, +el.dataset.uid); showBurstPreview(X.previewBurst(s)); },
    squadAuto: () => { s.squad = X.recommendSquad(s); showBurstPreview(X.previewBurst(s)); },
    squadClear: () => { Sq.clearSquad(s); showBurstPreview(X.previewBurst(s)); },
    // 第二步：確認後才真正引爆
    confirmBurst: async () => {
      if (ui.busy) return;
      closeOverlay();
      const result = X.burst(s);
      if (!result) return;
      ui.busy = true; rerender();
      try { await playBurst(result); }
      catch (e) { console.error(e); closeOverlay(); toast('演出發生錯誤，已跳過（獎勵已結算）', 'warn'); }
      finally { X.endBurst(s); ui.tab = 'avenge'; ui.busy = false; }    // 一定要解除封鎖，否則訪客與引爆都會卡死
    },
    closeSettle: () => closeOverlay(),
    readStory: el => { const r = St.read(s, +el.dataset.uid); if (r) { sfx('goal'); showStory(r); } },
    viewStory: el => { const df = DISCIPLES_BY_ID[el.dataset.def]; showStoryLog(df.name, df.emoji, St.reread(s, df.id)); },
    claimCommission: el => { const r = Cm.claim(s, +el.dataset.i); if (r) { sfx('goal'); toast(`📋 委託完成：${Cm.rewardText(r.reward)}`, 'good'); } },
    abandonCommission: el => { Cm.abandon(s, +el.dataset.i); },
    menuToggle: () => setMenu(document.getElementById('menuMore')?.hidden),
    help: () => showHelp(false),
    autoAssign: () => { const r = autoAssign(s); if (r.placed) { sfx('upgrade'); toast(`已補位 ${r.placed} 位弟子`, 'good'); } else toast(r.total ? '沒有空著的駐守位' : '沒有未派駐的弟子', 'info'); },
    dSort: el => { ui.dSort = el.dataset.v; }, dFilter: el => { ui.dFilter = el.dataset.v; },
    openD: el => { ui.dModal = +el.dataset.uid; sfx('click'); },
    closeD: () => { ui.dModal = null; },
    dNav: el => {                                                      // 彈出面板：上一位／下一位（依目前排序與篩選的順序，循環）
      const order = (ui.dOrder && ui.dOrder.includes(ui.dModal)) ? ui.dOrder : s.disciples.map(d => d.uid);
      const i = order.indexOf(ui.dModal); if (i < 0) return;
      ui.dModal = order[(i + +el.dataset.d + order.length) % order.length]; sfx('click');
    },
    levelAll: () => { const n = D.levelUpAll(s); if (n) { sfx('upgrade'); toast(`共升級 ${n} 級`, 'good'); } },
    toggleBonds: () => { ui.bondsOpen = !ui.bondsOpen; },
    slotPick: el => { ui.pickB = el.dataset.b && ui.pickB !== el.dataset.b ? el.dataset.b : null; },
    slotAssign: el => { if (D.assign(s, +el.dataset.uid, el.dataset.b)) sfx('click'); else toast('駐守位已滿或弟子在探索中', 'warn'); },
    unassign: el => { D.assign(s, +el.dataset.uid, null); },
    toggleRow: el => { ui.rowOpen = { ...(ui.rowOpen || {}), [el.dataset.key]: !(el.dataset.open !== undefined ? el.dataset.open === 'true' : !!(ui.rowOpen || {})[el.dataset.key]) }; },       // data-open＝畫面上目前狀態（含預設展開）；沒有就用 ui.rowOpen
    upgradeAll: () => { const n = B.upgradeAll(s); if (n) { sfx('upgrade'); toast(`共升級 ${n} 級`, 'good'); } },
    equipTitle: el => { Ach.equip(s, s.achv.title === el.dataset.id ? null : el.dataset.id); },
    offlineChoose: el => {
      const box = document.getElementById('offev'); if (!box || box.dataset.done) return;
      const r = Off.resolveOffline(s, box.dataset.id, +el.dataset.i);
      if (r) { box.dataset.done = '1'; showOfflineResult(r.text, r.got); sfx('coin'); }
    },
    toggleEquip: el => { if (!Eq.toggleEquip(s, el.dataset.id)) toast('裝備欄已滿，先卸下一件', 'warn'); },
    branch: el => { if (D.setBranch(s, +el.dataset.uid, el.dataset.b)) { sfx('goal'); toast('進階完成', 'good'); } },
    learnInsight: el => { if (Ins.learn(s, el.dataset.spec)) { sfx('goal'); toast('心得領悟', 'good'); } },
    toggleTip: () => { ui.tipOpen = !ui.tipOpen; },
    dismissTip: el => { setPref('tipsSeen', { ...getPrefs().tipsSeen, [el.dataset.tab]: true }); },
    resetTips: () => { setPref('tipsSeen', {}); setPref('tips', true); toast('分頁說明已重設，切換分頁就會再看到', 'good'); },
    replayIntro: () => { closeOverlay(); showHelp(true); },
    hideHints: () => { setPref('hints', false); toast('已隱藏提示，可在「❓ 說明」重新開啟', 'info'); },
    toggleSound: () => { setPref('muted', !getPrefs().muted); if (!getPrefs().muted) sfx('click'); updateMenu(); },
    toggleMotion: () => { setPref('reduceMotion', !getPrefs().reduceMotion); updateMenu(); },
    saveNow: () => saveNow(s), exportSave: () => openExport(s), copyExport, importSave: openImport, doImport, resetSave,
  };
  const change = {
    assign: el => {
      const ok = D.assign(s, +el.dataset.uid, el.value || null);
      if (!ok) toast('駐守位已滿', 'warn');
    },
    dElem: el => { ui.dElem = el.value; },
    spare: el => { if (X.toggleSpare(s, +el.dataset.gid)) showBurstPreview(X.previewBurst(s)); },
    toggleFast: el => { setPref('fastBurst', el.checked); },
    toggleTips: el => { setPref('tips', el.checked); },
    toggleHints: el => { setPref('hints', el.checked); },
    toggleLoss: el => { s.settings.loss = el.checked; },
  };
  // 鍵盤：Esc 關閉彈出面板；Enter／空白鍵可「按下」role=button 的方塊（弟子牌、精簡列）
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && ui.dModal) { ui.dModal = null; return; }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target?.matches?.('[role=button][data-act]')) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener('pointerdown', unlock, { once: false });
  document.addEventListener('pointerdown', e => { const b = e.target.closest?.('.btn'); if (b) ripple(b, e.clientX, e.clientY); });
  updateMenu();
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = act[el.dataset.act];
    if (el.dataset.act !== 'menuToggle') setMenu(false);              // 點選單內外任一操作都收合
    if (fn) { fn(el, ev); rerender(); }
  });
  document.addEventListener('click', ev => { if (!ev.target.closest('#menu')) setMenu(false); });
  document.addEventListener('change', ev => {
    const el = ev.target.closest('[data-change]');
    if (el && change[el.dataset.change]) { change[el.dataset.change](el); rerender(); }
  });
}

// 頂部「⚙️ 更多」下拉選單
function setMenu(open) {
  const box = document.getElementById('menuMore'), btn = document.querySelector('[data-act=menuToggle]');
  if (box) box.hidden = !open;
  btn?.setAttribute('aria-expanded', String(!!open));
}

// 選單上的音效／動態按鈕文字
export function updateMenu() {
  const p = getPrefs();
  const a = document.querySelector('[data-act=toggleSound]'), m = document.querySelector('[data-act=toggleMotion]');
  if (a) a.textContent = p.muted ? '🔇 音效關' : '🔊 音效開';
  if (m) m.textContent = p.reduceMotion ? '🎞 動態：少' : '🎞 動態：開';
  document.body.classList.toggle('reduce-motion', !!p.reduceMotion);    // CSS 動畫一併停用
}
