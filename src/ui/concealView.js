// 藏：偽裝值蓄力條（滿格發光）、蓄力倍率、「不裝了」鈕、承受損失開關。
// 骨架只建一次，之後直接改屬性，避免按鈕被重建。
import { CONFIG } from '../config.js';
import { chargeMult, disguiseFull } from '../core/conceal.js';
import { canBurst } from '../core/burst.js';
import { fmt } from '../core/format.js';
import { setText } from './dom.js';

export function mountConceal(root) {
  root.innerHTML = `
    <div class="chead"><b>🎭 偽裝（藏）</b><span data-r="val"></span><span class="mult" data-r="mult"></span></div>
    <div class="cbar"><div class="fill" data-r="fill"></div></div>
    <div class="cfoot">
      <label class="loss"><input type="checkbox" data-change="toggleLoss"> 承受損失（忍氣吞聲時）</label>
      <button class="btn burst" data-act="burst" disabled>💥 不裝了！</button>
    </div>
    <small class="dim" data-r="note"></small>`;
  const refs = Object.fromEntries([...root.querySelectorAll('[data-r]')].map(e => [e.dataset.r, e]));
  refs.btn = root.querySelector('.burst'); refs.loss = root.querySelector('input'); refs.root = root;
  return refs;
}

export function updateConceal(r, s) {
  const max = CONFIG.conceal.max, v = s.disguise.value, full = disguiseFull(s);
  setText(r.val, `${Math.floor(v)}/${max}`);
  setText(r.mult, `爆發倍率 ×${fmt(chargeMult(s))}（已蓄力 ${Math.floor(s.disguise.chargeMs / 60000)} 分）`);
  r.fill.style.width = (v / max * 100).toFixed(1) + '%';
  r.root.classList.toggle('full', full);
  const ok = canBurst(s);
  r.btn.disabled = !ok;
  r.btn.classList.toggle('ready', ok);
  r.loss.checked = s.settings.loss;
  setText(r.note, !full ? '蓄力中……忍得越多、藏得越久，爆的時候越響。'
    : s.grudges.length ? '蓄力已滿！隨時可以引爆。' : '蓄力已滿，但復仇簿是空的——先等人來嘲諷。');
}
