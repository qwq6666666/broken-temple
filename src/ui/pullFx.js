// 抽卡演出：封印光球蓄力 → 光柱衝天（顏色依本次最高稀有度）→ 閃光與粒子；SSR/UR 另有光芒與橫幅。
// 光柱之後進入「逐張揭曉」：一次一張大卡，點擊翻下一張；稀有度越高特效越強；可「略過」直接看總覽。
// 結果只在這個畫面顯示一次，招賢面板不再保留結果卡。
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { sfx } from './audio.js';
import { flash, shake, banner, motionOK } from './fx.js';
import { burstAt, rays } from './particles.js';
import { sleep, esc } from './dom.js';
import { gachaCard } from './gachaPanel.js';
import { traitText } from '../data/traits.js';

export const topRarity = results => results.reduce((a, r) => RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(a) ? r.rarity : a, 'N');

export async function playPull(results) {
  if (typeof document === 'undefined') return;
  const top = topRarity(results), color = RARITIES[top].color, big = top === 'SSR' || top === 'UR';
  const ten = results.length > 1, anim = motionOK();
  const el = document.createElement('div');
  el.className = `pullfx r-${top}`; el.style.setProperty('--rc', color);
  document.body.appendChild(el);
  if (anim) {
    el.innerHTML = `<div class="pf-orb"></div><div class="pf-ring"></div><div class="pf-ring r2"></div><div class="pf-pillar"></div><div class="pf-hint">點擊跳過</div>`;
    let skipped = false; const onSkip = () => { skipped = true; }; el.addEventListener('click', onSkip);
    const wait = async ms => { const end = Date.now() + ms; while (!skipped && Date.now() < end) await sleep(30); };
    await wait(ten ? 650 : 500);                              // 光球蓄力
    if (!skipped) {
      el.classList.add('burst');                              // 光柱衝天
      sfx('pull', { r: RARITY_ORDER.indexOf(top) });
      const cx = innerWidth / 2, cy = innerHeight / 2;
      burstAt(cx, cy, { color, n: big ? 40 : 22, speed: big ? 260 : 180, size: big ? 4 : 3, life: 1 });
      if (big) { rays(color); flash(el, color); shake(el, 500); banner(el, `${top}！`, 'chainbanner'); }
      else flash(el, '#fff');
      await wait(big ? 1000 : (ten ? 600 : 450));
    }
    el.removeEventListener('click', onSkip);
    el.classList.remove('burst');
    await reveal(el, results, ten);
  } else {
    await summary(el, results);                               // 減少動態效果：直接看總覽
  }
  el.classList.add('out'); await sleep(anim ? 250 : 0); el.remove();
}

const RV_TEXT = { N: '', R: '', SR: '不錯！', SSR: '大成功！', UR: '天命之人！！' };
// 逐張揭曉：點擊（或空白鍵）下一張；「略過」直接看總覽
async function reveal(el, results, ten) {
  el.innerHTML = `<div class="rv-prog"></div><div class="rv-stage"></div><button class="rv-skip btn mini">${ten ? '略過 ⏭' : ''}</button><div class="pf-hint">點擊繼續</div>`;
  const stage = el.querySelector('.rv-stage'), prog = el.querySelector('.rv-prog'), skipBtn = el.querySelector('.rv-skip');
  let skipAll = false, next = null;
  skipBtn.addEventListener('click', e => { e.stopPropagation(); skipAll = true; next?.(); });
  const advance = () => next?.();
  el.addEventListener('click', advance);
  const onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); } };
  document.addEventListener('keydown', onKey);
  for (let i = 0; i < results.length && !skipAll; i++) {
    const r = results[i], c = RARITIES[r.rarity].color, ri = RARITY_ORDER.indexOf(r.rarity), hi = ri >= 2, huge = ri >= 3;
    el.style.setProperty('--rc', c); el.className = `pullfx rv r-${r.rarity}`;
    prog.innerHTML = results.length > 1 ? results.map((x, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}" style="--c:${RARITIES[x.rarity].color}"></i>`).join('') : '';
    stage.innerHTML = `${hi ? '<div class="rv-rays"></div>' : ''}<div class="rv-card ${hi ? 'hi' : ''} ${huge ? 'huge' : ''}" style="--rc:${c}">
      <div class="rv-r">${r.rarity}</div><div class="rv-e">${r.def.emoji}</div><b class="rv-n">${esc(r.def.name)}</b>
      <small>${esc(r.def.specialty)}・${esc(r.def.element)}・${esc(r.def.personality)}</small>
      <small class="trait on">✦ ${esc(traitText(r.def.trait.key, r.def.trait.value))}</small>
      <small class="rv-q">「${esc(r.def.quote)}」</small>
      <span class="rv-tag ${r.isNew ? 'new' : ''}">${r.isNew ? '✨ 新弟子' : `重複 → 🧬${esc(r.def.name)}碎片 +${r.shards}`}${r.pity ? '・保底' : ''}</span></div>`;
    sfx('pull', { r: ri });
    const cx = innerWidth / 2, cy = innerHeight / 2;
    if (ri >= 1) burstAt(cx, cy, { color: c, n: [0, 16, 28, 44, 64][ri], speed: [0, 130, 190, 260, 340][ri], size: ri >= 3 ? 4 : 3, life: 1 });
    if (hi) { rays(c); flash(el, ri >= 3 ? c : '#fff'); }
    if (huge) { shake(el, ri === 4 ? 800 : 500); banner(el, RV_TEXT[r.rarity] || r.rarity, 'chainbanner'); }
    await new Promise(res => { next = res; });
    next = null;
  }
  document.removeEventListener('keydown', onKey); el.removeEventListener('click', advance);
  el.className = `pullfx r-${topRarity(results)}`; el.style.setProperty('--rc', RARITIES[topRarity(results)].color);
  await summary(el, results);
}

// 總覽：全部結果一覽，按「完成」關閉
async function summary(el, results) {
  el.innerHTML = `<div class="rv-sum"><h3>招賢結果</h3><div class="gresults">${results.map((r, i) => gachaCard(r, i, false)).join('')}</div><button class="btn primary big rv-done">完成</button></div>`;
  await new Promise(res => { el.querySelector('.rv-done').addEventListener('click', e => { e.stopPropagation(); res(); }); });
}
