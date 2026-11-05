// 五行：相生（木→火→土→金→水→木）、相剋（木剋土、土剋水、水剋火、火剋金、金剋木）。
export const ELEMENTS = ['金', '木', '水', '火', '土'];
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // key 生 value
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };      // key 剋 value
// a 對 b 的關係：'same' 相同／'sheng' a 生 b／'ke' a 剋 b／'' 無關
export const relation = (a, b) => (a === b ? 'same' : SHENG[a] === b ? 'sheng' : KE[a] === b ? 'ke' : '');
// 舊存檔的仇人沒有五行：用名字算一個穩定的（同一個人永遠同一五行）
export const elementFromName = name => ELEMENTS[[...String(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 5];
