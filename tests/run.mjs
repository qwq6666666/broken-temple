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

console.log(`\n${n} 項測試通過`);
