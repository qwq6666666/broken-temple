// 爆：偽裝值滿後「不裝了」。逐人判定 → 連鎖加成 → 依類型發獎勵。
// 核心一次算完並套用結果，回傳 result 供 ui 播放演出與結算畫面。
import { CONFIG } from '../config.js';
import { ENEMY_REWARDS, REALM_SCALE, RARE_EXTRA, PERSONALITY_BIAS, RIPE, FOE, WEAK_MISS_MULT } from '../data/enemies.js';
import { COUNTER_SPEC } from '../data/squad.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { PERSONALITIES } from '../data/visitors.js';
import { ARTIFACTS, ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { LINES, pickLine } from '../data/lines.js';
import { lvlLabel, powerOfLvl } from '../data/realms.js';
import { pick, randInt, chance } from './rng.js';
import { qiPerSec, stonePerSec, artifactSum, rareChance, traitSum, towerBurst, combatPower } from './economy.js';
import { chargeMult, disguiseFull, ratioOf, verdictOf, elementOfGrudge, elementAdvantage } from './conceal.js';
import { squadOf, squadVs, bestSquad, squadPool } from './squad.js';
import { FACTIONS_BY_ID, FACTION_OF_SECT, FACTION_RULES as FR, FACTION_TIERS } from '../data/factions.js';
import { MERIT } from '../data/materials.js';
import { note } from './chronicle.js';
import { quote } from './events.js';
import { isNemesis, nemOf, nemState, lineFor } from './nemesis.js';
import { addRep, rewardMult, tierOfSect, tierOf } from './factions.js';
import { AWAKEN, ROMAN } from '../data/nemeses.js';
import { addDisciple } from './disciples.js';
import { rollSurrender } from './endure.js';
import { canAfford, pay } from './resources.js';

export const canBurst = s => disguiseFull(s) && s.grudges.length > 0 && !s.burstActive && !s.visitor.current;

// 連鎖倍率（3 人 ×1.5、5 人 ×2、10 人 ×3）
export function chainMult(n) {
  for (const c of CONFIG.burst.chain) if (n >= c.n) return c.mult;
  return 1;
}

// 計算單人獎勵（尚未乘連鎖）
function rewardFor(s, g, verdict) {
  const tbl = ENEMY_REWARDS[g.type], PB = PERSONALITY_BIAS[g.personality] || {};
  const vMult = verdict === 'crush' ? CONFIG.burst.crushMult : CONFIG.burst.narrowMult;
  const scale = (1 + REALM_SCALE * Math.floor(g.lvl)) * vMult
    * (g.alert ? CONFIG.enemy.alertMult : 1)
    * rewardMult(s, g.sect)                                  // 勢力威望第一階起 +10%
    * (g.returnBonus ? FR.revengeReward : 1)                // 復仇的回頭客獎勵 ×1.5
    * (1 + RIPE.per * (g.ripe || 0))                        // 放過養成
    * (1 + FOE.reward * (g.foe || 0))                       // 老對頭：每擊敗過一次 +20%
    * (PB.all || 1);
  const r = {
    qi: qiPerSec(s) * randInt(...tbl.qiSec) * scale * (PB.qi || 1),
    stone: randInt(...tbl.stone) * scale * (PB.stone || 1),
    token: randInt(...tbl.token) * vMult * (g.alert ? CONFIG.enemy.alertMult : 1) * (PB.token || 1),
    shard: PB.shard || 0,
    surrender: false, artifact: false,
  };
  const v = verdict === 'crush' ? 'crush' : 'narrow';
  if (tbl.surrender && chance(Math.min(1, tbl.surrender[v] * (PB.surrender || 1)))) r.surrender = true;
  if (tbl.artifact && chance(Math.min(1, tbl.artifact[v] * (PB.artifact || 1)))) r.artifact = true;
  // 護山大陣的稀有事件：額外掉落
  if (chance(rareChance(s) * 0.5)) { r.token += RARE_EXTRA.token; r.stone += RARE_EXTRA.stone * scale; r.rare = true; }
  return r;
}

// 單人判定：宿敵只有「碾壓」才算擊敗；險勝時他會脫身（escaped），視同沒打贏
export const weakOf = g => (isNemesis(g) ? COUNTER_SPEC[g.personality] || null : null);
export const weakHit = (g, members) => { const w = weakOf(g); return !w || members.some(d => DISCIPLES_BY_ID[d.defId].specialty === w); };
function judge(s, g, members = squadOf(s)) {
  const ratio = ratioOf(s, g) * squadVs(s, g, members).mult;
  let verdict = verdictOf(ratio), escaped = false;
  if (verdict === 'crush' && !weakHit(g, members) && ratio < CONFIG.burst.crushRatio * WEAK_MISS_MULT) verdict = 'narrow';   // 宿敵：沒打中弱點要更大的差距才能碾壓
  if (isNemesis(g) && verdict === 'narrow') { verdict = 'fail'; escaped = true; }
  return { ratio, verdict, escaped };
}
// 出場順序：一般仇人由弱到強，宿敵壓軸
const fighters = s => s.grudges.filter(g => !g.spare || isNemesis(g));         // 被勾選「放過」的普通仇人不參戰
const order = grudges => [...grudges].sort((a, b) => (isNemesis(a) - isNemesis(b)) || a.lvl - b.lvl);

// 引爆前預覽：預估每位的結果、連鎖、哪些長老可能反噬
export function previewBurst(s) {
  const entries = order(s.grudges).map(g => {
    const sparing = !!g.spare && !isNemesis(g);
    const { ratio, verdict } = sparing ? { ratio: 0, verdict: 'fail' } : judge(s, g);
    const sq = squadVs(s, g), adv = elementAdvantage(s, g).mult;
    return { g: { ...g, label: lvlLabel(g.lvl), element: elementOfGrudge(g) }, adv, sq, mine: combatPower(s) * adv * sq.mult, theirs: powerOfLvl(g.lvl), ratio, verdict, sparing, nemesis: isNemesis(g), weak: weakOf(g), fac: FACTION_OF_SECT[g.sect] || null, facTier: tierOfSect(s, g.sect), weakHit: weakHit(g, squadOf(s)), bias: PERSONALITY_BIAS[g.personality]?.label || '', risk: !sparing && g.type === 'elder' && ratio < CONFIG.burst.backfireRatio };
  });
  const chain = entries.filter(e => e.verdict !== 'fail' && !e.sparing).length;
  return { entries, chain, chainMult: chainMult(chain), squad: squadOf(s), pool: squadPool(s), crushRatio: CONFIG.burst.crushRatio, narrowRatio: CONFIG.burst.narrowRatio, chargeMult: chargeMult(s), factions: factionSummary(s, entries), backfires: entries.filter(e => e.risk).length, spared: entries.filter(e => e.sparing).length };
}

export function burst(s) {
  if (!canBurst(s) || !fighters(s).length) return null;
  const cm = chargeMult(s);
  // 1) 依境界由弱到強出場，逐人判定
  const entries = order(fighters(s)).map(g => {
    const { ratio, verdict, escaped } = judge(s, g);
    const p = PERSONALITIES[g.personality], nem = isNemesis(g) ? nemOf(g) : null;
    const line = nem ? lineFor(nem, verdict, escaped) : pick(verdict === 'crush' ? p.kneel : verdict === 'narrow' ? p.narrow : p.fail);
    const narr = nem && verdict === 'crush' ? nem.story.defeat : pickLine(LINES.burstNarr[escaped ? 'narrow' : verdict]);
    return { g: { ...g, label: lvlLabel(g.lvl) }, ratio, verdict, escaped, line, taunt: g.taunt || pick(p.taunt), reward: null, narr, nemesis: nem };
  });
  // 2) 連鎖：被擊敗（碾壓＋險勝）的人數
  const chain = entries.filter(e => e.verdict !== 'fail').length;
  const cMult = chainMult(chain);
  const fsum = Object.fromEntries(factionSummary(s, entries).map(f => [f.id, f.sweep]));
  const art = 1 + artifactSum(s, 'burstReward') + traitSum(s, 'burstReward') + towerBurst(s);
  const total = { qi: 0, stone: 0, token: 0 }, reps = {}, comebacks = [];
  const surrendered = [], artifacts = [], nemesesDefeated = [];
  let tokCarry = 0;                                   // 招賢令的小數餘數跨仇人累計（乘 burstTokenScale 後每人常不到 1 張，逐人四捨五入會全變 0）
  // 3) 發獎勵
  for (const e of entries) {
    if (e.verdict === 'fail') continue;
    const r = rewardFor(s, e.g, e.verdict);
    const sw = fsum[FACTION_OF_SECT[e.g.sect]] || 1; e.sweep = sw;
    const k = cm * cMult * art * sw;
    r.qi *= k; r.stone *= k; const tk = tokCarry + r.token * cMult * art * sw * CONFIG.gacha.burstTokenScale; r.token = Math.floor(tk + 1e-9); tokCarry = tk - r.token;
    total.qi += r.qi; total.stone += r.stone; total.token += r.token; s.res.shard += r.shard || 0; total.shard = (total.shard || 0) + (r.shard || 0);
    if (r.surrender) {
      const def = rollSurrender(s);
      s.recruits.push({ uid: s.nextUid++, defId: def.id, from: e.g.name });
      surrendered.push({ def, from: e.g.name });
      r.surrenderDef = def;
    }
    if (r.artifact) {
      const left = ARTIFACTS.filter(a => !a.unique && !s.artifacts.includes(a.id));
      if (left.length) {
        const a = pick(left); s.artifacts.push(a.id); artifacts.push(a); r.artifactDef = a;
      } else { const bonus = 20 * k; r.stone += bonus; total.stone += bonus; }   // 全收集 → 折算靈石
    }
    e.reward = r;
    // 威望：碾壓 +2、險勝 +1；碾壓的一般仇人有機會日後回頭（復仇或求和）
    const rp = addRep(s, e.g.sect, e.verdict === 'crush' ? 2 : 1);
    if (rp) reps[rp.id] = (reps[rp.id] || 0) + (e.verdict === 'crush' ? 2 : 1);
    if (!e.nemesis) {                                               // 仇人記憶：擊敗過的人會被記住；第 3 次起成為「老對頭」
      const f = (s.foes[e.g.name] ||= { beaten: 0 }); f.beaten++; e.g.foeNow = f.beaten;
      if (f.beaten === FOE.titleAt) { note(s, '🗡️', `「${e.g.name}」成了老對頭（擊敗 ${f.beaten} 次）`); s.res.merit += FOE.titleMerit; e.newTitle = true; }
    }
    if (e.verdict === 'crush' && !e.nemesis && chance(FR.returnChance)) {
      const tier = tierOfSect(s, e.g.sect), mode = chance(FR.pleadBase + FR.pleadPerTier * tier) ? 'plead' : 'revenge';
      s.returners.push({ name: e.g.name, sect: e.g.sect, type: e.g.type, role: e.g.role, personality: e.g.personality, lvl: e.g.lvl, mode, element: e.g.element, foe: s.foes[e.g.name]?.beaten || 0,
                         dueAt: s.t + randInt(...FR.returnDelayMin) * 60000 });
      comebacks.push(e.g.name);
    }
    // 宿敵被碾壓：固定獎勵 + 專屬法寶，劇情推進
    if (e.nemesis && e.verdict === 'crush') {
      const n = e.nemesis, rw = n.reward, aw = e.g.awaken || 0;
      if (aw) {                                                      // 覺醒形態：更多資源與道心，不再給法寶
        const dao = AWAKEN.dao[aw - 1];
        total.token += rw.token * AWAKEN.tokenMult; total.stone += rw.stone * AWAKEN.stoneMult; s.res.daoHeart += dao;
        r.nemesisReward = { token: rw.token * AWAKEN.tokenMult, stone: rw.stone * AWAKEN.stoneMult, dao };
        note(s, '🌟', `擊敗覺醒${ROMAN[aw]}的「${n.name}」，獲得道心 ${dao}`);
        nemState(s, n.id).awakeLv = Math.max(nemState(s, n.id).awakeLv || 0, aw); s.run.nemeses++;
        nemesesDefeated.push({ n, art: null, finale: false, awaken: aw, dao });
      } else {
        total.token += rw.token; total.stone += rw.stone; r.nemesisReward = rw;
        const art = ARTIFACTS_BY_ID[rw.artifact];
        if (art && !s.artifacts.includes(art.id)) { s.artifacts.push(art.id); artifacts.push(art); }
        note(s, '⚔️', `擊敗宿敵「${n.name}」`);
        nemState(s, n.id).defeated = true; s.stats.nemesisDefeated = (s.stats.nemesisDefeated || 0) + 1; s.run.nemeses++;
        nemesesDefeated.push({ n, art, finale: !!n.finale });
      }
    }
  }
  total.token += Math.round(tokCarry);
  s.res.qi += total.qi; s.res.stone += total.stone; s.res.token += total.token;
  total.merit = entries.reduce((a, e) => a + (e.verdict === 'fail' ? 0 : MERIT.perDefeat * (e.nemesis ? MERIT.nemesis : 1)), 0); s.res.merit += total.merit;
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
  for (const g of s.grudges) if (g.spare && !isNemesis(g)) { g.ripe = Math.min(RIPE.max, (g.ripe || 0) + 1); g.lvl = Math.min(CONFIG.enemy.maxLevel + 0.99, g.lvl + RIPE.lvl); }
  for (const g of s.grudges) g.spare = false;           // 放過只對這一次引爆有效
  s.disguise.value = 0; s.disguise.chargeMs = 0; s.endureStreak = 0;
  const prevMax = s.stats.maxChain || 0;
  if (s.stats.bursts === 0) note(s, '💥', `首次引爆，連鎖 ${chain} 人`);
  else if (chain >= 3 && chain > prevMax) note(s, '💥', `單次引爆連鎖 ${chain} 人（新紀錄）`);
  s.stats.bursts++; s.stats.maxChain = Math.max(s.stats.maxChain || 0, chain);
  s.run.bursts++; s.run.maxChain = Math.max(s.run.maxChain, chain);
  const outro = pickLine(LINES.burstOutro[[10, 5, 3, 1, 0].find(n => chain >= n) ?? 0]);
  s.burstActive = true;                     // 演出期間封鎖訪客；ui 結束後呼叫 endBurst
  return {
    backfire, chargeMult: cm, chain, chainMult: cMult, entries, total, surrendered, artifacts, nemesesDefeated, reps, comebacks,
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

// 推薦陣容：擊敗人數（碾壓算 2）依仇人境界加權最大；同分再比總戰力比
export function recommendSquad(s) {
  const gs = order(fighters(s));
  return bestSquad(s, members => gs.reduce((a, g) => {
    const { ratio, verdict } = judge(s, g, members);
    return a + (verdict === 'crush' ? 2 : verdict === 'narrow' ? 1 : 0) * (1 + g.lvl) * 100 + Math.min(ratio, 3);
  }, 0));
}

// 放過：勾選後這次引爆不打他，留在名單上熟成（宿敵不能放過）
export function toggleSpare(s, gid) {
  const g = s.grudges.find(x => x.id === gid);
  if (!g || isNemesis(g) || s.burstActive) return false;
  g.spare = !g.spare; return true;
}

// 一網打盡：同一勢力一次擊敗 ≥ at 人，每人獎勵加成
const sweepMult = n => (n >= FR.sweep.at ? 1 + Math.min(FR.sweep.max, FR.sweep.per * (n - FR.sweep.at + 1)) : 1);
// 依勢力彙整一組結果：人數、威望預估、是否升階、一網打盡倍率
export function factionSummary(s, entries) {
  const by = {};
  for (const e of entries) {
    if (e.verdict === 'fail' || e.sparing) continue;
    const id = FACTION_OF_SECT[e.g.sect]; if (!id) continue;
    const f = (by[id] ||= { id, n: 0, rep: 0 });
    f.n++; f.rep += e.verdict === 'crush' ? 2 : 1;
  }
  return Object.values(by).map(f => {
    const def = FACTIONS_BY_ID[f.id], cur = s.factions[f.id] || 0, before = tierOf(s, f.id);
    const after = FR.thresholds.filter(t => cur + f.rep >= t).length, next = FR.thresholds[after];
    return { ...f, name: def.name, emoji: def.emoji, tierBefore: before, tierAfter: after, tierName: FACTION_TIERS[after], toNext: next ? next - cur - f.rep : 0, nextName: FACTION_TIERS[after + 1] || '', sweep: sweepMult(f.n) };
  });
}
