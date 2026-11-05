// 弟子：取得、升級（花靈氣）、派駐。
import { CONFIG } from '../config.js';
import { RARITIES } from '../data/gachaRates.js';
import { defOf } from './discipleMath.js';
import { discipleDiscount } from './economy.js';
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
  const d = { uid: s.nextUid++, defId, lv: 1, at: null };
  s.disciples.push(d);
  return { isNew: true, shards: 0, disciple: d };
}

export const levelCap = s => CONFIG.disciple.baseLevelCap + s.buildings.arena.lv * CONFIG.disciple.capPerArenaLevel;

export function levelCost(s, d) {
  const base = RARITIES[defOf(d).rarity].lvBase * CONFIG.disciple.costGrowth ** (d.lv - 1);
  return { qi: Math.ceil(base * (1 - discipleDiscount(s))) };
}
export const canLevel = (s, d) => d.lv < levelCap(s) && canAfford(s, levelCost(s, d));
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
  if (!bid) { d.at = null; return true; }
  if (d.at === bid) return true;
  if (assignedTo(s, bid).length >= slots(s, bid)) return false;
  d.at = bid;
  return true;
}
