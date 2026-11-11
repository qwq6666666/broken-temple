// 全螢幕演出：境界突破、爆發場景（暗幕＋老祖旁白＋仇人逐一登場）、結算畫面。
import { CONFIG } from '../config.js';
import { VISITOR_TYPES } from '../data/visitors.js';
import { RARITIES } from '../data/gachaRates.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { fmt, fmtTime } from '../core/format.js';
import { weeklyMutator, weeklyEligible, weeklyBonusFor, weekIndex, weekDaysLeft } from '../core/weekly.js';
import { OFFLINE_EVENTS_BY_ID } from '../data/offlineEvents.js';
import { esc, sleep } from './dom.js';
import { sfx } from './audio.js';
import { daoGain } from '../core/dao.js';
import { HELP, INTRO } from '../data/help.js';
import { FACTIONS_BY_ID, FACTION_OF_SECT, FACTION_RULES as FR } from '../data/factions.js';
import { KE } from '../data/elements.js';
import { REBIRTH_KEEP, REBIRTH_RESET } from '../data/rebirth.js';
import { MUTATORS } from '../data/mutators.js';
import { getPrefs, setPref } from './prefs.js';
import { toast } from '../core/events.js';
import { shake, flash, particles, banner, countUp } from './fx.js';

const root = () => document.getElementById('overlay');

// 打字機效果；skip.v 為 true 時直接顯示全文
async function typeInto(el, text, skip, speed = 28) {
  el.textContent = '';
  for (const ch of text) {
    if (skip.v) { el.textContent = text; return; }
    el.textContent += ch; await sleep(speed);
  }
}
const wait = async (ms, skip) => { const end = Date.now() + ms; while (!skip.v && Date.now() < end) await sleep(40); };

// ── 突破演出 ──
export async function playBreakthrough(res) {
  const o = root();
  o.innerHTML = `<div class="ov break"><div class="swirl">🌀</div>
    <h2 data-r="t">閉關突破中……</h2><p class="lineq" data-r="q"></p></div>`;
  o.classList.add('on');
  const t = o.querySelector('[data-r=t]'), q = o.querySelector('[data-r=q]'), ov = o.firstElementChild;
  await sleep(CONFIG.realm.breakMs * 0.6);
  sfx('breakthrough'); flash(ov, '#ffe9a8'); particles(ov, ['✨', '🌟', '💫'], 18);
  t.innerHTML = `✨ 突破成功：<b>${esc(res.from.name)} → ${esc(res.to.name)}</b>`;
  o.querySelector('.swirl').textContent = '🌟';
  await typeInto(q, `老祖：「${res.line}」`, { v: false });
  await sleep(CONFIG.realm.breakMs * 0.5);
  o.classList.remove('on'); o.innerHTML = '';
}

// ── 爆發 ──
const CHAIN_BANNER = { 3: '三連！', 5: '五連爆！', 10: '十連爆！！' };

export async function playBurst(result) {
  const o = root();
  const skip = { v: false };
  o.innerHTML = `<div class="ov burst-scene">
    <button class="skipbtn">⏭ 跳過</button>
    <div class="chainbig" data-r="chain"></div>
    <div class="runtotal" data-r="run"></div>
    <div class="narr" data-r="narr"></div>
    <div class="arena" data-r="arena">${result.entries.map((e, i) => `<div class="fig ${e.nemesis ? 'nemesis' : ''}" data-i="${i}"><span class="fe">${e.nemesis ? e.nemesis.emoji : VISITOR_TYPES[e.g.type].emoji}</span><small class="fn">${esc(e.g.name)}</small></div>`).join('')}</div>
    <div class="stage" data-r="stage"></div></div>`;
  o.classList.add('on');
  const scene = o.firstElementChild;
  if (getPrefs().fastBurst) skip.v = true;                                    // 之前按過「跳過」：直接快速播放
  o.querySelector('.skipbtn').onclick = () => { skip.v = true; if (!getPrefs().fastBurst) { setPref('fastBurst', true); toast('已記住：之後引爆演出會快速播放（說明視窗可關閉）', 'info'); } };
  const narr = o.querySelector('[data-r=narr]'), stage = o.querySelector('[data-r=stage]'), chainEl = o.querySelector('[data-r=chain]'), arena = o.querySelector('[data-r=arena]'), runEl = o.querySelector('[data-r=run]');
  const run = { qi: 0, stone: 0, token: 0 }, facN = {};
  const figs = [...arena.querySelectorAll('.fig')];

  sfx('burstIntro');
  await typeInto(narr, `老祖：「${result.intro}」`, skip);
  await wait(600, skip);

  let n = 0;
  // 依人數分檔加速：≤3 人逐位詳演；4~8 人三位一組、打字加快；≥9 人三位一組、對白直接顯示。宿敵永遠單獨、完整演出。
  const total = result.entries.length, tier = total <= 3 ? 0 : total <= 8 ? 1 : 2;
  const TIERS = [{ ty: [16, 22], pre: 450, mid: 0.35, narr: 18 }, { ty: [9, 12], pre: 220, mid: 0.2, narr: 10 }, { ty: [0, 0], pre: 120, mid: 0.12, narr: 0 }];
  const batches = [];
  for (let i = 0; i < total;) {
    const e = result.entries[i];
    const size = (tier === 0 || e.nemesis) ? 1 : Math.min(3, (() => { let k = 1; while (k < 3 && i + k < total && !result.entries[i + k].nemesis) k++; return k; })());
    batches.push(Array.from({ length: size }, (_, k) => i + k)); i += size;
  }
  const mkCard = (e, mini) => {
    const t = VISITOR_TYPES[e.g.type];
    const card = document.createElement('div');
    card.className = `enemy ${e.verdict} ${e.nemesis ? 'nemesis' : ''} ${mini ? 'mini' : ''}`;
    card.innerHTML = `<div class="ehead"><span class="eemoji">${e.nemesis ? e.nemesis.emoji : t.emoji}</span>
      <div><b>${esc(e.g.name)}</b> ${e.nemesis ? `<span class="tag gold">宿敵・${esc(e.nemesis.title)}</span>` : ''}<span class="tag">${esc(t.label)}</span><br><small>${esc(e.g.sect)}・${esc(e.g.label)}</small></div></div>
      <p class="etaunt"></p><p class="eline"></p><div class="everdict"></div>`;
    return card;
  };
  const resolve = e => {                                                         // 判定：印章、連鎖、特效與獎勵
    const vd = e.card.querySelector('.everdict'), fig = e.fig;
    if (e.verdict === 'fail') { vd.innerHTML = e.escaped ? '😤 險勝……但宿敵脫身逃走了，仍在名單上' : '😏 打不過……暫且留在名單'; if (!skip.v) sfx('fail'); }
    else {
      n++;
      vd.innerHTML = (e.verdict === 'crush' ? '🙇 碾壓！跪地求饒' : '😤 險勝') + `　<span class="chainno">連鎖 ${n}</span>`;
      chainEl.textContent = `連鎖 ×${n}`; chainEl.classList.remove('pulse'); void chainEl.offsetWidth; chainEl.classList.add('pulse');
      chainEl.style.setProperty('--s', Math.min(2.2, 1 + n * 0.12));
      if (!skip.v) {
        sfx(e.verdict === 'crush' ? 'crush' : 'narrow'); sfx('chain', { n });
        if (e.verdict === 'crush') { shake(scene); flash(scene); particles(scene, ['🙇', '💢', '✨'], 10); }
        if (CHAIN_BANNER[n]) banner(scene, CHAIN_BANNER[n], 'chainbanner');
        if (e.nemesis) { banner(scene, `宿敵伏法：${e.g.name}`, 'chainbanner'); sfx('fanfare'); }
      }
    }
    e.card.classList.add('shown');
    knockDown(arena, fig, e, skip);
    elementFx(scene, fig, e, skip);
    if (e.verdict !== 'fail') {                                                // 勢力一網打盡：同一勢力第 3 人倒下時，旗幟被打碎
      const fid = FACTION_OF_SECT[e.g.sect]; facN[fid] = (facN[fid] || 0) + 1;
      if (fid && facN[fid] === FR.sweep.at && e.sweep > 1 && !skip.v) flagBreak(scene, FACTIONS_BY_ID[fid], e.sweep);
    }
    if (e.reward) {                                                            // 獎勵從倒下的人物身上冒出、飛向資源列；累計列同步增加
      const nr = e.reward.nemesisReward || {};
      run.qi += e.reward.qi || 0; run.stone += (e.reward.stone || 0) + (nr.stone || 0); run.token += (e.reward.token || 0) + (nr.token || 0);
      runEl.textContent = `累計　✨ ${fmt(run.qi)}　💎 ${fmt(run.stone)}　🎫 ${fmt(run.token)}`;
      if (!skip.v) rewardsFrom(arena, fig, e.reward);
    }
  };
  for (const idxs of batches) {
    const es = idxs.map(i => Object.assign(result.entries[i], { fig: figs[i] }));
    const hasNem = es.some(e => e.nemesis);
    const P0 = TIERS[hasNem ? 0 : tier], group = es.length > 1;
    const P = hasNem ? { ...P0, ty: P0.ty.map(x => x * 1.6), pre: P0.pre * 1.8 } : P0;      // 宿敵：打字與停頓放慢，畫面聚焦
    scene.classList.toggle('focus', hasNem && !skip.v);
    if (hasNem && !skip.v) sfx('nemesisHit');
    figs.forEach(f => f.classList.remove('active')); es.forEach(e => e.fig.classList.add('active'));
    es.forEach(e => { e.card = mkCard(e, group); });
    stage.replaceChildren(...es.map(e => e.card));                              // 舞台上只留這一組的對白，倒下的人留在上方的人物列
    const inst = { v: true };
    // 兩段式：先重播他們當初的嘲諷，停頓，再接逆轉台詞（同一組同時打字）
    await Promise.all(es.map(e => typeInto(e.card.querySelector('.etaunt'), `「${e.taunt}」`, P.ty[0] ? skip : inst, P.ty[0] || 0)));
    await wait(P.pre, skip);
    es.forEach(e => e.card.querySelector('.etaunt').classList.add('old'));
    await Promise.all(es.map(e => typeInto(e.card.querySelector('.eline'), `「${e.line}」`, P.ty[1] ? skip : inst, P.ty[1] || 0)));
    for (const e of es) {
      resolve(e);
      if (e.nemesis && !skip.v) { flash(scene, '#fff'); await wait(e.verdict === 'crush' ? 1500 : 1100, skip); }    // 宿敵：定格一拍，讓慢動作倒下看得清楚
      else if (group) await wait(160, skip);                                                                     // 同組依序倒下（間隔 0.16 秒）
    }
    scene.classList.remove('focus');
    const last = es[es.length - 1];
    if (P.narr) await typeInto(narr, `老祖：「${last.narr}」`, skip, P.narr); else narr.textContent = `老祖：「${last.narr}」`;
    await wait(CONFIG.burst.stepMs * P.mid, skip);
  }
  await typeInto(narr, `老祖：「${result.outro}」`, skip);
  await wait(900, skip);
  return showSettlement(result);
}

const EL = { 金: ['#e8d9a0', '⚔️'], 木: ['#7fcf8a', '🌿'], 水: ['#7fb6e8', '💧'], 火: ['#ef8a6a', '🔥'], 土: ['#c9a36a', '⛰️'] };
// 五行克制：我方派駐弟子的五行克制該仇人（elAdv.mult > 1）時，倒下的特效改成克制元素的顏色與符號；被剋制（< 1）則標示逆剋
function elementFx(scene, fig, e, skip) {
  const a = e.elAdv; if (!a || e.verdict === 'fail' && a.mult >= 1) return;
  const ctl = Object.keys(KE).find(k => KE[k] === a.element);                  // 剋制這位仇人的五行
  if (a.mult > 1 && ctl) {
    const [col, glyph] = EL[ctl];
    const b = document.createElement('span'); b.className = 'elbadge'; b.style.color = col; b.textContent = `${glyph}${ctl}剋${a.element}`; fig.appendChild(b);
    fig.style.setProperty('--elc', col); fig.classList.add('el-ke');
    if (!skip.v) { particles(scene, [glyph, '✨'], 8); sfx('element'); }
  } else if (a.mult < 1) {
    const b = document.createElement('span'); b.className = 'elbadge bad'; b.textContent = '⚠逆剋'; fig.appendChild(b);
  }
}
// 勢力一網打盡：旗幟從上方落下、碎裂，顯示加成
function flagBreak(scene, fac, sweep) {
  if (!fac) return;
  sfx('sweep');
  const el = document.createElement('div'); el.className = 'flagbreak';
  el.innerHTML = `<span class="fl">${fac.emoji}</span><b>${esc(fac.name)}・一網打盡</b><small>該勢力獎勵 +${Math.round((sweep - 1) * 100)}%</small>`;
  scene.appendChild(el); setTimeout(() => el.remove(), 2600);
}

const STAMP = { crush: '碾壓', narrow: '險勝', fail: '不敵' };
// 仇人被擊倒的畫面：碾壓＝被轟飛倒地、險勝＝踉蹌跪下、打不過＝紋風不動（老祖被彈開）。最終姿勢由 CSS class 決定（減少動態時也看得到），動畫只是過程
function knockDown(arena, fig, e, skip) {
  const v = e.verdict;
  fig.classList.remove('active'); fig.classList.add('done', 'v-' + v);
  if (e.nemesis) fig.classList.add('slow');                                    // 宿敵：動畫放慢
  const stamp = document.createElement('span'); stamp.className = 'stamp s-' + v; stamp.textContent = e.escaped ? '脫身' : STAMP[v]; fig.appendChild(stamp);
  if (skip.v) return;
  if (e.escaped) for (let k = 1; k <= 3; k++) {                                // 脫身：留下往右散去的殘影
    const g = document.createElement('span'); g.className = 'fe ghost'; g.textContent = fig.querySelector('.fe').textContent; g.style.animationDelay = (k * 0.18) + 's'; fig.appendChild(g); setTimeout(() => g.remove(), 2200);
  }
  const ring = document.createElement('i'); ring.className = 'impact i-' + v;
  ring.style.left = (fig.offsetLeft + fig.offsetWidth / 2) + 'px'; ring.style.top = (fig.offsetTop + fig.offsetHeight / 2 - 8) + 'px';
  arena.appendChild(ring); setTimeout(() => ring.remove(), 800);
}

// 獎勵從人物身上冒出：資源小字先往上浮，再飛向資源列；法寶與降服弟子留在原地發光（稀有）
function rewardsFrom(arena, fig, r) {
  const nr = r.nemesisReward || {};
  const items = [['✨', r.qi], ['💎', (r.stone || 0) + (nr.stone || 0)], ['🎫', (r.token || 0) + (nr.token || 0)], ['🧩', r.shard]].filter(([, v]) => v > 0).map(([ic, v]) => ({ t: `${ic}+${fmt(v)}` }));
  if (r.artifactDef) items.push({ t: `${r.artifactDef.emoji} ${r.artifactDef.name}`, rare: true });
  if (r.surrenderDef) items.push({ t: `${r.surrenderDef.emoji} ${r.surrenderDef.name} 願降`, rare: true });
  const bar = document.getElementById('resbar'), br = bar ? bar.getBoundingClientRect() : null, ar = arena.getBoundingClientRect();
  const cx = fig.offsetLeft + fig.offsetWidth / 2, cy = fig.offsetTop + 8;
  items.forEach((it, i) => {
    const el = document.createElement('span'); el.className = 'rw' + (it.rare ? ' rare' : ''); el.textContent = it.t;
    el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.style.setProperty('--ox', ((i - (items.length - 1) / 2) * 52) + 'px'); el.style.animationDelay = (i * 0.12) + 's';
    if (br && !it.rare) { el.style.setProperty('--dx', (br.left + br.width / 2 - ar.left - cx) + 'px'); el.style.setProperty('--dy', (br.top + br.height / 2 - ar.top - cy) + 'px'); }
    arena.appendChild(el); setTimeout(() => el.remove(), 1900 + i * 120);
  });
}

const RARE = new Set(['SSR', 'UR']);

function showSettlement(r) {
  const o = root();
  const crush = r.entries.filter(e => e.verdict === 'crush').length;
  const narrow = r.entries.filter(e => e.verdict === 'narrow').length;
  const fail = r.entries.length - crush - narrow;
  const tierTxt = r.chain >= 10 ? '🌋 天崩地裂' : r.chain >= 5 ? '🔥 五連爆' : r.chain >= 3 ? '⚡ 三連擊' : '';
  const rec = r.record || {}, best = r.best || null;
  const tile = (icon, name, key, val) => `<div class="stile ${rec[key] ? 'rec' : ''}"><span>${icon} ${name}</span><b data-count="${val}">0</b>
    <small>${best ? `上次最佳 ${key === 'chain' ? best.chain : fmt(best[key])}` : '首次引爆'}${rec[key] ? ' <i class="newrec">🏆 新紀錄</i>' : ''}</small></div>`;
  // 稀有收穫放最前面、放最大：宿敵、法寶、降服弟子
  const nem = r.nemesesDefeated.map(d => d.awaken ? `<div class="hl nem"><b>🌟 覺醒${'ⅠⅡⅢ'[d.awaken - 1]}的宿敵再度倒下：${esc(d.n.name)}</b><p class="gold">☯️ 道心 +${d.dao}</p></div>`
    : `<div class="hl nem"><b>⚔️ 宿敵倒下：${esc(d.n.name)}（${esc(d.n.title)}）</b><p>${esc(d.n.story.defeat)}</p>
      ${d.art ? `<span class="art big rare">${d.art.emoji} ${esc(d.art.name)}<small>${esc(d.art.desc)}</small></span>` : ''}
      ${d.finale ? '<p class="gold"><b>🏯 破廟的真相已經揭開——這座廟，是青雲宗的祖庭。</b></p>' : ''}</div>`).join('');
  const arts = r.artifacts.map(a => `<span class="art big rare">${a.emoji} ${esc(a.name)}<small>${esc(a.desc)}</small></span>`).join('');
  const sur = r.surrendered.map(x => `<span class="art big ${RARE.has(x.def.rarity) ? 'rare' : ''}" style="color:${RARITIES[x.def.rarity].color}">${x.def.emoji} ${esc(x.def.name)} <small>${x.def.rarity}・原屬 ${esc(x.from)}・到「復仇簿」招募</small></span>`).join('');
  const highlights = nem + (arts ? `<div class="hl"><h3>🎁 功法／法寶</h3><div class="arts">${arts}</div></div>` : '') + (sur ? `<div class="hl"><h3>🙇 降服弟子</h3><div class="arts">${sur}</div></div>` : '');
  o.innerHTML = `<div class="ov settle"><div class="panel">
    <h2>💥 破廟一怒・結算</h2>
    <div class="chainhero ${r.chain >= 10 ? 't3' : r.chain >= 5 ? 't2' : r.chain >= 3 ? 't1' : ''}"><b data-count="${r.chain}">0</b><span>連鎖${tierTxt ? `　${tierTxt}` : ''}${rec.chain ? ' <i class="newrec">🏆 新紀錄</i>' : ''}</span>
      <small>連鎖加成 ×${r.chainMult}・蓄力 ×${fmt(r.chargeMult)}・碾壓 ${crush}／險勝 ${narrow}／不敵 ${fail}</small></div>
    ${highlights}
    <div class="stiles">${tile('✨', '靈氣', 'qi', r.total.qi)}${tile('💎', '靈石', 'stone', r.total.stone)}<div class="stile"><span>🎫 招賢令</span><b data-count="${r.total.token}">0</b><small>${r.total.shard ? `🧩 碎片 +${r.total.shard}` : '&nbsp;'}</small></div></div>
    ${Object.keys(r.reps || {}).length ? `<p class="hint">🏴 威望：${Object.entries(r.reps).map(([id, n]) => `${FACTIONS_BY_ID[id].emoji}${esc(FACTIONS_BY_ID[id].name)} +${n}`).join('、')}</p>` : ''}
    ${(r.comebacks || []).length ? `<p class="hint">🔙 ${esc(r.comebacks.slice(0, 4).join('、'))}${r.comebacks.length > 4 ? '…' : ''} 日後可能回頭。</p>` : ''}
    ${r.backfire ? `<p class="warnline">⚠ 反噬！${esc(r.backfire.names.join('、'))} 實力遠勝於你，反擊造成損失 💎${fmt(r.backfire.lost)}${r.backfire.paused ? '，並有一處建築暫停產出' : ''}。</p>` : ''}
    <p class="lineq">老祖：「${esc(r.outro)}」</p>
    <div class="sfoot"><button class="btn primary big" data-act="closeSettle">收工</button><button class="btn" data-act="settleToBook">📖 看復仇簿</button></div>
  </div></div>`;
  sfx(r.backfire ? 'backfire' : 'fanfare');
  o.querySelectorAll('[data-count]').forEach(el => countUp(el, +el.dataset.count, v => (el.closest('.chainhero') ? String(Math.round(v)) : '+' + fmt(v))));
  return new Promise(res => { o._done = res; });
}

export function closeOverlay() {
  const o = root();
  o.classList.remove('on'); o.innerHTML = '';
  if (o._done) { o._done(); o._done = null; }
}

// ── 歡迎回來（離線收益） ──
// 歡迎畫面的小事件：兩個選項，選完顯示結果（結算在 actions.offlineChoose）
function offlineEventBox(id) {
  const ev = OFFLINE_EVENTS_BY_ID[id];
  if (!ev) return '';
  return `<div class="offev" id="offev" data-id="${ev.id}"><p>${esc(ev.text)}</p>
    <div class="offchoices">${ev.choices.map((c, i) => `<button class="btn" data-act="offlineChoose" data-i="${i}">${esc(c.label)}</button>`).join('')}</div></div>`;
}
export function showOfflineResult(text, got) {
  const el = document.getElementById('offev'); if (!el) return;
  const chips = [got.token && `🎫${got.token}`, got.qi && `✨${fmt(got.qi)}`, got.stone && `💎${fmt(got.stone)}`].filter(Boolean).join('　');
  el.innerHTML = `<p>${esc(text)}</p><p class="gold">${chips}</p>`;
}

export function showWelcome(r) {
  const o = root();
  const away = fmtTime(r.elapsedMs).replace(/^(\d+):(\d+)$/, (_, m, sec) => `${Math.floor(m / 60) ? Math.floor(m / 60) + ' 小時 ' : ''}${m % 60} 分`);
  const grown = r.grown.length ? `<p class="hint">仇人們沒閒著：${r.grown.slice(0, 5).map(g => `${esc(g.name)}→${esc(g.to)}`).join('、')}${r.grown.length > 5 ? '…' : ''}</p>` : '';
  o.innerHTML = `<div class="ov settle"><div class="panel">
    <h2>🏯 歡迎回來，宗主</h2>
    <p class="hint">離開 ${away}${r.capped ? `（離線收益最多計 ${r.capMs / 3600000} 小時）` : ''}，宗門以 ${Math.round(r.efficiency * 100)}% 效率運轉。</p>
    <div class="sgrid">
      <div><span>✨ 靈氣</span><b>+${fmt(r.gains.qi)}</b></div>
      <div><span>💎 靈石</span><b>+${fmt(r.gains.stone)}</b></div>
      <div><span>🎫 招賢令</span><b>+${fmt(r.gains.token)}</b></div>
    </div>
    <p>🎭 偽裝 +${fmt(r.disguiseGain)}　蓄力 +${Math.floor(r.chargeMinutes)} 分鐘${r.disguiseFull ? '　<b class="gold">蓄力已滿！</b>' : ''}</p>
    ${grown}
    ${offlineEventBox(r.event)}
    <p class="lineq">老祖：「你不在的時候，本座一個人守著這座破廟，還好有蜘蛛陪我說話。」</p>
    <button class="btn primary big" data-act="closeSettle">繼續</button>
  </div></div>`;
  o.classList.add('on');
  return new Promise(res => { o._done = res; });
}

// ── 通用彈窗（存檔選單用） ──
export function showModal(html) {
  const o = root();
  o.innerHTML = `<div class="ov settle"><div class="panel" style="text-align:left">${html}
    <div style="text-align:right;margin-top:10px"><button class="btn" data-act="closeSettle">關閉</button></div></div></div>`;
  o.classList.add('on');
  return new Promise(res => { o._done = res; });
}

// ── 引爆前預覽 ──
const PV = { crush: ['v-crush', '碾壓'], narrow: ['v-narrow', '險勝'], fail: ['v-fail', '打不過'] };
export function showBurstPreview(pv) {
  const pct = x => (x >= 0 ? '+' : '') + Math.round(x * 100) + '%';
  const rows = pv.entries.map(e => {
    const sq = e.sq.parts.length ? `　陣容 ${pct(e.sq.mult - 1)}` : '';
    const ripe = e.g.ripe ? ` <span class="tag gold">熟成 ${e.g.ripe}（獎勵 +${e.g.ripe * 25}%）</span>` : '', foe = e.g.foe ? ` <span class="tag ${e.g.foe >= 3 ? 'gold' : ''}">${e.g.foe >= 3 ? '老對頭' : '舊識'}・擊敗過 ${e.g.foe} 次</span>` : '';
    const weak = e.weak ? `<br><small class="${e.weakHit ? 'gold' : 'red'}">弱點：${esc(e.weak)}${e.weakHit ? ' ✔ 陣容已命中' : ' ✘ 未命中，碾壓門檻 ×1.5'}</small>` : '';
    const fd = e.fac ? FACTIONS_BY_ID[e.fac] : null;
    const facTag = fd && e.verdict !== 'fail' ? `<br><small class="dim">${fd.emoji} ${esc(fd.name)}・威望 +${e.verdict === 'crush' ? 2 : 1}${e.facTier >= 1 ? `・勢力加成 +${Math.round(FR.tier1Reward * 100)}%` : ''}</small>` : (fd ? `<br><small class="dim">${fd.emoji} ${esc(fd.name)}</small>` : '');
    const spare = !e.nemesis ? `<label class="spare"><input type="checkbox" data-change="spare" data-gid="${e.g.id}" ${e.sparing ? 'checked' : ''}> 放過（留著養）</label>` : '';
    if (e.sparing) return `<div class="pvrow pv2 sparing"><div><b>${esc(e.g.name)}</b> <small>${esc(e.g.label)}・${esc(e.g.element || '')}・${esc(e.g.personality || '')}</small>${ripe}<br><small class="dim">這次不打，下次熟成 +25% 獎勵、境界 +0.3（仍占名額）</small></div><span>${spare}</span></div>`;
    return `<div class="pvrow pv2"><div><b>${esc(e.g.name)}</b> <small>${esc(e.g.label)}・${esc(e.g.element || '')}${e.adv > 1 ? '↑' : e.adv < 1 ? '↓' : ''}・${esc(e.g.personality || '')}${e.bias ? `（${esc(e.bias)}）` : ''}</small>${ripe}${foe}
      <br><small class="dim">我方 ${fmt(e.mine)} ／ 對方 ${fmt(e.theirs)} ＝ <b>×${e.ratio.toFixed(2)}</b>${sq}</small>${facTag}${weak}
      <div class="pvbar"><i style="width:${Math.min(100, e.ratio / (pv.crushRatio * 1.25) * 100)}%"></i><u style="left:${pv.narrowRatio / (pv.crushRatio * 1.25) * 100}%"></u><u style="left:${pv.crushRatio / (pv.crushRatio * 1.25) * 100}%"></u></div></div>
      <span>${e.risk ? '<span class="tag red">⚠ 反噬</span> ' : ''}<span class="verdict ${PV[e.verdict][0]}">${PV[e.verdict][1]}</span><br>${spare}</span></div>`;
  }).join('');
  const SQ = pv.pool.filter(p => p.on);
  const slot = pv.squad.map(d => { const df = DISCIPLES_BY_ID[d.defId]; return `<button class="chip on" data-act="squadToggle" data-uid="${d.uid}" title="點擊撤下">${df.emoji} ${esc(df.name)}</button>`; }).join('')
    + Array.from({ length: Math.max(0, 3 - pv.squad.length) }, () => '<span class="chip empty">空位</span>').join('');
  const pool = pv.pool.filter(p => !p.on).map(p => { const df = DISCIPLES_BY_ID[p.d.defId];
    return `<button class="chip" data-act="squadToggle" data-uid="${p.d.uid}" ${pv.squad.length >= 3 ? 'disabled' : ''} title="${esc(df.specialty)}・${esc(df.element)}">${df.emoji} ${esc(df.name)} <small>${esc(df.element)}${esc(df.specialty)} ${pct(p.avg)}</small></button>`; }).join('');
  return showModal(`<h3>💥 引爆預覽</h3>
    <p>預計擊敗 <b class="gold">${pv.chain}</b> 人，連鎖 <b class="gold">×${pv.chainMult}</b>，蓄力 <b class="gold">×${fmt(pv.chargeMult)}</b>。比值 ≥ <b>${pv.crushRatio}</b> 碾壓、≥ <b>${pv.narrowRatio}</b> 險勝，其餘打不過（宿敵只有碾壓才算擊敗）。</p>
    <div class="squadbox"><div class="squadhd"><b class="gold">⚔️ 出戰陣容</b>（最多 3 人）
      <span><button class="btn mini" data-act="squadAuto">⚡ 推薦陣容</button> <button class="btn mini" data-act="squadClear" ${SQ.length ? '' : 'disabled'}>清空</button></span></div>
      <div class="chips">${slot}</div>
      <small class="dim">每位出戰者：稀有度底子 ＋ 五行剋制該仇人 +5%（被剋 −3%）＋ 專長剋制其個性 +4%。陣容對每位仇人分別計算，所以要看這次名單挑人。</small>
      ${pool ? `<details><summary class="dim">候選弟子（括號為對目前名單的平均加成）</summary><div class="chips">${pool}</div></details>` : ''}</div>
    <div class="pvlist">${rows}</div>
    ${facBox(pv)}
    ${pv.backfires ? '<p class="warnline">⚠ 有長老實力遠勝於你，引爆會遭到反噬（損失靈石、建築暫停）。可以再蓄力、突破後再爆。</p>' : ''}
    ${pv.spared ? `<p class="hint">已放過 ${pv.spared} 人：他們留在名單上繼續長大（占復仇簿名額，名單滿了就沒有新訪客）。</p>` : ''}
    <div class="pvfoot"><button class="btn" data-act="closeSettle">取消</button><button class="btn primary big" data-act="confirmBurst" ${pv.spared >= pv.entries.length ? 'disabled' : ''}>不裝了！</button></div>`);
}

// 勢力彙整：這次引爆會推進哪些勢力的威望、有沒有升階、一網打盡
function facBox(pv) {
  if (!pv.factions || !pv.factions.length) return '';
  return `<div class="facbox"><b class="gold">🏴 勢力威望預告</b>` + pv.factions.map(f => {
    const up = f.tierAfter > f.tierBefore;
    return `<div class="facrow"><span>${f.emoji} ${esc(f.name)}　${f.n} 人・威望 <b>+${f.rep}</b>${f.sweep > 1 ? `　<span class="tag gold">一網打盡 獎勵 ×${f.sweep.toFixed(1)}</span>` : f.n >= 2 ? `　<small class="dim">再多 ${FR.sweep.at - f.n} 人可一網打盡</small>` : ''}</span>
      <span>${up ? `<span class="tag gold">⬆ 升階「${esc(f.tierName)}」</span>` : f.toNext ? `<small class="dim">距「${esc(f.nextName)}」還差 ${f.toNext}</small>` : '<small class="dim">已滿階</small>'}</span></div>`;
  }).join('') + '</div>';
}

// ── 轉生確認 ──
export function showRebirthConfirm(s) {
  const wm = weeklyMutator(), ok = weeklyEligible(s), claimed = s.weekly.claimed === weekIndex();
  const banner = `<div class="weekly ${ok ? 'ok' : ''}">🗓 <b>本週挑戰：${esc(wm.name)}</b>（剩 ${weekDaysLeft()} 天）<br><small>${ok ? `本輪使用的就是「${esc(wm.name)}」，這次轉生額外 <b class="gold">+${weeklyBonusFor(daoGain(s))} 道心</b>！`
    : claimed ? '本週挑戰已完成，下週換新詞條。' : `用「${esc(wm.name)}」詞條完成一輪並在本週內轉生，首次額外獲得道心。下一輪可在下方選用。`}</small></div>`;
  return showModal(`<h3>☯️ 轉生</h3>
    ${banner}
    <p>本次可獲得 <b class="gold">道心 ${fmt(daoGain(s) + (ok ? weeklyBonusFor(daoGain(s)) : 0))}</b>。</p>
    <p><b>會重置：</b>${REBIRTH_RESET.join('、')}。</p>
    <p><b>會保留：</b>${REBIRTH_KEEP.map(g => g.label).join('、')}。</p>
    <p class="hint">轉生後境界回到凡人，但道心加成與轉生次數加成會讓你重新修煉得更快。</p>
    <p><b class="gold">輪迴詞條（可選）</b>：下一輪的挑戰，有代價也有報酬，結算時給額外道心。</p>
    <select id="mutsel" class="assign" style="width:100%"><option value="">— 不選擇 —</option>${MUTATORS.map(m => `<option value="${m.id}">${m.id === wm.id ? '🗓 本週挑戰・' : ''}${esc(m.name)}：${esc(m.desc)}</option>`).join('')}</select>
    <div style="text-align:center;margin-top:10px"><button class="btn primary big" data-act="confirmRebirth">確定轉生</button></div>`);
}

// ── 玩法說明／開場介紹 ──
export function showHelp(intro = false) {
  const list = intro ? INTRO : HELP;
  return showModal(`<h3>${intro ? '🏚️ 歡迎來到破廟宗主' : '❓ 玩法說明'}</h3>
    ${list.map(x => `<p><b class="gold">${esc(x.t)}</b><br>${esc(x.d)}</p>`).join('')}
    ${intro ? '' : `<div class="helpopts"><label class="loss"><input type="checkbox" data-change="toggleHints" ${getPrefs().hints ? 'checked' : ''}> 顯示畫面上方的「下一步」提示</label>
 <label class="loss"><input type="checkbox" data-change="toggleFast" ${getPrefs().fastBurst ? 'checked' : ''}> 引爆演出快速播放（按過一次「跳過」會自動開啟）</label>
      <label class="loss"><input type="checkbox" data-change="toggleTips" ${getPrefs().tips ? 'checked' : ''}> 第一次打開分頁時顯示說明</label>
      <button class="btn mini" data-act="resetTips">重新顯示所有分頁說明</button> <button class="btn mini" data-act="replayIntro">重看開場介紹</button></div>`}`);
}

// ── 弟子故事 ──
export function showStory(r) {
  const rw = Object.entries(r.reward).map(([k, v]) => ({ token: '🎫', stone: '💎', shard: '🧩' }[k] + v)).join('　');
  return showModal(`<h3>${r.emoji} ${esc(r.name)}・${esc(r.title)}</h3>
    <p class="storytext">${esc(r.text)}</p>
    <p class="hint">獲得 ${rw}；${esc(r.name)} 的特性效果永久 +10%。</p>`);
}
export function showAscend(r) {
  const perm = Object.entries(r.perm).map(([k, v]) => `${{ qiMult: '靈氣', stoneMult: '靈石', powerMult: '戰力', burstReward: '爆擊獎勵' }[k]} +${Math.round(v * 100)}%`).join('、');
  return showModal(`<h3>⚡ ${esc(r.trial.name)}・${esc(r.story[0])}</h3>
    <p class="storytext">${esc(r.story[1])}</p>
    <p class="hint">☯️ 道心 +${r.dao}${perm ? `；永久加成：${esc(perm)}` : ''}。${r.last ? '九劫圓滿——「道心」頁已開放道果。' : ''}</p>`);
}
export function showStoryLog(name, emoji, chapters) {
  return showModal(`<h3>${emoji} ${esc(name)}的回憶</h3>` + chapters.map(([t, x]) => `<p><b class="gold">${esc(t)}</b><br><span class="storytext">${esc(x)}</span></p>`).join(''));
}
