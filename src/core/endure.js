// 忍：路人隨機造訪嘲諷，玩家二選一（忍氣吞聲 / 亮一手）。
import { CONFIG } from '../config.js';
import { VISITOR_TYPES, SURNAMES, GIVEN, PERSONALITIES, PERSONALITY_KEYS } from '../data/visitors.js';
import { LINES, pickLine } from '../data/lines.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { pick, randInt, randFloat, weighted, chance } from './rng.js';
import { rareChance, stonePerSec, qiPerSec, traitSum } from './economy.js';
import { ratioOf, verdictOf } from './conceal.js';
import { DISCIPLES } from '../data/disciples.js';
import { SURRENDER_WEIGHTS } from '../data/gachaRates.js';
import { quote, toast, cue } from './events.js';

const scheduleNext = s => {
  s.visitor.nextAt = s.t + randInt(CONFIG.visitor.minSec, CONFIG.visitor.maxSec) * 1000;
};

// 生成一位路人（名字不與復仇簿重複；境界以玩家目前境界為基準 + 類型偏移）
function makeVisitor(s) {
  const rare = rareChance(s);
  const type = weighted(Object.values(VISITOR_TYPES),
    t => t.weight * (t.rare ? 1 + rare * CONFIG.visitor.rareWeightScale : 1));
  let name, tries = 0;
  do { name = pick(SURNAMES) + pick(GIVEN); } while (s.grudges.some(g => g.name === name) && ++tries < 20);
  const [lo, hi] = type.offset;
  const lvl = Math.max(0, Math.min(CONFIG.enemy.maxLevel, s.realmIdx + randInt(lo, hi))) + randFloat(0, 0.95);
  const personality = pick(PERSONALITY_KEYS);
  return {
    id: s.nextGid++, name, type: type.id, sect: pick(type.sects), role: pick(type.roles),
    personality, lvl, alert: false,
    taunt: pick(PERSONALITIES[personality].taunt),
  };
}

// 每 tick：到時間且沒有待處理訪客、復仇簿未滿 → 來一位
export function tick(s) {
  if (s.burstActive || s.visitor.current) return;
  if (s.t < s.visitor.nextAt) return;
  if (s.grudges.length >= CONFIG.visitor.maxGrudges) { scheduleNext(s); return; }
  s.visitor.current = makeVisitor(s);
  cue('visitor');
}

// 憋屈值：連續忍氣吞聲越多次，下一次的損失越重（亮一手／引爆後歸零）
export const streakMult = s =>
  Math.min(CONFIG.endure.streakMaxMult, 1 + CONFIG.endure.streakStep * s.endureStreak);

// 評估眼前訪客：玩家打不打得過、亮一手會是什麼結果（供 ui 顯示）
export function assess(s, v) {
  const verdict = verdictOf(ratioOf(s, v));
  const T = VISITOR_TYPES[v.type];
  let showKind, showMult = 1;
  if (T.showOff.offends) { showKind = 'offend'; showMult = CONFIG.endure.elderLossMult; }
  else if (verdict === 'fail') { showKind = 'rash'; showMult = CONFIG.endure.rashLossMult; }
  else showKind = 'beat';
  return { verdict, showKind, showMult, endureMult: streakMult(s), winText: T.showOff.winText };
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
    const ms = CONFIG.endure.loss.pauseMs * mult * Math.max(0.2, 1 - traitSum(s, 'pauseCut'));   // 特性：暫停縮短
    b.pausedUntil = s.t + ms;
    return `${BUILDINGS_BY_ID[id].name}暫停產出 ${Math.round(ms / 60000)} 分鐘`;
  }
  return null;
}
export { applyLoss };

function toBook(s, v) {
  s.visitor.current = null;
  s.grudges.push({ id: v.id, name: v.name, type: v.type, sect: v.sect, role: v.role,
                   personality: v.personality, lvl: v.lvl, alert: v.alert, taunt: v.taunt });
  scheduleNext(s);
}

// 忍氣吞聲：偽裝值 +1、承受損失（含憋屈值倍率）、仇人入簿
export function endure(s) {
  const v = s.visitor.current; if (!v) return null;
  const mult = streakMult(s);
  toBook(s, v);
  s.endureStreak++;
  s.disguise.value = Math.min(CONFIG.conceal.max, s.disguise.value + CONFIG.endure.disguiseGain);
  const loss = applyLoss(s, mult);
  quote(pickLine(LINES.endure));
  toast(`已記入復仇簿：${v.name}` + (loss ? `（${loss}）` : ''), 'warn');
  return { loss, mult };
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
    const w = T.showOff.win, got = {}, bonus = 1 + traitSum(s, 'showOffReward');   // 特性：即時獎勵加成
    if (w.token) got.token = Math.max(w.token, Math.round(w.token * bonus));
    if (w.qiSec) got.qi = qiPerSec(s) * w.qiSec * bonus;
    if (w.stoneSec) got.stone = Math.max(1, stonePerSec(s) * w.stoneSec * bonus);
    for (const [k, n] of Object.entries(got)) s.res[k] += n;
    if (w.surrender && chance(w.surrender)) {
      const def = rollSurrender(s);
      s.recruits.push({ uid: s.nextUid++, defId: def.id, from: v.name });
      got.surrender = def;
    }
    s.visitor.current = null; scheduleNext(s);
    quote(pickLine(LINES.show));
    toast(`${v.name} 被打臉離開` + (got.surrender ? `，並拜入門下候選：${got.surrender.name}` : ''), 'good');
    return { outcome: 'beat', line, got };
  }
  v.alert = true;
  const loss = applyLoss(s, a.showMult);
  toBook(s, v);
  quote(pickLine(LINES.show));
  toast(`${v.name} 警覺了` + (loss ? `（${loss}）` : ''), 'warn');
  return { outcome: a.showKind, line, loss };
}
