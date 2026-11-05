// 弟子進階：Lv10 時二選一（本輪有效；轉生弟子等級重置時一併重選）。
export const BRANCH_LEVEL = 10;
export const BRANCHES = {
  focus: { name: '專精', icon: '🎯', cost: { mat_cave: 2 }, desc: '派駐在專長相符的建築時貢獻 ×1.25，特性效果 +20%。' },
  might: { name: '悍勇', icon: '⚔️', cost: { mat_spring: 2 }, desc: '提供給宗門的戰力屬性 ×2，探索秘境時貢獻 ×1.3。' },
};
export const BRANCH_KEYS = Object.keys(BRANCHES);
