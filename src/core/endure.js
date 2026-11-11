// 忍：路人隨機造訪嘲諷，玩家二選一（忍氣吞聲 / 亮一手）。
import { CONFIG } from '../config.js';
import { FOE } from '../data/enemies.js';
import { FACTIONS_BY_ID, FACTION_OF_SECT, FACTION_RULES as FR } from '../data/factions.js';
import { ELEMENTS } from '../data/elements.js';
import { VISITOR_TYPES, SURNAMES, GIVEN, PERSONALITIES, PERSONALITY_KEYS } from '../data/visitors.js';
import { LINES, pickLine } from '../data/lines.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { pick, randInt, randFloat, weighted, chance } from './rng.js';
import { rareChance, stonePerSec, qiPerSec, traitSum, fameLayers } from './economy.js';
import { ratioOf, verdictOf, elementAdvantage, bookUsed } from './conceal.js';
import { DISCIPLES } from '../data/disciples.js';
import { SURRENDER_WEIGHTS } from '../data/gachaRates.js';
import { quote, toast, cue } from './events.js';
import { pickNemesis, makeNemesisVisitor } from './nemesis.js';
import { addRep, tierOfSect, tierOf } from './factions.js';
import { mutSum } from './mutators.js';
import { legacyF } from '../data/realms.js';
import { urActive } from './urPerks.js';
import { hasTag } from './secrets.js';

const scheduleNext = s => {
  s.visitor.nextAt = s.t + randInt(CONFIG.visitor.minSec, CONFIG.visitor.maxSec) * 1000 / Math.max(0.2, 1 + mutSum(s, 'visitFreq') + (hasTag(s, 'fate') ? CONFIG.secret.fateFreq : 0));   // 輪迴詞條與氣運之子影響頻率
};

// 回頭客：復仇者變強了、嘴更硬；求和者帶著賠禮
function makeReturner(s, r) {
  const plead = r.mode === 'plead';
  const lines = PERSONALITIES[r.personality].taunt;
  return { id: s.nextGid++, name: r.name, type: r.type, sect: r.sect, role: r.role, personality: r.personality, element: r.element,
           lvl: (plead ? r.lvl + 0.3 : r.lvl + FR.revengeLvlBonus) + (r.foe || 0) * FOE.lvl, alert: false, returning: r.mode, foe: r.foe || 0,
           taunt: plead ? '宗主……上回是晚輩有眼無珠。這點薄禮，不成敬意，只求您別再提那天的事。' : `上次是我大意！這回我可是下過苦功的——${pick(lines)}` };
}

// 生成一位路人（名字不與復仇簿重複；境界以玩家目前境界為基準 + 類型偏移）
function makeVisitor(s) {
  const rare = rareChance(s);
  const tide = !!s.tideNext; s.tideNext = false;                         // 歸墟「潮汐」：這一位必為稀有類型
  const type = weighted(Object.values(VISITOR_TYPES),
    t => (tide && !t.rare ? 0 : t.weight) * (t.rare ? 1 + rare * CONFIG.visitor.rareWeightScale : 1));
  let name, tries = 0;
  do { name = pick(SURNAMES) + pick(GIVEN); } while (s.grudges.some(g => g.name === name) && ++tries < 20);
  const [lo, hi] = type.offset;
  const lvl = Math.max(0, Math.min(CONFIG.enemy.maxLevel, legacyF(s.realmIdx) + randInt(lo, hi))) + randFloat(0, 0.95);
  const sect = pick(type.sects), fac = FACTIONS_BY_ID[FACTION_OF_SECT[sect]];
  const personality = weighted(PERSONALITY_KEYS, k => (fac?.lean?.includes(k) ? FR.leanWeight : 1));   // 勢力有各自的個性傾向
  return {
    id: s.nextGid++, name, type: type.id, sect, role: pick(type.roles),
    personality, lvl, alert: false, element: pick(ELEMENTS),
    taunt: pick(PERSONALITIES[personality].taunt),
  };
}

// 每 tick：到時間且沒有待處理訪客、復仇簿未滿 → 來一位
export function tick(s) {
  if (s.burstActive || s.visitor.current) return;
  if (s.t < s.visitor.nextAt) return;
  if (bookUsed(s) >= CONFIG.visitor.maxGrudges) { scheduleNext(s); return; }
  // 回頭客：到時間就回來（優先於宿敵與隨機訪客）
  const ri = s.returners.findIndex(r => s.t >= r.dueAt);
  if (ri >= 0) { const [r] = s.returners.splice(ri, 1); s.visitor.current = makeReturner(s, r); toast(`回頭客：${r.name}（${r.mode === 'plead' ? '來求和' : '來復仇'}）`, 'warn'); cue('visitor'); return; }
  const nem = pickNemesis(s);
  if (nem && chance(CONFIG.nemesis.chance)) { s.visitor.current = makeNemesisVisitor(s, nem); toast(`宿敵現身：${nem.name}（${nem.title}）`, 'warn'); cue('nemesis'); }
  else {
    const tr = pickTribute(s);
    if (tr) { s.visitor.current = tr; toast(`${FACTIONS_BY_ID[FACTION_OF_SECT[tr.sect]].emoji} ${tr.sect}派人進貢`, 'good'); cue('visitor'); }
    else { s.visitor.current = makeVisitor(s); cue('visitor'); }
  }
}

// 進貢：第 2 階起的勢力有機會派人送禮（用「求和」介面：收下賠禮或婉拒；婉拒不入復仇簿）
function pickTribute(s) {
  const opts = Object.values(FACTIONS_BY_ID).map(f => [f, tierOf(s, f.id)]).filter(([, t]) => t >= 2);
  if (!opts.length) return null;
  const [f, tier] = pick(opts);
  if (!chance(FR.tribute.perTier * (tier - 1))) return null;
  const v = makeVisitor(s), sect = pick(f.sects), type = Object.values(VISITOR_TYPES).find(t => t.sects.includes(sect));
  return { ...v, type: type.id, sect, role: pick(type.roles), returning: 'plead', tribute: true, alert: false, lvl: Math.max(0, legacyF(s.realmIdx) - 1),
           taunt: `${f.name}久仰宗主大名。這點薄禮，不成敬意——只盼往後相安無事。` };
}

// 憋屈值：連續忍氣吞聲越多次，下一次的損失越重（亮一手／引爆後歸零）
export const streakMult = s =>
  Math.min(CONFIG.endure.streakMaxMult, 1 + CONFIG.endure.streakStep * s.endureStreak);

// 亮一手時，派駐弟子的五行是否克制對方（獎勵加成）
const counterOf = (s, v) => elementAdvantage(s, v).mult > 1;

// 積怨壓力：忍的損失倍率 = 憋屈（連續忍）× 復仇簿人數 × 偽裝值接近滿格；上限 maxMult。亮一手只會歸零憋屈部分
export const endurePressure = s => {
  const E = CONFIG.endure;
  return Math.min(E.maxMult, streakMult(s) * (1 + E.bookStep * s.grudges.length) * (1 + E.chargeStep * Math.min(1, s.disguise.value / CONFIG.conceal.max)));
};

// 超載露餡機率：偽裝值超過 20 的每一點 +4%；洛神鳶「星河護幕」減半。value 預設用目前偽裝值
export const exposeChance = (s, value = s.disguise.value) => Math.min(0.95, Math.max(0, value - CONFIG.conceal.max) * CONFIG.overload.exposeStep * (urActive(s, 'luoshen') ? 0.5 : 1));
// 下一次忍會把偽裝值加到多少、露餡機率多少（供畫面顯示）
export const nextExpose = s => exposeChance(s, Math.min(CONFIG.overload.max, s.disguise.value + CONFIG.endure.disguiseGain));

// 評估眼前訪客：玩家打不打得過、亮一手會是什麼結果（供 ui 顯示）
export function assess(s, v) {
  const verdict = verdictOf(ratioOf(s, v));
  const T = VISITOR_TYPES[v.type];
  let showKind, showMult = 1;
  if (v.nemesisId) { showKind = 'nemesis'; showMult = CONFIG.endure.elderLossMult; }   // 宿敵不能當場打倒，留到引爆
  else if (T.showOff.offends) { showKind = 'offend'; showMult = CONFIG.endure.elderLossMult; }
  else if (verdict === 'fail') { showKind = 'rash'; showMult = CONFIG.endure.rashLossMult; }
  else showKind = 'beat';
  const escape = !!v.nemesisId && verdict === 'narrow';          // 宿敵險勝時會脫身
  return { verdict, escape, showKind, showMult, endureMult: endurePressure(s), counter: counterOf(s, v), winText: T.showOff.winText };
}

// 「承受損失」：約 N 秒靈石產出 或 隨機一棟建築暫停 5 分鐘；mult 為倍率。回傳說明文字（無損失則 null）
function applyLoss(s, mult = 1) {
  if (!s.settings.loss) return null;
  mult *= Math.max(0.2, 1 - traitSum(s, 'endureLoss'));          // 特性：損失減免
  const built = Object.entries(s.buildings).filter(([, b]) => b.lv > 0 && s.t >= b.pausedUntil);
  const useStone = s.res.stone >= 1 && (!built.length || chance(0.5));
  if (useStone) {
    const lost = Math.min(s.res.stone, Math.max(1, Math.floor(stonePerSec(s) * CONFIG.endure.loss.stoneSec * mult)));
    s.res.stone -= lost;
    return `損失 ${lost} 靈石`;
  }
  if (built.length) {
    const [id, b] = pick(built);
    const ms = Math.min(CONFIG.endure.pauseMaxMs, CONFIG.endure.loss.pauseMs * mult) * Math.max(0.2, 1 - traitSum(s, 'pauseCut'));   // 特性：暫停縮短
    b.pausedUntil = s.t + ms;
    return `${BUILDINGS_BY_ID[id].name}暫停產出 ${Math.round(ms / 60000)} 分鐘`;
  }
  return null;
}
export { applyLoss };

function toBook(s, v) {
  s.visitor.current = null;
  s.grudges.push({ id: v.id, name: v.name, type: v.type, sect: v.sect, role: v.role,
                   personality: v.personality, lvl: v.lvl, alert: v.alert, taunt: v.taunt, nemesisId: v.nemesisId, awaken: v.awaken || 0, element: v.element,
                   returnBonus: v.returning === 'revenge', foe: v.foe || 0 });
  scheduleNext(s);
}

// 忍氣吞聲：偽裝值 +1、承受損失（含憋屈值倍率）、仇人入簿
export function endure(s) {
  const v = s.visitor.current; if (!v) return null;
  const mult = endurePressure(s);                     // 先算再入簿（人數、偽裝值以忍之前為準）
  toBook(s, v);
  s.endureStreak++; s.stats.endures = (s.stats.endures || 0) + 1;
  s.disguise.value = Math.min(CONFIG.overload.max, s.disguise.value + CONFIG.endure.disguiseGain);
  // 超載區（>20）每次忍有機率露餡：機率 = 4% ×（偽裝值 − 20）；露餡 → 偽裝值 −6、該訪客警覺、這次損失 ×2
  const over = s.disguise.value - CONFIG.conceal.max;
  const exposed = over > 0 && chance(exposeChance(s));
  if (exposed) { s.disguise.value = Math.max(0, s.disguise.value - CONFIG.overload.exposeDrop); s.grudges[s.grudges.length - 1].alert = true; }
  const loss = applyLoss(s, exposed ? mult * CONFIG.overload.exposeLossMult : mult);
  quote(pickLine(LINES.endure));
  toast(exposed ? `⚠ 露餡！${v.name} 看穿了你（偽裝值 −${CONFIG.overload.exposeDrop}）` + (loss ? `（${loss}）` : '') : `已記入復仇簿：${v.name}` + (loss ? `（${loss}）` : ''), 'warn');
  return { loss, mult, exposed };
}

// 逐出：花一點靈石把一位仇人請出復仇簿（不給獎勵、不計威望），騰出名額。宿敵不能逐出；引爆中不能
export const dismissCost = s => ({ stone: Math.max(1, Math.floor(stonePerSec(s) * CONFIG.visitor.dismissSec)) });
export function dismiss(s, gid) {
  const i = s.grudges.findIndex(g => g.id === gid), g = s.grudges[i];
  if (!g || g.nemesisId || s.burstActive) return null;
  const c = dismissCost(s); if (s.res.stone < c.stone) return null;
  s.res.stone -= c.stone; s.grudges.splice(i, 1);
  s.stats.dismissed = (s.stats.dismissed || 0) + 1;
  return { name: g.name, cost: c.stone };
}

// 標記／取消標記「重點記恨」：最多 3 位，宿敵不能標；引爆中不能改
export const markedCount = s => s.grudges.filter(g => g.marked).length;
export function toggleMark(s, gid) {
  const g = s.grudges.find(x => x.id === gid);
  if (!g || g.nemesisId || s.burstActive) return false;
  if (g.marked) { g.marked = false; return true; }
  if (markedCount(s) >= CONFIG.mark.max) return false;
  g.marked = true; return true;
}

// 降服：從非 N 池抽一位（優先抽未擁有的）；供當場降服與爆擊降服共用
export function rollSurrender(s) {
  const rar = weighted(Object.keys(SURRENDER_WEIGHTS), k => SURRENDER_WEIGHTS[k]);
  const pool = DISCIPLES.filter(d => d.rarity === rar);
  const fresh = pool.filter(d => !s.disciples.some(x => x.defId === d.id) && !s.recruits.some(x => x.defId === d.id));
  return pick(fresh.length ? fresh : pool);
}

// 亮一手：依「打不打得過」與「對方類型」決定結果
//  beat   打得過 → 當場打臉，拿即時獎勵，對方離開（不入簿、不加偽裝、不加連鎖）
//  rash   打不過 → 逞強，受損 ×2，對方警覺入簿
//  offend 長老   → 得罪，受損 ×3，對方警覺入簿
export function showOff(s) {
  const v = s.visitor.current; if (!v) return null;
  const a = assess(s, v);
  const T = VISITOR_TYPES[v.type];
  const line = pick(PERSONALITIES[v.personality].counter);
  s.endureStreak = 0;
  if (a.showKind === 'beat') {
    const counter = counterOf(s, v), cm = counter ? CONFIG.endure.counterMult : 1;
    const w = T.showOff.win, got = {}, bonus = (1 + traitSum(s, 'showOffReward')) * cm;   // 特性：即時獎勵加成；五行克制 ×2
    if (w.token) got.token = Math.max(w.token, Math.round(w.token * bonus));
    if (w.qiSec) got.qi = qiPerSec(s) * w.qiSec * bonus;
    if (w.stoneSec) got.stone = Math.max(1, stonePerSec(s) * w.stoneSec * bonus);
    for (const [k, n] of Object.entries(got)) s.res[k] += n;
    if (w.surrender && chance(Math.min(1, w.surrender * (counter ? 1.5 : 1)))) {
      const def = rollSurrender(s);
      s.recruits.push({ uid: s.nextUid++, defId: def.id, from: v.name });
      got.surrender = def;
    }
    s.stats.beats = (s.stats.beats || 0) + 1;
    const F = CONFIG.endure.fame; s.fame = { n: Math.min(F.max, fameLayers(s) + 1), until: s.t + F.ms };      // 威名 +1 層（到期後從頭算）
    got.fame = s.fame.n; got.counter = counter;
    addRep(s, v.sect, 1);                              // 當場打臉也累積威望
    s.visitor.current = null; scheduleNext(s);
    quote(pickLine(LINES.show));
    toast(`${v.name} 被打臉離開` + (got.surrender ? `，並拜入門下候選：${got.surrender.name}` : ''), 'good');
    return { outcome: 'beat', line, got };
  }
  v.alert = a.showKind !== 'nemesis';              // 宿敵不套用警覺（獎勵是固定的）
  const loss = applyLoss(s, a.showMult);
  toBook(s, v);
  quote(pickLine(LINES.show));
  toast(`${v.name} 警覺了` + (loss ? `（${loss}）` : ''), 'warn');
  return { outcome: a.showKind, line, loss };
}

// 求和的回頭客：收下賠禮（資源 + 威望，對方離開）或讓他滾（入復仇簿，偽裝 +1，不受損失）
export function acceptPlea(s) {
  const v = s.visitor.current; if (!v || v.returning !== 'plead') return null;
  const tier = tierOfSect(s, v.sect);
  const mult = tier >= 3 ? 2 : 1, stone = Math.max(3, stonePerSec(s) * FR.pleadGiftSec * mult), token = tier >= 3 ? 2 : 1;
  s.res.stone += stone; s.res.token += token;
  addRep(s, v.sect, 3);
  s.visitor.current = null; scheduleNext(s);
  quote('哼，識相。禮收下，人滾蛋。');
  toast(`收下 ${v.name} 的賠禮：💎${Math.round(stone)} 🎫${token}，${v.sect}威望 +3`, 'good');
  return { stone, token };
}
export function rejectPlea(s) {
  const v = s.visitor.current; if (!v || v.returning !== 'plead') return null;
  if (v.tribute) { s.visitor.current = null; scheduleNext(s); quote('心意領了，禮就先不收了。'); toast(`婉拒了 ${v.name} 的進貢`, 'warn'); return true; }
  toBook(s, { ...v, returning: null });
  s.disguise.value = Math.min(CONFIG.conceal.max, s.disguise.value + CONFIG.endure.disguiseGain);
  quote('賠禮？本座的債，要當面討。');
  toast(`${v.name} 被你拒於門外，記入復仇簿`, 'warn');
  return true;
}

// 測試用：直接取得指定宗門的訪客／進貢訪客
export const makeVisitorForTest = (s, sect) => { for (let i = 0; i < 200; i++) { const v = makeVisitor(s); if (v.sect === sect) return v; } return makeVisitor(s); };
export const pickTributeForTest = pickTribute;
