// 弟子純計算（不依賴 state 其餘部分，避免模組循環）。
import { CONFIG } from '../config.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { relation } from '../data/elements.js';
import { RARITIES } from '../data/gachaRates.js';

export const defOf = d => DISCIPLES_BY_ID[d.defId];

// 弟子屬性 = 稀有度基礎 × (1 + 每級成長 × (等級-1))
export const starOf = d => d.star || 0;      // 舊存檔沒有 star 欄位
const starMult = d => 1 + CONFIG.disciple.starBonus * starOf(d);
export const stat = d => RARITIES[defOf(d).rarity].stat * (1 + CONFIG.disciple.statGrowth * (d.lv - 1)) * starMult(d);
// 特性效果（受星級加成）
export const traitOf = d => defOf(d).trait;
export const branchOf = d => d.branch || null;
export const traitValue = d => traitOf(d).value * starMult(d) * (branchOf(d) === 'focus' ? 1.2 : 1);
// 計入宗門戰力的屬性（悍勇 ×2）與探索用屬性（悍勇 ×1.3）
export const powerStat = d => stat(d) * (branchOf(d) === 'might' ? 2 : 1);
export const expStat = d => stat(d) * (branchOf(d) === 'might' ? 1.3 : 1);

export const isSpecialtyMatch = (d, bid) => defOf(d).specialty === BUILDINGS_BY_ID[bid].specialty;
export const isElementMatch = (d, bid) => defOf(d).element === BUILDINGS_BY_ID[bid].element;

// 五行加成：建築與同棟其他弟子對 d 的相生（+）、相剋（−）。「相同」另有 elementMult，不在此計。
export function elementEffect(d, bid, mates = []) {
  const E = CONFIG.element; if (!E.enabled) return 0;
  const me = defOf(d).element;
  let v = 0;
  const add = from => { const r = relation(from, me); if (r === 'sheng') v += E.shengBonus; else if (r === 'ke') v += E.keBonus; };
  add(BUILDINGS_BY_ID[bid].element);
  for (const m of mates) add(defOf(m).element);
  return v;
}
// 派駐在建築 bid 時，對該建築倍率的貢獻（專長匹配 ×2、五行相同 ×1.25、五行相生相剋 ±、進階分支）。mates = 同棟其他弟子
export function contribution(d, bid, mates = []) {
  let m = stat(d) * CONFIG.disciple.assignFactor;
  if (isSpecialtyMatch(d, bid)) m *= CONFIG.disciple.specialtyMult * (branchOf(d) === 'focus' ? 1.25 : 1);
  if (isElementMatch(d, bid)) m *= CONFIG.disciple.elementMult;
  return m * Math.max(0.5, 1 + elementEffect(d, bid, mates));
}
