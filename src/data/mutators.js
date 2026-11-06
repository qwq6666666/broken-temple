// 輪迴詞條：轉生時可選一個，本輪有效。有代價、有報酬；dao 為「本輪結算道心」的額外倍率。
// effects 的 key 與道心商店相同（qiMult…），visitFreq 為訪客頻率（+1＝兩倍）。
export const MUTATORS = [
  { id: 'ascetic', name: '苦行', effects: { qiMult: -0.3, dao: 0.3 }, desc: '靈氣產出 -30%；本輪道心 +30%', flavor: '粗茶淡飯，才見真心。' },
  { id: 'poor', name: '貧道', effects: { stoneMult: -0.4, dao: 0.4 }, desc: '靈石產出 -40%；本輪道心 +40%', flavor: '身無長物，一心向道。' },
  { id: 'bustle', name: '盛世', effects: { visitFreq: 1.0, burstReward: 0.2, dao: 0.2 }, desc: '訪客加倍、爆擊獎勵 +20%；本輪道心 +20%', flavor: '人來人往，債主盈門。' },
  { id: 'hermit', name: '隱世', effects: { visitFreq: -0.5, disguiseRate: 0.5, dao: 0.1 }, desc: '訪客減半、偽裝增速 +50%；本輪道心 +10%', flavor: '閉門謝客，蓄勢待發。' },
  { id: 'tribulation', name: '天劫', effects: { powerMult: -0.2, burstReward: 0.4, dao: 0.3 }, desc: '戰力 -20%、爆擊獎勵 +40%；本輪道心 +30%', flavor: '以身試劫，九死一生。' },
  // ── 第二批：取捨更鮮明的詞條（只用既有效果鍵，代價與報酬都寫在 desc）──
  { id: 'harvest', name: '豐年', effects: { stoneMult: 0.35, qiMult: -0.2, dao: 0.15 }, desc: '靈石產出 +35%、靈氣產出 -20%；本輪道心 +15%', flavor: '穀賤傷農，錢袋卻鼓了。' },
  { id: 'swordfool', name: '劍癡', effects: { powerMult: 0.3, stoneMult: -0.3, dao: 0.2 }, desc: '戰力 +30%、靈石產出 -30%；本輪道心 +20%', flavor: '一劍在手，餓死也不虧。' },
  { id: 'scout', name: '廣納賢才', effects: { tokenRate: 0.6, qiMult: -0.25, dao: 0.2 }, desc: '招賢令自然增速 +60%、靈氣產出 -25%；本輪道心 +20%', flavor: '山門大開，連野狗都收。' },
  { id: 'brawl', name: '好鬥', effects: { visitFreq: 0.6, burstReward: 0.3, disguiseRate: -0.4, dao: 0.25 }, desc: '訪客 +60%、爆擊獎勵 +30%、偽裝增速 -40%；本輪道心 +25%', flavor: '藏不住火氣，也不想藏。' },
  { id: 'idler', name: '怠惰', effects: { cdCut: -3, offlineEff: 0.3, dao: 0.1 }, desc: '打坐冷卻 +3 秒、離線收益效率 +30%；本輪道心 +10%', flavor: '人在榻上，靈氣自己會來。' },
  { id: 'glass', name: '琉璃身', effects: { powerMult: -0.35, burstReward: 0.7, dao: 0.4 }, desc: '戰力 -35%、爆擊獎勵 +70%；本輪道心 +40%', flavor: '一碰就碎，碎了也要響。' },
  { id: 'gambler', name: '豪賭', effects: { stoneMult: 0.5, qiMult: -0.4, visitFreq: 0.4, dao: 0.25 }, desc: '靈石產出 +50%、靈氣產出 -40%、訪客 +40%；本輪道心 +25%', flavor: '壓上全部身家，只賭一把。' },
  { id: 'academy', name: '書院', effects: { discipleCap: 3, qiMult: -0.25, dao: 0.2 }, desc: '弟子等級上限 +3、靈氣產出 -25%；本輪道心 +20%', flavor: '廟裡多了讀書聲，少了香火錢。' },
];
export const MUTATORS_BY_ID = Object.fromEntries(MUTATORS.map(m => [m.id, m]));
