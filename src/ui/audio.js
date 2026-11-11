// 程式合成音效（Web Audio）：不需任何音檔。瀏覽器要求先有使用者手勢才能發聲，
// 沒有 Web Audio 或被靜音時，所有呼叫都安靜略過，不會丟錯。
import { getPrefs } from './prefs.js';

let ctx = null, master = null;

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = getPrefs().volume;
    master.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }
export function applyVolume() { if (master) master.gain.value = getPrefs().volume; }

// 單音：f 頻率、slide 結尾頻率（滑音）、at 延遲秒
function tone(c, { f = 440, type = 'sine', dur = 0.2, vol = 0.25, at = 0, slide = null, attack = 0.005 }) {
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
// 雜訊（打擊感）：濾波中心頻率 f
function noise(c, { dur = 0.2, vol = 0.3, at = 0, f = 1200, q = 0.8 }) {
  const t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const flt = c.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(flt); flt.connect(g); g.connect(master); s.start(t);
}

// 五聲音階（宮商角徵羽），讓連鎖與抽卡聽起來有國風感
const PENTA = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880];
const note = i => PENTA[Math.max(0, Math.min(PENTA.length - 1, i))];

const SFX = {
  click:  c => tone(c, { f: 660, type: 'triangle', dur: 0.08, vol: 0.12 }),
  upgrade: c => { tone(c, { f: note(2), type: 'triangle', dur: 0.12 }); tone(c, { f: note(5), type: 'triangle', dur: 0.2, at: 0.09 }); },
  coin:   c => { tone(c, { f: 1200, type: 'square', dur: 0.06, vol: 0.1 }); tone(c, { f: 1700, type: 'square', dur: 0.12, vol: 0.1, at: 0.05 }); },
  visitor: c => { tone(c, { f: 196, type: 'sine', dur: 0.5, vol: 0.2 }); tone(c, { f: 147, type: 'sine', dur: 0.7, vol: 0.18, at: 0.12 }); },   // 低沉鐘聲
  nemesis: c => { tone(c, { f: 98, type: 'sawtooth', dur: 0.9, vol: 0.22, slide: 70 }); tone(c, { f: 147, type: 'sine', dur: 0.9, vol: 0.18, at: 0.15 }); noise(c, { dur: 0.4, vol: 0.12, f: 250 }); },
  endure: c => { tone(c, { f: 110, type: 'sine', dur: 0.35, vol: 0.3, slide: 60 }); noise(c, { dur: 0.12, vol: 0.12, f: 300 }); },
  show:   c => { tone(c, { f: 400, type: 'sawtooth', dur: 0.25, vol: 0.12, slide: 1600 }); noise(c, { dur: 0.2, vol: 0.1, f: 3000 }); },
  breakthrough: c => { for (let i = 0; i < 5; i++) tone(c, { f: note(i * 2), type: 'triangle', dur: 0.5, vol: 0.18, at: i * 0.12 }); noise(c, { dur: 0.8, vol: 0.08, f: 800, at: 0.1 }); },
  pull:   (c, { r = 0 } = {}) => { for (let i = 0; i <= r; i++) tone(c, { f: note(i * 2), type: 'sine', dur: 0.35, vol: 0.18, at: i * 0.1 }); },
  burstIntro: c => { tone(c, { f: 70, type: 'sine', dur: 0.9, vol: 0.5, slide: 35 }); noise(c, { dur: 0.5, vol: 0.2, f: 150 }); },
  crush:  c => { tone(c, { f: 90, type: 'sine', dur: 0.5, vol: 0.5, slide: 40 }); noise(c, { dur: 0.3, vol: 0.35, f: 900 }); },
  narrow: c => { tone(c, { f: 140, type: 'triangle', dur: 0.3, vol: 0.3, slide: 80 }); noise(c, { dur: 0.15, vol: 0.15, f: 600 }); },
  heartbeat: c => { tone(c, { f: 58, type: 'sine', dur: 0.14, vol: 0.22, slide: 40 }); tone(c, { f: 52, type: 'sine', dur: 0.16, vol: 0.16, slide: 36, at: 0.2 }); },     // 蓄力心跳：兩下低沉的咚咚
  nemesisHit: c => { tone(c, { f: 55, type: 'sawtooth', dur: 1.1, vol: 0.3, slide: 30 }); tone(c, { f: 220, type: 'square', dur: 0.5, vol: 0.08, slide: 110, at: 0.1 }); noise(c, { dur: 0.35, vol: 0.2, f: 300 }); },
  sweep:  c => { [0, 2, 4, 7, 9].forEach((k, i) => tone(c, { f: note(k), type: 'triangle', dur: 0.22, vol: 0.2, at: i * 0.07 })); noise(c, { dur: 0.45, vol: 0.28, f: 900, at: 0.35 }); },
  element: c => { tone(c, { f: 880, type: 'sine', dur: 0.25, vol: 0.14, slide: 1320 }); tone(c, { f: 1320, type: 'triangle', dur: 0.2, vol: 0.1, at: 0.1 }); },
  fail:   c => { tone(c, { f: 220, type: 'sawtooth', dur: 0.5, vol: 0.12, slide: 110 }); },
  chain:  (c, { n = 1 } = {}) => { tone(c, { f: note(n + 1), type: 'triangle', dur: 0.25, vol: 0.22 }); tone(c, { f: note(n + 3), type: 'sine', dur: 0.3, vol: 0.14, at: 0.06 }); },
  fanfare: c => { [0, 2, 4, 5, 7].forEach((k, i) => tone(c, { f: note(k), type: 'triangle', dur: 0.4, vol: 0.2, at: i * 0.13 })); tone(c, { f: note(9), type: 'sine', dur: 0.9, vol: 0.2, at: 0.7 }); },
  backfire: c => { tone(c, { f: 180, type: 'sawtooth', dur: 0.7, vol: 0.25, slide: 40 }); noise(c, { dur: 0.5, vol: 0.3, f: 500 }); },
  goal:   c => { tone(c, { f: note(4), type: 'triangle', dur: 0.15 }); tone(c, { f: note(7), type: 'triangle', dur: 0.15, at: 0.12 }); tone(c, { f: note(9), type: 'triangle', dur: 0.35, at: 0.24 }); },
};

export function sfx(name, opts = {}) {
  if (getPrefs().muted) return;
  const c = ensure(); if (!c) return;
  if (c.state === 'suspended') c.resume();
  const fn = SFX[name];
  if (fn) { try { fn(c, opts); } catch { /* 音效失敗不影響遊戲 */ } }
}
export const SFX_NAMES = Object.keys(SFX);
