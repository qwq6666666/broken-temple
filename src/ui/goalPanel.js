// 宗門大事 + 圖鑑（弟子／功法法寶）
import { GOALS } from '../data/goals.js';
import { DISCIPLES } from '../data/disciples.js';
import { ARTIFACTS } from '../data/artifacts.js';
import { RARITIES } from '../data/gachaRates.js';
import { isDone, progress } from '../core/goals.js';
import { progressOf, isReady, rewardText as cRewardText } from '../core/commissions.js';
import { COMMISSION_BY_KIND, COMMISSION_RULES } from '../data/commissions.js';
import { fmt } from '../core/format.js';
import { esc } from './dom.js';

const permText = p => Object.entries(p || {}).map(([k, v]) => ({ qiMult: '靈氣', stoneMult: '靈石', powerMult: '戰力', burstReward: '爆擊獎勵' }[k] + ` +${Math.round(v * 100)}%`)).join('、');
const rewardText = r => [r.token && `🎫${r.token}`, r.stone && `💎${r.stone}`, r.perm && `永久：${permText(r.perm)}`].filter(Boolean).join('　');

function commissionBox(s) {
  const C = s.commissions;
  const rows = C.list.map((c, i) => {
    const d = COMMISSION_BY_KIND[c.kind], cur = progressOf(s, c), ok = isReady(s, c);
    return `<div class="card goal commission ${ok ? 'affordable' : ''}">
      <div class="big">${d.icon}</div>
      <div class="body"><b>${esc(d.text(c.target))}</b>
        <div class="gbar"><div style="width:${Math.floor(cur / c.target * 100)}%"></div></div>
        <small class="dim">${cur}/${c.target}　獎勵：${esc(cRewardText(c.reward))}</small></div>
      <div class="act"><button class="btn ${ok ? 'primary' : ''}" data-act="claimCommission" data-i="${i}" ${ok ? '' : 'disabled'}>領取</button>
        ${ok ? '' : `<button class="btn mini" data-act="abandonCommission" data-i="${i}" title="放棄這張，稍後換新的">放棄</button>`}</div></div>`;
  }).join('');
  const wait = C.list.length < COMMISSION_RULES.slots && s.t < C.nextAt ? `<p class="hint">新委託 ${Math.ceil((C.nextAt - s.t) / 1000)} 秒後送到</p>` : '';
  const toNext = COMMISSION_RULES.milestoneEvery - (C.done % COMMISSION_RULES.milestoneEvery);
  return `<h3 class="sub">📋 宗門委託</h3><p class="hint">已完成 ${C.done} 張，再 ${toNext} 張有額外獎勵（🎫${COMMISSION_RULES.milestoneReward.token}）</p>${rows}${wait}<h3 class="sub">🎯 宗門大事</h3>`;
}

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
  return `${commissionBox(s)}<p class="hint">宗門大事 ${done}/${GOALS.length}</p>${rows}
    <h3>弟子圖鑑 ${owned.size}/${DISCIPLES.length}</h3><div class="dexgrid">${dex}</div>
    <h3>功法法寶圖鑑 ${s.artifacts.length}/${ARTIFACTS.length}</h3><div class="arts">${arts}</div>`;
}
