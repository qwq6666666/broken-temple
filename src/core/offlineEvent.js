// 離線歸來事件：抽一則（供歡迎畫面）與結算選擇。選擇只能結算一次。
import { OFFLINE_EVENTS, OFFLINE_EVENTS_BY_ID, OFFLINE_EVENT_MIN_MS } from '../data/offlineEvents.js';
import { weighted } from './rng.js';
import { qiPerSec, stonePerSec } from './economy.js';

// minReb（選填）：至少轉生幾次才會遇到。
// 權重：入門事件（minReb 0）為 1，門檻越高越重（1 + 0.5 × minReb），轉生多次的玩家比較常看到新內容；
// 同一則不連續出現（s.offlineLast，跨轉生保留）。
export const offlineWeight = e => 1 + 0.5 * (e.minReb || 0);
export function rollOfflineEvent(s, elapsedMs) {
  if (!(elapsedMs >= OFFLINE_EVENT_MIN_MS)) return null;
  let pool = OFFLINE_EVENTS.filter(e => (e.minReb || 0) <= s.reincarnation.count);
  if (pool.length > 1) pool = pool.filter(e => e.id !== s.offlineLast);
  const id = weighted(pool, offlineWeight).id;
  s.offlineLast = id;
  return id;
}

// 回傳 {text, got}；事件或選項不存在回傳 null
export function resolveOffline(s, id, i) {
  const c = OFFLINE_EVENTS_BY_ID[id]?.choices[i];
  if (!c) return null;
  const rw = c.reward, got = {};
  if (rw.token) got.token = rw.token;
  if (rw.qiSec) got.qi = Math.max(rw.min?.qi || 0, Math.floor(qiPerSec(s) * rw.qiSec));
  if (rw.stoneSec) got.stone = Math.max(rw.min?.stone || 0, Math.floor(stonePerSec(s) * rw.stoneSec));
  for (const [k, v] of Object.entries(got)) s.res[k] += v;
  return { text: c.done, got };
}
