// 輪迴詞條：影響本輪的加成（由 dao.perm 併入）、訪客頻率與道心倍率。
import { MUTATORS_BY_ID } from '../data/mutators.js';

export const mutatorOf = s => MUTATORS_BY_ID[s.mutator] || null;
export const mutSum = (s, key) => mutatorOf(s)?.effects[key] || 0;
