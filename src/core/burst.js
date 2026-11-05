// 爆：偽裝值滿後「不裝了」。逐人判定 → 連鎖加成 → 依類型發獎勵。
// 核心一次算完並套用結果，回傳 result 供 ui 播放演出與結算畫面。
import { CONFIG } from '../config.js';
import { ENEMY_REWARDS, REALM_SCALE, RARE_EXTRA } from '../data/enemies.js';
import { PERSONALITIES } from '../data/visitors.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { LINES, pickLine } from '../data/lines.js';
import { lvlLabel } from '../data/realms.js';
import { pick, randInt, chance, weighted } from './rng.js';
import { qiPerSec, stonePerSec, artifactSum, rareChance, traitSum } from './economy.js';
import { chargeMult, disguiseFull, ratioOf, verdictOf } from './conceal.js';
import { quote } from './events.js';
import { addDisciple } from './disciples.js';
import { rollSurrender, applyLoss } from './endure.js';
import { canAfford, pay } from './resources.js';

export const canBurst = s => disguiseFull(s) && s.grudges.length > 0 && !s.burstActive && !s.visitor.current;

// 連鎖倍率（3 人 ×1.5、5 人 ×2、10 人 ×3）
export function chainMult(n) {
  for (const c of CONFIG.burst.chain) if (n >= c.n) return c.mult;
  return 1;
}

// 計算單人獎勵（尚未乘連鎖）
function rewardFor(s, g, verdict) {
  const tbl = ENEMY_REWARDS[g.type];
  const vMult = verdict === 'crush' ? CONFIG.burst.crushMult : CONFIG.burst.narrowMult;
  const scale = (1 + REALM_SCALE * Math.floor(g.lvl)) * vMult
    * (g.alert ? CONFIG.enemy.alertMult : 1);
  const r = {
    qi: qiPerSec(s) * randInt(...tbl.qiSec) * scale,
    stone: randInt(...tbl.stone) * scale,
    token: randInt(...tbl.token) * vMult * (g.alert ? CONFIG.enemy.alertMult : 1),
    surrender: false, artifact: false,
  };
  const v = verdict === 'crush' ? 'crush' : 'narrow';
  if (tbl.surrender && chance(tbl.surrender[v])) r.surrender = true;
  if (tbl.artifact && chance(tbl.artifact[v])) r.artifact = true;
  // 護山大陣的稀有事件：額外掉落
  if (chance(rareChance(s) * 0.5)) { r.token += RARE_EXTRA.token; r.stone += RARE_EXTRA.stone * scale; r.rare = true; }
  return r;
}

// 引爆前預覽：預估每位的結果、連鎖、哪些長老可能反噬
export function previewBurst(s) {
  const entries = [...s.grudges].sort((a, b) => a.lvl - b.lvl).map(g => {
    const ratio = ratioOf(s, g), verdict = verdictOf(ratio);
    return { g: { ...g, label: lvlLabel(g.lvl) }, ratio, verdict, risk: g.type === 'elder' && ratio < CONFIG.burst.backfireRatio };
  });
  const chain = entries.filter(e => e.verdict !== 'fail').length;
  return { entries, chain, chainMult: chainMult(chain), chargeMult: chargeMult(s), backfires: entries.filter(e => e.risk).length };
}

export function burst(s) {
  if (!canBurst(s)) return null;
  const cm = chargeMult(s);
  // 1) 依境界由弱到強出場，逐人判定
  const order = [...s.grudges].sort((a, b) => a.lvl - b.lvl);
  const entries = order.map(g => {
    const ratio = ratioOf(s, g);
    const verdict = verdictOf(ratio);
    const p = PERSONALITIES[g.personality];
    const line = pick(verdict === 'crush' ? p.kneel : verdict === 'narrow' ? p.narrow : p.fail);
    return { g: { ...g, label: lvlLabel(g.lvl) }, ratio, verdict, line, reward: null, narr: pickLine(LINES.burstNarr[verdict]) };
  });
  // 2) 連鎖：被擊敗（碾壓＋險勝）的人數
  const chain = entries.filter(e => e.verdict !== 'fail').length;
  const cMult = chainMult(chain);
  const art = 1 + artifactSum(s, 'burstReward') + traitSum(s, 'burstReward');
  const total = { qi: 0, stone: 0, token: 0 };
  const surrendered = [], artifacts = [];
  // 3) 發獎勵
  for (const e of entries) {
    if (e.verdict === 'fail') continue;
    const r = rewardFor(s, e.g, e.verdict);
    const k = cm * cMult * art;
    r.qi *= k; r.stone *= k; r.token = Math.round(r.token * cMult * art);
    total.qi += r.qi; total.stone += r.stone; total.token += r.token;
    if (r.surrender) {
      const def = rollSurrender(s);
      s.recruits.push({ uid: s.nextUid++, defId: def.id, from: e.g.name });
      surrendered.push({ def, from: e.g.name });
      r.surrenderDef = def;
    }
    if (r.artifact) {
      const left = ARTIFACTS.filter(a => !s.artifacts.includes(a.id));
      if (left.length) {
        const a = pick(left); s.artifacts.push(a.id); artifacts.push(a); r.artifactDef = a;
      } else { const bonus = 20 * k; r.stone += bonus; total.stone += bonus; }   // 全收集 → 折算靈石
    }
    e.reward = r;
  }
  s.res.qi += total.qi; s.res.stone += total.stone; s.res.token += total.token;
  // 3.5) 反噬：戰力遠不如的長老會反擊（損失靈石、一棟建築暫停；最多一次暫停）
  let backfire = null;
  const risky = entries.filter(e => e.g.type === 'elder' && e.ratio < CONFIG.burst.backfireRatio);
  if (risky.length && s.settings.loss) {
    const B = CONFIG.burst.backfire;
    const lost = Math.min(s.res.stone, Math.floor(stonePerSec(s) * B.stoneSec * risky.length));
    s.res.stone -= lost;
    const built = Object.entries(s.buildings).filter(([, b]) => b.lv > 0);
    let paused = null;
    if (built.length) { const [id, b] = pick(built); b.pausedUntil = s.t + B.pauseMs * Math.max(0.2, 1 - traitSum(s, 'pauseCut')); paused = id; }
    backfire = { names: risky.map(e => e.g.name), lost, paused };
    for (const e of risky) e.backfire = true;
  }
  // 4) 結算狀態：擊敗者出簿、偽裝與蓄力歸零
  const beaten = new Set(entries.filter(e => e.verdict !== 'fail').map(e => e.g.id));
  s.grudges = s.grudges.filter(g => !beaten.has(g.id));
  s.disguise.value = 0; s.disguise.chargeMs = 0; s.endureStreak = 0;
  s.stats.bursts++;
  const outro = pickLine(LINES.burstOutro[[10, 5, 3, 1, 0].find(n => chain >= n) ?? 0]);
  s.burstActive = true;                     // 演出期間封鎖訪客；ui 結束後呼叫 endBurst
  return {
    backfire, chargeMult: cm, chain, chainMult: cMult, entries, total, surrendered, artifacts,
    intro: pickLine(LINES.burstIntro), outro,
  };
}

export function endBurst(s) {
  s.burstActive = false;
  s.visitor.nextAt = Math.max(s.visitor.nextAt, s.t + CONFIG.visitor.minSec * 1000);
  quote('……繼續苟著吧，下一批債主很快就來。');
}

// 招募降服弟子（花靈石）；重複則轉碎片，由 disciples.addDisciple 處理
export const recruitCost = () => ({ stone: CONFIG.burst.recruitStone });
export function recruit(s, uid) {
  const i = s.recruits.findIndex(r => r.uid === uid);
  if (i < 0 || !canAfford(s, recruitCost())) return null;
  pay(s, recruitCost());
  const [r] = s.recruits.splice(i, 1);
  return addDisciple(s, r.defId);
}
