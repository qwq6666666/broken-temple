// 宗門大事 + 圖鑑（弟子／功法法寶）
import { GOALS } from '../data/goals.js';
import { DISCIPLES } from '../data/disciples.js';
import { ARTIFACTS, ARTIFACTS_BY_ID, EQUIP_SLOTS, EQUIP_BONUS } from '../data/artifacts.js';
import { RARITIES } from '../data/gachaRates.js';
import { isDone, progress } from '../core/goals.js';
import { progressOf, isReady, rewardText as cRewardText } from '../core/commissions.js';
import { COMMISSION_BY_KIND, COMMISSION_RULES } from '../data/commissions.js';
import { fmt } from '../core/format.js';
import { esc, crow } from './dom.js';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { isDone as isAchDone, progress as achProgress } from '../core/achievements.js';
import { stamp } from '../core/chronicle.js';

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
  return `<h3 class="sub">📋 宗門委託</h3><p class="hint">已完成 ${C.done} 張，再 ${toNext} 張有額外獎勵（🎫${COMMISSION_RULES.milestoneReward.token}）</p>${rows}${wait}`;
}

function equipBox(s, ui) {
  if (!s.artifacts.length) return '';
  const chips = s.artifacts.map(id => {
    const a = ARTIFACTS_BY_ID[id], on = s.equipped.includes(id);
    return `<button class="pchip ${on ? 'eq' : ''}" data-act="toggleEquip" data-id="${id}" title="${esc(a.desc)}">${a.emoji} ${esc(a.name)} <small>${esc(a.desc)}${on ? '・共鳴 +' + Math.round(EQUIP_BONUS * 100) + '%' : ''}</small></button>`;
  }).join('');
  const worn = s.equipped.map(id => ARTIFACTS_BY_ID[id].emoji).join('') || '尚未裝備';
  const detail = `<small class="dim">裝備中的法寶，效果額外 +${Math.round(EQUIP_BONUS * 100)}%（共鳴）；沒裝備的照常生效。最多 ${EQUIP_SLOTS} 件，可隨時更換。</small><div class="picker">${chips}</div>`;
  return `<h3 class="sub">🎒 法寶裝備</h3>${crow(ui, { key: 'equip', icon: '🎒', title: `<b>裝備欄 ${s.equipped.length}/${EQUIP_SLOTS}</b>`, sub: worn, detail })}`;
}

function achievementBox(s, ui) {
  const done = s.achv.done.length, cur = s.achv.title;
  const badges = ACHIEVEMENTS.map(a => {
    const ok = isAchDone(s, a.id), p = achProgress(s, a);
    return `<button class="badge ${ok ? 'on' : ''} ${cur === a.id ? 'worn' : ''}" ${ok ? `data-act="equipTitle" data-id="${a.id}"` : 'disabled'} title="${esc(a.name)}">
      <span class="bi">${ok ? a.icon : '🔒'}</span><b>${ok ? esc(a.title) : '？？？'}</b><small>${esc(a.name)}</small>${ok ? '' : `<small class="dim">${fmt(p)}/${fmt(a.target)}</small>`}${cur === a.id ? '<small class="gold">使用中</small>' : ''}</button>`;
  }).join('');
  const detail = `<small class="dim">點已解鎖的徽章即可佩戴稱號（再點一次取消），稱號顯示在畫面左上標題旁，不影響數值。</small><div class="badges">${badges}</div>`;
  return `<h3 class="sub">🏅 成就</h3>${crow(ui, { key: 'achv', icon: '🏅', title: `<b>成就 ${done}/${ACHIEVEMENTS.length}</b>`, sub: cur ? `稱號：「${esc(ACHIEVEMENTS_BY_ID[cur].title)}」` : '解鎖成就可獲得稱號', detail })}`;
}

function chronicleBox(s, ui) {
  const list = [...(s.chronicle || [])].reverse();
  if (!list.length) return '';
  const rows = list.slice(0, 40).map(e => `<div class="chrow"><small class="dim">${esc(stamp(e))}</small><span>${e.icon} ${esc(e.text)}</span></div>`).join('');
  return `<h3 class="sub">📜 宗門年表</h3>${crow(ui, { key: 'chron', icon: '📜', title: '<b>宗門年表</b>', sub: `${esc(list[0].icon)} ${esc(list[0].text)}`, detail: rows })}`;
}

export function goalPanel(s, ui) {
  const done = s.goalsDone.length;
  const card = g => {
    const ok = isDone(s, g.id), cur = progress(s, g), pct = Math.floor(cur / g.target * 100);
    return `<div class="card goal ${ok ? 'done' : ''}">
      <div class="big">${ok ? '✅' : '🎯'}</div>
      <div class="body"><b>${esc(g.name)}</b> <small>${esc(g.desc)}</small>
        <div class="gbar"><div style="width:${pct}%"></div></div>
        <small class="dim">${fmt(cur)}/${fmt(g.target)}　獎勵：${esc(rewardText(g.reward))}</small></div></div>`;
  };
  const todo = GOALS.filter(g => !isDone(s, g.id)), fin = GOALS.filter(g => isDone(s, g.id));
  const rows = todo.map(card).join('')
    + (fin.length ? crow(ui, { key: 'goalsdone', icon: '✅', title: `<b>已完成的大事 ${fin.length}</b>`, sub: fin.slice(-3).map(g => esc(g.name)).join('、'), detail: fin.map(g => `<small>✅ <b>${esc(g.name)}</b>　${esc(g.desc)}</small>`).join('') }) : '');
  const owned = new Set(s.disciples.map(d => d.defId));
  const dex = DISCIPLES.map(d => owned.has(d.id)
    ? `<span class="dex" style="--rc:${RARITIES[d.rarity].color}" title="${esc(d.name)}">${d.emoji}<small>${esc(d.name)}</small></span>`
    : `<span class="dex off" title="未獲得">❔<small>？？？</small></span>`).join('');
  const arts = ARTIFACTS.map(a => s.artifacts.includes(a.id)
    ? `<span class="art" title="${esc(a.desc)}">${a.emoji} ${esc(a.name)}<small>${esc(a.desc)}</small></span>`
    : `<span class="art off">❔ 未獲得<small>長老被爆時掉落</small></span>`).join('');
  return `${commissionBox(s)}${equipBox(s, ui)}${achievementBox(s, ui)}${chronicleBox(s, ui)}
    <h3 class="sub">🎯 宗門大事 ${done}/${GOALS.length}</h3>${rows}
    <h3>弟子圖鑑 ${owned.size}/${DISCIPLES.length}</h3><div class="dexgrid">${dex}</div>
    <h3>功法法寶圖鑑 ${s.artifacts.length}/${ARTIFACTS.length}</h3><div class="arts">${arts}</div>`;
}
