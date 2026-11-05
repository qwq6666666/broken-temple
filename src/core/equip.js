// 法寶裝備欄：點一下裝備／卸下，裝滿要先卸一件。
import { EQUIP_SLOTS } from '../data/artifacts.js';

export function toggleEquip(s, id) {
  if (!s.artifacts.includes(id)) return false;
  const i = s.equipped.indexOf(id);
  if (i >= 0) { s.equipped.splice(i, 1); return true; }
  if (s.equipped.length >= EQUIP_SLOTS) return false;
  s.equipped.push(id); return true;
}
