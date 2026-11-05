// 勢力：訪客的宗門歸屬到某個勢力。你打臉成功的次數累積「威望」，威望三階各有效果。
// thresholds 為各階所需威望；perk 為第三階（俯首稱臣）的永久加成（key 同道心商店）。
export const FACTION_TIERS = ['無名', '略有耳聞', '聞風喪膽', '俯首稱臣'];
export const FACTION_RULES = {
  thresholds: [10, 30, 60],
  tier1Reward: 0.10,                 // 第一階起：打該勢力的人，獎勵 +10%
  returnChance: 0.35,                // 被碾壓的仇人日後回頭的機率
  returnDelayMin: [6, 14],           // 回頭時間（遊戲分鐘）
  revengeLvlBonus: 1.0,              // 復仇者：境界 +1（他們去修煉了）
  revengeReward: 1.5,                // 復仇者被爆擊的獎勵 ×1.5
  pleadBase: 0.2, pleadPerTier: 0.2, // 回頭時選擇「求和」而非「復仇」的機率 = 基礎 + 每階
  leanWeight: 3,                     // 勢力偏好的個性，被抽中的權重倍數
  sweep: { at: 3, per: 0.1, max: 0.5 }, // 一網打盡：同一勢力一次擊敗 ≥3 人，該勢力每人獎勵 +10%×(人數-2)，上限 +50%
  tribute: { perTier: 0.06 },        // 進貢：第 2 階起，每位訪客有 (階級-1)×6% 機率改為該勢力派人進貢（第 3 階 12%）
  pleadGiftSec: 60,                  // 求和賠禮：約 60 秒靈石產出（第三階 ×2）
};
export const FACTIONS = [
  { id: 'qingyun',  name: '青雲宗',   emoji: '☁️', sects: ['青雲宗'], lean: ['傲慢', '虛偽'], desc: '逐你出門的名門大宗。', perk: { powerMult: 0.05 } },
  { id: 'chiyan',   name: '赤焰谷',   emoji: '🔥', sects: ['赤焰谷'], lean: ['暴躁', '狂妄'], desc: '脾氣火爆的煉器世家。', perk: { qiMult: 0.05 } },
  { id: 'luoxia',   name: '落霞宗',   emoji: '🌇', sects: ['落霞宗'], lean: ['虛偽', '刻薄'], desc: '自詡風雅的名門。', perk: { stoneMult: 0.05 } },
  { id: 'xuanbing', name: '玄冰門',   emoji: '❄️', sects: ['玄冰門'], lean: ['傲慢', '刻薄'], desc: '眼高於頂的冰雪門派。', perk: { disguiseRate: 0.10 } },
  { id: 'bailian',  name: '百煉閣',   emoji: '🔨', sects: ['百煉閣'], lean: ['勢利', '狂妄'], desc: '只認實力的鍛造閣。', perk: { burstReward: 0.05 } },
  { id: 'wanjian',  name: '萬劍山莊', emoji: '🗡️', sects: ['萬劍山莊'], lean: ['暴躁', '狂妄'], desc: '劍修聚集的山莊。', perk: { powerMult: 0.05 } },
  { id: 'tianji',   name: '天機閣',   emoji: '🔮', sects: ['天機閣'], lean: ['陰險', '虛偽'], desc: '神神祕祕的算命閣。', perk: { rare: 0.05 } },
  { id: 'trade',    name: '商盟',     emoji: '🐪', sects: ['南海商隊', '黑市商會', '雲遊散修', '西域駝隊'], lean: ['勢利', '陰險'], desc: '四處奔波的商隊與散修。', perk: { tokenRate: 0.15 } },
];
export const FACTIONS_BY_ID = Object.fromEntries(FACTIONS.map(f => [f.id, f]));
export const FACTION_OF_SECT = Object.fromEntries(FACTIONS.flatMap(f => f.sects.map(x => [x, f.id])));
