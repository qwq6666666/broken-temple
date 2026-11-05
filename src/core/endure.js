// 忍：路人隨機造訪嘲諷，玩家二選一（忍氣吞聲 / 亮一手）。
import { CONFIG } from '../config.js';
import { VISITOR_TYPES, SURNAMES, GIVEN, PERSONALITIES, PERSONALITY_KEYS } from '../data/visitors.js';
import { LINES, pickLine } from '../data/lines.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { pick, randInt, randFloat, weighted, chance } from './rng.js';
import { rareChance } from './economy.js';
import { quote, toast } from './events.js';

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
}

// 「承受損失」：8% 靈石 或 隨機一棟建築暫停 5 分鐘。回傳說明文字（無損失則 null）
function applyLoss(s) {
  if (!s.settings.loss) return null;
  const built = Object.entries(s.buildings).filter(([, b]) => b.lv > 0 && s.t >= b.pausedUntil);
  const canStone = s.res.stone >= 1;
  const useStone = canStone && (!built.length || chance(0.5));
  if (useStone) {
    const lost = Math.max(1, Math.floor(s.res.stone * CONFIG.endure.loss.stoneFrac));
    s.res.stone -= lost;
    return `損失 ${lost} 靈石`;
  }
  if (built.length) {
    const [id, b] = pick(built);
    b.pausedUntil = s.t + CONFIG.endure.loss.pauseMs;
    return `${BUILDINGS_BY_ID[id].name}暫停產出 5 分鐘`;
  }
  return null;
}

function toBook(s, v) {
  s.visitor.current = null;
  s.grudges.push({ id: v.id, name: v.name, type: v.type, sect: v.sect, role: v.role,
                   personality: v.personality, lvl: v.lvl, alert: v.alert });
  scheduleNext(s);
}

// 忍氣吞聲：偽裝值 +1、承受輕微損失、仇人入簿
export function endure(s) {
  const v = s.visitor.current; if (!v) return null;
  toBook(s, v);
  s.disguise.value = Math.min(CONFIG.conceal.max, s.disguise.value + CONFIG.endure.disguiseGain);
  const loss = applyLoss(s);
  quote(pickLine(LINES.endure));
  toast(`已記入復仇簿：${v.name}` + (loss ? `（${loss}）` : ''), 'warn');
  return { loss };
}

// 亮一手：無損失、不加偽裝值，仇人入簿但「警覺」（爆擊獎勵 ×0.7）
export function showOff(s) {
  const v = s.visitor.current; if (!v) return null;
  v.alert = true;
  const line = pick(PERSONALITIES[v.personality].counter);
  toBook(s, v);
  quote(pickLine(LINES.show));
  toast(`${v.name} 已警覺。`, 'info');
  return { line };
}
