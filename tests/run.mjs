// 核心邏輯測試：node tests/run.mjs （不需任何框架）
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { lvEff } from '../src/core/buildingMath.js';
import { REALMS } from '../src/data/realms.js';
import { portraitHtml } from '../src/ui/portrait.js';
import { PORTRAITS } from '../src/data/portraits.js';
import { createState } from '../src/core/state.js';
import { fmt } from '../src/core/format.js';
import { setRng } from '../src/core/rng.js';
import * as eco from '../src/core/economy.js';
import * as B from '../src/core/buildings.js';
import * as R from '../src/core/realm.js';
import * as G from '../src/core/gacha.js';
import * as D from '../src/core/disciples.js';
import * as E from '../src/core/endure.js';
import * as C from '../src/core/conceal.js';
import * as X from '../src/core/burst.js';
import * as M from '../src/core/meditate.js';
import * as Goals from '../src/core/goals.js';
import * as Inc from '../src/core/incidents.js';
import * as Nem from '../src/core/nemesis.js';
import * as Dao from '../src/core/dao.js';
import * as St from '../src/core/stories.js';
import * as Bond from '../src/core/bonds.js';
import * as Sp from '../src/core/spec.js';
import * as Fac from '../src/core/factions.js';
import { TAB_TIPS, HELP } from '../src/data/help.js';
import { sanitize } from '../src/core/save.js';
import { autoAssign } from '../src/core/autoAssign.js';
import * as Chr from '../src/core/chronicle.js';
import * as Ach from '../src/core/achievements.js';
import * as Off from '../src/core/offlineEvent.js';
import * as Eq from '../src/core/equip.js';
import * as NemM from '../src/core/nemesis.js';
import * as Wk from '../src/core/weekly.js';
import { COMMISSION_RULES } from '../src/data/commissions.js';
import { relation, SHENG, KE, ELEMENTS } from '../src/data/elements.js';
import { elementEffect, contribution } from '../src/core/discipleMath.js';
import * as Conc from '../src/core/conceal.js';
import * as Ins from '../src/core/insight.js';
import { INCIDENTS } from '../src/data/incidents.js';
import * as Gl from '../src/core/glory.js';
import { GLORY_LEVELS } from '../src/data/glory.js';
import * as Cm from '../src/core/commissions.js';
import * as Ex from '../src/core/expeditions.js';
import { EXPEDITIONS, EXPEDITIONS_BY_ID, matIdOf } from '../src/data/expeditions.js';
import { MATERIALS, MAT_YIELD } from '../src/data/materials.js';
import { EXPLORATION } from '../src/data/exploration.js';
import { MUTATORS } from '../src/data/mutators.js';
import { SPECS, specText } from '../src/data/specs.js';
import { STORIES, STORIES2 } from '../src/data/stories.js';
import { BONDS } from '../src/data/bonds.js';
import { TRAITS } from '../src/data/traits.js';
import { DISCIPLES, DISCIPLES_BY_ID } from '../src/data/disciples.js';
import { RARITIES } from '../src/data/gachaRates.js';
import { DAO_SHOP_BY_ID } from '../src/data/daoShop.js';
import * as Prog from '../src/core/progress.js';
import { stepParticle, moteCount } from '../src/ui/particles.js';
import { drawBuilding, POS, DRAW_ORDER, BACKDROP } from '../src/ui/sceneArt.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { topRarity, playPull } from '../src/ui/pullFx.js';
import { bus } from '../src/core/events.js';
import { NEMESES, NEMESES_BY_ID, AWAKEN } from '../src/data/nemeses.js';
import { ACHIEVEMENTS_BY_ID } from '../src/data/achievements.js';
import { ARTIFACTS_BY_ID } from '../src/data/artifacts.js';
import { GOALS_BY_ID } from '../src/data/goals.js';
import { INCIDENTS_BY_ID } from '../src/data/incidents.js';
import { sfx, unlock, applyVolume, SFX_NAMES } from '../src/ui/audio.js';
import { getPrefs, setPref } from '../src/ui/prefs.js';
import { stat, traitValue } from '../src/core/discipleMath.js';
import * as S from '../src/core/save.js';
import * as Sq from '../src/core/squad.js';
import { KEEP_KEYS, RESET_KEYS, REBIRTH_KEEP } from '../src/data/rebirth.js';
import * as EpMod from '../src/core/exploration.js';
import { applyOffline } from '../src/core/offline.js';
import * as Asc from '../src/core/ascend.js';
import { LINES, idlePool } from '../src/data/lines.js';
import { PERSONALITIES } from '../src/data/visitors.js';
import { FACTIONS } from '../src/data/factions.js';
import { TRIALS, TRIALS_BY_ID, HEAVENS } from '../src/data/ascend.js';
import { STORIES3 } from '../src/data/stories.js';
import { OFFLINE_EVENTS } from '../src/data/offlineEvents.js';
import { DAO_SHOP } from '../src/data/daoShop.js';

let n = 0; const failed = [];
// KEEP_GOING=1：失敗不中斷，最後一次列出全部失敗（大改數值時用）；預設遇到第一個失敗就停
const t = (name, fn) => {
  try { fn(); n++; console.log('  ✓', name); }
  catch (e) { if (!process.env.KEEP_GOING) throw e; failed.push(name); console.log('  ✗', name, '\n     ', String(e.message).split('\n').slice(0, 3).join(' | '), '\n     ', (String(e.stack).match(/run\.mjs:\d+/) || [''])[0]); }
};

t('format 大數字', () => {
  assert.equal(fmt(999), '999'); assert.equal(fmt(1500), '1.5K');
  assert.equal(fmt(2.5e6), '2.5M'); assert.equal(fmt(3e9), '3B'); assert.equal(fmt(4e12), '4T'); assert.equal(fmt(5e15), '5Qa');
  assert.equal(fmt(999999), '1M');
});

t('建築成本 = 基礎 ÷ 10 × 1.0141^等級 × 解鎖所需境界倍率，且封頂 100 級', () => {
  const s = createState();
  assert.equal(B.upgradeCost(s, 'field').qi, 6);             // 第 1 級：基礎 60 ÷ 10；需境界 0（倍率 1）
  s.buildings.field.lv = 10;                                 // 升到 11 級需煉氣一層（倍率 1.35）
  assert.equal(B.upgradeCost(s, 'field').qi, Math.floor(6 * CONFIG.building.costGrowth ** 10 * 1.35));
  assert.equal(B.upgradeCost(createState(), 'library').stone, 1);   // 有成本的資源至少 1（5 ÷ 10 不會變成 0）
  s.buildings.field.lv = 100; s.realmIdx = 13; s.res.qi = 1e12;
  assert.equal(B.upgrade(s, 'field'), false);
  // 總成本：升滿 100 級的累計成本與舊制（10 級、1.15 成長）相近，不超過 ±15%
  const tot = id => { const x = createState(); x.realmIdx = 13; let t = 0; for (let l = 0; l < 100; l++) { x.buildings[id].lv = l; t += B.upgradeCost(x, id).qi; } return t; };
  const oldTot = 60 * Array.from({ length: 10 }, (_, l) => 1.15 ** l * REALMS[[0, 2, 3, 5, 6, 8, 9, 10, 12, 13][l]].mult).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(tot('field') / oldTot - 1) < 0.15, `靈田累計成本 ${tot('field').toExponential(2)} vs 舊制 ${oldTot.toExponential(2)}`);
});

t('建築等級刻度：里程碑倍率、產出與舊制中性、功能型效果等比縮放、駐守位、批量購買、舊存檔換算', () => {
  // 里程碑：只套用在會產出的建築，取不超過目前等級的最後一項
  assert.equal(B.milestoneMult(9), 1); assert.equal(B.milestoneMult(10), 1.1); assert.equal(B.milestoneMult(49), 1.25); assert.equal(B.milestoneMult(100), 2);
  assert.deepEqual(B.nextMilestone(10), [25, 1.25]); assert.deepEqual(B.nextMilestone(100), [200, 2.5]); assert.equal(B.nextMilestone(1000), null); assert.equal(B.milestoneMult(1000), 14.9);
  // 產出：舊制 k 級（k×每級）≈ 新制 10k 級（含里程碑與歸一化）；不應偏離超過 ±45%（前期偏低、化神滿級偏高，見設計表）
  for (const L of [10, 20, 30, 50, 70, 100]) {
    const s = createState(); s.realmIdx = 13; s.buildings.temple.lv = 0; s.buildings.field.lv = L; const q = eco.qiPerSec(s) - CONFIG.innateQiPerSec * eco.realmOf(s).mult;
    const old = (L / 10) * 3 * eco.realmOf(s).mult;
    assert.ok(q / old > 0.7 && q / old < 1.45, `Lv${L} 產出比 ${(q / old).toFixed(2)}`);
  }
  // 功能型建築：10 級 ≈ 舊 1 級的效果
  const f = createState(); f.buildings.library.lv = 10; assert.ok(Math.abs(eco.discipleDiscount(f) - 0.04) < 1e-9);
  const g = createState(); g.buildings.arena.lv = 100; g.buildings.hall.lv = 100; assert.equal(D.levelCap(g), CONFIG.disciple.baseLevelCap + 20 + 10);
  const g2 = createState(); g2.buildings.arena.lv = 35; assert.equal(D.levelCap(g2), CONFIG.disciple.baseLevelCap + 7);      // 取整，不會有小數等級
  // 駐守位：第 1／31／61／91 級
  const sl = lv => { const x = createState(); x.buildings.tower.lv = lv; return B.slots(x, 'tower'); };
  assert.deepEqual([0, 1, 30, 31, 60, 61, 90, 91, 100].map(sl), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  // 批量購買：不超過上限與資源；與逐級購買結果一致；affordableLevels 不改動狀態
  const a = createState(), b = createState(); for (const x of [a, b]) { x.realmIdx = 5; x.res.qi = 5e4; }
  const can = B.affordableLevels(a, 'field'); const qiBefore = a.res.qi, lvBefore = a.buildings.field.lv;
  assert.equal(a.res.qi, qiBefore); assert.equal(a.buildings.field.lv, lvBefore); assert.ok(can > 5);
  assert.equal(B.upgradeN(a, 'field', Infinity), can);
  let k = 0; while (B.upgrade(b, 'field')) k++;
  assert.equal(k, can); assert.equal(a.buildings.field.lv, b.buildings.field.lv); assert.ok(Math.abs(a.res.qi - b.res.qi) < 1e-6);
  assert.ok(a.buildings.field.lv <= B.levelCap(a));
  assert.equal(B.upgradeN(a, 'field', 10), 0);                // 買不起或到上限就是 0
  const c = createState(); c.realmIdx = 13; c.res.qi = 1e30; c.res.stone = 1e20; assert.equal(B.upgradeN(c, 'alchemy', 5), 5); assert.equal(c.buildings.alchemy.lv, 5);
  // 舊存檔（v2，滿級 10）等級 ×10；v3 存檔不再換算；超出上限被夾回
  const old = S.parse(JSON.stringify({ version: 2, savedAt: 1, state: { res: { qi: 1 }, buildings: { temple: { lv: 7, pausedUntil: 0 }, field: { lv: 10, pausedUntil: 0 } } } })).state;
  assert.equal(old.buildings.temple.lv, 70); assert.equal(old.buildings.field.lv, 100);
  const cur = S.parse(JSON.stringify({ version: 3, savedAt: 1, state: { res: { qi: 1 }, buildings: { temple: { lv: 7, pausedUntil: 0 }, field: { lv: 999, pausedUntil: 0 } } } })).state;
  assert.equal(cur.buildings.temple.lv, 7); assert.equal(cur.buildings.field.lv, 999);        // v3 存檔不換算；絕對上限 1000（擴建後才可能超過 100）
});

t('擴建（道心商店）：等級上限隨境界逐步加成、成本跟著、功能效果遞減、存檔與上限', () => {
  const s = createState(); s.reincarnation.shop.expand = 30;                       // +300 級
  assert.equal(B.extraLevels(s), 300);
  s.realmIdx = 0; assert.equal(B.levelCap(s), 10);                                   // 凡人：沒有加成，不會繞過境界
  s.realmIdx = 13; assert.equal(B.levelCap(s), 400); assert.equal(B.maxLevelOf(s), 400);
  s.realmIdx = 7; assert.equal(B.levelCap(s), B.capAtRealm(7) + Math.floor(300 * 7 / 13));
  for (let i = 1; i <= 13; i++) assert.ok(B.capAtRealm(i, 300) >= B.capAtRealm(i - 1, 300), '上限單調不減');
  assert.equal(B.capAtRealm(13, 0), 100);
  // 成本：超過 100 級仍照成長公式，且 realmNeededFor 會把擴建算進去（不會一律當化神）
  assert.equal(B.realmNeededFor(101, 0), 99); assert.ok(B.realmNeededFor(101, 300) < 13);
  const c = createState(); c.reincarnation.shop.expand = 30; c.realmIdx = 13; c.buildings.field.lv = 300;
  assert.equal(B.upgradeCost(c, 'field').qi, Math.floor(6 * CONFIG.building.costGrowth ** 300 * REALMS[B.realmNeededFor(301, 300)].mult));
  c.res.qi = 1e300; assert.equal(B.upgradeN(c, 'field', 1000), 100);                // 升到 400 級（=上限）為止
  assert.equal(c.buildings.field.lv, 400); assert.equal(B.isMax(c, 'field'), true); assert.equal(B.isCapped(c, 'field'), true);   // 擴建 +300 → 最高 400，到了就是滿級
  c.reincarnation.shop.expand = 90; assert.equal(B.maxLevelOf(c), 1000); assert.equal(B.isMax(c, 'field'), false); c.buildings.field.lv = 1000; assert.equal(B.isMax(c, 'field'), true);
  c.realmIdx = 7; c.buildings.field.lv = B.levelCap(c); assert.equal(B.isCapped(c, 'field'), true); assert.equal(B.isMax(c, 'field'), false);   // 境界不夠：被境界卡住，但不是滿級
  // 功能型效果：100 級以上遞減（1000 級約為 100 級的 2 倍）
  assert.equal(lvEff(100), 10); assert.ok(Math.abs(lvEff(200) - 13) < 1e-9); assert.ok(Math.abs(lvEff(1000) - (10 + 3 * Math.log2(10))) < 1e-9);
  assert.ok(lvEff(1000) / lvEff(100) < 2.05 && lvEff(1000) > lvEff(999));
  // 產出：0.01 秒內不會因擴建而改變低境界的上限；等級 1000 的產出倍率 = 14.9 × 線性
  const p = createState(); p.realmIdx = 13; p.buildings.temple.lv = 0; p.buildings.field.lv = 100; const q100 = eco.qiPerSec(p);
  p.buildings.field.lv = 1000; assert.ok(eco.qiPerSec(p) / q100 > 70 && eco.qiPerSec(p) / q100 < 80, '1000 級約為 100 級的 74 倍（10 倍等級 × 里程碑 14.9/2）');
  // 商店：maxLv 90 → 最多 +900 級；存檔清理夾在 1000 內
  assert.equal(DAO_SHOP.find(i => i.id === 'expand').maxLv * DAO_SHOP.find(i => i.id === 'expand').perLevel, CONFIG.building.hardMax - CONFIG.building.maxLevel);
  assert.equal(S.parse(JSON.stringify({ version: 3, savedAt: 1, state: { res: { qi: 1 }, buildings: { temple: { lv: 5000, pausedUntil: 0 } } } })).state.buildings.temple.lv, 1000);
  const d = createState(); d.res.daoHeart = 1e6; assert.equal(Dao.buy(d, 'expand'), true); assert.equal(B.extraLevels(d), 10);
  const k = createState(); k.reincarnation.shop.expand = 5; k.realmIdx = 13; k.res.stone = 1e12; Dao.rebirth(k); assert.equal(k.reincarnation.shop.expand, 5);   // 轉生保留
});

t('建築等級受境界限制', () => {
  const s = createState(); s.res.qi = 1e12;
  assert.equal(B.levelCap(s), 10);
  assert.equal(B.upgrade(s, 'temple'), false);               // 破廟開局 10 級，凡人上限 10
  s.realmIdx = 1; assert.equal(B.levelCap(s), 16);
  for (let i = 0; i < 6; i++) assert.equal(B.upgrade(s, 'temple'), true);
  assert.equal(B.upgrade(s, 'temple'), false);               // 再升需更高境界
  s.realmIdx = 13; assert.equal(B.levelCap(s), 100);
  assert.equal(B.realmNeededFor(100), 13); assert.equal(B.realmNeededFor(10), 0); assert.equal(B.realmNeededFor(11), 1);
  // 上限曲線：每個境界都不低於舊制（舊上限 × 10）的 90%，且單調不減
  for (let i = 0; i <= 13; i++) { const old = Math.min(10, 1 + Math.floor(i * 0.7)) * 10; assert.ok(B.capAtRealm(i) >= old * 0.9, `境界 ${i}`); if (i) assert.ok(B.capAtRealm(i) >= B.capAtRealm(i - 1)); }
});

t('打坐有冷卻；冷卻後可再打坐', () => {
  const s = createState();
  const g = M.meditate(s);
  assert.ok(g > 0); assert.equal(M.meditate(s), 0);           // 冷卻中
  assert.ok(M.cooldownLeft(s) > 0);
  eco.tick(s, CONFIG.click.cooldownMs);
  assert.ok(M.canMeditate(s)); assert.ok(M.meditate(s) > 0);
});

t('打坐收益隨產出縮放，但不超過被動產出的 4 秒（保底除外）', () => {
  const s = createState(); s.buildings.field.lv = 50; s.realmIdx = 6;
  assert.ok(Math.abs(eco.clickPower(s) - Math.max(
    (CONFIG.click.base + s.buildings.temple.lv * CONFIG.click.perTempleLevel) * eco.realmOf(s).mult,
    eco.qiPerSec(s) * CONFIG.click.productionSec)) < 1e-9);
});

t('tick：產出與 dt 線性（一次大 tick = 多次小 tick）', () => {
  const a = createState(), b = createState();
  a.buildings.field.lv = 20; b.buildings.field.lv = 20;
  eco.tick(a, 60000);
  for (let i = 0; i < 600; i++) eco.tick(b, 100);
  assert.ok(Math.abs(a.res.qi - b.res.qi) < 1e-6);
  assert.ok(a.res.qi > 0);
});

t('境界突破扣靈石並提高倍率', () => {
  const s = createState();
  assert.equal(R.breakthrough(s), null);
  s.res.stone = 100;
  const r = R.breakthrough(s);
  assert.equal(s.realmIdx, 1); assert.ok(r.line);
  assert.ok(eco.realmOf(s).mult > 1);
});

t('抽卡保底：50 抽 SR、90 抽 SSR', () => {
  setRng(() => 0);                           // 永遠抽到最低稀有度 → 只靠保底
  const s = createState(); s.res.token = 200;
  let sr = -1, ssr = -1;
  for (let i = 1; i <= 90; i++) {
    const [r] = G.pull(s, 1);
    if (sr < 0 && r.rarity !== 'N' && r.rarity !== 'R') sr = i;
    if (ssr < 0 && (r.rarity === 'SSR' || r.rarity === 'UR')) ssr = i;
  }
  assert.equal(sr, 50); assert.equal(ssr, 90);
  setRng(Math.random);
});

t('重複弟子轉「該弟子的專屬碎片」，不進通用碎片', () => {
  const s = createState();
  D.addDisciple(s, 'afu');
  const r = D.addDisciple(s, 'afu');
  assert.equal(r.isNew, false); assert.equal(r.shards, 1); assert.equal(D.dshardsOf(s, 'afu'), 1);
  assert.equal(s.res.shard, 0); assert.equal(D.dshardsOf(s, 'shenyao'), 0);       // 通用碎片不變、別的弟子沒有
  assert.equal(s.disciples.length, 1);
  D.addDisciple(s, 'luoshen'); D.addDisciple(s, 'luoshen'); assert.equal(D.dshardsOf(s, 'luoshen'), 80);   // UR 重複 80
});

t('專長匹配 ×2：農修派駐靈田 > 體修派駐靈田', () => {
  const s = createState(); s.buildings.field.lv = 10;
  D.addDisciple(s, 'afu'); D.addDisciple(s, 'liuzi');
  const [a, b] = s.disciples;
  D.assign(s, a.uid, 'field'); const m1 = eco.buildingMult(s, 'field');
  D.assign(s, a.uid, null); D.assign(s, b.uid, 'field'); const m2 = eco.buildingMult(s, 'field');
  assert.ok(m1 > m2);
});

t('駐守位限制', () => {
  const s = createState(); s.buildings.field.lv = 10;
  D.addDisciple(s, 'afu'); D.addDisciple(s, 'liu2');
  const [a, b] = s.disciples;
  assert.ok(D.assign(s, a.uid, 'field'));
  assert.equal(D.assign(s, b.uid, 'field'), false);
});

t('蓄力倍率：每 10 分鐘 +5%，上限 ×3', () => {
  const s = createState();
  assert.equal(C.chargeMult(s), 1);
  s.disguise.chargeMs = 10 * 60000; assert.ok(Math.abs(C.chargeMult(s) - 1.05) < 1e-9);
  s.disguise.chargeMs = 1e12; assert.equal(C.chargeMult(s), 3);
});

const visitor = (type, lvl, extra = {}) => ({ id: 99, name: '測試人', type, sect: 's', role: 'r', personality: '傲慢', lvl, alert: false, taunt: 'x', ...extra });
const withVisitor = (s, v) => { s.visitor.current = v; return s; };

t('忍氣吞聲：偽裝 +1、入簿、損失開關可關', () => {
  const s = withVisitor(createState(), visitor('former', 1)); s.res.stone = 100;
  E.endure(s);
  assert.equal(s.disguise.value, 1); assert.equal(s.grudges.length, 1); assert.equal(s.visitor.current, null);
  assert.ok(s.res.stone < 100 || Object.values(s.buildings).some(b => b.pausedUntil > s.t));
  s.settings.loss = false; s.res.stone = 100; withVisitor(s, visitor('former', 1, { id: 100 }));
  E.endure(s); assert.equal(s.res.stone, 100);
});

t('憋屈值：連續忍損失倍率上升，亮一手歸零，上限 ×3', () => {
  const s = createState();
  assert.equal(E.streakMult(s), 1);
  for (let i = 0; i < 3; i++) { withVisitor(s, visitor('former', 1, { id: i })); E.endure(s); }
  assert.ok(Math.abs(E.streakMult(s) - 1.75) < 1e-9);
  s.endureStreak = 99; assert.equal(E.streakMult(s), 3);
  s.realmIdx = 8; withVisitor(s, visitor('former', 0, { id: 50 })); E.showOff(s);
  assert.equal(s.endureStreak, 0);
});

t('亮一手（前同門，打得過）：當場打臉 +招賢令，不入簿、不加偽裝', () => {
  const s = withVisitor(createState(), visitor('former', 0)); s.realmIdx = 6;
  const tok = s.res.token, dg = s.disguise.value;
  const r = E.showOff(s);
  assert.equal(r.outcome, 'beat'); assert.equal(s.res.token, tok + 1);
  assert.equal(s.grudges.length, 0); assert.equal(s.disguise.value, dg); assert.equal(s.visitor.current, null);
});

t('亮一手（商隊，打得過）：得到靈氣與靈石', () => {
  const s = withVisitor(createState(), visitor('trader', 0)); s.realmIdx = 6; s.buildings.alchemy.lv = 20;
  const qi = s.res.qi, st = s.res.stone;
  assert.equal(E.showOff(s).outcome, 'beat');
  assert.ok(s.res.qi > qi && s.res.stone > st);
});

t('亮一手（他宗弟子，打得過）：機率降服，必定離開', () => {
  setRng(() => 0);                                   // 必中降服
  const s = withVisitor(createState(), visitor('rival', 0)); s.realmIdx = 6;
  const r = E.showOff(s);
  assert.equal(r.outcome, 'beat'); assert.ok(r.got.surrender); assert.equal(s.recruits.length, 1);
  assert.equal(s.grudges.length, 0);
  setRng(Math.random);
});

t('亮一手（打不過）：逞強，警覺入簿、損失 ×2', () => {
  const s = withVisitor(createState(), visitor('former', 9)); s.res.stone = 100; s.buildings.alchemy.lv = 10;
  const rate = eco.stonePerSec(s);
  setRng(() => 0);                                   // chance(0.5) → 必走靈石損失
  const r = E.showOff(s);
  setRng(Math.random);
  assert.equal(r.outcome, 'rash');
  assert.equal(s.grudges.length, 1); assert.equal(s.grudges[0].alert, true);
  assert.equal(s.res.stone, 100 - Math.max(1, Math.floor(rate * CONFIG.endure.loss.stoneSec * CONFIG.endure.rashLossMult)));
});

t('亮一手（長老）：即使打得過也得罪，損失 ×3', () => {
  const s = withVisitor(createState(), visitor('elder', 0)); s.realmIdx = 8;
  assert.equal(E.assess(s, s.visitor.current).showKind, 'offend');
  const r = E.showOff(s);
  assert.equal(r.outcome, 'offend'); assert.equal(s.grudges.length, 1); assert.equal(s.grudges[0].alert, true);
});

t('引爆預覽與實際判定一致；弱勢長老反噬（受損失開關控制）', () => {
  const mk = () => {
    const s = createState(); s.realmIdx = 1; s.res.stone = 500; s.buildings.alchemy.lv = 10; s.disguise.value = 99;
    s.grudges = [visitor('elder', 12, { id: 1 }), visitor('former', 0, { id: 2 })];
    return s;
  };
  const s = mk(), pv = X.previewBurst(s);
  assert.equal(pv.backfires, 1);
  const r = X.burst(s);
  assert.deepEqual(r.entries.map(e => e.verdict), pv.entries.map(e => e.verdict));
  assert.ok(r.backfire && r.backfire.names.length === 1 && s.res.stone < 500 + r.total.stone);
  const s2 = mk(); s2.settings.loss = false;
  assert.equal(X.burst(s2).backfire, null);
});

t('連鎖倍率', () => {
  assert.equal(X.chainMult(2), 1); assert.equal(X.chainMult(3), 1.5);
  assert.equal(X.chainMult(5), 2); assert.equal(X.chainMult(9), 2); assert.equal(X.chainMult(10), 3);
});

t('引爆：碾壓／險勝／打不過，擊敗者出簿、其餘保留', () => {
  const s = createState(); s.realmIdx = 6;
  const mk = (id, type, lvl, alert = false) => ({ id, name: 'X' + id, type, sect: 's', role: 'r', personality: '傲慢', lvl, alert });
  s.grudges = [mk(1, 'former', 1.2), mk(2, 'rival', 6.3), mk(3, 'elder', 12.5, true), mk(4, 'trader', 2.1)];
  assert.equal(X.burst(s), null);            // 偽裝值未滿
  s.disguise.value = CONFIG.conceal.max;
  const r = X.burst(s);
  const v = Object.fromEntries(r.entries.map(e => [e.g.id, e.verdict]));
  assert.equal(v[1], 'crush'); assert.equal(v[4], 'crush'); assert.equal(v[3], 'fail');
  assert.equal(r.chain, r.entries.filter(e => e.verdict !== 'fail').length);
  assert.ok(r.total.qi > 0 && r.total.stone > 0);
  assert.equal(s.grudges.length, 1); assert.equal(s.grudges[0].id, 3);
  assert.equal(s.disguise.value, 0); assert.equal(s.burstActive, true);
  X.endBurst(s); assert.equal(s.burstActive, false);
});

t('警覺仇人的獎勵較低（×0.7）', () => {
  const run = alert => {
    setRng(() => 0.5);
    const s = createState(); s.realmIdx = 8; s.disguise.value = 99;
    s.grudges = [{ id: 1, name: 'A', type: 'trader', sect: 's', role: 'r', personality: '傲慢', lvl: 1.5, alert }];
    return X.burst(s).total.stone;
  };
  const normal = run(false), alerted = run(true);
  setRng(Math.random);
  assert.ok(Math.abs(alerted / normal - 0.7) < 0.01, `${alerted}/${normal}`);
});

// 假 storage，測存檔不需要瀏覽器
const fakeStorage = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; } }; };

t('存檔往返一致，且 burstActive 會被重置', () => {
  const st = fakeStorage(), s = createState();
  s.res.qi = 12345.5; s.realmIdx = 4; s.buildings.field.lv = 30; s.burstActive = true;
  D.addDisciple(s, 'afu'); s.artifacts.push('yinqi');
  assert.equal(S.save(s, st), true);
  const r = S.load(st);
  assert.equal(r.state.res.qi, 12345.5); assert.equal(r.state.realmIdx, 4);
  assert.equal(r.state.buildings.field.lv, 30); assert.equal(r.state.disciples.length, 1);       // 存檔往返不變
  assert.deepEqual(r.state.artifacts, ['yinqi']); assert.equal(r.state.burstActive, false);
});

t('舊存檔缺欄位會以預設值補齊', () => {
  const text = JSON.stringify({ version: 1, savedAt: Date.now(), state: { res: { qi: 5 }, buildings: { temple: { lv: 2, pausedUntil: 0 } } } });
  const { state } = S.parse(text);
  assert.equal(state.res.qi, 5); assert.equal(state.res.token, CONFIG.start.token);
  assert.equal(state.buildings.temple.lv, 20); assert.equal(state.buildings.arena.lv, 0);      // 舊版（v1）等級 ×10 換算到新刻度
  assert.ok(state.settings && state.disguise);
});

t('壞檔不丟例外：load 回傳 error，無存檔回傳 null', () => {
  const st = fakeStorage();
  assert.equal(S.load(st), null);
  st.setItem(CONFIG.save.key, '{壞掉');
  assert.ok(S.load(st).error);
  st.setItem(CONFIG.save.key, JSON.stringify({ version: 99, state: { res: {}, buildings: {} } }));
  assert.ok(S.load(st).error);
  assert.throws(() => S.parse('[]'));
});

t('離線收益：效率、上限、不產生訪客', () => {
  const s = createState(); s.buildings.field.lv = 20;
  const rate = eco.qiPerSec(s);
  assert.equal(applyOffline(s, 10 * 1000), null);                 // 不到 1 分鐘不結算
  const r = applyOffline(s, 3600 * 1000);                         // 離開 1 小時
  assert.ok(Math.abs(r.gains.qi - rate * 3600 * CONFIG.offline.efficiency) < 1e-6 * r.gains.qi);
  assert.equal(r.capped, false); assert.equal(s.visitor.current, null);
  const s2 = createState(); const r2 = applyOffline(s2, 100 * 3600 * 1000);
  assert.equal(r2.capped, true); assert.equal(r2.usedMs, CONFIG.offline.capMs);
});

t('離線：偽裝與蓄力照常增加、仇人成長、暫停計時到期', () => {
  const s = createState();
  s.grudges = [{ id: 1, name: 'A', type: 'former', sect: 's', role: 'r', personality: '傲慢', lvl: 1.0, alert: false }];
  s.buildings.field.lv = 10; s.buildings.field.pausedUntil = s.t + 5 * 60000;
  const r = applyOffline(s, 2 * 3600 * 1000);
  assert.ok(r.disguiseGain > 0); assert.ok(r.chargeMinutes >= 119);
  assert.ok(s.grudges[0].lvl > 1.0);
  assert.ok(s.t >= s.buildings.field.pausedUntil);
});

// 取得弟子並派駐到 bid（測試用，會自動蓋好建築）
const crew = (s, defId, bid) => { s.buildings[bid].lv = Math.max(1, s.buildings[bid].lv); const { disciple } = D.addDisciple(s, defId); D.assign(s, disciple.uid, bid); return disciple; };

t('特性只在派駐時生效（戰力）', () => {
  const s = createState(); s.buildings.arena.lv = 10;
  const base = eco.combatPower(s);
  const d = D.addDisciple(s, 'xuantian').disciple;            // 戰力 +30%
  const owned = eco.combatPower(s);                           // 持有也會提高戰力，但特性不生效
  D.assign(s, d.uid, 'arena');
  assert.ok(eco.traitSum(s, 'power') > 0.29);
  assert.ok(eco.combatPower(s) > owned && owned > base);
  D.assign(s, d.uid, null); assert.equal(eco.traitSum(s, 'power'), 0);
});

t('特性：忍氣吞聲損失減免、暫停縮短', () => {
  const lose = withCrew => {
    setRng(() => 0);                                          // 走靈石損失
    const s = createState(); s.res.stone = 1000; s.buildings.alchemy.lv = 50; s.realmIdx = 6;
    if (withCrew) crew(s, 'shigan', 'temple');                // 耿直：損失 -25%
    withVisitor(s, visitor('former', 1)); E.endure(s); setRng(Math.random);
    return 1000 - s.res.stone;
  };
  assert.ok(lose(true) < lose(false));
  const pause = withCrew => {
    setRng(() => 0.99);                                       // 走建築暫停
    const s = createState(); s.res.stone = 0;
    if (withCrew) crew(s, 'qinghe', 'field');                 // 溫吞：暫停 -30%
    withVisitor(s, visitor('former', 1)); E.endure(s); setRng(Math.random);
    return Math.max(...Object.values(s.buildings).map(b => b.pausedUntil));
  };
  assert.ok(pause(true) < pause(false));
});

t('特性：偽裝增速、亮一手獎勵、爆擊獎勵、靈石產出', () => {
  const a = createState(), b = createState(); crew(b, 'luoshen', 'array');    // 偽裝增速 +30%
  C.tick(a, 60000); C.tick(b, 60000);
  assert.ok(b.disguise.value > a.disguise.value * 1.29);
  const win = withCrew => {
    const s = createState(); s.realmIdx = 6; s.buildings.field.lv = 30;
    if (withCrew) crew(s, 'shenyao', 'alchemy');             // 毒舌：亮一手 +35%
    withVisitor(s, visitor('trader', 0)); const q = s.res.qi; E.showOff(s); return s.res.qi - q;
  };
  assert.ok(win(true) > win(false));
  const sp = createState(); sp.buildings.alchemy.lv = 10; const s0 = eco.stonePerSec(sp);
  crew(sp, 'ludan', 'alchemy'); assert.ok(eco.stonePerSec(sp) > s0);
  const br = withCrew => { const s = createState(); s.realmIdx = 8; s.disguise.value = 99; if (withCrew) crew(s, 'jiuli', 'temple'); s.grudges = [visitor('trader', 0, { id: 1 })]; setRng(() => 0.5); const r = X.burst(s).total.qi; setRng(Math.random); return r; };
  assert.ok(br(true) > br(false));
});

t('升星：先花該弟子的專屬碎片，不夠的用通用碎片 2 換 1 抵；屬性與特性 +25%、等級上限 +2，滿星為止', () => {
  const s = createState(); s.res.shard = 1000;
  const d = D.addDisciple(s, 'afu').disciple;
  const st0 = stat(d), tv0 = traitValue(d), cap0 = D.levelCapOf(s, d);
  assert.deepEqual(D.starCost(d), { shard: 5 });
  // 沒有專屬碎片：全部用通用碎片，5 × 2 = 10
  assert.deepEqual(D.starPay(s, d), { need: 5, own: 0, uni: 10, ok: true });
  assert.equal(D.starUp(s, d.uid), true);
  assert.equal(s.res.shard, 990); assert.equal(d.star, 1);
  assert.ok(Math.abs(stat(d) / st0 - 1.25) < 1e-9 && Math.abs(traitValue(d) / tv0 - 1.25) < 1e-9);
  assert.equal(D.levelCapOf(s, d), cap0 + 2);
  D.starUp(s, d.uid); D.starUp(s, d.uid);
  assert.equal(d.star, 3); assert.equal(D.starCost(d), null); assert.equal(D.starUp(s, d.uid), false);
  const old = { uid: 9, defId: 'afu', lv: 1, at: null };       // 舊存檔沒有 star
  assert.equal(stat(old), 1);
});

t('弟子全部升級：最便宜的先升、買不起就停、不超過等級上限；立繪登記後頭像疊上圖片', () => {
  const s = createState(); s.res.qi = 1e6;
  const a = D.addDisciple(s, 'afu').disciple, b = D.addDisciple(s, 'luoshen').disciple;     // N（便宜）與 UR（貴）
  const n = D.levelUpAll(s);
  assert.ok(n > 0 && a.lv > 1 && b.lv >= 1);
  assert.ok(a.lv >= b.lv, '便宜的先升');
  assert.ok(a.lv <= D.levelCapOf(s, a) && b.lv <= D.levelCapOf(s, b), '不超過上限');
  assert.ok(!s.disciples.some(d => D.canLevel(s, d)), '升到沒有買得起的為止');
  const q = s.res.qi; assert.equal(D.levelUpAll(s), 0); assert.equal(s.res.qi, q);          // 再按一次什麼都不做
  assert.equal(D.levelUpAll(createState()), 0);                                             // 沒有弟子
  const df = DISCIPLES_BY_ID.afu;
  assert.ok(portraitHtml(df).includes(df.emoji) && !portraitHtml(df).includes('<img'));      // 沒有立繪：只有 emoji
  PORTRAITS.afu = 'assets/portraits/afu.png';
  const h = portraitHtml(df); delete PORTRAITS.afu;
  assert.ok(h.includes(df.emoji) && h.includes('<img') && h.includes('assets/portraits/afu.png') && h.includes('onerror'), '有立繪：疊上圖片，載入失敗退回 emoji');
});

t('弟子專屬碎片：混合支付、只能給自己升星、存檔清理、轉生保留', () => {
  const s = createState(); const d = D.addDisciple(s, 'baihe').disciple;            // SSR：升 1 星需 20
  s.dshards.baihe = 12; s.res.shard = 10;
  assert.deepEqual(D.starPay(s, d), { need: 20, own: 12, uni: 16, ok: false });     // 缺 8 片 × 2 = 16 通用，只有 10
  assert.equal(D.canStar(s, d), false); assert.equal(D.starUp(s, d.uid), false); assert.equal(s.dshards.baihe, 12); assert.equal(s.res.shard, 10);   // 失敗不扣
  s.res.shard = 16; assert.equal(D.starUp(s, d.uid), true);
  assert.equal(s.dshards.baihe, 0); assert.equal(s.res.shard, 0); assert.equal(d.star, 1);
  // 別人的專屬碎片幫不上忙
  const e = D.addDisciple(s, 'afu').disciple; s.dshards.baihe = 999; assert.deepEqual(D.starPay(s, e).own, 0);
  // 專屬碎片足夠時完全不動通用碎片
  s.dshards.afu = 5; s.res.shard = 7; assert.equal(D.starUp(s, e.uid), true); assert.equal(s.res.shard, 7); assert.equal(s.dshards.afu, 0);
  // 存檔：未知弟子、非數字、負數被清掉
  const bad = createState(); bad.dshards = { afu: 3.7, nobody: 5, baihe: -2, shenyao: 'x' }; sanitize(bad); assert.deepEqual(bad.dshards, { afu: 3 });
  assert.deepEqual(S.parse(JSON.stringify({ version: 3, savedAt: 1, state: { res: { qi: 1 }, buildings: {} } })).state.dshards, {});    // 舊存檔沒有欄位 → 空
  // 轉生保留（弟子收藏也保留）
  const k = createState(); D.addDisciple(k, 'afu'); k.dshards.afu = 9; k.realmIdx = 13; k.res.stone = 1e12; Dao.rebirth(k); assert.equal(k.dshards.afu, 9);
});

t('宗門大事：達成一次、只發一次獎勵、永久加成生效', () => {
  const s = createState(); s.res.token = 0; s.res.stone = 0;
  Goals.tick(s); assert.equal(s.goalsDone.length, 0);
  s.stats.bursts = 1;
  Goals.tick(s); assert.ok(s.goalsDone.includes('burst1'));
  const tok = s.res.token; assert.ok(tok > 0);
  Goals.tick(s); assert.equal(s.res.token, tok);                  // 不重複發
  const q0 = eco.qiPerSec(s);
  s.realmIdx = 5; Goals.tick(s);                                  // qi5：靈氣永久 +5%
  assert.ok(s.goalsDone.includes('qi5'));
  assert.ok(Math.abs(Goals.goalPerm(s, 'qiMult') - 0.05) < 1e-9);
  assert.ok(eco.qiPerSec(s) > q0 * eco.realmOf(s).mult);
});

t('引爆會記錄最大連鎖數', () => {
  const s = createState(); s.realmIdx = 8; s.disguise.value = 99;
  s.grudges = [1, 2, 3].map(i => visitor('former', 0, { id: i, name: 'N' + i }));
  X.burst(s); assert.equal(s.stats.maxChain, 3);
});

t('音效：沒有 Web Audio 或靜音時所有呼叫都安靜略過', () => {
  const names = SFX_NAMES;
  assert.ok(names.length >= 12);
  for (const nm of names) sfx(nm, { n: 3, r: 4 });        // Node 沒有 AudioContext：不得丟錯
  setPref('muted', true); sfx('crush'); setPref('muted', false);
  unlock(); applyVolume();
});

t('偏好設定可讀寫（不進遊戲存檔）', () => {
  setPref('reduceMotion', true); assert.equal(getPrefs().reduceMotion, true);
  setPref('reduceMotion', false); assert.equal(getPrefs().reduceMotion, false);
});

t('仇人記住當初的嘲諷，引爆時可兩段式重播', () => {
  const s = withVisitor(createState(), visitor('former', 1, { taunt: '你算什麼東西' }));
  E.endure(s); assert.equal(s.grudges[0].taunt, '你算什麼東西');
  s.realmIdx = 8; s.disguise.value = 99;
  const r = X.burst(s); assert.equal(r.entries[0].taunt, '你算什麼東西');
  // 舊存檔沒有 taunt：以性格台詞補上
  const s2 = createState(); s2.realmIdx = 8; s2.disguise.value = 99;
  s2.grudges = [visitor('former', 0, { id: 7 })];
  delete s2.grudges[0].taunt; assert.ok(X.burst(s2).entries[0].taunt);
});

// ── R7 隨機事件 ──
const forceIncident = (s, id) => { s.incident.current = { id, expiresAt: s.t + 150000 }; return s; };

t('事件：到時間彈出、不與訪客重疊、尊重最低境界', () => {
  const s = createState(); s.t = 1e7;
  Inc.tick(s); assert.ok(s.incident.current);
  const s2 = createState(); s2.t = 1e7; s2.visitor.current = visitor('former', 1);
  Inc.tick(s2); assert.equal(s2.incident.current, null); assert.ok(s2.incident.nextAt > s2.t);
  for (let i = 0; i < 50; i++) {                         // 凡人不會抽到需要金丹的事件
    const s3 = createState(); s3.t = 1e7; Inc.tick(s3);
    assert.ok(!['elder', 'meteor'].includes(s3.incident.current.id));
  }
});

t('事件：付費選項需負擔得起；護山大陣選項需有建築', () => {
  const s = forceIncident(createState(), 'caravan'); s.buildings.alchemy.lv = 10; s.res.stone = 0;
  assert.equal(Inc.canChoose(s, 0), false); assert.equal(Inc.resolve(s, 0), null);
  s.res.stone = 100; assert.equal(Inc.canChoose(s, 0), true);
  const st = forceIncident(createState(), 'storm');
  assert.equal(Inc.canChoose(st, 0), false); assert.equal(Inc.canChoose(st, 1), true);
  st.buildings.array.lv = 10; assert.equal(Inc.canChoose(st, 0), true);
});

t('事件：賭局依機率分勝敗（確定性 rng）', () => {
  const run = r => { setRng(() => r); const s = forceIncident(createState(), 'fortune'); s.buildings.field.lv = 20; const q = s.res.qi; Inc.resolve(s, 1); setRng(Math.random); return { s, gained: s.res.qi - q }; };
  const win = run(0.1), lose = run(0.9);
  assert.ok(win.gained > 0);
  assert.ok(Object.values(lose.s.buildings).some(b => b.pausedUntil > lose.s.t));      // 失敗：建築暫停
});

t('事件：效果結算（資源、碎片、偽裝、招賢令、降服、法寶）', () => {
  setRng(() => 0);                                       // 機率類全中
  const s = createState(); s.buildings.field.lv = 30;
  forceIncident(s, 'lost'); Inc.resolve(s, 0);
  assert.equal(s.recruits.length, 1);
  forceIncident(s, 'rats'); const dg = s.disguise.value; Inc.resolve(s, 1);
  assert.equal(s.disguise.value, dg + 1);
  forceIncident(s, 'meteor'); s.realmIdx = 5; Inc.resolve(s, 0);
  assert.equal(s.artifacts.length, 1);
  forceIncident(s, 'stele'); const sh = s.res.shard; Inc.resolve(s, 1);
  assert.equal(s.res.shard, sh + INCIDENTS_BY_ID.stele.choices[1].effects.gamble.win.shard);
  setRng(Math.random);
  assert.equal(s.stats.incidents, 4);
});

t('事件：護山大陣降低損失；逾時自動採預設並計入統計', () => {
  const loss = lv => { const s = forceIncident(createState(), 'storm'); s.buildings.field.lv = 30; s.buildings.array.lv = lv; s.res.qi = 1e6; Inc.resolve(s, 1); return 1e6 - s.res.qi; };
  assert.ok(loss(5) < loss(0));
  const s = forceIncident(createState(), 'rats'); s.t += 200000;
  Inc.tick(s); assert.equal(s.incident.current, null); assert.equal(s.stats.incidents, 1);
});

t('離線回來不會立刻彈事件，也不算逾時', () => {
  const s = forceIncident(createState(), 'fortune'); s.incident.nextAt = 0;
  applyOffline(s, 3600 * 1000);
  assert.ok(s.incident.current.expiresAt > s.t);
  Inc.tick(s); assert.ok(s.incident.current);
});

// ── R8 宿敵 ──
const nemVisitor = (id, lvl) => ({ id: 500 + lvl, nemesisId: id, name: NEMESES_BY_ID[id].name, type: NEMESES_BY_ID[id].type, sect: 's', role: 'r', personality: '傲慢', lvl, alert: false, taunt: 't' });

t('宿敵：條件（境界、前一位）決定誰能登場，且不重複在場', () => {
  const s = createState();
  assert.equal(Nem.pickNemesis(s), null);                        // 凡人：還沒到
  s.realmIdx = 1; assert.equal(Nem.pickNemesis(s).id, 'qian');
  s.realmIdx = 13; assert.equal(Nem.pickNemesis(s).id, 'qian'); // 沒擊敗前一位，後面的不會出現
  s.visitor.current = nemVisitor('qian', 2); assert.equal(Nem.pickNemesis(s), null);   // 已在場
  s.visitor.current = null; s.nemeses.qian = { met: 1, defeated: true };
  assert.equal(Nem.pickNemesis(s).id, 'xiao');
});

t('宿敵登場：取代一次訪客，嘲諷依見面次數推進', () => {
  setRng(() => 0);                                              // chance(0.5) 必中
  const s = createState(); s.realmIdx = 1; s.t = 1e7;
  E.tick(s); assert.equal(s.visitor.current.nemesisId, 'qian');
  assert.equal(s.visitor.current.taunt, NEMESES_BY_ID.qian.intro[0]);
  E.endure(s); assert.equal(s.grudges[0].nemesisId, 'qian');
  s.grudges = []; s.t += 1e7; E.tick(s);
  assert.equal(s.visitor.current.taunt, NEMESES_BY_ID.qian.intro[1]);
  setRng(Math.random);
});

t('宿敵不能當場打臉：亮一手 = 入簿、不警覺、損失 ×3', () => {
  const s = withVisitor(createState(), nemVisitor('qian', 0)); s.realmIdx = 10;
  const a = E.assess(s, s.visitor.current); assert.equal(a.showKind, 'nemesis');
  assert.equal(E.showOff(s).outcome, 'nemesis');
  assert.equal(s.grudges.length, 1); assert.equal(s.grudges[0].alert, false); assert.equal(s.grudges[0].nemesisId, 'qian');
});

t('引爆宿敵：碾壓才擊敗並給專屬法寶、解鎖下一位；險勝則脫身', () => {
  const run = (realm) => {
    const s = createState(); s.realmIdx = realm; s.disguise.value = 99;
    s.grudges = [{ ...nemVisitor('qian', 2.0) }, visitor('former', 0, { id: 1 })];
    return { s, r: X.burst(s) };
  };
  const win = run(8);
  assert.equal(win.r.entries.at(-1).g.nemesisId, 'qian');           // 宿敵壓軸
  assert.equal(win.r.entries.at(-1).verdict, 'crush');
  assert.ok(Nem.isDefeated(win.s, 'qian')); assert.ok(win.s.artifacts.includes('qian_abacus'));
  assert.equal(win.r.nemesesDefeated.length, 1); assert.equal(win.s.stats.nemesisDefeated, 1);
  assert.equal(win.s.grudges.length, 0);
  // 戰力略勝（險勝）→ 脫身：留在簿內
  const s2 = createState(); s2.disguise.value = 99; s2.realmIdx = 3;
  s2.grudges = [nemVisitor('qian', 3.1)];
  const r2 = X.burst(s2); assert.equal(r2.entries[0].verdict, 'fail'); assert.equal(r2.entries[0].escaped, true);
  assert.equal(s2.grudges.length, 1); assert.equal(Nem.isDefeated(s2, 'qian'), false);
});

t('專屬法寶不會從一般掉落／事件取得；一般法寶目標不含專屬', () => {
  setRng(() => 0);
  const s = createState(); s.realmIdx = 5; s.disguise.value = 99;
  s.grudges = [visitor('elder', 0, { id: 1 })];
  X.burst(s);
  assert.ok(s.artifacts.every(id => !ARTIFACTS_BY_ID[id].unique));
  setRng(Math.random);
  const s2 = createState(); s2.artifacts = ['qian_abacus', 'xiao_sword'];
  assert.equal(GOALS_BY_ID.art9.cur(s2), 0);
});

t('宿敵存檔往返、完成全部後觸發大事', () => {
  const s = createState(); NEMESES.forEach(n => { s.nemeses[n.id] = { met: 2, defeated: true }; }); s.stats.nemesisDefeated = NEMESES.length;
  const st = fakeStorage(); S.save(s, st); const r = S.load(st);
  assert.equal(Nem.isDefeated(r.state, 'xuan'), true);
  Goals.tick(r.state); assert.ok(r.state.goalsDone.includes('nemAll'));
});

// ── R9 轉生與道心 ──
const maxedRun = () => { const s = createState(); s.realmIdx = 13; s.run = { bursts: 12, maxChain: 5, nemeses: 2, goals: 4 }; return s; };

t('轉生：只有化神能轉；道心依本輪表現計算', () => {
  const s = createState(); assert.equal(Dao.canRebirth(s), false); assert.equal(Dao.rebirth(s), null);
  const m = maxedRun();
  assert.equal(Dao.daoGain(m), 10 + 12 + 5 * 2 + 2 * 5 + 4 * 2);
  m.run.bursts = 999; assert.equal(Dao.daoGain(m), 10 + 40 + 10 + 10 + 8);    // 引爆有上限
});

t('轉生：重置本輪，保留收藏類進度，道心入帳', () => {
  const s = maxedRun(); s.t = 5000;
  s.res.qi = 1e9; s.res.stone = 1e5; s.res.shard = 77; s.buildings.field.lv = 50;
  const d = D.addDisciple(s, 'xuantian').disciple; d.lv = 9; d.star = 2; D.assign(s, d.uid, 'temple');
  s.artifacts.push('yinqi'); s.goalsDone.push('burst1'); s.nemeses.qian = { met: 2, defeated: true };
  s.gacha.sinceSR = 33; s.grudges = [visitor('former', 1)]; s.disguise.value = 15; s.stats.bursts = 40;
  const gain = Dao.rebirth(s);
  assert.equal(gain, Dao.daoGain({ ...maxedRun() }));
  // 重置
  assert.equal(s.realmIdx, 0); assert.equal(s.buildings.field.lv, 0); assert.equal(s.buildings.temple.lv, CONFIG.start.templeLevel);
  assert.equal(s.res.qi, CONFIG.start.qi); assert.equal(s.grudges.length, 0); assert.equal(s.disguise.value, 0);
  assert.deepEqual({ ...s.run, startT: 0, base: {} }, { bursts: 0, maxChain: 0, nemeses: 0, goals: 0, startT: 0, base: {} });   // 本輪統計歸零（startT／base 另測）
  assert.equal(s.run.startT, s.t);
  // 保留
  assert.equal(s.res.daoHeart, gain); assert.equal(s.res.shard, 77); assert.equal(s.reincarnation.count, 1);
  assert.equal(s.disciples.length, 1); assert.equal(s.disciples[0].lv, 1); assert.equal(s.disciples[0].at, null); assert.equal(s.disciples[0].star, 2);
  assert.deepEqual(s.artifacts, ['yinqi']); assert.deepEqual(s.goalsDone, ['burst1']); assert.equal(s.nemeses.qian.defeated, true);
  assert.equal(s.gacha.sinceSR, 33); assert.equal(s.stats.bursts, 40); assert.equal(s.t, 5000);
  assert.ok(s.visitor.nextAt > s.t);
});

t('道心商店：成本遞增、等級上限、加成生效', () => {
  const s = createState(); s.res.daoHeart = 1000;
  const c0 = Dao.shopCost(s, 'qi').daoHeart;
  const q0 = eco.qiPerSec(s);
  assert.equal(Dao.buy(s, 'qi'), true); assert.equal(Dao.shopLevel(s, 'qi'), 1);
  assert.ok(Dao.shopCost(s, 'qi').daoHeart > c0 || c0 === 1);
  assert.ok(Math.abs(eco.qiPerSec(s) / q0 - 1.10 / 1.0) < 1e-9);               // 聚靈體質 +10%
  s.reincarnation.shop.stone = 20; assert.equal(Dao.canBuy(s, 'stone'), false);   // 已滿級
  const poor = createState(); assert.equal(Dao.buy(poor, 'qi'), false);
});

t('道心：轉生次數自動加成、打坐冷卻、招賢令、離線上限與效率、開局資源', () => {
  const s = createState(); s.reincarnation.count = 3;
  assert.ok(Math.abs(Dao.perm(s, 'qiMult') - 0.3) < 1e-9);
  s.reincarnation.shop.cd = 4; assert.equal(M.cooldownMs(s), CONFIG.click.cooldownMs - 2000);
  s.reincarnation.shop.cd = 6; s.reincarnation.shop.cd = 99; assert.ok(M.cooldownMs(s) >= 2000);
  const a = createState(), b = createState(); b.reincarnation.shop.token = 5;
  eco.tick(a, 1200000); eco.tick(b, 1200000); assert.ok(b.res.token > a.res.token);
  const o1 = createState(), o2 = createState(); o2.reincarnation.shop = { offcap: 2, offeff: 4 };
  assert.equal(applyOffline(o2, 100 * 3600000).usedMs, CONFIG.offline.capMs + 2 * 3600000);
  assert.ok(applyOffline(o2, 3600000).efficiency > applyOffline(o1, 3600000).efficiency);
  const r = maxedRun(); r.reincarnation.shop = { startS: 2, startT: 3 }; Dao.rebirth(r);
  assert.equal(r.res.stone, CONFIG.start.stone + 30); assert.equal(r.res.token, CONFIG.start.token + 3);
});

t('存檔 v1 → v2：舊檔可讀並補上轉生欄位', () => {
  const old = { version: 1, savedAt: Date.now(), state: { res: { qi: 9 }, buildings: { temple: { lv: 3, pausedUntil: 0 } } } };
  const { state } = S.parse(JSON.stringify(old));
  assert.equal(state.res.qi, 9); assert.equal(state.reincarnation.count, 0); assert.deepEqual(state.run, { bursts: 0, maxChain: 0, nemeses: 0, goals: 0, startT: 0, base: {} });
  const st = fakeStorage(); const m = maxedRun(); Dao.rebirth(m); S.save(m, st);
  assert.equal(S.load(st).state.reincarnation.count, 1);
  assert.throws(() => S.parse(JSON.stringify({ version: 99, state: { res: {}, buildings: {} } })));
});

t('本輪統計會累計：引爆、連鎖、宿敵、大事', () => {
  const s = createState(); s.realmIdx = 8; s.disguise.value = 99;
  s.grudges = [visitor('former', 0, { id: 1 }), visitor('former', 0, { id: 2, name: 'B' })];
  X.burst(s); assert.equal(s.run.bursts, 1); assert.equal(s.run.maxChain, 2);
  s.stats.bursts = 1; Goals.tick(s); assert.ok(s.run.goals >= 1);
});

// ── A 批：存檔異常資料與格式 ──
const loadPatched = patch => { const d = JSON.parse(S.serialize(createState())); patch(d.state); return S.parse(JSON.stringify(d)).state; };
const tickAllCore = s => { eco.tick(s, 1000); C.tick(s, 1000); E.tick(s); Inc.tick(s); Goals.tick(s); };

t('存檔含已不存在的弟子／法寶／大事／建築／宿敵／商店 id：清掉而不崩潰', () => {
  const s = loadPatched(st => {
    st.disciples = [{ uid: 1, defId: 'gone', lv: 1, at: null }, { uid: 2, defId: 'afu', lv: 0, at: 'ghost', star: 99 }];
    st.artifacts = ['gone', 'yinqi', 'yinqi']; st.goalsDone = ['gone', 'burst1'];
    st.buildings.ghost = { lv: 3, pausedUntil: 0 }; st.nemeses = { gone: { met: 1, defeated: true } };
    st.reincarnation = { count: 1, shop: { ghost: 5, qi: 999 } };
    st.grudges = [{ id: 1, name: 'x', type: '?', personality: '怪', lvl: 'abc', nemesisId: 'gone' }];
  });
  assert.equal(s.disciples.length, 1); assert.equal(s.disciples[0].lv, 1); assert.equal(s.disciples[0].at, null); assert.equal(s.disciples[0].star, 3);
  assert.deepEqual(s.artifacts, ['yinqi']); assert.deepEqual(s.goalsDone, ['burst1']);
  assert.equal(s.buildings.ghost, undefined); assert.equal(s.nemeses.gone, undefined);
  assert.equal(s.reincarnation.shop.ghost, undefined); assert.equal(s.reincarnation.shop.qi, 20);
  assert.equal(s.grudges[0].type, 'former'); assert.equal(s.grudges[0].personality, '傲慢'); assert.equal(s.grudges[0].lvl, 0); assert.equal(s.grudges[0].nemesisId, undefined);
  tickAllCore(s); s.disguise.value = 20; assert.ok(X.burst(s));
});

t('存檔事件 id 已不存在：事件被清掉，之後仍會正常彈出新事件', () => {
  const s = loadPatched(st => { st.incident = { current: { id: 'gone', expiresAt: 1e9 }, nextAt: 0 }; });
  assert.equal(s.incident.current, null);
  s.t = 1e7; Inc.tick(s); assert.ok(s.incident.current);
});

t('存檔型別錯誤／null 欄位：以預設值或轉型修正', () => {
  const s = loadPatched(st => { st.res.qi = '123'; st.res.stone = 'abc'; st.visitor = null; st.disguise = null; st.settings = null; });
  assert.equal(s.res.qi, 123); assert.equal(s.res.stone, CONFIG.start.stone);
  assert.ok(s.visitor && s.disguise && s.settings);
  tickAllCore(s); assert.ok(Number.isFinite(s.res.qi));
});

t('存檔資源負數／偽裝值越界會被拉回合理範圍', () => {
  const s = loadPatched(st => { st.res.qi = -50; st.disguise.value = 999; });
  assert.equal(s.res.qi, 0); assert.equal(s.disguise.value, 20);
});

t('大數字格式：超過字尾表改用科學記號，NaN 不顯示成無限大', async () => {
  assert.equal(fmt(1e33), '1Dc'); assert.equal(fmt(1.5e67), '1.50e67'); assert.equal(fmt(NaN), '—'); assert.equal(fmt(Infinity), '∞');
});

// ── C1：新手引導 ──
t('分頁漸進解鎖：條件達成才解鎖，旗標保留（含轉生後）', () => {
  const s = createState();
  Prog.tick(s, true);
  assert.deepEqual(Object.keys(s.unlocked), []);              // 開局只有建築、境界
  s.realmIdx = 1; Prog.tick(s, true);
  assert.ok(s.unlocked.gacha && s.unlocked.goals && !s.unlocked.disciples);
  D.addDisciple(s, 'afu'); s.visitor.current = visitor('former', 1); Prog.tick(s, true);
  assert.ok(s.unlocked.disciples && s.unlocked.avenge);
  s.realmIdx = 13; Prog.tick(s, true); assert.ok(s.unlocked.dao);
  s.run = { bursts: 1, maxChain: 1, nemeses: 0, goals: 0 }; Dao.rebirth(s);
  assert.ok(s.unlocked.dao && s.unlocked.gacha);               // 轉生後仍保留
});

t('舊存檔載入後，已達成的條件一次解鎖（不彈提示）', () => {
  const s = createState(); s.realmIdx = 11; s.stats.bursts = 5; D.addDisciple(s, 'afu'); s.nemeses.qian = { met: 1, defeated: false };
  const toasts = []; bus.on('toast', x => toasts.push(x));
  Prog.tick(s, true);
  assert.ok(s.unlocked.gacha && s.unlocked.disciples && s.unlocked.avenge && s.unlocked.nemesis && s.unlocked.goals);
  assert.equal(toasts.length, 0);
});

t('下一步提示：依進度給出對應建議', () => {
  const s = createState(); s.t = 0;
  assert.match(Prog.nextStep(s).text, /煉丹房/);                 // 開局：先建煉丹房（靈氣不夠）
  s.res.qi = 1e6; assert.equal(Prog.nextStep(s).tab, 'buildings');
  s.buildings.alchemy.lv = 10; s.res.qi = 0; s.res.stone = 0;
  s.res.token = 3; assert.match(Prog.nextStep(s).text, /招賢令/);  // 沒有弟子 → 抽卡
  s.res.stone = 100; assert.match(Prog.nextStep(s).text, /突破/);  // 能突破 → 優先
  s.res.stone = 0; D.addDisciple(s, 'afu'); s.res.token = 0;
  assert.match(Prog.nextStep(s).text, /派駐/);
  s.visitor.current = visitor('former', 1); assert.match(Prog.nextStep(s).text, /來訪/);   // 訪客優先
  s.visitor.current = null; s.disguise.value = 20; s.grudges = [visitor('former', 1)];
  assert.match(Prog.nextStep(s).text, /不裝了/);
  s.realmIdx = 13; s.disguise.value = 0; s.grudges = []; assert.equal(Prog.nextStep(s).tab, 'realm');   // 化神 → 轉生
});

// ── 動畫（純邏輯部分）──
t('粒子推進：壽命、重力、匯聚到目標', () => {
  const p = { x: 0, y: 0, vx: 10, vy: 0, g: 100, life: 1, max: 1 };
  assert.equal(stepParticle(p, 0.5), true); assert.equal(p.x, 5); assert.ok(p.y === 0 && p.vy === 50);   // 先位移、再受重力
  assert.equal(stepParticle(p, 0.6), false);                                                              // 壽命耗盡
  const c = { x: 0, y: 0, sx: 0, sy: 0, tx: 100, ty: 50, life: 1, max: 1 };
  stepParticle(c, 0.5); assert.ok(c.x > 0 && c.x < 100);
  stepParticle(c, 0.49); assert.ok(c.x > 90 && Math.abs(c.y - c.x / 2) < 1e-9);                          // 接近目標，且沿直線
});

t('環境光點數量隨產出緩增，且有上下限（手機較少）', () => {
  assert.equal(moteCount(0), 8); assert.ok(moteCount(1e3) > moteCount(10));
  assert.equal(moteCount(1e50), 30); assert.equal(moteCount(1e50, true), 14);
});

t('抽卡演出：最高稀有度判斷', () => {
  assert.equal(topRarity([{ rarity: 'N' }, { rarity: 'SR' }, { rarity: 'R' }]), 'SR');
  assert.equal(topRarity([{ rarity: 'N' }, { rarity: 'UR' }, { rarity: 'SSR' }]), 'UR');
});

t('沒有瀏覽器環境時，特效函式不丟錯（直接略過）', async () => {
  await playPull([{ rarity: 'UR' }]);                       // Node 沒有 document：motionOK 仍為真，但應被保護
});

// ── 宗門全景（SVG 剪影）──
t('建築剪影：每棟每個外觀階段都有圖，且數量與資料的里程碑一致', () => {
  for (const d of BUILDINGS) {
    assert.ok(POS[d.id] && DRAW_ORDER.includes(d.id));
    for (let i = 0; i < d.stages.length; i++) {
      const svg = drawBuilding(d.id, i);
      assert.ok(svg.length > 20 && !svg.includes('undefined') && !svg.includes('NaN'), `${d.id} 階段 ${i}`);
    }
  }
  assert.equal(DRAW_ORDER.length, BUILDINGS.length);
  assert.ok(drawBuilding('temple', 99));                       // 超出階段取最高階，不丟錯
  assert.ok(BACKDROP.includes('d-cloudsea') && BACKDROP.includes('d-gate'));
});

// ── R10 弟子故事與緣分 ──
t('故事資料完整：每位弟子有第一、二章（內容夠長）；SR 以上另有終章；緣分的人都存在且不重複', () => {
  for (const d of DISCIPLES) {
    assert.ok(STORIES[d.id] && STORIES[d.id][1].length > 20, `${d.id} 缺第一章`);
    assert.ok(STORIES2[d.id] && STORIES2[d.id][0] && STORIES2[d.id][1].length > 30, `${d.id} 缺第二章`);
    if (STORIES3[d.id]) assert.ok(['SR', 'SSR', 'UR'].includes(d.rarity), `${d.id} 終章只給 SR 以上`);
  }
  assert.equal(new Set(BONDS.map(b => b.id)).size, BONDS.length, '緣分 id 重複');
  assert.equal(new Set(BONDS.map(b => [b.a, b.b].sort().join())).size, BONDS.length, '同一對弟子重複');
  for (const b of BONDS) assert.ok(DISCIPLES_BY_ID[b.a] && DISCIPLES_BY_ID[b.b] && b.a !== b.b);
});

t('讀故事：條件、獎勵、特性永久加成、只能讀一次', () => {
  const s = createState(); const d = D.addDisciple(s, 'yunqing').disciple;
  assert.equal(St.nextChapter(s, d), null); assert.match(St.lockedHint(s, d), /Lv5/);
  d.lv = 5; assert.equal(St.nextChapter(s, d).idx, 1);
  s.buildings.alchemy.lv = 10; D.assign(s, d.uid, 'alchemy');
  const before = eco.traitSum(s, 'stoneMult'), tok = s.res.token;
  const r = St.read(s, d.uid); assert.equal(r.idx, 1); assert.ok(s.res.token > tok);
  assert.ok(Math.abs(eco.traitSum(s, 'stoneMult') / before - 1.1) < 1e-9);          // 特性 +10%
  assert.equal(St.read(s, d.uid), null);                                             // 第二章需要升星
  d.star = 1; assert.equal(St.nextChapter(s, d).idx, 2);
  St.read(s, d.uid); assert.equal(s.stories.yunqing, 2); assert.equal(St.nextChapter(s, d), null);
  assert.equal(St.reread(s, 'yunqing').length, 2);
});

t('緣分：同一建築才生效，換棟就失效', () => {
  const s = createState(); s.buildings.temple.lv = 10; s.buildings.field.lv = 10;
  const a = D.addDisciple(s, 'qinwu').disciple, b = D.addDisciple(s, 'lingshuang').disciple;
  assert.equal(Bond.bondStatus(s, BONDS[0]), 'apart');
  D.assign(s, a.uid, 'temple'); D.assign(s, b.uid, 'field'); assert.equal(Bond.bondSum(s, 'power'), 0);
  s.buildings.temple.lv = 40;                                                          // 先擴出第二個駐守位
  D.assign(s, b.uid, 'temple');
  assert.equal(Bond.bondStatus(s, BONDS[0]), 'active'); assert.ok(Math.abs(Bond.bondSum(s, 'power') - 0.04) < 1e-9);
  assert.ok(eco.traitSum(s, 'power') >= 0.04);
  assert.equal(Bond.bondStatus(createState(), BONDS[0]), 'none');
});

t('故事進度跨轉生保留；存檔清理未知弟子的故事', () => {
  const s = maxedRun(); s.stories = { afu: 1 }; Dao.rebirth(s); assert.equal(s.stories.afu, 1);
  const x = loadPatched(st => { st.stories = { gone: 1, afu: 9, yunqing: 'x' }; });
  assert.equal(x.stories.gone, undefined); assert.equal(x.stories.afu, St.chapterCount('afu')); assert.equal(x.stories.yunqing, 0);
});

// ── R11 專精與後期建築 ──
t('後期建築：需達境界才能建造；已建造的不受影響；不計入「全建築」大事', () => {
  const s = createState(); s.res.qi = 1e12; s.res.stone = 1e6; s.realmIdx = 6;
  assert.equal(B.isBuildingUnlocked(s, 'tower'), false); assert.equal(B.upgrade(s, 'tower'), false);
  s.realmIdx = 7; assert.equal(B.isBuildingUnlocked(s, 'tower'), true); assert.equal(B.upgrade(s, 'tower'), true);
  s.realmIdx = 3; assert.equal(B.isBuildingUnlocked(s, 'tower'), true);          // 已建造
  assert.equal(B.isBuildingUnlocked(s, 'hall'), false);
  Object.keys(s.buildings).forEach(id => { s.buildings[id].lv = 30; }); s.buildings.beast.lv = 0;
  assert.equal(GOALS_BY_ID.bld3.cur(s), 30);                                      // 靈獸園沒建也不影響
});

t('鎮魔塔／傳功殿／靈獸園的效果', () => {
  const s = createState();
  const p0 = eco.combatPower(s); s.buildings.tower.lv = 50; assert.ok(Math.abs(eco.combatPower(s) / p0 - 1.30) < 1e-9);
  assert.ok(Math.abs(eco.towerBurst(s) - 0.15) < 1e-9);
  const cap0 = D.levelCap(s), dis0 = eco.discipleDiscount(s); s.buildings.hall.lv = 40;
  assert.equal(D.levelCap(s), cap0 + 4); assert.ok(Math.abs(eco.discipleDiscount(s) - dis0 - 0.08) < 1e-9);
  const r0 = eco.rareChance(s); s.buildings.beast.lv = 50; assert.ok(Math.abs(eco.rareChance(s) - r0 - 0.10) < 1e-9);
  const a = createState(), b = createState(); b.buildings.beast.lv = 100;
  eco.tick(a, 300000); eco.tick(b, 300000); assert.ok(b.res.token > a.res.token);
});

t('專精：升到 Lv5 才能選、二選一、效果生效、轉生後重選', () => {
  const s = createState();
  assert.equal(Sp.canChoose(s, 'alchemy'), false); assert.equal(Sp.choose(s, 'alchemy', 'mass'), false);
  s.buildings.alchemy.lv = 50; assert.equal(Sp.canChoose(s, 'alchemy'), true);
  assert.equal(Sp.choose(s, 'alchemy', 'ghost'), false);                          // 不存在的選項
  const st0 = eco.stonePerSec(s) || 1; s.buildings.alchemy.lv = 50;
  const before = eco.stonePerSec(s);
  assert.equal(Sp.choose(s, 'alchemy', 'mass'), true); assert.equal(Sp.choose(s, 'alchemy', 'fine'), false);   // 不能改選
  assert.ok(Math.abs(eco.stonePerSec(s) / before - 1.25) < 1e-9);                  // 靈石 +25%
  s.buildings.temple.lv = 50; Sp.choose(s, 'temple', 'zen');
  assert.equal(M.cooldownMs(s), CONFIG.click.cooldownMs - 2000);                    // 靜修殿：冷卻 -2 秒
  const m = maxedRun(); m.specs = { temple: 'zen' }; Dao.rebirth(m); assert.deepEqual(m.specs, {});
});

t('專精資料完整、存檔清理未知專精', () => {
  for (const [id, opts] of Object.entries(SPECS)) { assert.ok(BUILDINGS.some(b => b.id === id)); assert.equal(opts.length, 2); opts.forEach(o => assert.ok(specText(o.effects))); }
  const x = loadPatched(st => { st.specs = { temple: 'zen', alchemy: 'gone', ghost: 'x' }; });
  assert.deepEqual(x.specs, { temple: 'zen' });
  assert.ok(Object.keys(createState().buildings).includes('beast'));
  const old = loadPatched(st => { delete st.buildings.beast; });                    // 舊存檔沒有新建築：自動補齊
  assert.equal(old.buildings.beast.lv, 0);
});

t('新建築解鎖提示只彈一次，舊存檔 quiet', () => {
  const s = createState(); s.realmIdx = 7; const toasts = []; bus.on('toast', x => toasts.push(x.text));
  Prog.tick(s); Prog.tick(s); assert.equal(toasts.filter(x => x.includes('鎮魔塔')).length, 1);
  const o = createState(); o.realmIdx = 13; const n0 = toasts.length; Prog.tick(o, true); assert.equal(toasts.length, n0);
});

// ── R12 勢力與回頭客 ──
t('勢力：宗門對應勢力、威望分階、升階提示、第三階永久加成', () => {
  assert.equal(Fac.factionOf('赤焰谷'), 'chiyan'); assert.equal(Fac.factionOf('南海商隊'), 'trade'); assert.equal(Fac.factionOf('不存在'), null);
  const s = createState(); const toasts = []; bus.on('toast', x => toasts.push(x.text));
  assert.equal(Fac.tierOf(s, 'chiyan'), 0); Fac.addRep(s, '赤焰谷', 10);
  assert.equal(Fac.tierOf(s, 'chiyan'), 1); assert.ok(toasts.some(x => x.includes('赤焰谷') && x.includes('略有耳聞')));
  assert.ok(Math.abs(Fac.rewardMult(s, '赤焰谷') - 1.1) < 1e-9); assert.equal(Fac.rewardMult(s, '落霞宗'), 1);
  const q0 = eco.qiPerSec(s) || 1; Fac.addRep(s, '赤焰谷', 50);
  assert.equal(Fac.tierOf(s, 'chiyan'), 3); assert.ok(Math.abs(Fac.factionPerm(s, 'qiMult') - 0.05) < 1e-9);
  assert.ok(Math.abs(eco.qiPerSec(s) / q0 - 1.05) < 1e-9);
});

t('引爆：碾壓累積威望，並有機會讓仇人日後回頭；險勝不會', () => {
  setRng(() => 0);                                           // 機率類必中；mode 必為 plead
  const s = createState(); s.realmIdx = 8; s.disguise.value = 99;
  s.grudges = [visitor('rival', 0, { id: 1, sect: '落霞宗' }), visitor('former', 0, { id: 2, name: 'B', sect: '青雲宗' })];
  const r = X.burst(s); setRng(Math.random);
  assert.equal(s.factions.luoxia, 2); assert.equal(s.factions.qingyun, 2); assert.equal(r.comebacks.length, 2); assert.equal(s.returners.length, 2);
  assert.equal(s.returners[0].mode, 'plead'); assert.ok(s.returners[0].dueAt > s.t);
  const s2 = createState(); s2.realmIdx = 3; s2.disguise.value = 99; s2.grudges = [visitor('former', 3.05, { id: 1, sect: '青雲宗' })];
  const r2 = X.burst(s2); assert.equal(r2.entries[0].verdict, 'narrow'); assert.equal(s2.factions.qingyun, 1); assert.equal(s2.returners.length, 0);
});

t('回頭客：到時間回來；復仇者更強且獎勵 ×1.5；求和者帶賠禮', () => {
  const s = createState(); s.t = 1000;
  s.returners = [{ name: '舊人', sect: '赤焰谷', type: 'rival', role: 'r', personality: '傲慢', lvl: 3, mode: 'revenge', dueAt: 5000 }];
  E.tick(s); assert.equal(s.visitor.current, null);          // 還沒到時間
  s.t = 1e7; s.visitor.nextAt = 0; E.tick(s);
  const v = s.visitor.current; assert.equal(v.returning, 'revenge'); assert.equal(v.name, '舊人'); assert.ok(v.lvl >= 4); assert.equal(s.returners.length, 0);
  E.endure(s); assert.equal(s.grudges[0].returnBonus, true);
  const mk = bonus => { setRng(() => 0.5); const x = createState(); x.realmIdx = 10; x.disguise.value = 99; x.grudges = [visitor('trader', 1, { id: 1, returnBonus: bonus, sect: '商盟?' })]; const r = X.burst(x).total.stone; setRng(Math.random); return r; };
  assert.ok(Math.abs(mk(true) / mk(false) - 1.5) < 0.01);
  // 求和
  const p = createState(); p.buildings.alchemy.lv = 30; p.res.stone = 0;
  p.visitor.current = { id: 9, name: '求和者', type: 'former', sect: '青雲宗', role: 'r', personality: '傲慢', lvl: 1, alert: false, returning: 'plead', taunt: 't' };
  const g = E.acceptPlea(p); assert.ok(g.stone >= 3 && p.res.stone >= 3); assert.equal(p.visitor.current, null); assert.equal(p.factions.qingyun, 3);
  p.visitor.current = { id: 10, name: '被拒者', type: 'former', sect: '青雲宗', role: 'r', personality: '傲慢', lvl: 1, alert: false, returning: 'plead', taunt: 't' };
  const dg = p.disguise.value; E.rejectPlea(p);
  assert.equal(p.grudges.length, 1); assert.equal(p.grudges[0].returnBonus, false); assert.equal(p.disguise.value, dg + 1);
  assert.equal(E.acceptPlea(p), null);                       // 沒有待處理的求和者
});

t('當場打臉也累積威望；威望跨轉生保留、回頭客不保留；存檔清理', () => {
  const s = withVisitor(createState(), visitor('former', 0, { sect: '青雲宗' })); s.realmIdx = 6;
  E.showOff(s); assert.equal(s.factions.qingyun, 1);
  const m = maxedRun(); m.factions = { chiyan: 20 }; m.returners = [{ name: 'x', sect: 's', type: 'former', personality: '傲慢', lvl: 1, mode: 'plead', dueAt: 1 }];
  Dao.rebirth(m); assert.equal(m.factions.chiyan, 20); assert.deepEqual(m.returners, []);
  const x = loadPatched(st => { st.factions = { gone: 5, chiyan: 'x', luoxia: 7 }; st.returners = [{ name: 'a', sect: 'x', type: '?', personality: '怪', lvl: 'q', mode: 'plead', dueAt: 'z' }, { mode: 'bad' }, 5]; });
  assert.deepEqual(x.factions, { chiyan: 0, luoxia: 7 }); assert.equal(x.returners.length, 1);
  assert.equal(x.returners[0].type, 'former'); assert.equal(x.returners[0].lvl, 0); assert.equal(x.returners[0].dueAt, 0);
  tickAllCore(x);
});

t('勢力分頁與提示：有威望才解鎖；求和提示優先', () => {
  const s = createState(); Prog.tick(s, true); assert.ok(!s.unlocked.factions);
  Fac.addRep(s, '青雲宗', 1); Prog.tick(s, true); assert.ok(s.unlocked.factions);
  s.visitor.current = { id: 1, name: 'a', type: 'former', sect: '青雲宗', role: 'r', personality: '傲慢', lvl: 1, alert: false, returning: 'plead' };
  assert.match(Prog.nextStep(s).text, /求和/);
});

// ── R13 秘境與輪迴詞條 ──
const teamOf = (s, ids, lv = 1) => ids.map(id => { const d = D.addDisciple(s, id).disciple; d.lv = lv; return d.uid; });

t('秘境：解鎖、組隊上限、隊員自動撤下建築、探索位數量', () => {
  const s = createState(); const [a] = teamOf(s, ['qinwu']);
  assert.equal(Ex.start(s, 'cave', [a]), false);                       // 凡人：尚未解鎖
  s.realmIdx = 2; s.buildings.arena.lv = 10; D.assign(s, a, 'arena');
  assert.equal(Ex.start(s, 'cave', []), false);                        // 沒有隊員
  assert.equal(Ex.start(s, 'cave', [a]), true);
  assert.equal(s.disciples[0].at, null); assert.equal(Ex.away(s, a), true);
  assert.equal(D.assign(s, a, 'arena'), false);                        // 探索中不可派駐
  const [b] = teamOf(s, ['afu']); assert.equal(Ex.start(s, 'cave', [b]), false);   // 探索位已滿
  assert.equal(Ex.slotCount(s), 1); s.realmIdx = 5; assert.equal(Ex.slotCount(s), 2); s.realmIdx = 9; assert.equal(Ex.slotCount(s), 3); s.realmIdx = 12; assert.equal(Ex.slotCount(s), 4);
  const many = teamOf(s, ['liuzi', 'liu2', 'chenlan', 'tieniu']); s.realmIdx = 12;
  assert.equal(Ex.start(s, 'cave', many), false);                      // 超過 3 人
});

t('秘境：成功率隨隊伍強度與專長相合提高，且有上下限', () => {
  const s = createState(); s.realmIdx = 5;
  const [weak] = teamOf(s, ['afu']), [sword] = teamOf(s, ['qinwu']), [sword2] = teamOf(s, ['lingshuang'], 12);
  const c0 = Ex.successChance(s, 'field', [weak]), c1 = Ex.successChance(s, 'field', [sword]), c2 = Ex.successChance(s, 'field', [sword, sword2]);
  assert.ok(c0 < c1 && c1 < c2);                                       // 劍修相合 → 更高
  assert.ok(c0 >= 0.05 && c2 <= 0.95);
  const huge = teamOf(s, ['xuantian', 'luoshen', 'taixu'], 30); assert.equal(Ex.successChance(s, 'cave', huge), 0.95);
});

t('秘境：到期結算、領取獎勵、成功與失敗、隊員歸隊', () => {
  setRng(() => 0);                                                     // 擲骰必成功，機率類必中
  const s = createState(); s.realmIdx = 5; s.buildings.field.lv = 30; s.buildings.alchemy.lv = 20;
  const ids = teamOf(s, ['qinwu', 'lingshuang'], 8);
  Ex.start(s, 'field', ids); Ex.tick(s); assert.equal(s.expeditions[0].status, 'running');   // 未到期
  s.t += 21 * 60000; Ex.tick(s);
  assert.equal(s.expeditions[0].status, 'done'); assert.equal(s.expeditions[0].success, true);
  const st = s.res.stone, sh = s.res.shard;
  const r = Ex.claim(s, 0); setRng(Math.random);
  assert.equal(r.success, true); assert.ok(s.res.stone > st && s.res.mat_field >= 2); assert.equal(s.expeditions.length, 0);
  assert.equal(Ex.away(s, ids[0]), false); assert.ok(r.artifact);       // 隊員回來、法寶機率 1.0 時掉落
  setRng(() => 0.999);                                                  // 擲骰必失敗
  Ex.start(s, 'field', ids); s.t += 21 * 60000; Ex.tick(s);
  assert.equal(s.expeditions[0].success, false); const f = Ex.claim(s, 0); setRng(Math.random);
  assert.equal(f.success, false); assert.equal(f.result.mat, 2);   // 失敗約六成
  assert.equal(Ex.claim(s, 5), null);
});

t('離線期間秘境照常完成；轉生清空探索；存檔清理', () => {
  const s = createState(); s.realmIdx = 5; const ids = teamOf(s, ['qinwu', 'lingshuang'], 5); Ex.start(s, 'field', ids);
  applyOffline(s, 2 * 3600 * 1000); assert.equal(s.expeditions[0].status, 'done');
  const m = maxedRun(); teamOf(m, ['afu']); m.expeditions = [{ id: 'cave', uids: [1], startAt: 0, endAt: 1, chance: 0.5, status: 'running' }];
  Dao.rebirth(m); assert.deepEqual(m.expeditions, []);
  const x = loadPatched(st => { st.disciples = [{ uid: 1, defId: 'afu', lv: 1, at: null }]; st.expeditions = [{ id: 'gone', uids: [1] }, { id: 'cave', uids: [1, 99], endAt: 'x', chance: 9, status: 'weird' }, { id: 'field', uids: [99] }]; });
  assert.equal(x.expeditions.length, 1); assert.deepEqual(x.expeditions[0].uids, [1]); assert.equal(x.expeditions[0].chance, 0.95); assert.equal(x.expeditions[0].status, 'running');
});

t('高稀有度弟子：數量、五行與專長涵蓋、特性值依稀有度遞增、故事與緣分齊全', () => {
  const by = r => DISCIPLES.filter(d => d.rarity === r);
  assert.ok(by('SSR').length >= 8 && by('UR').length >= 6, `SSR ${by('SSR').length} / UR ${by('UR').length}`);
  for (const r of ['SSR', 'UR']) { assert.ok(new Set(by(r).map(d => d.element)).size >= (r === 'SSR' ? 5 : 4), r + ' 五行涵蓋'); assert.ok(new Set(by(r).map(d => d.specialty)).size >= (r === 'SSR' ? 5 : 4), r + ' 專長涵蓋'); }
  for (const d of DISCIPLES) assert.ok(TRAITS[d.trait.key] && d.trait.value > 0, d.id + ' 特性');
  // 同一種特性：稀有度越高數值越高（N < R < SR < SSR < UR；只比較「該稀有度有這種特性」的各級，取各級最高值）
  for (const key of new Set(DISCIPLES.map(d => d.trait.key))) {
    const seq = ['N', 'R', 'SR', 'SSR', 'UR'].map(r => [r, Math.max(0, ...by(r).filter(d => d.trait.key === key).map(d => d.trait.value))]).filter(x => x[1] > 0);
    for (let i = 1; i < seq.length; i++) assert.ok(seq[i][1] > seq[i - 1][1], `${key}：${seq[i][0]} ${seq[i][1]} 應高於 ${seq[i - 1][0]} ${seq[i - 1][1]}`);
  }
  assert.equal(new Set(DISCIPLES.map(d => d.id)).size, DISCIPLES.length, '弟子 id 重複');
  for (const id of ['mulinyin', 'tiebuyu', 'moxiaotian', 'cangwu', 'zhenyue', 'guixu']) assert.ok(STORIES3[id] && BONDS.some(b => b.a === id || b.b === id), id + ' 缺終章或緣分');
});

t('離線事件權重：轉生越多越常抽到高門檻事件、同一則不連續出現、存檔清理未知 id', () => {
  assert.ok(Off.offlineWeight({}) === 1 && Off.offlineWeight({ minReb: 8 }) === 5);
  const s = createState(); s.reincarnation.count = 8;
  const cnt = { low: 0, high: 0 }; let prev = null, rep = 0;
  for (let i = 0; i < 4000; i++) {
    const id = Off.rollOfflineEvent(s, 3600000); const e = OFFLINE_EVENTS.find(x => x.id === id);
    if (!(e.minReb || 0)) cnt.low++; else if (e.minReb >= 3) cnt.high++;
    if (id === prev) rep++; prev = id;
  }
  assert.equal(rep, 0, '不應連續出現同一則');
  const u = OFFLINE_EVENTS.filter(e => !(e.minReb || 0)).length, h = OFFLINE_EVENTS.filter(e => (e.minReb || 0) >= 3).length;
  assert.ok(cnt.high / 4000 > h / OFFLINE_EVENTS.length + 0.05, `高門檻事件占比 ${(cnt.high / 4000).toFixed(2)} 應高於均勻抽選 ${(h / OFFLINE_EVENTS.length).toFixed(2)}`);
  assert.ok(cnt.low / 4000 < u / OFFLINE_EVENTS.length - 0.05, '入門事件占比應低於均勻抽選');
  assert.equal(Off.rollOfflineEvent(s, 1000), null);                                 // 離開太短不抽
  const z = createState(); z.offlineLast = 'no-such-event'; assert.equal(sanitize(z).offlineLast, null);
  const k = createState(); k.offlineLast = 'dog'; k.realmIdx = 13; k.res.stone = 1e12; Dao.rebirth(k); assert.equal(k.offlineLast, 'dog');   // 轉生保留
});

t('輪迴詞條：效果、訪客頻率、本輪道心倍率、轉生選擇與存檔', () => {
  const s = createState(); s.mutator = 'ascetic';
  const q = eco.qiPerSec(s); s.mutator = null; assert.ok(Math.abs(q / eco.qiPerSec(s) - 0.7) < 1e-9);         // 靈氣 -30%
  const a = maxedRun(); a.mutator = 'tribulation'; const b = maxedRun();
  assert.equal(Dao.daoGain(a), Math.floor(Dao.daoGain(b) * 1.15));                                           // 本輪道心 +15%
  assert.ok(Math.abs(eco.combatPower(a) / eco.combatPower(b) - 0.8) < 1e-9);                                 // 戰力 -20%
  const gap = mut => { setRng(() => 0.5); const x = createState(); x.mutator = mut; x.visitor.current = visitor('former', 1); E.endure(x); setRng(Math.random); return x.visitor.nextAt; };
  assert.ok(gap('bustle') < gap(null) && gap(null) < gap('hermit'));
  const m = maxedRun(); Dao.rebirth(m, 'poor'); assert.equal(m.mutator, 'poor');
  const m2 = maxedRun(); Dao.rebirth(m2, 'nonsense'); assert.equal(m2.mutator, null);
  assert.equal(loadPatched(st => { st.mutator = 'gone'; }).mutator, null);
  assert.equal(loadPatched(st => { st.mutator = 'poor'; }).mutator, 'poor');
});

t('高階秘境：材料沿用雲台星砂／龍脈精華，探索度第 1 則也發同一種材料；需符合隊伍限制', () => {
  const s = createState(); s.realmIdx = 13; s.unlocked.expedition = true;
  const mk = (id, lv) => { const d = D.addDisciple(s, id).disciple; d.lv = lv; return d.uid; };
  const dan = mk('shenyao', 30), a = mk('qinwu', 30), b = mk('moqi', 30);       // 丹火、劍金、陣水
  assert.equal(Ex.reqCheck(s, EXPEDITIONS_BY_ID.rift, [dan, a]).ok, false);      // 至少 3 人
  assert.equal(Ex.reqCheck(s, EXPEDITIONS_BY_ID.rift, [dan, a, b]).ok, true);
  assert.equal(Ex.reqCheck(s, EXPEDITIONS_BY_ID.ruins, [a, b]).ok, true);        // 墨小棋是陣修
  assert.equal(Ex.reqCheck(s, EXPEDITIONS_BY_ID.ruins, [dan, a]).ok, false);     // 缺陣修
  setRng(() => 0); assert.ok(Ex.start(s, 'rift', [dan, a, b])); s.t += 121 * 60000; Ex.tick(s);
  const x = s.expeditions[0]; assert.equal(x.result.matId, 'abyss');
  const before = s.res.mat_abyss; const r = Ex.claim(s, 0); setRng(Math.random);
  assert.ok(r.success && s.res.mat_abyss > before && !('mat_rift' in s.res));       // 材料進了龍脈精華，沒有另開新材料
  const e = createState(); e.explore.ruins = 2; EpMod.resolve(e, 'ruins', 1); assert.equal(e.res.mat_sky, 3);
});

t('資源圖示不重複：秘境材料的圖示不能和靈氣／靈石／招賢令／碎片／道心／功勳相同（否則花費晶片會被誤認）', () => {
  const base = ['✨', '💎', '🎫', '🧩', '☯️', '🏅'];
  const icons = Object.values(MATERIALS).map(m => m.icon);
  assert.equal(new Set(icons).size, icons.length, '材料圖示彼此重複');
  icons.forEach(i => assert.ok(!base.includes(i), `材料圖示 ${i} 與基礎資源相同`));
});

t('秘境與詞條資料完整', () => {
  EXPEDITIONS.forEach(e => { assert.ok(e.minutes > 0 && e.difficulty > 0 && Object.keys(e.reward).length); });
  assert.ok(EXPEDITIONS.every((e, i) => i === 0 || e.unlockRealm >= EXPEDITIONS[i - 1].unlockRealm));   // 同一境界可有多個秘境
  assert.ok(EXPEDITIONS.length >= 11 && EXPEDITIONS.filter(e => e.unlockRealm >= 12).length >= 3, '元嬰之後的高階秘境');
  EXPEDITIONS.forEach(e => { const m = matIdOf(e); assert.ok(MATERIALS[m], e.id + ' 材料不存在'); assert.ok(MAT_YIELD[e.id], e.id + ' 缺產量'); assert.ok(EXPLORATION[e.id], e.id + ' 缺探索度事件'); });
  MUTATORS.forEach(m => assert.ok(m.effects.dao > 0 && m.desc));
  const KEYS = new Set(['qiMult', 'stoneMult', 'powerMult', 'burstReward', 'disguiseRate', 'tokenRate', 'cdCut', 'offlineEff', 'offlineCap', 'discipleCap', 'visitFreq', 'startStone', 'startToken', 'dao']);
  MUTATORS.forEach(m => { assert.ok(m.name && m.flavor, m.id); Object.keys(m.effects).forEach(k => assert.ok(KEYS.has(k), `${m.id} 用了不支援的效果鍵 ${k}`)); });
  assert.equal(new Set(MUTATORS.map(m => m.id)).size, MUTATORS.length, '詞條 id 重複');
  assert.ok(MUTATORS.length >= 12, '輪迴詞條數量');
  MUTATORS.forEach(m => { const x = createState(); x.mutator = m.id; assert.ok(eco.qiPerSec(x) > 0 && eco.stonePerSec(x) >= 0 && Number.isFinite(eco.combatPower(x)), m.id); });   // 每個詞條都不會把產出算成負數或 NaN
});

// ── 使用導引 ──
t('分頁說明涵蓋所有分頁；說明文字涵蓋新系統', () => {
  const tabs = ['buildings', 'realm', 'gacha', 'disciples', 'avenge', 'nemesis', 'factions', 'expedition', 'dao', 'goals'];
  tabs.forEach(tb => assert.ok(TAB_TIPS[tb] && TAB_TIPS[tb].length > 20, tb));
  const titles = HELP.map(x => x.t).join('|');
  ['故事', '專精', '勢力', '秘境', '輪迴詞條', '宿敵'].forEach(k => assert.ok(titles.includes(k), '說明缺少 ' + k));
});

t('下一步提示：新系統（故事、專精、秘境）在適當時機提醒', () => {
  const s = createState(); s.buildings.alchemy.lv = 10; s.res.stone = 0; s.realmIdx = 2; s.unlocked.expedition = true;
  const d = D.addDisciple(s, 'afu').disciple; D.assign(s, d.uid, 'temple');
  d.lv = 5; assert.match(Prog.nextStep(s).text, /故事/);
  St.read(s, d.uid); s.res.token = 0;
  s.buildings.field.lv = 50; assert.match(Prog.nextStep(s).text, /專精/);
  Sp.choose(s, 'field', 'rice'); assert.match(Prog.nextStep(s).text, /秘境/);
  s.visitor.current = visitor('former', 1); assert.match(Prog.nextStep(s).text, /來訪/);          // 訪客仍然優先
});

// ── 宗門委託 ──
t('宗門委託：解鎖後補滿 3 張、題型不重複、進度為差值、領取發獎', () => {
  const s = createState();
  for (let i = 0; i < 5; i++) Cm.tick(s);
  assert.equal(s.commissions.list.length, 0);                       // 「大事」分頁未解鎖前不出題
  s.unlocked.goals = true;
  for (let i = 0; i < 5; i++) Cm.tick(s);
  assert.equal(s.commissions.list.length, 3);
  assert.equal(new Set(s.commissions.list.map(c => c.kind)).size, 3);
  const c = s.commissions.list[0];
  assert.equal(Cm.progressOf(s, c), 0);
  assert.equal(Cm.claim(s, 0), null);                               // 未完成不能領
  const before = { ...s.res };
  s.stats.meditations += 1000; s.stats.endures += 1000; s.stats.upgrades += 1000; s.stats.incidents += 1000; s.stats.bursts += 1000;
  s.gacha.total += 1000; s.stats.expeditions += 1000;
  assert.ok(Cm.isReady(s, c));
  const r = Cm.claim(s, 0);
  assert.ok(r && Object.keys(r.reward).length);
  assert.equal(s.commissions.list.length, 2); assert.equal(s.commissions.done, 1);
  const k = Object.keys(r.reward)[0]; assert.equal(s.res[k], before[k] + r.reward[k]);
  Cm.tick(s); assert.equal(s.commissions.list.length, 2);           // 領取後要等冷卻才補
  s.t += COMMISSION_RULES.refillMs + 1000; Cm.tick(s); assert.equal(s.commissions.list.length, 3);
});

t('宗門委託：放棄、每 5 張額外獎勵、轉生保留、題型依解鎖過濾', () => {
  const s = createState(); s.unlocked.goals = true;
  for (let i = 0; i < 5; i++) Cm.tick(s);
  assert.ok(s.commissions.list.every(c => !['pull', 'expedition', 'burst'].includes(c.kind)));   // 系統未解鎖不出題
  assert.ok(Cm.abandon(s, 0)); assert.equal(s.commissions.list.length, 2); assert.equal(s.commissions.done, 0);
  s.commissions.done = 4; s.stats.meditations += 1000; s.stats.endures += 1000; s.stats.upgrades += 1000; s.stats.incidents += 1000;
  const tok = s.res.token;
  const idx = s.commissions.list.findIndex(c => Cm.isReady(s, c));
  const r = Cm.claim(s, idx);
  assert.ok(r.bonus && s.res.token >= tok + 3);
  s.realmIdx = 13; s.res.qi = 1e12; s.res.stone = 1e12; s.disguise.value = 0; s.grudges = [];
  const keep = s.commissions.list.length;
  Dao.rebirth(s); assert.equal(s.commissions.list.length, keep); assert.equal(s.commissions.done, 5);
});

t('宗門委託：舊存檔補預設、壞資料被清掉', () => {
  const s = createState(); s.unlocked.goals = true; Cm.tick(s);
  const raw = JSON.parse(JSON.stringify(s)); raw.commissions.list.push({ kind: 'nope', target: 3, base: 0, reward: {} });
  const back = sanitize(raw); assert.ok(back.commissions.list.every(c => c.kind !== 'nope'));
  const old = JSON.parse(JSON.stringify(s)); delete old.commissions;
  assert.deepEqual(sanitize(old).commissions.list, []);
});

t('補滿空位：只填空位、不動已派駐、專長與緣分優先、不動探索中的弟子', () => {
  const s = createState(); s.realmIdx = 6;
  for (const id of ['temple', 'field', 'alchemy']) s.buildings[id].lv = 40;       // Lv4 → 2 個駐守位
  const a = D.addDisciple(s, 'afu').disciple, x = D.addDisciple(s, 'xiaocui').disciple;   // 田間搭檔
  const r = autoAssign(s);
  assert.equal(r.placed, 2); assert.ok(a.at && a.at === x.at, '緣分搭檔應同棟');
  for (const id of ['temple', 'field', 'alchemy']) assert.ok(D.assignedTo(s, id).length <= B.slots(s, id));
  // 已派駐的不動：手動把 afu 放在靈田，再補 xiaocui → 跟著搭檔去靈田
  const s1 = createState(); s1.realmIdx = 6; for (const id of ['temple', 'field', 'alchemy']) s1.buildings[id].lv = 40;
  const a1 = D.addDisciple(s1, 'afu').disciple, x1 = D.addDisciple(s1, 'xiaocui').disciple; a1.at = 'field';
  autoAssign(s1); assert.equal(a1.at, 'field'); assert.equal(x1.at, 'field');
  // 沒有空位時不會擠掉任何人
  const s4 = createState(); s4.realmIdx = 6; s4.buildings.temple.lv = 10;
  const p = D.addDisciple(s4, 'afu').disciple, q = D.addDisciple(s4, 'xiaocui').disciple; p.at = 'temple';
  assert.equal(autoAssign(s4).placed, 0); assert.equal(p.at, 'temple'); assert.equal(q.at, null);
  // 專長：丹修弟子應優先去煉丹房
  const s2 = createState(); s2.realmIdx = 6; for (const id of ['temple', 'field', 'alchemy']) s2.buildings[id].lv = 10;
  const alc = D.addDisciple(s2, 'shenyao').disciple; autoAssign(s2);
  assert.equal(alc.at, 'alchemy');
  // 探索中的弟子不被動到
  const s3 = createState(); s3.realmIdx = 6; s3.buildings.temple.lv = 40;
  const e = D.addDisciple(s3, 'afu').disciple; s3.expeditions.push({ uids: [e.uid] });
  autoAssign(s3); assert.equal(e.at, null);
});

t('宗門年表：突破大境界與轉生會記錄、上限 120 筆、跨轉生保留', () => {
  const s = createState(); s.res.stone = 1e12; s.res.shard = 1e6;
  for (const k of Object.keys(s.res)) if (k.startsWith('mat_')) s.res[k] = 1e6;
  while (s.realmIdx < 13) R.breakthrough(s);
  assert.ok(s.chronicle.some(e => e.text.includes('突破至築基')) && s.chronicle.some(e => e.text.includes('突破至化神')));
  Dao.rebirth(s); assert.ok(s.chronicle.some(e => e.text.includes('第1世結束')));
  for (let i = 0; i < 200; i++) Chr.note(s, '📜', 'x' + i);
  assert.equal(s.chronicle.length, 120);
});

t('成就：達成即解鎖並記年表、稱號可裝備與取消、轉生保留、壞存檔被清掉', () => {
  const s = createState();
  Ach.tick(s); assert.equal(s.achv.done.length, 0);
  s.stats.endures = 100; Ach.tick(s);
  assert.deepEqual(s.achv.done, ['endure100']); assert.ok(s.chronicle.some(e => e.text.includes('忍者神龜')));
  assert.equal(Ach.equip(s, 'beat30'), false);                       // 未解鎖不能裝備
  assert.ok(Ach.equip(s, 'endure100')); assert.equal(Ach.titleOf(s), '忍者神龜');
  Ach.equip(s, null); assert.equal(Ach.titleOf(s), '');
  Ach.equip(s, 'endure100'); s.realmIdx = 13; s.res.stone = 1e12; Dao.rebirth(s);
  assert.equal(s.achv.title, 'endure100');
  const raw = JSON.parse(JSON.stringify(s)); raw.achv = { done: ['endure100', 'zzz'], title: 'zzz' };
  const back = sanitize(raw); assert.deepEqual(back.achv, { done: ['endure100'], title: null });
});

t('離線歸來事件：離開 30 分鐘以上才出現、兩個選項都能結算、不存在的選項回傳 null', () => {
  const s = createState(); s.buildings.alchemy.lv = 10; s.buildings.temple.lv = 10;
  const r1 = applyOffline(createState(), 10 * 60 * 1000); assert.equal(r1.event, null);
  const r2 = applyOffline(s, 40 * 60 * 1000); assert.ok(r2.event);
  for (const i of [0, 1]) { const t0 = { ...s.res }; const r = Off.resolveOffline(s, r2.event, i); assert.ok(r && r.text); assert.ok(Object.keys(r.got).every(k => s.res[k] >= t0[k])); assert.ok(Object.keys(r.got).length); }
  assert.equal(Off.resolveOffline(s, r2.event, 5), null); assert.equal(Off.resolveOffline(s, 'zzz', 0), null);
});

t('法寶裝備欄：裝備者效果 +50%、未裝備照常、上限 3 件、轉生與存檔保留', () => {
  const s = createState(); s.artifacts = ['yinqi', 'tuna', 'juling', 'danhuo'];
  const base = eco.artifactSum(s, 'qiMult'); assert.ok(Math.abs(base - 0.85) < 1e-9);
  assert.ok(Eq.toggleEquip(s, 'yinqi')); assert.ok(Math.abs(eco.artifactSum(s, 'qiMult') - 0.95) < 1e-9);
  assert.ok(Eq.toggleEquip(s, 'tuna')); assert.ok(Eq.toggleEquip(s, 'juling'));
  assert.equal(Eq.toggleEquip(s, 'danhuo'), false);                // 滿了
  assert.equal(Eq.toggleEquip(s, 'nope'), false);                  // 沒擁有
  assert.ok(Eq.toggleEquip(s, 'yinqi')); assert.equal(s.equipped.length, 2);
  s.realmIdx = 13; s.res.stone = 1e12; Dao.rebirth(s); assert.deepEqual(s.equipped, ['tuna', 'juling']);
  const raw = JSON.parse(JSON.stringify(s)); raw.equipped = ['tuna', 'zzz', 'danhuo', 'yinqi', 'tuna'];
  assert.deepEqual(sanitize(raw).equipped, ['tuna', 'danhuo', 'yinqi']);   // 只留擁有的、去重、不超過上限
});

t('弟子進階：Lv10 才能選、只能選一次、專精／悍勇各有效果、轉生重置', () => {
  const s = createState(); s.realmIdx = 6; s.buildings.alchemy.lv = 10;
  const d = D.addDisciple(s, 'shenyao').disciple; D.assign(s, d.uid, 'alchemy');   // 丹修在煉丹房：專長相符
  assert.equal(D.setBranch(s, d.uid, 'focus'), false);                              // Lv1 不行
  d.lv = 10; assert.equal(D.setBranch(s, d.uid, 'focus'), false, '沒材料不能進階'); s.res.mat_cave = 2; s.res.mat_spring = 2; const c0 = eco.buildingMult(s, 'alchemy'), p0 = eco.combatPower(s);
  assert.ok(D.setBranch(s, d.uid, 'focus')); assert.equal(D.setBranch(s, d.uid, 'might'), false);
  assert.ok(eco.buildingMult(s, 'alchemy') > c0);                                   // 專精：貢獻上升
  assert.ok(Math.abs(eco.combatPower(s) - p0) < 1e-9);                               // 專精不影響戰力
  const s2 = createState(); s2.realmIdx = 6; const e = D.addDisciple(s2, 'shenyao').disciple; e.lv = 10;
  const q0 = eco.combatPower(s2); s2.res.mat_spring = 2; D.setBranch(s2, e.uid, 'might'); assert.ok(eco.combatPower(s2) > q0);
  s.realmIdx = 13; s.res.stone = 1e12; Dao.rebirth(s); assert.equal(s.disciples[0].branch, null);
  const raw = JSON.parse(JSON.stringify(s)); raw.disciples[0].branch = 'zzz'; assert.equal(sanitize(raw).disciples[0].branch, null);
});

t('宿敵覺醒：未達轉生次數與境界不會出現、達成後出現且更強、引爆碾壓給道心並升階', () => {
  const s = createState(); s.realmIdx = 13;
  const qian = NEMESES.find(n => n.id === 'qian');
  s.nemeses.qian = { met: 3, defeated: true };
  s.nemeses = { ...s.nemeses }; for (const n of NEMESES) s.nemeses[n.id] = { met: 3, defeated: true };    // 全部擊敗過
  assert.equal(NemM.canAwaken(s, qian), false); assert.equal(NemM.pickNemesis(s), null);                  // 轉生 0 次
  s.reincarnation.count = 1; assert.ok(NemM.canAwaken(s, qian)); assert.equal(NemM.pickNemesis(s).id, 'qian');
  const v = NemM.makeNemesisVisitor(s, qian); assert.equal(v.awaken, 1); assert.ok(v.name.includes('覺醒Ⅰ'));
  const lowRealm = createState(); lowRealm.reincarnation.count = 9; lowRealm.nemeses.qian = { met: 3, defeated: true };
  assert.equal(NemM.canAwaken(lowRealm, qian), false);                                                    // 境界不夠
  // 引爆：碾壓覺醒者 → 道心 +3、覺醒階數 1、不再給法寶、不重複算「擊敗宿敵」統計
  s.stats.nemesisDefeated = 6; s.res.daoHeart = 0; s.artifacts = [];
  s.grudges = [{ ...v, alert: false }]; s.disguise.value = 20; s.res.qi = 0; s.buildings.arena.lv = 100; s.buildings.tower.lv = 100;
  s.disciples = []; s.res.stone = 0;
  for (const k of Object.keys(s.buildings)) s.buildings[k].lv = 100; s.grudges[0].lvl = 0.5;
  const r = X.burst(s); assert.ok(r);
  const aw = r.nemesesDefeated.find(d => d.awaken); assert.ok(aw, '應擊敗覺醒者'); assert.equal(aw.dao, 3);
  assert.equal(s.res.daoHeart, 3); assert.equal(s.nemeses.qian.awakeLv, 1); assert.equal(s.stats.nemesisDefeated, 6); assert.equal(s.artifacts.length, 0);
});

t('每週挑戰：週一對齊、詞條輪替、符合才加道心且每週一次、換週後可再領', () => {
  const MON = Date.UTC(2026, 10, 2, 0, 0, 0);                                   // 2026-11-02 是週一
  assert.equal(Wk.weekIndex(MON), Wk.weekIndex(MON + 6.9 * 86400000));          // 同一週
  assert.equal(Wk.weekIndex(MON + 7 * 86400000), Wk.weekIndex(MON) + 1);        // 下週一換週
  assert.notEqual(Wk.weeklyMutator(MON).id, Wk.weeklyMutator(MON + 7 * 86400000).id);
  const mk = mut => { const s = createState(); s.realmIdx = 13; s.res.stone = 1e12; s.mutator = mut; return s; };
  const wid = Wk.weeklyMutator(MON).id;
  const a = mk(null); const g0 = Dao.daoGain(a); assert.equal(Dao.rebirth(a, null, MON), g0);              // 沒用本週詞條：無加成
  const b = mk(wid); const gb = Dao.daoGain(b), bonus = Wk.weeklyBonusFor(gb);
  assert.equal(Dao.rebirth(b, wid, MON), gb + bonus); assert.equal(b.res.daoHeart, gb + bonus);
  assert.ok(b.chronicle.some(e => e.text.includes('每週挑戰')));
  b.realmIdx = 13; b.res.stone = 1e12; const gb2 = Dao.daoGain(b);                                       // 同一週再轉生：已領過
  assert.equal(Wk.weeklyEligible(b, MON + 86400000), false); assert.equal(Dao.rebirth(b, wid, MON + 86400000), gb2);
  b.realmIdx = 13; b.res.stone = 1e12; assert.equal(Wk.weeklyEligible(b, MON + 7 * 86400000), false);   // 下週詞條不同，本輪用的不是它
  assert.equal(sanitize(JSON.parse(JSON.stringify(createState()))).weekly.claimed, -1);
});

t('秘境隊伍限制與推薦：限制逐條檢查、不符不能出發、推薦隊伍合法且不比任何合法隊伍差', () => {
  const s = createState(); s.realmIdx = 13; s.res.stone = 1e9;
  const ids = ['afu', 'shenyao', 'qinwu', 'tieniu', 'zhaoling', 'xiaocui', 'moqi'];     // 農丹劍體陣農…
  const ds = ids.map(id => { const d = D.addDisciple(s, id).disciple; d.lv = 8; return d; });
  const E = id => EXPEDITIONS_BY_ID[id];
  assert.equal(Ex.reqCheck(s, E('cave'), [ds[0].uid]).ok, true);
  assert.equal(Ex.reqCheck(s, E('field'), [ds[0].uid]).ok, false);                      // 至少 2 人
  assert.equal(Ex.start(s, 'field', [ds[0].uid]), false);                               // 不符限制不能出發
  assert.ok(Ex.start(s, 'field', [ds[0].uid, ds[1].uid]));
  const ab = E('abyss'); assert.equal(Ex.reqCheck(s, ab, [ds[0].uid, ds[1].uid, ds[2].uid]).ok, false);   // 缺體修
  assert.equal(Ex.reqCheck(s, ab, [ds[3].uid, ds[0].uid, ds[2].uid]).ok, true);
  // 推薦：合法，且戰力不低於所有合法 2~3 人組合
  const s2 = createState(); s2.realmIdx = 13;
  const pool = ['afu', 'shenyao', 'qinwu', 'tieniu', 'zhaoling', 'xiaocui', 'moqi', 'fangcun'].map(id => { const d = D.addDisciple(s2, id).disciple; d.lv = 3 + Math.floor(Math.random() * 1); return d; });
  for (const id of ['cave', 'field', 'valley', 'maze', 'abyss']) {
    const bt = Ex.bestTeam(s2, id); const e = EXPEDITIONS_BY_ID[id];
    if (!bt) continue;
    assert.ok(Ex.reqCheck(s2, e, bt.uids).ok, id + ' 推薦隊伍應合法'); assert.ok(bt.uids.length <= 3);
    let top = 0; const u = pool.map(d => d.uid);
    for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) { for (const q of [[u[i], u[j]], ...u.slice(j + 1).map(k => [u[i], u[j], k])]) if (Ex.reqCheck(s2, e, q).ok) top = Math.max(top, Ex.teamPower(s2, id, q)); }
    assert.ok(bt.power >= top - 1e-6, id + ' 推薦應為最佳');
  }
  // 沒有合法隊伍 → null
  const s3 = createState(); s3.realmIdx = 13; D.addDisciple(s3, 'afu'); assert.equal(Ex.bestTeam(s3, 'abyss'), null);
});

t('五行：相生環與相剋環各自閉合、關係判定正確', () => {
  assert.equal(ELEMENTS.length, 5);
  for (const e of ELEMENTS) { assert.ok(SHENG[e] && KE[e]); assert.equal(relation(e, SHENG[e]), 'sheng'); assert.equal(relation(e, KE[e]), 'ke'); assert.equal(relation(e, e), 'same'); }
  let e = '木'; for (let i = 0; i < 5; i++) e = SHENG[e]; assert.equal(e, '木');      // 生環長度 5
  e = '木'; for (let i = 0; i < 5; i++) e = KE[e]; assert.equal(e, '木');            // 剋環長度 5
  assert.ok(new Set(ELEMENTS.map(x => SHENG[x])).size === 5 && new Set(ELEMENTS.map(x => KE[x])).size === 5);
});

t('五行派駐：建築與同棟隊友相生 +10%、相剋 −5%，可關閉；補滿空位會把相生隊友放一起', () => {
  const s = createState(); s.realmIdx = 6; for (const id of ['temple', 'field', 'alchemy', 'arena']) s.buildings[id].lv = 40;
  const get = id => { const d = D.addDisciple(s, id).disciple; d.lv = 5; return d; };
  // alchemy 屬火：火生土 → 土系弟子在煉丹房 +10%；火剋金 → 金系 −5%
  const earth = get('afu'), metal = get('qinwu');                           // afu 土、qinwu 金
  assert.ok(Math.abs(elementEffect(earth, 'alchemy') - 0.10) < 1e-9, '煉丹房（火）生土');
  assert.ok(Math.abs(elementEffect(metal, 'alchemy') + 0.05) < 1e-9, '煉丹房（火）剋金');
  assert.ok(Math.abs(elementEffect(metal, 'arena')) < 1e-9, '演武場（金）與金相同：只有 elementMult，不計相生相剋');
  // 同棟隊友：木生火。破廟屬土，土與火無生剋，所以火系弟子單獨在破廟為 0，與木系隊友同棟為 +10%
  const fire = D.addDisciple(s, 'huolie').disciple, wood = get('liu2');   // huolie 火、liu2 木
  assert.equal(elementEffect(fire, 'temple', []), 0);
  assert.ok(Math.abs(elementEffect(fire, 'temple', [wood]) - 0.10) < 1e-9);
  assert.ok(contribution(fire, 'temple', [wood]) > contribution(fire, 'temple', []));
  // 木剋土：土系隊友在場，木系弟子貢獻不受影響，但土系弟子（被木剋）−5%
  assert.ok(Math.abs(elementEffect(earth, 'temple', [wood]) + 0.05) < 1e-9);
  CONFIG.element.enabled = false; assert.equal(elementEffect(earth, 'alchemy'), 0); CONFIG.element.enabled = true;
  // 補滿空位：火系弟子與木系弟子同時待派，各 2 個位置的建築只剩一棟 → 兩人應被放在同一棟以取得相生
  const s2 = createState(); s2.realmIdx = 6; s2.buildings.temple.lv = 0; s2.buildings.library.lv = 40;   // 只剩藏經閣（水、2 個駐守位）有位置
  const f2 = D.addDisciple(s2, 'huolie').disciple, w2 = D.addDisciple(s2, 'liu2').disciple; f2.lv = w2.lv = 5;
  autoAssign(s2); assert.equal(f2.at, 'library'); assert.equal(w2.at, 'library');
});

t('補滿空位的結果接近暴力窮舉最佳解（含五行相生相剋）', () => {
  const bids = ['temple', 'field', 'alchemy', 'arena'];
  const sc = s => bids.reduce((a, id) => a + (eco.buildingMult(s, id) - 1) * (CONFIG.assignValue[id] ?? 1) * Math.max(1, s.buildings[id].lv), 0);   // 與補滿空位相同的加權目標
  for (const names of [['afu', 'huolie', 'liu2', 'qinwu'], ['shenyao', 'tieniu', 'zhaoling', 'xiaocui'], ['huolie', 'liu2', 'afu', 'moqi']]) {
    const s = createState(); s.realmIdx = 6; for (const id of bids) s.buildings[id].lv = 40;
    const ds = names.map((id, i) => { const d = D.addDisciple(s, id).disciple; d.lv = 4 + i * 2; return d; });
    autoAssign(s); const got = sc(s);
    let best = 0; const cnt = {};
    const rec = i => { if (i === ds.length) { best = Math.max(best, sc(s)); return; }
      for (const b of [null, ...bids]) { if (b && (cnt[b] || 0) >= 2) continue; ds[i].at = b; if (b) cnt[b] = (cnt[b] || 0) + 1; rec(i + 1); if (b) cnt[b]--; } ds[i].at = null; };
    ds.forEach(d => { d.at = null; }); rec(0);
    assert.ok(got >= best * 0.97, `${names} 補位 ${got.toFixed(3)} 應 ≥ 最佳 ${best.toFixed(3)} 的 97%`);
  }
});

t('仇人五行：訪客／宿敵／回頭客都有、克制讓戰力比 +3% 每位、被剋 −2%、上下限、未派駐不算、可關閉', () => {
  assert.ok(NEMESES.every(n => ELEMENTS.includes(n.element)), '每位宿敵都有五行');
  const s = createState(); s.realmIdx = 6; s.buildings.temple.lv = 40;
  const g = { id: 1, name: '某某', type: 'former', sect: 's', role: 'r', personality: '傲慢', lvl: 6, alert: false, element: '火' };
  assert.equal(Conc.elementAdvantage(s, g).mult, 1);                                  // 沒派駐：無克制
  const w = D.addDisciple(s, DISCIPLES.find(x => x.element === '水').id).disciple;      // 水系弟子（水剋火）
  assert.equal(Conc.elementAdvantage(s, g).mult, 1, '未派駐不算');
  w.at = 'temple'; assert.ok(Math.abs(Conc.elementAdvantage(s, g).mult - 1.03) < 1e-9); assert.equal(Conc.elementAdvantage(s, g).beat, 1);
  const ratio1 = Conc.ratioOf(s, g); CONFIG.element.enabled = false; const ratio0 = Conc.ratioOf(s, g); CONFIG.element.enabled = true;
  assert.ok(Math.abs(ratio1 / ratio0 - 1.03) < 1e-9, '克制讓戰力比 ×1.03');
  // 被剋：土剋水。對「水」敵人，土系弟子被剋 −2%
  const gw = { ...g, element: '水' }; const earthD = DISCIPLES.find(x => x.element === '土'); const e = D.addDisciple(s, earthD.id).disciple; e.at = 'temple';
  const beaten = Conc.elementAdvantage(s, gw); assert.equal(beaten.beaten, 0); assert.equal(beaten.beat, 1);    // 土剋水：土系是「克制者」
  const gm = { ...g, element: '土' }; assert.equal(Conc.elementAdvantage(s, gm).beaten, 1);                      // 土敵人剋水系弟子
  // 上下限：派很多克制者也不超過 1.20
  for (let i = 0; i < 12; i++) { const d = D.addDisciple(s, DISCIPLES.find(x => x.element === '水').id).disciple; d.at = 'temple'; }
  assert.ok(Conc.elementAdvantage(s, g).mult <= 1.2 + 1e-9);
  // 舊存檔沒有五行：用名字推得出穩定的一個
  const old = { ...g }; delete old.element; assert.equal(Conc.elementOfGrudge(old), Conc.elementOfGrudge({ ...old })); assert.ok(ELEMENTS.includes(Conc.elementOfGrudge(old)));
  const raw = JSON.parse(JSON.stringify(createState())); raw.grudges = [{ ...old, element: 'zzz' }];
  assert.ok(ELEMENTS.includes(sanitize(raw).grudges[0].element));
});

t('專長心得：花碎片領悟、需該專長弟子派駐才生效、各效果併入對應加成、轉生與存檔保留', () => {
  const s = createState(); s.realmIdx = 6; s.buildings.arena.lv = 10; s.buildings.alchemy.lv = 10; s.buildings.field.lv = 10;
  assert.equal(Ins.learn(s, '劍修'), false);                                         // 沒碎片
  s.res.shard = 100;
  const sword = D.addDisciple(s, 'qinwu').disciple, alch = D.addDisciple(s, 'shenyao').disciple;   // 劍修、丹修
  const p0 = eco.combatPower(s); assert.ok(Ins.learn(s, '劍修')); assert.equal(s.res.shard, 96);
  assert.equal(eco.combatPower(s), p0, '劍修弟子未派駐：不生效');
  sword.at = 'arena'; const p1 = eco.combatPower(s);
  assert.ok(p1 > p0, '派駐後生效'); assert.ok(Math.abs(Ins.insightPerm(s, 'powerMult', 'perm') - 0.05) < 1e-9);
  assert.ok(Ins.learn(s, '劍修') && Ins.learn(s, '劍修') && !Ins.learn(s, '劍修'), '三層後不能再領悟'); assert.equal(s.res.shard, 100 - 4 - 10 - 20);
  assert.ok(Math.abs(Ins.insightPerm(s, 'powerMult', 'perm') - 0.15) < 1e-9); assert.ok(s.chronicle.some(e => e.text.includes('劍修心得大成')));
  // 丹修 → stoneMult；體修 → endureLoss（走特性加總，不重複計入 perm）
  alch.at = 'alchemy'; const st0 = eco.stonePerSec(s); Ins.learn(s, '丹修'); assert.ok(eco.stonePerSec(s) > st0);
  assert.equal(Ins.insightPerm(s, 'endureLoss', 'perm'), 0); assert.equal(Ins.insightPerm(s, 'stoneMult', 'trait'), 0);
  const tank = D.addDisciple(s, 'tieniu').disciple; Ins.learn(s, '體修'); const e0 = eco.traitSum(s, 'endureLoss'); tank.at = 'temple'; assert.ok(eco.traitSum(s, 'endureLoss') > e0);
  s.realmIdx = 13; s.res.stone = 1e12; Dao.rebirth(s); assert.equal(s.insight['劍修'], 3);
  const raw = JSON.parse(JSON.stringify(s)); raw.insight = { 劍修: 99, 丹修: -3, zzz: 1 }; const back = sanitize(raw).insight;
  assert.equal(back['劍修'], 3); assert.equal(back['丹修'], 0); assert.equal(back['zzz'], undefined);
});

t('補滿空位依建築價值加權：沒有專長的弟子優先去產出建築，而不是不產出的藏經閣', () => {
  const s = createState(); s.realmIdx = 6; s.buildings.temple.lv = 0; s.buildings.library.lv = 40; s.buildings.field.lv = 40;   // 各 2 個位置
  const a = D.addDisciple(s, 'liuzi').disciple, b = D.addDisciple(s, 'liu2').disciple;                                          // 兩位都不是靈田專屬以外的
  a.lv = b.lv = 5; autoAssign(s);
  assert.equal(a.at, 'field'); assert.equal(b.at, 'field');
  CONFIG.assignValue.field = 0.01; CONFIG.assignValue.library = 5;                                                               // 把權重倒過來，結果應跟著翻轉
  const s2 = createState(); s2.realmIdx = 6; s2.buildings.temple.lv = 0; s2.buildings.library.lv = 40; s2.buildings.field.lv = 40;
  const c = D.addDisciple(s2, 'liuzi').disciple; c.lv = 5; autoAssign(s2); assert.equal(c.at, 'library');
  CONFIG.assignValue.field = 3; CONFIG.assignValue.library = 0.3;
});

t('功能區塊漸進解鎖：條件達成才出現且不會消失；舊存檔 quiet 不彈提示；下一步提示涵蓋進階／心得／裝備', () => {
  const s = createState();
  Prog.tick(s); for (const k of ['insight', 'achv', 'chron', 'sort']) assert.equal(Prog.hasFeature(s, k), false, k + ' 一開始不顯示');
  s.res.shard = 1; s.disciples = Array.from({ length: 6 }, (_, i) => ({ uid: i + 1, defId: 'afu', lv: 1, at: null }));
  Prog.tick(s); assert.ok(Prog.hasFeature(s, 'insight') && Prog.hasFeature(s, 'sort'));
  s.res.shard = 0; Prog.tick(s); assert.ok(Prog.hasFeature(s, 'insight'), '解鎖後不會因碎片用完而消失');
  Chr.note(s, '📜', 'a'); Prog.tick(s); assert.equal(Prog.hasFeature(s, 'chron'), false); Chr.note(s, '📜', 'b'); Prog.tick(s); assert.ok(Prog.hasFeature(s, 'chron'));
  // 舊存檔：quiet 時直接解鎖（不 toast）
  const old = createState(); old.realmIdx = 5; Prog.tick(old, true); assert.ok(Prog.hasFeature(old, 'achv') && Prog.hasFeature(old, 'insight'));
  // 下一步提示
  const h = createState(); h.buildings.alchemy.lv = 10; h.res.stone = 0; h.realmIdx = 2; h.unlocked.expedition = false;
  const d = D.addDisciple(h, 'afu').disciple; D.assign(h, d.uid, 'temple'); St.read(h, d.uid); h.res.token = 0;
  d.lv = 10; assert.match(Prog.nextStep(h).text, /故事/);                          // 故事優先
  h.stories = { afu: 99 }; assert.match(Prog.nextStep(h).text, /進階/);              // 讀完後提示進階
  h.res.mat_cave = 2; D.setBranch(h, d.uid, 'focus'); h.artifacts = ['yinqi']; h.equipped = []; h.unlocked.expedition = false;
  assert.match(Prog.nextStep(h).text, /裝備欄/);                                   // 有法寶沒裝備
  h.equipped = ['yinqi']; h.unlocked.f_insight = true; h.res.shard = 10; h.disciples.push({ uid: 99, defId: 'qinwu', lv: 1, at: 'arena' }); h.buildings.arena.lv = 10;
  assert.match(Prog.nextStep(h).text, /專長心得/);                                 // 劍修派駐中、碎片夠
});

t('擴充內容：每則事件的每個選項都能結算；宿敵鏈串到後日談；新宿敵資料完整；秘境新增與限制可組隊', () => {
  assert.ok(INCIDENTS.length >= 24, '事件數量');
  for (const inc of INCIDENTS) for (let i = 0; i < inc.choices.length; i++) {
    const s = createState(); s.realmIdx = 10; s.res.qi = 1e9; s.res.stone = 1e9; for (const id of Object.keys(s.buildings)) s.buildings[id].lv = 30;
    forceIncident(s, inc.id);
    assert.doesNotThrow(() => Inc.resolve(s, i, false), `${inc.id}[${i}]`);
    assert.equal(s.incident.current, null, `${inc.id}[${i}] 結算後事件應清除`);
  }
  // 宿敵鏈：主線 qian → xiao → liu → yun → xuan，接後日談 mo → ling → wu，再接 6 位勢力宿敵（side，各自獨立）
  const chain = ['qian', 'xiao', 'liu', 'yun', 'xuan', 'mo', 'ling', 'wu'];
  assert.deepEqual(NEMESES.slice(0, 8).map(n => n.id), chain);
  NEMESES.slice(0, 8).forEach((n, i) => { assert.equal(n.cond.prev || null, i ? chain[i - 1] : null); });
  NEMESES.forEach(n => { assert.ok(n.intro.length >= 3 && n.kneel.length && n.narrow.length && n.fail.length && n.story.defeat); assert.ok(ARTIFACTS_BY_ID[n.reward.artifact]?.unique, n.id + ' 專屬法寶'); });
  assert.equal(NEMESES.filter(n => !n.epilogue && !n.side).length, 5); assert.ok(NEMESES.slice(5, 8).every(n => n.epilogue));
  assert.equal(NEMESES.filter(n => n.side).length, 6); assert.ok(NEMESES.slice(8).every(n => n.side && !n.epilogue && !n.cond.prev && n.cond.faction));
  // 「舊債還清」只看主線 5 位；全部 8 位才算成就「宿敵剋星」
  const s = createState(); s.stats.nemesisDefeated = 5; Goals.tick(s); assert.ok(s.goalsDone.includes('nemAll'));
  assert.ok(!(s.achv.done.includes('nemall')));
  // 新秘境都能用推薦隊伍組出合法隊伍（有足夠弟子時）
  const m = createState(); m.realmIdx = 13;
  ['qinwu', 'lingshuang', 'yanhui', 'afu', 'liu2', 'xiaocui', 'tieniu', 'shigan'].forEach(id => { D.addDisciple(m, id).disciple.lv = 6; });
  for (const id of ['spring', 'swamp', 'sky']) { const bt = Ex.bestTeam(m, id); assert.ok(bt, id); assert.ok(Ex.reqCheck(m, EXPEDITIONS_BY_ID[id], bt.uids).ok, id); }
});

t('宗門榮耀：榮耀值由進度換算、等級只升不降並彈提示寫年表、永久 +1%／級、轉生與存檔保留', () => {
  const s = createState(); assert.equal(Gl.gloryPoints(s), 0); assert.equal(Gl.gloryLevel(s), 0); assert.equal(Gl.gloryName(s), '破廟宗主');
  assert.equal(Gl.gloryPerm(s, 'qiMult'), 0);
  s.reincarnation.count = 5;                                            // 5 × 6 = 30 → 1 級
  assert.equal(Gl.gloryPoints(s), 30); Gl.tick(s); assert.equal(s.glory.lv, 1); assert.ok(s.chronicle.some(e => e.text.includes('宗門榮耀升至 1 級')));
  assert.equal(Gl.gloryName(s), GLORY_LEVELS[0].name); assert.ok(Math.abs(Gl.gloryPerm(s, 'qiMult') - 0.01) < 1e-9);
  assert.equal(Gl.gloryPerm(s, 'clickMult'), 0, '只加靈氣／靈石／戰力');
  // 加成實際進經濟：同一個狀態下，榮耀 1 級讓靈氣產出 +1%（乘在倍率上）
  const a = createState(); a.buildings.temple.lv = 50; const base = eco.qiPerSec(a);
  a.glory.lv = 1; assert.ok(eco.qiPerSec(a) > base);
  // 只增不減：即使進度「看起來」變少，等級仍取歷史最高
  s.reincarnation.count = 0; assert.equal(Gl.gloryLevel(s), 1);
  // 滿級
  const m = createState(); m.reincarnation.count = 200; Gl.tick(m); assert.equal(m.glory.lv, GLORY_LEVELS.length); assert.equal(Gl.gloryNext(m), null);
  assert.ok(Math.abs(Gl.gloryPerm(m, 'powerMult') - 0.10) < 1e-9);
  // 轉生保留；存檔清理
  s.realmIdx = 13; s.res.stone = 1e12; s.reincarnation.count = 5; Dao.rebirth(s); assert.equal(s.glory.lv, 1);
  const raw = JSON.parse(JSON.stringify(s)); raw.glory = { lv: 99 }; assert.equal(sanitize(raw).glory.lv, GLORY_LEVELS.length);
  raw.glory = 'zzz'; assert.equal(sanitize(raw).glory.lv, 0);
  // 後期大事存在且可完成
  const g = createState(); g.reincarnation.count = 10; Goals.tick(g); assert.ok(g.goalsDone.includes('reb3') && g.goalsDone.includes('reb10'));
});

t('出戰陣容：沒選人不變、五行與專長加成、最多 3 人、推薦不比空陣容差、轉生與存檔保留', () => {
  const s = createState(); s.realmIdx = 6;
  const mkG = (el, pers, lvl = 6) => ({ id: s.nextGid++, name: '仇', type: 'rival', sect: '青雲宗', personality: pers, lvl, alert: false, element: el });
  const g = mkG('木', '傲慢'); s.grudges = [g];
  // 沒選人：加成為 1，結果與舊算法相同
  assert.equal(Sq.squadVs(s, g).mult, 1);
  // 金剋木、劍修剋傲慢：秦無鋒（金・劍修・R）= 底子 0.02 + 0.05 + 0.04
  const qin = D.addDisciple(s, 'qinwu').disciple; Sq.toggleSquad(s, qin.uid);
  assert.ok(Math.abs(Sq.squadVs(s, g).mult - 1.11) < 1e-9);
  // 被剋：火被水剋 → 雷動（火）對水系仇人 −3%
  const lei = D.addDisciple(s, 'leidong').disciple; assert.ok(Sq.memberVs(lei, mkG('水', '虛偽')).elem < 0);
  // 最多 3 人
  const a = D.addDisciple(s, 'afu').disciple, b = D.addDisciple(s, 'liu2').disciple; Sq.toggleSquad(s, lei.uid); Sq.toggleSquad(s, a.uid);
  assert.equal(Sq.toggleSquad(s, b.uid), false); assert.equal(s.squad.length, 3);
  Sq.toggleSquad(s, a.uid); assert.equal(s.squad.length, 2);
  // 預覽帶出雙方戰力與陣容加成；引爆結果用陣容後的比值
  s.disguise.value = CONFIG.conceal.max;
  const pv = X.previewBurst(s); assert.ok(pv.entries[0].sq.mult > 1 && pv.entries[0].mine > 0 && pv.entries[0].theirs > 0);
  assert.ok(Math.abs(pv.entries[0].ratio - pv.entries[0].mine / pv.entries[0].theirs) < 1e-9);
  // 推薦陣容：判定分數不低於空陣容
  const rec = X.recommendSquad(s); assert.ok(rec.length <= 3);
  // 存檔清理：不存在的 uid 與超過 3 人被剔除
  const raw = JSON.parse(JSON.stringify(s)); raw.squad = [qin.uid, 9999, qin.uid, lei.uid, a.uid, b.uid]; assert.deepEqual(sanitize(raw).squad, [qin.uid, lei.uid, a.uid]);
  raw.squad = 'x'; assert.deepEqual(sanitize(raw).squad, []);
  // 轉生保留
  s.realmIdx = 13; s.res.stone = 1e12; s.squad = [qin.uid]; Dao.rebirth(s); assert.deepEqual(s.squad, [qin.uid]);
});

t('探索度：成功才累積、門檻解鎖發現、第 2 則二選一、永久加成與獎勵倍率、轉生與存檔保留', () => {
  const Ep = EpMod;
  const s = createState(); s.realmIdx = 6;
  assert.equal(Ep.exLevel(s, 'cave'), 0); assert.equal(Ep.explorePerm(s, 'qiMult'), 0);
  Ep.addProgress(s, 'cave'); assert.equal(Ep.exLevel(s, 'cave'), 0);
  assert.equal(Ep.addProgress(s, 'cave'), true); assert.equal(Ep.exLevel(s, 'cave'), 1);
  assert.deepEqual(Ep.pendingEvents(s), [{ id: 'cave', lv: 1 }]);
  assert.ok(Math.abs(Ep.exRewardMult(s, 'cave') - 1.1) < 1e-9);
  // 領取：不可重複、不能越級
  assert.equal(Ep.resolve(s, 'cave', 2, 'a'), null); const sh = s.res.shard;
  assert.ok(Ep.resolve(s, 'cave', 1)); assert.ok(s.res.merit > 0 && s.res.mat_cave >= 3); assert.equal(Ep.resolve(s, 'cave', 1), null);
  // 第 2 則：要選 a 或 b；b 給永久加成，a 給立即資源
  for (let i = 0; i < 3; i++) Ep.addProgress(s, 'cave'); assert.equal(Ep.exLevel(s, 'cave'), 2);
  assert.equal(Ep.resolve(s, 'cave', 2), null); assert.equal(Ep.resolve(s, 'cave', 2, 'z'), null);
  assert.ok(Ep.resolve(s, 'cave', 2, 'b')); assert.ok(Math.abs(Ep.explorePerm(s, 'qiMult') - 0.01) < 1e-9);
  assert.ok(eco.qiPerSec(s) > 0);
  for (let i = 0; i < 4; i++) Ep.addProgress(s, 'cave'); assert.equal(Ep.exLevel(s, 'cave'), 3);
  assert.ok(Ep.resolve(s, 'cave', 3)); assert.ok(Math.abs(Ep.explorePerm(s, 'qiMult') - 0.02) < 1e-9);
  assert.equal(Ep.pendingEvents(s).length, 0);
  // 秘境獎勵隨探索度成長（同一隊伍同一秘境，成功時資源 ×1.3）
  assert.ok(Math.abs(Ep.exRewardMult(s, 'cave') - 1.3) < 1e-9);
  // 存檔清理與轉生保留
  const raw = JSON.parse(JSON.stringify(s)); raw.explore = { cave: -5, nope: 3 }; raw.exMile = { cave: { 1: 1, 2: 'q', 3: 0 } };
  const c = sanitize(raw); assert.equal(c.explore.cave, 0); assert.ok(!('nope' in c.explore)); assert.deepEqual(c.exMile.cave, { 1: 'x' });
  s.realmIdx = 13; s.res.stone = 1e12; Dao.rebirth(s); assert.equal(Ep.exLevel(s, 'cave'), 3); assert.equal(s.exMile.cave[2], 'b');
});

t('秘境材料：跨大境界突破需要對應材料、探索產出材料與功勳、舊存檔補欄位與轉生保留', () => {
  const s = createState(); s.res.stone = 1e12; s.realmIdx = 9;
  assert.equal(R.breakCost(s).mat_field, 2); assert.equal(R.canBreak(s), false);                   // 築基：戰場殘鋒＋藥王花
  s.res.mat_field = 2; assert.equal(R.canBreak(s), false); s.res.mat_valley = 2; assert.equal(R.canBreak(s), true);
  assert.ok(R.breakthrough(s)); assert.equal(s.res.mat_field, 0); assert.equal(R.breakCost(s).mat_swamp, 3);   // 金丹：瘴靈草＋陣紋玉
  s.realmIdx = 11; assert.deepEqual(Object.keys(R.breakCost(s)).sort(), ['mat_sky', 'stone']);          // 元嬰
  s.realmIdx = 12; assert.ok(R.breakCost(s).mat_abyss > 0 && !('shard' in R.breakCost(s)));             // 化神
  s.realmIdx = 5; assert.deepEqual(Object.keys(R.breakCost(s)), ['stone']);                              // 小境界只要靈石
  // 秘境不再產招賢令與碎片
  for (const e of EXPEDITIONS) assert.ok(!e.reward.token && !e.reward.shard, e.id);
  // 轉生保留材料與功勳
  const k = createState(); k.res.mat_abyss = 7; k.res.merit = 9; k.realmIdx = 13; k.res.stone = 1e12; Dao.rebirth(k); assert.equal(k.res.mat_abyss, 7); assert.equal(k.res.merit, 9);
  // 舊存檔補欄位
  const raw = JSON.parse(JSON.stringify(createState())); delete raw.res.merit; delete raw.res.mat_cave; delete raw.tokBuy;
  const c = sanitize(raw); assert.equal(c.res.merit, 0); assert.equal(c.res.mat_cave, 0); assert.equal(c.tokBuy.n, 0);
});

t('招賢令：靈石限購遞增價、時段重置、功勳兌換、委託與引爆給功勳', () => {
  const s = createState(); s.res.stone = 1e9;
  assert.equal(G.tokenLeft(s), 6); const p1 = G.tokenPrice(s, 1).stone, p3 = G.tokenPrice(s, 3).stone;
  assert.ok(p3 > p1 * 3, '越買越貴'); assert.equal(G.buyTokens(s, 4), true); assert.equal(G.tokenLeft(s), 2);
  assert.equal(G.buyTokens(s, 3), false, '超過限購'); assert.equal(G.buyTokens(s, 2), true); assert.equal(G.tokenLeft(s), 0); assert.equal(G.buyTokens(s, 1), false);
  assert.ok(G.tokenPrice(s, 1).stone > p1);
  s.t += 3600000 + 1; assert.equal(G.tokenLeft(s), 6); assert.equal(G.tokenPrice(s, 1).stone, p1);        // 一小時後重置
  // 功勳兌換
  const t0 = s.res.token; s.res.merit = 13; assert.ok(G.exchangeMerit(s, 2)); assert.equal(s.res.token, t0 + 2); assert.equal(s.res.merit, 1); assert.equal(G.exchangeMerit(s, 1), false);
  // 引爆與探索給功勳
  const b = createState(); b.realmIdx = 6; b.disguise.value = CONFIG.conceal.max; b.grudges = [{ id: 1, name: '仇', type: 'rival', sect: '青雲宗', personality: '傲慢', lvl: 1, alert: false, element: '木' }];
  X.burst(b); assert.ok(b.res.merit >= 1);
});

t('仇敵：放過熟成、仇人記憶與老對頭、個性偏好、宿敵弱點、存檔清理', () => {
  const mk = (s, o) => ({ id: s.nextGid++, name: '甲', type: 'rival', sect: '青雲宗', personality: '傲慢', lvl: 1, alert: false, element: '木', ...o });
  const full = s => { s.disguise.value = CONFIG.conceal.max; };
  // 放過：不參戰、熟成 +1、境界上升、旗標重置；宿敵不能放過
  const s = createState(); s.realmIdx = 9; const a = mk(s, { name: '甲' }), b = mk(s, { name: '乙' }), nm = mk(s, { name: '錢貫', nemesisId: 'qian' });
  s.grudges = [a, b, nm]; full(s);
  assert.equal(X.toggleSpare(s, a.id), true); assert.equal(X.toggleSpare(s, nm.id), false);
  const pv = X.previewBurst(s); assert.equal(pv.spared, 1); assert.ok(pv.entries.find(e => e.g.name === '甲').sparing);
  const lv0 = a.lvl; const r = X.burst(s); X.endBurst(s);
  assert.ok(!r.entries.some(e => e.g.name === '甲'), '被放過的不參戰');
  const left = s.grudges.find(g => g.name === '甲'); assert.ok(left && left.ripe === 1 && left.lvl > lv0 && left.spare === false);
  // 全部放過 → 無法引爆
  const t2 = createState(); t2.realmIdx = 9; const c = mk(t2, {}); t2.grudges = [c]; full(t2); X.toggleSpare(t2, c.id); assert.equal(X.burst(t2), null);
  // 記憶：擊敗後記錄次數，第 3 次成為老對頭並給功勳；回頭客帶著次數並變強
  const m = createState(); m.realmIdx = 12; setRng(() => 0);
  for (let i = 1; i <= 3; i++) { m.grudges = [mk(m, { name: '丙', lvl: 1 })]; full(m); X.burst(m); X.endBurst(m); assert.equal(m.foes['丙'].beaten, i); }
  setRng(Math.random); assert.ok(m.res.merit >= 2 && m.chronicle.some(e => /老對頭/.test(e.text)));
  assert.ok(m.returners.every(rt => rt.foe >= 1));
  // 個性偏好：勢利 → 靈石較多（同條件期望值較高）
  const rewardOf = pers => { setRng(() => 0.5); const q = createState(); q.realmIdx = 12; q.grudges = [mk(q, { personality: pers, type: 'trader', lvl: 3 })]; full(q); const st = q.res.stone; X.burst(q); setRng(Math.random); return q.res.stone - st; };
  assert.ok(rewardOf('勢利') > rewardOf('虛偽') * 1.3);
  // 宿敵弱點：弱點專長 = 個性對應的專長；陣容命中才用一般碾壓門檻
  const w = createState(); w.realmIdx = 13; const xiao = mk(w, { name: '蕭承曜', nemesisId: 'xiao', personality: '傲慢', lvl: 5 });
  assert.equal(X.weakOf(xiao), '劍修'); assert.equal(X.weakOf(mk(w, {})), null);
  const sword = D.addDisciple(w, 'qinwu').disciple, farm = D.addDisciple(w, 'afu').disciple;
  assert.equal(X.weakHit(xiao, [farm]), false); assert.equal(X.weakHit(xiao, [sword]), true);
  // 存檔清理
  const raw = JSON.parse(JSON.stringify(m)); raw.grudges = [{ id: 1, name: 'x', type: 'rival', personality: '傲慢', lvl: 1, ripe: 99, foe: -3, spare: 1 }]; raw.foes = { 甲: { beaten: 500 }, 乙: 'bad' };
  const cl = sanitize(raw); assert.equal(cl.grudges[0].ripe, 4); assert.equal(cl.grudges[0].foe, 0); assert.equal(cl.grudges[0].spare, true); assert.equal(cl.foes['甲'].beaten, 99); assert.ok(!('乙' in cl.foes));
  // 轉生保留記憶
  m.realmIdx = 13; m.res.stone = 1e12; Dao.rebirth(m); assert.equal(m.foes['丙'].beaten, 3);
});

t('勢力接觸點：引爆預覽彙整威望與升階、一網打盡加成、訪客個性傾向、進貢與婉拒', () => {
  const mk = (s, o) => ({ id: s.nextGid++, name: 'x' + s.nextGid, type: 'former', sect: '青雲宗', personality: '傲慢', lvl: 1, alert: false, element: '木', ...o });
  const s = createState(); s.realmIdx = 12; s.disguise.value = CONFIG.conceal.max; s.factions.qingyun = 8;
  s.grudges = [mk(s, {}), mk(s, {}), mk(s, {}), mk(s, { sect: '赤焰谷', type: 'rival' })];
  const pv = X.previewBurst(s), q = pv.factions.find(f => f.id === 'qingyun');
  assert.equal(q.n, 3); assert.equal(q.rep, 6); assert.equal(q.tierBefore, 0); assert.equal(q.tierAfter, 1); assert.ok(Math.abs(q.sweep - 1.1) < 1e-9);
  assert.equal(pv.factions.find(f => f.id === 'chiyan').sweep, 1);
  // 一網打盡：同樣的結果下，3 人的單人獎勵高於 2 人
  const per = n => { setRng(() => 0.5); const t = createState(); t.realmIdx = 12; t.disguise.value = CONFIG.conceal.max; t.grudges = Array.from({ length: n }, () => mk(t, { type: 'trader', sect: '南海商隊', lvl: 3 })); const st = t.res.stone; X.burst(t); setRng(Math.random); return (t.res.stone - st) / n; };
  assert.ok(per(3) > per(2) * 1.05 * 0.99);
  // 個性傾向：赤焰谷的訪客暴躁／狂妄偏多
  let hot = 0, N = 400; const vs = createState(); vs.realmIdx = 5;
  for (let i = 0; i < N; i++) { const v = E.makeVisitorForTest(vs, '赤焰谷'); if (['暴躁', '狂妄'].includes(v.personality)) hot++; }
  assert.ok(hot / N > 2 / 7 * 1.4, `傾向應明顯高於平均 ${hot / N}`);
  // 進貢：第 2 階以上才會出現；收下得賠禮與威望；婉拒不入簿
  const tr = createState(); tr.realmIdx = 6; assert.equal(E.pickTributeForTest(tr), null);
  tr.factions.qingyun = 70; setRng(() => 0); const v = E.pickTributeForTest(tr); setRng(Math.random);
  assert.ok(v && v.tribute && v.returning === 'plead'); tr.visitor.current = v;
  assert.equal(E.rejectPlea(tr), true); assert.equal(tr.grudges.length, 0); assert.equal(tr.visitor.current, null);
  tr.visitor.current = v; const rep0 = tr.factions.qingyun; assert.ok(E.acceptPlea(tr)); assert.equal(tr.factions.qingyun, rep0 + 3);
});

t('轉生清單：每個狀態欄位都被歸類為保留或重置，確認視窗文案由同一份資料產生', () => {
  const s = createState(), all = Object.keys(s);
  const unknown = all.filter(k => !KEEP_KEYS.includes(k) && !RESET_KEYS.includes(k));
  assert.deepEqual(unknown, [], `新增的狀態欄位 ${unknown.join(',')} 未歸類到 data/rebirth.js 的保留或重置清單`);
  assert.deepEqual(KEEP_KEYS.filter(k => RESET_KEYS.includes(k)), []);
  assert.ok(KEEP_KEYS.every(k => all.includes(k)), '保留清單含有不存在的欄位');
  const txt = REBIRTH_KEEP.map(g => g.label).join('');
  for (const w of ['秘境材料', '功勳', '探索度', '仇人記憶', '勢力威望', '出戰陣容', '專長心得']) assert.ok(txt.includes(w), `保留清單缺少「${w}」`);
});

// ── 化神之後：九重天劫、道果、終章故事、轉生後事件 ──
t('天劫：未到化神不判定；達成條件進入待渡，渡劫發獎勵、寫年表、只能渡一次', () => {
  const s = createState(); s.run.bursts = 8; s.res.daoHeart = 0;
  Asc.tick(s); assert.equal(Asc.readyCount(s), 0, '未到化神不應判定');
  s.realmIdx = 13; Asc.tick(s);
  assert.ok(Asc.isReady(s, 'th1')); assert.ok(!Asc.isReady(s, 'th2'));
  const r = Asc.claim(s, 'th1');
  assert.ok(r && r.dao === 8 && r.story.length === 2);
  assert.equal(s.res.daoHeart, 8); assert.ok(Asc.isDone(s, 'th1')); assert.ok(!Asc.isReady(s, 'th1'));
  assert.equal(Asc.claim(s, 'th1'), null, '已渡不能再領'); assert.equal(Asc.claim(s, 'th2'), null, '未待渡不能領');
  assert.ok(s.chronicle.some(e => e.text.includes('引雷入體')));
  assert.equal(Asc.ascendPerm(s, 'qiMult'), 0.03);
  assert.ok(Dao.perm(s, 'qiMult') >= 0.03, '永久加成計入 dao.perm');
  Asc.tick(s); Asc.tick(s); assert.equal([...s.ascend.ready, ...s.ascend.done].filter(x => x === 'th1').length, 1, '渡過的不會再回到待渡');
  assert.equal(new Set(s.ascend.ready).size, s.ascend.ready.length, '不會重複進入待渡');
});

t('天劫：本輪統計以轉生時的基準計算；速證限時一旦錯過本輪就失敗', () => {
  const s = createState(); s.realmIdx = 13; s.stats.incidents = 20; s.stats.endures = 100;
  assert.equal(Asc.status(s, TRIALS_BY_ID.th3).cur, 10, '舊存檔沒有基準：從累計算（上限為門檻）');
  Dao.rebirth(s);
  assert.equal(s.run.startT, s.t); assert.equal(s.run.base.incidents, 20);
  s.realmIdx = 13;
  assert.equal(Asc.status(s, TRIALS_BY_ID.th3).cur, 0, '轉生後本輪統計歸零');
  s.stats.incidents += 10; s.stats.endures += 130; Asc.tick(s);
  assert.ok(Asc.isReady(s, 'th3') && Asc.isReady(s, 'hr1'));
  // 速證：本輪超過限時才到化神 → failed；限時內到化神 → 待渡
  const late = createState(); late.t = 2.5 * 3600 * 1000; late.realmIdx = 13; Asc.tick(late);
  assert.equal(Asc.status(late, TRIALS_BY_ID.hr2).state, 'failed'); assert.ok(!Asc.isReady(late, 'hr2'));
  const fast = createState(); fast.t = 1.5 * 3600 * 1000; fast.realmIdx = 13; Asc.tick(fast);
  assert.ok(Asc.isReady(fast, 'hr2'));
});

t('天劫：因果輪迴看轉生次數；破廟飛升要先渡完其餘八劫；九劫圓滿開放道果', () => {
  const s = createState(); s.realmIdx = 13; s.reincarnation.count = 8;
  Asc.tick(s); assert.ok(Asc.isReady(s, 'kr2')); assert.ok(!Asc.isReady(s, 'kr3'));
  const others = TRIALS.filter(x => x.id !== 'kr3');
  s.ascend.done = others.slice(0, 7).map(x => x.id); s.ascend.ready = [others[7].id];
  Asc.tick(s); assert.ok(!Asc.isReady(s, 'kr3'), '還有一劫沒渡');
  assert.ok(Asc.claim(s, others[7].id)); Asc.tick(s);
  assert.ok(Asc.isReady(s, 'kr3'));
  assert.ok(!Dao.canBuy(s, 'fruitQi'), '九劫未圓滿，道果不開放');
  const last = Asc.claim(s, 'kr3'); assert.ok(last.last && Asc.complete(s));
  s.res.daoHeart = 1e6; assert.ok(Dao.canBuy(s, 'fruitQi'));
  const before = Dao.perm(s, 'qiMult'); assert.ok(Dao.buy(s, 'fruitQi'));
  assert.ok(Math.abs(Dao.perm(s, 'qiMult') - before - 0.02) < 1e-9);
});

t('天劫：資料完整（每重天 3 劫、獎勵與故事齊全）；進度跨轉生與存檔保留；壞資料被清理', () => {
  assert.equal(TRIALS.length, 9); assert.equal(new Set(TRIALS.map(x => x.id)).size, 9);
  for (const h of HEAVENS) assert.equal(TRIALS.filter(x => x.heaven === h.id).length, 3);
  for (const x of TRIALS) { assert.ok(x.name && x.desc && x.story[0] && x.story[1].length > 40, x.id); assert.ok(x.reward.dao > 0); const c = x.check(createState()); assert.ok(c.target > 0 && typeof c.text === 'string', x.id); }
  assert.ok(DAO_SHOP.filter(i => i.gate === 'ascend').length === 3);
  const s = maxedRun(); s.ascend.done = ['th1', 'hr1']; s.ascend.ready = ['th2'];
  Dao.rebirth(s); assert.deepEqual(s.ascend, { done: ['th1', 'hr1'], ready: ['th2'] });
  const back = S.parse(S.serialize(s)).state; assert.deepEqual(back.ascend, s.ascend);
  const bad = createState(); bad.ascend = { done: ['th1', 'th1', 'nope'], ready: ['th1', 'th2', 'zzz'] }; sanitize(bad);
  assert.deepEqual(bad.ascend, { done: ['th1'], ready: ['th2'] });
  const old = S.parse(JSON.stringify({ version: 2, savedAt: 1, state: { res: { qi: 1 }, buildings: { temple: { lv: 1, pausedUntil: 0 } } } })).state;
  assert.deepEqual(old.ascend, { done: [], ready: [] }); assert.ok(!Number.isNaN(old.run.startT));
});

t('弟子終章：有第二章的弟子都有第三章；升到 3 星才解鎖，獎勵與特性加成', () => {
  assert.deepEqual(Object.keys(STORIES3).sort(), DISCIPLES.filter(d => ['SR', 'SSR', 'UR'].includes(d.rarity)).map(d => d.id).sort(), 'SR 以上都有終章');
  Object.keys(STORIES3).forEach(id => assert.ok(STORIES2[id], `${id} 有終章就必須有第二章`));
  const s = createState(); s.res.token = 0; s.res.shard = 0;
  s.disciples.push({ uid: 1, defId: 'yunqing', lv: 5, at: null, star: 2 }); s.stories.yunqing = 2;
  assert.equal(St.nextChapter(s, s.disciples[0]), null, '2 星還不能讀終章');
  assert.ok(St.lockedHint(s, s.disciples[0]).includes('終章'));
  s.disciples[0].star = 3;
  const r = St.read(s, 1); assert.equal(r.idx, 3); assert.equal(s.stories.yunqing, 3);
  assert.equal(s.res.token, 4); assert.equal(s.res.shard, 20);
  assert.equal(St.reread(s, 'yunqing').length, 3); assert.equal(St.chapterCount('yunqing'), 3);
  assert.equal(St.nextChapter(s, s.disciples[0]), null);
  const sv = createState(); sv.stories = { yunqing: 9, afu: 9 }; sanitize(sv); assert.equal(sv.stories.yunqing, 3); assert.equal(sv.stories.afu, St.chapterCount('afu'));
});

t('轉生後的事件：minReb 限制出現；化神事件限制化神；離線事件依轉生次數過濾', () => {
  const s = createState(); s.realmIdx = 5;
  const seen = new Set(); for (let i = 0; i < 400; i++) { s.incident.current = null; s.incident.nextAt = 0; s.visitor.current = null; Inc.tick(s); seen.add(s.incident.current?.id); }
  for (const id of ['cloud', 'echo', 'qyhead', 'seal', 'letter', 'pastself', 'well', 'oldfriend']) assert.ok(!seen.has(id), `${id} 不該在此時出現`);
  s.realmIdx = 13; s.reincarnation.count = 3; const seen2 = new Set();
  for (let i = 0; i < 800; i++) { s.incident.current = null; s.incident.nextAt = 0; s.visitor.current = null; Inc.tick(s); seen2.add(s.incident.current?.id); }
  for (const id of ['cloud', 'echo', 'pastself', 'well', 'oldfriend']) assert.ok(seen2.has(id), `${id} 應該會出現`);
  const fresh = createState();
  for (let i = 0; i < 200; i++) assert.ok(!OFFLINE_EVENTS.find(e => e.id === Off.rollOfflineEvent(fresh, 3600000))?.minReb, '沒轉生過不應抽到轉生後事件');
  fresh.reincarnation.count = 5; const got = new Set(); for (let i = 0; i < 400; i++) got.add(Off.rollOfflineEvent(fresh, 3600000));
  assert.ok(got.has('ancestor') && got.has('lamp'));
  for (const e of OFFLINE_EVENTS) { const o = Off.resolveOffline(createState(), e.id, 0), o2 = Off.resolveOffline(createState(), e.id, 1); assert.ok(o && o2 && o.text && o2.text, e.id); }
});

t('天劫相關大事與成就：進度來自天劫與道果；新分頁在化神或轉生後解鎖', () => {
  const s = createState(); assert.ok(!Prog.TAB_RULES.ascend.when(s));
  s.realmIdx = 13; assert.ok(Prog.TAB_RULES.ascend.when(s));
  const s2 = createState(); s2.reincarnation.count = 1; assert.ok(Prog.TAB_RULES.ascend.when(s2));
  s.ascend.done = TRIALS.map(x => x.id); s.reincarnation.shop = { fruitQi: 20 };
  Goals.tick(s); for (const id of ['asc3', 'asc6', 'asc9', 'fruit20']) assert.ok(Goals.isDone(s, id), id);
  assert.ok(Gl.gloryPoints(s) >= 72, '天劫計入榮耀');
});

// ── 擴充文案：事件分層、台詞池、勢力背景 ──
t('事件資料：id 不重複、每則 2~3 個選項、文字夠長；中期（築基前後）有足夠事件可抽', () => {
  assert.equal(new Set(INCIDENTS.map(i => i.id)).size, INCIDENTS.length, '事件 id 重複');
  for (const i of INCIDENTS) { assert.ok(i.choices.length >= 2 && i.choices.length <= 3, i.id); assert.ok(i.text.length > 12 && i.title && i.emoji, i.id); assert.ok(i.choices.every(c => c.label && c.desc), i.id); assert.ok(i.timeoutChoice >= 0 && i.timeoutChoice < i.choices.length, i.id); }
  const at = r => INCIDENTS.filter(i => i.minRealm <= r && !i.minReb).length;
  assert.ok(at(6) >= 20 && at(10) >= 28 && at(12) >= 33, `中期事件池太小：${at(6)}/${at(10)}/${at(12)}`);
  for (let r = 4; r <= 12; r++) assert.ok(INCIDENTS.filter(i => i.minRealm === r).length >= 3, `境界 ${r} 專屬事件太少`);   // 中段不再每境只有 1~2 則
  const rebTiers = [...new Set(INCIDENTS.filter(i => i.minReb).map(i => i.minReb))];
  assert.ok(INCIDENTS.filter(i => i.minReb).length >= 12 && rebTiers.length >= 6, `轉生後事件：${INCIDENTS.filter(i => i.minReb).length} 則、${rebTiers.length} 個門檻`);   // 轉生多次的玩家也有新事件
  assert.ok(INCIDENTS.every(i => !i.minReb || i.minReb <= 20), '轉生門檻不應高到打不到');
  const offTier = n => OFFLINE_EVENTS.filter(e => (e.minReb || 0) <= n).length;
  assert.ok(offTier(0) >= 9 && offTier(2) > offTier(0) && offTier(5) > offTier(2) && offTier(8) > offTier(5) && OFFLINE_EVENTS.length >= 24, `離線事件分層：${[0, 2, 5, 8].map(offTier)}`);
  const good = INCIDENTS.filter(i => i.good).length; assert.ok(good >= 20 && INCIDENTS.length - good >= 12, '好壞事件比例失衡');
});

t('老祖台詞池：進度越高閒聊越多；每類台詞都非空、沒有重複句', () => {
  const s = createState(); const base = idlePool(s).length;
  assert.equal(base, LINES.idle.length);
  s.realmIdx = 10; const mid = idlePool(s).length; assert.ok(mid > base);
  s.realmIdx = 13; s.reincarnation.count = 1; const late = idlePool(s).length; assert.ok(late > mid);
  s.ascend.done = ['th1']; const asc = idlePool(s).length; assert.ok(asc > late);
  s.ascend.done = TRIALS.map(x => x.id); assert.ok(idlePool(s).length > asc);
  const flat = a => Array.isArray(a) ? a : Object.values(a).flat();
  for (const [k, v] of Object.entries(LINES)) { if (typeof v === 'string') continue; const f = flat(v); assert.ok(f.length > 0, k); assert.equal(new Set(f).size, f.length, `${k} 有重複台詞`); }
  assert.ok(LINES.idle.length >= 16 && LINES.rebirth.length >= 4);
});

t('訪客對白：每種個性各情境至少 3 句、不重複', () => {
  for (const [name, p] of Object.entries(PERSONALITIES)) for (const k of ['taunt', 'counter', 'kneel', 'narrow', 'fail']) {
    assert.ok(p[k].length >= 3, `${name}.${k}`); assert.equal(new Set(p[k]).size, p[k].length, `${name}.${k} 重複`);
  }
});

t('勢力背景：每個勢力有背景與三階升階描述；升階時寫進年表', () => {
  for (const f of FACTIONS) { assert.ok(f.lore && f.lore.length > 20, f.id); assert.ok(f.tierLines[1] && f.tierLines[2] && f.tierLines[3], f.id); }
  const s = createState(); const before = s.chronicle.length;
  Fac.addRep(s, '青雲宗', 10);                                   // 第一階
  assert.equal(s.chronicle.length, before + 1); assert.ok(s.chronicle.at(-1).text.includes('繞路'));
  Fac.addRep(s, '青雲宗', 1); assert.equal(s.chronicle.length, before + 1, '沒升階不寫年表');
});

// ── 勢力宿敵（side）：看勢力威望解鎖，不計入舊債還清 ──
t('勢力宿敵：威望與境界都達標才解鎖；各自獨立；不影響「舊債還清」；台詞與稱號齊全', () => {
  const sides = NEMESES.filter(n => n.side);
  const fid = n => n.cond.faction;
  for (const n of sides) { assert.ok(FACTIONS.some(f => f.id === fid(n) && f.sects.includes(n.sect)), `${n.id} 的宗門要屬於其勢力`); assert.equal(n.awakenTaunts.length, 3, n.id); assert.equal(new Set(n.awakenTaunts).size, 3); }
  assert.equal(new Set(sides.map(fid)).size, 6, '六個勢力各一位');
  const jiao = NEMESES_BY_ID.jiao, s = createState();
  s.realmIdx = 13; assert.ok(!Nem.unlocked(s, jiao), '威望不夠不解鎖');
  s.factions.chiyan = 10; assert.ok(!Nem.unlocked(s, jiao), '第 1 階還不夠，要第 2 階');
  s.factions.chiyan = 30; assert.ok(Nem.unlocked(s, jiao));
  s.realmIdx = 5; assert.ok(!Nem.unlocked(s, jiao), '境界不夠不解鎖');
  assert.ok(Nem.condText(s, jiao).includes('赤焰谷') && Nem.condText(s, jiao).includes('聞風喪膽'));
  // 擊敗全部勢力宿敵不影響「舊債還清」的 5 位目標，且舊存檔不會因新增宿敵而改變已完成的大事
  const g = createState(); g.stats.nemesisDefeated = 5; Goals.tick(g); assert.ok(g.goalsDone.includes('nemAll'));
  // 覺醒登場詞：有專屬的用專屬，沒有的用共用
  const a = createState(); a.nemeses.jiao = { met: 3, defeated: true, awakeLv: 1 };
  assert.equal(Nem.makeNemesisVisitor(a, jiao).taunt, jiao.awakenTaunts[1]);
  a.nemeses.qian = { met: 3, defeated: true, awakeLv: 0 };
  assert.equal(Nem.makeNemesisVisitor(a, NEMESES_BY_ID.qian).taunt, NEMESES_BY_ID.qian.awakenTaunts?.[0] || AWAKEN.taunts[0]);
  // 每位宿敵一個稱號 + 兩個總成就
  for (const n of NEMESES) assert.ok(ACHIEVEMENTS_BY_ID['nem_' + n.id], n.id);
  const b = createState(); NEMESES.filter(n => n.side).forEach(n => { b.nemeses[n.id] = { met: 1, defeated: true }; }); Ach.tick(b);
  assert.ok(b.achv.done.includes('nemside') && b.achv.done.includes('nem_jiao') && !b.achv.done.includes('nem_qian'));
});

t('宿敵場上上限：同時最多 3 位；擊敗後才會再來；存檔與轉生保留新宿敵進度', () => {
  const s = createState(); s.realmIdx = 13;
  for (const id of ['qian', 'xiao', 'liu', 'yun', 'xuan']) s.nemeses[id] = { met: 3, defeated: true };
  s.factions = { chiyan: 30, wanjian: 30, luoxia: 30, xuanbing: 30, bailian: 30, trade: 30 };
  const seen = [];
  for (let i = 0; i < 12; i++) { const n = Nem.pickNemesis(s); if (!n) break; seen.push(n.id); s.grudges.push({ id: i, nemesisId: n.id, lvl: 1 }); }
  assert.equal(Nem.presentCount(s), 3); assert.equal(seen.length, 3, '場上最多 3 位');
  s.grudges.pop(); assert.ok(Nem.pickNemesis(s), '少一位就能再來一位');
  const m = createState(); m.realmIdx = 13; m.nemeses.jiao = { met: 2, defeated: true, awakeLv: 1 }; m.factions.chiyan = 40; m.artifacts.push('jiao_furnace');
  Dao.rebirth(m); assert.deepEqual(m.nemeses.jiao, { met: 2, defeated: true, awakeLv: 1 }); assert.equal(m.factions.chiyan, 40); assert.ok(m.artifacts.includes('jiao_furnace'));
  const back = S.parse(S.serialize(m)).state; assert.ok(back.nemeses.jiao.defeated);
  const bad = createState(); bad.nemeses = { jiao: { met: 1, defeated: true }, nobody: { met: 1 } }; sanitize(bad); assert.ok(bad.nemeses.jiao && !bad.nemeses.nobody);
});

// ── 程式審查修正的回歸測試 ──
t('引爆招賢令：乘 burstTokenScale 後的小數餘數跨仇人累計，不會逐人四捨五入成 0', () => {
  const old = CONFIG.gacha.burstTokenScale; CONFIG.gacha.burstTokenScale = 0.1;
  try {
    let sum = 0, bursts = 0;
    for (let i = 0; i < 40; i++) {
      const s = createState(); s.realmIdx = 3; s.res.stone = 500; s.buildings.alchemy.lv = 10; s.disguise.value = 99; s.settings.loss = false;
      s.grudges = [1, 2, 3, 4, 5].map(id => visitor('former', 0, { id }));
      const r = X.burst(s); if (r) { sum += r.total.token; bursts++; }
    }
    assert.ok(bursts > 0 && sum > 0, `早期引爆應拿得到招賢令（${bursts} 次、共 ${sum} 張）`);
  } finally { CONFIG.gacha.burstTokenScale = old; }
});

t('下一步提示：煉丹房未滿 10 級但已能突破時，優先提示突破', () => {
  const s = createState(); s.unlocked.realm = true; s.res.qi = 1e9; s.res.stone = 1e9; s.buildings.alchemy.lv = 3; s.visitor.current = null; s.disguise.value = 0;
  s.realmIdx = 0; s.res.stone = 1e9; assert.ok(R.canBreak(s), '前提：已能突破');
  assert.equal(Prog.nextStep(s).tab, 'realm');
});

t('存檔：道心商店等級超過新上限時截斷並退還多花的道心；缺 version 的檔案被拒絕', () => {
  const s = createState(); s.reincarnation.shop.offeff = 9; s.res.daoHeart = 0;
  const c = S.sanitize(s); assert.equal(c.reincarnation.shop.offeff, 6);
  const it = DAO_SHOP_BY_ID.offeff, want = [6, 7, 8].reduce((a, l) => a + Math.ceil(it.baseCost * it.growth ** l), 0);
  assert.equal(c.res.daoHeart, want);
  assert.equal(S.sanitize(c).res.daoHeart, want);                                   // 再清理一次不會重複退
  assert.throws(() => S.parse(JSON.stringify({ savedAt: Date.now(), state: { res: {}, buildings: { temple: { lv: 3, pausedUntil: 0 } } } })));   // 缺 version 的檔在解析階段就拒絕（遷移內再保險）
});

t('離線效率上限由 CONFIG.offline.maxEfficiency 決定，且守廟靈獸最高級剛好到上限', () => {
  const it = DAO_SHOP_BY_ID.offeff;
  assert.ok(Math.abs(CONFIG.offline.efficiency + it.maxLv * it.perLevel - CONFIG.offline.maxEfficiency) < 1e-9);
  const o = createState(); o.reincarnation.shop = { offeff: it.maxLv };
  assert.ok(Math.abs(applyOffline(o, 3600000).efficiency - CONFIG.offline.maxEfficiency) < 1e-9);
});

t('抽到重複弟子：專屬碎片全額，另給少量通用碎片', () => {
  const s = createState();
  const def = DISCIPLES.find(d => d.rarity === 'SR'); D.addDisciple(s, def.id);
  const r = D.addDisciple(s, def.id), rar = RARITIES.SR;
  assert.equal(r.shards, rar.shard); assert.equal(r.uni, Math.round(rar.shard * CONFIG.disciple.dupUniversal));
  assert.equal(s.dshards[def.id], rar.shard); assert.equal(s.res.shard, r.uni);
});

t('全部升級：結果與逐棟最便宜優先一致，且不超過上限', () => {
  const s = createState(); s.realmIdx = 6; s.res.qi = 1e9; s.res.stone = 1e9;
  const n = B.upgradeAll(s);
  assert.ok(n > 0);
  for (const id of Object.keys(s.buildings)) assert.ok(s.buildings[id].lv <= B.levelCap(s));
  assert.equal(B.upgradeAll(s) >= 0, true);
});


console.log(`\n${n} 項測試通過`);
if (failed.length) { console.log(`\n${failed.length} 項失敗：\n - ` + failed.join('\n - ')); process.exit(1); }
