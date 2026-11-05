// 探索度：成功次數 → 等級 → 待領取的發現事件 → 永久加成。
import { EX_LEVELS, EX_REWARD_PER_LV, EX_PERM, EXPLORATION } from '../data/exploration.js';
import { EXPEDITIONS_BY_ID } from '../data/expeditions.js';
import { qiPerSec, stonePerSec } from './economy.js';
import { note } from './chronicle.js';
import { toast, cue } from './events.js';

export const exXp = (s, id) => s.explore?.[id] || 0;
export const exLevel = (s, id) => EX_LEVELS.filter(n => exXp(s, id) >= n).length;
export const exRewardMult = (s, id) => 1 + EX_REWARD_PER_LV * exLevel(s, id);
export const exNext = (s, id) => EX_LEVELS[exLevel(s, id)] ?? null;
const milestones = (s, id) => (s.exMile[id] ||= {});
// 待領取：已達成但還沒領的發現
export const pendingEvents = s => Object.keys(EXPLORATION).flatMap(id => { const m = s.exMile[id] || {}; return Array.from({ length: exLevel(s, id) }, (_, i) => i + 1).filter(lv => !m[lv]).map(lv => ({ id, lv })); });

// 成功探索 +1，回傳是否剛解鎖新事件
export function addProgress(s, id) {
  const before = exLevel(s, id);
  s.explore[id] = exXp(s, id) + 1;
  const after = exLevel(s, id);
  if (after > before) { const e = EXPEDITIONS_BY_ID[id]; toast(`${e.emoji}${e.name}探索度升至 ${after}：有新的發現！`, 'good'); cue('goal'); }
  return after > before;
}

// 領取發現事件。第 2 則要傳 choice 'a'（立即資源）或 'b'（永久加成）
export function resolve(s, id, lv, choice = 'x') {
  const D = EXPLORATION[id]; if (!D || lv < 1 || lv > EX_LEVELS.length) return null;
  if (lv > exLevel(s, id) || milestones(s, id)[lv]) return null;
  if (lv === 2 && choice !== 'a' && choice !== 'b') return null;
  const e = EXPEDITIONS_BY_ID[id], got = {};
  if (lv === 1) for (const [k, v] of Object.entries(D.reward1)) { s.res[k] += v; got[k] = v; }
  if (lv === 2 && choice === 'a') {
    const r = D.reward2a;
    if (r.qiSec) { got.qi = qiPerSec(s) * r.qiSec; s.res.qi += got.qi; }
    if (r.stoneSec) { got.stone = Math.max(1, stonePerSec(s) * r.stoneSec); s.res.stone += got.stone; }
  }
  const perm = lv === 3 || (lv === 2 && choice === 'b');
  milestones(s, id)[lv] = lv === 2 ? choice : 'x';
  if (perm) note(s, e.emoji, `${e.name}：${D['t' + lv][0]}（永久加成）`);
  else if (lv === 3) note(s, e.emoji, `${e.name}探索圓滿`);
  return { e, lv, title: D['t' + lv][0], text: D['t' + lv][1], got, perm: perm ? { key: D.key, per: EX_PERM } : null };
}

// 永久加成：第 3 則一定有；第 2 則選 B 才有
export function explorePerm(s, key) {
  let v = 0;
  for (const [id, D] of Object.entries(EXPLORATION)) {
    if (D.key !== key) continue;
    const m = s.exMile[id] || {};
    if (m[3]) v += EX_PERM;
    if (m[2] === 'b') v += EX_PERM;
  }
  return v;
}
