// 輕量提示訊息（右下角淡出）
import { bus } from '../core/events.js';
import { esc } from './dom.js';

export function initToasts(root) {
  bus.on('toast', ({ text, kind }) => {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = esc(text);
    root.appendChild(el);
    while (root.children.length > 5) root.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3800);
  });
}
