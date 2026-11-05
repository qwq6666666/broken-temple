// 復仇簿：仇人境界、差距指標、預估結果；另含降服弟子的待招募名單與法寶一覽。
import { VISITOR_TYPES } from '../data/visitors.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES } from '../data/gachaRates.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { gapInfo } from '../core/conceal.js';
import { nemOf } from '../core/nemesis.js';
import { recruitCost } from '../core/burst.js';
import { canAfford } from '../core/resources.js';
import { CONFIG } from '../config.js';
import { esc, costChips } from './dom.js';

const VERDICT = {
  crush: { t: '預估：碾壓', c: 'v-crush' },
  narrow: { t: '預估：險勝', c: 'v-narrow' },
  fail: { t: '預估：打不過', c: 'v-fail' },
};

export function avengePanel(s) {
  const rows = [...s.grudges].sort((a, b) => b.lvl - a.lvl).map(g => {
    const t = VISITOR_TYPES[g.type], gap = gapInfo(s, g), nem = g.nemesisId ? nemOf(g) : null;
    const v = nem && gap.verdict === 'narrow' ? { t: '預估：險勝（會脫身）', c: 'v-fail' } : VERDICT[gap.verdict];
    return `<div class="card gcrd ${nem ? 'nemesis' : ''}">
      <div class="big">${nem ? nem.emoji : t.emoji}</div>
      <div class="body">
        <div class="row"><b>${esc(g.name)}</b> ${nem ? '<span class="tag gold">宿敵</span>' : ''}<span class="tag">${esc(t.label)}</span> <span class="tag">${esc(g.personality)}</span>
          ${g.alert ? '<span class="tag red">警覺 ×0.7</span>' : ''}</div>
        <small>${esc(g.sect)}・${esc(g.role)}</small><br>
        <small class="gap">對方 <b>${esc(gap.enemy)}</b>，你 <b>${esc(gap.me)}</b> — ${esc(gap.text)}</small>
      </div>
      <div class="act"><span class="verdict ${v.c}">${v.t}</span></div>
    </div>`;
  }).join('') || '<p class="hint">復仇簿是空的。等人來嘲諷你吧——然後，忍著。</p>';

  const recruits = s.recruits.length ? `<h3>降服弟子（待招募）</h3>` + s.recruits.map(r => {
    const df = DISCIPLES_BY_ID[r.defId], can = canAfford(s, recruitCost());
    return `<div class="card" style="--rc:${RARITIES[df.rarity].color}">
      <div class="big">${df.emoji}</div>
      <div class="body"><b>${esc(df.name)}</b> <span class="tag" style="color:${RARITIES[df.rarity].color}">${df.rarity}</span>
        <span class="tag">${esc(df.specialty)}</span><br><small>原為 ${esc(r.from)} 門下，被你降服。</small></div>
      <div class="act"><div class="costs">${costChips(s, recruitCost())}</div>
        <button class="btn ${can ? 'primary' : ''}" data-act="recruit" data-uid="${r.uid}" ${can ? '' : 'disabled'}>招募</button></div>
    </div>`;
  }).join('') : '';

  const arts = s.artifacts.length ? `<h3>功法法寶（永久）</h3><div class="arts">` + s.artifacts.map(id => {
    const a = ARTIFACTS_BY_ID[id];
    return `<span class="art" title="${esc(a.desc)}">${a.emoji} ${esc(a.name)}<small>${esc(a.desc)}</small></span>`;
  }).join('') + '</div>' : '';

  return `<p class="hint">復仇簿 ${s.grudges.length}/${CONFIG.visitor.maxGrudges}。偽裝值滿格後按「不裝了」，全員依序登場。</p>${rows}${recruits}${arts}`;
}
