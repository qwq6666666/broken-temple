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
      sub: `${esc(it.desc)}　<b class="gold">${esc(fmtVal(it, lv * it.perLevel))}</b>`,
      act: max ? '<span class="tag gold">已滿級</span>' : `<div class="costs">${costChips(s, shopCost(s, it.id))}</div><button class="btn ${can ? 'primary' : ''}" data-act="daoBuy" data-id="${it.id}" ${can ? '' : 'disabled'}>修習</button>`,
      detail: `<small class="dim">每級 ${esc(fmtVal(it, it.perLevel))}</small>` });
  };
  // 分組可折疊：預設只展開「第一個有買得起項目」的組，其餘收起；玩家點過就依玩家的
  const canG = ids => DAO_SHOP.some(it => ids.includes(it.id) && unlockedItem(s, it.id) && canBuy(s, it.id));
  const firstOpen = GROUPS.findIndex(g => canG(g[1]));
  const groupBox = ([title, ids], gi) => {
    const items = DAO_SHOP.filter(it => ids.includes(it.id)), key = 'daoG' + gi;
    const buyable = items.filter(it => unlockedItem(s, it.id) && canBuy(s, it.id)).length;
    const saved = ui.rowOpen && ui.rowOpen[key], open = saved === undefined ? gi === firstOpen : !!saved;
    const bought = items.reduce((a, it) => a + shopLevel(s, it.id), 0);
    return `<div class="dgroup ${open ? 'open' : ''}"><div class="dghead" data-act="toggleRow" data-key="${key}" role="button" tabindex="0" aria-expanded="${open}">
      <b>${title}</b><span class="dgsum">${buyable ? `<span class="tag gold">可修習 ${buyable}</span> ` : ''}<small class="dim">已修 ${bought} 級</small> <span class="cx">${open ? '▴' : '▾'}</span></span></div>
      ${open ? items.map(mk).join('') : ''}</div>`;
  };
  const extra = DAO_SHOP.filter(it => !it.gate && !KNOWN.has(it.id)).map(it => it.id);
  const rows = [...GROUPS, ...(extra.length ? [['其他', extra]] : [])].map(groupBox).join(''), fruitItems = DAO_SHOP.filter(it => it.gate), fruitLocked = fruitItems.length && fruitItems.every(it => !unlockedItem(s, it.id));
  const fruit = fruitLocked ? crow(ui, { key: 'dFruitLock', icon: '🔒', cls: 'locked', title: `<b>道果 ×${fruitItems.length}</b>`, sub: '渡過九重天劫後開放（見「天劫」）', detail: fruitItems.map(it => `<small>${it.icon} ${esc(it.name)}：${esc(it.desc)}</small>`).join('') }) : fruitItems.map(mk).join('');
  const ex = EXCHANGES.map(e => {
    const can = canAfford(s, { daoHeart: e.cost });
    return crow(ui, { key: 'dx' + e.id, cls: can ? 'affordable' : '', icon: e.icon, title: `<b>${esc(e.name)}</b>`, sub: esc(e.desc),
      act: `<div class="costs">${costChips(s, { daoHeart: e.cost })}</div><button class="btn ${can ? 'primary' : ''}" data-act="daoExchange" data-id="${e.id}" ${can ? '' : 'disabled'}>兌換</button>` });
  }).join('');
  return `<p class="hint">☯️ 道心 ${fmt(s.res.daoHeart)}　已轉生 ${n} 次（靈氣、靈石 +${Math.round(autoBonus(n) * 100)}%）</p>${rows}<h3 class="sub">🍑 道果（無上限）</h3>${fruit}<h3 class="sub">道心兌換</h3>${ex}`;
}
