// 專長心得：5 種專長各 3 層，用碎片領悟（全宗門共用、轉生保留）。
// 只有「至少一位該專長的弟子派駐中」才生效，所以要把專長弟子放上場，而不只是收集。
// via：'perm' 併入永久加成（靈氣／靈石／戰力倍率），'trait' 併入特性加總（忍氣吞聲損失、建築暫停縮短）。
export const INSIGHT_COST = [4, 10, 20];            // 各層碎片成本
export const INSIGHTS = [
  { spec: '劍修', icon: '⚔️', key: 'powerMult', via: 'perm', per: 0.05, label: '戰力', names: ['劍意初成', '劍氣縱橫', '人劍合一'] },
  { spec: '體修', icon: '💪', key: 'endureLoss', via: 'trait', per: 0.06, label: '忍氣吞聲損失減免', names: ['金鐘罩', '鐵布衫', '不動明王'] },
  { spec: '丹修', icon: '⚗️', key: 'stoneMult', via: 'perm', per: 0.05, label: '靈石產出', names: ['控火有方', '丹成九轉', '點石成金'] },
  { spec: '陣修', icon: '🔰', key: 'pauseCut', via: 'trait', per: 0.08, label: '建築暫停縮短', names: ['陣紋入門', '連環陣', '天地同護'] },
  { spec: '農修', icon: '🌾', key: 'qiMult', via: 'perm', per: 0.05, label: '靈氣產出', names: ['順應節氣', '靈雨潤田', '萬物生長'] },
];
export const INSIGHTS_BY_SPEC = Object.fromEntries(INSIGHTS.map(i => [i.spec, i]));
export const INSIGHT_MAX = INSIGHT_COST.length;
