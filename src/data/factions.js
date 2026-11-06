// 勢力：訪客的宗門歸屬到某個勢力。你打臉成功的次數累積「威望」，威望三階各有效果。
// lore 為勢力背景；tierLines[n] 為升到第 n 階時的一句話（寫進年表、勢力頁）。
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
  { id: 'qingyun',  name: '青雲宗',   emoji: '☁️', sects: ['青雲宗'], lean: ['傲慢', '虛偽'], desc: '逐你出門的名門大宗。', perk: { powerMult: 0.05 }, lore: '三千年前由老祖親手創立的名門。如今的掌門只記得「祖訓」，卻忘了祖庭在哪兒。', tierLines: [null, '青雲宗的外門弟子開始繞路走過山門。', '青雲宗的長老們私下議論：那座破廟，也許真的不簡單。', '青雲宗派人送來了祖庭的舊地契，信上只寫了五個字：「對不住了。」'] },
  { id: 'chiyan',   name: '赤焰谷',   emoji: '🔥', sects: ['赤焰谷'], lean: ['暴躁', '狂妄'], desc: '脾氣火爆的煉器世家。', perk: { qiMult: 0.05 }, lore: '赤焰谷靠煉器起家，谷主把「火氣」當成家訓，三代人都沒學會好好說話。', tierLines: [null, '赤焰谷的人路過廟門時，少罵了一句。', '赤焰谷送來一口新爐，附言：「別炸了，貴。」', '赤焰谷谷主親筆題字：「火氣再大，也燒不到你這座廟。」'] },
  { id: 'luoxia',   name: '落霞宗',   emoji: '🌇', sects: ['落霞宗'], lean: ['虛偽', '刻薄'], desc: '自詡風雅的名門。', perk: { stoneMult: 0.05 }, lore: '落霞宗崇尚風雅，連打架都要先吟一首詩。可惜詩總是比拳頭慢。', tierLines: [null, '落霞宗的弟子見到你，開始先行禮再嘲諷。', '落霞宗寄來一幅「風雅圖」，畫的是一座漏雨的廟。', '落霞宗的詩集收錄了一首寫給你的詩——押的是「服」字韻。'] },
  { id: 'xuanbing', name: '玄冰門',   emoji: '❄️', sects: ['玄冰門'], lean: ['傲慢', '刻薄'], desc: '眼高於頂的冰雪門派。', perk: { disguiseRate: 0.10 }, lore: '玄冰門終年積雪，門人眼高於頂，因為脖子被凍僵了，低不下頭。', tierLines: [null, '玄冰門的人看你時，眼皮稍微抬高了一點點。', '玄冰門的掌門破例對你點了頭——大概是脖子終於能動了。', '玄冰門在山門前立了一塊碑，刻的是你的名字。他們說這是「第一次承認」。'] },
  { id: 'bailian',  name: '百煉閣',   emoji: '🔨', sects: ['百煉閣'], lean: ['勢利', '狂妄'], desc: '只認實力的鍛造閣。', perk: { burstReward: 0.05 }, lore: '百煉閣只認一個字：硬。硬的錘子，硬的拳頭，硬的嘴——最後一項尤其硬。', tierLines: [null, '百煉閣的人開始稱你「還行」。', '百煉閣送來一把新錘子，說是「給廟頂釘釘子用」。', '百煉閣閣主說：「這座廟，錘不爛。」那是他們能給的最高評價。'] },
  { id: 'wanjian',  name: '萬劍山莊', emoji: '🗡️', sects: ['萬劍山莊'], lean: ['暴躁', '狂妄'], desc: '劍修聚集的山莊。', perk: { powerMult: 0.05 }, lore: '萬劍山莊有萬把劍，卻只有一個脾氣。劍修多的地方，吵架也多。', tierLines: [null, '萬劍山莊的劍修路過時，會多看你的劍鞘一眼。', '萬劍山莊的莊主與你切磋三招，輸得很有風度，罵得很大聲。', '萬劍山莊的千把劍同時在鞘中輕鳴了一聲。他們說，那是在向你致意。'] },
  { id: 'tianji',   name: '天機閣',   emoji: '🔮', sects: ['天機閣'], lean: ['陰險', '虛偽'], desc: '神神祕祕的算命閣。', perk: { rare: 0.05 }, lore: '天機閣算盡天下事，卻算不準自家掌櫃的生辰。', tierLines: [null, '天機閣的人在你面前停了三息，掐指，然後搖搖頭走了。', '天機閣送來一張卦象：「此人，不好算。」', '天機閣閣主親自上山：「我算了你三十年，今天終於算準一件——你贏了。」'] },
  { id: 'trade',    name: '商盟',     emoji: '🐪', sects: ['南海商隊', '黑市商會', '雲遊散修', '西域駝隊'], lean: ['勢利', '陰險'], desc: '四處奔波的商隊與散修。', perk: { tokenRate: 0.15 }, lore: '商盟的人走遍四海，最怕兩件事：虧本，和遇上你。', tierLines: [null, '商盟的駝隊開始繞到破廟門口歇腳。', '商盟給你開了一個「老主顧」帳戶，利息比別人低半成。', '商盟總舵送來一面金匾：「童叟無欺」，落款是你的名字。'] },
];
export const FACTIONS_BY_ID = Object.fromEntries(FACTIONS.map(f => [f.id, f]));
export const FACTION_OF_SECT = Object.fromEntries(FACTIONS.flatMap(f => f.sects.map(x => [x, f.id])));
