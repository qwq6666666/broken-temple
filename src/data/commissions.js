// 宗門委託：短期小目標。進度 = 目前累計值 − 接取時的累計值，所以轉生後也不會歸零或作弊。
// target(t) 隨境界階數 t 成長；ok(s) 決定這個題型目前是否適用（沒解鎖的系統不會出題）。
const cap = (v, hi) => Math.min(hi, Math.floor(v));
export const COMMISSIONS = [
  { kind: 'meditate',   icon: '🧘', text: n => `引氣打坐 ${n} 次`,       cur: s => s.stats.meditations,     target: t => cap(15 + t * 4, 70), ok: () => true },
  { kind: 'endure',     icon: '😶', text: n => `忍氣吞聲 ${n} 次`,       cur: s => s.stats.endures || 0,    target: t => cap(2 + t / 4, 5),   ok: () => true },
  { kind: 'upgrade',    icon: '🏯', text: n => `升級建築 ${n} 次`,       cur: s => s.stats.upgrades || 0,   target: t => cap(3 + t / 3, 8),   ok: () => true },
  { kind: 'pull',       icon: '🎫', text: n => `招賢抽卡 ${n} 次`,       cur: s => s.gacha.total,      target: t => cap(2 + t / 3, 6),   ok: s => !!s.unlocked.gacha },
  { kind: 'burst',      icon: '💥', text: n => `引爆 ${n} 次`,           cur: s => s.stats.bursts,          target: t => cap(1 + t / 8, 2),   ok: s => s.stats.bursts > 0 || !!s.unlocked.avenge },
  { kind: 'expedition', icon: '🧭', text: n => `秘境探索成功 ${n} 次`,   cur: s => s.stats.expeditions || 0, target: () => 1,                  ok: s => !!s.unlocked.expedition && s.disciples.length > 0 },
  { kind: 'incident',   icon: '📜', text: n => `處理突發事件 ${n} 則`,   cur: s => s.stats.incidents || 0,  target: t => cap(1 + t / 6, 3),   ok: s => s.realmIdx >= 1 },
];
export const COMMISSION_BY_KIND = Object.fromEntries(COMMISSIONS.map(c => [c.kind, c]));

export const COMMISSION_RULES = {
  slots: 3,
  refillMs: 300000,        // 領取或放棄後，空位經過這麼久才補新委託（遊戲時鐘）
  milestoneEvery: 5,       // 每完成 N 張委託，額外獎勵一次
  milestoneReward: { token: 3 },
  stoneSec: 75, qiSec: 75,   // 資源類獎勵 = 目前每秒產出 × 秒數（有下限）
  weights: { token: 2, stone: 3, qi: 2, shard: 1 },   // 各類獎勵的抽選權重
  stoneMin: 4, qiMin: 20,     // 早期產出很低時的獎勵下限
  shardFromRealm: 4,       // 境界達此階後獎勵池才會出現碎片
};
