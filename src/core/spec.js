// 建築專精：二選一（本輪有效）。
import { SPECS, SPEC_LEVEL } from '../data/specs.js';
import { toast, quote } from './events.js';

export const specOptions = id => SPECS[id] || [];
export const chosenSpec = (s, id) => specOptions(id).find(o => o.id === s.specs[id]) || null;
export const canChoose = (s, id) => !!SPECS[id] && s.buildings[id].lv >= SPEC_LEVEL && !s.specs[id];

export function choose(s, id, optId) {
  if (!canChoose(s, id)) return false;
  const o = specOptions(id).find(x => x.id === optId); if (!o) return false;
  s.specs[id] = optId;
  toast(`🏗 專精確立：${o.name}`, 'good'); quote(o.flavor);
  return true;
}
// 專精加成總和（由 dao.perm 併入各處）
export function specSum(s, key) {
  let v = 0;
  for (const id of Object.keys(s.specs)) { const o = chosenSpec(s, id); if (o) v += o.effects[key] || 0; }
  return v;
}
