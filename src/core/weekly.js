// 每週挑戰：每週（週一 00:00 UTC 起）固定輪替一個輪迴詞條。
// 用該詞條完成一輪、並在本週內轉生，首次可額外獲得道心。時間由呼叫端傳入（測試用）。
import { MUTATORS } from '../data/mutators.js';

const DAY = 86400000, WEEK = 7 * DAY;
export const weekIndex = (now = Date.now()) => Math.floor((now - 4 * DAY) / WEEK);       // 1970-01-01 是週四，扣 4 天讓週一對齊
export const weeklyMutator = (now = Date.now()) => MUTATORS[((weekIndex(now) % MUTATORS.length) + MUTATORS.length) % MUTATORS.length];
export const weeklyBonusFor = gain => Math.max(5, Math.ceil(gain * 0.5));
// 本次轉生是否符合本週挑戰（本輪用的詞條 = 本週詞條，且本週還沒領過）
export const weeklyEligible = (s, now = Date.now()) => !!s.mutator && s.mutator === weeklyMutator(now).id && s.weekly.claimed !== weekIndex(now);
// 距離下週挑戰輪替還有幾天（至少 1）
export const weekDaysLeft = (now = Date.now()) => Math.max(1, Math.ceil(((weekIndex(now) + 1) * WEEK + 4 * DAY - now) / DAY));
