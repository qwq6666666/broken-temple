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
import { factionPanel } from './factionPanel.js';
import { isUnlocked, nextStep } from '../core/progress.js';
import { getPrefs } from './prefs.js';
import { initParticles, setAmbientIntensity } from './particles.js';
import { pulse, floatText } from './fx.js';
import { GOALS } from '../data/goals.js';

const TABS = [
  ['buildings', '🏯 建築'], ['realm', '🧘 境界'], ['gacha', '🎫 招賢'],
  ['disciples', '👥 弟子'], ['avenge', '📖 復仇簿'], ['factions', '🏴 勢力'], ['nemesis', '⚔️ 宿敵錄'], ['dao', '☯️ 道心'], ['goals', '🎯 大事'],
];

export function createRenderer(s, ui) {
  const sceneEl = $('#scene'), concealEl = $('#conceal');
  const sceneRefs = mountScene(sceneEl);
  initParticles(sceneEl);
  const concealRefs = mountConceal(concealEl);
  const panelEl = $('#panel'), tabsEl = $('#tabs'), resEl = $('#resbar'), hintEl = $('#hint');
  // 資源列骨架
  resEl.innerHTML = [['qi', '✨ 靈氣'], ['stone', '💎 靈石'], ['token', '🎫 招賢令'], ['shard', '🧩 碎片'], ['dao', '☯️ 道心'], ['realm', '境界']]
    .map(([k, l]) => `<div class="res ${k === 'realm' ? 'realm' : ''}" data-k="${k}"><span>${l}</span><b></b><small></small></div>`).join('');
  const resRefs = Object.fromEntries([...resEl.children].map(e => [e.dataset.k, { root: e, b: e.querySelector('b'), sm: e.querySelector('small'), prev: null }]));
  ui.quote = pickLine(LINES.idle);
  bus.on('quote', t => { ui.quote = t; ui.quoteAt = Date.now(); });

  function render() {
    // 老祖閒聊：久未發言就換一句
    if (Date.now() - (ui.quoteAt || 0) > 25000) { ui.quote = pickLine(LINES.idle); ui.quoteAt = Date.now(); }

    // 資源列：節點只建一次，只更新文字；數值突然增減時閃一下並飄出變化量
    const r = realmOf(s);
    const rows = {
      qi:    { show: true, v: s.res.qi, sub: '+' + fmtRate(qiPerSec(s)), rate: qiPerSec(s) },
      stone: { show: true, v: s.res.stone, sub: stonePerSec(s) > 0 ? '+' + fmtRate(stonePerSec(s)) : '建煉丹房產出', rate: stonePerSec(s) },
      token: { show: s.unlocked.gacha || s.res.token > 0, v: s.res.token, sub: '', rate: 0 },
      shard: { show: s.res.shard > 0 || s.disciples.length > 0, v: s.res.shard, sub: '', rate: 0 },
      dao:   { show: s.unlocked.dao || s.res.daoHeart > 0, v: s.res.daoHeart, sub: s.reincarnation.count ? '轉生 ' + s.reincarnation.count + ' 次' : '化神後可轉生', rate: 0 },
    };
    for (const [k, row] of Object.entries(rows)) {
      const el = resRefs[k]; el.root.style.display = row.show ? '' : 'none';
      setText(el.b, fmt(row.v)); setText(el.sm, row.sub);
      const d = row.v - el.prev;
      if (el.prev !== null && row.show) {
        if (d > Math.max(1, row.rate * 0.6)) { pulse(el.root, 'bump'); floatText(el.root, '+' + fmt(d), 18, 0, 'rgain'); }
        else if (-d > Math.max(1, row.rate * 0.6)) pulse(el.root, 'drop');
      }
      el.prev = row.v;
    }
    setText(resRefs.realm.b, r.name); setText(resRefs.realm.sm, `產出 ×${fmt(r.mult)}`);
    setAmbientIntensity(qiPerSec(s));

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
      const [ico, ...txt] = label.split(' ');       // 手機版：圖示在上、文字在下
      return `<button class="tab ${ui.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}"><span class="ti">${ico}</span> <span class="tl">${txt.join(' ')}</span>${badge}${alert}</button>`;
    }).join(''));

    const body = { buildings: buildingPanel, realm: realmPanel, gacha: gachaPanel, disciples: disciplePanel, avenge: avengePanel, goals: goalPanel, nemesis: nemesisPanel, dao: daoPanel, factions: factionPanel }[ui.tab];
    setHTML(panelEl, body(s, ui));
  }
  return render;
}
