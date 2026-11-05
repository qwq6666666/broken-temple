// 弟子純計算（不依賴 state 其餘部分，避免模組循環）。
import { CONFIG } from '../config.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { RARITIES } from '../data/gachaRates.js';

export const defOf = d => DISCIPLES_BY_ID[d.defId];

// 弟子屬性 = 稀有度基礎 × (1 + 每級成長 × (等級-1))
export const stat = d => RARITIES[defOf(d).rarity].stat * (1 + CONFIG.disciple.statGrowth * (d.lv - 1));

export const isSpecialtyMatch = (d, bid) => defOf(d).specialty === BUILDINGS_BY_ID[bid].specialty;
export const isElementMatch = (d, bid) => defOf(d).element === BUILDINGS_BY_ID[bid].element;

// 派駐在建築 bid 時，對該建築倍率的貢獻（專長匹配 ×2、五行相合 ×1.25）
export function contribution(d, bid) {
  let m = stat(d) * CONFIG.disciple.assignFactor;
  if (isSpecialtyMatch(d, bid)) m *= CONFIG.disciple.specialtyMult;
  if (isElementMatch(d, bid)) m *= CONFIG.disciple.elementMult;
  return m;
}
