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
import { expeditionPanel } from './expeditionPanel.js';
import { titleOf } from '../core/achievements.js';
import { readyCount } from '../core/commissions.js';
import { isUnlocked, nextStep } from '../core/progress.js';
import { getPrefs } from './prefs.js';
import { initParticles, setAmbientIntensity } from './particles.js';
import { pulse, floatText } from './fx.js';
import { GOALS } from '../data/goals.js';
import { TAB_TIPS } from '../data/help.js';

// 分頁精簡：10 個功能分頁收成 6 組（組內依解鎖進度由上而下堆疊）。內部分頁 id 不變（解鎖旗標、說明、提示都沿用）。
const GROUPS = [
  { id: 'buildings', label: '🏯 建築', members: ['buildings'] },
  { id: 'realm',     label: '🧘 境界', members: ['realm', 'dao'] },
  { id: 'people',    label: '👥 弟子', members: ['gacha', 'disciples'] },
  { id: 'grudge',    label: '📖 仇怨', members: ['avenge', 'nemesis'] },
  { id: 'world',     label: '🧭 江湖', members: ['expedition', 'factions'] },
  { id: 'goals',     label: '🎯 大事', members: ['goals'] },
];
const SUB_TITLE = { dao: '☯️ 道心', gacha: '🎫 招賢', disciples: '👥 弟子', avenge: '📖 復仇簿', nemesis: '⚔️ 宿敵錄', expedition: '🧭 秘境', factions: '🏴 勢力' };
const GROUP_OF = Object.fromEntries(GROUPS.flatMap(g => g.members.map(m => [m, g.id])));
const PANELS = { buildings: buildingPanel, realm: realmPanel, gacha: gachaPanel, disciples: disciplePanel, avenge: avengePanel, goals: goalPanel, nemesis: nemesisPanel, dao: daoPanel, factions: factionPanel, expedition: expeditionPanel };
const groupOpen = (s, g) => g.members.some(m => isUnlocked(s, m));

export function createRenderer(s, ui) {
  const sceneEl = $('#scene'), concealEl = $('#conceal');
  const sceneRefs = mountScene(sceneEl);
  initParticles(sceneEl);
  const concealRefs = mountConceal(concealEl);
  const panelEl = $('#panel'), tabsEl = $('#tabs'), resEl = $('#resbar'), hintEl = $('#hint');
  // 資源列骨架
  resEl.innerHTML = [['qi', '✨ 靈氣'], ['stone', '💎 靈石'], ['realm', '境界']]
    .map(([k, l]) => `<div class="res ${k === 'realm' ? 'realm' : ''}" data-k="${k}"><span>${l}</span><b></b><small></small></div>`).join('');
  const resRefs = Object.fromEntries([...resEl.children].map(e => [e.dataset.k, { root: e, b: e.querySelector('b'), sm: e.querySelector('small'), prev: null }]));
  ui.quote = pickLine(LINES.idle);
  bus.on('quote', t => { ui.quote = t; ui.quoteAt = Date.now(); });

  const ttlEl = document.getElementById('ttl');
  function render() {
    // 老祖閒聊：久未發言就換一句
    if (Date.now() - (ui.quoteAt || 0) > 25000) { ui.quote = pickLine(LINES.idle); ui.quoteAt = Date.now(); }

    // 資源列：節點只建一次，只更新文字；數值突然增減時閃一下並飄出變化量
    const r = realmOf(s);
    if (ttlEl) setText(ttlEl, titleOf(s) ? `「${titleOf(s)}」` : '');
    const rows = {
      qi:    { show: true, v: s.res.qi, sub: '+' + fmtRate(qiPerSec(s)), rate: qiPerSec(s) },
      stone: { show: true, v: s.res.stone, sub: stonePerSec(s) > 0 ? '+' + fmtRate(stonePerSec(s)) : '建煉丹房產出', rate: stonePerSec(s) },
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

    // 分頁（舊的內部分頁 id 一律換算成所屬分組）
    ui.tab = GROUP_OF[ui.tab] || ui.tab;
    const groups = GROUPS.filter(g => groupOpen(s, g));
    if (!groups.some(g => g.id === ui.tab)) ui.tab = 'buildings';
    const grp = groups.find(g => g.id === ui.tab);
    setHTML(tabsEl, groups.map(g => {
      const m = id => g.members.includes(id) && isUnlocked(s, id);
      const badge = m('avenge') && s.grudges.length ? ` <i>${s.grudges.length}</i>` : '';
      const alert = (m('disciples') && s.recruits.length) ? ' <i class="new">新</i>' : (g.id === 'goals' ? (readyCount(s) ? ` <i class="new">${readyCount(s)}</i>` : ` <i class="prog">${s.goalsDone.length}/${GOALS.length}</i>`) : '');
      const [ico, ...txt] = g.label.split(' ');       // 手機版：圖示在上、文字在下
      return `<button class="tab ${ui.tab === g.id ? 'on' : ''}" data-act="tab" data-tab="${g.id}"><span class="ti">${ico}</span> <span class="tl">${txt.join(' ')}</span>${badge}${alert}</button>`;
    }).join(''));

    const prefs = getPrefs();
    const open = grp.members.filter(m => isUnlocked(s, m));
    const tipId = prefs.tips ? open.find(m => !prefs.tipsSeen[m] && TAB_TIPS[m]) : null;
    const tip = tipId ? `<div class="tip ${ui.tipOpen ? 'open' : ''}"><button class="tiphead" data-act="toggleTip" aria-expanded="${!!ui.tipOpen}">💡 本頁說明 <span>${ui.tipOpen ? '▴' : '▾'}</span></button>${ui.tipOpen ? `<span class="tiptext">${TAB_TIPS[tipId]}</span>` : ''}<button class="btn mini" data-act="dismissTip" data-tab="${tipId}">知道了</button></div>` : '';
    const body = open.map(m => (open.length > 1 ? `<h3 class="sub">${SUB_TITLE[m] || ''}</h3>` : '') + PANELS[m](s, ui)).join('');
    setHTML(panelEl, tip + body);
  }
  return render;
}
