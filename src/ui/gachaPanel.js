// 招賢面板：單抽／十連、保底進度、用靈石買招賢令、最近一次結果。
import { CONFIG } from '../config.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { tokenPrice } from '../core/gacha.js';
import { canAfford } from '../core/resources.js';
import { fmt } from '../core/format.js';
import { traitText } from '../data/traits.js';
import { esc, costChips } from './dom.js';

export function gachaCard(r) {
  const c = RARITIES[r.rarity].color;
  return `<div class="gcard" style="--rc:${c}">
    <div class="gr">${r.rarity}</div><div class="ge">${r.def.emoji}</div>
    <b>${esc(r.def.name)}</b><small>${esc(r.def.specialty)}・${esc(r.def.element)}</small><small class="trait on">✦ ${esc(traitText(r.def.trait.key, r.def.trait.value))}</small>
    <small class="dim">${r.isNew ? '新弟子！' : `重複 → 🧩${r.shards}`}${r.pity ? '・保底' : ''}</small></div>`;
}

export function gachaPanel(s, ui) {
  const t = s.res.token, g = s.gacha;
  const total = RARITY_ORDER.reduce((a, k) => a + RARITIES[k].weight, 0);
  const rates = RARITY_ORDER.map(k => `<span style="color:${RARITIES[k].color}">${k} ${(RARITIES[k].weight / total * 100).toFixed(0)}%</span>`).join('　');
  const results = ui.lastPull ? ui.lastPull.map(gachaCard).join('') : '<p class="hint">還沒抽過。老祖說：「招賢令，是用來換人的，不是拿來看的。」</p>';
  return `<div class="card gacha">
    <div class="body">
      <div class="row"><b>🎫 招賢令：${fmt(t)}</b></div>
      <small>${rates}</small><br>
      <small class="dim">保底：${CONFIG.gacha.pitySR} 抽 SR（${g.sinceSR}/${CONFIG.gacha.pitySR}）・${CONFIG.gacha.pitySSR} 抽 SSR（${g.sinceSSR}/${CONFIG.gacha.pitySSR}）・累計 ${g.total} 抽</small>
    </div>
    <div class="act">
      <button class="btn ${t >= 1 ? 'primary' : ''}" data-act="pull" data-n="1" ${t >= 1 ? '' : 'disabled'}>單抽 🎫1</button>
      <button class="btn ${t >= 10 ? 'primary' : ''}" data-act="pull" data-n="10" ${t >= 10 ? '' : 'disabled'}>十連 🎫10</button>
    </div>
  </div>
  <div class="card">
    <div class="body"><small>用靈石購買招賢令（另每 ${CONFIG.gacha.tokenTrickleSec} 秒自然 +1）</small></div>
    <div class="act">
      <div class="costs">${costChips(s, tokenPrice(1))}</div>
      <button class="btn ${canAfford(s, tokenPrice(1)) ? 'primary' : ''}" data-act="buyToken" data-n="1" ${canAfford(s, tokenPrice(1)) ? '' : 'disabled'}>買 1</button>
      <div class="costs">${costChips(s, tokenPrice(10))}</div>
      <button class="btn ${canAfford(s, tokenPrice(10)) ? 'primary' : ''}" data-act="buyToken" data-n="10" ${canAfford(s, tokenPrice(10)) ? '' : 'disabled'}>買 10</button>
    </div>
  </div>
  <div class="gresults">${results}</div>`;
}
