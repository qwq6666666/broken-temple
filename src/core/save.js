// 存檔：localStorage 存 {version, savedAt, state}。state 為純 JSON，直接序列化。
// 讀檔時以「預設狀態 + 存檔」遞迴合併，之後新增欄位／建築不會讓舊檔壞掉。
import { CONFIG } from '../config.js';
import { createState } from './state.js';

export const SAVE_VERSION = 2;

const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, saved) {
  if (!isPlain(base) || !isPlain(saved)) return saved === undefined ? base : saved;
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

export const serialize = s => JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state: s });

// 解析存檔文字；壞檔丟出 Error
export function parse(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('存檔格式錯誤（不是有效的 JSON）'); }
  if (!isPlain(data) || !isPlain(data.state) || !isPlain(data.state.res) || !isPlain(data.state.buildings))
    throw new Error('存檔內容不完整');
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION) throw new Error('存檔版本不相容');
  data = migrate(data);
  const state = merge(createState(), data.state);
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
