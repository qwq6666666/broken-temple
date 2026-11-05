// 宗門年表：只記重大事件（跨轉生保留，最多 120 筆，舊的先丟）。時間用遊戲時鐘，不依賴現實時間。
const MAX = 120;
export function note(s, icon, text) {
  if (!Array.isArray(s.chronicle)) s.chronicle = [];
  s.chronicle.push({ w: s.reincarnation.count + 1, t: Math.floor(s.t), icon, text });
  if (s.chronicle.length > MAX) s.chronicle.splice(0, s.chronicle.length - MAX);
}
export const stamp = e => `第${e.w}世 ${Math.floor(e.t / 3600000)}時${Math.floor(e.t / 60000) % 60}分`;
