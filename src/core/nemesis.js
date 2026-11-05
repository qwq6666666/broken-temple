// 宿敵：條件判斷、登場、擊敗。
import { CONFIG } from '../config.js';
import { NEMESES, NEMESES_BY_ID } from '../data/nemeses.js';
import { REALMS } from '../data/realms.js';
import { PERSONALITIES } from '../data/visitors.js';
import { randInt, randFloat, pick } from './rng.js';

export const nemState = (s, id) => (s.nemeses[id] ||= { met: 0, defeated: false });
export const isDefeated = (s, id) => !!s.nemeses[id]?.defeated;
export const isNemesis = g => !!g?.nemesisId;
export const nemOf = g => NEMESES_BY_ID[g.nemesisId];

// 條件是否達成（不含「是否已在場」）
export function unlocked(s, n) {
  if (isDefeated(s, n.id)) return false;
  if (s.realmIdx < (n.cond.minRealm || 0)) return false;
  return !n.cond.prev || isDefeated(s, n.cond.prev);
}
export const present = (s, id) => s.visitor.current?.nemesisId === id || s.grudges.some(g => g.nemesisId === id);
export const pickNemesis = s => NEMESES.find(n => unlocked(s, n) && !present(s, n.id)) || null;

// 解鎖條件的文字說明（宿敵錄用）
export function condText(s, n) {
  const parts = [];
  if (n.cond.prev) parts.push(`擊敗${NEMESES_BY_ID[n.cond.prev].name}`);
  if (n.cond.minRealm) parts.push(`境界達${REALMS[n.cond.minRealm].name}`);
  return parts.join('，且');
}

// 生成宿敵訪客（taunt 依見面次數推進）
export function makeNemesisVisitor(s, n) {
  const st = nemState(s, n.id);
  const taunt = n.intro[Math.min(st.met, n.intro.length - 1)];
  st.met++;
  const lvl = Math.max(0, Math.min(CONFIG.enemy.maxLevel, s.realmIdx + randInt(...n.offset))) + randFloat(0, 0.6);
  return { id: s.nextGid++, nemesisId: n.id, name: n.name, type: n.type, sect: n.sect, role: n.title,
           personality: n.personality, lvl, alert: false, taunt };
}

// 引爆時的結果台詞
export function lineFor(n, verdict, escaped) {
  return pick(verdict === 'crush' ? n.kneel : escaped ? n.narrow : n.fail);
}
export const fallbackLine = g => pick(PERSONALITIES[g.personality].fail);
