// 成就：純收集，不影響數值。每個成就解鎖一個稱號，可裝備顯示在標題旁。
// cur(s) 回傳目前進度，達到 target 即解鎖。
import { NEMESES } from './nemeses.js';
const sum = o => Object.values(o || {}).reduce((a, n) => a + n, 0);
export const ACHIEVEMENTS = [
  { id: 'endure100', icon: '😶', name: '忍氣吞聲 100 次', title: '忍者神龜', cur: s => s.stats.endures || 0, target: 100 },
  { id: 'meditate500', icon: '🧘', name: '引氣打坐 500 次', title: '勤修苦練', cur: s => s.stats.meditations, target: 500 },
  { id: 'upgrade50', icon: '🏯', name: '升級建築 50 次', title: '包工頭', cur: s => s.stats.upgrades || 0, target: 50 },
  { id: 'beat30', icon: '👊', name: '當場打臉 30 次', title: '嘴上不饒人', cur: s => s.stats.beats || 0, target: 30 },
  { id: 'burst20', icon: '💥', name: '累計引爆 20 次', title: '爆破專家', cur: s => s.stats.bursts, target: 20 },
  { id: 'chain10', icon: '⛓', name: '單次引爆連鎖 10 人', title: '十面埋伏', cur: s => s.stats.maxChain || 0, target: 10 },
  { id: 'nemall', icon: '⚔️', name: '擊敗所有宿敵', title: '宿敵剋星', cur: s => s.stats.nemesisDefeated || 0, target: NEMESES.length },
  { id: 'disc20', icon: '👥', name: '收集 20 位弟子', title: '廣納門徒', cur: s => s.disciples.length, target: 20 },
  { id: 'star3', icon: '⭐', name: '一位弟子升滿三星', title: '天選之人', cur: s => Math.max(0, ...s.disciples.map(d => d.star || 0)), target: 3 },
  { id: 'art10', icon: '🏺', name: '收集 10 件法寶', title: '藏寶閣主', cur: s => s.artifacts.length, target: 10 },
  { id: 'pull100', icon: '🎫', name: '累計招賢 100 抽', title: '招賢納士', cur: s => s.gacha.total, target: 100 },
  { id: 'exp10', icon: '🧭', name: '秘境探索成功 10 次', title: '探險家', cur: s => s.stats.expeditions || 0, target: 10 },
  { id: 'inc30', icon: '📜', name: '處理 30 則突發事件', title: '見多識廣', cur: s => s.stats.incidents || 0, target: 30 },
  { id: 'story20', icon: '📖', name: '讀完 20 章弟子故事', title: '說書人', cur: s => sum(s.stories), target: 20 },
  { id: 'cm25', icon: '📋', name: '完成 25 張委託', title: '勤快的宗主', cur: s => s.commissions.done, target: 25 },
  { id: 'goal12', icon: '🎯', name: '完成 12 件宗門大事', title: '大事為先', cur: s => s.goalsDone.length, target: 12 },
  { id: 'asc1', icon: '⚡', name: '渡過 1 道天劫', title: '初渡劫', cur: s => s.ascend.done.length, target: 1 },
  { id: 'asc9', icon: '🏯', name: '九重天劫全部渡過', title: '祖庭守廟人', cur: s => s.ascend.done.length, target: 9 },
  { id: 'fruit50', icon: '🍑', name: '道果累計升級 50 次', title: '果位圓滿', cur: s => ['fruitQi', 'fruitStone', 'fruitPower'].reduce((a, id) => a + (s.reincarnation.shop[id] || 0), 0), target: 50 },
  { id: 'story51', icon: '🌙', name: '讀完 10 章弟子終章', title: '故事的盡頭', cur: s => Object.values(s.stories || {}).filter(n => n >= 3).length, target: 10 },
  { id: 'reb1', icon: '☯️', name: '轉生 1 次', title: '輪迴客', cur: s => s.reincarnation.count, target: 1 },
  { id: 'reb3', icon: '☯️', name: '轉生 3 次', title: '三世因果', cur: s => s.reincarnation.count, target: 3 },
  { id: 'reb10', icon: '☯️', name: '轉生 10 次', title: '萬劫不滅', cur: s => s.reincarnation.count, target: 10 },
];
export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
