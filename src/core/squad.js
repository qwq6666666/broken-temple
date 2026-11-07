// 出戰陣容：引爆時對每位仇人的戰力比加成（沒選人 = 不加成，與舊行為一致）。
import { SQUAD, COUNTER_SPEC } from '../data/squad.js';
import { KE } from '../data/elements.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { elementOfGrudge } from './conceal.js';

export const squadOf = s => (s.squad || []).map(u => s.disciples.find(d => d.uid === u)).filter(Boolean);

// 單人對單一仇人的加成明細
export function memberVs(d, g) {
  const df = DISCIPLES_BY_ID[d.defId], el = elementOfGrudge(g);
  const base = SQUAD.base[df.rarity] || 0;
  const elem = KE[df.element] === el ? SQUAD.beat : KE[el] === df.element ? SQUAD.beaten : 0;
  const counter = COUNTER_SPEC[g.personality] === df.specialty ? SQUAD.counter : 0;
  return { base, elem, counter, total: base + elem + counter };
}
// 陣容對單一仇人：mult 與逐人明細
export function squadVs(s, g, members = squadOf(s)) {
  const parts = members.map(d => ({ d, ...memberVs(d, g) }));
  return { mult: 1 + parts.reduce((a, p) => a + p.total, 0), parts };
}

export function toggleSquad(s, uid) {
  s.squad = s.squad || [];
  const i = s.squad.indexOf(uid);
  if (i >= 0) { s.squad.splice(i, 1); return true; }
  if (!s.disciples.some(d => d.uid === uid) || s.squad.length >= SQUAD.max) return false;
  s.squad.push(uid); return true;
}
export const clearSquad = s => { s.squad = []; };

// 推薦陣容：窮舉所有 ≤3 人組合，使「預計擊敗的人數優先、其次總戰力比」最大。
// score 由呼叫端提供（避免循環依賴）：score(members) → 數值。
export function bestSquad(s, score) {
  const pool = [...s.disciples].sort((a, b) => avgBonus(s, b, memberVs(b, NO_FOE).total) - avgBonus(s, a, memberVs(a, NO_FOE).total)).slice(0, 14);
  let best = [], bestV = score([]);
  const n = pool.length;
  for (let i = 0; i < n; i++) {
    let v = score([pool[i]]); if (v > bestV) { bestV = v; best = [pool[i]]; }
    for (let j = i + 1; j < n; j++) {
      v = score([pool[i], pool[j]]); if (v > bestV) { bestV = v; best = [pool[i], pool[j]]; }
      for (let k = j + 1; k < n; k++) {
        v = score([pool[i], pool[j], pool[k]]); if (v > bestV) { bestV = v; best = [pool[i], pool[j], pool[k]]; }
      }
    }
  }
  return best.map(d => d.uid);
}
const NO_FOE = { element: '', personality: '' };   // 沒有仇人時，以稀有度底分排序
// 候選排序用：這位弟子對目前所有仇人的平均加成
const avgBonus = (s, d, idle = 0) => s.grudges.length ? s.grudges.reduce((a, g) => a + memberVs(d, g).total, 0) / s.grudges.length : idle;

// 候選名單：每位弟子對目前所有仇人的平均加成，高到低（已出戰者一律列入）
export function squadPool(s) {
  return s.disciples.map(d => ({ d, avg: avgBonus(s, d), on: (s.squad || []).includes(d.uid) })).sort((a, b) => (b.on - a.on) || b.avg - a.avg).slice(0, 16);
}
