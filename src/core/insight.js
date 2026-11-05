// 專長心得：領悟（花碎片）與生效判定。
import { INSIGHTS, INSIGHTS_BY_SPEC, INSIGHT_COST, INSIGHT_MAX } from '../data/insights.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { canAfford, pay } from './resources.js';
import { note } from './chronicle.js';

export const insightLv = (s, spec) => s.insight?.[spec] || 0;
export const insightCost = (s, spec) => (insightLv(s, spec) >= INSIGHT_MAX ? null : { shard: INSIGHT_COST[insightLv(s, spec)] });
export const canLearn = (s, spec) => { const c = insightCost(s, spec); return !!c && canAfford(s, c); };
// 生效條件：至少一位該專長的弟子正派駐在建築上（探索中的不算）
export const insightActive = (s, spec) => s.disciples.some(d => d.at && DISCIPLES_BY_ID[d.defId].specialty === spec);

export function learn(s, spec) {
  if (!INSIGHTS_BY_SPEC[spec] || !canLearn(s, spec)) return false;
  pay(s, insightCost(s, spec));
  s.insight[spec] = insightLv(s, spec) + 1;
  const i = INSIGHTS_BY_SPEC[spec];
  if (s.insight[spec] === INSIGHT_MAX) note(s, i.icon, `${spec}心得大成：${i.names[INSIGHT_MAX - 1]}`);
  return true;
}
// 某個加成鍵的心得總和；via 區分併入哪個加總（避免與特性加總重複計算）
export function insightPerm(s, key, via) {
  let v = 0;
  for (const i of INSIGHTS) if (i.key === key && i.via === via) { const lv = insightLv(s, i.spec); if (lv && insightActive(s, i.spec)) v += lv * i.per; }
  return v;
}
