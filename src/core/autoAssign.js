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
  // 2) 其餘：反覆挑「邊際貢獻最大」的（弟子, 建築）放入。邊際貢獻 = 自己的貢獻（含與同棟隊友的五行相生相剋）
  //    ＋ 他加入後對既有隊友貢獻的變化。
  const mates = id => s.disciples.filter(x => x.at === id);
  const gain = (d, id) => {
    const ms = mates(id);
    let v = contribution(d, id, ms);
    for (const m of ms) v += contribution(m, id, [...ms.filter(x => x !== m), d]) - contribution(m, id, ms.filter(x => x !== m));
    return v;
  };
  for (;;) {
    let top = null;
    for (const d of pool) if (!placed.has(d.uid)) for (const id of bids) if (cap[id] > 0) { const g = gain(d, id); if (!top || g > top[0] + 1e-12) top = [g, d, id]; }
    if (!top) break;
    put(top[1], top[2]);
  }
  // 3) 區域搜尋：兩人互換、或移到空位，只要整體貢獻變高就接受（最多 30 輪），補貪婪的盲點
  const mine = pool.filter(d => placed.has(d.uid));
  const bscore = id => { const ms = mates(id); return ms.reduce((a, m) => a + contribution(m, id, ms.filter(x => x !== m)), 0); };
  const both = (a, b) => (a === b ? bscore(a) : bscore(a) + bscore(b));
  for (let pass = 0; pass < 30; pass++) {
    let improved = false;
    for (const d of mine) {
      for (const id of bids) {
        if (d.at === id) continue;
        const from = d.at;
        if (cap[id] > 0) {                                       // 移到空位
          const before = both(from, id); d.at = id; const after = both(from, id);
          if (after > before + 1e-9) { cap[id]--; cap[from]++; improved = true; } else d.at = from;
        }
        for (const e of mine) {                                  // 與另一位互換
          if (e === d || e.at !== id || d.at !== from) continue;
          const before = both(from, id); d.at = id; e.at = from; const after = both(from, id);
          if (after > before + 1e-9) improved = true; else { d.at = from; e.at = id; }
        }
      }
    }
    if (!improved) break;
  }
  return { placed: placed.size, total: pool.length };
}
