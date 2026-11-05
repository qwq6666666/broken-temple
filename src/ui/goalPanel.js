// 宗門大事 + 圖鑑（弟子／功法法寶）
import { GOALS } from '../data/goals.js';
import { DISCIPLES } from '../data/disciples.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { RARITIES } from '../data/gachaRates.js';
import { isDone, progress } from '../core/goals.js';
import { fmt } from '../core/format.js';
import { esc } from './dom.js';

const permText = p => Object.entries(p || {}).map(([k, v]) => ({ qiMult: '靈氣', stoneMult: '靈石', powerMult: '戰力', burstReward: '爆擊獎勵' }[k] + ` +${Math.round(v * 100)}%`)).join('、');
const rewardText = r => [r.token && `🎫${r.token}`, r.stone && `💎${r.stone}`, r.perm && `永久：${permText(r.perm)}`].filter(Boolean).join('　');

export function goalPanel(s) {
  const done = s.goalsDone.length;
  const rows = GOALS.map(g => {
    const ok = isDone(s, g.id), cur = progress(s, g), pct = Math.floor(cur / g.target * 100);
    return `<div class="card goal ${ok ? 'done' : ''}">
      <div class="big">${ok ? '✅' : '🎯'}</div>
      <div class="body"><b>${esc(g.name)}</b> <small>${esc(g.desc)}</small>
        <div class="gbar"><div style="width:${pct}%"></div></div>
        <small class="dim">${fmt(cur)}/${fmt(g.target)}　獎勵：${esc(rewardText(g.reward))}</small></div></div>`;
  }).join('');
  const owned = new Set(s.disciples.map(d => d.defId));
  const dex = DISCIPLES.map(d => owned.has(d.id)
    ? `<span class="dex" style="--rc:${RARITIES[d.rarity].color}" title="${esc(d.name)}">${d.emoji}<small>${esc(d.name)}</small></span>`
    : `<span class="dex off" title="未獲得">❔<small>？？？</small></span>`).join('');
  const arts = ARTIFACTS.map(a => s.artifacts.includes(a.id)
    ? `<span class="art" title="${esc(a.desc)}">${a.emoji} ${esc(a.name)}<small>${esc(a.desc)}</small></span>`
    : `<span class="art off">❔ 未獲得<small>長老被爆時掉落</small></span>`).join('');
  return `<p class="hint">宗門大事 ${done}/${GOALS.length}</p>${rows}
    <h3>弟子圖鑑 ${owned.size}/${DISCIPLES.length}</h3><div class="dexgrid">${dex}</div>
    <h3>功法法寶圖鑑 ${s.artifacts.length}/${ARTIFACTS.length}</h3><div class="arts">${arts}</div>`;
}
