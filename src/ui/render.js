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
import { goalPanel } from './goalPanel.js';
import { nemesisPanel } from './nemesisPanel.js';
import { daoPanel } from './daoPanel.js';
import { isUnlocked, nextStep } from '../core/progress.js';
import { getPrefs } from './prefs.js';
import { GOALS } from '../data/goals.js';

const TABS = [
  ['buildings', '🏯 建築'], ['realm', '🧘 境界'], ['gacha', '🎫 招賢'],
  ['disciples', '👥 弟子'], ['avenge', '📖 復仇簿'], ['nemesis', '⚔️ 宿敵錄'], ['dao', '☯️ 道心'], ['goals', '🎯 大事'],
];

export function createRenderer(s, ui) {
  const sceneEl = $('#scene'), concealEl = $('#conceal');
  const sceneRefs = mountScene(sceneEl);
  const concealRefs = mountConceal(concealEl);
  const panelEl = $('#panel'), tabsEl = $('#tabs'), resEl = $('#resbar'), hintEl = $('#hint');
  ui.quote = pickLine(LINES.idle);
  bus.on('quote', t => { ui.quote = t; ui.quoteAt = Date.now(); });

  function render() {
    // 老祖閒聊：久未發言就換一句
    if (Date.now() - (ui.quoteAt || 0) > 25000) { ui.quote = pickLine(LINES.idle); ui.quoteAt = Date.now(); }

    // 資源列
    const r = realmOf(s);
    const show = {
      token: s.unlocked.gacha || s.res.token > 0,
      shard: s.res.shard > 0 || s.disciples.length > 0,
      dao: s.unlocked.dao || s.res.daoHeart > 0,
    };
    setHTML(resEl, `
      <div class="res"><span>✨ 靈氣</span><b>${fmt(s.res.qi)}</b><small>+${fmtRate(qiPerSec(s))}</small></div>
      <div class="res"><span>💎 靈石</span><b>${fmt(s.res.stone)}</b><small>${stonePerSec(s) > 0 ? '+' + fmtRate(stonePerSec(s)) : '建煉丹房產出'}</small></div>
      ${show.token ? `<div class="res"><span>🎫 招賢令</span><b>${fmt(s.res.token)}</b></div>` : ''}
      ${show.shard ? `<div class="res"><span>🧩 碎片</span><b>${fmt(s.res.shard)}</b></div>` : ''}
      ${show.dao ? `<div class="res"><span>☯️ 道心</span><b>${fmt(s.res.daoHeart)}</b><small>${s.reincarnation.count ? '轉生 ' + s.reincarnation.count + ' 次' : '化神後可轉生'}</small></div>` : ''}
      <div class="res realm"><span>境界</span><b>${r.name}</b><small>產出 ×${fmt(r.mult)}</small></div>`);

    // 下一步提示（可關閉；在「說明」裡重新開啟）
    const hint = getPrefs().hints ? nextStep(s) : null;
    setHTML(hintEl, hint ? `<span class="hbulb">💡 下一步</span><span class="htext">${hint.text}</span>${hint.tab ? `<button class="btn mini" data-act="tab" data-tab="${hint.tab}">前往</button>` : ''}<button class="hx" data-act="hideHints" title="隱藏提示">✕</button>` : '');

    updateScene(sceneEl, sceneRefs, s, ui);
    updateConceal(concealRefs, s);

    // 分頁
    if (!isUnlocked(s, ui.tab)) ui.tab = 'buildings';
    setHTML(tabsEl, TABS.filter(([id]) => isUnlocked(s, id)).map(([id, label]) => {
      const badge = id === 'avenge' && s.grudges.length ? ` <i>${s.grudges.length}</i>` : '';
      const alert = (id === 'avenge' && s.recruits.length) ? ' <i class="new">新</i>' : (id === 'goals' ? ` <i class="prog">${s.goalsDone.length}/${GOALS.length}</i>` : '');
      return `<button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}">${label}${badge}${alert}</button>`;
    }).join(''));

    const body = { buildings: buildingPanel, realm: realmPanel, gacha: gachaPanel, disciples: disciplePanel, avenge: avengePanel, goals: goalPanel, nemesis: nemesisPanel, dao: daoPanel }[ui.tab];
    setHTML(panelEl, body(s, ui));
  }
  return render;
}
