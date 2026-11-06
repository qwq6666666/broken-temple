// 新手引導：分頁漸進解鎖與「下一步」提示。解鎖旗標存進存檔，轉生後也保留。
import { REALMS } from '../data/realms.js';
import { GOALS } from '../data/goals.js';
import { BUILDINGS } from '../data/buildings.js';
import { canAfford } from './resources.js';
import { upgradeCost, isCapped } from './buildings.js';
import { nextRealm, breakCost, canBreak } from './realm.js';
import { canBurst } from './burst.js';
import { canRebirth } from './dao.js';
import { slots } from './buildings.js';
import { isDone } from './goals.js';
import { toast, cue } from './events.js';
import { nextChapter } from './stories.js';
import { BRANCHES } from '../data/branches.js';
import { canChoose as canSpec } from './spec.js';
import { SPECS } from '../data/specs.js';
import { readyCount } from './commissions.js';
import { canBranch } from './disciples.js';
import { INSIGHTS } from '../data/insights.js';
import { canLearn, insightActive } from './insight.js';
import { EQUIP_SLOTS } from '../data/artifacts.js';
import { slotCount, freeDisciples } from './expeditions.js';

// 各分頁的解鎖條件（建築、境界一開始就有）
export const TAB_RULES = {
  gacha:     { name: '招賢',   when: s => s.realmIdx >= 1 || s.gacha.total > 0 || s.disciples.length > 0 },
  disciples: { name: '弟子',   when: s => s.disciples.length > 0 || s.recruits.length > 0 },
  avenge:    { name: '復仇簿', when: s => s.grudges.length > 0 || !!s.visitor.current || s.stats.bursts > 0 },
  expedition: { name: '秘境',  when: s => s.realmIdx >= 2 || s.expeditions.length > 0 },
  factions:  { name: '勢力',   when: s => Object.values(s.factions).some(v => v > 0) || s.returners.length > 0 },
  nemesis:   { name: '宿敵錄', when: s => Object.keys(s.nemeses).length > 0 },
  goals:     { name: '大事',   when: s => s.realmIdx >= 1 || s.goalsDone.length > 0 },
  dao:       { name: '道心',   when: s => s.realmIdx >= 13 || s.reincarnation.count > 0 },
};
export const isUnlocked = (s, tab) => !TAB_RULES[tab] || !!s.unlocked[tab];

// 分頁內的功能區塊：依進度才出現（解鎖後不會再消失）。旗標存在 s.unlocked['f_' + key]
export const FEATURE_RULES = {
  insight: { name: '專長心得', when: s => s.res.shard > 0 || s.realmIdx >= 4 || Object.values(s.insight || {}).some(n => n > 0) },
  achv:    { name: '成就與稱號', when: s => s.realmIdx >= 3 || s.achv.done.length > 0 || s.goalsDone.length >= 2 },
  chron:   { name: '宗門年表', when: s => s.chronicle.length >= 2 },
  sort:    { name: '弟子排序與篩選', when: s => s.disciples.length >= 6 },
};
export const hasFeature = (s, key) => !!s.unlocked['f_' + key];

// 每 tick 檢查；舊存檔載入後第一次會一次解鎖所有已達成的條件（不吵：只有真的新解鎖才提示）
export function tick(s, quiet = false) {
  tickBuildings(s, quiet);
  for (const [tab, r] of Object.entries(TAB_RULES)) {
    if (s.unlocked[tab] || !r.when(s)) continue;
    s.unlocked[tab] = true;
    if (!quiet) { toast(`🔓 新分頁解鎖：${r.name}`, 'good'); cue('goal'); }
  }
  for (const [key, r] of Object.entries(FEATURE_RULES)) {
    if (s.unlocked['f_' + key] || !r.when(s)) continue;
    s.unlocked['f_' + key] = true;
    if (!quiet) { toast(`🔓 新功能解鎖：${r.name}`, 'good'); cue('goal'); }
  }
}

// 後期建築解鎖提示（舊存檔載入時 quiet，不彈）
export function tickBuildings(s, quiet = false) {
  for (const d of BUILDINGS) {
    if (d.unlockRealm == null || s.unlocked['b_' + d.id] || s.realmIdx < d.unlockRealm) continue;
    s.unlocked['b_' + d.id] = true;
    if (!quiet) { toast(`🏗 新建築可建造：${d.name}`, 'good'); cue('goal'); }
  }
}

// 下一步建議：依優先順序回傳第一個適用的 {text, tab?}
export function nextStep(s) {
  const alch = s.buildings.alchemy;
  if (s.visitor.current?.returning === 'plead') return { text: s.visitor.current.tribute ? '勢力派人進貢：收下貢禮（威望 +3），或婉拒。' : '舊敵來求和：收下賠禮，或讓他滾。', goto: 'scene' };
  if (s.visitor.current) return { text: '有人來訪：忍氣吞聲（記入復仇簿），打得過也可「亮一手」。', goto: 'scene' };
  if (canBurst(s)) return { text: '偽裝值已滿，按「💥 不裝了」！', goto: 'scene' };
  if (alch.lv === 0) {
    const c = upgradeCost(s, 'alchemy');
    return canAfford(s, c)
      ? { text: '建造「煉丹房」產靈石，突破要用。', tab: 'buildings' }
      : { text: `累積 ${Math.ceil(c.qi)} 靈氣建「煉丹房」（可打坐加快）。` };
  }
  if (canBreak(s)) return { text: `靈石夠了，到「境界」突破 ${nextRealm(s).name}！`, tab: 'realm' };
  if (canRebirth(s)) return { text: '已臻化神，可到「境界」轉生換道心。', tab: 'realm' };
  if (s.res.token >= 1 && s.disciples.length === 0) return { text: '用招賢令抽弟子，再派駐建築。', tab: 'gacha' };
  if (s.disciples.length && !s.disciples.some(d => d.at) && Object.keys(s.buildings).some(id => slots(s, id) > 0))
    return { text: '弟子還沒派駐，到「弟子」放進建築（專長相符 ×2）。', tab: 'disciples' };
  if (s.disciples.some(d => nextChapter(s, d))) return { text: '有弟子故事可讀，到「弟子」按「📖 讀故事」。', tab: 'disciples' };
  if (Object.keys(SPECS).some(id => canSpec(s, id))) return { text: '有建築可選「專精」，點畫面上的建築。', tab: 'buildings' };
  if (s.unlocked.expedition && s.expeditions.length < slotCount(s) && freeDisciples(s).length) return { text: '秘境探索位空著，派弟子去。', tab: 'expedition' };
  const cap = Object.keys(s.buildings).find(id => s.buildings[id].lv > 0 && isCapped(s, id));
  const nx = nextRealm(s);
  if (nx && cap && !canBreak(s) && s.res.stone < breakCost(s).stone)
    return { text: `建築被境界限制，累積 ${Math.ceil(breakCost(s).stone)} 靈石突破至 ${nx.name}。` };
  if (s.grudges.length >= 1 && s.disguise.value < 20) return { text: '蓄力中：人越多、越久，引爆獎勵越高。先升建築、抽弟子。' };
  if (readyCount(s)) return { text: '有委託可領取，到「大事」領獎勵。', tab: 'goals' };
  if (s.disciples.some(canBranch)) {
    const can = Object.values(BRANCHES).some(b => canAfford(s, b.cost));
    return can ? { text: '有弟子 Lv10 了，可以二選一進階。', tab: 'disciples' } : { text: '有弟子 Lv10 了，進階需要秘境材料（洞府殘玉或靈泉露），派隊伍去探索。', tab: 'expedition' };
  }
  if (hasFeature(s, 'insight') && INSIGHTS.some(i => canLearn(s, i.spec) && insightActive(s, i.spec))) return { text: '有專長心得可以領悟（用碎片，該專長弟子要派駐中）。', tab: 'disciples' };
  if (s.artifacts.length && s.equipped.length < Math.min(EQUIP_SLOTS, s.artifacts.length)) return { text: '裝備欄還有空位：裝上法寶可獲得共鳴加成。', tab: 'goals' };
  const g = GOALS.find(x => !isDone(s, x.id));
  return g ? { text: `宗門大事：${g.name} — ${g.desc}`, tab: 'goals' } : null;
}
