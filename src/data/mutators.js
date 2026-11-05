// 輪迴詞條：轉生時可選一個，本輪有效。有代價、有報酬；dao 為「本輪結算道心」的額外倍率。
// effects 的 key 與道心商店相同（qiMult…），visitFreq 為訪客頻率（+1＝兩倍）。
export const MUTATORS = [
  { id: 'ascetic', name: '苦行', effects: { qiMult: -0.3, dao: 0.3 }, desc: '靈氣產出 -30%；本輪道心 +30%', flavor: '粗茶淡飯，才見真心。' },
  { id: 'poor', name: '貧道', effects: { stoneMult: -0.4, dao: 0.4 }, desc: '靈石產出 -40%；本輪道心 +40%', flavor: '身無長物，一心向道。' },
  { id: 'bustle', name: '盛世', effects: { visitFreq: 1.0, burstReward: 0.2, dao: 0.2 }, desc: '訪客加倍、爆擊獎勵 +20%；本輪道心 +20%', flavor: '人來人往，債主盈門。' },
  { id: 'hermit', name: '隱世', effects: { visitFreq: -0.5, disguiseRate: 0.5, dao: 0.1 }, desc: '訪客減半、偽裝增速 +50%；本輪道心 +10%', flavor: '閉門謝客，蓄勢待發。' },
  { id: 'tribulation', name: '天劫', effects: { powerMult: -0.2, burstReward: 0.4, dao: 0.3 }, desc: '戰力 -20%、爆擊獎勵 +40%；本輪道心 +30%', flavor: '以身試劫，九死一生。' },
];
export const MUTATORS_BY_ID = Object.fromEntries(MUTATORS.map(m => [m.id, m]));
