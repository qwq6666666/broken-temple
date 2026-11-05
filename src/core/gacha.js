// 招賢令抽卡：機率表在 data/gachaRates.js；50 抽保底 SR、90 抽保底 SSR。
import { CONFIG } from '../config.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { DISCIPLES } from '../data/disciples.js';
import { LINES, pickLine } from '../data/lines.js';
import { weighted, pick } from './rng.js';
import { addDisciple } from './disciples.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';

export const tokenPrice = n => ({ stone: CONFIG.gacha.tokenStoneCost * n });
export function buyTokens(s, n) {
  if (!canAfford(s, tokenPrice(n))) return false;
  pay(s, tokenPrice(n)); s.res.token += n; return true;
}

// 決定單抽稀有度（含保底）
function rollRarity(s) {
  const g = s.gacha;
  g.total++; g.sinceSR++; g.sinceSSR++;
  let pool = RARITY_ORDER, pity = false;
  if (g.sinceSSR >= CONFIG.gacha.pitySSR) { pool = ['SSR', 'UR']; pity = true; }
  else if (g.sinceSR >= CONFIG.gacha.pitySR) { pool = ['SR', 'SSR', 'UR']; pity = true; }
  const r = weighted(pool, k => RARITIES[k].weight);
  if (r === 'SR' || r === 'SSR' || r === 'UR') g.sinceSR = 0;
  if (r === 'SSR' || r === 'UR') g.sinceSSR = 0;
  return { rarity: r, pity };
}

// 抽 n 張；招賢令不足回傳 null
export function pull(s, n) {
  if (s.res.token < n) return null;
  s.res.token -= n;
  const results = [];
  for (let i = 0; i < n; i++) {
    const { rarity, pity } = rollRarity(s);
    const def = pick(DISCIPLES.filter(d => d.rarity === rarity));
    const got = addDisciple(s, def.id);
    results.push({ def, rarity, pity, ...got });
  }
  // 老祖點評：取最高稀有度
  const top = results.reduce((a, r) => RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(a) ? r.rarity : a, 'N');
  quote(pickLine(LINES['gacha' + top] || LINES.gachaN));
  return results;
}
