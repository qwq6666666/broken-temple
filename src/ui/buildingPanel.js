// 建築面板：升級成本、里程碑、效果；買得起亮起、買不起灰化。
import { BUILDINGS } from '../data/buildings.js';
import { CONFIG } from '../config.js';
import { stageOf, upgradeCost, canUpgrade, isMax, isCapped, slots, realmNeededFor, isBuildingUnlocked, affordableLevels, milestoneMult, nextMilestone, extraLevels, maxLevelOf } from '../core/buildings.js';
import { chosenSpec } from '../core/spec.js';
import { specText } from '../data/specs.js';
import { REALMS } from '../data/realms.js';
import { esc, costChips, crow } from './dom.js';

// 升級按鈕組：單升 + 批量（×10、最大）。批量按鈕只在買得起 2 級以上時可按
export function upgradeButtons(s, id) {
  const lv = s.buildings[id].lv, can = canUpgrade(s, id);
  const n10 = can ? affordableLevels(s, id, 2) : 0, nMax = n10;      // 只需知道「買得起 2 級以上嗎」，cap 小就很便宜（每幀 9 棟都在算）
  return `<div class="bulk"><button class="btn ${can ? 'primary' : ''}" data-act="upgrade" data-id="${id}" ${can ? '' : 'disabled'}>${lv === 0 ? '建造' : '升級'}</button>`
    + `<button class="btn mini" data-act="upgradeN" data-id="${id}" data-n="10" ${n10 >= 2 ? '' : 'disabled'} title="連續升級，最多 10 級">×10</button>`
    + `<button class="btn mini" data-act="upgradeN" data-id="${id}" data-n="max" ${nMax >= 2 ? '' : 'disabled'} title="連續升級到買不起或到等級上限">最大</button></div>`;
}
// 產出建築的里程碑說明（功能型建築沒有產出，不顯示）
export function milestoneText(d, lv) {
  if (!Object.keys(d.produce).length) return '';
  const nx = nextMilestone(lv), cur = milestoneMult(lv);
  return `<small class="dim">產出倍率 ×${cur}${nx ? `　→　Lv${nx[0]} 累計 ×${nx[1]}` : '（里程碑全達成）'}</small>`;
}

export function buildingPanel(s, ui) {
  const rows = BUILDINGS.map(d => {
    if (!isBuildingUnlocked(s, d.id)) return crow(ui, { key: 'b' + d.id, cls: 'locked', icon: '🔒', title: `<b>${esc(d.name)}</b>`, sub: `需突破至 ${esc(REALMS[d.unlockRealm].name)}` });
    const lv = s.buildings[d.id].lv, st = stageOf(d.id, lv);
    const max = isMax(s, d.id), can = canUpgrade(s, d.id), next = d.stages.find(x => x.lv > lv), spec = chosenSpec(s, d.id);
    const act = max ? '<span class="tag gold">已滿級</span>'
      : isCapped(s, d.id) ? `<span class="tag red">需突破至 ${esc(REALMS[realmNeededFor(lv + 1, extraLevels(s))].name)}</span>`
      : `<div class="costs">${costChips(s, upgradeCost(s, d.id))}</div>${upgradeButtons(s, d.id)}`;
    const detail = `<small>${esc(d.desc)}</small>
      <div class="tags"><span class="tag">專長：${esc(d.specialty)}</span> <span class="tag elt">${esc(d.element)}</span> <span class="tag">駐守位 ${slots(s, d.id)}</span></div>
      ${spec ? `<small class="gold">🏗 專精：${esc(spec.name)}（${esc(specText(spec.effects))}）</small>` : ''}
      <small class="dim">${next ? `下一外觀 Lv${next.lv}：${esc(next.label)}` : '（已臻極致）'}</small>${milestoneText(d, lv)}`;
    return crow(ui, { key: 'b' + d.id, cls: (can ? 'affordable' : '') + ' brow', icon: st.emoji,
      title: `<b>${esc(d.name)}</b> <span class="lv">Lv ${lv}/${maxLevelOf(s)}</span>`, badges: spec ? ' <span class="tag gold">專精</span>' : '',
      sub: esc(st.label), act, detail });
  }).join('');
  const any = BUILDINGS.some(d => canUpgrade(s, d.id));
  return `<div class="dtools"><button class="btn ${any ? 'primary' : ''}" data-act="upgradeAll" ${any ? '' : 'disabled'} title="反覆升級買得起且最便宜的建築，直到買不起">⚡ 全部升級</button></div><div class="list">${rows}</div>`;
}
