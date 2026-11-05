// 玩家操作：把 DOM 事件（data-act / data-change）轉成對 core 的呼叫。
import { meditate } from '../core/meditate.js';
import { fmt } from '../core/format.js';
import * as B from '../core/buildings.js';
import * as R from '../core/realm.js';
import * as G from '../core/gacha.js';
import * as D from '../core/disciples.js';
import * as E from '../core/endure.js';
import * as X from '../core/burst.js';
import { toast, quote } from '../core/events.js';
import { LINES } from '../data/lines.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { playBreakthrough, playBurst, closeOverlay, showBurstPreview } from './overlay.js';
import { saveNow, openExport, copyExport, openImport, doImport, resetSave } from './saveMenu.js';

export function bindActions(s, ui, rerender) {
  const act = {
    tab: el => { ui.tab = el.dataset.tab; },
    meditate: (el, ev) => {
      const gain = meditate(s);
      if (!gain) return;
      const sc = document.getElementById('scene'), r = sc.getBoundingClientRect();
      const f = document.createElement('span'); f.className = 'float'; f.textContent = '+' + fmt(gain);
      f.style.left = (ev.clientX - r.left) + 'px'; f.style.top = (ev.clientY - r.top - 10) + 'px';
      sc.appendChild(f); setTimeout(() => f.remove(), 900);
    },
    upgrade: el => { B.upgrade(s, el.dataset.id); },
    breakthrough: async () => {
      if (ui.busy) return;
      const res = R.breakthrough(s);
      if (!res) return;
      ui.busy = true; rerender();
      await playBreakthrough(res);
      ui.busy = false;
    },
    pull: el => { const r = G.pull(s, +el.dataset.n); if (r) ui.lastPull = r; },
    buyToken: el => { G.buyTokens(s, +el.dataset.n); },
    levelUp: el => { D.levelUp(s, +el.dataset.uid); },
    endure: () => { E.endure(s); },
    show: () => {
      const r = E.showOff(s);
      if (r) toast(r.line, r.outcome === 'beat' ? 'good' : 'info');
    },
    recruit: el => {
      const r = X.recruit(s, +el.dataset.uid);
      if (r) toast(r.isNew ? `${DISCIPLES_BY_ID[r.disciple.defId].name} 加入宗門！` : `已有此弟子，轉為 🧩${r.shards}`, 'good');
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
    saveNow: () => saveNow(s), exportSave: () => openExport(s), copyExport, importSave: openImport, doImport, resetSave,
  };
  const change = {
    assign: el => {
      const ok = D.assign(s, +el.dataset.uid, el.value || null);
      if (!ok) toast('駐守位已滿', 'warn');
    },
    toggleLoss: el => { s.settings.loss = el.checked; },
  };
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
