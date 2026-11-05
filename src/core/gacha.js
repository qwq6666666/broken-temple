// 招賢令抽卡：機率表在 data/gachaRates.js；50 抽保底 SR、90 抽保底 SSR。
import { CONFIG } from '../config.js';
import { RARITIES, RARITY_ORDER } from '../data/gachaRates.js';
import { DISCIPLES } from '../data/disciples.js';
import { LINES, pickLine } from '../data/lines.js';
import { weighted, pick } from './rng.js';
import { addDisciple } from './disciples.js';
import { canAfford, pay } from './resources.js';
import { quote } from './events.js';
import { MERIT, TOKEN_SHOP } from '../data/materials.js';

// 靈石買招賢令：每遊戲小時限購 N 張、越買越貴；功勳可穩定兌換。
const shop = s => { const b = s.tokBuy || (s.tokBuy = { n: 0, resetAt: 0 }); if (s.t >= b.resetAt) { b.n = 0; b.resetAt = s.t + TOKEN_SHOP.windowMs; } return b; };
export const tokenLeft = s => TOKEN_SHOP.limit - shop(s).n;
export const tokenResetMs = s => Math.max(0, shop(s).resetAt - s.t);
// 買第 k 張（0 起算）的靈石價
const priceAt = k => Math.ceil(CONFIG.gacha.tokenStoneCost * (1 + TOKEN_SHOP.step * k));
export const tokenPrice = (s, n = 1) => { const b = shop(s).n; let c = 0; for (let i = 0; i < n; i++) c += priceAt(b + i); return { stone: c }; };
export function buyTokens(s, n) {
  if (n < 1 || n > tokenLeft(s) || !canAfford(s, tokenPrice(s, n))) return false;
  pay(s, tokenPrice(s, n)); s.res.token += n; shop(s).n += n; return true;
}
export const meritPrice = n => ({ merit: MERIT.perToken * n });
export function exchangeMerit(s, n = 1) {
  if (n < 1 || !canAfford(s, meritPrice(n))) return false;
  pay(s, meritPrice(n)); s.res.token += n; return true;
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
