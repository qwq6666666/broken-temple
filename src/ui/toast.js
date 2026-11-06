// 輕量提示訊息（右下角淡出）。相同文字連續出現時合併成「×N」，避免洗版。
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
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el._text = text;
    el.innerHTML = esc(text);
    root.appendChild(el);
    while (root.children.length > 5) root.firstChild.remove();
    el._t1 = setTimeout(() => el.classList.add('out'), 3200);
    el._t2 = setTimeout(() => el.remove(), 3800);
  });
}
