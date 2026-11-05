// 啟動入口：建立狀態、綁定 UI、啟動固定 tick 迴圈。
import { CONFIG } from './config.js';
import { createState } from './core/state.js';
import { startLoop } from './core/loop.js';
import * as economy from './core/economy.js';
import * as conceal from './core/conceal.js';
import * as endure from './core/endure.js';
import { createRenderer } from './ui/render.js';
import { bindActions } from './ui/actions.js';
import { initToasts } from './ui/toast.js';

// 除錯：?speed=10 讓遊戲時間快 10 倍
const speed = Number(new URLSearchParams(location.search).get('speed'));
if (speed > 0) CONFIG.debug.timeScale = speed;

const state = createState();
const ui = { tab: 'buildings', lastPull: null, quote: '', quoteAt: 0, busy: false };

initToasts(document.getElementById('toasts'));
const render = createRenderer(state, ui);
bindActions(state, ui, render);

// 每個固定 tick：產出 → 偽裝/成長 → 訪客
function onTick(dt) {
  economy.tick(state, dt);
  conceal.tick(state, dt);
  endure.tick(state);
}
startLoop(onTick, render);
render();

window.__game = { state, ui, CONFIG };   // 方便在 console 除錯，例如 __game.state.res.stone = 999
