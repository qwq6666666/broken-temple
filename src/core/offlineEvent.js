// 離線歸來事件：抽一則（供歡迎畫面）與結算選擇。選擇只能結算一次。
import { OFFLINE_EVENTS, OFFLINE_EVENTS_BY_ID, OFFLINE_EVENT_MIN_MS } from '../data/offlineEvents.js';
import { pick } from './rng.js';
import { qiPerSec, stonePerSec } from './economy.js';

// minReb（選填）：至少轉生幾次才會遇到
export const rollOfflineEvent = (s, elapsedMs) => (elapsedMs >= OFFLINE_EVENT_MIN_MS ? pick(OFFLINE_EVENTS.filter(e => (e.minReb || 0) <= s.reincarnation.count)).id : null);

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
