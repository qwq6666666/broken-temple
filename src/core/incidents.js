// 隨機事件：彈出式小抉擇。效果為宣告式資料，統一由 applyEffects 結算（走 rng，可重現測試）。
import { INCIDENTS, INCIDENTS_BY_ID, INCIDENT_INTERVAL as T } from '../data/incidents.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { weighted, randInt, chance, pick } from './rng.js';
import { qiPerSec, stonePerSec, rareChance, traitSum } from './economy.js';
import { rollSurrender } from './endure.js';
import { canAfford, pay } from './resources.js';
import { fmt } from './format.js';
import { quote, toast, cue } from './events.js';

const scheduleNext = s => { s.incident.nextAt = s.t + randInt(T.minSec, T.maxSec) * 1000; };

export const defOf = s => s.incident.current ? INCIDENTS_BY_ID[s.incident.current.id] : null;

// 選項的實際費用（把「N 秒產出」換成數量）
export function costOf(s, choice) {
  const c = {};
  if (choice.cost?.stoneSec) c.stone = Math.max(1, Math.ceil(stonePerSec(s) * choice.cost.stoneSec));
  if (choice.cost?.qiSec) c.qi = Math.max(1, Math.ceil(qiPerSec(s) * choice.cost.qiSec));
  return c;
}
export function canChoose(s, idx) {
  const d = defOf(s); if (!d) return false;
  const ch = d.choices[idx]; if (!ch) return false;
  if (ch.requires?.building && s.buildings[ch.requires.building].lv < 1) return false;
  return canAfford(s, costOf(s, ch));
}

// 到時間且沒有訪客／演出時彈出一則（好事件權重受稀有機率加成）
export function tick(s) {
  const inc = s.incident;
  if (inc.current && s.t >= inc.current.expiresAt) { resolve(s, INCIDENTS_BY_ID[inc.current.id].timeoutChoice, true); return; }
  if (inc.current || s.burstActive || s.t < inc.nextAt) return;
  if (s.visitor.current) { inc.nextAt = s.t + 15000; return; }      // 與訪客錯開
  const pool = INCIDENTS.filter(i => i.minRealm <= s.realmIdx);
  const def = weighted(pool, i => i.weight * (i.good ? 1 + rareChance(s) * 2 + traitSum(s, 'rare') : 1));
  inc.current = { id: def.id, expiresAt: s.t + T.expireSec * 1000 };
  cue('incident');
}

// 結算效果；out 累積實際結果供摘要使用
function applyEffects(s, e, out) {
  const armor = e.armorByArray ? Math.max(0.2, 1 - s.buildings.array.lv * 0.08) : 1;
  if (e.qiSec) { const n = qiPerSec(s) * e.qiSec; s.res.qi += n; out.push(`✨靈氣 +${fmt(n)}`); }
  if (e.stoneSec) { const n = Math.max(1, stonePerSec(s) * e.stoneSec); s.res.stone += n; out.push(`💎靈石 +${fmt(n)}`); }
  if (e.token) { s.res.token += e.token; out.push(`🎫招賢令 +${e.token}`); }
  if (e.shard) { s.res.shard += e.shard; out.push(`🧩碎片 +${e.shard}`); }
  if (e.loseQiSec) { const n = Math.min(s.res.qi, qiPerSec(s) * e.loseQiSec * armor); s.res.qi -= n; out.push(`✨靈氣 -${fmt(n)}`); }
  if (e.loseStoneSec) { const n = Math.min(s.res.stone, Math.max(1, stonePerSec(s) * e.loseStoneSec * armor)); s.res.stone -= n; out.push(`💎靈石 -${fmt(n)}`); }
  if (e.disguise) {
    s.disguise.value = Math.max(0, Math.min(20, s.disguise.value + e.disguise));    // 上限同蓄力條
    out.push(`🎭偽裝 ${e.disguise > 0 ? '+' : ''}${e.disguise}`);
  }
  if (e.pauseBuilding) {
    const built = Object.entries(s.buildings).filter(([, b]) => b.lv > 0 && s.t >= b.pausedUntil);
    if (built.length) {
      const [id, b] = pick(built);
      const ms = e.pauseBuilding * Math.max(0.2, 1 - traitSum(s, 'pauseCut'));
      b.pausedUntil = s.t + ms; out.push(`⏸${BUILDINGS_BY_ID[id].name}暫停 ${Math.round(ms / 60000)} 分鐘`);
    }
  }
  if (e.artifact && chance(e.artifact)) {
    const left = ARTIFACTS.filter(a => !a.unique && !s.artifacts.includes(a.id));
    if (left.length) { const a = pick(left); s.artifacts.push(a.id); out.push(`${a.emoji}獲得 ${a.name}`); }
    else { s.res.shard += 10; out.push('🧩碎片 +10'); }
  }
  if (e.recruit && chance(e.recruit)) {
    const def = rollSurrender(s);
    s.recruits.push({ uid: s.nextUid++, defId: def.id, from: '山門訪客' });
    out.push(`${DISCIPLES_BY_ID[def.id].emoji}${def.name} 拜入門下候選`);
  }
  if (e.gamble) applyEffects(s, chance(e.gamble.p) ? e.gamble.win : e.gamble.lose, out);
}

// 作答；auto 表示逾時自動採預設。回傳摘要文字，無法選擇回傳 null
export function resolve(s, idx, auto = false) {
  const d = defOf(s); if (!d) return null;
  const ch = d.choices[idx];
  if (!auto && !canChoose(s, idx)) return null;
  if (auto && !canAfford(s, costOf(s, ch))) { idx = d.choices.findIndex((c, i) => canChoose(s, i)); if (idx < 0) idx = d.timeoutChoice; }
  const choice = d.choices[idx], out = [];
  if (canAfford(s, costOf(s, choice))) pay(s, costOf(s, choice));
  applyEffects(s, choice.effects, out);
  s.incident.current = null;
  s.stats.incidents = (s.stats.incidents || 0) + 1;
  scheduleNext(s);
  const summary = `${d.emoji}${d.title}・${choice.label}${auto ? '（逾時）' : ''}：${out.join('、') || '平安無事'}`;
  toast(summary, out.some(x => x.includes('-') || x.includes('暫停')) ? 'warn' : 'good');
  quote(auto ? '你發什麼呆？機會自己會跑的。' : '嗯，抉擇已下，後果自負。');
  return summary;
}
