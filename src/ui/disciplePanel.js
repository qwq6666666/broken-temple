// 弟子名單：名字卡、升級、派駐（專長匹配標示 ×2）。
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { levelCapOf, levelCost, canLevel, assignedTo, starCost, canStar } from '../core/disciples.js';
import { traitText } from '../data/traits.js';
import { slots } from '../core/buildings.js';
import { stat, isSpecialtyMatch, isElementMatch, starOf, contribution } from '../core/discipleMath.js';
import { traitValueS } from '../core/economy.js';
import { nextChapter, chaptersRead, chapterCount, lockedHint } from '../core/stories.js';
import { BONDS } from '../data/bonds.js';
import { bondStatus } from '../core/bonds.js';
import { fmt } from '../core/format.js';
import { esc, costChips } from './dom.js';

const SORTS = [['rarity', '稀有度'], ['lv', '等級'], ['at', '派駐']];
const FILTERS = [['all', '全部'], ['idle', '未派駐'], ['lvl', '可升級'], ['story', '可讀故事']];
const ELEMS = ['金', '木', '水', '火', '土'];
const rIdx = d => RARITY_ORDER.indexOf(DISCIPLES_BY_ID[d.defId].rarity);
const sorters = {
  rarity: (a, b) => rIdx(b) - rIdx(a) || b.lv - a.lv,
  lv: (a, b) => b.lv - a.lv || rIdx(b) - rIdx(a),
  at: (a, b) => (a.at ? 1 : 0) - (b.at ? 1 : 0) || rIdx(b) - rIdx(a) || b.lv - a.lv,      // 未派駐排前面
};

export function disciplePanel(s, ui) {
  if (!s.disciples.length)
    return '<p class="hint">還沒有弟子。到「招賢」用招賢令抽卡。</p>';
  const sort = ui.dSort || 'rarity', flt = ui.dFilter || 'all', elem = ui.dElem || '';
  const away = new Set(s.expeditions.flatMap(x => x.uids));
  const shown = s.disciples.filter(d =>
    (!elem || DISCIPLES_BY_ID[d.defId].element === elem)
    && (flt === 'all' || (flt === 'idle' && !d.at) || (flt === 'lvl' && canLevel(s, d)) || (flt === 'story' && nextChapter(s, d)))
  ).sort(sorters[sort]);
  const chip = (act, key, cur, [k, label]) => `<button class="fchip ${cur === k ? 'on' : ''}" data-act="${act}" data-v="${k}">${label}</button>`;
  const tools = `<div class="dtools">
      <button class="btn primary" data-act="autoAssign" title="依專長、五行與緣分重新派駐所有弟子（探索中的除外）">⚡ 一鍵最佳派駐</button>
      <div class="fgroup"><small class="dim">排序</small>${SORTS.map(x => chip('dSort', 'sort', sort, x)).join('')}</div>
      <div class="fgroup"><small class="dim">篩選</small>${FILTERS.map(x => chip('dFilter', 'flt', flt, x)).join('')}
        <select class="assign" data-change="dElem"><option value="">五行：全部</option>${ELEMS.map(e => `<option value="${e}" ${elem === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
    </div>`;
  const cards = shown.map(d => card(s, ui, d, away)).join('') || '<p class="hint">沒有符合條件的弟子。</p>';
  return `${summaryBar(s, ui)}${slotsView(s, ui, away)}${tools}<div class="dgrid">${cards}</div>`;
}

// 頁首摘要：緣分啟用數與碎片，點開看緣分清單
function summaryBar(s, ui) {
  const rows = BONDS.map(b => ({ b, st: bondStatus(s, b) })).filter(x => x.st !== 'none');
  const act = rows.filter(x => x.st === 'active').length;
  return `<div class="dsum"><button class="dsumhead" data-act="toggleBonds" aria-expanded="${!!ui.bondsOpen}">🔗 緣分 ${act}/${rows.length} 已啟用 <span>${ui.bondsOpen ? '▴' : '▾'}</span></button>
    <span class="chip">🧩 ${fmt(s.res.shard)}</span></div>${ui.bondsOpen ? bondsBox(s) : ''}`;
}

// 建築視角：每棟有駐守位的建築一列，點空位挑弟子、點已派駐的弟子取消
function slotsView(s, ui, away) {
  const rows = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
    const n = slots(s, b.id), list = assignedTo(s, b.id);
    const cells = Array.from({ length: n }, (_, i) => {
      const d = list[i];
      if (!d) return `<button class="slot empty ${ui.pickB === b.id ? 'on' : ''}" data-act="slotPick" data-b="${b.id}">＋ 空位</button>`;
      const df = DISCIPLES_BY_ID[d.defId];
      return `<button class="slot ${isSpecialtyMatch(d, b.id) ? 'match' : ''}" data-act="unassign" data-uid="${d.uid}" title="點一下取消派駐">${df.emoji} ${esc(df.name)}${isSpecialtyMatch(d, b.id) ? ' <b>×2</b>' : ''}</button>`;
    }).join('');
    let picker = '';
    if (ui.pickB === b.id) {
      const cand = s.disciples.filter(d => d.at !== b.id && !away.has(d.uid)).sort((x, y) => contribution(y, b.id) - contribution(x, b.id));
      picker = `<div class="picker">${cand.map(d => {
        const df = DISCIPLES_BY_ID[d.defId], tag = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
        return `<button class="pchip" style="--rc:${RARITIES[df.rarity].color}" data-act="slotAssign" data-uid="${d.uid}" data-b="${b.id}">${df.emoji} ${esc(df.name)} <small>Lv${d.lv}${tag ? '・' + tag : ''}${d.at ? '・自' + esc(BUILDINGS_BY_ID[d.at].name) : ''}</small></button>`;
      }).join('') || '<small class="dim">沒有可派的弟子</small>'}<button class="btn mini" data-act="slotPick" data-b="">收起</button></div>`;
    }
    return `<div class="srow"><span class="sname">${esc(b.name)} <small class="dim">${list.length}/${n}</small></span><div class="slotline">${cells}</div>${picker}</div>`;
  }).join('');
  return `<div class="slotsbox"><b>📍 駐守</b>${rows || '<small class="dim">還沒有建築有駐守位（建築 Lv1 起）</small>'}</div>`;
}

// 精簡卡：頭像、名字、等級星級、派駐位置、升級；點「詳情」展開特性、故事、升星、手動派駐
function card(s, ui, d, away) {
  const df = DISCIPLES_BY_ID[d.defId], r = RARITIES[df.rarity];
  const can = canLevel(s, d), atMax = d.lv >= levelCapOf(s, d), sc = starCost(d), star = starOf(d);
  const open = !!(ui.dOpen && ui.dOpen[d.uid]);
  const ch = nextChapter(s, d);
  const loc = away.has(d.uid) ? '<span class="loc away">🧭 探索中</span>'
    : d.at ? `<span class="loc ${isSpecialtyMatch(d, d.at) ? 'match' : ''}">📍 ${esc(BUILDINGS_BY_ID[d.at].name)}${isSpecialtyMatch(d, d.at) ? ' ×2' : ''}</span>` : '<span class="loc idle">未派駐</span>';
  const lvBtn = atMax ? '<span class="tag">已達上限</span>'
    : `<button class="btn ${can ? 'primary' : ''}" data-act="levelUp" data-uid="${d.uid}" ${can ? '' : 'disabled'}>升級 ${costChips(s, levelCost(s, d))}</button>`;
  let detail = '';
  if (open) {
    const opts = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
      const full = assignedTo(s, b.id).length >= slots(s, b.id) && d.at !== b.id;
      const tags = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
      return `<option value="${b.id}" ${d.at === b.id ? 'selected' : ''} ${full ? 'disabled' : ''}>${esc(b.name)}${tags ? `（${tags}）` : ''}${full ? '（已滿）' : ''}</option>`;
    }).join('');
    detail = `<div class="ddetail">
      <small class="dim" title="${esc(df.quote)}">${esc(df.element)}・${esc(df.specialty)}・${esc(df.personality)}　屬性 ${fmt(stat(d))}</small>
      <small class="trait ${d.at ? 'on' : ''}">✦ ${esc(traitText(df.trait.key, traitValueS(s, d)))}${d.at ? '（生效中）' : '（派駐後生效）'}</small>
      ${storyRow(s, d)}
      <select class="assign" data-change="assign" data-uid="${d.uid}"><option value="">— 未派駐 —</option>${opts}</select>
      ${sc ? `<button class="btn ${canStar(s, d) ? 'primary' : ''}" data-act="starUp" data-uid="${d.uid}" ${canStar(s, d) ? '' : 'disabled'}>升星 ${costChips(s, sc)}</button>` : '<span class="tag gold">滿星</span>'}
    </div>`;
  }
  return `<div class="dcard ${open ? 'open' : ''}" style="--rc:${r.color}">
    <div class="dhead"><span class="de">${df.emoji}</span>
      <div class="dname"><b>${esc(df.name)}</b> <span class="rar">${df.rarity}</span>
        <small>Lv ${d.lv}/${levelCapOf(s, d)} <span class="gold">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</span></small></div></div>
    ${loc}${ch ? `<button class="btn mini primary" data-act="readStory" data-uid="${d.uid}">📖 讀故事</button>` : ''}
    ${lvBtn}
    <button class="dmore" data-act="toggleD" data-uid="${d.uid}" aria-expanded="${open}">${open ? '收合 ▴' : '詳情 ▾'}</button>
    ${detail}
  </div>`;
}

// 故事：可讀時亮起；已讀可回憶；未達成顯示解鎖條件
function storyRow(s, d) {
  const ch = nextChapter(s, d), read = chaptersRead(s, d.defId), hint = lockedHint(s, d);
  return `<div class="storyrow">${ch ? `<button class="btn mini primary" data-act="readStory" data-uid="${d.uid}">📖 讀故事・第${ch.idx}章</button>` : ''}`
    + `${read ? `<button class="btn mini" data-act="viewStory" data-def="${d.defId}">📖 回憶 ${read}/${chapterCount(d.defId)}</button>` : ''}`
    + `${!ch && hint ? `<small class="dim">${esc(hint)}</small>` : ''}</div>`;
}

// 緣分：只列出至少集到一位的；已啟用的亮起
const ST = { active: ['已啟用', 'on'], apart: ['需派駐在同一棟建築', 'warn'], half: ['缺另一位弟子', ''] };
function bondsBox(s) {
  const rows = BONDS.map(b => ({ b, st: bondStatus(s, b) })).filter(x => x.st !== 'none');
  if (!rows.length) return '';
  const names = b => `${DISCIPLES_BY_ID[b.a].emoji}${esc(DISCIPLES_BY_ID[b.a].name)} ＋ ${DISCIPLES_BY_ID[b.b].emoji}${esc(DISCIPLES_BY_ID[b.b].name)}`;
  return `<div class="bonds"><b>🔗 緣分</b> <small class="dim">（兩人派駐在同一棟建築即生效）</small>` + rows.map(({ b, st }) =>
    `<div class="bond ${ST[st][1]}"><span>${esc(b.name)}</span><span>${names(b)}</span><span>${Object.entries(b.effect).map(([k, v]) => esc(traitText(k, v))).join('、')}</span><small>${ST[st][0]}</small></div>`).join('') + '</div>';
}
