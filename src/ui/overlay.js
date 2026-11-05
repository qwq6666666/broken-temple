// 全螢幕演出：境界突破、爆發場景（暗幕＋老祖旁白＋仇人逐一登場）、結算畫面。
import { CONFIG } from '../config.js';
import { VISITOR_TYPES } from '../data/visitors.js';
import { RARITIES } from '../data/gachaRates.js';
import { fmt, fmtTime } from '../core/format.js';
import { esc, sleep } from './dom.js';
import { sfx } from './audio.js';
import { daoGain } from '../core/dao.js';
import { HELP, INTRO } from '../data/help.js';
import { getPrefs } from './prefs.js';
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
    <div class="narr" data-r="narr"></div>
    <div class="stage" data-r="stage"></div></div>`;
  o.classList.add('on');
  const scene = o.firstElementChild;
  o.querySelector('.skipbtn').onclick = () => { skip.v = true; };
  const narr = o.querySelector('[data-r=narr]'), stage = o.querySelector('[data-r=stage]'), chainEl = o.querySelector('[data-r=chain]');

  sfx('burstIntro');
  await typeInto(narr, `老祖：「${result.intro}」`, skip);
  await wait(600, skip);

  let n = 0;
  for (const e of result.entries) {
    const t = VISITOR_TYPES[e.g.type];
    const card = document.createElement('div');
    card.className = `enemy ${e.verdict} ${e.nemesis ? 'nemesis' : ''}`;
    card.innerHTML = `<div class="ehead"><span class="eemoji">${e.nemesis ? e.nemesis.emoji : t.emoji}</span>
      <div><b>${esc(e.g.name)}</b> ${e.nemesis ? `<span class="tag gold">宿敵・${esc(e.nemesis.title)}</span>` : ''}<span class="tag">${esc(t.label)}</span><br><small>${esc(e.g.sect)}・${esc(e.g.label)}</small></div></div>
      <p class="etaunt"></p><p class="eline"></p><div class="everdict"></div>`;
    stage.appendChild(card);
    stage.scrollTop = stage.scrollHeight;
    // 兩段式：先重播他當初的嘲諷，停頓，再接逆轉台詞
    await typeInto(card.querySelector('.etaunt'), `「${e.taunt}」`, skip, 16);
    await wait(450, skip);
    card.querySelector('.etaunt').classList.add('old');
    await typeInto(card.querySelector('.eline'), `「${e.line}」`, skip, 22);
    const vd = card.querySelector('.everdict');
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
    card.classList.add('shown');
    await typeInto(narr, `老祖：「${e.narr}」`, skip, 18);
    await wait(CONFIG.burst.stepMs * 0.35, skip);
  }
  await typeInto(narr, `老祖：「${result.outro}」`, skip);
  await wait(900, skip);
  return showSettlement(result);
}

const RARE = new Set(['SSR', 'UR']);

function showSettlement(r) {
  const o = root();
  const crush = r.entries.filter(e => e.verdict === 'crush').length;
  const narrow = r.entries.filter(e => e.verdict === 'narrow').length;
  const fail = r.entries.length - crush - narrow;
  const sur = r.surrendered.length
    ? r.surrendered.map(x => `<span class="art ${RARE.has(x.def.rarity) ? 'rare' : ''}" style="color:${RARITIES[x.def.rarity].color}">${x.def.emoji} ${esc(x.def.name)} <small>${x.def.rarity}・原屬 ${esc(x.from)}</small></span>`).join('')
    : '<span class="dim">無</span>';
  const arts = r.artifacts.length
    ? r.artifacts.map(a => `<span class="art rare">${a.emoji} ${esc(a.name)}<small>${esc(a.desc)}</small></span>`).join('') : '<span class="dim">無</span>';
  o.innerHTML = `<div class="ov settle"><div class="panel">
    <h2>💥 破廟一怒・結算</h2>
    <div class="sgrid">
      <div><span>連鎖數</span><b>${r.chain}</b></div>
      <div><span>連鎖加成</span><b>×${r.chainMult}</b></div>
      <div><span>蓄力倍率</span><b>×${fmt(r.chargeMult)}</b></div>
      <div><span>碾壓／險勝／打不過</span><b>${crush}／${narrow}／${fail}</b></div>
    </div>
    <h3>總獎勵</h3>
    <div class="sgrid">
      <div><span>✨ 靈氣</span><b data-count="${r.total.qi}">0</b></div>
      <div><span>💎 靈石</span><b data-count="${r.total.stone}">0</b></div>
      <div><span>🎫 招賢令</span><b data-count="${r.total.token}">0</b></div>
    </div>
    ${r.nemesesDefeated.map(d => `<div class="nemstory"><b>⚔️ 宿敵倒下：${esc(d.n.name)}（${esc(d.n.title)}）</b>
      <p>${esc(d.n.story.defeat)}</p>
      ${d.art ? `<span class="art rare">${d.art.emoji} ${esc(d.art.name)}<small>${esc(d.art.desc)}</small></span>` : ''}
      ${d.finale ? '<p class="gold"><b>🏯 破廟的真相已經揭開——這座廟，是青雲宗的祖庭。</b></p>' : ''}</div>`).join('')}
    <h3>降服弟子（到「復仇簿」招募）</h3><div class="arts">${sur}</div>
    <h3>功法／法寶</h3><div class="arts">${arts}</div>
    ${r.backfire ? `<p class="warnline">⚠ 反噬！${esc(r.backfire.names.join('、'))} 實力遠勝於你，反擊造成損失 💎${fmt(r.backfire.lost)}${r.backfire.paused ? '，並有一處建築暫停產出' : ''}。</p>` : ''}
    <p class="lineq">老祖：「${esc(r.outro)}」</p>
    <button class="btn primary big" data-act="closeSettle">收工</button>
  </div></div>`;
  sfx(r.backfire ? 'backfire' : 'fanfare');
  o.querySelectorAll('[data-count]').forEach(el => countUp(el, +el.dataset.count, v => '+' + fmt(v)));
  return new Promise(res => { o._done = res; });
}

export function closeOverlay() {
  const o = root();
  o.classList.remove('on'); o.innerHTML = '';
  if (o._done) { o._done(); o._done = null; }
}

// ── 歡迎回來（離線收益） ──
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
  const rows = pv.entries.map(e => `<div class="pvrow"><span>${esc(e.g.name)} <small>${esc(e.g.label)}</small></span>
    <span>${e.risk ? '<span class="tag red">⚠ 可能反噬</span> ' : ''}<span class="verdict ${PV[e.verdict][0]}">${PV[e.verdict][1]}</span></span></div>`).join('');
  return showModal(`<h3>💥 引爆預覽</h3>
    <p>預計擊敗 <b class="gold">${pv.chain}</b> 人，連鎖加成 <b class="gold">×${pv.chainMult}</b>，蓄力倍率 <b class="gold">×${fmt(pv.chargeMult)}</b>。打不過的人會留在名單上。</p>
    <div class="pvlist">${rows}</div>
    ${pv.backfires ? '<p class="warnline">⚠ 有長老實力遠勝於你，引爆會遭到反噬（損失靈石、建築暫停）。可以再蓄力、突破後再爆。</p>' : ''}
    <div style="text-align:center;margin-top:10px"><button class="btn primary big" data-act="confirmBurst">不裝了！</button></div>`);
}

// ── 轉生確認 ──
export function showRebirthConfirm(s) {
  return showModal(`<h3>☯️ 轉生</h3>
    <p>本次可獲得 <b class="gold">道心 ${fmt(daoGain(s))}</b>。</p>
    <p><b>會重置：</b>靈氣、靈石、招賢令、境界、建築、弟子等級與派駐、復仇簿、偽裝與蓄力。</p>
    <p><b>會保留：</b>弟子收藏與星級、碎片、功法法寶、宗門大事、宿敵進度、抽卡保底、道心與商店加成、設定。</p>
    <p class="hint">轉生後境界回到凡人，但道心加成與轉生次數加成會讓你重新修煉得更快。</p>
    <div style="text-align:center;margin-top:10px"><button class="btn primary big" data-act="confirmRebirth">確定轉生</button></div>`);
}

// ── 玩法說明／開場介紹 ──
export function showHelp(intro = false) {
  const list = intro ? INTRO : HELP;
  return showModal(`<h3>${intro ? '🏚️ 歡迎來到破廟宗主' : '❓ 玩法說明'}</h3>
    ${list.map(x => `<p><b class="gold">${esc(x.t)}</b><br>${esc(x.d)}</p>`).join('')}
    ${intro ? '' : `<label class="loss"><input type="checkbox" data-change="toggleHints" ${getPrefs().hints ? 'checked' : ''}> 顯示畫面上方的「下一步」提示</label>`}`);
}

// ── 弟子故事 ──
export function showStory(r) {
  const rw = Object.entries(r.reward).map(([k, v]) => ({ token: '🎫', stone: '💎', shard: '🧩' }[k] + v)).join('　');
  return showModal(`<h3>${r.emoji} ${esc(r.name)}・${esc(r.title)}</h3>
    <p class="storytext">${esc(r.text)}</p>
    <p class="hint">獲得 ${rw}；${esc(r.name)} 的特性效果永久 +10%。</p>`);
}
export function showStoryLog(name, emoji, chapters) {
  return showModal(`<h3>${emoji} ${esc(name)}的回憶</h3>` + chapters.map(([t, x]) => `<p><b class="gold">${esc(t)}</b><br><span class="storytext">${esc(x)}</span></p>`).join(''));
}
