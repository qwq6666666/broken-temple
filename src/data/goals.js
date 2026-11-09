// 宗門大事：階段目標。cur(s) 回傳目前進度，達到 target 即完成並發獎勵。
// reward 可含 stone / token / qi（直接發放）與 perm（永久加成，鍵同法寶：qiMult、stoneMult、powerMult…）。
import { REALMS, bigOf, fromLegacy } from './realms.js';
import { NEMESES } from './nemeses.js';
import { ARTIFACTS, ARTIFACTS_BY_ID } from './artifacts.js';
import { DISCIPLES } from './disciples.js';
const FRUIT_IDS = ['fruitQi', 'fruitStone', 'fruitPower'];
const NORMAL_ARTS = ARTIFACTS.filter(a => !a.unique).length;
const normalArts = s => s.artifacts.filter(id => !ARTIFACTS_BY_ID[id].unique).length;
const BASE6 = ['temple', 'field', 'alchemy', 'library', 'arena', 'array'];     // 後期建築不計入「全建築」目標
const minBuilding = s => Math.min(...BASE6.map(id => s.buildings[id].lv));
const maxStar = s => Math.max(0, ...s.disciples.map(d => d.star || 0));
const realm = i => ({ cur: s => bigOf(s), target: i });

export const GOALS = [
  { id: 'burst1',  name: '不裝了', desc: '完成第一次引爆', cur: s => s.stats.bursts, target: 1, reward: { token: 3, stone: 5 } },
  { id: 'qi5',     name: '煉氣有成', desc: `突破至${REALMS[fromLegacy(5)].name}`, ...realm(5), reward: { stone: 20, perm: { qiMult: 0.05 } } },
  { id: 'disc5',   name: '小有門徒', desc: '收集 5 位弟子', cur: s => s.disciples.length, target: 5, reward: { token: 3 } },
  { id: 'inc10',   name: '見多識廣', desc: '處理 10 則突發事件', cur: s => s.stats.incidents || 0, target: 10, reward: { token: 5, stone: 20 } },
  { id: 'nem1',    name: '第一滴血', desc: '擊敗第一位宿敵', cur: s => s.stats.nemesisDefeated || 0, target: 1, reward: { token: 5, perm: { qiMult: 0.05 } } },
  { id: 'story5',  name: '傾聽者', desc: '讀完 5 章弟子故事', cur: s => Object.values(s.stories || {}).reduce((a, n) => a + n, 0), target: 5, reward: { token: 5, stone: 20 } },
  { id: 'story20', name: '宗門說書人', desc: '讀完 20 章弟子故事', cur: s => Object.values(s.stories || {}).reduce((a, n) => a + n, 0), target: 20, reward: { token: 12, perm: { qiMult: 0.05 } } },
  { id: 'bld3',    name: '宗門初具規模', desc: '六棟建築都達 30 級', cur: minBuilding, target: 30, reward: { stone: 30, perm: { stoneMult: 0.05 } } },
  { id: 'chain3',  name: '三連', desc: '單次引爆連鎖達 3 人', cur: s => s.stats.maxChain || 0, target: 3, reward: { token: 5 } },
  { id: 'burst5',  name: '習慣性打臉', desc: '累計引爆 5 次', cur: s => s.stats.bursts, target: 5, reward: { token: 5, perm: { burstReward: 0.05 } } },
  { id: 'art3',    name: '初得機緣', desc: '獲得 3 件功法／法寶', cur: normalArts, target: 3, reward: { stone: 50 } },
  { id: 'qi9',     name: '煉氣圓滿', desc: `突破至${REALMS[fromLegacy(9)].name}`, ...realm(9), reward: { token: 8, perm: { powerMult: 0.05 } } },
  { id: 'disc10',  name: '人才濟濟', desc: '收集 10 位弟子', cur: s => s.disciples.length, target: 10, reward: { token: 8 } },
  { id: 'zhuji',   name: '築基成功', desc: `突破至${REALMS[fromLegacy(10)].name}`, ...realm(10), reward: { token: 10, perm: { qiMult: 0.10 } } },
  { id: 'chain5',  name: '五連鞭', desc: '單次引爆連鎖達 5 人', cur: s => s.stats.maxChain || 0, target: 5, reward: { token: 10, perm: { burstReward: 0.05 } } },
  { id: 'star3',   name: '精益求精', desc: '任一弟子升到 3 星', cur: maxStar, target: 3, reward: { token: 10 } },
  { id: 'bld5',    name: '氣象一新', desc: '六棟建築都達 50 級', cur: minBuilding, target: 50, reward: { token: 10, perm: { stoneMult: 0.10 } } },
  { id: 'jindan',  name: '金丹大道', desc: `突破至${REALMS[fromLegacy(11)].name}`, ...realm(11), reward: { token: 12, perm: { powerMult: 0.10 } } },
  { id: 'art9',    name: '收藏家', desc: `集齊全部 ${NORMAL_ARTS} 件功法／法寶`, cur: normalArts, target: NORMAL_ARTS, reward: { token: 15, perm: { qiMult: 0.15 } } },
  { id: 'chain10', name: '十連爆！', desc: '單次引爆連鎖達 10 人', cur: s => s.stats.maxChain || 0, target: 10, reward: { token: 20, perm: { burstReward: 0.10 } } },
  { id: 'disc20',  name: '桃李滿天下', desc: `收集全部 ${DISCIPLES.length} 位弟子`, cur: s => s.disciples.length, target: DISCIPLES.length, reward: { token: 20 } },
  { id: 'bld10',   name: '天下第一宗（建築）', desc: '六棟建築全部滿級', cur: minBuilding, target: 100, reward: { token: 25, perm: { qiMult: 0.25 } } },
  { id: 'nemAll',  name: '舊債還清', desc: '擊敗全部宿敵，揭開破廟真相', cur: s => s.stats.nemesisDefeated || 0, target: NEMESES.filter(n => !n.epilogue && !n.side).length, reward: { token: 30, perm: { powerMult: 0.10, qiMult: 0.10 } } },
  { id: 'huashen', name: '化神', desc: `突破至${REALMS[fromLegacy(13)].name}`, ...realm(13), reward: { token: 30, perm: { powerMult: 0.20 } } },
  // ── 後期大事（轉生多次之後的長期目標）──
  { id: 'reb3',    name: '三世輪迴', desc: '轉生 3 次', cur: s => s.reincarnation.count, target: 3, reward: { token: 15, perm: { qiMult: 0.03 } } },
  { id: 'awake3',  name: '舊敵新生', desc: '宿敵覺醒階數累計 3 階', cur: s => Object.values(s.nemeses).reduce((a, n) => a + (n.awakeLv || 0), 0), target: 3, reward: { token: 20, perm: { powerMult: 0.04 } } },
  { id: 'cm100',   name: '委託達人', desc: '完成 100 張宗門委託', cur: s => s.commissions.done, target: 100, reward: { token: 30, perm: { stoneMult: 0.04 } } },
  { id: 'insall',  name: '心得大成', desc: '五種專長心得全部領悟（15 層）', cur: s => Object.values(s.insight || {}).reduce((a, n) => a + n, 0), target: 15, reward: { token: 25, perm: { qiMult: 0.04 } } },
  { id: 'artall',  name: '藏寶閣圓滿', desc: '收集全部功法法寶', cur: s => s.artifacts.length, target: ARTIFACTS.length, reward: { token: 30, perm: { burstReward: 0.08 } } },
  { id: 'reb10',   name: '十世修行', desc: '轉生 10 次', cur: s => s.reincarnation.count, target: 10, reward: { token: 40, perm: { stoneMult: 0.05, qiMult: 0.05 } } },
  // ── 化神之後：天劫與道果 ──
  { id: 'asc3',    name: '雷劫已過', desc: '渡過 3 道天劫', cur: s => s.ascend.done.length, target: 3, reward: { token: 20, perm: { qiMult: 0.03 } } },
  { id: 'asc6',    name: '心魔已斬', desc: '渡過 6 道天劫', cur: s => s.ascend.done.length, target: 6, reward: { token: 30, perm: { stoneMult: 0.03 } } },
  { id: 'asc9',    name: '破廟飛升', desc: '九重天劫全部渡過', cur: s => s.ascend.done.length, target: 9, reward: { token: 50, perm: { powerMult: 0.05 } } },
  { id: 'fruit20', name: '道果初成', desc: '道果累計升級 20 次', cur: s => FRUIT_IDS.reduce((a, id) => a + (s.reincarnation.shop[id] || 0), 0), target: 20, reward: { token: 40, perm: { burstReward: 0.05 } } },
  { id: 'fruit100', name: '道果纍纍', desc: '道果累計升級 100 次', cur: s => FRUIT_IDS.reduce((a, id) => a + (s.reincarnation.shop[id] || 0), 0), target: 100, reward: { token: 80, perm: { qiMult: 0.05, stoneMult: 0.05 } } },
];
export const GOALS_BY_ID = Object.fromEntries(GOALS.map(g => [g.id, g]));
