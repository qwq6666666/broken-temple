// 宗門榮耀：用已累積的進度換算「榮耀值」，分 10 級；每級永久靈氣／靈石／戰力 +1%（上限 +10%）。
// 只算「只增不減」的進度，所以等級不會倒退。給轉生很多次之後仍有方向的長期目標。
export const GLORY_LEVELS = [
  { at: 30,  name: '小有名氣' }, { at: 70,  name: '一方宗門' }, { at: 120, name: '聲名遠播' }, { at: 180, name: '名門大派' }, { at: 250, name: '宗門鼎盛' },
  { at: 330, name: '威震一方' }, { at: 420, name: '天下聞名' }, { at: 520, name: '萬宗來朝' }, { at: 640, name: '一代宗師' }, { at: 780, name: '天下第一宗' },
];
export const GLORY_PER_LEVEL = 0.01;
export const GLORY_KEYS = ['qiMult', 'stoneMult', 'powerMult'];
// 各項進度折算的榮耀值：[標籤, 取值函式, 權重]
export const GLORY_SOURCES = [
  ['轉生', s => s.reincarnation.count, 6],
  ['宗門大事', s => s.goalsDone.length, 2],
  ['成就', s => s.achv.done.length, 3],
  ['擊敗宿敵', s => s.stats.nemesisDefeated || 0, 4],
  ['宿敵覺醒階數', s => Object.values(s.nemeses).reduce((a, n) => a + (n.awakeLv || 0), 0), 5],
  ['專長心得', s => Object.values(s.insight || {}).reduce((a, n) => a + n, 0), 1],
  ['法寶', s => s.artifacts.length, 1],
  ['弟子', s => s.disciples.length, 1],
  ['渡過天劫', s => s.ascend.done.length, 8],
  ['弟子故事', s => Object.values(s.stories || {}).reduce((a, n) => a + n, 0), 0.5],
  ['宗門委託', s => Math.min(100, s.commissions.done), 0.2],
];
