// 弟子故事：條件達成可「讀故事」，領獎勵並讓特性 +10%（永久）。
import { STORIES, STORIES2, STORY_RULES as R } from '../data/stories.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { starOf } from './discipleMath.js';
import { quote } from './events.js';

export const chaptersRead = (s, defId) => s.stories[defId] || 0;
export const chapterCount = defId => (STORIES2[defId] ? 2 : 1);

// 弟子 d 目前可讀的下一章（無則 null）
export function nextChapter(s, d) {
  const n = chaptersRead(s, d.defId);
  if (n === 0 && d.lv >= R.ch1.lv) { const [title, text] = STORIES[d.defId]; return { idx: 1, title, text }; }
  if (n === 1 && STORIES2[d.defId] && starOf(d) >= R.ch2.star) { const [title, text] = STORIES2[d.defId]; return { idx: 2, title, text }; }
  return null;
}
// 還沒達成條件時的提示文字
export function lockedHint(s, d) {
  const n = chaptersRead(s, d.defId);
  if (n >= chapterCount(d.defId)) return null;
  return n === 0 ? `升到 Lv${R.ch1.lv} 解鎖故事` : `升到 ${R.ch2.star} 星解鎖第二章`;
}

// 讀故事：回傳 {title,text,reward,idx}；不符條件回傳 null
export function read(s, uid) {
  const d = s.disciples.find(x => x.uid === uid); if (!d) return null;
  const ch = nextChapter(s, d); if (!ch) return null;
  const rarity = DISCIPLES_BY_ID[d.defId].rarity;
  const reward = ch.idx === 1 ? R.reward1[rarity] : R.reward2;
  for (const [k, v] of Object.entries(reward)) s.res[k] += v;
  s.stories[d.defId] = ch.idx;
  quote(`${DISCIPLES_BY_ID[d.defId].name}的故事……本座都聽哭了。……沒有，是灰塵。`);
  return { ...ch, reward, name: DISCIPLES_BY_ID[d.defId].name, emoji: DISCIPLES_BY_ID[d.defId].emoji };
}
// 重讀已解鎖的章節（不給獎勵）
export function reread(s, defId) {
  const n = chaptersRead(s, defId), out = [];
  if (n >= 1) out.push(STORIES[defId]);
  if (n >= 2) out.push(STORIES2[defId]);
  return out;
}
export const totalChapters = s => Object.values(s.stories).reduce((a, n) => a + n, 0);
