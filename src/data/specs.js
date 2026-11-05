// 建築專精：建築升到 SPEC_LEVEL 級後，二選一（本輪有效，轉生後重選）。
// effects 的 key 與道心商店相同（core/dao.js perm 會一併計入）。
export const SPEC_LEVEL = 5;
export const SPECS = {
  temple:  [{ id: 'zen', name: '靜修殿', effects: { clickMult: 0.8, cdCut: 2 }, flavor: '以靜制動，打坐更勝一籌。' },
            { id: 'incense', name: '香火殿', effects: { qiMult: 0.2 }, flavor: '香火鼎盛，靈氣綿綿不絕。' }],
  field:   [{ id: 'rice', name: '靈米田', effects: { qiMult: 0.15 }, flavor: '一畝靈米，三月飽腹。' },
            { id: 'herb', name: '藥草園', effects: { stoneMult: 0.12 }, flavor: '藥草轉丹，丹化靈石。' }],
  alchemy: [{ id: 'mass', name: '量產丹房', effects: { stoneMult: 0.25 }, flavor: '日夜不熄的爐火。' },
            { id: 'fine', name: '極品丹房', effects: { burstReward: 0.12, discipleDiscount: 0.08 }, flavor: '一爐只煉一顆，但顆顆是精品。' }],
  library: [{ id: 'scripture', name: '經卷閣', effects: { discipleDiscount: 0.15 }, flavor: '博覽群書，降低修習成本。' },
            { id: 'secret', name: '秘法閣', effects: { powerMult: 0.10 }, flavor: '藏著不外傳的戰技。' }],
  arena:   [{ id: 'duel', name: '比武擂台', effects: { powerMult: 0.15 }, flavor: '以戰養戰，一擊必殺。' },
            { id: 'war', name: '練兵場', effects: { powerMult: 0.08, burstReward: 0.08 }, flavor: '列陣如林，戰利更豐。' }],
  array:   [{ id: 'dome', name: '周天護罩', effects: { rare: 0.08 }, flavor: '陣中有陣，機緣自來。' },
            { id: 'seal', name: '藏鋒封印', effects: { disguiseRate: 0.25 }, flavor: '氣息盡斂，偽裝更久。' }],
  tower:   [{ id: 'fierce', name: '凶煞鎮壓', effects: { burstReward: 0.10 }, flavor: '以煞氣懾人，戰利加倍。' },
            { id: 'solid', name: '金剛不壞', effects: { powerMult: 0.12 }, flavor: '塔身堅固，戰力更盛。' }],
  hall:    [{ id: 'pass', name: '傳承秘典', effects: { discipleDiscount: 0.10 }, flavor: '薪火相傳，升級更省。' },
            { id: 'teach', name: '因材施教', effects: { discipleCap: 3 }, flavor: '突破天資的桎梏。' }],
  beast:   [{ id: 'tame', name: '馴養有道', effects: { tokenRate: 0.3 }, flavor: '靈獸帶來四方賢才。' },
            { id: 'wild', name: '野性不馴', effects: { rare: 0.10, burstReward: 0.06 }, flavor: '野性，帶來意外之財。' }],
};
export const EFFECT_LABEL = {
  qiMult: ['靈氣產出', '%'], stoneMult: ['靈石產出', '%'], clickMult: ['打坐收益', '%'], cdCut: ['打坐冷卻縮短', '秒'],
  powerMult: ['戰力', '%'], burstReward: ['爆擊獎勵', '%'], discipleDiscount: ['弟子升級成本', '-%'], disguiseRate: ['偽裝增速', '%'],
  tokenRate: ['招賢令增速', '%'], rare: ['稀有事件機率', '%'], discipleCap: ['弟子等級上限', '級'],
};
export const specText = effects => Object.entries(effects).map(([k, v]) => {
  const [label, u] = EFFECT_LABEL[k];
  return u === '%' ? `${label} +${Math.round(v * 100)}%` : u === '-%' ? `${label} -${Math.round(v * 100)}%` : u === '秒' ? `${label} ${v} 秒` : `${label} +${v}`;
}).join('、');
