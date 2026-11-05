// 建築：升級成本（基礎 × 1.15^等級）、外觀里程碑、駐守位。
import { CONFIG } from '../config.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';

export const def = id => BUILDINGS_BY_ID[id];
export const isMax = (s, id) => s.buildings[id].lv >= CONFIG.building.maxLevel;

// 外觀階段：取 lv 不超過目前等級的最後一個里程碑
export function stageOf(id, lv) {
  const st = def(id).stages;
  let cur = st[0];
  for (const x of st) if (lv >= x.lv) cur = x;
  return cur;
}
export const stageIndex = (id, lv) => def(id).stages.indexOf(stageOf(id, lv));

export function upgradeCost(s, id) {
  const lv = s.buildings[id].lv, out = {};
  for (const [k, v] of Object.entries(def(id).baseCost)) out[k] = Math.floor(v * CONFIG.building.costGrowth ** lv);
  return out;
}
export const canUpgrade = (s, id) => !isMax(s, id) && canAfford(s, upgradeCost(s, id));

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
