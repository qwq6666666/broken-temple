// 弟子資料（20 位）。要擴充內容，直接在陣列加物件即可。
// specialty 專長：丹修→煉丹房 / 陣修→護山大陣 / 劍修→演武場 / 農修→靈田 / 體修→破廟
export const DISCIPLES = [
  // ── N ──
  { id: 'afu',     name: '阿福',   emoji: '🧑‍🌾', rarity: 'N', element: '土', specialty: '農修', personality: '憨厚', quote: '宗主，我會種地！', trait: { key: 'endureLoss', value: 0.15 } },
  { id: 'liuzi',   name: '小六子', emoji: '🧒',   rarity: 'N', element: '土', specialty: '體修', personality: '跳脫', quote: '我能一口氣挑十桶水！', trait: { key: 'showOffReward', value: 0.2 } },
  { id: 'liu2',    name: '柳二娘', emoji: '👩‍🌾', rarity: 'N', element: '木', specialty: '農修', personality: '潑辣', quote: '誰偷我的靈菜，站出來！', trait: { key: 'power', value: 0.03 } },
  { id: 'chenlan', name: '陳老蔫', emoji: '🧓',   rarity: 'N', element: '火', specialty: '丹修', personality: '懶散', quote: '火候……嗯，大概就這樣吧。', trait: { key: 'pauseCut', value: 0.2 } },
  { id: 'tieniu',  name: '王鐵牛', emoji: '💪',   rarity: 'N', element: '金', specialty: '體修', personality: '憨厚', quote: '力氣大，吃得多。', trait: { key: 'endureLoss', value: 0.15 } },
  { id: 'zhaoling',name: '趙小鈴', emoji: '👧',   rarity: 'N', element: '水', specialty: '陣修', personality: '膽小', quote: '陣、陣紋畫歪了嗎？', trait: { key: 'pauseCut', value: 0.2 } },
  // ── R ──
  { id: 'qinghe',  name: '林青禾', emoji: '🌾',   rarity: 'R', element: '木', specialty: '農修', personality: '溫吞', quote: '禾苗不急，人也不用急。', trait: { key: 'pauseCut', value: 0.3 } },
  { id: 'shenyao', name: '沈藥兒', emoji: '🧪',   rarity: 'R', element: '火', specialty: '丹修', personality: '毒舌', quote: '這丹藥吃不死人，頂多拉肚子。', trait: { key: 'showOffReward', value: 0.35 } },
  { id: 'qinwu',   name: '秦無鋒', emoji: '🗡️',   rarity: 'R', element: '金', specialty: '劍修', personality: '悶騷', quote: '我的劍……沒有名字，因為還沒想好。', trait: { key: 'power', value: 0.06 } },
  { id: 'moqi',    name: '墨小棋', emoji: '🎴',   rarity: 'R', element: '水', specialty: '陣修', personality: '腹黑', quote: '陣眼在哪？當然是在你腳下。', trait: { key: 'disguiseRate', value: 0.12 } },
  { id: 'shigan',  name: '石敢當', emoji: '🪨',   rarity: 'R', element: '土', specialty: '體修', personality: '耿直', quote: '誰敢動宗主，先過我這關。', trait: { key: 'endureLoss', value: 0.25 } },
  // ── SR ──
  { id: 'yunqing', name: '雲清漪', emoji: '🌸',   rarity: 'SR', element: '木', specialty: '丹修', personality: '清冷', quote: '丹成九轉，何須多言。', trait: { key: 'stoneMult', value: 0.1 } },
  { id: 'lingshuang', name: '凌霜', emoji: '❄️',  rarity: 'SR', element: '水', specialty: '劍修', personality: '傲嬌', quote: '才、才不是為了幫你呢！', trait: { key: 'power', value: 0.1 } },
  { id: 'guxuan',  name: '顧玄機', emoji: '🧭',   rarity: 'SR', element: '土', specialty: '陣修', personality: '神棍', quote: '貧道掐指一算，宗主近日有血光……不對，是財光。', trait: { key: 'rare', value: 0.1 } },
  { id: 'huolie',  name: '霍烈',   emoji: '🔥',   rarity: 'SR', element: '火', specialty: '體修', personality: '熱血', quote: '宗主一聲令下，赴湯蹈火！', trait: { key: 'burstReward', value: 0.1 } },
  // ── SSR ──
  { id: 'baihe',   name: '白鶴仙子', emoji: '🕊️', rarity: 'SSR', element: '金', specialty: '劍修', personality: '出塵', quote: '劍出無悔。', trait: { key: 'power', value: 0.15 } },
  { id: 'ludan',   name: '陸丹成', emoji: '⚗️',   rarity: 'SSR', element: '火', specialty: '丹修', personality: '瘋癲', quote: '又炸爐了？再來！這次一定成！', trait: { key: 'stoneMult', value: 0.18 } },
  { id: 'jiuli',   name: '九黎',   emoji: '🐻',   rarity: 'SSR', element: '土', specialty: '體修', personality: '蠻橫', quote: '誰不服，單挑。', trait: { key: 'burstReward', value: 0.15 } },
  // ── UR ──
  { id: 'luoshen', name: '洛神鳶', emoji: '🌙',   rarity: 'UR', element: '水', specialty: '陣修', personality: '神祕', quote: '星河為陣，萬象皆棋。', trait: { key: 'disguiseRate', value: 0.3 } },
  { id: 'xuantian',name: '玄天劍尊', emoji: '⚡',  rarity: 'UR', element: '金', specialty: '劍修', personality: '孤傲', quote: '千年了，終於有個像樣的宗門。', trait: { key: 'power', value: 0.3 } },
];

export const DISCIPLES_BY_ID = Object.fromEntries(DISCIPLES.map(d => [d.id, d]));
