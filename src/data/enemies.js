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

// 個性偏好：決定這個人被擊敗時「多給什麼」（不改戰鬥，只改收穫與風險）。
// 乘數鍵：qi/stone/token/surrender/artifact/all；growth＝成長速度；shard＝額外碎片。
export const PERSONALITY_BIAS = {
  勢利: { stone: 1.5, qi: 0.8, label: '靈石 ×1.5' },
  傲慢: { qi: 1.4, stone: 0.9, label: '靈氣 ×1.4' },
  刻薄: { shard: 1, label: '額外 +1 碎片' },
  虛偽: { surrender: 1.5, label: '更容易降服' },
  暴躁: { growth: 1.5, all: 1.25, label: '成長快 ×1.5・獎勵 +25%' },
  陰險: { artifact: 1.5, label: '更容易掉法寶' },
  狂妄: { token: 1.5, label: '招賢令 ×1.5' },
};
// 放過養成：本次引爆被放過的仇人「熟成」一次：獎勵 +25%（最多 4 次）、境界 +0.3；仍占復仇簿名額
export const RIPE = { per: 0.25, max: 4, lvl: 0.3 };
// 仇人記憶：被擊敗的普通仇人回頭時更強、獎勵更多；擊敗 3 次成為「老對頭」
export const FOE = { titleAt: 3, lvl: 0.3, reward: 0.2, titleMerit: 2 };
// 宿敵弱點：陣容沒有命中其弱點專長時，碾壓門檻 ×1.5（弱點專長見 data/squad.js 的 COUNTER_SPEC）
export const WEAK_MISS_MULT = 1.5;
