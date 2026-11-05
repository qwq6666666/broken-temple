// 境界資料：凡人 → 煉氣1~9層 → 築基 → 金丹 → 元嬰 → 化神。
// 倍率/成本由 config 公式生成；想逐級手調，可直接覆寫下方 REALMS 的欄位。
import { CONFIG } from '../config.js';

export const TIER_NAMES = ['凡人', '煉氣', '築基', '金丹', '元嬰', '化神'];

const raw = [{ name: '凡人', tier: 0 }];
for (let n = 1; n <= 9; n++) raw.push({ name: `煉氣${'一二三四五六七八九'[n - 1]}層`, tier: 1 });
raw.push({ name: '築基', tier: 2 }, { name: '金丹', tier: 3 }, { name: '元嬰', tier: 4 }, { name: '化神', tier: 5 });

const R = CONFIG.realm;
export const REALMS = raw.map((r, i) => ({
  ...r,
  idx: i,
  mult: R.multBase ** i,                     // 產出倍率
  power: R.powerBase ** i,                   // 戰力
  stoneCost: i === 0 ? 0 : Math.round(R.stoneBase * R.stoneGrowth ** (i - 1)),  // 突破到此境界的靈石
  shardCost: R.shardCosts[i] || 0,           // 突破到此境界的碎片
}));

const SUB = ['初期', '中期', '後期'];

// 仇人用浮點境界 lvl，築基以上顯示「中期」等小階段
export function lvlLabel(lvl) {
  const idx = Math.min(REALMS.length - 1, Math.floor(lvl));
  if (idx >= 10) return REALMS[idx].name + SUB[Math.min(2, Math.floor((lvl - idx) * 3))];
  return REALMS[idx].name;
}
export const tierOfLvl = lvl => REALMS[Math.min(REALMS.length - 1, Math.floor(lvl))].tier;
export const powerOfLvl = lvl => CONFIG.realm.powerBase ** lvl;
