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
};

import { fmt } from '../core/format.js';
// 成本標籤：不足的資源標紅
export function costChips(s, cost) {
  return Object.entries(cost).map(([k, v]) =>
    `<span class="chip ${s.res[k] >= v ? '' : 'lack'}">${RES[k].icon}${fmt(v)}</span>`).join('');
}

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
