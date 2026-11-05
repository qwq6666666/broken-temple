// 補滿空位：只把「未派駐」的弟子放進空著的駐守位，已派駐的一律不動（保留玩家手動排的結果）。
// 順序：先替已派駐的緣分搭檔補位、再湊兩位都未派駐的搭檔，最後依「貢獻值」（含專長 ×2、五行 ×1.25）由高到低貪婪放入。
import { BONDS } from '../data/bonds.js';
import { BUILDINGS } from '../data/buildings.js';
import { slots } from './buildings.js';
import { contribution } from './discipleMath.js';

export function autoAssign(s) {
  const away = new Set(s.expeditions.flatMap(x => x.uids));
  const pool = s.disciples.filter(d => !d.at && !away.has(d.uid));
  const bids = BUILDINGS.filter(b => slots(s, b.id) > 0).map(b => b.id);
  const cap = Object.fromEntries(bids.map(id => [id, slots(s, id) - s.disciples.filter(d => d.at === id).length]));
  const placed = new Set();
  const put = (d, id) => { d.at = id; cap[id]--; placed.add(d.uid); };
  const best = d => Math.max(0, ...bids.map(id => contribution(d, id)));

  // 1a) 緣分：搭檔已派駐在某棟、這棟還有空位，就補另一位進去（不吃虧太多才補）
  for (const b of BONDS) {
    for (const [mine, other] of [[b.a, b.b], [b.b, b.a]]) {
      const d = pool.find(x => x.defId === mine && !placed.has(x.uid)), partner = s.disciples.find(x => x.defId === other && x.at);
      if (d && partner && cap[partner.at] > 0 && contribution(d, partner.at) >= 0.7 * best(d)) put(d, partner.at);
    }
  }
  // 1b) 緣分：兩人都未派駐時，找一棟空位 ≥ 2 的建築；只在不吃虧太多（≥ 各自最佳的 70%）時才湊
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
