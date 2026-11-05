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
import { toast, quote } from '../core/events.js';
import { LINES } from '../data/lines.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITY_ORDER } from '../data/gachaRates.js';
import { playBreakthrough, playBurst, closeOverlay, showBurstPreview, showRebirthConfirm } from './overlay.js';
import { sfx, unlock, applyVolume } from './audio.js';
import { getPrefs, setPref } from './prefs.js';
import { saveNow, openExport, copyExport, openImport, doImport, resetSave } from './saveMenu.js';

export function bindActions(s, ui, rerender) {
  const act = {
    tab: el => { ui.tab = el.dataset.tab; },
    meditate: (el, ev) => {
      const gain = meditate(s);
      if (!gain) return;
      sfx('click');
      const sc = document.getElementById('scene'), r = sc.getBoundingClientRect();
      const f = document.createElement('span'); f.className = 'float'; f.textContent = '+' + fmt(gain);
      f.style.left = (ev.clientX - r.left) + 'px'; f.style.top = (ev.clientY - r.top - 10) + 'px';
      sc.appendChild(f); setTimeout(() => f.remove(), 900);
    },
    upgrade: el => { if (B.upgrade(s, el.dataset.id)) sfx('upgrade'); },
    breakthrough: async () => {
      if (ui.busy) return;
      const res = R.breakthrough(s);
      if (!res) return;
      ui.busy = true; rerender();
      await playBreakthrough(res);
      ui.busy = false;
    },
    pull: el => {
      const r = G.pull(s, +el.dataset.n);
      if (r) { ui.lastPull = r; sfx('pull', { r: Math.max(...r.map(x => RARITY_ORDER.indexOf(x.rarity))) }); }
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
    daoBuy: el => { if (Dao.buy(s, el.dataset.id)) sfx('upgrade'); },
    incident: el => { if (I.resolve(s, +el.dataset.i)) sfx('coin'); },
    endure: () => { if (E.endure(s)) sfx('endure'); },
    show: () => {
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
      await playBurst(result);
      X.endBurst(s);
      ui.tab = 'avenge'; ui.busy = false;
    },
    closeSettle: () => closeOverlay(),
    toggleSound: () => { setPref('muted', !getPrefs().muted); if (!getPrefs().muted) sfx('click'); updateMenu(); },
    toggleMotion: () => { setPref('reduceMotion', !getPrefs().reduceMotion); updateMenu(); },
    saveNow: () => saveNow(s), exportSave: () => openExport(s), copyExport, importSave: openImport, doImport, resetSave,
  };
  const change = {
    assign: el => {
      const ok = D.assign(s, +el.dataset.uid, el.value || null);
      if (!ok) toast('駐守位已滿', 'warn');
    },
    toggleLoss: el => { s.settings.loss = el.checked; },
  };
  document.addEventListener('pointerdown', unlock, { once: false });
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
}
