// 緣分：兩位弟子派駐在同一棟建築時生效。
import { BONDS } from '../data/bonds.js';

// 目前啟用的緣分（回傳 bond 物件陣列）
export function activeBonds(s) {
  return BONDS.filter(b => {
    const a = s.disciples.find(d => d.defId === b.a), c = s.disciples.find(d => d.defId === b.b);
    return a && c && a.at && a.at === c.at;
  });
}
export const bondSum = (s, key) => activeBonds(s).reduce((v, b) => v + (b.effect[key] || 0), 0);

// 單一緣分的狀態：'active' 已啟用 / 'apart' 都有但不同棟 / 'half' 只有一位 / 'none' 都沒有
export function bondStatus(s, b) {
  const a = s.disciples.find(d => d.defId === b.a), c = s.disciples.find(d => d.defId === b.b);
  if (a && c) return a.at && a.at === c.at ? 'active' : 'apart';
  return a || c ? 'half' : 'none';
}
