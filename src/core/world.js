// 修仙界風雲榜：每隔幾分鐘產生一則外界動態（勢力之間的消長）；玩家的作為也會被傳成流言。純氛圍，不影響數值。
import { CONFIG } from '../config.js';
import { FACTIONS } from '../data/factions.js';
import { NEWS_TEMPLATES, NEWS_PLAYER } from '../data/worldNews.js';
import { pick, randInt, chance } from './rng.js';
import { repOf } from './factions.js';

export function addNews(s, icon, text, quote = '') {
  const w = s.world || (s.world = { next: 0, news: [] });
  w.news.push({ t: Math.floor(s.t), icon, text, quote });
  if (w.news.length > CONFIG.world.keep) w.news.splice(0, w.news.length - CONFIG.world.keep);
}

export function tick(s) {
  const w = s.world || (s.world = { next: 0, news: [] });
  if (s.t < w.next) return;
  w.next = s.t + randInt(CONFIG.world.minSec, CONFIG.world.maxSec) * 1000;
  if (w.next - s.t > 0 && w.news.length === 0 && s.t < 60000) return;          // 開局第一分鐘先不放
  const fs = FACTIONS.filter(f => f.id !== 'trade');
  const a = pick(fs), b = pick(fs.filter(f => f.id !== a.id));
  // 玩家對某勢力有威望時，有機會出現「被你打過的人」的流言
  const known = fs.filter(f => repOf(s, f.id) > 0);
  if (known.length && chance(0.3)) { const f = pick(known), t = pick(NEWS_PLAYER); addNews(s, t.icon, t.text.replace('{A}', f.name), t.quote); return; }
  const t = pick(NEWS_TEMPLATES);
  addNews(s, t.icon, t.text.replaceAll('{A}', a.name).replaceAll('{B}', b.name), t.quote);
}
