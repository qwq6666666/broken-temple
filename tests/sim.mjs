// 平衡模擬器：貪婪機器人無頭跑 core，印出各里程碑時間。
// 新增（量測元嬰・化神高階秘境與輪迴詞條）：nohi＝機器人不派祖庭遺墟／地底封印／虛空裂隙（對照組）；hiexp＝缺材料時優先派高階秘境；
//   TOKSRC=1＝統計招賢令來源與每次引爆的招賢令（依呼叫的檔案歸類）；EXTRA=N＝直接給擴建 +N 級；linger＝化神後等秘境回來才轉生（LINGER 分鐘上限）；farm＝沒有材料缺口時，空的探索位也去刷（挑成功率 ≥ FARM_MIN%（預設 30）裡獎勵最大的）；MUT=詞條id＝每次轉生都選該詞條；JSON=1＝最後印出一行機器可讀的摘要。
// 用法：node tests/sim.mjs [小時數=12] [passive] [rebirth] [equip] [branch] [commission] [insight] [smart] [ascend] [squad] [noexp]
//   passive = 完全不打坐；rebirth = 化神後自動轉生；equip/branch/commission/insight = 開啟對應新功能的最佳化行為
//   smart = 用「補滿空位」依專長五行派駐；環境變數 ELEMENT=0 關閉五行效果（比較基準）
//   亂數種子可用環境變數 SEED=… 指定（比較設定時請多跑幾個種子取平均）
import { createState } from '../src/core/state.js';
import { setRng } from '../src/core/rng.js';
import * as eco from '../src/core/economy.js';
import * as conceal from '../src/core/conceal.js';
import * as endure from '../src/core/endure.js';
import * as B from '../src/core/buildings.js';
import * as R from '../src/core/realm.js';
import * as G from '../src/core/gacha.js';
import * as D from '../src/core/disciples.js';
import { DISCIPLES } from '../src/data/disciples.js';
import * as X from '../src/core/burst.js';
import * as Ex from '../src/core/expeditions.js';
import { EXPEDITIONS, EXPEDITIONS_BY_ID, matIdOf } from '../src/data/expeditions.js';
import { REALM_MATS } from '../src/data/materials.js';
import * as Inc from '../src/core/incidents.js';
import * as Dao from '../src/core/dao.js';
import * as Nem from '../src/core/nemesis.js';
import * as Ins from '../src/core/insight.js';
import { INSIGHTS } from '../src/data/insights.js';
import { autoAssign } from '../src/core/autoAssign.js';
import { CONFIG } from '../src/config.js';
import * as Cm from '../src/core/commissions.js';
import { meditate } from '../src/core/meditate.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { ARTIFACTS_BY_ID as ARTS, EQUIP_SLOTS } from '../src/data/artifacts.js';
import { isSpecialtyMatch } from '../src/core/discipleMath.js';
import { REALMS, fromLegacy } from '../src/data/realms.js';
import * as Asc from '../src/core/ascend.js';
import { NEMESES } from '../src/data/nemeses.js';

const HOURS = Number(process.argv[2]) || 12;
const PASSIVE = process.argv[3] === 'passive';
const FLAG = f => process.argv.includes(f);          // equip（自動裝備最佳 3 件法寶）／branch（弟子 Lv10 自動進階）／commission（自動領委託）
if (process.env.ELEMENT === '0') CONFIG.element.enabled = false;     // ELEMENT=0：關閉五行相生相剋／克制，當作比較基準
if (process.env.SHENG) CONFIG.element.shengBonus = Number(process.env.SHENG);   // 覆寫相生／相剋加成（調數值用）
if (process.env.KE) CONFIG.element.keBonus = Number(process.env.KE);
if (process.env.ENEMY_BEAT) CONFIG.element.enemyBeat = Number(process.env.ENEMY_BEAT);
if (process.env.ENEMY_BEATEN) CONFIG.element.enemyBeaten = Number(process.env.ENEMY_BEATEN);
if (process.env.BV) Object.assign(CONFIG.assignValue, JSON.parse(process.env.BV));   // 覆寫建築價值權重，如 BV='{"library":0.2}'
const HUNT_MIN = Number(process.env.HUNT_MIN) || 20;     // hunt 旗標：化神後最多多留幾遊戲分鐘等宿敵（HUNT_MIN 可覆寫）
if (process.env.NO_SIDE) NEMESES.splice(NEMESES.findIndex(n => n.side));     // NO_SIDE=1：移除勢力宿敵，當作比較基準
if (process.env.HI_MIN || process.env.HI_REWARD) for (const e of EXPEDITIONS) if (['ruins', 'seal', 'rift'].includes(e.id)) {     // HI_MIN=0.5 把高階秘境耗時乘 0.5；HI_REWARD=2 把靈氣／靈石獎勵乘 2（調數值用）
  if (process.env.HI_MIN) e.minutes = Math.round(e.minutes * Number(process.env.HI_MIN));
  if (process.env.HI_REWARD) for (const k of ['qiSec', 'stoneSec']) if (e.reward[k]) e.reward[k] *= Number(process.env.HI_REWARD);
}
if (process.env.NOPRESS) { CONFIG.endure.bookStep = 0; CONFIG.endure.chargeStep = 0; }      // NOPRESS=1：關掉積怨壓力（對照用）
if (process.env.TOKSCALE) CONFIG.gacha.burstTokenScale = Number(process.env.TOKSCALE);     // TOKSCALE=0.3：引爆招賢令 ×0.3（量收藏節奏）
const REBIRTH = process.argv.includes('rebirth');   // 化神後自動轉生並購買道心商店，印出每一輪耗時

// 固定亂數種子，讓每次結果可比較
let seed = Number(process.env.SEED) || 12345;
setRng(() => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; });

const s = createState();
if (process.env.EXTRA) s.reincarnation.shop.expand = Math.round(Number(process.env.EXTRA) / 10);     // EXTRA=300：一開始就有道心商店「擴建」+300 級（量測擴建對節奏的影響；不花道心）
const log = [];
const mark = (name) => log.push([name, s.t / 1000]);
const seen = new Set();
const once = (k, cond) => { if (!seen.has(k) && cond) { seen.add(k); mark(k); } };

// TOKSRC=1：統計招賢令的來源（依呼叫來源的檔案歸類；轉生後 res 物件被換掉時會重新掛上）
const tokSrc = {};
function instrumentToken(st) {
  const d = Object.getOwnPropertyDescriptor(st.res, 'token'); if (d && d.get) return;
  let v = st.res.token;
  Object.defineProperty(st.res, 'token', { enumerable: true, configurable: true, get: () => v, set: nv => {
    if (nv > v) { const fr = (new Error().stack.split('\n').slice(2).find(l => l.includes('/src/')) || '').match(/src\/([\w/]+)\.js/); const k = fr ? fr[1] : '?'; tokSrc[k] = (tokSrc[k] || 0) + (nv - v); }
    v = nv; } });
}
const lives = []; let lifeStart = 0;
const RS = k => s.stats[k] - (s.run.base?.[k] || 0);      // 本輪統計（天劫條件用；RUNSTATS=1 時印出，調天劫門檻用）
const SHOP_PRIORITY = ['stone', 'qi', 'power', 'token', 'disguise', 'burst', 'cd', 'startS', 'startT', 'offcap', 'offeff'];
const FRUIT = ['fruitQi', 'fruitStone', 'fruitPower'];     // ascend 旗標：機器人也會買道果（便宜的先買）
const STEP = 1000;                       // 每步 1 秒
for (let step = 0; step * STEP < HOURS * 3600e3; step++) {
  if (process.env.TOKSRC) instrumentToken(s);
  eco.tick(s, STEP); conceal.tick(s, STEP); endure.tick(s); Inc.tick(s);
  if (s.incident.current) { const i = [0, 1, 2].find(k => Inc.canChoose(s, k)); Inc.resolve(s, i ?? 0, i === undefined); }   // 機器人：選第一個負擔得起的
  if (!PASSIVE) meditate(s);
  // ascend：化神後有天劫待渡就渡（機器人沒有特別追條件，只是順勢達成的才算）；渡劫道心立刻進帳
  if (FLAG('ascend')) { Asc.tick(s); for (const id of [...s.ascend.ready]) { Asc.claim(s, id); once('天劫 ' + id + '（第 ' + (s.reincarnation.count + 1) + ' 世）', true); } }
  // 化神後轉生，並把道心花在商店
  if ((FLAG('hunt') || FLAG('linger')) && s.realmIdx >= 22 && s.run.huntAt === undefined) s.run.huntAt = s.t;      // hunt：抵達化神的時間
  const hunting = FLAG('hunt') && s.run.huntAt !== undefined && s.t - s.run.huntAt < HUNT_MIN * 60000 && (Nem.pickNemesis(s) || s.grudges.some(g => g.nemesisId) || s.visitor.current?.nemesisId);
  const lingering = FLAG('linger') && s.run.huntAt !== undefined && s.t - s.run.huntAt < (Number(process.env.LINGER) || 120) * 60000 && s.expeditions.length > 0;      // linger：化神後等派出去的秘境全部回來才轉生（上限 LINGER 分鐘，預設 120）
  if (REBIRTH && Dao.canRebirth(s) && s.realmIdx >= Number(process.env.RB || 22) && !hunting && !lingering) {
    lives.push({ min: (s.t - lifeStart) / 60000, dao: Dao.daoGain(s), bursts: s.run.bursts, chain: s.run.maxChain, nd: NEMESES.filter(n => s.nemeses[n.id]?.defeated).length, side: NEMESES.filter(n => n.side && s.nemeses[n.id]?.defeated).length, aw: Object.values(s.nemeses).reduce((a, n) => a + (n.awakeLv || 0), 0), hs: Math.round((s.t - (s.run.huntAt ?? s.t)) / 60000), reach: ((s.run.huntAt ?? s.t) - lifeStart) / 60000, inc: RS('incidents'), endure: RS('endures'), exp: RS('expeditions') });
    Dao.rebirth(s, process.env.MUT || null); lifeStart = s.t;
    for (let again = true; again;) {
      again = false; for (const id of SHOP_PRIORITY) if (Dao.buy(s, id)) { again = true; break; }
      if (!again && FLAG('ascend')) { const f = FRUIT.filter(id => Dao.canBuy(s, id)).sort((a, b) => Dao.shopCost(s, a).daoHeart - Dao.shopCost(s, b).daoHeart)[0]; if (f && Dao.buy(s, f)) again = true; }
    }
  }
  // 新功能（可用旗標開關，量化對成長曲線的影響）
  if (FLAG('commission')) {
    if (s.realmIdx >= 1) { s.unlocked.goals = true; s.unlocked.gacha = true; }
    Cm.tick(s);
    for (let i = s.commissions.list.length - 1; i >= 0; i--) if (Cm.isReady(s, s.commissions.list[i])) Cm.claim(s, i);
  }
  if (FLAG('equip') && step % 60 === 0) {
    const val = id => { const e = ARTS[id].effect; return (e.qiMult || 0) + 0.8 * (e.stoneMult || 0) + 0.3 * (e.powerMult || 0) + 0.2 * (e.clickMult || 0); };
    s.equipped = [...s.artifacts].sort((a, b) => val(b) - val(a)).slice(0, EQUIP_SLOTS);
  }
  if (FLAG('branch') && step % 60 === 0) for (const d of s.disciples) if (D.canBranch(d)) D.setBranch(s, d.uid, d.at && isSpecialtyMatch(d, d.at) ? 'focus' : 'might');
  // 專長心得：碎片夠「下一次突破 + 這次領悟」才買，避免擋住突破；挑最便宜的
  if (FLAG('insight') && step % 30 === 0) {
    const need = R.breakCost(s)?.shard ?? 0;
    const opt = INSIGHTS.map(i => [i.spec, Ins.insightCost(s, i.spec)]).filter(([, c]) => c && s.res.shard >= need + c.shard).sort((a, b) => a[1].shard - b[1].shard)[0];
    if (opt) Ins.learn(s, opt[0]);
  }
  // smart：玩家用「補滿空位」依專長／五行補位（預設機器人只是依序塞進第一個空位）
  if (FLAG('smart') && step % 10 === 0) autoAssign(s);
  Ex.tick(s);
  // 秘境：機器人把空的探索位派去補「之後要用的材料」缺口（跨大境界突破、進階）；noexp 旗標可關閉（量測用）
  if (!FLAG('noexp') && s.realmIdx >= 2 && step % 5 === 0) {
    for (let i = s.expeditions.length - 1; i >= 0; i--) if (s.expeditions[i].status === 'done') { const x = s.expeditions[i]; const cr = Ex.claim(s, i); s.simOK = s.simOK || {}; const o = s.simOK[x.id] ||= [0, 0]; o[cr?.success ? 0 : 1]++; if (cr?.artifact) s.simArt = (s.simArt || 0) + 1; if (cr?.recruit) s.simRec = (s.simRec || 0) + 1; (s.simExpLog ||= []).push(`  ↳ ${(s.t/3600000).toFixed(2)}h ${x.id} ${x.success ? '成功' : '失敗'} +${x.result.mat}`); }
    const want = {}, soon = {};                       // want：之後所有大境界的材料；soon：下一次突破就要用的
    for (const r of REALMS) if (r.idx > s.realmIdx && r.matCost) for (const [k, v] of Object.entries(r.matCost)) { want[k] = (want[k] || 0) + v; if (r.idx === s.realmIdx + 1) soon[k] = (soon[k] || 0) + v; }   // 材料分攤到每個小階：之後所有階都要；soon＝下一階
    if (FLAG('branch')) { want.mat_cave = (want.mat_cave || 0) + 2; want.mat_spring = (want.mat_spring || 0) + 2; }
    const HI = ['ruins', 'seal', 'rift'], pool = EXPEDITIONS.filter(e => !(FLAG('nohi') && HI.includes(e.id)));
    const mk = e => 'mat_' + matIdOf(e);
    const running = k => s.expeditions.filter(x => mk(EXPEDITIONS_BY_ID[x.id]) === k).length;
    const rank = e => (soon[mk(e)] || 0) > s.res[mk(e)];
    const worth = e => (e.reward.qiSec || 0) * eco.qiPerSec(s) / 1000 + (e.reward.stoneSec || 0) * eco.stonePerSec(s) * 4 / 1000 + (e.reward.artifact || 0) * 5000 + (e.reward.recruit || 0) * 3000;   // 刷材料以外的價值（粗估）
    while (s.expeditions.length < Ex.slotCount(s)) {
      let opts = pool.filter(e => Ex.isUnlocked(s, e) && want[mk(e)] - s.res[mk(e)] - running(mk(e)) * 2 > 0)
        .sort((a, b) => (rank(b) - rank(a)) || (FLAG('hiexp') ? (HI.includes(b.id) - HI.includes(a.id)) : 0) || (want[mk(b)] - s.res[mk(b)]) - (want[mk(a)] - s.res[mk(a)]));
      if (FLAG('farm')) opts = opts.concat(pool.filter(e => Ex.isUnlocked(s, e) && !opts.includes(e) && (Ex.bestTeam(s, e.id)?.chance || 0) >= (Number(process.env.FARM_MIN) || 30) / 100).sort((a, b) => worth(b) - worth(a)));
      let started = false;
      for (const e of opts) { const bt = Ex.bestTeam(s, e.id); if (bt && Ex.start(s, e.id, bt.uids)) { started = true; s.simExp = (s.simExp || 0) + 1; s.simExpBy = s.simExpBy || {}; s.simExpBy[e.id] = (s.simExpBy[e.id] || 0) + 1; (s.simExpLog ||= []).push(`${(s.t/3600000).toFixed(2)}h ${e.id} ${Math.round(bt.chance*100)}%`); break; } }
      if (!started) break;
    }
  }
  // 功勳換招賢令
  while (s.res.merit >= 6) G.exchangeMerit(s, 1);
  once('收集全部弟子', s.disciples.length >= DISCIPLES.length); once('集齊全部 UR', DISCIPLES.filter(d => d.rarity === 'UR').every(d => s.disciples.some(x => x.defId === d.id)));
  // 突破
  while (R.canBreak(s)) { R.breakthrough(s); if (!REBIRTH) once('境界 ' + REALMS[s.realmIdx].name, true); }
  // 建築：最便宜的先買
  for (;;) {
    const opts = BUILDINGS.filter(d => B.canUpgrade(s, d.id)).sort((a, b) => (b.id === 'alchemy') - (a.id === 'alchemy') || B.upgradeCost(s, a.id).qi - B.upgradeCost(s, b.id).qi);   // 煉丹房優先（玩家通常也會先蓋它拿靈石）
    if (!opts.length) break;
    const id = opts[0].id; B.upgrade(s, id);
    if (s.buildings[id].lv % 10 === 0) once(`${id} Lv${s.buildings[id].lv}`, true);       // 每 10 級記一筆（等級刻度 100 級）
  }
  // 抽卡、派駐、升級
  while (s.res.token >= 1) G.pull(s, 1);
  if (!FLAG('smart')) for (const d of [...s.disciples].sort((a, b) => b.lv - a.lv)) {     // 預設：依序塞進第一個有空位的建築
    if (!d.at) for (const b of BUILDINGS) if (D.assign(s, d.uid, b.id)) break;
  }
  for (const d of s.disciples) { const c = D.levelCost(s, d).qi; if (D.canLevel(s, d) && c < s.res.qi * 0.25) D.levelUp(s, d.uid); }
  // 忍（機器人永遠忍）
  if (s.visitor.current) {
    const a = endure.assess(s, s.visitor.current);
    if (FLAG('showmix') && a.showKind === 'beat' && (s.endureStreak >= 2 || s.grudges.length >= 8)) endure.showOff(s);     // showmix：能碾壓且積怨偏高時亮一手（洩壓＋威名）
    else endure.endure(s);
  }
  // 招募
  for (const r of [...s.recruits]) if (s.res.stone > (R.breakCost(s)?.stone ?? 0) * 1.5 + 10) X.recruit(s, r.uid);
  // 引爆：偽裝滿且仇人 ≥3
  if (X.canBurst(s) && s.grudges.length >= 3) {
    if (FLAG('squad')) s.squad = X.recommendSquad(s);      // squad = 引爆前用推薦陣容出戰
    const tk0 = s.res.token, nFoe = s.grudges.length; const res = X.burst(s); X.endBurst(s);
    if (process.env.TOKSRC) { const r = s.realmIdx, b = (tokSrc.byRealm ||= {}); (b[r] ||= { n: 0, tok: 0, foes: 0 }); b[r].n++; b[r].tok += s.res.token - tk0; b[r].foes += nFoe; }
    once('首次引爆', true);
    s.simBursts = (s.simBursts || 0) + 1;
    s.simMaxChain = Math.max(s.simMaxChain || 0, res.chain);
  }
}

if (REBIRTH) { console.log('各輪耗時（分鐘）與道心：'); lives.forEach((l, i) => console.log(`  第 ${i + 1} 輪 ${l.min.toFixed(0).padStart(5)} 分（${(l.min / 60).toFixed(2)} 小時）  道心 +${l.dao}  引爆 ${l.bursts} 次  ${i ? `= 第 1 輪的 ${(l.min / lives[0].min * 100).toFixed(0)}%` : ''}${process.env.RUNSTATS ? `  ｜連鎖 ${l.chain} 事件 ${l.inc} 忍 ${l.endure} 秘境 ${l.exp}` : ''}${process.env.RUNSTATS ? `｜宿敵 ${l.nd}/${NEMESES.length}（勢力 ${l.side}/6）覺醒 ${l.aw}/${NEMESES.length * 3} 化神停留 ${l.hs} 分｜抵達化神 ${(l.reach / 60).toFixed(2)} 小時` : ''}`)); }
const f = sec => sec >= 3600 ? (sec / 3600).toFixed(2) + ' 小時' : (sec / 60).toFixed(1) + ' 分';
console.log(`模擬 ${HOURS} 小時（${PASSIVE ? '純掛機' : '含打坐'}）`);
for (const [n, t] of log) console.log(String(f(t)).padStart(10), ' ', n);
console.log('\n最終：境界', REALMS[s.realmIdx].name, '｜弟子', s.disciples.length, '｜引爆', s.simBursts || 0, '次，最大連鎖', s.simMaxChain || 0, '｜法寶', s.artifacts.length);
if (process.env.DEBUG_EXP) console.log('材料', JSON.stringify(Object.fromEntries(Object.entries(s.res).filter(([k]) => k.startsWith('mat_') || k === 'merit'))), '探索中', JSON.stringify(s.expeditions.map(x => [x.id, x.status])), '派出次數', s.simExp, (s.simExpLog || []).join(' | '), '空閒弟子', s.disciples.filter(d => !Ex.away(s, d.uid)).length, 'cost', JSON.stringify(R.breakCost(s)));
console.log('建築：', BUILDINGS.map(d => `${d.name}${s.buildings[d.id].lv}`).join(' '));
const bc = R.breakCost(s);
if (bc) console.log('下一境界成本', JSON.stringify(bc), '｜持有', JSON.stringify(Object.fromEntries(Object.entries(s.res).map(([k, v]) => [k, Math.round(v)]))), '｜每秒 靈氣', eco.qiPerSec(s).toFixed(1), '靈石', eco.stonePerSec(s).toFixed(3));
if (process.env.TOKSRC) console.log('TOKSRC ' + JSON.stringify({ hours: HOURS, pulls: s.gacha.total, src: tokSrc }));
if (process.env.JSON) console.log('SUMMARY ' + JSON.stringify({ pulls: s.gacha.total, tAll: (log.find(x => x[0] === '收集全部弟子') || [])[1] ?? null, tUR: (log.find(x => x[0] === '集齊全部 UR') || [])[1] ?? null, mut: process.env.MUT || null, hours: HOURS, reb: s.reincarnation.count, lives, art: s.artifacts.length, disciples: s.disciples.length, expBy: s.simExpBy || {}, expOK: s.simOK || {}, simArt: s.simArt || 0, simRec: s.simRec || 0, ascDone: s.ascend.done.length, qi: eco.qiPerSec(s), stone: eco.stonePerSec(s), log: log.slice(0, 40), realms: log.filter(x => /^境界/.test(x[0])) }));
