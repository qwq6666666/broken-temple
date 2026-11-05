// DOM 小工具：只在內容改變時才寫入，避免每 tick 重建節點導致按鈕點擊失效。
export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function setHTML(el, html) {
  if (el._h !== html) { el.innerHTML = html; el._h = html; }
}
export function setText(el, text) {
  if (el._t !== text) { el.textContent = text; el._t = text; }
}

export const RES = {
  qi: { name: '靈氣', icon: '✨' },
  stone: { name: '靈石', icon: '💎' },
  token: { name: '招賢令', icon: '🎫' },
  shard: { name: '碎片', icon: '🧩' },
  daoHeart: { name: '道心', icon: '☯️' },
  merit: { name: '功勳', icon: '🏅' },
  ...Object.fromEntries(Object.entries(MATERIALS).map(([id, m]) => [matKey(id), m])),
};

import { fmt } from '../core/format.js';
import { MATERIALS, matKey } from '../data/materials.js';
// 成本標籤：不足的資源標紅
export function costChips(s, cost) {
  return Object.entries(cost).map(([k, v]) =>
    `<span class="chip ${s.res[k] >= v ? '' : 'lack'}">${RES[k].icon}${fmt(v)}</span>`).join('');
}

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 精簡列：一行顯示圖示、標題、副標與操作；點整列（按鈕以外）展開詳情。各頁共用，狀態存在 ui.rowOpen。
// title / badges / sub / act / detail 都是已跳脫的 HTML 字串。
export function crow(ui, { key, cls = '', icon, title, badges = '', sub = '', act = '', detail = '' }) {
  const open = !!(ui.rowOpen && ui.rowOpen[key]);
  const can = !!detail;
  return `<div class="crow ${cls} ${open ? 'open' : ''}">
    <div class="cmain" ${can ? `data-act="toggleRow" data-key="${key}" role="button" tabindex="0" aria-expanded="${open}"` : ''}>
      <span class="ci">${icon}</span>
      <div class="cm"><div class="ct">${title}${badges}</div>${sub ? `<div class="cs">${sub}</div>` : ''}</div>
      ${act ? `<div class="ca">${act}</div>` : ''}${can ? `<span class="cx">${open ? '▴' : '▾'}</span>` : ''}
    </div>${open && can ? `<div class="cdetail">${detail}</div>` : ''}</div>`;
}
