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

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ✓', name); };

t('format 大數字', () => {
  assert.equal(fmt(999), '999'); assert.equal(fmt(1500), '1.5K');
  assert.equal(fmt(2.5e6), '2.5M'); assert.equal(fmt(3e9), '3B'); assert.equal(fmt(4e12), '4T'); assert.equal(fmt(5e15), '5Qa');
  assert.equal(fmt(999999), '1M');
});

t('建築成本 = 基礎 × 1.15^等級，且封頂 10 級', () => {
  const s = createState();
  assert.equal(B.upgradeCost(s, 'field').qi, 150);
  s.buildings.field.lv = 3;
  assert.equal(B.upgradeCost(s, 'field').qi, Math.floor(150 * 1.15 ** 3));
  s.buildings.field.lv = 10; s.res.qi = 1e9;
  assert.equal(B.upgrade(s, 'field'), false);
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

t('忍／亮一手：偽裝值、損失開關、警覺', () => {
  const s = createState(); s.res.stone = 100;
  s.t = 1e6; E.tick(s); assert.ok(s.visitor.current);
  E.endure(s);
  assert.equal(s.disguise.value, 1); assert.equal(s.grudges.length, 1);
  assert.ok(s.res.stone < 100 || Object.values(s.buildings).some(b => b.pausedUntil > s.t));
  // 關閉損失
  s.settings.loss = false; s.res.stone = 100; s.t += 1e6; E.tick(s);
  E.endure(s); assert.equal(s.res.stone, 100);
  // 亮一手
  s.t += 1e6; E.tick(s); const before = s.disguise.value;
  E.showOff(s); assert.equal(s.disguise.value, before); assert.equal(s.grudges.at(-1).alert, true);
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

console.log(`\n${n} 項測試通過`);
