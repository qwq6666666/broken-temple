// 弟子：取得、升級（花靈氣）、派駐。
import { BRANCHES, BRANCH_LEVEL } from '../data/branches.js';
import { CONFIG } from '../config.js';
import { chance } from './rng.js';
import { RARITIES } from '../data/gachaRates.js';
import { defOf, starOf } from './discipleMath.js';
import { discipleDiscount } from './economy.js';
import { perm } from './dao.js';
import { slots } from './buildings.js';
import { lvEff } from './buildingMath.js';
import { canAfford, pay } from './resources.js';

export const dshardsOf = (s, defId) => s.dshards?.[defId] || 0;
// 新增弟子；已擁有同一位 → 轉為「該弟子的專屬碎片」（只能替他升星；通用碎片另有來源）
export function addDisciple(s, defId) {
  const exist = s.disciples.find(d => d.defId === defId);
  if (exist) {
    const rar = RARITIES[defOf(exist).rarity];
    (s.dshards ||= {})[defId] = dshardsOf(s, defId) + rar.shard;
    const uni = Math.round(rar.shard * CONFIG.disciple.dupUniversal); s.res.shard += uni;          // 另給少量通用碎片
    return { isNew: false, shards: rar.shard, uni, disciple: exist };
  }
  const d = { uid: s.nextUid++, defId, lv: 1, at: null, star: 0 };
  s.disciples.push(d);
  if (!s.pendingSecret && chance(CONFIG.secret.chance)) s.pendingSecret = { uid: d.uid, kind: chance(0.5) ? 'fate' : 'spy' };      // 12% 機率帶著隱藏身份：氣運之子／臥底
  return { isNew: true, shards: 0, disciple: d };
}

export const levelCap = s => CONFIG.disciple.baseLevelCap + Math.floor(lvEff(s.buildings.arena.lv) * CONFIG.disciple.capPerArenaLevel + lvEff(s.buildings.hall.lv) + 1e-9) + perm(s, 'discipleCap');   // 演武場、傳功殿、專精
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

// 全部升級：反覆挑「買得起且最便宜」的弟子升一級，直到沒有買得起的（最多 2000 次防呆）。回傳升了幾級
export function levelUpAll(s) {
  let n = 0;
  for (; n < 2000; n++) {
    const opts = s.disciples.filter(d => canLevel(s, d));
    if (!opts.length) break;
    opts.sort((a, b) => levelCost(s, a).qi - levelCost(s, b).qi);
    levelUp(s, opts[0].uid);
  }
  return n;
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

// 升星：屬性與特性 +25%、等級上限 +2；滿星回傳 null。
// starCost 是需要的「弟子專屬碎片」數；不夠的部分可用通用碎片抵（每 1 片專屬碎片 = CONFIG.disciple.shardSwap 片通用碎片）
export function starCost(d) {
  const tbl = CONFIG.disciple.starCost[defOf(d).rarity];
  return starOf(d) >= CONFIG.disciple.starMax ? null : { shard: tbl[starOf(d)] };
}
// 實際支付方式：{ need 需要, own 用掉的專屬碎片, uni 要付的通用碎片, ok 付得起 }
export function starPay(s, d) {
  const c = starCost(d); if (!c) return null;
  const own = Math.min(dshardsOf(s, d.defId), c.shard), uni = (c.shard - own) * CONFIG.disciple.shardSwap;
  return { need: c.shard, own, uni, ok: s.res.shard >= uni };
}
export const canStar = (s, d) => !!starPay(s, d)?.ok;
export function starUp(s, uid) {
  const d = s.disciples.find(x => x.uid === uid);
  if (!d || !canStar(s, d)) return false;
  const p = starPay(s, d);
  s.dshards[d.defId] = dshardsOf(s, d.defId) - p.own; s.res.shard -= p.uni; d.star = starOf(d) + 1;
  return true;
}

// 進階：Lv10 以上、尚未選過才能選；只能二選一（轉生後等級重置會一併重選）
export const canBranch = d => d.lv >= BRANCH_LEVEL && !d.branch;
export function setBranch(s, uid, key) {
  const d = s.disciples.find(x => x.uid === uid);
  if (!d || !BRANCHES[key] || !canBranch(d) || !canAfford(s, BRANCHES[key].cost)) return false;
  pay(s, BRANCHES[key].cost); d.branch = key; return true;
}
