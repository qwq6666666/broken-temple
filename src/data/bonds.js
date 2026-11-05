// 緣分：兩位弟子「派駐在同一棟建築」時，額外獲得加成（key 同弟子特性，見 data/traits.js）。
export const BONDS = [
  { id: 'sword', name: '劍道同修', a: 'qinwu', b: 'lingshuang', effect: { power: 0.04 }, line: '兩把劍一起練，劍意相輔。' },
  { id: 'pill', name: '丹方互補', a: 'shenyao', b: 'suyun', effect: { stoneMult: 0.05 }, line: '一個嘴毒心軟，一個心細手巧。' },
  { id: 'farm', name: '田間搭檔', a: 'afu', b: 'xiaocui', effect: { qiMult: 0.04 }, line: '一個力氣大，一個會跟菜說話。' },
  { id: 'body', name: '老少體修', a: 'tieniu', b: 'laozhou', effect: { endureLoss: 0.10 }, line: '兩個悶葫蘆，扛事一個比一個穩。' },
  { id: 'fox', name: '狐鼠同謀', a: 'moqi', b: 'fangcun', effect: { disguiseRate: 0.08 }, line: '凡是裝無辜的事，他們最在行。' },
  { id: 'master', name: '丹道師徒', a: 'yunqing', b: 'taixu', effect: { stoneMult: 0.08 }, line: '真人看了她的丹，點頭三次。' },
  { id: 'legacy', name: '劍尊遺風', a: 'baihe', b: 'xuantian', effect: { power: 0.08 }, line: '三千年前與三千年後的劍，同出一脈。' },
  { id: 'stars', name: '星象推演', a: 'luoshen', b: 'guxuan', effect: { rare: 0.06 }, line: '一個真看得見，一個真說得準（偶爾）。' },
  { id: 'brave', name: '蠻勇共鳴', a: 'huolie', b: 'jiuli', effect: { burstReward: 0.06 }, line: '兩團火，燒起來誰也擋不住。' },
  { id: 'array', name: '陣法同窗', a: 'zhaoling', b: 'sinan', effect: { pauseCut: 0.15 }, line: '一個怕出錯，一個不准出錯，剛好互補。' },
  { id: 'youth', name: '毛頭小子', a: 'liuzi', b: 'leidong', effect: { showOffReward: 0.15 }, line: '兩人湊一起，打臉的事絕不缺席。' },
  { id: 'mad', name: '煉丹瘋老', a: 'ludan', b: 'chenlan', effect: { stoneMult: 0.06 }, line: '一個炸爐，一個偷學，丹房從此熱鬧。' },
  { id: 'iceflame', name: '冰火相濟', a: 'bingxin', b: 'chiyuan', effect: { power: 0.06 }, line: '一個壓火，一個點冰，剛好互相制衡。' },
  { id: 'bamboo', name: '竹林論劍', a: 'zhuyin', b: 'yanhui', effect: { pauseCut: 0.12 }, line: '兩個閒雲野鶴，論起劍來誰也不讓誰。' },
];
