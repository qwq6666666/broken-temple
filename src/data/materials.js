// 秘境材料：每個秘境固定產一種，存在 s.res['mat_' + 秘境id]（跨轉生保留）。
// 用途：主角跨大境界突破（築基／金丹／元嬰／化神）、弟子進階分支。碎片與招賢令不再由秘境產出。
export const MATERIALS = {
  cave:   { name: '洞府殘玉', icon: '💠' },
  spring: { name: '靈泉露',   icon: '💧' },
  field:  { name: '戰場殘鋒', icon: '🗡️' },
  swamp:  { name: '瘴靈草',   icon: '🍄' },
  valley: { name: '藥王花',   icon: '🌺' },
  maze:   { name: '陣紋玉',   icon: '🔶' },
  sky:    { name: '雲台星砂', icon: '✨' },
  abyss:  { name: '龍脈精華', icon: '🐲' },
};
export const matKey = id => 'mat_' + id;
export const MAT_KEYS = Object.keys(MATERIALS).map(matKey);
// 每個秘境單次成功的產量區間（失敗固定 1）；探索度每級 +10%
export const MAT_YIELD = { cave: [1, 2], spring: [1, 2], field: [2, 4], swamp: [2, 4], valley: [2, 4], maze: [2, 4], sky: [3, 5], abyss: [3, 5] };
// 主角跨大境界突破所需材料（突破到該境界序號）
export const REALM_MATS = {
  10: { mat_field: 2, mat_valley: 2 },       // 築基
  11: { mat_swamp: 3, mat_maze: 3 },         // 金丹
  12: { mat_sky: 4 },                        // 元嬰
  13: { mat_abyss: 4 },                      // 化神
};
// 功勳：委託、擊敗仇人、探索獲得；在招賢處兌換招賢令
export const MERIT = { perToken: 6, commission: 2, nemesis: 5, perDefeat: 1, expedition: 1 };
// 靈石買招賢令：每遊戲小時限購，越買越貴
export const TOKEN_SHOP = { limit: 6, windowMs: 3600000, step: 0.5 };
