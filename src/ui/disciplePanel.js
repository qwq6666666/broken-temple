// 弟子名單：名字卡、升級、派駐（專長匹配標示 ×2）。
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { levelCapOf, levelCost, canLevel, assignedTo, starCost, canStar } from '../core/disciples.js';
import { traitText } from '../data/traits.js';
import { slots } from '../core/buildings.js';
import { stat, isSpecialtyMatch, isElementMatch, starOf, traitValue } from '../core/discipleMath.js';
import { fmt } from '../core/format.js';
import { esc, costChips } from './dom.js';

export function disciplePanel(s) {
  if (!s.disciples.length)
    return '<p class="hint">還沒有弟子。到「招賢」用招賢令抽卡，或在「復仇簿」降服他宗弟子。</p>';
  const sorted = [...s.disciples].sort((a, b) =>
    RARITY_ORDER.indexOf(DISCIPLES_BY_ID[b.defId].rarity) - RARITY_ORDER.indexOf(DISCIPLES_BY_ID[a.defId].rarity) || b.lv - a.lv);
  return `<p class="hint">🧩 碎片：${fmt(s.res.shard)}（升星與築基以上突破共用）　等級上限 = 10 + 演武場×2 + 星級×2　特性只在<b>派駐中</b>生效</p><div class="dgrid">` + sorted.map(d => {
    const df = DISCIPLES_BY_ID[d.defId], r = RARITIES[df.rarity];
    const can = canLevel(s, d), atMax = d.lv >= levelCapOf(s, d), sc = starCost(d), star = starOf(d);
    const opts = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
      const full = assignedTo(s, b.id).length >= slots(s, b.id) && d.at !== b.id;
      const tags = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
      return `<option value="${b.id}" ${d.at === b.id ? 'selected' : ''} ${full ? 'disabled' : ''}>${esc(b.name)}${tags ? `（${tags}）` : ''}${full ? '（已滿）' : ''}</option>`;
    }).join('');
    const match = d.at && isSpecialtyMatch(d, d.at);
    return `<div class="dcard" style="--rc:${r.color}">
      <div class="dtop"><span class="rar">${df.rarity}</span><span class="de">${df.emoji}</span></div>
      <b>${esc(df.name)}</b>
      <div class="tags"><span class="tag">${esc(df.element)}</span><span class="tag">${esc(df.specialty)}</span><span class="tag">${esc(df.personality)}</span></div>
      <small>Lv ${d.lv}/${levelCapOf(s, d)}・屬性 ${fmt(stat(d))} <span class="gold">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</span></small>
      <small class="trait ${d.at ? 'on' : ''}">✦ ${esc(traitText(df.trait.key, traitValue(d)))}${d.at ? '（生效中）' : '（派駐後生效）'}</small>
      <small class="dim">「${esc(df.quote)}」</small>
      <select class="assign" data-change="assign" data-uid="${d.uid}">
        <option value="">— 未派駐 —</option>${opts}
      </select>
      ${match ? '<small class="gold">✔ 專長匹配 ×2</small>' : ''}
      ${sc ? `<button class="btn ${canStar(s, d) ? 'primary' : ''}" data-act="starUp" data-uid="${d.uid}" ${canStar(s, d) ? '' : 'disabled'}>升星 ${costChips(s, sc)}</button>` : '<span class="tag gold">滿星</span>'}
      ${atMax ? '<span class="tag">已達上限</span>'
        : `<div class="costs">${costChips(s, levelCost(s, d))}</div>
           <button class="btn ${can ? 'primary' : ''}" data-act="levelUp" data-uid="${d.uid}" ${can ? '' : 'disabled'}>升級</button>`}
    </div>`;
  }).join('') + '</div>';
}
