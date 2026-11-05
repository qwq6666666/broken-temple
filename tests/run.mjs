// 核心邏輯測試：node tests/run.mjs （不需任何框架）
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
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
import { SPECS, specText } from '../src/data/specs.js';
import { STORIES, STORIES2 } from '../src/data/stories.js';
import { BONDS } from '../src/data/bonds.js';
import { DISCIPLES, DISCIPLES_BY_ID } from '../src/data/disciples.js';
import * as Prog from '../src/core/progress.js';
import { stepParticle, moteCount } from '../src/ui/particles.js';
import { drawBuilding, POS, DRAW_ORDER, BACKDROP } from '../src/ui/sceneArt.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { topRarity, playPull } from '../src/ui/pullFx.js';
import { bus } from '../src/core/events.js';
import { NEMESES, NEMESES_BY_ID } from '../src/data/nemeses.js';
import { ARTIFACTS_BY_ID } from '../src/data/artifacts.js';
import { GOALS_BY_ID } from '../src/data/goals.js';
import { INCIDENTS_BY_ID } from '../src/data/incidents.js';
import { sfx, unlock, applyVolume, SFX_NAMES } from '../src/ui/audio.js';
import { getPrefs, setPref } from '../src/ui/prefs.js';
import { stat, traitValue } from '../src/core/discipleMath.js';
import * as S from '../src/core/save.js';
import { applyOffline } from '../src/core/offline.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ✓', name); };

t('format 大數字', () => {
  assert.equal(fmt(999), '999'); assert.equal(fmt(1500), '1.5K');
  assert.equal(fmt(2.5e6), '2.5M'); assert.equal(fmt(3e9), '3B'); assert.equal(fmt(4e12), '4T'); assert.equal(fmt(5e15), '5Qa');
  assert.equal(fmt(999999), '1M');
});

t('建築成本 = 基礎 × 1.15^等級 × 解鎖所需境界倍率，且封頂 10 級', () => {
  const s = createState();
  assert.equal(B.upgradeCost(s, 'field').qi, 60);            // 1 級：需境界 0（倍率 1）
  s.buildings.field.lv = 1;                                  // 升 2 級需煉氣二層（倍率 1.35^2）
  assert.equal(B.upgradeCost(s, 'field').qi, Math.floor(60 * 1.15 * 1.35 ** 2));
  s.buildings.field.lv = 10; s.realmIdx = 13; s.res.qi = 1e12;
  assert.equal(B.upgrade(s, 'field'), false);
});

t('建築等級受境界限制', () => {
  const s = createState(); s.res.qi = 1e12;
  assert.equal(B.levelCap(s), 1);
  assert.equal(B.upgrade(s, 'temple'), false);               // 破廟已 1 級，凡人上限 1
  s.realmIdx = 2; assert.equal(B.levelCap(s), 2);
  assert.equal(B.upgrade(s, 'temple'), true);
  assert.equal(B.upgrade(s, 'temple'), false);               // 再升需更高境界
  s.realmIdx = 13; assert.equal(B.levelCap(s), 10);
  assert.equal(B.realmNeededFor(10), 13); assert.equal(B.realmNeededFor(1), 0);
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
  const s = createState(); s.buildings.field.lv = 5; s.realmIdx = 6;
  assert.ok(Math.abs(eco.clickPower(s) - Math.max(
    (CONFIG.click.base + s.buildings.temple.lv * CONFIG.click.perTempleLevel) * eco.realmOf(s).mult,
    eco.qiPerSec(s) * CONFIG.click.productionSec)) < 1e-9);
});

t('tick：產出與 dt 線性（一次大 tick = 多次小 tick）', () => {
  const a = createState(), b = createState();
  a.buildings.field.lv = 2; b.buildings.field.lv = 2;
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

t('重複弟子轉碎片', () => {
  const s = createState();
  D.addDisciple(s, 'afu');
  const r = D.addDisciple(s, 'afu');
  assert.equal(r.isNew, false); assert.ok(s.res.shard >= 1);
  assert.equal(s.disciples.length, 1);
});

t('專長匹配 ×2：農修派駐靈田 > 體修派駐靈田', () => {
  const s = createState(); s.buildings.field.lv = 1;
  D.addDisciple(s, 'afu'); D.addDisciple(s, 'liuzi');
  const [a, b] = s.disciples;
  D.assign(s, a.uid, 'field'); const m1 = eco.buildingMult(s, 'field');
  D.assign(s, a.uid, null); D.assign(s, b.uid, 'field'); const m2 = eco.buildingMult(s, 'field');
  assert.ok(m1 > m2);
});

t('駐守位限制', () => {
  const s = createState(); s.buildings.field.lv = 1;
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
  const s = withVisitor(createState(), visitor('trader', 0)); s.realmIdx = 6; s.buildings.alchemy.lv = 2;
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
  const s = withVisitor(createState(), visitor('former', 9)); s.res.stone = 100; s.buildings.alchemy.lv = 1;
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
    const s = createState(); s.realmIdx = 1; s.res.stone = 500; s.buildings.alchemy.lv = 1; s.disguise.value = 99;
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
  s.res.qi = 12345.5; s.realmIdx = 4; s.buildings.field.lv = 3; s.burstActive = true;
  D.addDisciple(s, 'afu'); s.artifacts.push('yinqi');
  assert.equal(S.save(s, st), true);
  const r = S.load(st);
  assert.equal(r.state.res.qi, 12345.5); assert.equal(r.state.realmIdx, 4);
  assert.equal(r.state.buildings.field.lv, 3); assert.equal(r.state.disciples.length, 1);
  assert.deepEqual(r.state.artifacts, ['yinqi']); assert.equal(r.state.burstActive, false);
});

t('舊存檔缺欄位會以預設值補齊', () => {
  const text = JSON.stringify({ version: 1, savedAt: Date.now(), state: { res: { qi: 5 }, buildings: { temple: { lv: 2, pausedUntil: 0 } } } });
  const { state } = S.parse(text);
  assert.equal(state.res.qi, 5); assert.equal(state.res.token, CONFIG.start.token);
  assert.equal(state.buildings.temple.lv, 2); assert.equal(state.buildings.arena.lv, 0);
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
  const s = createState(); s.buildings.field.lv = 2;
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
  s.buildings.field.lv = 1; s.buildings.field.pausedUntil = s.t + 5 * 60000;
  const r = applyOffline(s, 2 * 3600 * 1000);
  assert.ok(r.disguiseGain > 0); assert.ok(r.chargeMinutes >= 119);
  assert.ok(s.grudges[0].lvl > 1.0);
  assert.ok(s.t >= s.buildings.field.pausedUntil);
});

// 取得弟子並派駐到 bid（測試用，會自動蓋好建築）
const crew = (s, defId, bid) => { s.buildings[bid].lv = Math.max(1, s.buildings[bid].lv); const { disciple } = D.addDisciple(s, defId); D.assign(s, disciple.uid, bid); return disciple; };

t('特性只在派駐時生效（戰力）', () => {
  const s = createState(); s.buildings.arena.lv = 1;
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
    const s = createState(); s.res.stone = 1000; s.buildings.alchemy.lv = 5; s.realmIdx = 6;
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
    const s = createState(); s.realmIdx = 6; s.buildings.field.lv = 3;
    if (withCrew) crew(s, 'shenyao', 'alchemy');             // 毒舌：亮一手 +35%
    withVisitor(s, visitor('trader', 0)); const q = s.res.qi; E.showOff(s); return s.res.qi - q;
  };
  assert.ok(win(true) > win(false));
  const sp = createState(); sp.buildings.alchemy.lv = 1; const s0 = eco.stonePerSec(sp);
  crew(sp, 'ludan', 'alchemy'); assert.ok(eco.stonePerSec(sp) > s0);
  const br = withCrew => { const s = createState(); s.realmIdx = 8; s.disguise.value = 99; if (withCrew) crew(s, 'jiuli', 'temple'); s.grudges = [visitor('trader', 0, { id: 1 })]; setRng(() => 0.5); const r = X.burst(s).total.qi; setRng(Math.random); return r; };
  assert.ok(br(true) > br(false));
});

t('升星：花碎片，屬性與特性 +25%、等級上限 +2，滿星為止', () => {
  const s = createState(); s.res.shard = 1000;
  const d = D.addDisciple(s, 'afu').disciple;
  const st0 = stat(d), tv0 = traitValue(d), cap0 = D.levelCapOf(s, d);
  assert.deepEqual(D.starCost(d), { shard: 5 });
  assert.equal(D.starUp(s, d.uid), true);
  assert.equal(s.res.shard, 995); assert.equal(d.star, 1);
  assert.ok(Math.abs(stat(d) / st0 - 1.25) < 1e-9 && Math.abs(traitValue(d) / tv0 - 1.25) < 1e-9);
  assert.equal(D.levelCapOf(s, d), cap0 + 2);
  D.starUp(s, d.uid); D.starUp(s, d.uid);
  assert.equal(d.star, 3); assert.equal(D.starCost(d), null); assert.equal(D.starUp(s, d.uid), false);
  const old = { uid: 9, defId: 'afu', lv: 1, at: null };       // 舊存檔沒有 star
  assert.equal(stat(old), 1);
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
  const s = forceIncident(createState(), 'caravan'); s.buildings.alchemy.lv = 1; s.res.stone = 0;
  assert.equal(Inc.canChoose(s, 0), false); assert.equal(Inc.resolve(s, 0), null);
  s.res.stone = 100; assert.equal(Inc.canChoose(s, 0), true);
  const st = forceIncident(createState(), 'storm');
  assert.equal(Inc.canChoose(st, 0), false); assert.equal(Inc.canChoose(st, 1), true);
  st.buildings.array.lv = 1; assert.equal(Inc.canChoose(st, 0), true);
});

t('事件：賭局依機率分勝敗（確定性 rng）', () => {
  const run = r => { setRng(() => r); const s = forceIncident(createState(), 'fortune'); s.buildings.field.lv = 2; const q = s.res.qi; Inc.resolve(s, 1); setRng(Math.random); return { s, gained: s.res.qi - q }; };
  const win = run(0.1), lose = run(0.9);
  assert.ok(win.gained > 0);
  assert.ok(Object.values(lose.s.buildings).some(b => b.pausedUntil > lose.s.t));      // 失敗：建築暫停
});

t('事件：效果結算（資源、碎片、偽裝、招賢令、降服、法寶）', () => {
  setRng(() => 0);                                       // 機率類全中
  const s = createState(); s.buildings.field.lv = 3;
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
  const loss = lv => { const s = forceIncident(createState(), 'storm'); s.buildings.field.lv = 3; s.buildings.array.lv = lv; s.res.qi = 1e6; Inc.resolve(s, 1); return 1e6 - s.res.qi; };
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
  s.res.qi = 1e9; s.res.stone = 1e5; s.res.shard = 77; s.buildings.field.lv = 5;
  const d = D.addDisciple(s, 'xuantian').disciple; d.lv = 9; d.star = 2; D.assign(s, d.uid, 'temple');
  s.artifacts.push('yinqi'); s.goalsDone.push('burst1'); s.nemeses.qian = { met: 2, defeated: true };
  s.gacha.sinceSR = 33; s.grudges = [visitor('former', 1)]; s.disguise.value = 15; s.stats.bursts = 40;
  const gain = Dao.rebirth(s);
  assert.equal(gain, Dao.daoGain({ ...maxedRun() }));
  // 重置
  assert.equal(s.realmIdx, 0); assert.equal(s.buildings.field.lv, 0); assert.equal(s.buildings.temple.lv, CONFIG.start.templeLevel);
  assert.equal(s.res.qi, CONFIG.start.qi); assert.equal(s.grudges.length, 0); assert.equal(s.disguise.value, 0);
  assert.deepEqual(s.run, { bursts: 0, maxChain: 0, nemeses: 0, goals: 0 });
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
  eco.tick(a, 90000); eco.tick(b, 90000); assert.ok(b.res.token > a.res.token);
  const o1 = createState(), o2 = createState(); o2.reincarnation.shop = { offcap: 2, offeff: 4 };
  assert.equal(applyOffline(o2, 100 * 3600000).usedMs, CONFIG.offline.capMs + 2 * 3600000);
  assert.ok(applyOffline(o2, 3600000).efficiency > applyOffline(o1, 3600000).efficiency);
  const r = maxedRun(); r.reincarnation.shop = { startS: 2, startT: 3 }; Dao.rebirth(r);
  assert.equal(r.res.stone, CONFIG.start.stone + 30); assert.equal(r.res.token, CONFIG.start.token + 3);
});

t('存檔 v1 → v2：舊檔可讀並補上轉生欄位', () => {
  const old = { version: 1, savedAt: Date.now(), state: { res: { qi: 9 }, buildings: { temple: { lv: 3, pausedUntil: 0 } } } };
  const { state } = S.parse(JSON.stringify(old));
  assert.equal(state.res.qi, 9); assert.equal(state.reincarnation.count, 0); assert.deepEqual(state.run, { bursts: 0, maxChain: 0, nemeses: 0, goals: 0 });
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
  s.buildings.alchemy.lv = 1; s.res.qi = 0; s.res.stone = 0;
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
t('故事資料完整：每位弟子有第一章，SR 以上有第二章', () => {
  for (const d of DISCIPLES) {
    assert.ok(STORIES[d.id] && STORIES[d.id][1].length > 20, `${d.id} 缺第一章`);
    assert.equal(!!STORIES2[d.id], ['SR', 'SSR', 'UR'].includes(d.rarity), `${d.id} 第二章與稀有度不符`);
  }
  for (const b of BONDS) assert.ok(DISCIPLES_BY_ID[b.a] && DISCIPLES_BY_ID[b.b] && b.a !== b.b);
});

t('讀故事：條件、獎勵、特性永久加成、只能讀一次', () => {
  const s = createState(); const d = D.addDisciple(s, 'yunqing').disciple;
  assert.equal(St.nextChapter(s, d), null); assert.match(St.lockedHint(s, d), /Lv5/);
  d.lv = 5; assert.equal(St.nextChapter(s, d).idx, 1);
  s.buildings.alchemy.lv = 1; D.assign(s, d.uid, 'alchemy');
  const before = eco.traitSum(s, 'stoneMult'), tok = s.res.token;
  const r = St.read(s, d.uid); assert.equal(r.idx, 1); assert.ok(s.res.token > tok);
  assert.ok(Math.abs(eco.traitSum(s, 'stoneMult') / before - 1.1) < 1e-9);          // 特性 +10%
  assert.equal(St.read(s, d.uid), null);                                             // 第二章需要升星
  d.star = 1; assert.equal(St.nextChapter(s, d).idx, 2);
  St.read(s, d.uid); assert.equal(s.stories.yunqing, 2); assert.equal(St.nextChapter(s, d), null);
  assert.equal(St.reread(s, 'yunqing').length, 2);
});

t('緣分：同一建築才生效，換棟就失效', () => {
  const s = createState(); s.buildings.temple.lv = 1; s.buildings.field.lv = 1;
  const a = D.addDisciple(s, 'qinwu').disciple, b = D.addDisciple(s, 'lingshuang').disciple;
  assert.equal(Bond.bondStatus(s, BONDS[0]), 'apart');
  D.assign(s, a.uid, 'temple'); D.assign(s, b.uid, 'field'); assert.equal(Bond.bondSum(s, 'power'), 0);
  s.buildings.temple.lv = 4;                                                          // 先擴出第二個駐守位
  D.assign(s, b.uid, 'temple');
  assert.equal(Bond.bondStatus(s, BONDS[0]), 'active'); assert.ok(Math.abs(Bond.bondSum(s, 'power') - 0.04) < 1e-9);
  assert.ok(eco.traitSum(s, 'power') >= 0.04);
  assert.equal(Bond.bondStatus(createState(), BONDS[0]), 'none');
});

t('故事進度跨轉生保留；存檔清理未知弟子的故事', () => {
  const s = maxedRun(); s.stories = { afu: 1 }; Dao.rebirth(s); assert.equal(s.stories.afu, 1);
  const x = loadPatched(st => { st.stories = { gone: 1, afu: 9, yunqing: 'x' }; });
  assert.equal(x.stories.gone, undefined); assert.equal(x.stories.afu, 1); assert.equal(x.stories.yunqing, 0);
});

// ── R11 專精與後期建築 ──
t('後期建築：需達境界才能建造；已建造的不受影響；不計入「全建築」大事', () => {
  const s = createState(); s.res.qi = 1e12; s.res.stone = 1e6; s.realmIdx = 6;
  assert.equal(B.isBuildingUnlocked(s, 'tower'), false); assert.equal(B.upgrade(s, 'tower'), false);
  s.realmIdx = 7; assert.equal(B.isBuildingUnlocked(s, 'tower'), true); assert.equal(B.upgrade(s, 'tower'), true);
  s.realmIdx = 3; assert.equal(B.isBuildingUnlocked(s, 'tower'), true);          // 已建造
  assert.equal(B.isBuildingUnlocked(s, 'hall'), false);
  Object.keys(s.buildings).forEach(id => { s.buildings[id].lv = 3; }); s.buildings.beast.lv = 0;
  assert.equal(GOALS_BY_ID.bld3.cur(s), 3);                                       // 靈獸園沒建也不影響
});

t('鎮魔塔／傳功殿／靈獸園的效果', () => {
  const s = createState();
  const p0 = eco.combatPower(s); s.buildings.tower.lv = 5; assert.ok(Math.abs(eco.combatPower(s) / p0 - 1.30) < 1e-9);
  assert.ok(Math.abs(eco.towerBurst(s) - 0.15) < 1e-9);
  const cap0 = D.levelCap(s), dis0 = eco.discipleDiscount(s); s.buildings.hall.lv = 4;
  assert.equal(D.levelCap(s), cap0 + 4); assert.ok(Math.abs(eco.discipleDiscount(s) - dis0 - 0.08) < 1e-9);
  const r0 = eco.rareChance(s); s.buildings.beast.lv = 5; assert.ok(Math.abs(eco.rareChance(s) - r0 - 0.10) < 1e-9);
  const a = createState(), b = createState(); b.buildings.beast.lv = 10;
  eco.tick(a, 90000); eco.tick(b, 90000); assert.ok(b.res.token > a.res.token);
});

t('專精：升到 Lv5 才能選、二選一、效果生效、轉生後重選', () => {
  const s = createState();
  assert.equal(Sp.canChoose(s, 'alchemy'), false); assert.equal(Sp.choose(s, 'alchemy', 'mass'), false);
  s.buildings.alchemy.lv = 5; assert.equal(Sp.canChoose(s, 'alchemy'), true);
  assert.equal(Sp.choose(s, 'alchemy', 'ghost'), false);                          // 不存在的選項
  const st0 = eco.stonePerSec(s) || 1; s.buildings.alchemy.lv = 5;
  const before = eco.stonePerSec(s);
  assert.equal(Sp.choose(s, 'alchemy', 'mass'), true); assert.equal(Sp.choose(s, 'alchemy', 'fine'), false);   // 不能改選
  assert.ok(Math.abs(eco.stonePerSec(s) / before - 1.25) < 1e-9);                  // 靈石 +25%
  s.buildings.temple.lv = 5; Sp.choose(s, 'temple', 'zen');
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

console.log(`\n${n} 項測試通過`);
