// 九重天劫：化神後的長線目標。進度、渡劫按鈕、已渡的後日談故事；九劫全渡後提示「道果」。
import { TRIALS, HEAVENS } from '../data/ascend.js';
import { status, doneCount, complete, readyCount, reached } from '../core/ascend.js';
import { crow, esc } from './dom.js';

const PERM = { qiMult: '靈氣', stoneMult: '靈石', powerMult: '戰力', burstReward: '爆擊獎勵' };
export const permLine = p => Object.entries(p || {}).map(([k, v]) => `${PERM[k]} +${Math.round(v * 100)}%`).join('、');
const rewardLine = r => `道心 +${r.dao}${r.perm ? `　永久：${permLine(r.perm)}` : ''}`;

function row(s, ui, tr) {
  const st = status(s, tr), pct = Math.floor(st.cur / st.target * 100);
  const act = st.state === 'ready' ? `<button class="btn primary" data-act="ascendClaim" data-id="${tr.id}">⚡ 渡劫</button>`
    : st.state === 'done' ? '<span class="tag gold">已渡</span>' : '';
  const sub = st.state === 'done' ? `<small class="dim">${esc(rewardLine(tr.reward))}</small>`
    : `<small class="dim">${esc(tr.desc)}</small><div class="gbar"><div style="width:${pct}%"></div></div><small class="${st.state === 'failed' ? 'gold' : 'dim'}">${esc(st.text)}${reached(s) ? '' : '（需先抵達化神）'}</small>`;
  const detail = st.state === 'done'
    ? `<b class="gold">${esc(tr.story[0])}</b><br><span class="storytext">${esc(tr.story[1])}</span>`
    : `<small class="dim">獎勵：${esc(rewardLine(tr.reward))}</small>`;
  return crow(ui, { key: 'asc' + tr.id, cls: st.state === 'ready' ? 'affordable' : st.state === 'done' ? 'done' : st.state === 'failed' ? 'failed' : '', icon: st.state === 'done' ? '✅' : tr.icon,
    title: `<b>${esc(tr.name)}</b>`, sub, act, detail });
}

export function ascendPanel(s, ui) {
  const n = doneCount(s), ready = readyCount(s);
  const head = `<p class="hint">⚡ 九重天劫　已渡 ${n}/${TRIALS.length}${ready ? `　<b class="gold">${ready} 劫待渡</b>` : ''}。條件要在<b>化神</b>時成立，多半看「本輪」的表現——轉生後可以再試。每渡一劫得道心與永久加成，並解鎖一段後日談。</p>`;
  const groups = HEAVENS.map(h => `<h3 class="sub">${esc(h.name)}</h3><p class="hint">${esc(h.blurb)}</p>${TRIALS.filter(t => t.heaven === h.id).map(t => row(s, ui, t)).join('')}`).join('');
  const fruit = complete(s) ? '<p class="hint gold">🍑 九劫圓滿——「道心」頁已開放<b>道果</b>：沒有上限的永久加成，是化神之後最長的一條路。</p>'
    : '<p class="hint">🍑 九劫全渡後，「道心」頁會開放沒有上限的<b>道果</b>。</p>';
  return head + groups + fruit;
}
