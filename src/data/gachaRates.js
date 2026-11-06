// 稀有度設定：抽卡權重、屬性、重複碎片、升級基礎成本。
// weight 為相對權重（N55 R30 SR10 SSR4 UR1 ≈ 百分比）。
export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

export const RARITIES = {
  N:   { label: 'N',   weight: 55, stat: 1,  shard: 1,  lvBase: 20,  color: '#9aa39b' },
  R:   { label: 'R',   weight: 30, stat: 2,  shard: 3,  lvBase: 40,  color: '#6fb7e0' },
  SR:  { label: 'SR',  weight: 10, stat: 4,  shard: 10, lvBase: 100, color: '#b58ae0' },
  SSR: { label: 'SSR', weight: 3,  stat: 8,  shard: 30, lvBase: 250, color: '#e5b84a' },
  UR:  { label: 'UR',  weight: 0.5, stat: 16, shard: 80, lvBase: 600, color: '#e5604a' },
};

// 降服他宗弟子時的稀有度權重（不會是 N，也極少 UR）
export const SURRENDER_WEIGHTS = { R: 62, SR: 28, SSR: 9, UR: 1 };
