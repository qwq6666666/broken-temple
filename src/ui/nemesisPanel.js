// 宿敵錄：已解鎖劇情、見過的嘲諷、擊敗後的故事與專屬法寶。
import { NEMESES, AWAKEN } from '../data/nemeses.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { isDefeated, nemState, unlocked, condText, present, awakeLv, canAwaken, awakenNeedText } from '../core/nemesis.js';
import { esc, crow } from './dom.js';

export function nemesisPanel(s, ui) {
  const mainList = NEMESES.filter(n => !n.epilogue), epiList = NEMESES.filter(n => n.epilogue);
  const mainDone = mainList.filter(n => isDefeated(s, n.id)).length, epiDone = epiList.filter(n => isDefeated(s, n.id)).length;
  const rows = NEMESES.map(n => {
    const st = s.nemeses[n.id] || { met: 0 }, defeated = isDefeated(s, n.id), open = defeated || st.met > 0 || unlocked(s, n);
    if (!open) return crow(ui, { key: 'n' + n.id, cls: 'locked', icon: '❔', title: '<b>？？？</b>', sub: `解鎖條件：${esc(condText(s, n))}` });
    const seen = n.intro.slice(0, Math.max(1, st.met)).map(t => `<small class="dim">「${esc(t)}」</small>`).join('');
    const art = ARTIFACTS_BY_ID[n.reward.artifact];
    const aw = awakeLv(s, n.id), awTag = defeated ? ` <span class="tag ${canAwaken(s, n) ? 'red' : ''}">覺醒 ${aw}/${AWAKEN.maxLv}</span>` : '';
    const status = defeated ? '<span class="tag gold">已擊敗</span>' : present(s, n.id) ? '<span class="tag red">在復仇簿中</span>' : st.met ? '<span class="tag">已現身</span>' : '<span class="tag">尚未現身</span>';
    const detail = `${st.met ? seen : `<small class="dim">${esc(condText(s, n) || '隨時可能登場')}</small>`}
      ${defeated ? `<p class="nemstory">${esc(n.story.defeat)}</p>` : ''}
      ${defeated ? `<small class="gold">🌟 ${esc(awakenNeedText(s, n))}${canAwaken(s, n) ? '（條件已達成，將在訪客中登場）' : ''}</small>` : ''}
      <small>獎勵：🎫${n.reward.token} 💎${n.reward.stone}　${art ? `${art.emoji}${esc(art.name)}（${esc(art.desc)}）` : ''}</small>`;
    return crow(ui, { key: 'n' + n.id, cls: defeated ? 'done' : '', icon: n.emoji, title: `<b>${esc(n.name)}</b>`, badges: ` <span class="tag">${esc(n.title)}</span> <span class="tag">五行${esc(n.element)}</span>${awTag}`, act: status,
      sub: esc(st.met ? n.intro[Math.max(1, st.met) - 1] : (condText(s, n) || '隨時可能登場')), detail });
  }).join('');
  return `<p class="hint">主線宿敵 ${mainDone}/${mainList.length}（擊敗全部才算「舊債還清」）・後日談宿敵 ${epiDone}/${epiList.length}（另計）</p>${rows}`;
}
