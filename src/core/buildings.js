// 建築：升級成本（基礎 × 1.15^等級）、外觀里程碑、駐守位。
import { CONFIG } from '../config.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { REALMS } from '../data/realms.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';

export const def = id => BUILDINGS_BY_ID[id];
// 建築等級上限：受境界限制（避免一下滿級），最高 10
export const levelCap = s =>
  Math.min(CONFIG.building.maxLevel, 1 + Math.floor(s.realmIdx * CONFIG.building.levelCapRealmFactor));
export const isMax = (s, id) => s.buildings[id].lv >= CONFIG.building.maxLevel;
export const isCapped = (s, id) => s.buildings[id].lv >= levelCap(s);
// 目前等級上限對應的「需要境界」：能升到 lv+1 所需的最低境界序號
export function realmNeededFor(lv) {
  let i = 0;
  while (1 + Math.floor(i * CONFIG.building.levelCapRealmFactor) < lv && i < 99) i++;
  return i;
}

// 外觀階段：取 lv 不超過目前等級的最後一個里程碑
export function stageOf(id, lv) {
  const st = def(id).stages;
  let cur = st[0];
  for (const x of st) if (lv >= x.lv) cur = x;
  return cur;
}
export const stageIndex = (id, lv) => def(id).stages.indexOf(stageOf(id, lv));

// 成本 = 基礎 × 1.15^目前等級 × 解鎖該級所需境界的產出倍率（成本跟著產出走，後期才不會變得微不足道）
export function upgradeCost(s, id) {
  const lv = s.buildings[id].lv, out = {};
  const realmMult = REALMS[Math.min(REALMS.length - 1, realmNeededFor(lv + 1))].mult;
  for (const [k, v] of Object.entries(def(id).baseCost)) out[k] = Math.floor(v * CONFIG.building.costGrowth ** lv * realmMult);
  return out;
}
export const canUpgrade = (s, id) => !isCapped(s, id) && canAfford(s, upgradeCost(s, id));

export function upgrade(s, id) {
  if (!canUpgrade(s, id)) return false;
  const before = stageIndex(id, s.buildings[id].lv);
  pay(s, upgradeCost(s, id));
  s.buildings[id].lv++;
  const after = stageIndex(id, s.buildings[id].lv);
  quote(pickLine(after > before ? LINES.stageUp : LINES.upgrade));
  return true;
}

// 駐守位：lv≥1 才有，1 + floor((lv-1)/3)
export const slots = (s, id) => {
  const lv = s.buildings[id].lv;
  return lv < 1 ? 0 : 1 + Math.floor((lv - 1) / CONFIG.building.slotEvery);
};
