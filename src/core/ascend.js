// 九重天劫：化神後的長線目標。條件在化神時檢查，達成進入「待渡」，由玩家按「渡劫」領取。
// 永久加成由 dao.perm 一併計入；九劫全渡後開啟道心商店的「道果」。
import { TRIALS, TRIALS_BY_ID, ASCEND_RULES as R, RUN_BASE_KEYS } from '../data/ascend.js';
import { toast, cue, quote } from './events.js';
import { note } from './chronicle.js';

export const isDone = (s, id) => s.ascend.done.includes(id);
export const isReady = (s, id) => s.ascend.ready.includes(id);
export const reached = s => s.realmIdx >= R.minRealm;
export const readyCount = s => s.ascend.ready.length;
export const doneCount = s => s.ascend.done.length;
export const complete = s => TRIALS.every(t => isDone(s, t.id));

// 單一天劫目前的進度與狀態：'done' | 'ready' | 'open'（可嘗試）| 'failed'（本輪來不及）
export function status(s, tr) {
  if (isDone(s, tr.id)) return { state: 'done', cur: 1, target: 1, text: '已渡' };
  if (isReady(s, tr.id)) return { state: 'ready', cur: 1, target: 1, text: '條件達成，可以渡劫' };
  const c = tr.check(s);
  return { state: c.failed ? 'failed' : 'open', ...c };
}

// 每 tick：化神後逐一檢查條件，達成就進入待渡（只提示一次）
export function tick(s) {
  if (!reached(s)) return;
  for (const tr of TRIALS) {
    if (isDone(s, tr.id) || isReady(s, tr.id)) continue;
    const c = tr.check(s);
    if (c.failed || c.cur < c.target) continue;
    s.ascend.ready.push(tr.id);
    toast(`⚡ 天劫降臨：「${tr.name}」可以渡劫了`, 'good'); cue('goal');
  }
}

// 渡劫：領取獎勵與故事。成功回傳 { trial, story, dao, perm, last }；不符條件回傳 null
export function claim(s, id) {
  const tr = TRIALS_BY_ID[id];
  if (!tr || !isReady(s, id) || isDone(s, id)) return null;
  s.ascend.ready = s.ascend.ready.filter(x => x !== id);
  s.ascend.done.push(id);
  s.res.daoHeart += tr.reward.dao || 0;
  const last = complete(s);
  note(s, '⚡', `渡過天劫「${tr.name}」（${doneCount(s)}/${TRIALS.length}）${last ? '——九劫圓滿，道果初成' : ''}`);
  toast(`⚡ 渡劫成功：「${tr.name}」道心 +${tr.reward.dao}`, 'good'); cue('goal');
  quote(last ? '三千年了……這座廟，終於不用我一個人守了。' : '嗯，雷沒把你劈傻，算你命硬。');
  return { trial: tr, story: tr.story, dao: tr.reward.dao || 0, perm: tr.reward.perm || {}, last };
}

// 永久加成（供 dao.perm 使用）
export const ascendPerm = (s, key) => s.ascend.done.reduce((a, id) => a + (TRIALS_BY_ID[id]?.reward.perm?.[key] || 0), 0);

// 重讀已渡過的天劫故事
export const stories = s => TRIALS.filter(t => isDone(s, t.id)).map(t => t.story);

// 轉生當下記錄本輪基準（本輪統計 = 累計 - 基準）
export function startRun(s) {
  s.run.startT = s.t;
  s.run.base = Object.fromEntries(RUN_BASE_KEYS.map(k => [k, s.stats[k] || 0]));
}
