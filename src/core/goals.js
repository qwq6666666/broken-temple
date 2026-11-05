// 宗門大事：每 tick 檢查進度，完成時發獎勵一次（永久加成由 economy.artifactSum 一併計入）。
import { GOALS, GOALS_BY_ID } from '../data/goals.js';
import { toast } from './events.js';

export const isDone = (s, id) => s.goalsDone.includes(id);
export const progress = (s, g) => Math.min(g.target, g.cur(s));

// 永久加成總和（供 economy 使用）
export const goalPerm = (s, key) =>
  s.goalsDone.reduce((a, id) => a + (GOALS_BY_ID[id]?.reward.perm?.[key] || 0), 0);

export function tick(s) {
  for (const g of GOALS) {
    if (isDone(s, g.id) || g.cur(s) < g.target) continue;
    s.goalsDone.push(g.id);
    for (const k of ['stone', 'token', 'qi']) if (g.reward[k]) s.res[k] += g.reward[k];
    toast(`🎯 宗門大事達成：${g.name}`, 'good');
  }
}
