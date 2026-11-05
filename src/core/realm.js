// 境界突破：花靈石（築基以上另需碎片）。演出由 ui 負責，core 只結算並發老祖評論。
import { REALMS } from '../data/realms.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';
import { note } from './chronicle.js';

export const nextRealm = s => REALMS[s.realmIdx + 1] || null;
export function breakCost(s) {
  const n = nextRealm(s);
  if (!n) return null;
  const c = { stone: n.stoneCost };
  if (n.matCost) Object.assign(c, n.matCost);
  return c;
}
export const canBreak = s => !!nextRealm(s) && canAfford(s, breakCost(s));

// 回傳 {from, to, line}；失敗回傳 null
export function breakthrough(s) {
  if (!canBreak(s)) return null;
  const from = REALMS[s.realmIdx];
  pay(s, breakCost(s));
  s.realmIdx++;
  const to = REALMS[s.realmIdx];
  const line = to.tier > from.tier ? pickLine(LINES.breakTier[to.tier]) : pickLine(LINES.breakLayer);
  quote(line);
  if (to.tier > from.tier) note(s, '🧘', `突破至${to.name}`);
  return { from, to, line };
}
