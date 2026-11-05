// 境界面板：目前境界與倍率、下一境界成本、突破按鈕。
import { REALMS, TIER_NAMES } from '../data/realms.js';
import { CONFIG } from '../config.js';
import { nextRealm, breakCost, canBreak } from '../core/realm.js';
import { fmt } from '../core/format.js';
import { canRebirth, daoGain } from '../core/dao.js';
import { mutatorOf } from '../core/mutators.js';
import { esc, costChips, RES } from './dom.js';
import { EXPEDITIONS_BY_ID } from '../data/expeditions.js';

const capAt = i => Math.min(CONFIG.building.maxLevel, 1 + Math.floor(i * CONFIG.building.levelCapRealmFactor));

// 分段大階：每個大境界一列，段內以小點表示層數（已過＝實心、目前＝金色、未到＝空心）
function stages(s) {
  return TIER_NAMES.slice(1).map((name, k) => {
    const tier = k + 1, rs = REALMS.filter(r => r.tier === tier);
    const state = rs.every(r => r.idx < s.realmIdx) ? 'done' : rs.some(r => r.idx === s.realmIdx) ? 'cur' : '';
    const dots = rs.length > 1 ? rs.map(r => `<i class="${r.idx < s.realmIdx ? 'on' : r.idx === s.realmIdx ? 'now' : ''}" title="${esc(r.name)}　產出 ×${fmt(r.mult)}"></i>`).join('') : '';
    return `<div class="stage ${state}" title="產出 ×${fmt(rs[0].mult)} 起"><b>${esc(name)}</b>${dots ? `<span class="dots">${dots}</span>` : ''}</div>`;
  }).join('');
}

export function realmPanel(s) {
  const cur = REALMS[s.realmIdx], nx = nextRealm(s);
  const cost = nx ? breakCost(s) : null, ok = nx && canBreak(s);
  const capNow = capAt(s.realmIdx), capNext = nx ? capAt(nx.idx) : capNow;
  const showPower = s.grudges.length > 0 || !!s.unlocked.avenge;       // 戰力只有打臉預估用得到
  const diff = nx ? `<div class="diff"><span>產出 <b>×${fmt(cur.mult)}</b> → <b class="gold">×${fmt(nx.mult)}</b></span>
      ${capNext > capNow ? `<span>建築上限 <b>Lv${capNow}</b> → <b class="gold">Lv${capNext}</b></span>` : ''}</div>` : '';
  return `<div class="card realm big-realm">
    <div class="big">🧘</div>
    <div class="body">
      <div class="row"><b style="font-size:1.3em">${esc(cur.name)}</b> <span class="tag gold">產出 ×${fmt(cur.mult)}</span>${showPower ? ` <span class="tag">戰力 ×${fmt(cur.power)}</span>` : ''}</div>
      ${nx ? `<small>下一境界：<b>${esc(nx.name)}</b></small>${diff}` : `<small>已臻化神。可以轉生，換取道心與永久加成了。</small>`}
    </div>
    ${nx ? `<div class="act breakact"><div class="costs lg">${costChips(s, cost)}</div>
      <button class="btn bigbtn ${ok ? 'primary' : ''}" data-act="breakthrough" ${ok ? '' : 'disabled'}>突破</button></div>` : ''}
  </div>
  ${nx && nx.matCost ? `<p class="hint">🧭 跨大境界需要「秘境材料」：${Object.keys(nx.matCost).map(k => `${RES[k].icon}${RES[k].name}（${esc(EXPEDITIONS_BY_ID[k.slice(4)].name)}）`).join('、')}。派弟子去探索秘境取得。</p>` : ''}
  <div class="stages">${stages(s)}</div>
  ${mutatorBox(s)}${rebirthBox(s)}`;
}

// 轉生：化神後才出現
function rebirthBox(s) {
  if (!canRebirth(s)) return '';
  return `<div class="card rebirth">
    <div class="big">☯️</div>
    <div class="body"><b>轉生</b><br><small>重置建築、境界、資源與弟子等級，換取 <b class="gold">道心 ${fmt(daoGain(s))}</b>（本輪：引爆 ${s.run.bursts} 次、最大連鎖 ${s.run.maxChain}、擊敗宿敵 ${s.run.nemeses}、完成大事 ${s.run.goals}）。弟子收藏、法寶、大事、宿敵進度全部保留。</small></div>
    <div class="act"><button class="btn primary" data-act="rebirth">轉生</button></div></div>`;
}

// 本輪輪迴詞條
function mutatorBox(s) {
  const m = mutatorOf(s);
  return m ? `<div class="card"><div class="big">🌀</div><div class="body"><b>本輪輪迴詞條：${esc(m.name)}</b><br><small>${esc(m.desc)}</small><br><small class="dim">${esc(m.flavor)}</small></div></div>` : '';
}
