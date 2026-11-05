// 視覺特效：震動、閃白、粒子、橫幅、數字滾動。尊重「減少動態效果」偏好。
import { getPrefs } from './prefs.js';

export const motionOK = () => !getPrefs().reduceMotion;

export function shake(el, ms = 450) {
  if (!el || !motionOK()) return;
  el.classList.remove('shaking'); void el.offsetWidth;      // 重新觸發動畫
  el.classList.add('shaking'); setTimeout(() => el.classList.remove('shaking'), ms);
}
export function flash(parent, color = '#fff') {
  if (!parent || !motionOK()) return;
  const d = document.createElement('div'); d.className = 'flashfx'; d.style.background = color;
  parent.appendChild(d); setTimeout(() => d.remove(), 500);
}
export function particles(parent, emojis, n = 14) {
  if (!parent || !motionOK()) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span'); p.className = 'particle';
    p.textContent = emojis[i % emojis.length];
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    parent.appendChild(p); setTimeout(() => p.remove(), 1800);
  }
}
export function banner(parent, text, cls = '') {
  if (!parent) return;
  const b = document.createElement('div'); b.className = 'banner ' + cls; b.textContent = text;
  parent.appendChild(b); setTimeout(() => b.remove(), 1700);
}
// 數字滾動：到達 to 後以 fmtFn 顯示
export function countUp(el, to, fmtFn, ms = 900) {
  if (!motionOK()) { el.textContent = fmtFn(to); return; }
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3;
    el.textContent = fmtFn(to * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 殘影退場：在元素被移除前複製一份固定在原位，播放退場動畫（cls）後移除。
// 用於訪客卡／事件卡：點選後狀態會立刻改變畫面，這樣仍能看到「離場」的動作。
export function ghostOut(selector, cls, ms = 650) {
  const el = document.querySelector(selector);
  if (!el || !motionOK()) return null;
  const r = el.getBoundingClientRect(), g = el.cloneNode(true);
  g.classList.add('ghost', cls);
  Object.assign(g.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: '0', zIndex: '88', pointerEvents: 'none' });
  g.querySelectorAll('[data-act]').forEach(b => b.removeAttribute('data-act'));
  document.body.appendChild(g); setTimeout(() => g.remove(), ms);
  return r;
}
// 按鈕水波紋
export function ripple(btn, clientX, clientY) {
  if (!motionOK() || btn.disabled) return;
  const r = btn.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'ripple'; s.style.left = (clientX - r.left) + 'px'; s.style.top = (clientY - r.top) + 'px';
  btn.appendChild(s); setTimeout(() => s.remove(), 600);
}
// 臨時加 class 播一次動畫
export function pulse(el, cls, ms = 600) {
  if (!el || !motionOK()) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
// 浮動文字（相對 parent，座標為 parent 內）
export function floatText(parent, text, x, y, cls = '') {
  if (!parent || !motionOK()) return;
  const f = document.createElement('span'); f.className = 'float ' + cls; f.textContent = text;
  f.style.left = x + 'px'; f.style.top = y + 'px'; parent.appendChild(f); setTimeout(() => f.remove(), 950);
}
