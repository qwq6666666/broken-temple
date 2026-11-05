// 勢力威望：打臉越多，威望越高；三階效果見 data/factions.js。
import { FACTIONS_BY_ID, FACTION_OF_SECT, FACTION_RULES as R, FACTION_TIERS } from '../data/factions.js';
import { toast, cue } from './events.js';

export const factionOf = sect => FACTION_OF_SECT[sect] || null;
export const repOf = (s, id) => s.factions[id] || 0;
export function tierOf(s, id) { const r = repOf(s, id); return R.thresholds.filter(t => r >= t).length; }     // 0～3
export const tierOfSect = (s, sect) => { const f = factionOf(sect); return f ? tierOf(s, f) : 0; };

// 增加威望；回傳是否升階（升階時提示）
export function addRep(s, sect, n) {
  const id = factionOf(sect); if (!id) return null;
  const before = tierOf(s, id);
  s.factions[id] = repOf(s, id) + n;
  const after = tierOf(s, id);
  if (after > before) { toast(`${FACTIONS_BY_ID[id].emoji} ${FACTIONS_BY_ID[id].name}威望提升：「${FACTION_TIERS[after]}」`, 'good'); cue('goal'); }
  return { id, before, after };
}
// 第一階起：打該勢力的人獎勵加成
export const rewardMult = (s, sect) => 1 + (tierOfSect(s, sect) >= 1 ? R.tier1Reward : 0);
// 第三階（俯首稱臣）的永久加成，由 dao.perm 併入
export function factionPerm(s, key) {
  let v = 0;
  for (const id of Object.keys(s.factions)) if (tierOf(s, id) >= 3) v += FACTIONS_BY_ID[id]?.perk[key] || 0;
  return v;
}
