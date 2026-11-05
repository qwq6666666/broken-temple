// 玩家操作：把 DOM 事件（data-act / data-change）轉成對 core 的呼叫。
import { meditate } from '../core/meditate.js';
import { fmt } from '../core/format.js';
import * as B from '../core/buildings.js';
import * as R from '../core/realm.js';
import * as G from '../core/gacha.js';
import * as D from '../core/disciples.js';
import * as E from '../core/endure.js';
import * as X from '../core/burst.js';
import * as I from '../core/incidents.js';
import * as Dao from '../core/dao.js';
import * as St from '../core/stories.js';
import * as Sp from '../core/spec.js';
import { toast, quote } from '../core/events.js';
import { LINES } from '../data/lines.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITY_ORDER } from '../data/gachaRates.js';
import { playBreakthrough, playBurst, closeOverlay, showBurstPreview, showRebirthConfirm, showHelp, showStory, showStoryLog } from './overlay.js';
import { sfx, unlock, applyVolume } from './audio.js';
import { getPrefs, setPref } from './prefs.js';
import { ghostOut, ripple, pulse } from './fx.js';
import { burstAt, converge, centerOf } from './particles.js';
import { playPull } from './pullFx.js';
import { saveNow, openExport, copyExport, openImport, doImport, resetSave } from './saveMenu.js';

export function bindActions(s, ui, rerender) {
  const act = {
    tab: el => {
      ui.tab = el.dataset.tab;
      // 手機版：全景在上、內容在下，切換分頁後自動捲到內容區
      if (globalThis.matchMedia?.('(max-width: 860px)').matches) setTimeout(() => document.getElementById('right')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    },
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
    closeBuilding: () => { ui.selBuilding = null; },
    upgrade: el => { if (B.upgrade(s, el.dataset.id)) sfx('upgrade'); },
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
      ui.busy = true; ui.lastPull = null; rerender();
      try { await playPull(r); } catch (e) { console.error(e); }
      finally {
        ui.lastPull = r; ui.pullAnimUntil = Date.now() + 2400 + r.length * 120;       // 結果卡翻牌動畫的時間窗
        ui.busy = false; rerender();
      }
    },
    buyToken: el => { if (G.buyTokens(s, +el.dataset.n)) sfx('coin'); },
    levelUp: el => { if (D.levelUp(s, +el.dataset.uid)) sfx('upgrade'); },
    starUp: el => { if (D.starUp(s, +el.dataset.uid)) { toast('升星成功！', 'good'); sfx('goal'); } },
    rebirth: () => { if (!ui.busy && Dao.canRebirth(s)) showRebirthConfirm(s); },
    confirmRebirth: () => {
      closeOverlay();
      const gain = Dao.rebirth(s);
      if (gain != null) { sfx('fanfare'); ui.tab = 'dao'; ui.lastPull = null; }
    },
    daoExchange: el => { if (Dao.exchange(s, el.dataset.id)) sfx('coin'); },
    daoBuy: el => { if (Dao.buy(s, el.dataset.id)) sfx('upgrade'); },
    incident: el => {
      const rect = ghostOut('.incident-card', 'exit-event');
      const sum = I.resolve(s, +el.dataset.i);
      if (sum) { sfx('coin'); if (rect) burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { n: 18, speed: 150, color: /-|暫停/.test(sum) ? 'rgba(209,88,76,1)' : 'rgba(217,182,74,1)' }); }
    },
    endure: () => { ghostOut('.visitor-card', 'exit-endure'); if (E.endure(s)) sfx('endure'); },
    show: () => {
      const cur = s.visitor.current, win = cur && E.assess(s, cur).showKind === 'beat';
      const rect = ghostOut('.visitor-card', win ? 'exit-beat' : 'exit-show');
      if (rect && win) burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { n: 24, speed: 200, color: 'rgba(143,207,168,1)' });
      const r = E.showOff(s);
      if (r) { toast(r.line, r.outcome === 'beat' ? 'good' : 'info'); sfx(r.outcome === 'beat' ? 'crush' : 'show'); }
    },
    recruit: el => {
      const r = X.recruit(s, +el.dataset.uid);
      if (r) { toast(r.isNew ? `${DISCIPLES_BY_ID[r.disciple.defId].name} 加入宗門！` : `已有此弟子，轉為 🧩${r.shards}`, 'good'); sfx('coin'); }
    },
    // 第一步：先看預覽（可以反悔）
    burst: () => {
      if (ui.busy) return;
      if (!X.canBurst(s)) { quote(LINES.noGrudge); return; }
      showBurstPreview(X.previewBurst(s));
    },
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
    help: () => showHelp(false),
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
    toggleHints: el => { setPref('hints', el.checked); },
    toggleLoss: el => { s.settings.loss = el.checked; },
  };
  document.addEventListener('pointerdown', unlock, { once: false });
  document.addEventListener('pointerdown', e => { const b = e.target.closest?.('.btn'); if (b) ripple(b, e.clientX, e.clientY); });
  updateMenu();
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = act[el.dataset.act];
    if (fn) { fn(el, ev); rerender(); }
  });
  document.addEventListener('change', ev => {
    const el = ev.target.closest('[data-change]');
    if (el && change[el.dataset.change]) { change[el.dataset.change](el); rerender(); }
  });
}

// 選單上的音效／動態按鈕文字
export function updateMenu() {
  const p = getPrefs();
  const a = document.querySelector('[data-act=toggleSound]'), m = document.querySelector('[data-act=toggleMotion]');
  if (a) a.textContent = p.muted ? '🔇 音效關' : '🔊 音效開';
  if (m) m.textContent = p.reduceMotion ? '🎞 動態：少' : '🎞 動態：開';
  document.body.classList.toggle('reduce-motion', !!p.reduceMotion);    // CSS 動畫一併停用
}
