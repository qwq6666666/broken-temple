// 介面偏好（音效、動態效果）：存在獨立 localStorage key，不進遊戲存檔。
const KEY = 'broken-temple-prefs';
const reduced = () => { try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const prefs = { muted: false, volume: 0.6, reduceMotion: reduced() };

try { Object.assign(prefs, JSON.parse(globalThis.localStorage?.getItem(KEY) || '{}')); } catch { /* 沒有就用預設 */ }

export const getPrefs = () => prefs;
export function setPref(k, v) {
  prefs[k] = v;
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}
