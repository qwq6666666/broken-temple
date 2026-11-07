// 藏：偽裝值隨時間增加、蓄力倍率、仇人成長、差距指標。
import { CONFIG } from '../config.js';
import { VISITOR_TYPES } from '../data/visitors.js';
import { PERSONALITY_BIAS } from '../data/enemies.js';
import { KE, elementFromName } from '../data/elements.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { REALMS, lvlLabel, tierOfLvl, powerOfLvl, TIER_NAMES } from '../data/realms.js';
import { combatPower, traitSum } from './economy.js';
import { perm as daoPerm } from './dao.js';

// 蓄力倍率：每 10 分鐘 +5%，上限 ×3（連續計算）
export const chargeMult = s =>
  Math.min(CONFIG.conceal.chargeMaxMult,
    1 + CONFIG.conceal.chargeStepBonus * (s.disguise.chargeMs / CONFIG.conceal.chargeStepMs));

export const disguiseFull = s => s.disguise.value >= CONFIG.conceal.max;

// 每 tick：偽裝值緩增、蓄力計時、仇人成長
export function tick(s, dt) {
  const d = s.disguise;
  d.value = Math.min(CONFIG.conceal.max, d.value + dt * (1 + traitSum(s, 'disguiseRate') + daoPerm(s, 'disguiseRate')) / (CONFIG.conceal.timeGainSec * 1000));
  d.chargeMs += dt;
  const grow = CONFIG.enemy.growthPerMin * dt / 60000;
  for (const g of s.grudges) {
    g.age = (g.age || 0) + dt;
    g.lvl = Math.min(CONFIG.enemy.maxLevel + 0.99, g.lvl + grow * growthOf(g));
  }
}
// 成長倍率 = 個性倍率 × 怨毒（在簿上越久越快，bitterMin 分鐘達上限）
export const growthOf = g => (PERSONALITY_BIAS[g.personality]?.growth || 1) * (1 + CONFIG.enemy.bitterMax * Math.min(1, (g.age || 0) / (CONFIG.enemy.bitterMin * 60000)));
export const isBitter = g => (g.age || 0) >= CONFIG.enemy.bitterMin * 60000;
// 復仇簿佔用格數：長老與宿敵占 2 格
export const grudgeSize = g => (g.nemesisId ? 2 : VISITOR_TYPES[g.type]?.size || 1);
export const bookUsed = s => s.grudges.reduce((a, g) => a + grudgeSize(g), 0);

// 單一仇人的預估結果：'crush' | 'narrow' | 'fail'
// 五行克制：已派駐弟子裡，每位剋制該仇人的 +3%、被他剋制的 −2%（夾在 0.85～1.20）。舊存檔沒有五行的仇人用名字推一個。
export const elementOfGrudge = g => g.element || elementFromName(g.name);
export function elementAdvantage(s, g) {
  const E = CONFIG.element, el = elementOfGrudge(g);
  let beat = 0, beaten = 0;
  if (E.enabled) for (const d of s.disciples) {
    if (!d.at) continue;
    const de = DISCIPLES_BY_ID[d.defId].element;
    if (KE[de] === el) beat++; else if (KE[el] === de) beaten++;
  }
  const mult = E.enabled ? Math.min(E.enemyMax, Math.max(E.enemyMin, 1 + beat * E.enemyBeat - beaten * E.enemyBeaten)) : 1;
  return { element: el, beat, beaten, mult };
}
export function ratioOf(s, g) { return combatPower(s) * elementAdvantage(s, g).mult / powerOfLvl(g.lvl); }
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
  const adv = elementAdvantage(s, g);
  return { element: adv.element, adv, enemy: lvlLabel(g.lvl), me: me.name, tierGap, tierName: TIER_NAMES[tierOfLvl(g.lvl)], text, ratio, verdict };
}
