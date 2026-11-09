// 境界資料：凡人 → 煉氣1~9層 → 築基 → 金丹 → 元嬰 → 化神。
// 倍率/成本由 config 公式生成；想逐級手調，可直接覆寫下方 REALMS 的欄位。
import { CONFIG } from '../config.js';
import { REALM_MATS } from './materials.js';

export const TIER_NAMES = ['凡人', '煉氣', '築基', '金丹', '元嬰', '化神'];

// 26 階：凡人(0)、煉氣一～九層(1~9)、築基／金丹／元嬰／化神 各分 初期／中期／後期／圓滿(10~25)。
// 舊版是 14 階（築基=10、金丹=11、元嬰=12、化神=13）；很多資料仍以舊序號（big）書寫，用 legacyIdx / fromLegacy 換算。
export const SUB_NAMES = ['初期', '中期', '後期', '圓滿'];
const BIGS = ['築基', '金丹', '元嬰', '化神'];
const raw = [{ name: '凡人', tier: 0, big: 0, sub: null, f: 0 }];
for (let n = 1; n <= 9; n++) raw.push({ name: `煉氣${'一二三四五六七八九'[n - 1]}層`, tier: 1, big: n, sub: null, f: n });
BIGS.forEach((nm, bi) => SUB_NAMES.forEach((sn, k) => raw.push({ name: nm + sn, tier: 2 + bi, big: 10 + bi, sub: k, f: 10 + bi + k / 4 })));

const R = CONFIG.realm;
// 靈石成本：舊序號 ≤9 用 stoneGrowth，之後每個大境界改用 stoneGrowthLate（累乘）；大境界內的小階每階再 ×subGrowth
const stoneCostAt = i => {
  if (i === 0) return 0;
  let c = R.stoneBase;
  for (let k = 2; k <= i; k++) c *= k <= 9 ? R.stoneGrowth : R.stoneGrowthLate;
  return Math.round(c);
};
// 秘境材料分攤：總量 v 分給 4 階，第 k 階拿 ceil((k+1)v/4) − ceil(kv/4)（例：2→[1,0,1,0]、3→[1,1,0,1]、4→[1,1,1,1]）；煉氣不需要
const matSplit = r => {
  const tot = REALM_MATS[r.big]; if (!tot) return null;
  if (r.sub == null) return { ...tot };
  const out = {};
  for (const [k, v] of Object.entries(tot)) { const n = Math.ceil((r.sub + 1) * v / 4) - Math.ceil(r.sub * v / 4); if (n > 0) out[k] = n; }
  return Object.keys(out).length ? out : null;
};
export const REALMS = raw.map((r, i) => ({
  ...r,
  idx: i,
  mult: R.multBase ** r.f,                   // 產出倍率（f 是舊序號的小數：小階在兩個大境界之間內插）
  power: R.powerBase ** r.f,                 // 戰力
  stoneCost: r.sub == null ? stoneCostAt(r.big) : Math.max(1, Math.round(stoneCostAt(r.big) * R.subShare[r.sub])),   // 突破到此階的靈石（大境界總額依 subShare 分攤）
  matCost: matSplit(r),                      // 秘境材料：大境界的總量分攤到四階（每階一點，隨探索節奏逐階突破）
}));
export const TOP_IDX = REALMS.length - 1;

// 舊序號（0..13）⇄ 新序號（0..25）
export const legacyIdx = j => REALMS[Math.max(0, Math.min(TOP_IDX, j))].big;
export const legacyF = j => REALMS[Math.max(0, Math.min(TOP_IDX, j))].f;
export const fromLegacy = i => (i <= 10 ? i : Math.min(TOP_IDX, 10 + (i - 10) * 4));
// 以舊序號書寫的條件（解鎖、事件、詞條門檻）用這個比較：築基以上整個大境界都算同一個舊序號
export const bigOf = s => legacyIdx(s.realmIdx);


// 仇人用浮點境界 lvl，築基以上顯示「中期」等小階段
export function lvlLabel(lvl) {
  const idx = Math.min(REALMS.length - 1, Math.floor(lvl));
  return idx >= 10 ? BIGS[Math.min(3, idx - 10)] + SUB_NAMES[Math.min(3, Math.floor((lvl - idx) * 4))] : REALMS[idx].name;
}
export const tierOfLvl = lvl => REALMS[fromLegacy(Math.min(13, Math.floor(lvl)))].tier;       // lvl 是舊序號尺度（仇人等級）
export const powerOfLvl = lvl => CONFIG.realm.powerBase ** lvl;
