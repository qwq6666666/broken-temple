// 啟動入口：建立狀態、綁定 UI、啟動固定 tick 迴圈。
import { CONFIG } from './config.js';
import { createState } from './core/state.js';
import { load, save } from './core/save.js';
import { applyOffline } from './core/offline.js';
import { showWelcome, showHelp } from './ui/overlay.js';
import { guard } from './ui/saveMenu.js';
import { toast, bus } from './core/events.js';
import { sfx } from './ui/audio.js';
import { pulse, shake } from './ui/fx.js';
import { burstAt, centerOf } from './ui/particles.js';
import { startLoop } from './core/loop.js';
import * as economy from './core/economy.js';
import * as conceal from './core/conceal.js';
import * as endure from './core/endure.js';
import * as goals from './core/goals.js';
import * as ascend from './core/ascend.js';
import * as commissions from './core/commissions.js';
import * as achievements from './core/achievements.js';
import * as glory from './core/glory.js';
import * as progress from './core/progress.js';
import * as incidents from './core/incidents.js';
import * as expeditions from './core/expeditions.js';
import { createRenderer } from './ui/render.js';
import { bindActions } from './ui/actions.js';
import { initToasts } from './ui/toast.js';

// 除錯：?speed=10 讓遊戲時間快 10 倍
const speed = Number(new URLSearchParams(location.search).get('speed'));
if (speed > 0) CONFIG.debug.timeScale = speed;

// 讀檔 → 離線收益 → 開始遊戲（壞檔不閃退，改開新局並提示）
const loaded = load();
let state, welcome = null;
if (loaded && loaded.state) {
  state = loaded.state;
  welcome = applyOffline(state, Date.now() - loaded.savedAt);
} else state = createState();
progress.tick(state, true);     // 舊存檔：已達成的條件直接解鎖，不彈提示
const ui = { tab: 'buildings', lastPull: null, quote: '', quoteAt: 0, busy: false };

bus.on('cue', ({ name, data }) => {
  sfx(name, data || {});                                            // core 的提示音
  if (name === 'buildingUp') {                                      // 升級：建築彈跳 + 金色迸發
    const t = document.querySelector(`.bld[data-id=${data.id}]`);
    if (t) { t._pop = true; pulse(t, 'popup', 700); setTimeout(() => { t._pop = false; }, 700); const c = centerOf(t); burstAt(c.x, c.y, { n: data.stage ? 30 : 16, speed: data.stage ? 220 : 140 }); }
  } else if (name === 'nemesis') { shake(document.getElementById('scene')); }       // 宿敵現身：全景震動
});
initToasts(document.getElementById('toasts'));
const render = createRenderer(state, ui);
bindActions(state, ui, render);

// 每個固定 tick：產出 → 偽裝/成長 → 訪客
function onTick(dt) {
  if (ui.introOpen) { state.visitor.nextAt = Math.max(state.visitor.nextAt, state.t + 5000); state.incident.nextAt = Math.max(state.incident.nextAt, state.t + 5000); }   // 開場介紹開著時不來訪客與事件
  economy.tick(state, dt);
  conceal.tick(state, dt);
  endure.tick(state);
  incidents.tick(state);
  expeditions.tick(state);
  goals.tick(state);
  ascend.tick(state);
  commissions.tick(state);
  achievements.tick(state);
  glory.tick(state);
  progress.tick(state);
}
// 分頁被凍結或電腦休眠超過 5 分鐘：以離線收益結算（演出中只顯示提示，避免蓋掉演出）
function onGap(ms) {
  const r = applyOffline(state, ms);
  if (!r) return;
  if (ui.busy) toast('剛才離開了一陣子，已補算離線收益', 'good'); else showWelcome(r);
}
// 網址加 ?perf：每 5 秒在 console 印出 render 與 tick 的平均／最大耗時（毫秒），用來檢查效能
const PERF = new URLSearchParams(location.search).has('perf');
const perfStat = { r: [], t: [] };
const timed = (name, fn) => (...a) => { const t0 = performance.now(); const out = fn(...a); perfStat[name].push(performance.now() - t0); return out; };
if (PERF) setInterval(() => {
  const f = k => { const v = perfStat[k].splice(0); return v.length ? `${k} 平均 ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}ms 最大 ${Math.max(...v).toFixed(2)}ms（${v.length} 次）` : `${k} 無資料`; };
  console.log('[perf]', f('r'), '｜', f('t'));
}, 5000);
startLoop(PERF ? timed('t', onTick) : onTick, PERF ? timed('r', render) : render, onGap);
render();

// 自動存檔：定時、切到背景、關閉頁面
const autosave = () => { if (!guard.noSave) save(state); };
setInterval(autosave, CONFIG.save.autosaveMs);
document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
addEventListener('beforeunload', autosave);
// 偵測其他分頁寫入存檔：這個分頁停止自動存檔，避免互相覆蓋
addEventListener('storage', e => {
  if (e.key !== CONFIG.save.key || guard.noSave) return;
  guard.noSave = true;
  const b = document.getElementById('banner');
  b.innerHTML = '⚠ 偵測到另一個分頁也在玩這款遊戲，這個分頁已<b>暫停存檔</b>以免互相覆蓋。 <button class="btn mini" onclick="location.reload()">載入最新進度</button>';
  b.classList.add('on');
});
if (loaded && loaded.error) toast('存檔損壞，已開始新遊戲：' + loaded.error, 'warn');
if (welcome) showWelcome(welcome);
else if (!state.seenIntro && state.realmIdx === 0 && !state.stats.bursts) { ui.introOpen = true; showHelp(true).finally?.(() => { ui.introOpen = false; }); }   // 第一次進來：開場說明
state.seenIntro = true;

window.__game = { state, ui, CONFIG };   // 方便在 console 除錯，例如 __game.state.res.stone = 999
