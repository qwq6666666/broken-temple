// 建築：升級成本（基礎 × 1.15^等級）、外觀里程碑、駐守位。
import { CONFIG } from '../config.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { REALMS } from '../data/realms.js';
import { DAO_SHOP_BY_ID } from '../data/daoShop.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote, cue } from './events.js';
export { lvEff, milestoneMult, nextMilestone } from './buildingMath.js';

export const def = id => BUILDINGS_BY_ID[id];
// 建築等級上限：受境界限制（避免一下滿級），最高 CONFIG.building.maxLevel（100）
// 道心商店「擴建」增加的等級（每級 +10，最多 +900）
export const extraLevels = s => (s.reincarnation?.shop?.expand || 0) * (DAO_SHOP_BY_ID.expand?.perLevel || 0);
const TOP = REALMS.length - 1;
// 境界 i 的等級上限；extra＝擴建加成，依境界逐步生效（凡人 0、化神全額），所以每一輪都感覺得到，又不會繞過境界
export const capAtRealm = (i, extra = 0) => Math.min(CONFIG.building.maxLevel, CONFIG.building.levelCapBase + Math.floor(i * CONFIG.building.levelCapRealmFactor)) + Math.floor(extra * Math.min(i, TOP) / TOP + 1e-9);
export const levelCap = s => capAtRealm(s.realmIdx, extraLevels(s));
export const maxLevelOf = s => CONFIG.building.maxLevel + extraLevels(s);        // 目前所有加成加滿的最高等級（介面顯示用）
export const isMax = (s, id) => s.buildings[id].lv >= maxLevelOf(s);
export const isCapped = (s, id) => s.buildings[id].lv >= levelCap(s);
// 目前等級上限對應的「需要境界」：能升到 lv+1 所需的最低境界序號
const needMemo = new Map();                                       // (等級, 擴建) → 所需境界；純函式，快取讓批量購買與每幀按鈕狀態很便宜
export function realmNeededFor(lv, extra = 0) {
  const key = lv * 1e4 + extra, hit = needMemo.get(key);
  if (hit !== undefined) return hit;
  let i = 0;
  while (capAtRealm(i, extra) < lv && i < 99) i++;
  if (needMemo.size > 5000) needMemo.clear();
  needMemo.set(key, i);
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
export const upgradeCost = (s, id) => costAtLevel(s, id, s.buildings[id].lv);
// 把建築從 lv 升到 lv+1 的成本
function costAtLevel(s, id, lv) {
  const out = {};
  const realmMult = REALMS[Math.min(TOP, realmNeededFor(lv + 1, extraLevels(s)))].mult;
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
// 目前最多能連買幾級（不實際購買、不改動 state；供按鈕可按與否判斷）。cap 小時很便宜，介面只問「≥2 嗎」
export function affordableLevels(s, id, cap = Infinity) {
  if (!canUpgrade(s, id)) return 0;
  const have = { ...s.res }, top = levelCap(s);
  let lv = s.buildings[id].lv, n = 0;
  while (n < cap && lv < top) {
    const c = costAtLevel(s, id, lv);
    if (Object.entries(c).some(([k, v]) => (have[k] || 0) < v)) break;
    for (const [k, v] of Object.entries(c)) have[k] -= v;
    lv++; n++;
  }
  return n;
}

// 全部升級：反覆挑「買得起且最便宜」的建築升一級，直到沒有買得起的（最多 3000 次防呆）。回傳升了幾級。
export function upgradeAll(s) {
  let n = 0;
  const costOf = id => (isBuildingUnlocked(s, id) && !isCapped(s, id) ? upgradeCost(s, id) : null);
  const cost = Object.fromEntries(Object.keys(s.buildings).map(id => [id, costOf(id)]));      // 每棟的下一級成本只算一次；升級後只重算那一棟
  for (; n < 3000; n++) {
    let pick = null, pv = Infinity;
    for (const id of Object.keys(cost)) {
      const c = cost[id]; if (!c || !canAfford(s, c)) continue;
      const v = Object.values(c).reduce((a, x) => a + x, 0);
      if (v < pv) { pv = v; pick = id; }
    }
    if (!pick) break;
    upgrade(s, pick, true); cost[pick] = costOf(pick);
  }
  if (n) { quote(pickLine(LINES.upgrade)); cue('buildingUp', { id: null, stage: false }); }       // 只播一次，避免一口氣升上百級時台詞與音效洗版
  return n;
}

// 駐守位：lv≥1 才有，1 + floor((lv-1)/3)
export const slots = (s, id) => {
  const lv = s.buildings[id].lv;
  return lv < 1 ? 0 : 1 + Math.floor((lv - 1) / CONFIG.building.slotEvery);
};
