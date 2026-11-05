// 全域平衡參數：想調整節奏、成本、機率，優先改這裡。
// 所有時間單位以註解為準（ms = 毫秒，Sec = 秒）。
export const CONFIG = {
  tickMs: 100,                 // 固定 tick 長度 (ms)
  maxCatchupTicks: 50,         // 單次畫面更新最多補跑幾個固定 tick，其餘合併成一個大 tick
  maxFrameMs: 30 * 60 * 1000,  // 單次時間差上限（防止系統休眠後暴衝）
  debug: { timeScale: 1 },     // 時間倍率；網址加 ?speed=10 可加速測試

  start: { qi: 0, stone: 0, token: 3, templeLevel: 1 },
  // 打坐（引氣）：有冷卻。收益 = max(保底, 每秒靈氣 × productionSec)，主動最多約為被動產出的 +50%
  click: { cooldownMs: 8000, productionSec: 4, base: 1, perTempleLevel: 0.5 },
  innateQiPerSec: 0.5,                       // 破廟的基礎產出（不受暫停影響）

  building: {
    maxLevel: 10,
    costGrowth: 1.15,          // 成本 = 基礎成本 × costGrowth ^ 目前等級
    slotEvery: 3,              // 每 N 級多一個弟子駐守位（1 + floor((lv-1)/N)）
    levelCapRealmFactor: 0.7,  // 建築等級上限 = min(10, 1 + floor(境界序號 × 0.7))，境界不夠就升不上去
  },

  disciple: {
    baseLevelCap: 10,          // 弟子等級上限基礎值
    capPerArenaLevel: 2,       // 演武場每級 +2 等級上限
    statGrowth: 0.12,          // 每級 +12% 屬性
    costGrowth: 1.22,          // 升級靈氣成本成長
    assignFactor: 0.04,        // 屬性 × 此值 = 派駐時對建築的倍率貢獻
    specialtyMult: 2,          // 專長匹配加成
    elementMult: 1.25,         // 五行與建築相合的小加成
    ownedPowerFactor: 0.02,    // 每點弟子屬性提供的戰力加成（不論是否派駐）
    libraryDiscountPerLevel: 0.04,   // 藏經閣每級：弟子升級成本 -4%
    discountMax: 0.6,
  },

  gacha: {
    tokenStoneCost: 4,         // 1 招賢令 = 4 靈石
    pitySR: 50,                // 50 抽保底 SR 以上
    pitySSR: 90,               // 90 抽保底 SSR 以上
    tenPull: 10,
    tokenTrickleSec: 120,      // 每 120 秒自然獲得 1 招賢令
  },

  realm: {
    multBase: 1.35,            // 境界產出倍率 = multBase ^ 境界序號
    powerBase: 1.6,            // 境界戰力 = powerBase ^ 境界序號（仇人也用同一把尺）
    stoneBase: 4,              // 突破到第 i 境界的靈石成本 = stoneBase × stoneGrowth ^ (i-1)
    stoneGrowth: 2.5,          // 煉氣期（序號 ≤9）每階的成長
    stoneGrowthLate: 3.3,      // 築基以後（序號 ≥10）每階的成長，單獨抽出方便調後期
    shardCosts: { 10: 15, 11: 40, 12: 100, 13: 250 },  // 築基以上另需碎片
    breakMs: 2400,             // 突破演出長度
  },

  building_effect: {
    rareBase: 0.1,             // 稀有事件基礎機率
    rarePerLevel: 0.04,        // 護山大陣每級 +4%
    arenaPowerPerLevel: 0.1,   // 演武場每級 +10% 戰力
  },

  visitor: {
    firstSec: 25,              // 第一位訪客出現時間
    minSec: 50, maxSec: 100,   // 之後每位訪客的間隔
    maxGrudges: 15,            // 復仇簿上限（滿了就不再來人）
    rareWeightScale: 4,        // 稀有類型權重 × (1 + 稀有機率 × 此值)
  },

  endure: {
    disguiseGain: 1,           // 忍氣吞聲 +偽裝值
    streakStep: 0.25,          // 憋屈值：連續忍氣吞聲，損失倍率 +25%/次
    streakMaxMult: 3,          // 損失倍率上限 ×3（亮一手或引爆後歸零）
    rashLossMult: 2,           // 打不過卻亮一手（逞強）：損失 ×2
    elderLossMult: 3,          // 得罪長老：損失 ×3
    loss: { stoneSec: 20, pauseMs: 5 * 60 * 1000 },   // 損失：約 20 秒的靈石產出（隨進度縮放，不會卡死囤積）或 建築暫停 5 分鐘
  },

  conceal: {
    max: 20,                   // 蓄力條滿格所需偽裝值
    timeGainSec: 120,          // 每 120 秒自然 +1 偽裝值
    chargeStepMs: 10 * 60 * 1000,  // 每 10 分鐘
    chargeStepBonus: 0.05,         // +5% 爆發倍率
    chargeMaxMult: 3,              // 上限 ×3
  },

  enemy: {
    growthPerMin: 0.04,        // 仇人每分鐘成長的境界序號（約 25 分鐘一小階）
    alertMult: 0.7,            // 「警覺」仇人的爆擊獎勵倍率
    maxLevel: 13,
  },

  offline: {
    capMs: 8 * 3600 * 1000,    // 離線收益最多算 8 小時
    efficiency: 0.5,           // 離線產出效率（資源與招賢令）；偽裝蓄力與仇人成長照常進行
    minMs: 60 * 1000,          // 離開不到 1 分鐘不結算
    stepMs: 60 * 1000,         // 結算步長
  },
  save: { key: 'broken-temple-save', autosaveMs: 10000 },

  burst: {
    crushRatio: 1.8,           // 玩家戰力 / 仇人戰力 ≥ 此值 → 碾壓
    narrowRatio: 0.85,         // ≥ 此值 → 險勝，否則打不過
    crushMult: 2, narrowMult: 1,
    // 連鎖加成（由大到小比對）
    chain: [{ n: 10, mult: 3 }, { n: 5, mult: 2 }, { n: 3, mult: 1.5 }],
    backfireRatio: 0.4,        // 戰力比低於此值的長老會反噬
    backfire: { stoneSec: 60, pauseMs: 5 * 60 * 1000 },
    recruitStone: 10,          // 招募降服弟子的靈石成本
    stepMs: 2300,              // 每位仇人出場演出時間
  },
};
