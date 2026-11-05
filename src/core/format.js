// 大數字格式化：K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n, digits = 2) {
  if (Number.isNaN(n)) return '—';                 // 異常值不要假裝成無限大
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, digits);
  if (n < 1000) {
    if (Number.isInteger(n)) return String(n);
    return n < 100 ? n.toFixed(n < 10 ? digits : 1) : String(Math.floor(n));
  }
  if (n >= 1e36) return n.toExponential(2).replace('e+', 'e');    // 超過字尾表：改用科學記號，如 1.23e67
  let tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
  let v = n / 1000 ** tier;
  if (Number(v.toFixed(digits)) >= 1000 && tier < SUFFIX.length - 1) { tier++; v = n / 1000 ** tier; }
  return v.toFixed(digits).replace(/\.?0+$/, '') + SUFFIX[tier];
}

// 速率顯示，例如 12.5/s
export const fmtRate = n => fmt(n, 2) + '/s';

// 毫秒 → m:ss
export function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
