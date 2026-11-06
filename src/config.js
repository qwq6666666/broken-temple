// 全域平衡參數：想調整節奏、成本、機率，優先改這裡。
// 所有時間單位以註解為準（ms = 毫秒，Sec = 秒）。
export const CONFIG = {
  tickMs: 100,                 // 固定 tick 長度 (ms)
  maxCatchupTicks: 50,         // 單次畫面更新最多補跑幾個固定 tick，其餘合併成一個大 tick
  maxFrameMs: 30 * 60 * 1000,  // 單次時間差上限（防止系統休眠後暴衝）
  debug: { timeScale: 1 },     // 時間倍率；網址加 ?speed=10 可加速測試

  start: { qi: 0, stone: 0, token: 3, templeLevel: 10 },    // 破廟開局 10 級（舊刻度的 1 級）
  // 打坐（引氣）：有冷卻。收益 = max(保底, 每秒靈氣 × productionSec)，主動最多約為被動產出的 +50%
  click: { cooldownMs: 8000, productionSec: 4, base: 1, perTempleLevel: 0.5 },
  innateQiPerSec: 0.5,                       // 破廟的基礎產出（不受暫停影響）

  building: {
    maxLevel: 100,             // 境界給的等級上限（化神時）。道心商店「擴建」可再往上加（見 data/daoShop.js 的 expand）
    hardMax: 1000,             // 絕對上限（存檔清理用）：100 + 擴建 90 級 × 10
    levelScale: 10,            // 刻度：舊版滿級 10 級，現在 100 級。資料裡的「每級成本／產出／效果」仍以舊刻度書寫，程式再除以這個值
    costGrowth: 1.0141,        // 成本 = 基礎成本 ÷ levelScale × costGrowth ^ 目前等級（100 級合計成長仍約 1.15^10 ≈ 4 倍）
    slotEvery: 30,             // 每 N 級多一個弟子駐守位（1 + floor((lv-1)/N)）：第 1／31／61／91 級
    levelCapBase: 10,          // 凡人時的等級上限（相當於舊版第 1 級）
    levelCapRealmFactor: 6.93, // 建築等級上限 = min(100, 10 + floor(境界序號 × 6.93))，境界不夠就升不上去
    produceNorm: 1.4,          // 產出建築的每級產出 = 舊值 ÷ levelScale ÷ produceNorm（讓下面的里程碑倍率整體中性）
    // 里程碑：等級達到時，會產出的建築（破廟／靈田／煉丹房）產出累計倍率。取不超過目前等級的最後一項
    // 100 級之後每 100 級再 ×1.25（累計：200 級 2.5、1000 級約 14.9），讓擴建出來的等級有盼頭
    milestones: [[10, 1.1], [25, 1.25], [50, 1.5], [75, 1.75], [100, 2], [200, 2.5], [300, 3.13], [400, 3.9], [500, 4.88], [600, 6.1], [700, 7.63], [800, 9.54], [900, 11.92], [1000, 14.9]],
  },

  // 補滿空位的建築價值權重（× 建築等級）：把弟子放進「實際產出價值高」的建築。0 表示不考慮（如不產出的建築）
  assignValue: { temple: 1, field: 3, alchemy: 4, library: 0.3, arena: 0.5, array: 0.3, tower: 0.5, hall: 0.3, beast: 0.3 },   // 靈氣／靈石建築偏重。48 種子模擬：與等權的首輪化神耗時無顯著差異（2.23 vs 2.24 小時），只是放置結果更合理
  // 五行：同棟相生／相剋對貢獻的加減，以及仇人的五行克制（已派駐弟子 vs 仇人）
  element: {
    enabled: true,
    shengBonus: 0.10,        // 建築或同棟弟子「生」你 → 你的貢獻 +10%
    keBonus: -0.05,          // 建築或同棟弟子「剋」你 → 你的貢獻 -5%
    enemyBeat: 0.03,         // 每位已派駐、五行剋制該仇人的弟子：戰力比 +3%
    enemyBeaten: 0.02,       // 每位已派駐、被該仇人剋制的弟子：戰力比 -2%
    enemyMin: 0.85, enemyMax: 1.20,
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
    starMax: 3,                // 升星上限
    starBonus: 0.25,           // 每星：屬性與特性效果 +25%
    starCap: 2,                // 每星：該弟子等級上限 +2
    // 升到第 1/2/3 星所需碎片（依稀有度）；碎片與築基以上突破共用，需要取捨
    starCost: { N: [5, 15, 40], R: [8, 24, 60], SR: [12, 36, 90], SSR: [20, 60, 150], UR: [30, 90, 220] },
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
    gapMs: 5 * 60 * 1000,      // 分頁被凍結／電腦休眠超過 5 分鐘 → 視為離線，與關閉分頁行為一致
  },
  // 轉生：化神後可轉生，依本輪表現換取道心。
  // 道心 = base（隨轉生次數小幅成長）+ 引爆(上限) + 連鎖×2 + 擊敗宿敵×5 + 完成大事×2
  // 自動加成：前 softCap 次每次 +10% 靈氣／靈石，之後每次只 +tail（避免轉生循環無限縮短）
  reincarnation: { minRealm: 13, daoBase: 10, daoBasePerCount: 1, daoBaseMax: 30, burstCap: 40, perBurst: 1, perChain: 2, perNemesis: 5, perGoal: 2,
                   autoBonusPerCount: 0.10, autoBonusSoftCap: 10, autoBonusTail: 0.01 },
  nemesis: { chance: 0.5, maxPresent: 3 },    // 宿敵條件滿足後，每次訪客有多少機率換成宿敵；場上（訪客＋復仇簿）同時最多幾位
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
