// 境界突破：花靈石（築基以上另需碎片）。演出由 ui 負責，core 只結算並發老祖評論。
import { REALMS } from '../data/realms.js';
import { LINES, pickLine } from '../data/lines.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';
import { note } from './chronicle.js';
import { CONFIG } from '../config.js';
import { perm } from './dao.js';

export const nextRealm = s => REALMS[s.realmIdx + 1] || null;
// 突破折扣：舊路重走（階 ≤ 歷史最高境界 frontier）× 道心「破境心得」；總折扣下限 breakDiscFloor
export const oldPath = (s, idx) => idx <= (s.frontier || 0);
export const breakDiscount = (s, idx) => Math.max(CONFIG.realm.breakDiscFloor, (oldPath(s, idx) ? CONFIG.realm.oldPath : 1) * (1 - perm(s, 'breakCut')));
export function breakCost(s) {
  const n = nextRealm(s);
  if (!n) return null;
  const c = { stone: Math.max(1, Math.round(n.stoneCost * breakDiscount(s, n.idx))) };
  if (n.matCost && !(CONFIG.realm.oldPathFreeMats && oldPath(s, n.idx))) Object.assign(c, n.matCost);          // 預設走過的階仍需材料（材料才是真正的瓶頸）
  return c;
}
export const canBreak = s => !!nextRealm(s) && canAfford(s, breakCost(s));

// 回傳 {from, to, line}；失敗回傳 null
export function breakthrough(s) {
  if (!canBreak(s)) return null;
  const from = REALMS[s.realmIdx];
  pay(s, breakCost(s));
  s.realmIdx++; s.frontier = Math.max(s.frontier || 0, s.realmIdx);
  const to = REALMS[s.realmIdx];
  const line = to.tier > from.tier ? pickLine(LINES.breakTier[to.tier]) : pickLine(LINES.breakLayer);
  quote(line);
  if (to.tier > from.tier) note(s, '🧘', `突破至${to.name}`);
  return { from, to, line };
}
