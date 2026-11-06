// 核心壓力測試（不需瀏覽器）：用機器人連續跑多輪轉生，定期檢查不變量與存檔往返。
// 用法：node tests/invariants.mjs <種子=1> <遊戲小時=12>；有問題時以非 0 結束碼退出。
// 檢查：數值有限、資源非負、uid／id 唯一、派駐與探索不衝突、名額與上限、存檔序列化→清理的冪等與往返一致。
import { createState } from '../src/core/state.js';
import { setRng } from '../src/core/rng.js';
import * as eco from '../src/core/economy.js';
import * as conceal from '../src/core/conceal.js';
import * as endure from '../src/core/endure.js';
import * as B from '../src/core/buildings.js';
import * as R from '../src/core/realm.js';
import * as G from '../src/core/gacha.js';
import * as D from '../src/core/disciples.js';
import * as X from '../src/core/burst.js';
import * as Inc from '../src/core/incidents.js';
import * as Dao from '../src/core/dao.js';
import * as Nem from '../src/core/nemesis.js';
import * as Ex from '../src/core/expeditions.js';
import * as Cm from '../src/core/commissions.js';
import * as Ach from '../src/core/achievements.js';
import * as Gl from '../src/core/glory.js';
import * as Goals from '../src/core/goals.js';
import * as Ins from '../src/core/insight.js';
import * as Eq from '../src/core/equip.js';
import * as St from '../src/core/stories.js';
import { autoAssign } from '../src/core/autoAssign.js';
import { meditate } from '../src/core/meditate.js';
import { sanitize, serialize } from '../src/core/save.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { EXPEDITIONS } from '../src/data/expeditions.js';
import { INSIGHTS } from '../src/data/insights.js';
import { REALM_MATS } from '../src/data/materials.js';
import { CONFIG } from '../src/config.js';

const SEED = Number(process.argv[2]) || 1, HOURS = Number(process.argv[3]) || 24;
let seed = SEED;
setRng(() => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; });
const s = createState(); const problems = new Map(); let step = 0;
const bad = (k, detail) => { if (!problems.has(k)) problems.set(k, { n: 0, first: `step ${step} t=${(s.t / 3600000).toFixed(2)}h ${detail}` }); problems.get(k).n++; };

function numsOf(o, path = '', out = []) { if (typeof o === 'number') out.push([path, o]); else if (o && typeof o === 'object') for (const k of Object.keys(o)) numsOf(o[k], path + '.' + k, out); return out; }
function check() {
  for (const [p, v] of numsOf(s)) if (!Number.isFinite(v)) bad('non-finite', `${p}=${v}`);
  for (const [k, v] of Object.entries(s.res)) if (v < 0) bad('negative-resource', `${k}=${v}`);
  const uids = s.disciples.map(d => d.uid); if (new Set(uids).size !== uids.length) bad('dup-disciple-uid', uids.join(','));
  for (const d of s.disciples) { if (d.at && !s.buildings[d.at]) bad('assign-to-missing-building', d.at); if (d.at && Ex.away(s, d.uid)) bad('assigned-and-away', String(d.uid)); }
  const slotsUsed = {}; for (const d of s.disciples) if (d.at) slotsUsed[d.at] = (slotsUsed[d.at] || 0) + 1;
  for (const [b, n] of Object.entries(slotsUsed)) if (n > B.slots(s, b)) bad('building-over-capacity', `${b} ${n}>${B.slots(s, b)}`);
  if (s.grudges.length > CONFIG.visitor.maxGrudges) bad('grudges-over-max', String(s.grudges.length));
  const gids = s.grudges.map(g => g.id); if (new Set(gids).size !== gids.length) bad('dup-grudge-id', gids.join(','));
  for (const u of s.squad) if (!s.disciples.some(d => d.uid === u)) bad('squad-ghost', String(u));
  if (s.squad.length > 3) bad('squad-over-3', String(s.squad.length));
  for (const x of s.expeditions) for (const u of x.uids) if (!s.disciples.some(d => d.uid === u)) bad('expedition-ghost-member', String(u));
  if (s.expeditions.length > Ex.slotCount(s)) bad('expeditions-over-slots', `${s.expeditions.length}>${Ex.slotCount(s)}`);
  if (s.equipped.length > 3 || s.equipped.some(id => !s.artifacts.includes(id))) bad('equip-invalid', s.equipped.join(','));
  if (s.realmIdx < 0 || s.realmIdx > 13) bad('realm-out-of-range', String(s.realmIdx));
  if (s.disguise.value < 0 || s.disguise.value > CONFIG.conceal.max + 1e-6) bad('disguise-out-of-range', String(s.disguise.value));
  for (const d of s.disciples) if (d.lv < 1 || (d.star || 0) > CONFIG.disciple.starMax) bad('disciple-out-of-range', `${d.uid} lv${d.lv} star${d.star}`);
  if (eco.qiPerSec(s) < 0 || eco.stonePerSec(s) < 0) bad('negative-income', `${eco.qiPerSec(s)} ${eco.stonePerSec(s)}`);
  // 存檔往返：序列化 → 解析 → 清理，應與即時狀態等價（冪等且不丟資料）
  const round = sanitize(JSON.parse(serialize(s)).state);
  const again = sanitize(JSON.parse(JSON.stringify(round)));
  if (JSON.stringify(round) !== JSON.stringify(again)) bad('sanitize-not-idempotent', '');
  const live = JSON.parse(JSON.stringify(s));
  for (const k of ['res', 'realmIdx', 'buildings', 'artifacts', 'stats', 'factions', 'foes', 'squad', 'equipped', 'glory']) {
    if (JSON.stringify(round[k]) !== JSON.stringify(live[k])) bad('roundtrip-diff:' + k, `live=${JSON.stringify(live[k]).slice(0, 90)} round=${JSON.stringify(round[k]).slice(0, 90)}`);
  }
  const dsig = a => a.map(d => `${d.uid}:${d.defId}:${d.lv}:${d.star || 0}:${d.at || ''}:${d.branch || ''}`).join('|');
  if (dsig(round.disciples) !== dsig(live.disciples)) bad('roundtrip-diff:disciples', '');
  const gsig = a => a.map(g => `${g.id}:${g.name}:${Math.round(g.lvl * 1000)}:${g.ripe || 0}:${g.foe || 0}`).join('|');
  if (gsig(round.grudges) !== gsig(live.grudges)) bad('roundtrip-diff:grudges', '');
  for (const id of Object.keys(live.explore)) if ((round.explore[id] || 0) !== live.explore[id]) bad('roundtrip-diff:explore', id);
  for (const k of Object.keys(live.insight)) if (round.insight[k] !== live.insight[k]) bad('roundtrip-diff:insight', k);
  if (round.achv.done.length !== live.achv.done.length) bad('roundtrip-diff:achv', '');
}

let lifeStart = 0; const lives = [];
const SHOP = ['stone', 'qi', 'power', 'token', 'disguise', 'burst', 'cd', 'startS', 'startT', 'offcap', 'offeff'];
for (step = 0; step < HOURS * 3600; step++) {
  eco.tick(s, 1000); conceal.tick(s, 1000); endure.tick(s); Inc.tick(s); Ex.tick(s); Cm.tick(s); Ach.tick(s); Gl.tick(s); Goals.tick(s);
  if (s.incident.current) { const i = [0, 1, 2].find(k => Inc.canChoose(s, k)); Inc.resolve(s, i ?? 0, i === undefined); }
  meditate(s);
  if (Dao.canRebirth(s)) { lives.push((s.t - lifeStart) / 3600000); Dao.rebirth(s); lifeStart = s.t; for (let a = true; a;) { a = false; for (const id of SHOP) if (Dao.buy(s, id)) { a = true; break; } } check(); }
  for (const c of [...s.commissions.list].keys()) { /* 領取 */ }
  for (let i = s.commissions.list.length - 1; i >= 0; i--) if (Cm.isReady(s, s.commissions.list[i])) Cm.claim(s, i);
  if (step % 60 === 0) {
    s.equipped = [...s.artifacts].slice(0, 3);
    for (const d of s.disciples) if (D.canBranch(d)) D.setBranch(s, d.uid, step % 120 ? 'focus' : 'might');
    for (const i of INSIGHTS) Ins.learn(s, i.spec);
    for (const d of s.disciples) { if (D.canStar(s, d)) D.starUp(s, d.uid); }
    for (const d of s.disciples) { const ch = St.nextChapter(s, d); if (ch) St.read(s, d.uid); }
    const want = {}; for (const [idx, c] of Object.entries(REALM_MATS)) if (Number(idx) > s.realmIdx) for (const [k, v] of Object.entries(c)) want[k] = (want[k] || 0) + v;
    const order = [...EXPEDITIONS].sort((a, b) => ((want['mat_' + b.id] || 0) - s.res['mat_' + b.id] > 0) - ((want['mat_' + a.id] || 0) - s.res['mat_' + a.id] > 0));
    for (const e of order) { if (Ex.isUnlocked(s, e) && s.expeditions.length < Ex.slotCount(s) && s.expeditions.filter(x => x.id === e.id).length < 2) { const bt = Ex.bestTeam(s, e.id); if (bt) Ex.start(s, e.id, bt.uids); } }
  }
  for (let i = s.expeditions.length - 1; i >= 0; i--) if (s.expeditions[i].status === 'done') Ex.claim(s, i);
  if (step % 10 === 0) autoAssign(s);
  while (R.canBreak(s)) R.breakthrough(s);
  for (;;) { const o = BUILDINGS.filter(d => B.canUpgrade(s, d.id)); if (!o.length) break; B.upgrade(s, o[0].id); }
  while (s.res.token >= 1) G.pull(s, 1);
  for (const d of s.disciples) { const c = D.levelCost(s, d).qi; if (D.canLevel(s, d) && c < s.res.qi * 0.25) D.levelUp(s, d.uid); }
  if (s.visitor.current) { if (s.visitor.current.returning === 'plead') endure.acceptPlea(s); else if (step % 7 === 0) endure.showOff(s); else endure.endure(s); }
  for (const r of [...s.recruits]) X.recruit(s, r.uid);
  for (const g of s.grudges) g.spare = (g.id % 5 === 0);
  if (X.canBurst(s) && s.grudges.length >= 3) { s.squad = X.recommendSquad(s); const r = X.burst(s); if (r) X.endBurst(s); }
  if (step % 600 === 0) check();
}
check();
if (problems.size) process.exitCode = 1;
console.log(`seed ${SEED} ${HOURS}h 轉生 ${lives.length} 次，各輪小時：${lives.map(x => x.toFixed(2)).join(' ')}｜境界 ${s.realmIdx}｜弟子 ${s.disciples.length}`);
if (problems.size) { console.log('問題：'); for (const [k, v] of problems) console.log(`  ${k} ×${v.n}  首次：${v.first}`); } else console.log('不變量全數通過');
