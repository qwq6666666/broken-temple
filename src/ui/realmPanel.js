// 境界面板：目前境界與倍率、下一境界成本、突破按鈕。
import { REALMS } from '../data/realms.js';
import { nextRealm, breakCost, canBreak } from '../core/realm.js';
import { fmt } from '../core/format.js';
import { esc, costChips } from './dom.js';

export function realmPanel(s) {
  const cur = REALMS[s.realmIdx], nx = nextRealm(s);
  const ladder = REALMS.map(r => `<span class="step ${r.idx < s.realmIdx ? 'done' : r.idx === s.realmIdx ? 'cur' : ''}" title="產出 ×${fmt(r.mult)}">${esc(r.name)}</span>`).join('');
  return `<div class="card realm">
    <div class="big">🧘</div>
    <div class="body">
      <div class="row"><b style="font-size:1.3em">${esc(cur.name)}</b> <span class="tag gold">產出 ×${fmt(cur.mult)}</span> <span class="tag">戰力 ×${fmt(cur.power)}</span></div>
      ${nx ? `<small>下一境界：<b>${esc(nx.name)}</b>（產出 ×${fmt(nx.mult)}）</small>`
           : `<small>已臻化神，天下第一宗不是夢。（轉生・道心：之後版本開放）</small>`}
    </div>
    ${nx ? `<div class="act"><div class="costs">${costChips(s, breakCost(s))}</div>
      <button class="btn ${canBreak(s) ? 'primary' : ''}" data-act="breakthrough" ${canBreak(s) ? '' : 'disabled'}>突破</button></div>` : ''}
  </div>
  ${nx && nx.shardCost ? '<p class="hint">🧩 築基以上需要「碎片」，重複抽到的弟子會轉為碎片。</p>' : ''}
  <div class="ladder">${ladder}</div>`;
}
