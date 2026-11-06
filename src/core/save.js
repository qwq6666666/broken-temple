// 存檔：localStorage 存 {version, savedAt, state}。state 為純 JSON，直接序列化。
// 讀檔時以「預設狀態 + 存檔」遞迴合併，之後新增欄位／建築不會讓舊檔壞掉。
import { CONFIG } from '../config.js';
import { createState } from './state.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { STORIES, STORIES2, STORIES3 } from '../data/stories.js';
import { TRIALS_BY_ID } from '../data/ascend.js';
import { SPECS } from '../data/specs.js';
import { FACTIONS_BY_ID } from '../data/factions.js';
import { EXPEDITIONS_BY_ID } from '../data/expeditions.js';
import { MUTATORS_BY_ID } from '../data/mutators.js';
import { ARTIFACTS_BY_ID, EQUIP_SLOTS } from '../data/artifacts.js';
import { GOALS_BY_ID } from '../data/goals.js';
import { NEMESES_BY_ID } from '../data/nemeses.js';
import { INCIDENTS_BY_ID } from '../data/incidents.js';
import { BUILDINGS_BY_ID } from '../data/buildings.js';
import { GLORY_LEVELS } from '../data/glory.js';
import { RIPE } from '../data/enemies.js';
import { MAT_KEYS } from '../data/materials.js';
import { EXPLORATION } from '../data/exploration.js';
import { INSIGHTS, INSIGHT_MAX } from '../data/insights.js';
import { ELEMENTS, elementFromName } from '../data/elements.js';
import { BRANCH_KEYS } from '../data/branches.js';
import { ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { COMMISSION_BY_KIND } from '../data/commissions.js';
import { DAO_SHOP_BY_ID } from '../data/daoShop.js';
import { PERSONALITIES, VISITOR_TYPES } from '../data/visitors.js';

export const SAVE_VERSION = 2;

const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, saved) {
  if (saved === undefined || saved === null) return base;                       // 缺欄位或 null → 用預設
  if (typeof base === 'number') { const n = Number(saved); return Number.isFinite(n) ? n : base; }   // 型別錯誤的數字
  if (!isPlain(base) || !isPlain(saved)) return saved;
  const out = { ...base };
  for (const k of Object.keys(saved)) out[k] = k in base ? merge(base[k], saved[k]) : saved[k];
  return out;
}

// 舊版存檔升級（之後改資料結構時在這裡加）
function migrate(data) {
  // v1 → v2：新增 reincarnation / run 欄位，由 merge() 以預設值補齊，資料本身不需轉換
  data.version = SAVE_VERSION;
  return data;
}

// 清理存檔：移除資料裡已不存在的 id、修正壞值，避免改版後舊存檔讓畫面崩潰或事件卡住
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
function sanitizeGrudge(g) {
  if (!isPlain(g)) return null;
  const out = { ...g };
  if (!VISITOR_TYPES[out.type]) out.type = 'former';
  if (!PERSONALITIES[out.personality]) out.personality = '傲慢';
  if (out.nemesisId && !NEMESES_BY_ID[out.nemesisId]) delete out.nemesisId;
  out.element = ELEMENTS.includes(out.element) ? out.element : elementFromName(out.name);
  out.awaken = out.nemesisId ? Math.max(0, Math.min(3, Math.floor(num(Number(out.awaken))))) : 0;
  out.lvl = Math.max(0, num(Number(out.lvl)));
  out.name = String(out.name ?? '無名'); out.sect = String(out.sect ?? ''); out.role = String(out.role ?? '');
  out.alert = !!out.alert; out.spare = !!out.spare;
  out.ripe = Math.max(0, Math.min(RIPE.max, Math.floor(num(Number(out.ripe))))); out.foe = Math.max(0, Math.min(99, Math.floor(num(Number(out.foe)))));
  if (out.returning && out.returning !== 'plead' && out.returning !== 'revenge') delete out.returning;
  return out;
}
export function sanitize(s) {
  const dedupe = a => [...new Set(a)];
  s.disciples = (Array.isArray(s.disciples) ? s.disciples : []).filter(d => isPlain(d) && DISCIPLES_BY_ID[d.defId]).map(d => ({
    ...d, branch: BRANCH_KEYS.includes(d.branch) ? d.branch : null, lv: Math.max(1, Math.floor(num(Number(d.lv), 1))), star: Math.max(0, Math.min(3, Math.floor(num(Number(d.star), 0)))),
    at: BUILDINGS_BY_ID[d.at] ? d.at : null }));
  s.recruits = (Array.isArray(s.recruits) ? s.recruits : []).filter(r => isPlain(r) && DISCIPLES_BY_ID[r.defId]);
  s.artifacts = dedupe((Array.isArray(s.artifacts) ? s.artifacts : []).filter(id => ARTIFACTS_BY_ID[id]));
  s.chronicle = (Array.isArray(s.chronicle) ? s.chronicle : []).filter(e => isPlain(e) && typeof e.text === 'string').map(e => ({ w: Math.max(1, Math.floor(num(e.w, 1))), t: Math.max(0, num(e.t)), icon: String(e.icon || '📜').slice(0, 4), text: e.text.slice(0, 200) })).slice(-120);
  s.equipped = [...new Set((Array.isArray(s.equipped) ? s.equipped : []).filter(id => s.artifacts.includes(id)))].slice(0, EQUIP_SLOTS);
  s.weekly = { claimed: Math.floor(num(isPlain(s.weekly) ? s.weekly.claimed : -1, -1)) };
  s.glory = { lv: Math.max(0, Math.min(GLORY_LEVELS.length, Math.floor(num(isPlain(s.glory) ? Number(s.glory.lv) : 0)))) };
  s.foes = Object.fromEntries(Object.entries(isPlain(s.foes) ? s.foes : {}).filter(([k, v]) => isPlain(v)).slice(0, 300).map(([k, v]) => [k, { beaten: Math.max(0, Math.min(99, Math.floor(num(Number(v.beaten))))) }]));
  s.squad = Array.isArray(s.squad) ? [...new Set(s.squad)].filter(u => s.disciples.some(d => d.uid === u)).slice(0, 3) : [];
  s.explore = Object.fromEntries(Object.keys(EXPLORATION).map(id => [id, Math.max(0, Math.min(999, Math.floor(num(isPlain(s.explore) ? Number(s.explore[id]) : 0))))]));
  s.exMile = Object.fromEntries(Object.keys(EXPLORATION).map(id => {
    const m = isPlain(s.exMile) && isPlain(s.exMile[id]) ? s.exMile[id] : {};
    return [id, { ...(m[1] ? { 1: 'x' } : {}), ...(m[2] === 'a' || m[2] === 'b' ? { 2: m[2] } : {}), ...(m[3] ? { 3: 'x' } : {}) }];
  }));
  const ins = isPlain(s.insight) ? s.insight : {};
  s.insight = Object.fromEntries(INSIGHTS.map(i => [i.spec, Math.max(0, Math.min(INSIGHT_MAX, Math.floor(num(Number(ins[i.spec])))))]));
  const av = isPlain(s.achv) ? s.achv : {};
  s.achv = { done: [...new Set((Array.isArray(av.done) ? av.done : []).filter(id => ACHIEVEMENTS_BY_ID[id]))], title: ACHIEVEMENTS_BY_ID[av.title] ? av.title : null };
  const cm = isPlain(s.commissions) ? s.commissions : {};
  s.commissions = { list: (Array.isArray(cm.list) ? cm.list : []).filter(c => isPlain(c) && COMMISSION_BY_KIND[c.kind] && isPlain(c.reward))
    .map(c => ({ kind: c.kind, target: Math.max(1, Math.floor(num(c.target, 1))), base: Math.max(0, num(c.base)), reward: c.reward })).slice(0, 3),
    nextAt: num(cm.nextAt), done: Math.max(0, Math.floor(num(cm.done))) };
  const asc = isPlain(s.ascend) ? s.ascend : {};
  s.ascend = { done: dedupe((Array.isArray(asc.done) ? asc.done : []).filter(id => TRIALS_BY_ID[id])) };
  s.ascend.ready = dedupe((Array.isArray(asc.ready) ? asc.ready : []).filter(id => TRIALS_BY_ID[id] && !s.ascend.done.includes(id)));
  if (!isPlain(s.run)) s.run = { bursts: 0, maxChain: 0, nemeses: 0, goals: 0, startT: 0, base: {} };
  s.run.startT = Math.max(0, num(Number(s.run.startT))); if (!isPlain(s.run.base)) s.run.base = {};
  s.goalsDone = dedupe((Array.isArray(s.goalsDone) ? s.goalsDone : []).filter(id => GOALS_BY_ID[id]));
  s.grudges = (Array.isArray(s.grudges) ? s.grudges : []).map(sanitizeGrudge).filter(Boolean);
  for (const id of Object.keys(s.buildings)) {
    if (!BUILDINGS_BY_ID[id]) { delete s.buildings[id]; continue; }
    s.buildings[id].lv = Math.max(0, Math.min(10, Math.floor(num(s.buildings[id].lv))));
  }
  for (const id of Object.keys(s.nemeses)) if (!NEMESES_BY_ID[id]) delete s.nemeses[id];
  for (const id of Object.keys(s.reincarnation.shop)) {
    const it = DAO_SHOP_BY_ID[id];
    if (!it) delete s.reincarnation.shop[id]; else s.reincarnation.shop[id] = Math.max(0, Math.min(it.maxLv, Math.floor(num(s.reincarnation.shop[id]))));
  }
  // 事件／訪客：id 已不存在就清掉，否則事件會永遠卡住
  if (!isPlain(s.incident)) s.incident = { current: null, nextAt: s.t };
  if (s.incident.current && !INCIDENTS_BY_ID[s.incident.current.id]) s.incident.current = null;
  if (!isPlain(s.visitor)) s.visitor = { current: null, nextAt: s.t };
  if (s.visitor.current) s.visitor.current = sanitizeGrudge(s.visitor.current);
  if (!isPlain(s.unlocked)) s.unlocked = {};
  if (!isPlain(s.factions)) s.factions = {};
  for (const id of Object.keys(s.factions)) { if (!FACTIONS_BY_ID[id]) delete s.factions[id]; else s.factions[id] = Math.max(0, num(Number(s.factions[id]))); }
  s.returners = (Array.isArray(s.returners) ? s.returners : []).filter(r => isPlain(r) && (r.mode === 'plead' || r.mode === 'revenge')).map(r => ({
    ...sanitizeGrudge({ ...r, id: 0 }), mode: r.mode, dueAt: num(Number(r.dueAt), 0) })).map(({ id, alert, nemesisId, ...r }) => r);
  if (s.visitor.current && s.visitor.current.returning !== 'plead' && s.visitor.current.returning !== 'revenge') delete s.visitor.current.returning;
  if (!MUTATORS_BY_ID[s.mutator]) s.mutator = null;
  const owned = new Set(s.disciples.map(d => d.uid));
  s.expeditions = (Array.isArray(s.expeditions) ? s.expeditions : []).filter(x => isPlain(x) && EXPEDITIONS_BY_ID[x.id] && Array.isArray(x.uids)).map(x => ({
    ...x, uids: x.uids.filter(u => owned.has(u)), endAt: num(Number(x.endAt)), startAt: num(Number(x.startAt)), chance: Math.max(0.05, Math.min(0.95, num(Number(x.chance), 0.5))),
    status: x.status === 'done' ? 'done' : 'running', result: isPlain(x.result) ? x.result : { qi: 0, stone: 0, token: 0, shard: 0 } })).filter(x => x.uids.length);
  if (!isPlain(s.specs)) s.specs = {};
  for (const id of Object.keys(s.specs)) if (!(SPECS[id] || []).some(o => o.id === s.specs[id])) delete s.specs[id];
  if (!isPlain(s.stories)) s.stories = {};
  for (const id of Object.keys(s.stories)) { const max = STORIES3[id] ? 3 : STORIES2[id] ? 2 : STORIES[id] ? 1 : 0; if (!max) delete s.stories[id]; else s.stories[id] = Math.max(0, Math.min(max, Math.floor(num(Number(s.stories[id]))))); }
  s.disguise.value = Math.max(0, Math.min(20, num(s.disguise.value)));
  s.tokBuy = { n: Math.max(0, Math.floor(num(isPlain(s.tokBuy) ? Number(s.tokBuy.n) : 0))), resetAt: Math.max(0, num(isPlain(s.tokBuy) ? Number(s.tokBuy.resetAt) : 0)) };
  for (const k of ['merit', ...MAT_KEYS]) if (s.res[k] === undefined) s.res[k] = 0;        // 舊存檔沒有功勳與秘境材料
  for (const k of Object.keys(s.res)) s.res[k] = Math.max(0, num(s.res[k]));
  return s;
}

export const serialize = s => JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state: s });

// 解析存檔文字；壞檔丟出 Error
export function parse(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('存檔格式錯誤（不是有效的 JSON）'); }
  if (!isPlain(data) || !isPlain(data.state) || !isPlain(data.state.res) || !isPlain(data.state.buildings))
    throw new Error('存檔內容不完整');
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION) throw new Error('存檔版本不相容');
  data = migrate(data);
  const state = sanitize(merge(createState(), data.state));
  state.burstActive = false;               // 演出中途關閉頁面：不要卡在演出狀態
  return { state, savedAt: Number(data.savedAt) || Date.now() };
}

export function save(s, storage = globalThis.localStorage) {
  try { storage.setItem(CONFIG.save.key, serialize(s)); return true; } catch { return false; }
}
// 沒有存檔回傳 null；壞檔回傳 {error}
export function load(storage = globalThis.localStorage) {
  let text;
  try { text = storage.getItem(CONFIG.save.key); } catch { return null; }
  if (!text) return null;
  try { return parse(text); } catch (e) { return { error: e.message }; }
}
export function clearSave(storage = globalThis.localStorage) {
  try { storage.removeItem(CONFIG.save.key); } catch { /* ignore */ }
}
