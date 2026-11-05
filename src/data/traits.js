// 弟子特性：派駐在任一建築時生效（駐守位有限 → 有取捨）。每升 1 星效果 +25%。
// key 對應的效果在 core 各處以 traitSum(s, key) 讀取：
//  endureLoss 忍氣吞聲/逞強損失減免 | showOffReward 亮一手即時獎勵 | disguiseRate 偽裝增速 | power 戰力
//  rare 稀有事件機率 | pauseCut 建築暫停縮短 | qiMult 靈氣產出 | stoneMult 靈石產出 | burstReward 爆擊獎勵
export const TRAITS = {
  endureLoss:    { label: '忍氣吞聲損失', sign: '-' },
  showOffReward: { label: '亮一手即時獎勵', sign: '+' },
  disguiseRate:  { label: '偽裝增速', sign: '+' },
  power:         { label: '戰力', sign: '+' },
  rare:          { label: '稀有事件機率', sign: '+' },
  pauseCut:      { label: '建築暫停時間', sign: '-' },
  qiMult:        { label: '靈氣產出', sign: '+' },
  stoneMult:     { label: '靈石產出', sign: '+' },
  burstReward:   { label: '爆擊獎勵', sign: '+' },
};
export const traitText = (key, value) => `${TRAITS[key].label} ${TRAITS[key].sign}${Math.round(value * 100)}%`;
