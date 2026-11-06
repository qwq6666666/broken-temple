// 建築：升級成本（基礎 × 1.15^等級）、外觀里程碑、駐守位。
import { CONFIG } from '../config.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { REALMS } from '../data/realms.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote, cue } from './events.js';
export { lvEff, milestoneMult, nextMilestone } from './buildingMath.js';

export const def = id => BUILDINGS_BY_ID[id];
// 建築等級上限：受境界限制（避免一下滿級），最高 CONFIG.building.maxLevel（100）
export const capAtRealm = i => Math.min(CONFIG.building.maxLevel, CONFIG.building.levelCapBase + Math.floor(i * CONFIG.building.levelCapRealmFactor));
export const levelCap = s =>
  capAtRealm(s.realmIdx);
export const isMax = (s, id) => s.buildings[id].lv >= CONFIG.building.maxLevel;
export const isCapped = (s, id) => s.buildings[id].lv >= levelCap(s);
// 目前等級上限對應的「需要境界」：能升到 lv+1 所需的最低境界序號
export function realmNeededFor(lv) {
  let i = 0;
  while (capAtRealm(i) < lv && i < 99) i++;
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
  for (const [k, v] of Object.entries(def(id).baseCost)) out[k] = Math.max(1, Math.floor(v / CONFIG.building.levelScale * CONFIG.building.costGrowth ** lv * realmMult));   // baseCost 為舊刻度，除以 levelScale；至少 1
  return out;
}
// 後期建築需先達到 unlockRealm（已建造過的不受影響）
export const isBuildingUnlocked = (s, id) => def(id).unlockRealm == null || s.realmIdx >= def(id).unlockRealm || s.buildings[id].lv > 0;
export const canUpgrade = (s, id) => isBuildingUnlocked(s, id) && !isCapped(s, id) && canAfford(s, upgradeCost(s, id));

export function upgrade(s, id, quiet = false) {
  if (!canUpgrade(s, id)) return false;
  const before = stageIndex(id, s.buildings[id].lv);
  pay(s, upgradeCost(s, id));
  s.buildings[id].lv++; s.stats.upgrades = (s.stats.upgrades || 0) + 1;
  const after = stageIndex(id, s.buildings[id].lv);
  if (!quiet) {
    quote(pickLine(after > before ? LINES.stageUp : LINES.upgrade));
    cue('buildingUp', { id, stage: after > before });          // 供 ui 播放升級動畫
  }
  return true;
}

// 批量購買：連續升級同一棟最多 n 級（Infinity＝買到買不起或到上限）。回傳實際升了幾級；只播一次台詞與動畫
export function upgradeN(s, id, n) {
  const before = stageIndex(id, s.buildings[id].lv);
  let got = 0;
  while (got < n && upgrade(s, id, true)) got++;
  if (got) {
    quote(pickLine(stageIndex(id, s.buildings[id].lv) > before ? LINES.stageUp : LINES.upgrade));
    cue('buildingUp', { id, stage: stageIndex(id, s.buildings[id].lv) > before });
  }
  return got;
}
// 目前最多能連買幾級（不實際購買；用複本推演，供按鈕顯示）
export function affordableLevels(s, id, cap = Infinity) {
  const probe = { ...s, res: { ...s.res }, buildings: { ...s.buildings, [id]: { ...s.buildings[id] } }, stats: { ...s.stats } };
  let n = 0;
  while (n < cap && canUpgrade(probe, id)) { pay(probe, upgradeCost(probe, id)); probe.buildings[id].lv++; n++; }
  return n;
}

// 全部升級：反覆挑「買得起且最便宜」的建築升一級，直到沒有買得起的（最多 3000 次防呆）。回傳升了幾級。
export function upgradeAll(s) {
  let n = 0;
  for (; n < 3000; n++) {
    const opts = Object.keys(s.buildings).filter(id => canUpgrade(s, id)).map(id => [id, Object.values(upgradeCost(s, id)).reduce((a, v) => a + v, 0)]);
    if (!opts.length) break;
    opts.sort((a, b) => a[1] - b[1]);
    upgrade(s, opts[0][0], true);
  }
  if (n) { quote(pickLine(LINES.upgrade)); cue('buildingUp', { id: null, stage: false }); }       // 只播一次，避免一口氣升上百級時台詞與音效洗版
  return n;
}

// 駐守位：lv≥1 才有，1 + floor((lv-1)/3)
export const slots = (s, id) => {
  const lv = s.buildings[id].lv;
  return lv < 1 ? 0 : 1 + Math.floor((lv - 1) / CONFIG.building.slotEvery);
};
