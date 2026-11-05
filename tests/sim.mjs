// 平衡模擬器：貪婪機器人無頭跑 core，印出各里程碑時間。
// 用法：node tests/sim.mjs [小時數=12] [passive]   （passive = 完全不打坐，測掛機節奏）
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
import { meditate } from '../src/core/meditate.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { REALMS } from '../src/data/realms.js';

const HOURS = Number(process.argv[2]) || 12;
const PASSIVE = process.argv[3] === 'passive';
const REBIRTH = process.argv.includes('rebirth');   // 化神後自動轉生並購買道心商店，印出每一輪耗時

// 固定亂數種子，讓每次結果可比較
let seed = 12345;
setRng(() => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; });

const s = createState();
const log = [];
const mark = (name) => log.push([name, s.t / 1000]);
const seen = new Set();
const once = (k, cond) => { if (!seen.has(k) && cond) { seen.add(k); mark(k); } };

const lives = []; let lifeStart = 0;
const SHOP_PRIORITY = ['stone', 'qi', 'power', 'token', 'disguise', 'burst', 'cd', 'startS', 'startT', 'offcap', 'offeff'];
const STEP = 1000;                       // 每步 1 秒
for (let step = 0; step * STEP < HOURS * 3600e3; step++) {
  eco.tick(s, STEP); conceal.tick(s, STEP); endure.tick(s); Inc.tick(s);
  if (s.incident.current) { const i = [0, 1, 2].find(k => Inc.canChoose(s, k)); Inc.resolve(s, i ?? 0, i === undefined); }   // 機器人：選第一個負擔得起的
  if (!PASSIVE) meditate(s);
  // 化神後轉生，並把道心花在商店
  if (REBIRTH && Dao.canRebirth(s)) {
    lives.push({ min: (s.t - lifeStart) / 60000, dao: Dao.daoGain(s), bursts: s.run.bursts });
    Dao.rebirth(s); lifeStart = s.t;
    for (let again = true; again;) { again = false; for (const id of SHOP_PRIORITY) if (Dao.buy(s, id)) { again = true; break; } }
  }
  // 突破
  while (R.canBreak(s)) { R.breakthrough(s); if (!REBIRTH) once('境界 ' + REALMS[s.realmIdx].name, true); }
  // 建築：最便宜的先買
  for (;;) {
    const opts = BUILDINGS.filter(d => B.canUpgrade(s, d.id)).sort((a, b) => (b.id === 'alchemy') - (a.id === 'alchemy') || B.upgradeCost(s, a.id).qi - B.upgradeCost(s, b.id).qi);   // 煉丹房優先（玩家通常也會先蓋它拿靈石）
    if (!opts.length) break;
    const id = opts[0].id; B.upgrade(s, id);
    once(`${id} Lv${s.buildings[id].lv}`, true);
  }
  // 抽卡、派駐、升級
  while (s.res.token >= 1) G.pull(s, 1);
  for (const d of [...s.disciples].sort((a, b) => b.lv - a.lv)) {
    if (!d.at) for (const b of BUILDINGS) if (D.assign(s, d.uid, b.id)) break;
  }
  for (const d of s.disciples) { const c = D.levelCost(s, d).qi; if (D.canLevel(s, d) && c < s.res.qi * 0.25) D.levelUp(s, d.uid); }
  // 忍（機器人永遠忍）
  if (s.visitor.current) endure.endure(s);
  // 招募
  for (const r of [...s.recruits]) if (s.res.stone > (R.breakCost(s)?.stone ?? 0) * 1.5 + 10) X.recruit(s, r.uid);
  // 引爆：偽裝滿且仇人 ≥3
  if (X.canBurst(s) && s.grudges.length >= 3) {
    const res = X.burst(s); X.endBurst(s);
    once('首次引爆', true);
    s.simBursts = (s.simBursts || 0) + 1;
    s.simMaxChain = Math.max(s.simMaxChain || 0, res.chain);
  }
}

if (REBIRTH) { console.log('各輪耗時（分鐘）與道心：'); lives.forEach((l, i) => console.log(`  第 ${i + 1} 輪 ${l.min.toFixed(0).padStart(5)} 分（${(l.min / 60).toFixed(2)} 小時）  道心 +${l.dao}  引爆 ${l.bursts} 次  ${i ? `= 第 1 輪的 ${(l.min / lives[0].min * 100).toFixed(0)}%` : ''}`)); }
const f = sec => sec >= 3600 ? (sec / 3600).toFixed(2) + ' 小時' : (sec / 60).toFixed(1) + ' 分';
console.log(`模擬 ${HOURS} 小時（${PASSIVE ? '純掛機' : '含打坐'}）`);
for (const [n, t] of log) console.log(String(f(t)).padStart(10), ' ', n);
console.log('\n最終：境界', REALMS[s.realmIdx].name, '｜弟子', s.disciples.length, '｜引爆', s.simBursts || 0, '次，最大連鎖', s.simMaxChain || 0, '｜法寶', s.artifacts.length);
console.log('建築：', BUILDINGS.map(d => `${d.name}${s.buildings[d.id].lv}`).join(' '));
const bc = R.breakCost(s);
if (bc) console.log('下一境界成本', JSON.stringify(bc), '｜持有', JSON.stringify(Object.fromEntries(Object.entries(s.res).map(([k, v]) => [k, Math.round(v)]))), '｜每秒 靈氣', eco.qiPerSec(s).toFixed(1), '靈石', eco.stonePerSec(s).toFixed(3));
