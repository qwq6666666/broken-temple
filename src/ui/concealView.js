// 藏：偽裝值蓄力條（滿格發光）、蓄力倍率、「不裝了」鈕、承受損失開關。
// 骨架只建一次，之後直接改屬性，避免按鈕被重建。
import { CONFIG } from '../config.js';
import { chargeMult, disguiseFull } from '../core/conceal.js';
import { canBurst, previewBurst } from '../core/burst.js';
import { fmt } from '../core/format.js';
import { nextExpose } from '../core/endure.js';
import { setText, setHTML, esc } from './dom.js';
import { REALMS } from '../data/realms.js';
import { outerView, trumpCards } from '../core/cards.js';
import { sfx } from './audio.js';

// 蓄力心跳：偽裝值 70% 起，每隔一段時間咚咚兩聲，越滿越快（與畫面暗角的脈動同步節奏）。不在演出中、分頁隱藏時不播
let hbOn = false;
function heartbeat() {
  const ch = parseFloat(document.body.style.getPropertyValue('--charge')) || 0;
  if (ch < 0.7) { hbOn = false; return; }
  if (!document.hidden && !document.getElementById('overlay')?.classList.contains('on')) sfx('heartbeat');
  setTimeout(heartbeat, (2.6 - ch * 1.4) * 1000);
}

export function mountConceal(root) {
  root.innerHTML = `
    <details class="cview" data-r="cview"><summary data-r="csum"></summary><div data-r="clist"></div></details>
    <div class="chead"><b>🎭 偽裝（藏）</b><span data-r="val"></span><span class="mult" data-r="mult"></span></div>
    <div class="cbar"><div class="fill" data-r="fill"></div></div>
    <div class="cfoot">
      <label class="loss"><input type="checkbox" data-change="toggleLoss"> 承受損失</label>
      <button class="btn burst" data-act="burst" disabled>💥 不裝了！</button>
    </div>
    <small class="dim" data-r="note"></small>`;
  const refs = Object.fromEntries([...root.querySelectorAll('[data-r]')].map(e => [e.dataset.r, e]));
  refs.btn = root.querySelector('.burst'); refs.loss = root.querySelector('input'); refs.root = root;
  return refs;
}

export function updateConceal(r, s) {
  const max = CONFIG.conceal.max, v = s.disguise.value, full = disguiseFull(s);
  { const cards = trumpCards(s);                                                     // 雙面板：外界認知（偽裝出來的）與實際底牌
    setText(r.csum, `🎭 外界認知：${outerView(s)}　🃏 底牌 ${cards.length} 張`);
    setHTML(r.clist, `<small class="dim">實際底蘊：${esc(REALMS[s.realmIdx].name)}（產出 ×${fmt(REALMS[s.realmIdx].mult)}）。外界只知道你是「${esc(outerView(s))}」。</small>` + (cards.length ? cards.map(c => `<div class="tcard"><span>${c.icon}</span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></div>`).join('') : '<small class="dim">還沒有底牌——標記仇人、派駐 UR、裝備法寶都會算。</small>')); }
  const over = Math.max(0, Math.floor(v) - max);
  setText(r.val, over ? `${Math.floor(v)}/${max}　🔥超載 +${over}` : `${Math.floor(v)}/${max}`);
  r.root.classList.toggle('over', over > 0);
  setText(r.mult, `×${fmt(chargeMult(s))}・蓄力 ${Math.floor(s.disguise.chargeMs / 60000)} 分`);
  r.fill.style.width = (Math.min(v, max) / max * 100).toFixed(1) + '%';
  r.root.classList.toggle('full', full);
  // 蓄力暗角：偽裝值越滿，畫面邊緣越暗、越紅，並隨心跳脈動（只在值變化時更新 CSS 變數）
  const ch = Math.round(Math.min(1, v / max) * 50) / 50;
  if (r._ch !== ch) { r._ch = ch; document.body.style.setProperty('--charge', String(ch)); document.body.classList.toggle('charge-high', ch >= 0.7); }
  document.body.classList.toggle('charge-full', full);
  if (ch >= 0.7 && !hbOn) { hbOn = true; setTimeout(heartbeat, 800); }
  const ok = canBurst(s);
  r.btn.disabled = !ok;
  const pv = ok ? previewBurst(s) : null;
  setText(r.btn, pv ? `💥 不裝了！預計 ${pv.chain} 人・連鎖 ×${pv.chainMult}` : '💥 不裝了！');
  r.btn.classList.toggle('ready', ok);
  r.loss.checked = s.settings.loss;
  setText(r.note, over ? `超載中：爆發 +${Math.round(over * CONFIG.overload.perPoint * 100)}%，但再忍有 ${Math.round(nextExpose(s) * 100)}% 機率露餡（偽裝值 −${CONFIG.overload.exposeDrop}）`
    : !full ? '蓄力中：忍得越多、藏得越久，爆得越響。'
    : !s.grudges.length ? '蓄力已滿，但復仇簿是空的。'
    : s.visitor.current ? '蓄力已滿，先處理眼前的訪客。'
    : '蓄力已滿，隨時可以引爆。');
}
