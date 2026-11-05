// 資源通用工具：cost 是 {資源: 數量} 物件。
export const canAfford = (s, cost) => Object.entries(cost).every(([k, v]) => s.res[k] >= v);
export function pay(s, cost) {
  if (!canAfford(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) s.res[k] -= v;
  return true;
}
export const gain = (s, k, n) => { s.res[k] += n; };
