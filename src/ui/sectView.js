// 宗門全景：建築外觀隨等級里程碑改變、老祖對話、訪客卡、打坐按鈕。
import { BUILDINGS } from '../data/buildings.js';
import { VISITOR_TYPES, PERSONALITIES } from '../data/visitors.js';
import { lvlLabel } from '../data/realms.js';
import { CONFIG } from '../config.js';
import { stageOf, stageIndex } from '../core/buildings.js';
import { clickPower } from '../core/economy.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { fmt, fmtTime } from '../core/format.js';
import { cooldownLeft } from '../core/meditate.js';
import { esc, setHTML, setText } from './dom.js';

export function mountScene(root) {
  root.innerHTML = `
    <div class="sky"><span class="moon">🌕</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span></div>
    <div class="ridge"></div>
    <div class="ancestor"><div class="avatar">👴</div><div class="bubble" data-r="bubble"></div></div>
    <div class="tiles" data-r="tiles"></div>
    <div class="visitor-slot" data-r="visitor"></div>
    <div class="meditate-slot"><button class="btn meditate" data-act="meditate"><span class="cd" data-r="cd"></span><span class="mlabel" data-r="mlabel"></span></button></div>`;
  const refs = Object.fromEntries([...root.querySelectorAll('[data-r]')].map(e => [e.dataset.r, e]));
  refs.mbtn = root.querySelector('.meditate');   // 按鈕只建一次，之後只改屬性，避免連點時被重建
  return refs;
}

export function updateScene(root, refs, s, ui) {
  // 破廟外觀決定整體氛圍（背景光暈）
  const ti = stageIndex('temple', s.buildings.temple.lv);
  root.className = `scene stage-${ti}`;
  setHTML(refs.bubble, esc(ui.quote));

  setHTML(refs.tiles, BUILDINGS.map(d => {
    const b = s.buildings[d.id], st = stageOf(d.id, b.lv);
    const built = b.lv > 0;
    const paused = built && s.t < b.pausedUntil;
    const crew = s.disciples.filter(x => x.at === d.id).map(x => DISCIPLES_BY_ID[x.defId].emoji).join('');
    return `<div class="tile ${built ? '' : 'unbuilt'} ${paused ? 'paused' : ''} ${b.lv >= CONFIG.building.maxLevel ? 'maxed' : ''} st-${stageIndex(d.id, b.lv)}"
                 title="${esc(d.name)}：${esc(st.label)}">
      <div class="emoji">${st.emoji}</div>
      <div class="tname">${esc(d.name)} <b>Lv${b.lv}</b></div>
      <div class="tstage">${paused ? '⏸ ' + fmtTime(b.pausedUntil - s.t) : esc(st.label)}</div>
      <div class="crew">${crew}</div>
    </div>`;
  }).join(''));

  setHTML(refs.visitor, visitorCard(s));
  // 打坐按鈕：冷卻中灰化並顯示進度
  const left = cooldownLeft(s), ready = left <= 0;
  refs.mbtn.disabled = !ready;
  refs.cd.style.width = (ready ? 0 : left / CONFIG.click.cooldownMs * 100).toFixed(1) + '%';
  setText(refs.mlabel, ready ? `🧘 引氣打坐 +${fmt(clickPower(s))} 靈氣` : `🧘 調息中… ${(left / 1000).toFixed(1)}s`);
}

function visitorCard(s) {
  const v = s.visitor.current;
  if (!v) return '';
  const t = VISITOR_TYPES[v.type];
  const lossText = s.settings.loss
    ? `偽裝值 +${CONFIG.endure.disguiseGain}，承受輕微損失（約 ${CONFIG.endure.loss.stoneSec} 秒靈石產出，或建築暫停 ${CONFIG.endure.loss.pauseMs / 60000} 分鐘）`
    : `偽裝值 +${CONFIG.endure.disguiseGain}（已關閉損失）`;
  return `<div class="visitor-card">
    <div class="vhead"><span class="vemoji">${t.emoji}</span>
      <div><b>${esc(v.name)}</b> <span class="tag">${esc(t.label)}</span> <span class="tag">${esc(v.personality)}</span><br>
      <small>${esc(v.sect)}・${esc(v.role)}・${esc(lvlLabel(v.lvl))}</small></div></div>
    <p class="taunt">「${esc(v.taunt)}」</p>
    <div class="vbtns">
      <button class="btn endure" data-act="endure"><b>😤 忍氣吞聲</b><small>${esc(lossText)}；記入復仇簿</small></button>
      <button class="btn show" data-act="show"><b>😏 亮一手</b><small>無損失、不加偽裝值；對方警覺，日後爆擊獎勵 ×${CONFIG.enemy.alertMult}</small></button>
    </div></div>`;
}
