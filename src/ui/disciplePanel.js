// 弟子名單：名字卡、升級、派駐（專長匹配標示 ×2）。
import { CONFIG } from '../config.js';
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { levelCapOf, levelCost, canLevel, assignedTo, starCost, canStar, canBranch, starPay, dshardsOf } from '../core/disciples.js';
import { traitText } from '../data/traits.js';
import { UR_PERKS } from '../data/urPerks.js';
import { slots } from '../core/buildings.js';
import { stat, isSpecialtyMatch, isElementMatch, starOf, contribution, elementEffect } from '../core/discipleMath.js';
import { traitValueS } from '../core/economy.js';
import { nextChapter, chaptersRead, chapterCount, lockedHint } from '../core/stories.js';
import { INSIGHTS, INSIGHT_MAX } from '../data/insights.js';
import { insightLv, insightCost, canLearn, insightActive } from '../core/insight.js';
import { BONDS } from '../data/bonds.js';
import { bondStatus } from '../core/bonds.js';
import { fmt } from '../core/format.js';
import { hasFeature } from '../core/progress.js';
import { BRANCHES, BRANCH_LEVEL } from '../data/branches.js';
import { esc, costChips, crow } from './dom.js';
import { portraitHtml } from './portrait.js';
import { canAfford } from '../core/resources.js';

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
  const sortBar = hasFeature(s, 'sort') ? `
      <div class="fgroup"><small class="dim">排序</small>${SORTS.map(x => chip('dSort', 'sort', sort, x)).join('')}</div>
      <div class="fgroup"><small class="dim">篩選</small>${FILTERS.map(x => chip('dFilter', 'flt', flt, x)).join('')}
        <select class="assign" data-change="dElem"><option value="">五行：全部</option>${ELEMS.map(e => `<option value="${e}" ${elem === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>` : '';
  const tools = `<div class="dtools">
      ${s.disciples.length >= 2 ? autoBtn(s, away) : ''}
      ${levelAllBtn(s)}
      ${sortBar}
    </div>`;
  ui.dOrder = shown.map(d => d.uid);                                           // 彈出面板的「上一位／下一位」依目前排序與篩選的順序
  const cards = shown.map(d => tile(s, ui, d, away)).join('') || '<p class="hint">沒有符合條件的弟子。</p>';
  return `${summaryBar(s, ui)}${hasFeature(s, 'insight') ? insightBox(s, ui) : ''}${slotsView(s, ui, away)}${tools}<div class="dtiles">${cards}</div>`;
}

// 頁首摘要：緣分啟用數與碎片，點開看緣分清單
function summaryBar(s, ui) {
  const rows = BONDS.map(b => ({ b, st: bondStatus(s, b) })).filter(x => x.st !== 'none');
  const act = rows.filter(x => x.st === 'active').length;
  return `<div class="dsum"><button class="dsumhead" data-act="toggleBonds" aria-expanded="${!!ui.bondsOpen}">🔗 緣分 ${act}/${rows.length} 已啟用 <span>${ui.bondsOpen ? '▴' : '▾'}</span></button>
    <span class="chip" title="通用碎片：可替任何弟子升星（每片專屬碎片 = ${CONFIG.disciple.shardSwap} 片通用），也用於專長心得">🧩 ${fmt(s.res.shard)}</span></div>
    <p class="shardnote">🧬 專屬碎片：抽到重複弟子時獲得，只能替<b>該弟子</b>升星　🧩 通用碎片：任何弟子都能用（1 專屬 = ${CONFIG.disciple.shardSwap} 通用）</p>${ui.bondsOpen ? bondsBox(s) : ''}`;
}

// 專長心得：5 種專長各 3 層，用碎片領悟；該專長弟子派駐中才生效
function insightBox(s, ui) {
  const total = INSIGHTS.reduce((a, i) => a + insightLv(s, i.spec), 0);
  const rows = INSIGHTS.map(i => {
    const lv = insightLv(s, i.spec), act = insightActive(s, i.spec), cost = insightCost(s, i.spec), can = canLearn(s, i.spec);
    const dots = Array.from({ length: INSIGHT_MAX }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
    return `<div class="irow"><span class="iname">${i.icon} <b>${i.spec}</b> <span class="dots">${dots}</span></span>
      <small class="${lv && act ? 'gold' : 'dim'}">${lv ? `${esc(i.names[lv - 1])}：${i.label} +${Math.round(lv * i.per * 100)}%${act ? '（生效中）' : `（需派駐${i.spec}弟子）`}` : `尚未領悟（${i.label} 每層 +${Math.round(i.per * 100)}%）`}</small>
      ${cost ? `<button class="btn mini ${can ? 'primary' : ''}" data-act="learnInsight" data-spec="${i.spec}" ${can ? '' : 'disabled'}>領悟「${esc(i.names[lv])}」 ${costChips(s, cost)}</button>` : '<span class="tag gold">大成</span>'}</div>`;
  }).join('');
  return crow(ui, { key: 'insight', icon: '📚', title: `<b>專長心得 ${total}/${INSIGHTS.length * INSIGHT_MAX}</b>`, sub: '用碎片領悟；有該專長的弟子派駐中才生效', detail: rows });
}

// 建築視角：每棟有駐守位的建築一列，點空位挑弟子、點已派駐的弟子取消
function slotsView(s, ui, away) {
  const rows = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
    const n = slots(s, b.id), list = assignedTo(s, b.id);
    const cells = Array.from({ length: n }, (_, i) => {
      const d = list[i];
      if (!d) return `<button class="slot empty ${ui.pickB === b.id ? 'on' : ''}" data-act="slotPick" data-b="${b.id}">＋ 空位</button>`;
      const df = DISCIPLES_BY_ID[d.defId], ef = elementEffect(d, b.id, list.filter(x => x !== d));
      const efTxt = ef > 1e-9 ? ` <i class="up">生${Math.round(ef * 100)}%</i>` : ef < -1e-9 ? ` <i class="down">剋${Math.round(ef * 100)}%</i>` : '';
      return `<button class="slot ${isSpecialtyMatch(d, b.id) ? 'match' : ''}" data-act="unassign" data-uid="${d.uid}" title="點一下取消派駐（五行：${esc(df.element)}）">${df.emoji} ${esc(df.name)}<small class="dim">${esc(df.element)}</small>${isSpecialtyMatch(d, b.id) ? ' <b>×2</b>' : ''}${efTxt}</button>`;
    }).join('');
    let picker = '';
    if (ui.pickB === b.id) {
      const cand = s.disciples.filter(d => d.at !== b.id && !away.has(d.uid)).sort((x, y) => contribution(y, b.id, list) - contribution(x, b.id, list));
      picker = `<div class="picker">${cand.map(d => {
        const df = DISCIPLES_BY_ID[d.defId], tag = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
        return `<button class="pchip" style="--rc:${RARITIES[df.rarity].color}" data-act="slotAssign" data-uid="${d.uid}" data-b="${b.id}">${df.emoji} ${esc(df.name)} <small>Lv${d.lv}${tag ? '・' + tag : ''}${d.at ? '・自' + esc(BUILDINGS_BY_ID[d.at].name) : ''}</small></button>`;
      }).join('') || '<small class="dim">沒有可派的弟子</small>'}<button class="btn mini" data-act="slotPick" data-b="">收起</button></div>`;
    }
    return `<div class="srow"><span class="sname">${esc(b.name)} <small class="dim">${list.length}/${n}</small></span><div class="slotline">${cells}</div>${picker}</div>`;
  }).join('');
  const total = BUILDINGS.reduce((a, b) => a + slots(s, b.id), 0), used = BUILDINGS.reduce((a, b) => a + Math.min(slots(s, b.id), assignedTo(s, b.id).length), 0);
  const saved = ui.rowOpen && ui.rowOpen.slots, open = saved === undefined ? !!ui.pickB : !!saved;       // 預設收起；正在選人派駐時自動展開
  return `<div class="dgroup ${open ? 'open' : ''}"><div class="dghead" data-act="toggleRow" data-key="slots" data-open="${open}" role="button" tabindex="0" aria-expanded="${open}">
    <b>📍 駐守</b><span class="dgsum"><small class="dim">${used}/${total}${total > used ? `　空位 ${total - used}` : ''}</small> <span class="cx">${open ? '▴' : '▾'}</span></span></div>
    ${open ? `<div class="slotsbox">${rows || '<small class="dim">還沒有建築有駐守位（建築 Lv1 起）</small>'}</div>` : ''}</div>`;
}

// 升星花費：該弟子的專屬碎片 have/need；不夠的部分用通用碎片抵（每 1 片專屬 = shardSwap 片通用）
function starChips(s, d) {
  const p = starPay(s, d); if (!p) return '';
  return `<span class="chip ${p.own >= p.need ? '' : 'lack'}" title="${esc(DISCIPLES_BY_ID[d.defId].name)}的專屬碎片（抽到重複時獲得）">🧬${dshardsOf(s, d.defId)}/${p.need}</span>`
    + (p.uni ? `<span class="chip ${p.ok ? '' : 'lack'}" title="專屬碎片不夠的部分，用通用碎片抵（每片專屬碎片 = ${CONFIG.disciple.shardSwap} 片通用碎片）">＋🧩${p.uni}</span>` : '');
}

// 方塊角色牌：大頭像（有立繪就用立繪）、名字、等級星級、派駐狀態；右上「升」可直接升一級；左上圖示表示有事可做。點整張牌開彈出面板。
function tile(s, ui, d, away) {
  const df = DISCIPLES_BY_ID[d.defId], r = RARITIES[df.rarity], star = starOf(d);
  const atMax = d.lv >= levelCapOf(s, d), can = !atMax && canLevel(s, d);
  const flags = [nextChapter(s, d) ? '📖' : '', starCost(d) && canStar(s, d) ? '⭐' : '', canBranch(d) ? '⬆' : ''].filter(Boolean).join('');
  const loc = away.has(d.uid) ? '<span class="dloc away">🧭 探索中</span>'
    : d.at ? `<span class="dloc ${isSpecialtyMatch(d, d.at) ? 'match' : ''}">📍 ${esc(BUILDINGS_BY_ID[d.at].name)}</span>` : '<span class="dloc idle">未派駐</span>';
  return `<div class="dtile rar-${df.rarity} ${ui.dModal === d.uid ? 'sel' : ''}" style="--rc:${r.color}" role="button" tabindex="0" data-act="openD" data-uid="${d.uid}" aria-label="${esc(df.name)}，${df.rarity}，等級 ${d.lv}">
    <div class="dport">${portraitHtml(df)}</div>
    <span class="drar">${df.rarity}</span>${flags ? `<span class="dflags" title="有事可做：📖故事 ⭐升星 ⬆進階">${flags}</span>` : ''}
    ${can ? `<button class="dquick" data-act="levelUp" data-uid="${d.uid}" title="升一級" aria-label="${esc(df.name)} 升一級">升</button>` : ''}
    <div class="dinfo"><b>${esc(df.name)}</b><small>Lv ${d.lv}/${levelCapOf(s, d)} <span class="gold">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</span></small>${loc}</div>
  </div>`;
}

// 彈出面板：點方塊牌後出現（手機從下方滑出、桌面置中）。升級、升星、故事、進階、派駐都在這裡；可用「‹ ›」切換上一位／下一位
export function disciplePopover(s, ui) {
  const d = ui.dModal ? s.disciples.find(x => x.uid === ui.dModal) : null;
  if (!d) return '';
  const df = DISCIPLES_BY_ID[d.defId], r = RARITIES[df.rarity], star = starOf(d);
  const away = s.expeditions.some(x => x.uids.includes(d.uid));
  const can = canLevel(s, d), atMax = d.lv >= levelCapOf(s, d), sc = starCost(d), br = d.branch ? BRANCHES[d.branch] : null;
  const loc = away ? '<span class="loc away">🧭 探索中</span>'
    : d.at ? `<span class="loc ${isSpecialtyMatch(d, d.at) ? 'match' : ''}">📍 ${esc(BUILDINGS_BY_ID[d.at].name)}${isSpecialtyMatch(d, d.at) ? ' ×2' : ''}</span>` : '<span class="loc idle">未派駐</span>';
  const opts = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
    const full = assignedTo(s, b.id).length >= slots(s, b.id) && d.at !== b.id;
    const tags = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
    return `<option value="${b.id}" ${d.at === b.id ? 'selected' : ''} ${full ? 'disabled' : ''}>${esc(b.name)}${tags ? `（${tags}）` : ''}${full ? '（已滿）' : ''}</option>`;
  }).join('');
  const lvBtn = atMax ? '<span class="tag">等級已達上限</span>'
    : `<button class="btn ${can ? 'primary' : ''}" data-act="levelUp" data-uid="${d.uid}" ${can ? '' : 'disabled'}>升級 ${costChips(s, levelCost(s, d))}</button>`;
  const starBtn = sc ? `<button class="btn ${canStar(s, d) ? 'primary' : ''}" data-act="starUp" data-uid="${d.uid}" ${canStar(s, d) ? '' : 'disabled'}>升星 ${starChips(s, d)}</button>` : '<span class="tag gold">已滿星</span>';
  return `<div class="dm-back" data-act="closeD"></div>
  <div class="dm-card rar-${df.rarity}" style="--rc:${r.color}" role="dialog" aria-modal="true" aria-label="${esc(df.name)}">
    <div class="dm-bar"><button class="dm-nav" data-act="dNav" data-d="-1" aria-label="上一位">‹</button><small class="dim">${esc(df.rarity)}　${esc(df.element)}・${esc(df.specialty)}・${esc(df.personality)}</small><button class="dm-nav" data-act="dNav" data-d="1" aria-label="下一位">›</button><button class="hx" data-act="closeD" title="關閉" aria-label="關閉">✕</button></div>
    <div class="dm-hero"><div class="dm-port">${portraitHtml(df)}</div>
      <div class="dm-title"><b>${esc(df.name)}</b>${br ? ` <span class="tag gold">${br.icon}${br.name}</span>` : ''}
        <span>Lv ${d.lv}/${levelCapOf(s, d)} <span class="gold">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</span></span>
        <small class="dim">屬性 ${fmt(stat(d))}</small>${loc}</div></div>
    <small class="dm-quote">「${esc(df.quote)}」</small>
    <small class="trait ${d.at ? 'on' : ''}">✦ ${esc(traitText(df.trait.key, traitValueS(s, d)))}${d.at ? '（生效中）' : '（派駐後生效）'}</small>
    ${d.tag ? `<small class="trait on">${d.tag === 'fate' ? '🌠 氣運之子：訪客更頻繁（+15%）、爆擊獎勵 +10%，但仇家會找上門' : '🕵 反間中：仇人成長 ×0.85，每次引爆 20% 機率洩密'}</small>` : ''}
    ${UR_PERKS[df.id] ? `<small class="trait ${d.at ? 'on' : ''}">🌟 專屬「${esc(UR_PERKS[df.id].name)}」：${esc(UR_PERKS[df.id].desc)}${d.at ? '（生效中）' : '（派駐後生效）'}</small>` : ''}
    <div class="dm-actions">${lvBtn}${starBtn}</div>
    ${storyRow(s, d)}
    ${branchRow(s, d)}
    <label class="dm-assign"><small class="dim">派駐</small><select class="assign" data-change="assign" data-uid="${d.uid}"><option value="">— 未派駐 —</option>${opts}</select></label>
  </div>`;
}

// 進階：Lv10 時二選一，選後顯示結果
function branchRow(s, d) {
  if (d.branch) { const b = BRANCHES[d.branch]; return `<small class="gold">${b.icon} 進階：${b.name}——${esc(b.desc)}</small>`; }
  if (d.lv < BRANCH_LEVEL) return `<small class="dim">升到 Lv${BRANCH_LEVEL} 可二選一進階</small>`;
  return `<div class="branchrow">${Object.entries(BRANCHES).map(([k, b]) => `<button class="btn" data-act="branch" data-uid="${d.uid}" data-b="${k}" ${canAfford(s, b.cost) ? '' : 'disabled'} title="${esc(b.desc)}">${b.icon} ${b.name}<small>${esc(b.desc)}</small><small class="costs">${costChips(s, b.cost)}</small></button>`).join('')}</div>`;
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

// 補滿空位按鈕：沒有閒置弟子或沒有空位時灰掉並說明原因（避免點了只得到一則「沒有…」通知）
function autoBtn(s, away) {
  const idle = s.disciples.filter(d => !d.at && !away.has(d.uid)).length;
  const free = BUILDINGS.reduce((n, b) => n + Math.max(0, slots(s, b.id) - assignedTo(s, b.id).length), 0);
  const why = !idle ? '沒有未派駐的弟子' : !free ? '沒有空著的駐守位（升級建築可增加）' : '';
  return `<button class="btn ${why ? '' : 'primary'}" data-act="autoAssign" ${why ? 'disabled' : ''} title="${esc(why || '把未派駐的弟子依專長、五行與緣分放進空位（已派駐的不動）')}">⚡ 補滿空位${why ? `<small class="dim">（${esc(why)}）</small>` : ''}</button>`;
}

// 全部升級：一次把買得起的弟子都升上去（最便宜的先升）；沒有買得起的就灰掉
function levelAllBtn(s) {
  const any = s.disciples.some(d => canLevel(s, d));
  return `<button class="btn ${any ? 'primary' : ''}" data-act="levelAll" ${any ? '' : 'disabled'} title="反覆升級買得起且最便宜的弟子，直到買不起">⬆ 全部升級</button>`;
}
