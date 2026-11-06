// 道心商店：用轉生獲得的道心購買永久加成。
import { DAO_SHOP } from '../data/daoShop.js';
import { shopLevel, shopCost, canBuy, autoBonus, EXCHANGES, unlockedItem } from '../core/dao.js';
import { canAfford } from '../core/resources.js';
import { fmt } from '../core/format.js';
import { esc, costChips, crow } from './dom.js';

const fmtVal = (it, v) => it.unit === '%' ? `+${Math.round(v * 100)}%` : it.unit === '秒' ? `-${v}秒` : `+${v}${it.unit === '小時' ? ' 小時' : it.unit === '級' ? ' 級' : ''}`;

// 商店分組（未列入的非道果項目會補在「其他」，避免新增項目漏顯示）
const GROUPS = [
  ['✨ 修行加成', ['qi', 'stone', 'power']],
  ['💥 戰鬥與招賢', ['burst', 'disguise', 'token', 'cd']],
  ['🌙 離線與開局', ['offcap', 'offeff', 'startS', 'startT']],
  ['🏗️ 建築', ['expand']],
];
const KNOWN = new Set(GROUPS.flatMap(g => g[1]));

export function daoPanel(s, ui) {
  const n = s.reincarnation.count;
  const mk = it => {
    if (!unlockedItem(s, it.id)) return crow(ui, { key: 'd' + it.id, cls: 'locked', icon: '🔒', title: `<b>${esc(it.name)}</b>`, sub: '渡過九重天劫後開放（見「天劫」）' });
    const lv = shopLevel(s, it.id), max = lv >= it.maxLv, can = canBuy(s, it.id);
    return crow(ui, { key: 'd' + it.id, cls: can ? 'affordable' : '', icon: it.icon, title: `<b>${esc(it.name)}</b> <span class="lv">Lv ${lv}/${it.maxLv}</span>`,
      sub: `${esc(it.desc)}　目前 ${esc(fmtVal(it, lv * it.perLevel))}`,
      act: max ? '<span class="tag gold">已滿級</span>' : `<div class="costs">${costChips(s, shopCost(s, it.id))}</div><button class="btn ${can ? 'primary' : ''}" data-act="daoBuy" data-id="${it.id}" ${can ? '' : 'disabled'}>修習</button>`,
      detail: `<small>${esc(it.desc)}</small><small class="dim">每級 ${esc(fmtVal(it, it.perLevel))}　目前 <b class="gold">${esc(fmtVal(it, lv * it.perLevel))}</b></small>` });
  };
  const grp = ids => DAO_SHOP.filter(it => ids.includes(it.id)).map(mk).join('');
  const extra = DAO_SHOP.filter(it => !it.gate && !KNOWN.has(it.id)).map(it => it.id);
  const rows = [...GROUPS, ...(extra.length ? [['其他', extra]] : [])].map(([title, ids]) => `<h3 class="sub">${title}</h3>${grp(ids)}`).join(''), fruit = DAO_SHOP.filter(it => it.gate).map(mk).join('');
  const ex = EXCHANGES.map(e => {
    const can = canAfford(s, { daoHeart: e.cost });
    return crow(ui, { key: 'dx' + e.id, cls: can ? 'affordable' : '', icon: e.icon, title: `<b>${esc(e.name)}</b>`, sub: esc(e.desc),
      act: `<div class="costs">${costChips(s, { daoHeart: e.cost })}</div><button class="btn ${can ? 'primary' : ''}" data-act="daoExchange" data-id="${e.id}" ${can ? '' : 'disabled'}>兌換</button>` });
  }).join('');
  return `<p class="hint">☯️ 道心 ${fmt(s.res.daoHeart)}　已轉生 ${n} 次（靈氣、靈石 +${Math.round(autoBonus(n) * 100)}%）</p>${rows}<h3 class="sub">🍑 道果（無上限）</h3>${fruit}<h3 class="sub">道心兌換</h3>${ex}`;
}
