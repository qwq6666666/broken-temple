// 宗門榮耀：榮耀值、等級與永久加成。等級只升不降（取歷史最高）。
import { GLORY_LEVELS, GLORY_PER_LEVEL, GLORY_KEYS, GLORY_SOURCES } from '../data/glory.js';
import { toast, cue } from './events.js';
import { note } from './chronicle.js';

export const gloryPoints = s => Math.floor(GLORY_SOURCES.reduce((a, [, f, w]) => a + f(s) * w, 0));
const levelFor = p => GLORY_LEVELS.reduce((n, l) => (p >= l.at ? n + 1 : n), 0);
export const gloryLevel = s => Math.max(s.glory.lv, levelFor(gloryPoints(s)));
export const gloryName = s => (gloryLevel(s) ? GLORY_LEVELS[gloryLevel(s) - 1].name : '破廟宗主');
export const gloryNext = s => GLORY_LEVELS[gloryLevel(s)] || null;
export const gloryPerm = (s, key) => (GLORY_KEYS.includes(key) ? gloryLevel(s) * GLORY_PER_LEVEL : 0);

export function tick(s) {
  const lv = levelFor(gloryPoints(s));
  if (lv <= s.glory.lv) return;
  s.glory.lv = lv;
  const l = GLORY_LEVELS[lv - 1];
  note(s, '🏆', `宗門榮耀升至 ${lv} 級「${l.name}」`);
  toast(`🏆 宗門榮耀 ${lv} 級：「${l.name}」（靈氣、靈石、戰力永久 +${Math.round(lv * GLORY_PER_LEVEL * 100)}%）`, 'good'); cue('goal');
}
