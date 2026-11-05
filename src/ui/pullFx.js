// 抽卡演出：封印光球蓄力 → 光柱衝天（顏色依本次最高稀有度）→ 閃光與粒子；SSR/UR 另有光芒與橫幅。
// 點擊畫面可跳過。結果卡片由招賢面板以翻牌動畫顯示。
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { sfx } from './audio.js';
import { flash, shake, banner, motionOK } from './fx.js';
import { burstAt, rays } from './particles.js';
import { sleep } from './dom.js';

export const topRarity = results => results.reduce((a, r) => RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(a) ? r.rarity : a, 'N');

export async function playPull(results) {
  if (!motionOK() || typeof document === 'undefined') return;   // 減少動態效果或無瀏覽器環境：直接顯示結果
  const top = topRarity(results), color = RARITIES[top].color, big = top === 'SSR' || top === 'UR';
  const ten = results.length > 1;
  const el = document.createElement('div');
  el.className = `pullfx r-${top}`; el.style.setProperty('--rc', color);
  el.innerHTML = `<div class="pf-orb"></div><div class="pf-ring"></div><div class="pf-ring r2"></div><div class="pf-pillar"></div><div class="pf-hint">點擊跳過</div>`;
  document.body.appendChild(el);
  let skipped = false; el.addEventListener('click', () => { skipped = true; });
  const wait = async ms => { const end = Date.now() + ms; while (!skipped && Date.now() < end) await sleep(30); };

  await wait(ten ? 650 : 500);                              // 光球蓄力
  if (!skipped) {
    el.classList.add('burst');                              // 光柱衝天
    sfx('pull', { r: RARITY_ORDER.indexOf(top) });
    const cx = innerWidth / 2, cy = innerHeight / 2;
    burstAt(cx, cy, { color, n: big ? 40 : 22, speed: big ? 260 : 180, size: big ? 4 : 3, life: 1 });
    if (big) { rays(color); flash(el, color); shake(el, 500); banner(el, `${top}！`, 'chainbanner'); }
    else flash(el, '#fff');
    await wait(big ? 1200 : (ten ? 750 : 550));
  }
  el.classList.add('out'); await sleep(skipped ? 0 : 250); el.remove();
}
