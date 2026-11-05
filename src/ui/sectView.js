// 宗門全景：建築外觀隨等級里程碑改變、老祖對話、訪客卡、打坐按鈕。
import { BUILDINGS } from '../data/buildings.js';
import { VISITOR_TYPES, PERSONALITIES } from '../data/visitors.js';
import { lvlLabel } from '../data/realms.js';
import { CONFIG } from '../config.js';
import { stageOf, stageIndex } from '../core/buildings.js';
import { clickPower } from '../core/economy.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { fmt, fmtTime } from '../core/format.js';
import { cooldownLeft, cooldownMs } from '../core/meditate.js';
import { assess } from '../core/endure.js';
import { nemOf } from '../core/nemesis.js';
import { defOf as incidentDef, costOf, canChoose } from '../core/incidents.js';
import { costChips } from './dom.js';
import { esc, setHTML, setText } from './dom.js';

export function mountScene(root) {
  root.innerHTML = `
    <div class="daynight"></div><div class="vignette"></div>
    <div class="sky"><span class="moon">🌕</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span></div>
    <div class="ridge"></div>
    <div class="ancestor"><div class="avatar" data-r="avatar">👴</div><div class="bubble" data-r="bubble"></div></div>
    <div class="tiles" data-r="tiles">${BUILDINGS.map(d => `<div class="tile" data-id="${d.id}">
      <div class="emoji"></div><div class="tname"><span class="tn">${esc(d.name)}</span> <b class="tl"></b></div>
      <div class="tstage"></div><div class="crew"></div></div>`).join('')}</div>
    <div class="visitor-slot" data-r="visitor"></div>
    <div class="incident-slot" data-r="incident"></div>
    <div class="meditate-slot"><button class="btn meditate" data-act="meditate"><span class="cd" data-r="cd"></span><span class="mlabel" data-r="mlabel"></span></button></div>`;
  const refs = Object.fromEntries([...root.querySelectorAll('[data-r]')].map(e => [e.dataset.r, e]));
  refs.mbtn = root.querySelector('.meditate');   // 按鈕只建一次，之後只改屬性，避免連點時被重建
  // 建築格只建一次，之後只更新文字與 class，CSS 動畫才不會每秒重播
  refs.tileEls = Object.fromEntries([...root.querySelectorAll('.tile')].map(e => [e.dataset.id, {
    el: e, emoji: e.querySelector('.emoji'), lv: e.querySelector('.tl'), stage: e.querySelector('.tstage'), crew: e.querySelector('.crew') }]));
  return refs;
}

const setClass = (el, c) => { if (el._c !== c) { el.className = c; el._c = c; } };

export function updateScene(root, refs, s, ui) {
  // 破廟外觀決定整體氛圍；宿敵來訪時加上紅色暈影
  const ti = stageIndex('temple', s.buildings.temple.lv);
  setClass(root, `scene stage-${ti}${s.visitor.current?.nemesisId ? ' nemesis-alert' : ''}`);
  if (refs.bubble._q !== ui.quote) {                      // 老祖換台詞：氣泡彈一下
    refs.bubble._q = ui.quote; setHTML(refs.bubble, esc(ui.quote));
    refs.bubble.classList.remove('pop'); void refs.bubble.offsetWidth; refs.bubble.classList.add('pop');
  }

  for (const d of BUILDINGS) {
    const b = s.buildings[d.id], st = stageOf(d.id, b.lv), t = refs.tileEls[d.id];
    const built = b.lv > 0, paused = built && s.t < b.pausedUntil;
    setClass(t.el, `tile ${built ? '' : 'unbuilt'} ${paused ? 'paused' : ''} ${b.lv >= CONFIG.building.maxLevel ? 'maxed' : ''} st-${stageIndex(d.id, b.lv)}${t.el._pop ? ' popup' : ''}`);
    setText(t.emoji, st.emoji); setText(t.lv, 'Lv' + b.lv);
    setText(t.stage, paused ? '⏸ ' + fmtTime(b.pausedUntil - s.t) : st.label);
    t.el.title = `${d.name}：${st.label}`;
    setHTML(t.crew, s.disciples.filter(x => x.at === d.id).map(x => `<span>${DISCIPLES_BY_ID[x.defId].emoji}</span>`).join(''));
  }

  // 訪客／事件卡：只有「剛出現」的那一小段時間才播進場動畫，避免內容更新時重播
  const v = s.visitor.current, inc = s.incident.current;
  if ((v?.id ?? null) !== ui._vid) { ui._vid = v?.id ?? null; ui._venter = Date.now() + 900; }
  if ((inc?.expiresAt ?? null) !== ui._iid) { ui._iid = inc?.expiresAt ?? null; ui._ienter = Date.now() + 900; }
  setHTML(refs.visitor, visitorCard(s, Date.now() < ui._venter));
  setHTML(refs.incident, incidentCard(s, Date.now() < ui._ienter));
  // 打坐按鈕：冷卻中灰化並顯示進度
  const left = cooldownLeft(s), ready = left <= 0;
  refs.mbtn.disabled = !ready;
  refs.cd.style.width = (ready ? 0 : left / cooldownMs(s) * 100).toFixed(1) + '%';
  setText(refs.mlabel, ready ? `🧘 引氣打坐 +${fmt(clickPower(s))} 靈氣` : `🧘 調息中… ${(left / 1000).toFixed(1)}s`);
}

const VERDICT_TXT = { crush: ['v-crush', '你能碾壓他'], narrow: ['v-narrow', '你勉強勝他'], fail: ['v-fail', '你打不過他'] };

function visitorCard(s, entering = false) {
  const v = s.visitor.current;
  if (!v) return '';
  const t = VISITOR_TYPES[v.type], a = assess(s, v), [vc, vt] = a.escape ? ['v-narrow', '勉強勝，但他會脫身'] : VERDICT_TXT[a.verdict];
  const nem = v.nemesisId ? nemOf(v) : null;
  const L = CONFIG.endure.loss;
  const lossOn = s.settings.loss;
  const endureText = `偽裝值 +${CONFIG.endure.disguiseGain}，記入復仇簿（保留連鎖與大獎勵）`
    + (lossOn ? `；損失約 ${L.stoneSec} 秒靈石或建築暫停 ${L.pauseMs / 60000} 分${a.endureMult > 1 ? `　<b class="gold">憋屈 ×${a.endureMult.toFixed(2)}</b>` : ''}` : '（已關閉損失）');
  const showText = {
    beat: `${a.winText}（對方不入簿、不加偽裝值）`,
    rash: `<b class="red">⚠ 逞強</b>：打不過還亮，損失 ×${a.showMult}，對方警覺入簿（日後獎勵 ×${CONFIG.enemy.alertMult}）`,
    nemesis: `<b class="red">⚠ 宿敵不能當場打倒</b>：損失 ×${a.showMult}，對方入簿（留到引爆再算帳，要碾壓才算擊敗）`,
    offend: `<b class="red">⚠ 長老得罪不起</b>：損失 ×${a.showMult}，對方警覺入簿（日後獎勵 ×${CONFIG.enemy.alertMult}）`,
  }[a.showKind];
  return `<div class="visitor-card ${nem ? 'nemesis' : ''} ${entering ? 'enter' : ''}">
    <div class="vhead"><span class="vemoji">${nem ? nem.emoji : t.emoji}</span>
      <div><b>${esc(v.name)}</b> ${nem ? '<span class="tag gold">宿敵</span>' : ''}<span class="tag">${esc(t.label)}</span> <span class="tag">${esc(v.personality)}</span> <span class="verdict ${vc}">${vt}</span><br>
      <small>${esc(v.sect)}・${esc(v.role)}・${esc(lvlLabel(v.lvl))}</small></div></div>
    <p class="taunt">「${esc(v.taunt)}」</p>
    <div class="vbtns">
      <button class="btn endure" data-act="endure"><b>😤 忍氣吞聲</b><small>${endureText}</small></button>
      <button class="btn show ${a.showKind === 'beat' ? 'good' : 'bad'}" data-act="show"><b>😏 亮一手</b><small>${showText}</small></button>
    </div></div>`;
}

// 隨機事件卡：不顯示倒數數字（避免每秒重繪害按鈕點不到），逾時視為「無視」
function incidentCard(s, entering = false) {
  const d = incidentDef(s); if (!d) return '';
  return `<div class="incident-card ${entering ? 'enter' : ''}">
    <div class="vhead"><span class="vemoji">${d.emoji}</span><div><b>${esc(d.title)}</b> <span class="tag">突發事件</span> <small class="dim">（限時，逾時視為無視）</small></div></div>
    <p class="taunt">${esc(d.text)}</p>
    <div class="vbtns" style="grid-template-columns:repeat(${d.choices.length},1fr)">
      ${d.choices.map((c, i) => {
        const cost = costOf(s, c), ok = canChoose(s, i);
        return `<button class="btn incbtn ${ok ? '' : 'nope'}" data-act="incident" data-i="${i}" ${ok ? '' : 'disabled'}>
          <b>${esc(c.label)}</b> ${Object.keys(cost).length ? costChips(s, cost) : ''}<small>${esc(c.desc)}</small></button>`;
      }).join('')}
    </div></div>`;
}
