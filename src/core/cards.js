// 雙面板：外界眼中的你（偽裝出來的評級）與實際底牌。純顯示，不影響數值。
import { REALMS, bigOf } from '../data/realms.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { UR_PERKS } from '../data/urPerks.js';
import { NEMESES } from '../data/nemeses.js';
import { isDefeated } from './nemesis.js';
import { fameLayers } from './economy.js';

const OUTER = ['不入流小觀', '不入流小觀', '鄉野小觀', '尋常小宗', '末流道場', '二流門派'];       // 依實際大境界 tier 往下壓幾級
export const outerView = s => OUTER[REALMS[s.realmIdx].tier];

// 底牌：玩家手上看不出來的東西。每張 { icon, name, desc }
export function trumpCards(s) {
  const cards = [];
  for (const g of s.grudges) if (g.marked) cards.push({ icon: '⭐', name: `標記：${g.name}`, desc: '引爆時碾壓 ×1.5' });
  for (const d of s.disciples) {
    const p = UR_PERKS[d.defId];
    if (p && d.at) cards.push({ icon: DISCIPLES_BY_ID[d.defId].emoji, name: `${DISCIPLES_BY_ID[d.defId].name}・${p.name}`, desc: p.desc });
    if (d.tag === 'fate') cards.push({ icon: '🌠', name: `氣運之子：${DISCIPLES_BY_ID[d.defId].name}`, desc: '訪客更頻繁、爆擊獎勵 +10%' });
    if (d.tag === 'spy') cards.push({ icon: '🕵️', name: `反間：${DISCIPLES_BY_ID[d.defId].name}`, desc: '仇人成長較慢，但引爆時可能洩密' });
  }
  for (const id of s.equipped || []) { const a = ARTIFACTS_BY_ID[id]; if (a) cards.push({ icon: a.emoji, name: a.name, desc: a.desc }); }
  const nem = NEMESES.filter(n => isDefeated(s, n.id)).length; if (nem) cards.push({ icon: '⚔️', name: `已擊敗宿敵 ${nem} 位`, desc: '擁有專屬法寶與覺醒進度' });
  const ripe = s.grudges.filter(g => g.ripe).length; if (ripe) cards.push({ icon: '🌱', name: `熟成中的仇人 ${ripe} 位`, desc: '被放過養成，下次獎勵更高' });
  if (fameLayers(s)) cards.push({ icon: '🔰', name: `威名 ${fameLayers(s)} 層`, desc: '靈氣、靈石產出加成中' });
  return cards;
}
