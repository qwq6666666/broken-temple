// 成就與稱號：每 tick 檢查；解鎖時提示並寫入年表。稱號只是顯示用，不影響數值。
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { toast, cue } from './events.js';
import { note } from './chronicle.js';

export const isDone = (s, id) => s.achv.done.includes(id);
export const progress = (s, a) => Math.min(a.target, a.cur(s));
export const titleOf = s => (s.achv.title && isDone(s, s.achv.title) ? ACHIEVEMENTS_BY_ID[s.achv.title].title : '');

export function tick(s) {
  for (const a of ACHIEVEMENTS) {
    if (isDone(s, a.id) || a.cur(s) < a.target) continue;
    s.achv.done.push(a.id);
    note(s, a.icon, `達成成就「${a.name}」，獲得稱號「${a.title}」`);
    toast(`${a.icon} 成就達成：${a.name}（稱號「${a.title}」）`, 'good'); cue('goal');
  }
}
export function equip(s, id) {
  if (id && !isDone(s, id)) return false;
  s.achv.title = id || null; return true;
}
