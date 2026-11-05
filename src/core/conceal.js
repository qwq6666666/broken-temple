// 藏：偽裝值隨時間增加、蓄力倍率、仇人成長、差距指標。
import { CONFIG } from '../config.js';
import { REALMS, lvlLabel, tierOfLvl, powerOfLvl, TIER_NAMES } from '../data/realms.js';
import { combatPower } from './economy.js';

// 蓄力倍率：每 10 分鐘 +5%，上限 ×3（連續計算）
export const chargeMult = s =>
  Math.min(CONFIG.conceal.chargeMaxMult,
    1 + CONFIG.conceal.chargeStepBonus * (s.disguise.chargeMs / CONFIG.conceal.chargeStepMs));

export const disguiseFull = s => s.disguise.value >= CONFIG.conceal.max;

// 每 tick：偽裝值緩增、蓄力計時、仇人成長
export function tick(s, dt) {
  const d = s.disguise;
  d.value = Math.min(CONFIG.conceal.max, d.value + dt / (CONFIG.conceal.timeGainSec * 1000));
  d.chargeMs += dt;
  const grow = CONFIG.enemy.growthPerMin * dt / 60000;
  for (const g of s.grudges) g.lvl = Math.min(CONFIG.enemy.maxLevel + 0.99, g.lvl + grow);
}

// 單一仇人的預估結果：'crush' | 'narrow' | 'fail'
export function ratioOf(s, g) { return combatPower(s) / powerOfLvl(g.lvl); }
export function verdictOf(ratio) {
  if (ratio >= CONFIG.burst.crushRatio) return 'crush';
  if (ratio >= CONFIG.burst.narrowRatio) return 'narrow';
  return 'fail';
}

// 差距指標：例如「對方築基中期，你煉氣九層，差 1 個大境界」
export function gapInfo(s, g) {
  const me = REALMS[s.realmIdx];
  const tierGap = tierOfLvl(g.lvl) - me.tier;
  const ratio = ratioOf(s, g);
  const verdict = verdictOf(ratio);
  let text;
  if (tierGap > 0) text = `差 ${tierGap} 個大境界`;
  else if (verdict === 'fail') text = '同大境界，對方略高';
  else text = '你已不輸對方';
  return { enemy: lvlLabel(g.lvl), me: me.name, tierGap, tierName: TIER_NAMES[tierOfLvl(g.lvl)], text, ratio, verdict };
}
