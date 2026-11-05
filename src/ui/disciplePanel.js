// 弟子名單：名字卡、升級、派駐（專長匹配標示 ×2）。
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { levelCapOf, levelCost, canLevel, assignedTo, starCost, canStar } from '../core/disciples.js';
import { traitText } from '../data/traits.js';
import { slots } from '../core/buildings.js';
import { stat, isSpecialtyMatch, isElementMatch, starOf } from '../core/discipleMath.js';
import { traitValueS } from '../core/economy.js';
import { nextChapter, chaptersRead, chapterCount, lockedHint } from '../core/stories.js';
import { BONDS } from '../data/bonds.js';
import { bondStatus } from '../core/bonds.js';
import { fmt } from '../core/format.js';
import { esc, costChips } from './dom.js';

export function disciplePanel(s) {
  if (!s.disciples.length)
    return '<p class="hint">還沒有弟子。到「招賢」用招賢令抽卡。</p>';
  const sorted = [...s.disciples].sort((a, b) =>
    RARITY_ORDER.indexOf(DISCIPLES_BY_ID[b.defId].rarity) - RARITY_ORDER.indexOf(DISCIPLES_BY_ID[a.defId].rarity) || b.lv - a.lv);
  return `${bondsBox(s)}<p class="hint">🧩 碎片：${fmt(s.res.shard)}　等級上限 = 10 + 演武場×2 + 星級×2</p><div class="dgrid">` + sorted.map(d => {
    const df = DISCIPLES_BY_ID[d.defId], r = RARITIES[df.rarity];
    const can = canLevel(s, d), atMax = d.lv >= levelCapOf(s, d), sc = starCost(d), star = starOf(d);
    const opts = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => {
      const full = assignedTo(s, b.id).length >= slots(s, b.id) && d.at !== b.id;
      const tags = [isSpecialtyMatch(d, b.id) ? '專長×2' : '', isElementMatch(d, b.id) ? '五行' : ''].filter(Boolean).join('・');
      return `<option value="${b.id}" ${d.at === b.id ? 'selected' : ''} ${full ? 'disabled' : ''}>${esc(b.name)}${tags ? `（${tags}）` : ''}${full ? '（已滿）' : ''}</option>`;
    }).join('');
    const match = d.at && isSpecialtyMatch(d, d.at);
    return `<div class="dcard" style="--rc:${r.color}">
      <div class="dtop"><span class="rar">${df.rarity}</span><span class="de">${df.emoji}</span></div>
      <b>${esc(df.name)}</b>
      <small class="dim" title="${esc(df.quote)}">${esc(df.element)}・${esc(df.specialty)}・${esc(df.personality)}</small>
      <small>Lv ${d.lv}/${levelCapOf(s, d)}・屬性 ${fmt(stat(d))} <span class="gold">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</span></small>
      <small class="trait ${d.at ? 'on' : ''}">✦ ${esc(traitText(df.trait.key, traitValueS(s, d)))}${d.at ? '（生效中）' : '（派駐後生效）'}</small>
      ${storyRow(s, d)}
      <select class="assign" data-change="assign" data-uid="${d.uid}">
        <option value="">— 未派駐 —</option>${opts}
      </select>
      ${match ? '<small class="gold">✔ 專長匹配 ×2</small>' : ''}
      ${sc ? `<button class="btn ${canStar(s, d) ? 'primary' : ''}" data-act="starUp" data-uid="${d.uid}" ${canStar(s, d) ? '' : 'disabled'}>升星 ${costChips(s, sc)}</button>` : '<span class="tag gold">滿星</span>'}
      ${atMax ? '<span class="tag">已達上限</span>'
        : `<div class="costs">${costChips(s, levelCost(s, d))}</div>
           <button class="btn ${can ? 'primary' : ''}" data-act="levelUp" data-uid="${d.uid}" ${can ? '' : 'disabled'}>升級</button>`}
    </div>`;
  }).join('') + '</div>';
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
