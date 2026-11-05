// 建築面板：升級成本、里程碑、效果；買得起亮起、買不起灰化。
import { BUILDINGS } from '../data/buildings.js';
import { CONFIG } from '../config.js';
import { stageOf, upgradeCost, canUpgrade, isMax, isCapped, slots, realmNeededFor, isBuildingUnlocked } from '../core/buildings.js';
import { chosenSpec } from '../core/spec.js';
import { specText } from '../data/specs.js';
import { REALMS } from '../data/realms.js';
import { esc, costChips } from './dom.js';

export function buildingPanel(s) {
  return `<div class="list">` + BUILDINGS.map(d => {
    if (!isBuildingUnlocked(s, d.id)) return `<div class="card locked"><div class="big">🔒</div><div class="body"><b>${esc(d.name)}</b> <small class="dim">${esc(d.desc)}</small><br><small class="dim">需突破至 ${esc(REALMS[d.unlockRealm].name)} 解鎖</small></div></div>`;
    const lv = s.buildings[d.id].lv, st = stageOf(d.id, lv);
    const max = isMax(s, d.id), can = canUpgrade(s, d.id);
    const next = d.stages.find(x => x.lv > lv);
    return `<div class="card bcard ${can ? 'affordable' : ''}">
      <div class="big">${st.emoji}</div>
      <div class="body">
        <div class="row"><b>${esc(d.name)}</b> <span class="lv">Lv ${lv}/${CONFIG.building.maxLevel}</span>
          <span class="tag">專長：${esc(d.specialty)}</span> <span class="tag elt">${esc(d.element)}</span></div>
        <small>${esc(d.desc)}</small><br>
        ${chosenSpec(s, d.id) ? `<small class="gold">🏗 專精：${esc(chosenSpec(s, d.id).name)}（${esc(specText(chosenSpec(s, d.id).effects))}）</small><br>` : ''}<small class="dim">${esc(st.label)}${next ? `　→　Lv${next.lv}：${esc(next.label)}` : '（已臻極致）'}　駐守位 ${slots(s, d.id)}</small>
      </div>
      <div class="act">
        ${max ? '<span class="tag gold">已滿級</span>'
              : isCapped(s, d.id) ? `<span class="tag red">需突破至 ${esc(REALMS[realmNeededFor(lv + 1)].name)}</span>`
              : `<div class="costs">${costChips(s, upgradeCost(s, d.id))}</div>
                 <button class="btn ${can ? 'primary' : ''}" data-act="upgrade" data-id="${d.id}" ${can ? '' : 'disabled'}>${lv === 0 ? '建造' : '升級'}</button>`}
      </div>
    </div>`;
  }).join('') + `</div>`;
}
