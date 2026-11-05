// 固定 tick 主迴圈：以真實時間差累積，每 100ms 跑一次 tick。
// 分頁在背景被節流時，回來會一次補上時間差；過多的 tick 合併成單一大 tick（所有產出都與 dt 成線性）。
import { CONFIG } from '../config.js';

export function startLoop(onTick, onFrame, onGap) {
  let last = performance.now();
  let acc = 0;
  function frame() {
    const now = performance.now();
    const raw = now - last;
    last = now;
    // 間隔過長（背景凍結、休眠）：交給離線收益結算，不再逐 tick 補跑（也避免超過上限的時間被丟掉）
    if (onGap && raw >= CONFIG.offline.gapMs) { acc = 0; onGap(raw); onFrame(); return; }
    const delta = Math.min(raw, CONFIG.maxFrameMs);
    acc += delta;
    const scale = CONFIG.debug.timeScale;
    let steps = 0;
    while (acc >= CONFIG.tickMs && steps < CONFIG.maxCatchupTicks) {
      onTick(CONFIG.tickMs * scale);
      acc -= CONFIG.tickMs; steps++;
    }
    if (acc >= CONFIG.tickMs) { onTick(acc * scale); acc = 0; }   // 合併剩餘
    onFrame();
  }
  const id = setInterval(frame, CONFIG.tickMs);
  // 分頁重新可見時立刻補算一次
  document.addEventListener('visibilitychange', () => { if (!document.hidden) frame(); });
  return () => clearInterval(id);
}
