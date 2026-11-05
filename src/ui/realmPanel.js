// 境界面板：目前境界與倍率、下一境界成本、突破按鈕。
import { REALMS } from '../data/realms.js';
import { nextRealm, breakCost, canBreak } from '../core/realm.js';
import { fmt } from '../core/format.js';
import { canRebirth, daoGain } from '../core/dao.js';
import { esc, costChips } from './dom.js';

export function realmPanel(s) {
  const cur = REALMS[s.realmIdx], nx = nextRealm(s);
  const ladder = REALMS.map(r => `<span class="step ${r.idx < s.realmIdx ? 'done' : r.idx === s.realmIdx ? 'cur' : ''}" title="產出 ×${fmt(r.mult)}">${esc(r.name)}</span>`).join('');
  return `<div class="card realm">
    <div class="big">🧘</div>
    <div class="body">
      <div class="row"><b style="font-size:1.3em">${esc(cur.name)}</b> <span class="tag gold">產出 ×${fmt(cur.mult)}</span> <span class="tag">戰力 ×${fmt(cur.power)}</span></div>
      ${nx ? `<small>下一境界：<b>${esc(nx.name)}</b>（產出 ×${fmt(nx.mult)}）</small>`
           : `<small>已臻化神。可以轉生，換取道心與永久加成了。</small>`}
    </div>
    ${nx ? `<div class="act"><div class="costs">${costChips(s, breakCost(s))}</div>
      <button class="btn ${canBreak(s) ? 'primary' : ''}" data-act="breakthrough" ${canBreak(s) ? '' : 'disabled'}>突破</button></div>` : ''}
  </div>
  ${nx && nx.shardCost ? '<p class="hint">🧩 築基以上需要「碎片」，重複抽到的弟子會轉為碎片。</p>' : ''}
  <div class="ladder">${ladder}</div>
  ${rebirthBox(s)}`;
}

// 轉生：化神後才出現
function rebirthBox(s) {
  if (!canRebirth(s)) return '';
  return `<div class="card rebirth">
    <div class="big">☯️</div>
    <div class="body"><b>轉生</b><br><small>重置建築、境界、資源與弟子等級，換取 <b class="gold">道心 ${fmt(daoGain(s))}</b>（本輪：引爆 ${s.run.bursts} 次、最大連鎖 ${s.run.maxChain}、擊敗宿敵 ${s.run.nemeses}、完成大事 ${s.run.goals}）。弟子收藏、法寶、大事、宿敵進度全部保留。</small></div>
    <div class="act"><button class="btn primary" data-act="rebirth">轉生</button></div></div>`;
}
