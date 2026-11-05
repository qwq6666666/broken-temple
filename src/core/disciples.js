// 弟子：取得、升級（花靈氣）、派駐。
import { CONFIG } from '../config.js';
import { RARITIES } from '../data/gachaRates.js';
import { defOf, starOf } from './discipleMath.js';
import { discipleDiscount } from './economy.js';
import { perm } from './dao.js';
import { slots } from './buildings.js';
import { canAfford, pay } from './resources.js';

// 新增弟子；已擁有同一位 → 轉為碎片
export function addDisciple(s, defId) {
  const exist = s.disciples.find(d => d.defId === defId);
  if (exist) {
    const rar = RARITIES[defOf(exist).rarity];
    s.res.shard += rar.shard;
    return { isNew: false, shards: rar.shard, disciple: exist };
  }
  const d = { uid: s.nextUid++, defId, lv: 1, at: null, star: 0 };
  s.disciples.push(d);
  return { isNew: true, shards: 0, disciple: d };
}

export const levelCap = s => CONFIG.disciple.baseLevelCap + s.buildings.arena.lv * CONFIG.disciple.capPerArenaLevel + s.buildings.hall.lv + perm(s, 'discipleCap');   // 演武場、傳功殿、專精
// 個別弟子的等級上限：全域上限 + 每星 +2
export const levelCapOf = (s, d) => levelCap(s) + CONFIG.disciple.starCap * starOf(d);

export function levelCost(s, d) {
  const base = RARITIES[defOf(d).rarity].lvBase * CONFIG.disciple.costGrowth ** (d.lv - 1);
  return { qi: Math.ceil(base * (1 - discipleDiscount(s))) };
}
export const canLevel = (s, d) => d.lv < levelCapOf(s, d) && canAfford(s, levelCost(s, d));
export function levelUp(s, uid) {
  const d = s.disciples.find(x => x.uid === uid);
  if (!d || !canLevel(s, d)) return false;
  pay(s, levelCost(s, d));
  d.lv++;
  return true;
}

export const assignedTo = (s, bid) => s.disciples.filter(d => d.at === bid);

// 派駐：bid=null 為取消
export function assign(s, uid, bid) {
  const d = s.disciples.find(x => x.uid === uid);
  if (!d) return false;
  if (s.expeditions.some(x => x.uids.includes(uid))) return false;           // 探索中
  if (!bid) { d.at = null; return true; }
  if (d.at === bid) return true;
  if (assignedTo(s, bid).length >= slots(s, bid)) return false;
  d.at = bid;
  return true;
}

// 升星：花碎片，屬性與特性 +25%、等級上限 +2；滿星回傳 null
export function starCost(d) {
  const tbl = CONFIG.disciple.starCost[defOf(d).rarity];
  return starOf(d) >= CONFIG.disciple.starMax ? null : { shard: tbl[starOf(d)] };
}
export const canStar = (s, d) => { const c = starCost(d); return !!c && canAfford(s, c); };
export function starUp(s, uid) {
  const d = s.disciples.find(x => x.uid === uid);
  if (!d || !canStar(s, d)) return false;
  pay(s, starCost(d)); d.star = starOf(d) + 1;
  return true;
}
