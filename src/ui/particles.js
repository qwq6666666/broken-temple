// Canvas 粒子引擎：兩個圖層——全景環境（靈氣光點）與全螢幕特效（爆發、匯聚、光柱）。
// 只在有粒子或環境光點時才跑 requestAnimationFrame；背景分頁自動暫停；「減少動態效果」時全部不畫。
import { motionOK } from './fx.js';

// 單顆粒子推進一步（純函式，方便測試）。回傳是否仍存活。
export function stepParticle(p, dt) {
  p.life -= dt;
  if (p.life <= 0) return false;
  if (p.tx !== undefined) {                       // 匯聚：朝目標加速靠近
    const k = 1 - p.life / p.max;
    p.x = p.sx + (p.tx - p.sx) * (k * k * (3 - 2 * k));
    p.y = p.sy + (p.ty - p.sy) * (k * k * (3 - 2 * k));
  } else {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.g || 0) * dt;                      // 重力（負值＝上飄）
    p.vx *= 1 - (p.drag || 0) * dt; p.vy *= 1 - (p.drag || 0) * dt;
  }
  return true;
}
// 環境光點數量：隨每秒靈氣的數量級緩增，手機版上限較低
export const moteCount = (qiPerSec, mobile = false) =>
  Math.round(Math.min(mobile ? 14 : 30, 8 + Math.log10(Math.max(1, qiPerSec)) * 5));

class Layer {
  constructor(canvas, ambient = false) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.ps = []; this.motes = []; this.ambient = ambient;
    this.running = false; this.dpr = 1; this.w = 0; this.h = 0; this.target = 12;
    this.resize();
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  add(p) { if (!motionOK()) return; this.ps.push(p); this.start(); }
  start() {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  }
  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    if (this.ambient && motionOK()) this.stepMotes(dt);
    this.ps = this.ps.filter(p => stepParticle(p, dt));
    for (const p of this.ps) this.draw(p);
    ctx.globalCompositeOperation = 'source-over';
    if (this.ps.length || (this.ambient && motionOK())) requestAnimationFrame(t2 => this.frame(t2));
    else { this.running = false; ctx.clearRect(0, 0, this.w, this.h); }
  }
  draw(p) {
    const { ctx } = this, a = Math.max(0, Math.min(1, p.life / p.max)) * (p.alpha ?? 1);
    ctx.globalAlpha = a;
    if (p.type === 'ray') {                       // 光線：由中心向外的細長線
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * p.len, p.y + Math.sin(p.angle) * p.len); ctx.stroke();
    } else if (p.glyph) {
      ctx.font = `${p.size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(p.glyph, p.x, p.y);
    } else {
      const r = p.size * (p.shrink ? a : 1);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
      g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.2, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 環境光點：緩慢上飄、左右搖擺，出界後從下方重生
  stepMotes(dt) {
    while (this.motes.length < this.target) this.motes.push(this.newMote(true));
    if (this.motes.length > this.target) this.motes.length = this.target;
    const { ctx } = this;
    for (const m of this.motes) {
      m.t += dt; m.y -= m.vy * dt; m.x += Math.sin(m.t * m.sp + m.ph) * 8 * dt;
      if (m.y < -10) Object.assign(m, this.newMote(false));
      ctx.globalAlpha = (0.25 + 0.25 * Math.sin(m.t * 1.5 + m.ph)) * Math.min(1, m.y / 60 + 0.3);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3);
      g.addColorStop(0, m.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  newMote(anywhere) {
    return { x: Math.random() * this.w, y: anywhere ? Math.random() * this.h : this.h + 10, vy: 6 + Math.random() * 12,
             r: 1.5 + Math.random() * 2, t: Math.random() * 10, sp: 0.5 + Math.random(), ph: Math.random() * 6,
             color: Math.random() < 0.7 ? 'rgba(143,207,168,1)' : 'rgba(217,182,74,1)' };
  }
}

let ambientLayer = null, fxLayer = null;

// 初始化：scene 內的環境圖層 + 固定全螢幕特效圖層
export function initParticles(sceneEl) {
  const amb = document.createElement('canvas'); amb.className = 'ambient'; sceneEl.prepend(amb);
  const fx = document.createElement('canvas'); fx.className = 'fxcanvas'; document.body.appendChild(fx);
  ambientLayer = new Layer(amb, true); fxLayer = new Layer(fx, false);
  const fit = () => { ambientLayer.resize(); fxLayer.resize(); };
  addEventListener('resize', fit);
  if (globalThis.ResizeObserver) new ResizeObserver(() => ambientLayer.resize()).observe(sceneEl);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { ambientLayer.start(); } });
  ambientLayer.start();
}
export function setAmbientIntensity(qiPerSec) {
  if (!ambientLayer) return;
  ambientLayer.target = moteCount(qiPerSec, innerWidth <= 860);
  ambientLayer.start();
}

const rnd = (a, b) => a + Math.random() * (b - a);
// 在 (x,y)（視窗座標）放射狀迸發
export function burstAt(x, y, { color = 'rgba(217,182,74,1)', n = 16, speed = 140, size = 3, life = 0.8, glyph = null } = {}) {
  if (!fxLayer) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.2832, v = rnd(speed * 0.4, speed);
    fxLayer.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 120, drag: 1.5, life: life * rnd(0.7, 1.2), max: life, size, color, shrink: true, glyph });
  }
}
// 從四周（或指定起點）匯聚到目標
export function converge(fx, fy, tx, ty, { color = 'rgba(143,207,168,1)', n = 12, size = 3, life = 0.7, spread = 60 } = {}) {
  if (!fxLayer) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.2832, d = rnd(spread * 0.5, spread);
    const sx = fx + Math.cos(a) * d, sy = fy + Math.sin(a) * d, l = life * rnd(0.8, 1.2);
    fxLayer.add({ x: sx, y: sy, sx, sy, tx, ty, life: l, max: l, size, color, shrink: true });
  }
}
// 全螢幕光芒（抽卡高稀有度）：由中心向外放射的光線
export function rays(color, n = 28) {
  if (!fxLayer) return;
  const cx = fxLayer.w / 2, cy = fxLayer.h / 2;
  for (let i = 0; i < n; i++) {
    const l = rnd(0.7, 1.3);
    fxLayer.add({ type: 'ray', x: cx, y: cy, angle: (i / n) * 6.2832 + rnd(-0.1, 0.1), len: Math.max(fxLayer.w, fxLayer.h) * rnd(0.5, 0.9),
                  size: rnd(1, 3), vx: 0, vy: 0, life: l, max: l, color, alpha: 0.7 });
  }
}
export const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
