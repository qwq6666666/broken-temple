// 秘境：派弟子組隊探索。結果在到期時結算並等待領取（離線也會完成）。
import { EXPEDITIONS, EXPEDITIONS_BY_ID, EXP_RULES as R } from '../data/expeditions.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { chance, pick } from './rng.js';
import { stat, isSpecialtyMatch, expStat } from './discipleMath.js';
import { qiPerSec, stonePerSec } from './economy.js';
import { rollSurrender } from './endure.js';
import { toast, cue } from './events.js';

export const slotCount = s => R.slots.reduce((n, [realm, c]) => (s.realmIdx >= realm ? c : n), 1);
export const isUnlocked = (s, e) => s.realmIdx >= e.unlockRealm;
export const away = (s, uid) => s.expeditions.some(x => x.uids.includes(uid));
export const freeDisciples = s => s.disciples.filter(d => !away(s, d.uid));

// 單人貢獻：屬性 ×（專長相合 ×1.3）×（五行相合 ×1.15）
function contrib(d, e) {
  const df = DISCIPLES_BY_ID[d.defId];
  let v = expStat(d);
  if (e.want.specialty && df.specialty === e.want.specialty) v *= R.specialtyMult;
  if (e.want.element && df.element === e.want.element) v *= R.elementMult;
  return v;
}
export const teamPower = (s, expId, uids) => uids.map(u => s.disciples.find(d => d.uid === u)).filter(Boolean).reduce((a, d) => a + contrib(d, EXPEDITIONS_BY_ID[expId]), 0);
export function successChance(s, expId, uids) {
  const r = teamPower(s, expId, uids) / EXPEDITIONS_BY_ID[expId].difficulty;
  return Math.max(0.05, Math.min(0.95, r / (r + 1)));
}

// 出發：隊員自動從建築撤下；回傳 true/false
export function start(s, expId, uids) {
  const e = EXPEDITIONS_BY_ID[expId]; if (!e || !isUnlocked(s, e)) return false;
  if (s.expeditions.length >= slotCount(s)) return false;
  const team = [...new Set(uids)].filter(u => s.disciples.some(d => d.uid === u) && !away(s, u));
  if (!team.length || team.length > R.maxTeam || !reqCheck(s, e, team).ok) return false;
  team.forEach(u => { s.disciples.find(d => d.uid === u).at = null; });
  s.expeditions.push({ id: expId, uids: team, startAt: s.t, endAt: s.t + e.minutes * 60000, chance: successChance(s, expId, team), status: 'running' });
  return true;
}

// 每 tick：到期的探索結算（擲骰、算獎勵），等待玩家領取
export function tick(s) {
  for (const x of s.expeditions) {
    if (x.status !== 'running' || s.t < x.endAt) continue;
    const e = EXPEDITIONS_BY_ID[x.id], ok = chance(x.chance), k = ok ? 1 : R.failShare, rw = e.reward, out = { qi: 0, stone: 0, token: 0, shard: 0 };
    if (rw.qiSec) out.qi = qiPerSec(s) * rw.qiSec * k;
    if (rw.stoneSec) out.stone = Math.max(1, stonePerSec(s) * rw.stoneSec * k);
    if (ok) {
      out.token = rw.token || 0; out.shard = rw.shard || 0;
      if (rw.artifact && chance(rw.artifact)) { const left = ARTIFACTS.filter(a => !a.unique && !s.artifacts.includes(a.id)); if (left.length) out.artifactId = pick(left).id; }
      if (rw.recruit && chance(rw.recruit)) out.recruit = true;
    } else out.shard = 1;                                   // 失敗也有一點收穫
    x.status = 'done'; x.success = ok; x.result = out;
    toast(`${e.emoji}${e.name}：探索${ok ? '成功' : '失敗'}，可以領取了`, ok ? 'good' : 'warn'); cue(ok ? 'goal' : 'visitor');
  }
}

// 領取獎勵並讓隊員回來
export function claim(s, i) {
  const x = s.expeditions[i]; if (!x || x.status !== 'done') return null;
  const r = x.result;
  for (const k of ['qi', 'stone', 'token', 'shard']) s.res[k] += r[k] || 0;
  let artifact = null, recruit = null;
  if (r.artifactId && !s.artifacts.includes(r.artifactId)) { s.artifacts.push(r.artifactId); artifact = r.artifactId; }
  if (r.recruit) { const def = rollSurrender(s); s.recruits.push({ uid: s.nextUid++, defId: def.id, from: '秘境' }); recruit = def; }
  s.expeditions.splice(i, 1);
  s.stats.expeditions = (s.stats.expeditions || 0) + (x.success ? 1 : 0);
  return { success: x.success, result: r, artifact, recruit };
}

// ── 隊伍限制檢查與推薦 ──
const defs = (s, uids) => uids.map(u => s.disciples.find(d => d.uid === u)).filter(Boolean).map(d => DISCIPLES_BY_ID[d.defId]);
// 回傳 {ok, items:[{text, ok}]}：逐條列出限制是否滿足（供畫面顯示打勾）
export function reqCheck(s, e, uids) {
  const r = e.req || {}, df = defs(s, uids), items = [];
  if (r.minTeam) items.push({ text: `至少 ${r.minTeam} 人同行`, ok: df.length >= r.minTeam });
  if (r.anyElement) items.push({ text: `需有${r.anyElement.join('或')}系弟子`, ok: df.some(d => r.anyElement.includes(d.element)) });
  if (r.specialty) items.push({ text: `需有${r.specialty}弟子`, ok: df.some(d => d.specialty === r.specialty) });
  if (r.noDupElement) items.push({ text: '隊員五行不可重複', ok: new Set(df.map(d => d.element)).size === df.length });
  return { ok: items.every(i => i.ok), items };
}

// 推薦隊伍：在可派遣弟子中找「符合限制且成功率最高」的 1～3 人；找不到回傳 null。
// 候選先縮到貢獻最高的幾位，再補上滿足限制所需的人選，避免組合爆炸。結果依弟子狀態快取（畫面每幀都會問）。
const cache = new Map();
export function bestTeam(s, expId) {
  const e = EXPEDITIONS_BY_ID[expId]; if (!e) return null;
  const free = freeDisciples(s);
  const key = expId + '|' + free.map(d => `${d.uid}:${d.lv}:${d.star || 0}:${d.branch || ''}`).join(',');
  if (cache.has(key)) return cache.get(key);
  const r = e.req || {}, byC = [...free].sort((a, b) => contrib(b, e) - contrib(a, e));
  const pool = new Set(byC.slice(0, 10));
  for (const d of byC) {
    const df = DISCIPLES_BY_ID[d.defId];
    if ((r.anyElement && r.anyElement.includes(df.element)) || (r.specialty && df.specialty === r.specialty)) pool.add(d);
  }
  const c = [...pool].map(d => d.uid);
  let best = null;
  const consider = uids => {
    if (!reqCheck(s, e, uids).ok) return;
    const p = teamPower(s, expId, uids);
    if (!best || p > best.power + 1e-9) best = { uids, power: p };
  };
  for (let i = 0; i < c.length; i++) {
    consider([c[i]]);
    for (let j = i + 1; j < c.length; j++) {
      consider([c[i], c[j]]);
      for (let k = j + 1; k < c.length; k++) if (R.maxTeam >= 3) consider([c[i], c[j], c[k]]);
    }
  }
  const out = best ? { uids: best.uids, chance: successChance(s, expId, best.uids), power: best.power } : null;
  if (cache.size > 200) cache.clear();
  cache.set(key, out);
  return out;
}
// 候選弟子的貢獻值（排序用）
export const memberScore = (s, expId, uid) => { const d = s.disciples.find(x => x.uid === uid); return d ? contrib(d, EXPEDITIONS_BY_ID[expId]) : 0; };
