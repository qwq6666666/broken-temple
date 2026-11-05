// 仇人被爆後的獎勵表（依類型）。
// qiSec：以「目前每秒靈氣 × 秒數」計算，後期自動隨產出縮放。
// stone/token：區間 [min,max]，再乘 (1 + realmScale × 仇人境界序號)。
// surrender：降服他宗弟子的機率（碾壓／險勝）；artifact：掉落功法法寶的機率。
export const ENEMY_REWARDS = {
  former: { qiSec: [10, 20],   stone: [1, 3],   token: [1, 2], desc: '招賢令、靈石' },
  rival:  { qiSec: [10, 25],   stone: [1, 2],   token: [0, 1], surrender: { crush: 0.7, narrow: 0.3 }, desc: '可降服成為弟子' },
  elder:  { qiSec: [15, 30],   stone: [3, 6],   token: [0, 1], artifact: { crush: 1.0, narrow: 0.5 }, desc: '功法／法寶' },
  trader: { qiSec: [90, 180],  stone: [5, 10],  token: [0, 2], desc: '大量資源' },
};
export const REALM_SCALE = 0.6;        // 獎勵隨仇人境界的成長係數
export const RARE_EXTRA = { token: 1, stone: 3 };   // 護山大陣觸發的稀有額外掉落
