// 輕量提示訊息（右下角淡出）。相同文字連續出現時合併成「×N」；「新功能／新分頁解鎖」會合併成一則（列出全部名稱），避免洗版蓋住內容。
// #toasts 設為 pointer-events: none（見 style.css），提示不會擋住底下的按鈕。
import { bus } from '../core/events.js';
import { esc } from './dom.js';

const MERGES = [
  { re: /^🔓 新(?:分頁|功能)解鎖：(.+)$/, make: n => `🔓 新功能解鎖：${n.join('、')}` },
  { re: /^🏗 新建築可建造：(.+)$/, make: n => `🏗 新建築可建造：${n.join('、')}` },
];

export function initToasts(root) {
  bus.on('toast', ({ text, kind }) => {
    const last = root.lastElementChild;
    if (last && last._text === text && !last.classList.contains('out')) {
      last._n = (last._n || 1) + 1; last.innerHTML = `${esc(text)} <b class="tcount">×${last._n}</b>`;
      clearTimeout(last._t1); clearTimeout(last._t2);
      last._t1 = setTimeout(() => last.classList.add('out'), 3200); last._t2 = setTimeout(() => last.remove(), 3800);
      return;
    }
    // 同類提示合併成一則（列出全部名稱），避免連續解鎖時洗版蓋住內容
    const m = MERGES.map(g => [g, g.re.exec(text)]).find(([, r]) => r);
    if (m) {
      const [g, r] = m;
      const cur = [...root.children].reverse().find(c => c._merge === g && !c.classList.contains('out'));
      if (cur) {
        if (!cur._names.includes(r[1])) cur._names.push(r[1]);
        cur._text = g.make(cur._names); cur.innerHTML = esc(cur._text);
        clearTimeout(cur._t1); clearTimeout(cur._t2);
        cur._t1 = setTimeout(() => cur.classList.add('out'), 4200); cur._t2 = setTimeout(() => cur.remove(), 4800);
        return;
      }
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el._text = text;
    if (m) { el._merge = m[0]; el._names = [m[1][1]]; el._text = m[0].make(el._names); text = el._text; }
    el.innerHTML = esc(text);
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    el._t1 = setTimeout(() => el.classList.add('out'), 3200);
    el._t2 = setTimeout(() => el.remove(), 3800);
  });
}
