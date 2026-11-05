// 畫面總控：每個 frame 只更新有變動的部分。
import { qiPerSec, stonePerSec, realmOf } from '../core/economy.js';
import { fmt, fmtRate } from '../core/format.js';
import { bus } from '../core/events.js';
import { LINES, pickLine } from '../data/lines.js';
import { $, setHTML, setText, RES } from './dom.js';
import { mountScene, updateScene } from './sectView.js';
import { mountConceal, updateConceal } from './concealView.js';
import { buildingPanel } from './buildingPanel.js';
import { realmPanel } from './realmPanel.js';
import { gachaPanel } from './gachaPanel.js';
import { disciplePanel } from './disciplePanel.js';
import { avengePanel } from './avengePanel.js';

const TABS = [
  ['buildings', '🏯 建築'], ['realm', '🧘 境界'], ['gacha', '🎫 招賢'],
  ['disciples', '👥 弟子'], ['avenge', '📖 復仇簿'],
];

export function createRenderer(s, ui) {
  const sceneEl = $('#scene'), concealEl = $('#conceal');
  const sceneRefs = mountScene(sceneEl);
  const concealRefs = mountConceal(concealEl);
  const panelEl = $('#panel'), tabsEl = $('#tabs'), resEl = $('#resbar');
  ui.quote = pickLine(LINES.idle);
  bus.on('quote', t => { ui.quote = t; ui.quoteAt = Date.now(); });

  function render() {
    // 老祖閒聊：久未發言就換一句
    if (Date.now() - (ui.quoteAt || 0) > 25000) { ui.quote = pickLine(LINES.idle); ui.quoteAt = Date.now(); }

    // 資源列
    const r = realmOf(s);
    setHTML(resEl, `
      <div class="res"><span>✨ 靈氣</span><b>${fmt(s.res.qi)}</b><small>+${fmtRate(qiPerSec(s))}</small></div>
      <div class="res"><span>💎 靈石</span><b>${fmt(s.res.stone)}</b><small>+${fmtRate(stonePerSec(s))}</small></div>
      <div class="res"><span>🎫 招賢令</span><b>${fmt(s.res.token)}</b></div>
      <div class="res"><span>🧩 碎片</span><b>${fmt(s.res.shard)}</b></div>
      <div class="res dim" title="轉生系統：之後版本開放"><span>☯️ 道心</span><b>—</b><small>預留</small></div>
      <div class="res realm"><span>境界</span><b>${r.name}</b><small>產出 ×${fmt(r.mult)}</small></div>`);

    updateScene(sceneEl, sceneRefs, s, ui);
    updateConceal(concealRefs, s);

    // 分頁
    setHTML(tabsEl, TABS.map(([id, label]) => {
      const badge = id === 'avenge' && s.grudges.length ? ` <i>${s.grudges.length}</i>` : '';
      const alert = (id === 'avenge' && s.recruits.length) ? ' <i class="new">新</i>' : '';
      return `<button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${label}${badge}${alert}</button>`;
    }).join(''));

    const body = { buildings: buildingPanel, realm: realmPanel, gacha: gachaPanel, disciples: disciplePanel, avenge: avengePanel }[ui.tab];
    setHTML(panelEl, body(s, ui));
  }
  return render;
}
