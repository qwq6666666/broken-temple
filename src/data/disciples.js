// 弟子資料（41 位）。要擴充內容，直接在陣列加物件即可。
// specialty 專長：丹修→煉丹房 / 陣修→護山大陣 / 劍修→演武場 / 農修→靈田 / 體修→破廟
export const DISCIPLES = [
  // ── N ──
  { id: 'afu',     name: '阿福',   emoji: '🧑‍🌾', rarity: 'N', element: '土', specialty: '農修', personality: '憨厚', quote: '宗主，我會種地！', trait: { key: 'endureLoss', value: 0.15 } },
  { id: 'liuzi',   name: '小六子', emoji: '🧒',   rarity: 'N', element: '土', specialty: '體修', personality: '跳脫', quote: '我能一口氣挑十桶水！', trait: { key: 'showOffReward', value: 0.2 } },
  { id: 'liu2',    name: '柳二娘', emoji: '👩‍🌾', rarity: 'N', element: '木', specialty: '農修', personality: '潑辣', quote: '誰偷我的靈菜，站出來！', trait: { key: 'power', value: 0.03 } },
  { id: 'chenlan', name: '陳老蔫', emoji: '🧓',   rarity: 'N', element: '火', specialty: '丹修', personality: '懶散', quote: '火候……嗯，大概就這樣吧。', trait: { key: 'pauseCut', value: 0.2 } },
  { id: 'tieniu',  name: '王鐵牛', emoji: '💪',   rarity: 'N', element: '金', specialty: '體修', personality: '憨厚', quote: '力氣大，吃得多。', trait: { key: 'endureLoss', value: 0.15 } },
  { id: 'zhaoling',name: '趙小鈴', emoji: '👧',   rarity: 'N', element: '水', specialty: '陣修', personality: '膽小', quote: '陣、陣紋畫歪了嗎？', trait: { key: 'pauseCut', value: 0.2 } },
  { id: 'xiaocui', name: '小翠',   emoji: '👩',   rarity: 'N', element: '木', specialty: '農修', personality: '活潑', quote: '宗主宗主，靈菜長芽啦！', trait: { key: 'showOffReward', value: 0.2 } },
  { id: 'laozhou', name: '老周頭', emoji: '👴',   rarity: 'N', element: '土', specialty: '體修', personality: '沉默', quote: '……（默默把水缸挑滿）', trait: { key: 'endureLoss', value: 0.15 } },
  // ── R ──
  { id: 'qinghe',  name: '林青禾', emoji: '🌾',   rarity: 'R', element: '木', specialty: '農修', personality: '溫吞', quote: '禾苗不急，人也不用急。', trait: { key: 'pauseCut', value: 0.3 } },
  { id: 'shenyao', name: '沈藥兒', emoji: '🧪',   rarity: 'R', element: '火', specialty: '丹修', personality: '毒舌', quote: '這丹藥吃不死人，頂多拉肚子。', trait: { key: 'showOffReward', value: 0.35 } },
  { id: 'qinwu',   name: '秦無鋒', emoji: '🗡️',   rarity: 'R', element: '金', specialty: '劍修', personality: '悶騷', quote: '我的劍……沒有名字，因為還沒想好。', trait: { key: 'power', value: 0.06 } },
  { id: 'moqi',    name: '墨小棋', emoji: '🎴',   rarity: 'R', element: '水', specialty: '陣修', personality: '腹黑', quote: '陣眼在哪？當然是在你腳下。', trait: { key: 'disguiseRate', value: 0.12 } },
  { id: 'shigan',  name: '石敢當', emoji: '🪨',   rarity: 'R', element: '土', specialty: '體修', personality: '耿直', quote: '誰敢動宗主，先過我這關。', trait: { key: 'endureLoss', value: 0.25 } },
  { id: 'suyun',   name: '蘇雲裳', emoji: '🍵',   rarity: 'R', element: '水', specialty: '丹修', personality: '溫柔', quote: '藥要慢慢煎，人要慢慢等。', trait: { key: 'stoneMult', value: 0.06 } },
  { id: 'leidong', name: '雷動',   emoji: '⚡',   rarity: 'R', element: '火', specialty: '劍修', personality: '急躁', quote: '出劍！先出劍再說！', trait: { key: 'power', value: 0.06 } },
  { id: 'sinan',   name: '司南',   emoji: '🧲',   rarity: 'R', element: '金', specialty: '陣修', personality: '嚴謹', quote: '陣紋差一分，則全陣皆廢。', trait: { key: 'rare', value: 0.05 } },
  // ── SR ──
  { id: 'yunqing', name: '雲清漪', emoji: '🌸',   rarity: 'SR', element: '木', specialty: '丹修', personality: '清冷', quote: '丹成九轉，何須多言。', trait: { key: 'stoneMult', value: 0.1 } },
  { id: 'lingshuang', name: '凌霜', emoji: '❄️',  rarity: 'SR', element: '水', specialty: '劍修', personality: '傲嬌', quote: '才、才不是為了幫你呢！', trait: { key: 'power', value: 0.1 } },
  { id: 'guxuan',  name: '顧玄機', emoji: '🧭',   rarity: 'SR', element: '土', specialty: '陣修', personality: '神棍', quote: '貧道掐指一算，宗主近日有血光……不對，是財光。', trait: { key: 'rare', value: 0.1 } },
  { id: 'huolie',  name: '霍烈',   emoji: '🔥',   rarity: 'SR', element: '火', specialty: '體修', personality: '熱血', quote: '宗主一聲令下，赴湯蹈火！', trait: { key: 'burstReward', value: 0.1 } },
  { id: 'baixt',   name: '白小棠', emoji: '🌼',   rarity: 'SR', element: '木', specialty: '農修', personality: '嬌憨', quote: '這片田我包了！', trait: { key: 'qiMult', value: 0.08 } },
  { id: 'yanhui',  name: '燕回',   emoji: '🪶',   rarity: 'SR', element: '金', specialty: '劍修', personality: '灑脫', quote: '來去如風，不留痕跡。', trait: { key: 'pauseCut', value: 0.4 } },
  { id: 'fangcun', name: '方寸',   emoji: '🦊',   rarity: 'SR', element: '水', specialty: '陣修', personality: '狡黠', quote: '陣眼嘛……我偷偷挪了個位置。', trait: { key: 'disguiseRate', value: 0.18 } },
  // ── SSR ──
  { id: 'baihe',   name: '白鶴仙子', emoji: '🕊️', rarity: 'SSR', element: '金', specialty: '劍修', personality: '出塵', quote: '劍出無悔。', trait: { key: 'power', value: 0.15 } },
  { id: 'ludan',   name: '陸丹成', emoji: '⚗️',   rarity: 'SSR', element: '火', specialty: '丹修', personality: '瘋癲', quote: '又炸爐了？再來！這次一定成！', trait: { key: 'stoneMult', value: 0.18 } },
  { id: 'jiuli',   name: '九黎',   emoji: '🐻',   rarity: 'SSR', element: '土', specialty: '體修', personality: '蠻橫', quote: '誰不服，單挑。', trait: { key: 'burstReward', value: 0.15 } },
  { id: 'moqianqiu', name: '墨千秋', emoji: '📜', rarity: 'SSR', element: '土', specialty: '陣修', personality: '深沉', quote: '千秋一局，不過是一盤棋。', trait: { key: 'rare', value: 0.2 } },
  // ── UR ──
  { id: 'luoshen', name: '洛神鳶', emoji: '🌙',   rarity: 'UR', element: '水', specialty: '陣修', personality: '神祕', quote: '星河為陣，萬象皆棋。', trait: { key: 'disguiseRate', value: 0.3 } },
  { id: 'xuantian',name: '玄天劍尊', emoji: '⚡',  rarity: 'UR', element: '金', specialty: '劍修', personality: '孤傲', quote: '千年了，終於有個像樣的宗門。', trait: { key: 'power', value: 0.3 } },
  { id: 'taixu',   name: '太虛真人', emoji: '☯️', rarity: 'UR', element: '火', specialty: '丹修', personality: '超然', quote: '丹成之日，天地同壽。', trait: { key: 'qiMult', value: 0.35 } },
  { id: 'shuisheng', name: '水生',   emoji: '🐟', rarity: 'N',   element: '水', specialty: '農修', personality: '老實', quote: '水田裡的活，我最拿手。', trait: { key: 'showOffReward', value: 0.2 } },
  { id: 'zhuyin',    name: '竹音',   emoji: '🎋', rarity: 'R',   element: '木', specialty: '劍修', personality: '飄逸', quote: '劍在竹林裡，風過便有聲。', trait: { key: 'power', value: 0.06 } },
  { id: 'jinsha',    name: '金砂',   emoji: '🪙', rarity: 'SR',  element: '金', specialty: '丹修', personality: '市儈', quote: '丹藥不是不能賒，利息另算。', trait: { key: 'stoneMult', value: 0.1 } },
  { id: 'chiyuan',   name: '赤鳶',   emoji: '🦅', rarity: 'SR',  element: '火', specialty: '陣修', personality: '張揚', quote: '我的陣，連天上的雲都得繞道。', trait: { key: 'rare', value: 0.1 } },
  { id: 'bingxin',   name: '冰心',   emoji: '🧊', rarity: 'SSR', element: '水', specialty: '體修', personality: '堅韌', quote: '冷嗎？習慣就好。', trait: { key: 'endureLoss', value: 0.4 } },
  // ── 第二批高稀有度（補齊木系農修、金系體修、火系劍修，以及 UR 的木／土／水）──
  { id: 'mulinyin',  name: '沐林音', emoji: '🌿', rarity: 'SSR', element: '木', specialty: '農修', personality: '悠然', quote: '一粒種子，也是一座山。', trait: { key: 'qiMult', value: 0.16 } },
  { id: 'tiebuyu',   name: '鐵不語', emoji: '🛡️', rarity: 'SSR', element: '金', specialty: '體修', personality: '寡言', quote: '……（點頭）', trait: { key: 'pauseCut', value: 0.5 } },
  { id: 'moxiaotian',name: '莫笑天', emoji: '😎', rarity: 'SSR', element: '火', specialty: '劍修', personality: '狂放', quote: '打臉？我最擅長了！', trait: { key: 'showOffReward', value: 0.5 } },
  { id: 'cangwu',    name: '蒼梧',   emoji: '🌳', rarity: 'UR',  element: '木', specialty: '農修', personality: '渾厚', quote: '我栽的樹，比你們的宗門都老。', trait: { key: 'stoneMult', value: 0.3 } },
  { id: 'zhenyue',   name: '鎮嶽',   emoji: '⛰️', rarity: 'UR',  element: '土', specialty: '體修', personality: '沉穩', quote: '山不動，是因為我站在後面。', trait: { key: 'burstReward', value: 0.3 } },
  { id: 'guixu',     name: '歸墟',   emoji: '🌊', rarity: 'UR',  element: '水', specialty: '丹修', personality: '寂然', quote: '一滴水，也有潮汐。', trait: { key: 'rare', value: 0.4 } },
];

export const DISCIPLES_BY_ID = Object.fromEntries(DISCIPLES.map(d => [d.id, d]));
