// 招賢面板：單抽／十連、保底進度、用靈石買招賢令、最近一次結果。
import { CONFIG } from '../config.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { tokenPrice, tokenLeft, tokenResetMs, meritPrice } from '../core/gacha.js';
import { MERIT, TOKEN_SHOP } from '../data/materials.js';
import { canAfford } from '../core/resources.js';
import { fmt } from '../core/format.js';
import { traitText } from '../data/traits.js';
import { esc, costChips, crow } from './dom.js';

export function gachaCard(r, i = 0, flip = false) {
  const c = RARITIES[r.rarity].color;
  return `<div class="gcard ${flip ? 'flip' : ''} ${r.rarity === 'SSR' || r.rarity === 'UR' ? 'glowy' : ''}" style="--rc:${c};--i:${i}">
    <div class="gr">${r.rarity}</div><div class="ge">${r.def.emoji}</div>
    <b>${esc(r.def.name)}</b><small>${esc(r.def.specialty)}・${esc(r.def.element)}</small><small class="trait on">✦ ${esc(traitText(r.def.trait.key, r.def.trait.value))}</small>
    <small class="dim">${r.isNew ? '新弟子！' : `重複 → 🧩${r.shards}`}${r.pity ? '・保底' : ''}</small></div>`;
}

const pityBar = (label, cur, max) => `<div class="pity"><small>${label} <b>${cur}/${max}</b></small><div class="gbar"><div style="width:${Math.min(100, Math.floor(cur / max * 100))}%"></div></div></div>`;

export function gachaPanel(s, ui) {
  const t = s.res.token, g = s.gacha;
  const total = RARITY_ORDER.reduce((a, k) => a + RARITIES[k].weight, 0);
  const rates = RARITY_ORDER.map(k => `<span style="color:${RARITIES[k].color}">${k} ${(RARITIES[k].weight / total * 100).toFixed(0)}%</span>`).join('　');
  const results = ui.lastPull ? ui.lastPull.map((r, i) => gachaCard(r, i, Date.now() < (ui.pullAnimUntil || 0))).join('') : '<p class="hint">還沒抽過。老祖說：「招賢令，是用來換人的，不是拿來看的。」</p>';
  const left = tokenLeft(s), mins = Math.ceil(tokenResetMs(s) / 60000), p1 = tokenPrice(s, 1), p3 = tokenPrice(s, Math.min(3, Math.max(1, left)));
  const n3 = Math.min(3, Math.max(1, left)), ok1 = left >= 1 && canAfford(s, p1), ok3 = left >= n3 && canAfford(s, p3), mp = meritPrice(1);
  const buy = `<div class="row"><small>招賢令來源：每 ${CONFIG.gacha.tokenTrickleSec} 秒自然 +1、委託、擊敗仇人、事件；也可用靈石或功勳換。</small></div>
    <div class="row buyrow">
      <span class="dim">💎 靈石購買（本時段剩 ${left}/${TOKEN_SHOP.limit}，越買越貴${left < TOKEN_SHOP.limit ? `・${mins} 分後重置` : ''}）</span>
      <span class="costs">${costChips(s, p1)}</span><button class="btn ${ok1 ? 'primary' : ''}" data-act="buyToken" data-n="1" ${ok1 ? '' : 'disabled'}>買 1</button>
      ${n3 > 1 ? `<span class="costs">${costChips(s, p3)}</span><button class="btn ${ok3 ? 'primary' : ''}" data-act="buyToken" data-n="${n3}" ${ok3 ? '' : 'disabled'}>買 ${n3}</button>` : ''}
    </div>
    <div class="row buyrow"><span class="dim">🏅 功勳兌換（委託、擊敗仇人、探索獲得）</span>
      <span class="costs">${costChips(s, mp)}</span><button class="btn ${canAfford(s, mp) ? 'primary' : ''}" data-act="meritToken" data-n="1" ${canAfford(s, mp) ? '' : 'disabled'}>換 1</button>
      <button class="btn" data-act="meritToken" data-n="${Math.max(1, Math.floor(s.res.merit / MERIT.perToken))}" ${s.res.merit >= MERIT.perToken ? '' : 'disabled'}>全換（${Math.floor(s.res.merit / MERIT.perToken)}）</button></div>
    <small class="dim">機率：${rates}（累計 ${g.total} 抽）</small>`;
  return `<div class="card gacha">
    <div class="body">
      <div class="row"><b>🎫 招賢令：${fmt(t)}</b>${s.res.shard > 0 ? `　<span class="tag">🧩 碎片 ${fmt(s.res.shard)}</span>` : ''}${s.res.merit > 0 ? `　<span class="tag">🏅 功勳 ${fmt(s.res.merit)}</span>` : ''}</div>
      <div class="pities">${pityBar('SR 保底', g.sinceSR, CONFIG.gacha.pitySR)}${pityBar('SSR 保底', g.sinceSSR, CONFIG.gacha.pitySSR)}</div>
    </div>
    <div class="act">
      <button class="btn ${t >= 1 ? 'primary' : ''}" data-act="pull" data-n="1" ${t >= 1 ? '' : 'disabled'}>單抽 🎫1</button>
      <button class="btn ${t >= 10 ? 'primary' : ''}" data-act="pull" data-n="10" ${t >= 10 ? '' : 'disabled'}>十連 🎫10</button>
    </div>
  </div>
  ${crow(ui, { key: 'gbuy', icon: '🛒', title: '<b>購買招賢令與機率</b>', detail: buy })}
  <div class="gresults">${results}</div>`;
}
