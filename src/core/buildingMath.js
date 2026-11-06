// 建築等級的純計算（不依賴 state）：刻度換算與里程碑倍率。
import { CONFIG } from '../config.js';

const B = CONFIG.building;
// 把「舊刻度每級效果」換算成目前等級的係數：lv 級 ≈ 舊版 lv / levelScale 級
export const lvEff = lv => lv / B.levelScale;
// 里程碑累計倍率（只套用在會產出的建築）
export const milestoneMult = lv => B.milestones.reduce((m, [at, mult]) => (lv >= at ? mult : m), 1);
// 下一個還沒達到的里程碑 [等級, 累計倍率]；全達成回傳 null
export const nextMilestone = lv => B.milestones.find(([at]) => lv < at) || null;
// 會產出的建築，每級每秒產出（資料值為舊刻度）
export const produceAt = (lv, perLevel) => lv * perLevel * milestoneMult(lv) / (B.levelScale * B.produceNorm);
