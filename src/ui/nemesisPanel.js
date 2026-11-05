// 宿敵錄：已解鎖劇情、見過的嘲諷、擊敗後的故事與專屬法寶。
import { NEMESES } from '../data/nemeses.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { isDefeated, nemState, unlocked, condText, present } from '../core/nemesis.js';
import { esc } from './dom.js';

export function nemesisPanel(s) {
  const done = NEMESES.filter(n => isDefeated(s, n.id)).length;
  const rows = NEMESES.map(n => {
    const st = s.nemeses[n.id] || { met: 0 }, defeated = isDefeated(s, n.id), open = defeated || st.met > 0 || unlocked(s, n);
    if (!open) return `<div class="card nem locked"><div class="big">❔</div><div class="body"><b>？？？</b><br><small class="dim">解鎖條件：${esc(condText(s, n))}</small></div></div>`;
    const seen = n.intro.slice(0, Math.max(1, st.met)).map(t => `<small class="dim">「${esc(t)}」</small>`).join('<br>');
    const art = ARTIFACTS_BY_ID[n.reward.artifact];
    const status = defeated ? '<span class="tag gold">已擊敗</span>' : present(s, n.id) ? '<span class="tag red">在復仇簿中</span>' : st.met ? '<span class="tag">已現身</span>' : '<span class="tag">尚未現身</span>';
    return `<div class="card nem ${defeated ? 'done' : ''}">
      <div class="big">${n.emoji}</div>
      <div class="body"><div class="row"><b>${esc(n.name)}</b> <span class="tag">${esc(n.title)}</span> ${status}</div>
        ${st.met ? seen : `<small class="dim">${esc(condText(s, n) || '隨時可能登場')}</small>`}
        ${defeated ? `<p class="nemstory">${esc(n.story.defeat)}</p>` : ''}
        <small>獎勵：🎫${n.reward.token} 💎${n.reward.stone}　${art ? `${art.emoji}${esc(art.name)}（${esc(art.desc)}）` : ''}</small></div></div>`;
  }).join('');
  return `<p class="hint">宿敵 ${done}/${NEMESES.length}</p>${rows}`;
}
