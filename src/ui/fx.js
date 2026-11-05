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
