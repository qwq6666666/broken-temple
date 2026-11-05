// 道心商店：轉生獲得的「道心」在這裡換永久加成（跨轉生保留）。
// key 對應 core/dao.js 的 perm(s, key)；每級加成 = perLevel；成本 = baseCost × growth ^ 目前等級。
// start* 類只在轉生當下發放（開局資源）。
export const DAO_SHOP = [
  { id: 'qi',      name: '聚靈體質', icon: '✨', key: 'qiMult',       perLevel: 0.10, maxLv: 20, baseCost: 4,  growth: 1.35, unit: '%', desc: '靈氣產出' },
  { id: 'stone',   name: '丹道天賦', icon: '💎', key: 'stoneMult',    perLevel: 0.15, maxLv: 20, baseCost: 5,  growth: 1.35, unit: '%', desc: '靈石產出' },
  { id: 'power',   name: '百戰餘威', icon: '⚔️', key: 'powerMult',    perLevel: 0.08, maxLv: 20, baseCost: 5,  growth: 1.35, unit: '%', desc: '戰力' },
  { id: 'burst',   name: '一怒餘韻', icon: '💥', key: 'burstReward',  perLevel: 0.05, maxLv: 10, baseCost: 6,  growth: 1.4,  unit: '%', desc: '爆擊獎勵' },
  { id: 'disguise',name: '藏鋒心法', icon: '🎭', key: 'disguiseRate', perLevel: 0.05, maxLv: 10, baseCost: 6,  growth: 1.4,  unit: '%', desc: '偽裝增速' },
  { id: 'token',   name: '招賢名聲', icon: '🎫', key: 'tokenRate',    perLevel: 0.10, maxLv: 10, baseCost: 5,  growth: 1.4,  unit: '%', desc: '招賢令自然增速' },
  { id: 'cd',      name: '吐納有道', icon: '🧘', key: 'cdCut',        perLevel: 0.5,  maxLv: 6,  baseCost: 4,  growth: 1.5,  unit: '秒', desc: '打坐冷卻縮短' },
  { id: 'offcap',  name: '神遊太虛', icon: '🌙', key: 'offlineCap',   perLevel: 1,    maxLv: 8,  baseCost: 8,  growth: 1.5,  unit: '小時', desc: '離線收益上限' },
  { id: 'offeff',  name: '守廟靈獸', icon: '🐺', key: 'offlineEff',   perLevel: 0.05, maxLv: 10, baseCost: 8,  growth: 1.45, unit: '%', desc: '離線收益效率' },
  { id: 'startS',  name: '祖產傳承', icon: '🪙', key: 'startStone',   perLevel: 15,   maxLv: 20, baseCost: 3,  growth: 1.3,  unit: '靈石', desc: '轉生後開局靈石' },
  { id: 'startT',  name: '舊部歸附', icon: '📜', key: 'startToken',   perLevel: 1,    maxLv: 10, baseCost: 4,  growth: 1.4,  unit: '招賢令', desc: '轉生後開局招賢令' },
];
export const DAO_SHOP_BY_ID = Object.fromEntries(DAO_SHOP.map(i => [i.id, i]));
