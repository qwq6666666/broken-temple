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
import { canChoose as canSpec } from './spec.js';
import { SPECS } from '../data/specs.js';
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

// 每 tick 檢查；舊存檔載入後第一次會一次解鎖所有已達成的條件（不吵：只有真的新解鎖才提示）
export function tick(s, quiet = false) {
  tickBuildings(s, quiet);
  for (const [tab, r] of Object.entries(TAB_RULES)) {
    if (s.unlocked[tab] || !r.when(s)) continue;
    s.unlocked[tab] = true;
    if (!quiet) { toast(`🔓 新分頁解鎖：${r.name}`, 'good'); cue('goal'); }
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
  if (s.visitor.current?.returning === 'plead') return { text: '有舊敵來求和！「收下賠禮」可得資源與威望，也可以「讓他滾」記進復仇簿。' };
  if (s.visitor.current) return { text: '有人來訪！「忍氣吞聲」累積偽裝值（記入復仇簿，之後引爆），打得過的人也可以「亮一手」當場打臉。' };
  if (canBurst(s)) return { text: '偽裝值已滿！按下方「💥 不裝了」，讓復仇簿裡的人全部出場。' };
  if (alch.lv === 0) {
    const c = upgradeCost(s, 'alchemy');
    return canAfford(s, c)
      ? { text: '建造「煉丹房」：它會產出靈石，突破境界要靠靈石。', tab: 'buildings' }
      : { text: `累積 ${Math.ceil(c.qi)} 靈氣，先建造「煉丹房」產靈石（可以點「引氣打坐」加快）。` };
  }
  if (canBreak(s)) return { text: `靈石夠了，到「境界」突破至 ${nextRealm(s).name}！`, tab: 'realm' };
  if (canRebirth(s)) return { text: '已臻化神。可以到「境界」轉生，換取道心與永久加成。', tab: 'realm' };
  if (s.res.token >= 1 && s.disciples.length === 0) return { text: '用招賢令抽取弟子，再把弟子派駐到建築上加成產出。', tab: 'gacha' };
  if (s.disciples.length && !s.disciples.some(d => d.at) && Object.keys(s.buildings).some(id => slots(s, id) > 0))
    return { text: '弟子還沒派駐！到「弟子」把他們放進建築（專長與建築相符，加成 ×2）。', tab: 'disciples' };
  if (s.disciples.some(d => nextChapter(s, d))) return { text: '有弟子的故事可以讀了！到「弟子」按「📖 讀故事」：有獎勵，特性還會永久 +10%。', tab: 'disciples' };
  if (Object.keys(SPECS).some(id => canSpec(s, id))) return { text: '有建築可以選擇「專精」了！點畫面上的建築，二選一（本輪有效）。', tab: 'buildings' };
  if (s.unlocked.expedition && s.expeditions.length < slotCount(s) && freeDisciples(s).length) return { text: '秘境探索位空著！派弟子去探索，離線也會完成。', tab: 'expedition' };
  const cap = Object.keys(s.buildings).find(id => s.buildings[id].lv > 0 && isCapped(s, id));
  const nx = nextRealm(s);
  if (nx && cap && !canBreak(s) && s.res.stone < breakCost(s).stone)
    return { text: `建築等級被境界限制。累積靈石（${Math.ceil(breakCost(s).stone)}）突破至 ${nx.name}，才能升到更高等級。` };
  if (s.grudges.length >= 1 && s.disguise.value < 20) return { text: '蓄力中：復仇簿的人越多、蓄力越久，引爆的獎勵越高。可以先升級建築、抽弟子。' };
  const g = GOALS.find(x => !isDone(s, x.id));
  return g ? { text: `宗門大事：${g.name} — ${g.desc}`, tab: 'goals' } : null;
}
