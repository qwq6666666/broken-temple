// 功法／法寶：長老被爆時掉落，永久加成。
// effect 可用鍵：qiMult 靈氣產出 / stoneMult 靈石產出 / clickMult 打坐 /
//               powerMult 戰力 / discipleDiscount 弟子升級折扣 / burstReward 爆擊獎勵
export const ARTIFACTS = [
  { id: 'yinqi',   kind: '功法', name: '《引氣訣》',     emoji: '📜', effect: { qiMult: 0.20 },          desc: '靈氣產出 +20%' },
  { id: 'tuna',    kind: '功法', name: '《吐納真經》',   emoji: '📖', effect: { qiMult: 0.35 },          desc: '靈氣產出 +35%' },
  { id: 'danhuo',  kind: '功法', name: '《丹火心法》',   emoji: '🔥', effect: { stoneMult: 0.25 },       desc: '靈石產出 +25%' },
  { id: 'jingzuo', kind: '功法', name: '《靜坐萬年功》', emoji: '🧘', effect: { clickMult: 1.0 },        desc: '打坐收益 +100%' },
  { id: 'tongqian',kind: '法寶', name: '銅錢劍',         emoji: '⚔️', effect: { powerMult: 0.15 },       desc: '戰力 +15%' },
  { id: 'huxin',   kind: '法寶', name: '護心鏡',         emoji: '🪞', effect: { powerMult: 0.20 },       desc: '戰力 +20%' },
  { id: 'juling',  kind: '法寶', name: '聚靈玉',         emoji: '💎', effect: { qiMult: 0.30 },          desc: '靈氣產出 +30%' },
  { id: 'chuangong',kind:'法寶', name: '傳功玉簡',       emoji: '📿', effect: { discipleDiscount: 0.10 },desc: '弟子升級成本 -10%' },
  { id: 'pixiu',   kind: '法寶', name: '招財貔貅',       emoji: '🐲', effect: { burstReward: 0.15 },     desc: '爆擊獎勵 +15%' },
  { id: 'hunyuan', kind: '功法', name: '《混元功》', emoji: '📕', effect: { qiMult: 0.25 }, desc: '靈氣產出 +25%' },
  { id: 'qiankun', kind: '法寶', name: '乾坤袋', emoji: '👝', effect: { stoneMult: 0.20 }, desc: '靈石產出 +20%' },
  { id: 'jingang', kind: '法寶', name: '金剛符', emoji: '🧿', effect: { powerMult: 0.18 }, desc: '戰力 +18%' },
  { id: 'jubao',   kind: '法寶', name: '聚寶盆', emoji: '🏺', effect: { burstReward: 0.12 }, desc: '爆擊獎勵 +12%' },
  // ── 宿敵專屬（unique：不會從一般掉落／事件取得）──
  { id: 'qian_abacus', unique: true, kind: '法寶', name: '生鏽的算盤', emoji: '🧮', effect: { stoneMult: 0.15 }, desc: '靈石產出 +15%（錢貫）' },
  { id: 'xiao_sword', unique: true, kind: '法寶', name: '斷劍', emoji: '🗡️', effect: { powerMult: 0.12 }, desc: '戰力 +12%（蕭承曜）' },
  { id: 'liu_token', unique: true, kind: '法寶', name: '執法令牌', emoji: '🪪', effect: { burstReward: 0.15 }, desc: '爆擊獎勵 +15%（柳玄素）' },
  { id: 'yun_seal', unique: true, kind: '法寶', name: '掌門信物', emoji: '🔱', effect: { qiMult: 0.30 }, desc: '靈氣產出 +30%（雲渺子）' },
  { id: 'xuan_case', unique: true, kind: '法寶', name: '祖庭劍匣', emoji: '🏺', effect: { powerMult: 0.20, qiMult: 0.20 }, desc: '戰力 +20%、靈氣 +20%（玄機子）' },
];
export const ARTIFACTS_BY_ID = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
