// 啟動入口：建立狀態、綁定 UI、啟動固定 tick 迴圈。
import { CONFIG } from './config.js';
import { createState } from './core/state.js';
import { load, save } from './core/save.js';
import { applyOffline } from './core/offline.js';
import { showWelcome } from './ui/overlay.js';
import { guard } from './ui/saveMenu.js';
import { toast, bus } from './core/events.js';
import { sfx } from './ui/audio.js';
import { startLoop } from './core/loop.js';
import * as economy from './core/economy.js';
import * as conceal from './core/conceal.js';
import * as endure from './core/endure.js';
import * as goals from './core/goals.js';
import * as incidents from './core/incidents.js';
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
const ui = { tab: 'buildings', lastPull: null, quote: '', quoteAt: 0, busy: false };

bus.on('cue', ({ name, data }) => sfx(name, data || {}));   // core 的提示音
initToasts(document.getElementById('toasts'));
const render = createRenderer(state, ui);
bindActions(state, ui, render);

// 每個固定 tick：產出 → 偽裝/成長 → 訪客
function onTick(dt) {
  economy.tick(state, dt);
  conceal.tick(state, dt);
  endure.tick(state);
  incidents.tick(state);
  goals.tick(state);
}
startLoop(onTick, render);
render();

// 自動存檔：定時、切到背景、關閉頁面
const autosave = () => { if (!guard.noSave) save(state); };
setInterval(autosave, CONFIG.save.autosaveMs);
document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
addEventListener('beforeunload', autosave);
if (loaded && loaded.error) toast('存檔損壞，已開始新遊戲：' + loaded.error, 'warn');
if (welcome) showWelcome(welcome);

window.__game = { state, ui, CONFIG };   // 方便在 console 除錯，例如 __game.state.res.stone = 999
