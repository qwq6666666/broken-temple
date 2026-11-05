// 建築面板：升級成本、里程碑、效果；買得起亮起、買不起灰化。
import { BUILDINGS } from '../data/buildings.js';
import { CONFIG } from '../config.js';
import { stageOf, upgradeCost, canUpgrade, isMax, isCapped, slots, realmNeededFor, isBuildingUnlocked } from '../core/buildings.js';
import { chosenSpec } from '../core/spec.js';
import { specText } from '../data/specs.js';
import { REALMS } from '../data/realms.js';
import { esc, costChips, crow } from './dom.js';

export function buildingPanel(s, ui) {
  const rows = BUILDINGS.map(d => {
    if (!isBuildingUnlocked(s, d.id)) return crow(ui, { key: 'b' + d.id, cls: 'locked', icon: '🔒', title: `<b>${esc(d.name)}</b>`, sub: `需突破至 ${esc(REALMS[d.unlockRealm].name)}` });
    const lv = s.buildings[d.id].lv, st = stageOf(d.id, lv);
    const max = isMax(s, d.id), can = canUpgrade(s, d.id), next = d.stages.find(x => x.lv > lv), spec = chosenSpec(s, d.id);
    const act = max ? '<span class="tag gold">已滿級</span>'
      : isCapped(s, d.id) ? `<span class="tag red">需突破至 ${esc(REALMS[realmNeededFor(lv + 1)].name)}</span>`
      : `<div class="costs">${costChips(s, upgradeCost(s, d.id))}</div><button class="btn ${can ? 'primary' : ''}" data-act="upgrade" data-id="${d.id}" ${can ? '' : 'disabled'}>${lv === 0 ? '建造' : '升級'}</button>`;
    const detail = `<small>${esc(d.desc)}</small>
      <div class="tags"><span class="tag">專長：${esc(d.specialty)}</span> <span class="tag elt">${esc(d.element)}</span> <span class="tag">駐守位 ${slots(s, d.id)}</span></div>
      ${spec ? `<small class="gold">🏗 專精：${esc(spec.name)}（${esc(specText(spec.effects))}）</small>` : ''}
      <small class="dim">${next ? `下一里程碑 Lv${next.lv}：${esc(next.label)}` : '（已臻極致）'}</small>`;
    return crow(ui, { key: 'b' + d.id, cls: can ? 'affordable' : '', icon: st.emoji,
      title: `<b>${esc(d.name)}</b> <span class="lv">Lv ${lv}/${CONFIG.building.maxLevel}</span>`, badges: spec ? ' <span class="tag gold">專精</span>' : '',
      sub: esc(st.label), act, detail });
  }).join('');
  const any = BUILDINGS.some(d => canUpgrade(s, d.id));
  return `<div class="dtools"><button class="btn ${any ? 'primary' : ''}" data-act="upgradeAll" ${any ? '' : 'disabled'} title="反覆升級買得起且最便宜的建築，直到買不起">⚡ 全部升級</button></div><div class="list">${rows}</div>`;
}
