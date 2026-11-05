// 一鍵最佳派駐：先湊緣分搭檔，再依「貢獻值」由高到低貪婪放入（專長相符 ×2、五行 ×1.25 已含在貢獻值）。
// 只動未探索的弟子；探索中的弟子與他們佔的位置維持原樣。
import { BONDS } from '../data/bonds.js';
import { BUILDINGS } from '../data/buildings.js';
import { slots } from './buildings.js';
import { contribution } from './discipleMath.js';

export function autoAssign(s) {
  const away = new Set(s.expeditions.flatMap(x => x.uids));
  const pool = s.disciples.filter(d => !away.has(d.uid));
  const bids = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => b.id);
  const cap = Object.fromEntries(bids.map(id => [id, slots(s, id) - s.disciples.filter(d => away.has(d.uid) && d.at === id).length]));
  pool.forEach(d => { d.at = null; });
  const placed = new Set();
  const put = (d, id) => { d.at = id; cap[id]--; placed.add(d.uid); };
  const best = d => Math.max(0, ...bids.map(id => contribution(d, id)));

  // 1) 緣分：兩人都在名單內時，找一棟空位 ≥ 2 的建築；只在不吃虧太多（≥ 各自最佳的 70%）時才湊
  for (const b of BONDS) {
    const a = pool.find(d => d.defId === b.a), c = pool.find(d => d.defId === b.b);
    if (!a || !c || placed.has(a.uid) || placed.has(c.uid)) continue;
    const opts = bids.filter(id => cap[id] >= 2).map(id => [id, contribution(a, id) + contribution(c, id)]).sort((x, y) => y[1] - x[1]);
    if (opts.length && opts[0][1] >= 0.7 * (best(a) + best(c))) { put(a, opts[0][0]); put(c, opts[0][0]); }
  }
  // 2) 其餘：所有（弟子, 建築）組合依貢獻值排序，能放就放
  const pairs = [];
  for (const d of pool) if (!placed.has(d.uid)) for (const id of bids) pairs.push([contribution(d, id), d, id]);
  pairs.sort((x, y) => y[0] - x[0]);
  for (const [, d, id] of pairs) if (!placed.has(d.uid) && cap[id] > 0) put(d, id);
  return { placed: placed.size, total: pool.length };
}
