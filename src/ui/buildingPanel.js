// 建築面板：升級成本、里程碑、效果；買得起亮起、買不起灰化。
import { BUILDINGS } from '../data/buildings.js';
import { CONFIG } from '../config.js';
import { stageOf, upgradeCost, canUpgrade, isMax, slots } from '../core/buildings.js';
import { esc, costChips } from './dom.js';

export function buildingPanel(s) {
  return `<div class="list">` + BUILDINGS.map(d => {
    const lv = s.buildings[d.id].lv, st = stageOf(d.id, lv);
    const max = isMax(s, d.id), can = canUpgrade(s, d.id);
    const next = d.stages.find(x => x.lv > lv);
    return `<div class="card bcard ${can ? 'affordable' : ''}">
      <div class="big">${st.emoji}</div>
      <div class="body">
        <div class="row"><b>${esc(d.name)}</b> <span class="lv">Lv ${lv}/${CONFIG.building.maxLevel}</span>
          <span class="tag">專長：${esc(d.specialty)}</span> <span class="tag">${esc(d.element)}</span></div>
        <small>${esc(d.desc)}</small><br>
        <small class="dim">${esc(st.label)}${next ? `　→　Lv${next.lv}：${esc(next.label)}` : '（已臻極致）'}　駐守位 ${slots(s, d.id)}</small>
      </div>
      <div class="act">
        ${max ? '<span class="tag gold">已滿級</span>'
              : `<div class="costs">${costChips(s, upgradeCost(s, d.id))}</div>
                 <button class="btn ${can ? 'primary' : ''}" data-act="upgrade" data-id="${d.id}" ${can ? '' : 'disabled'}>${lv === 0 ? '建造' : '升級'}</button>`}
      </div>
    </div>`;
  }).join('') + `</div>`;
}
