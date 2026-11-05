// 可替換的亂數來源，測試時用 setRng 注入固定序列。
let src = Math.random;
export const setRng = fn => { src = fn; };
export const random = () => src();
export const randInt = (a, b) => a + Math.floor(src() * (b - a + 1));   // 含兩端
export const randFloat = (a, b) => a + src() * (b - a);
export const pick = arr => arr[Math.floor(src() * arr.length)];
export const chance = p => src() < p;
// 加權抽選：items 為陣列，wfn(item) 回傳權重
export function weighted(items, wfn) {
  const total = items.reduce((a, it) => a + wfn(it), 0);
  let r = src() * total;
  for (const it of items) { r -= wfn(it); if (r < 0) return it; }
  return items[items.length - 1];
}
