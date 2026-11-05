// 轉生與道心：化神後重置本輪進度，換取道心；道心在商店購買永久加成。
import { CONFIG } from '../config.js';
import { DAO_SHOP, DAO_SHOP_BY_ID } from '../data/daoShop.js';
import { createState } from './state.js';
import { canAfford, pay } from './resources.js';
import { toast, quote, cue } from './events.js';
import { specSum } from './spec.js';
import { factionPerm } from './factions.js';
import { mutSum } from './mutators.js';
import { MUTATORS_BY_ID } from '../data/mutators.js';

// 轉生次數的自動加成：前 softCap 次線性，之後只有小幅尾巴（遞減）
export function autoBonus(count) {
  const R = CONFIG.reincarnation;
  return R.autoBonusPerCount * Math.min(count, R.autoBonusSoftCap) + R.autoBonusTail * Math.max(0, count - R.autoBonusSoftCap);
}

export const shopLevel = (s, id) => s.reincarnation.shop[id] || 0;

// 道心商店加成總和 + 轉生次數的自動加成（靈氣、靈石各 +10%/次）
export function perm(s, key) {
  let v = 0;
  for (const it of DAO_SHOP) if (it.key === key) v += shopLevel(s, it.id) * it.perLevel;
  if (key === 'qiMult' || key === 'stoneMult') v += autoBonus(s.reincarnation.count);
  return v + specSum(s, key) + factionPerm(s, key) + mutSum(s, key);   // 建築專精、勢力威望、輪迴詞條
}

export const canRebirth = s => s.realmIdx >= CONFIG.reincarnation.minRealm && !s.burstActive;

// 本輪道心收益
export function daoGain(s) {
  const R = CONFIG.reincarnation, r = s.run;
  const base = Math.min(R.daoBaseMax, R.daoBase + R.daoBasePerCount * s.reincarnation.count);   // 轉生越多次，基礎道心略增
  const raw = base + Math.min(R.burstCap, r.bursts) * R.perBurst + r.maxChain * R.perChain + r.nemeses * R.perNemesis + r.goals * R.perGoal;
  return Math.floor(raw * (1 + mutSum(s, 'dao')));                       // 輪迴詞條：本輪道心倍率
}

// 轉生：重置本輪，保留收藏類進度。回傳獲得的道心；不符條件回傳 null
export function rebirth(s, mutatorId = null) {
  if (!canRebirth(s)) return null;
  const gain = daoGain(s);
  const fresh = createState();
  const keep = {
    // 重置等級與派駐，但保留弟子本身與星級
    disciples: s.disciples.map(d => ({ ...d, lv: 1, at: null })),
    nextUid: s.nextUid, nextGid: s.nextGid, recruits: s.recruits,
    artifacts: s.artifacts, goalsDone: s.goalsDone, commissions: s.commissions, nemeses: s.nemeses,
    gacha: s.gacha, settings: s.settings, stats: s.stats, unlocked: s.unlocked, seenIntro: s.seenIntro, stories: s.stories, factions: s.factions,
    reincarnation: { count: s.reincarnation.count + 1, shop: s.reincarnation.shop },
  };
  const t = s.t;
  const shard = s.res.shard, dao = s.res.daoHeart + gain;
  Object.assign(s, fresh, keep);
  s.t = t; s.mutator = MUTATORS_BY_ID[mutatorId] ? mutatorId : null;      // 下一輪的輪迴詞條
  s.res.shard = shard; s.res.daoHeart = dao;
  s.res.stone += perm(s, 'startStone'); s.res.token += perm(s, 'startToken');
  s.visitor.nextAt = s.t + CONFIG.visitor.firstSec * 1000;
  s.incident.nextAt = s.t + 300000;
  toast(`☯️ 轉生成功！獲得道心 ${gain}`, 'good'); cue('goal');
  quote('輪迴一遭，這座破廟又換了新顏。……別急，這一次，你知道路了。');
  return gain;
}

// 道心商店
export function shopCost(s, id) {
  const it = DAO_SHOP_BY_ID[id];
  return { daoHeart: Math.ceil(it.baseCost * it.growth ** shopLevel(s, id)) };
}
export const canBuy = (s, id) => shopLevel(s, id) < DAO_SHOP_BY_ID[id].maxLv && canAfford(s, shopCost(s, id));
export function buy(s, id) {
  if (!canBuy(s, id)) return false;
  pay(s, shopCost(s, id));
  s.reincarnation.shop[id] = shopLevel(s, id) + 1;
  return true;
}

// 道心兌換：商店買滿後的出口，固定價格可重複兌換（不影響進度速度，只補收藏與升星需求）
export const EXCHANGES = [
  { id: 'exToken', name: '兌換招賢令', icon: '🎫', cost: 6, give: { token: 6 }, desc: '6 道心 → 6 招賢令' },
  { id: 'exShard', name: '兌換碎片',   icon: '🧩', cost: 6, give: { shard: 12 }, desc: '6 道心 → 12 碎片（升星、築基後突破）' },
];
export function exchange(s, id) {
  const e = EXCHANGES.find(x => x.id === id);
  if (!e || !canAfford(s, { daoHeart: e.cost })) return false;
  pay(s, { daoHeart: e.cost });
  for (const [k, v] of Object.entries(e.give)) s.res[k] += v;
  return true;
}
