// 宗門委託：同時最多 3 張，沒有期限也沒有懲罰；手動領取獎勵、可放棄，空位過一陣子自動補新題。
import { COMMISSIONS, COMMISSION_BY_KIND, COMMISSION_RULES as R } from '../data/commissions.js';
import { pick, weighted } from './rng.js';
import { qiPerSec, stonePerSec } from './economy.js';
import { toast, cue } from './events.js';
import { note } from './chronicle.js';

export const progressOf = (s, c) => {
  const d = COMMISSION_BY_KIND[c.kind];
  if (!d) return 0;
  const cur = d.cur(s);
  if (cur < c.base) c.base = cur;                          // 累計值被重置時重新對齊，避免永遠卡死
  return Math.min(c.target, cur - c.base);
};
export const isReady = (s, c) => progressOf(s, c) >= c.target;
export const readyCount = s => s.commissions.list.filter(c => isReady(s, c)).length;
export const rewardText = r => [r.token && `🎫${r.token}`, r.stone && `💎${r.stone}`, r.qi && `✨${r.qi}`, r.shard && `🧩${r.shard}`].filter(Boolean).join('　');

function makeReward(s) {
  const t = s.realmIdx;
  const pool = [
    ['token', 3, () => ({ token: 1 + Math.floor(t / 5) })],
    ['stone', 3, () => ({ stone: Math.max(20, Math.floor(stonePerSec(s) * R.stoneSec)) })],
    ['qi', 2, () => ({ qi: Math.max(50, Math.floor(qiPerSec(s) * R.qiSec)) })],
  ];
  if (t >= R.shardFromRealm) pool.push(['shard', 1, () => ({ shard: 1 + Math.floor(t / 6) })]);
  return weighted(pool, p => p[1])[2]();
}

function generate(s) {
  const used = new Set(s.commissions.list.map(c => c.kind));
  const pool = COMMISSIONS.filter(d => !used.has(d.kind) && d.ok(s));
  if (!pool.length) return null;
  const d = pick(pool);
  return { kind: d.kind, target: d.target(s.realmIdx), base: d.cur(s), reward: makeReward(s) };
}

export function tick(s) {
  const C = s.commissions;
  if (!s.unlocked.goals || C.list.length >= R.slots || s.t < C.nextAt) return;
  const c = generate(s);
  if (!c) { C.nextAt = s.t + R.refillMs; return; }
  C.list.push(c);                                           // 一個 tick 補一張，開局時很快補滿
}

export function claim(s, i) {
  const C = s.commissions, c = C.list[i];
  if (!c || !isReady(s, c)) return null;
  for (const k of ['token', 'stone', 'qi', 'shard']) if (c.reward[k]) s.res[k] += c.reward[k];
  C.list.splice(i, 1); C.nextAt = s.t + R.refillMs; C.done++;
  let bonus = null;
  if (C.done % R.milestoneEvery === 0) {
    bonus = R.milestoneReward;
    for (const k of Object.keys(bonus)) s.res[k] += bonus[k];
    note(s, '📋', `累計完成 ${C.done} 張委託`);
    toast(`📋 累計完成 ${C.done} 張委託，額外獎勵 ${rewardText(bonus)}`, 'good');
  }
  cue('goal');
  return { reward: c.reward, bonus };
}

export function abandon(s, i) {
  const C = s.commissions;
  if (!C.list[i]) return false;
  C.list.splice(i, 1); C.nextAt = s.t + R.refillMs;
  return true;
}
