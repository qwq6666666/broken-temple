// 宗門全景：建築外觀隨等級里程碑改變、老祖對話、訪客卡、打坐按鈕。
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.js';
import { VISITOR_TYPES } from '../data/visitors.js';
import { lvlLabel, REALMS } from '../data/realms.js';
import { CONFIG } from '../config.js';
import { stageOf, stageIndex, upgradeCost, canUpgrade, isMax, isCapped, slots, realmNeededFor, isBuildingUnlocked, extraLevels, maxLevelOf } from '../core/buildings.js';
import { upgradeButtons, milestoneText } from './buildingPanel.js';
import { SPECS, SPEC_LEVEL, specText } from '../data/specs.js';
import { tierOfSect, repOf } from '../core/factions.js';
import { FACTION_RULES as FR, FACTIONS_BY_ID, FACTION_OF_SECT, FACTION_TIERS } from '../data/factions.js';
import { stonePerSec, realmOf, clickPower } from '../core/economy.js';
import { chosenSpec } from '../core/spec.js';
import { drawBuilding, POS, DRAW_ORDER, BACKDROP } from './sceneArt.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { fmt } from '../core/format.js';
import { cooldownLeft, cooldownMs } from '../core/meditate.js';
import { elementAdvantage, elementOfGrudge } from '../core/conceal.js';
import { assess } from '../core/endure.js';
import { nemOf } from '../core/nemesis.js';
import { defOf as incidentDef, costOf, canChoose } from '../core/incidents.js';
import { costChips, esc, setHTML, setText, sectRole } from './dom.js';

export function mountScene(root) {
  const blds = DRAW_ORDER.map(id => {
    const [x, y] = POS[id];
    return `<g class="bld" data-act="selectBuilding" data-id="${id}" transform="translate(${x} ${y})"><g class="bi">
        <rect class="hit" x="-70" y="-124" width="140" height="146"/>
        <ellipse class="selring" cx="0" cy="0" rx="62" ry="11"/>
        <g class="art" transform="scale(1.3)"></g><g class="crewg"></g><g class="smoke"><text x="18" y="-46" font-size="16">💨</text></g>
        <g class="lvchip" transform="translate(0 20)"><rect x="-17" y="-8" width="34" height="14" rx="7"/><text x="0" y="3" text-anchor="middle"></text></g>
      </g></g>`;
  }).join('');
  root.innerHTML = `
    <div class="daynight"></div><div class="vignette"></div>
    <button class="scenetoggle" data-act="toggleScene" aria-pressed="false">🏞 展開全景</button>
    <div class="sky"><span class="moon">🌕</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span></div>
    <div class="ancestor"><div class="avatar" data-r="avatar">👴</div><div class="bubble" data-r="bubble"></div></div>
    <div class="landwrap">
      <svg class="land" viewBox="0 0 640 360" preserveAspectRatio="xMidYMax meet" role="img" aria-label="宗門全景">
        ${BACKDROP}
        ${blds}
        <g class="vis" data-r="vis" transform="translate(300 296)"><g class="visin"><ellipse class="vaura" cx="0" cy="2" rx="18" ry="5"/><text class="vf" text-anchor="middle" font-size="26" y="-4"></text></g></g>
        <text class="incf" data-r="incf" x="320" y="96" text-anchor="middle" font-size="24"></text>
      </svg>
      <div class="bpop" data-r="bpop"></div>
    </div>
    <div class="visitor-slot" data-r="visitor"></div>
    <div class="incident-slot" data-r="incident"></div>
    <div class="meditate-slot"><button class="btn meditate" data-act="meditate"><span class="cd" data-r="cd"></span><span class="mlabel" data-r="mlabel"></span></button></div>`;
  const refs = Object.fromEntries([...root.querySelectorAll('[data-r]')].map(e => [e.dataset.r, e]));
  refs.mbtn = root.querySelector('.meditate');   // 按鈕只建一次，之後只改屬性，避免連點時被重建
  // 建築群組只建一次，之後只更新內容與 class，CSS 動畫才不會重播
  refs.tileEls = Object.fromEntries([...root.querySelectorAll('.bld')].map(e => [e.dataset.id, {
    el: e, art: e.querySelector('.art'), crew: e.querySelector('.crewg'), chip: e.querySelector('.lvchip text'), si: -1 }]));
  return refs;
}

const setClass = (el, c) => { if (el._c !== c) { el.setAttribute('class', c); el._c = c; } };
// 弟子站位（相對建築底部中心）
const CREW_AT = [[-40, 14], [40, 14], [-18, 26], [18, 26]];

export function updateScene(root, refs, s, ui) {
  // 場景氛圍：破廟外觀決定背景光暈；境界階層決定山水（荒山→雲海→仙山→極光→天門）；宿敵來訪時加上紅色暈影
  const ti = stageIndex('temple', s.buildings.temple.lv);
  setClass(root, `scene stage-${ti}${s.visitor.current?.nemesisId ? ' nemesis-alert' : ''}`);
  root.dataset.tier = realmOf(s).tier;
  if (refs.bubble._q !== ui.quote) {                      // 老祖換台詞：氣泡彈一下
    refs.bubble._q = ui.quote; setHTML(refs.bubble, esc(ui.quote));
    refs.bubble.classList.remove('pop'); void refs.bubble.offsetWidth; refs.bubble.classList.add('pop');
  }

  for (const d of BUILDINGS) {
    const b = s.buildings[d.id], t = refs.tileEls[d.id], si = stageIndex(d.id, b.lv);
    const built = b.lv > 0, paused = built && s.t < b.pausedUntil;
    setClass(t.el, `bld ${isBuildingUnlocked(s, d.id) ? '' : 'locked'} ${built ? '' : 'unbuilt'} ${paused ? 'paused' : ''} ${isMax(s, d.id) ? 'maxed' : ''} ${ui.selBuilding === d.id ? 'sel' : ''} st-${si}${t.el._pop ? ' popup' : ''}`);
    if (t.si !== si) { t.si = si; t.art.innerHTML = drawBuilding(d.id, si); }
    setText(t.chip, built ? 'Lv' + b.lv : '建造');
    const crew = s.disciples.filter(x => x.at === d.id).slice(0, 4);
    setHTML(t.crew, crew.map((x, i) => `<text class="dsc" x="${CREW_AT[i][0]}" y="${CREW_AT[i][1]}" font-size="13" text-anchor="middle" style="animation-delay:${-i * 0.9}s">${DISCIPLES_BY_ID[x.defId].emoji}</text>`).join(''));
  }

  // 畫面中的人物：訪客走進山門、事件圖示浮在殿頂
  const v = s.visitor.current, inc = s.incident.current;
  if ((v?.id ?? null) !== ui._vid) { ui._vid = v?.id ?? null; ui._venter = Date.now() + 900; ui._vwalk = Date.now() + 1500; }
  if ((inc?.expiresAt ?? null) !== ui._iid) { ui._iid = inc?.expiresAt ?? null; ui._ienter = Date.now() + 900; }
  const nem = v?.nemesisId ? nemOf(v) : null;
  setClass(refs.vis, `vis ${v ? 'on' : ''} ${nem ? 'nem' : ''} ${v && Date.now() < ui._vwalk ? 'walkin' : ''}`);
  if (v) setText(refs.vis.querySelector('.vf'), nem ? nem.emoji : VISITOR_TYPES[v.type].emoji);
  const idef = incidentDef(s);
  setText(refs.incf, idef ? idef.emoji : '');

  setHTML(refs.bpop, buildingPopover(s, ui.selBuilding));
  setHTML(refs.visitor, visitorCard(s, Date.now() < ui._venter));
  setHTML(refs.incident, incidentCard(s, Date.now() < ui._ienter));
  // 打坐按鈕：冷卻中灰化並顯示進度
  const left = cooldownLeft(s), ready = left <= 0;
  refs.mbtn.disabled = !ready;
  refs.cd.style.width = (ready ? 0 : left / cooldownMs(s) * 100).toFixed(1) + '%';
  setText(refs.mlabel, ready ? `🧘 引氣打坐 +${fmt(clickPower(s))} 靈氣` : `🧘 調息中… ${(left / 1000).toFixed(1)}s`);
}

// 點畫面上的建築 → 底部彈出操作面板（等級、效果、駐守弟子、升級）。不顯示每秒變動的倒數，避免面板被重繪害按鈕點不到
function buildingPopover(s, id) {
  if (!id) return '';
  const d = BUILDINGS_BY_ID[id], b = s.buildings[id], st = stageOf(id, b.lv), next = d.stages.find(x => x.lv > b.lv);
  const crew = s.disciples.filter(x => x.at === id), paused = b.lv > 0 && s.t < b.pausedUntil;
  const max = isMax(s, id), capped = isCapped(s, id), can = canUpgrade(s, id);
  const action = max ? '<span class="tag gold">已滿級</span>'
    : capped ? `<span class="tag red">需突破至 ${esc(REALMS[realmNeededFor(b.lv + 1, extraLevels(s))].name)}</span>`
    : `<div class="costs">${costChips(s, upgradeCost(s, id))}</div>${upgradeButtons(s, id)}`;
  return `<div class="bpop-card"><button class="hx" data-act="closeBuilding" title="關閉">✕</button>
    <div class="row"><span class="bigemoji">${st.emoji}</span><b>${esc(d.name)}</b> <span class="lv">Lv ${b.lv}/${maxLevelOf(s)}</span>
      <span class="tag">專長：${esc(d.specialty)}</span>${paused ? '<span class="tag red">⏸ 暫停產出中</span>' : ''}</div>
    <small>${esc(d.desc)}</small>
    <small class="dim">${esc(st.label)}${next ? `　→　Lv${next.lv}：${esc(next.label)}` : '（已臻極致）'}</small>${milestoneText(d, b.lv)}
    ${specBlock(s, id)}
    <div class="bpop-foot">
      <small>駐守 ${crew.length}/${slots(s, id)}：${crew.length ? crew.map(x => `${DISCIPLES_BY_ID[x.defId].emoji}${esc(DISCIPLES_BY_ID[x.defId].name)}`).join('、') : '<span class="dim">無（到「弟子」分頁派駐）</span>'}</small>
      <div class="act">${action}</div></div></div>`;
}

const VERDICT_TXT = { crush: ['v-crush', '你能碾壓他'], narrow: ['v-narrow', '你勉強勝他'], fail: ['v-fail', '你打不過他'] };

// 五行克制提示：派駐弟子裡有人剋他（↑）或被他剋（↓）
function elAdv(s, v) {
  const m = elementAdvantage(s, v).mult;
  return m > 1 ? `<b class="gold">（克制 ×${m.toFixed(2)}）</b>` : m < 1 ? `<b class="red">（受制 ×${m.toFixed(2)}）</b>` : '';
}

function visitorCard(s, entering = false) {
  const v = s.visitor.current;
  if (!v) return '';
  const t = VISITOR_TYPES[v.type], a = assess(s, v), [vc, vt] = a.escape ? ['v-narrow', '勉強勝，但他會脫身'] : VERDICT_TXT[a.verdict];
  const nem = v.nemesisId ? nemOf(v) : null;
  if (v.returning === 'plead') return pleaCard(s, v, t, entering);
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
      <div><b>${esc(v.name)}</b> ${nem ? '<span class="tag gold">宿敵</span>' : ''}${v.returning === 'revenge' ? '<span class="tag red">回頭客・復仇（獎勵 ×' + FR.revengeReward + '）</span>' : ''}<span class="tag">${esc(t.label)}</span> <span class="tag">${esc(v.personality)}</span> <span class="verdict ${vc}">${vt}</span><br>
      <small>${sectRole(v.sect, v.role)}・${esc(lvlLabel(v.lvl))}・五行${esc(elementOfGrudge(v))}${elAdv(s, v)}</small>${facLine(s, v)}</div></div>
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

// 專精：升到 SPEC_LEVEL 後二選一
function specBlock(s, id) {
  if (!SPECS[id]) return '';
  const cur = chosenSpec(s, id);
  if (cur) return `<div class="specbox"><b>🏗 專精：${esc(cur.name)}</b> <small class="gold">${esc(specText(cur.effects))}</small></div>`;
  if (s.buildings[id].lv < SPEC_LEVEL) return `<small class="dim">🏗 升到 Lv${SPEC_LEVEL} 可選擇專精方向</small>`;
  return `<div class="specbox"><b>🏗 選擇專精（本輪有效，無法更換）</b><div class="specopts">${SPECS[id].map(o =>
    `<button class="btn primary" data-act="chooseSpec" data-id="${id}" data-opt="${o.id}"><b>${esc(o.name)}</b><small>${esc(specText(o.effects))}</small></button>`).join('')}</div></div>`;
}

// 求和的回頭客：收下賠禮或讓他滾
function pleaCard(s, v, t, entering) {
  const tier = tierOfSect(s, v.sect), mult = tier >= 3 ? 2 : 1;
  const gift = `💎約${fmt(Math.max(3, stonePerSec(s) * FR.pleadGiftSec * mult))} 🎫${tier >= 3 ? 2 : 1}`;
  return `<div class="visitor-card plea ${entering ? 'enter' : ''}">
    <div class="vhead"><span class="vemoji">${t.emoji}</span>
      <div><b>${esc(v.name)}</b> <span class="tag gold">${v.tribute ? '勢力進貢' : '回頭客・求和'}</span> <span class="tag">${esc(v.personality)}</span><br>
      <small>${sectRole(v.sect, v.role)}・${esc(lvlLabel(v.lvl))}</small>${facLine(s, v)}</div></div>
    <p class="taunt">「${esc(v.taunt)}」</p>
    <div class="vbtns">
      <button class="btn show good" data-act="acceptPlea"><b>🎁 收下${v.tribute ? '貢禮' : '賠禮'}</b><small>${gift}，${esc(v.sect)}威望 +3；對方離開</small></button>
      ${v.tribute ? '<button class="btn endure" data-act="rejectPlea"><b>🚪 婉拒</b><small>不收禮、不加威望；對方離開，不入復仇簿</small></button>'
      : '<button class="btn endure" data-act="rejectPlea"><b>🚪 讓他滾</b><small>記入復仇簿（偽裝值 +1，無損失）；日後引爆再算帳</small></button>'}
    </div></div>`;
}

// 訪客的勢力列：勢力、威望階級與進度，以及這次互動可得的威望
function facLine(s, v) {
  const id = FACTION_OF_SECT[v.sect], f = id && FACTIONS_BY_ID[id]; if (!f) return '';
  const rep = repOf(s, id), tier = tierOfSect(s, v.sect), th = FR.thresholds, next = th[tier], prev = tier ? th[tier - 1] : 0;
  const pct = next ? Math.floor((rep - prev) / (next - prev) * 100) : 100;
  return `<div class="vfac"><small>${f.emoji} ${esc(f.name)}・<b class="${tier ? 'gold' : ''}">${esc(FACTION_TIERS[tier])}</b>・威望 ${rep}${next ? '/' + next : '（已滿）'}</small><div class="gbar"><div style="width:${pct}%"></div></div></div>`;
}
