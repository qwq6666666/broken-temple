// 輕量提示訊息（右下角淡出）。相同文字連續出現時合併成「×N」；「新功能／新分頁解鎖」會合併成一則（列出全部名稱），避免洗版蓋住內容。
// #toasts 設為 pointer-events: none（見 style.css），提示不會擋住底下的按鈕。
import { bus } from '../core/events.js';
import { esc } from './dom.js';

export function initToasts(root) {
  bus.on('toast', ({ text, kind }) => {
    const last = root.lastElementChild;
    if (last && last._text === text && !last.classList.contains('out')) {
      last._n = (last._n || 1) + 1; last.innerHTML = `${esc(text)} <b class="tcount">×${last._n}</b>`;
      clearTimeout(last._t1); clearTimeout(last._t2);
      last._t1 = setTimeout(() => last.classList.add('out'), 3200); last._t2 = setTimeout(() => last.remove(), 3800);
      return;
    }
    // 解鎖提示合併：同一段時間內的「🔓 新功能解鎖：A」「🔓 新分頁解鎖：B」→「🔓 新功能解鎖：A、B」
    const um = /^🔓 新(?:分頁|功能)解鎖：(.+)$/.exec(text);
    if (um) {
      const cur = [...root.children].reverse().find(c => c._unlock && !c.classList.contains('out'));
      if (cur) {
        if (!cur._unlock.includes(um[1])) cur._unlock.push(um[1]);
        cur._text = `🔓 新功能解鎖：${cur._unlock.join('、')}`; cur.innerHTML = esc(cur._text);
        clearTimeout(cur._t1); clearTimeout(cur._t2);
        cur._t1 = setTimeout(() => cur.classList.add('out'), 4200); cur._t2 = setTimeout(() => cur.remove(), 4800);
        return;
      }
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el._text = text;
    if (um) { el._unlock = [um[1]]; el._text = `🔓 新功能解鎖：${um[1]}`; text = el._text; }
    el.innerHTML = esc(text);
    root.appendChild(el);
    while (root.children.length > 5) root.firstChild.remove();
    el._t1 = setTimeout(() => el.classList.add('out'), 3200);
    el._t2 = setTimeout(() => el.remove(), 3800);
  });
}
