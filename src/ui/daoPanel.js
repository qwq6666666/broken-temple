// 道心商店：用轉生獲得的道心購買永久加成。
import { DAO_SHOP } from '../data/daoShop.js';
import { shopLevel, shopCost, canBuy } from '../core/dao.js';
import { CONFIG } from '../config.js';
import { fmt } from '../core/format.js';
import { esc, costChips } from './dom.js';

const fmtVal = (it, v) => it.unit === '%' ? `+${Math.round(v * 100)}%` : it.unit === '秒' ? `-${v}秒` : `+${v}${it.unit === '小時' ? ' 小時' : ''}`;

export function daoPanel(s) {
  const n = s.reincarnation.count;
  const rows = DAO_SHOP.map(it => {
    const lv = shopLevel(s, it.id), max = lv >= it.maxLv, can = canBuy(s, it.id);
    return `<div class="card ${can ? 'affordable' : ''}">
      <div class="big">${it.icon}</div>
      <div class="body"><div class="row"><b>${esc(it.name)}</b> <span class="lv">Lv ${lv}/${it.maxLv}</span></div>
        <small>${esc(it.desc)}　每級 ${esc(fmtVal(it, it.perLevel))}　目前 <b class="gold">${esc(fmtVal(it, lv * it.perLevel))}</b></small></div>
      <div class="act">${max ? '<span class="tag gold">已滿級</span>'
        : `<div class="costs">${costChips(s, shopCost(s, it.id))}</div>
           <button class="btn ${can ? 'primary' : ''}" data-act="daoBuy" data-id="${it.id}" ${can ? '' : 'disabled'}>修習</button>`}</div></div>`;
  }).join('');
  return `<p class="hint">☯️ 道心 ${fmt(s.res.daoHeart)}　已轉生 ${n} 次（每次轉生：靈氣、靈石產出自動 +${Math.round(CONFIG.reincarnation.autoBonusPerCount * 100)}%，目前 +${Math.round(CONFIG.reincarnation.autoBonusPerCount * n * 100)}%）。化神後在「境界」分頁轉生。</p>${rows}`;
}
