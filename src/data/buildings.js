// 建築資料：成本、產出、專長/五行對應、外觀里程碑（stages）。
// baseCost 的 key 對應資源：qi 靈氣 / stone 靈石。
// produce：每級每秒產出；effect 文字僅用於介面說明。
export const BUILDINGS = [
  {
    id: 'temple', name: '破廟', specialty: '體修', element: '土',
    baseCost: { qi: 30 }, produce: { qi: 1 },
    desc: '一切的起點。每級 +1 靈氣/秒，並強化「打坐」。',
    stages: [
      { lv: 0, emoji: '🏚️', label: '漏雨的破廟' },
      { lv: 1, emoji: '🛖', label: '補過屋頂的小廟' },
      { lv: 4, emoji: '⛩️', label: '掛了牌匾的山門' },
      { lv: 7, emoji: '🏯', label: '像樣的道觀' },
      { lv: 10, emoji: '🏛️', label: '氣派正殿' },
    ],
  },
  {
    id: 'field', name: '靈田', specialty: '農修', element: '木',
    baseCost: { qi: 150 }, produce: { qi: 3 },
    desc: '穩定的靈氣來源。每級 +3 靈氣/秒。',
    stages: [
      { lv: 0, emoji: '🪨', label: '荒地' },
      { lv: 1, emoji: '🌱', label: '剛播的靈苗' },
      { lv: 4, emoji: '🌾', label: '成片靈稻' },
      { lv: 7, emoji: '🎋', label: '靈竹仙圃' },
      { lv: 10, emoji: '🌳', label: '靈樹成林' },
    ],
  },
  {
    id: 'alchemy', name: '煉丹房', specialty: '丹修', element: '火',
    baseCost: { qi: 600 }, produce: { stone: 0.08 },
    desc: '產出靈石。每級 +0.08 靈石/秒。',
    stages: [
      { lv: 0, emoji: '🧱', label: '塌掉的灶台' },
      { lv: 1, emoji: '🍵', label: '簡陋丹爐' },
      { lv: 4, emoji: '⚗️', label: '像樣的丹房' },
      { lv: 7, emoji: '🔥', label: '三昧真火爐' },
      { lv: 10, emoji: '🏮', label: '九轉丹閣' },
    ],
  },
  {
    id: 'library', name: '藏經閣', specialty: '—', element: '水',
    baseCost: { qi: 1500, stone: 5 }, produce: {},
    desc: '弟子成長加速：每級弟子升級成本 -4%。',
    stages: [
      { lv: 0, emoji: '🪵', label: '一堆朽木' },
      { lv: 1, emoji: '📚', label: '破書架' },
      { lv: 4, emoji: '📜', label: '藏書小樓' },
      { lv: 7, emoji: '🏮', label: '燈火通明的書閣' },
      { lv: 10, emoji: '🏯', label: '萬卷經樓' },
    ],
  },
  {
    id: 'arena', name: '演武場', specialty: '劍修', element: '金',
    baseCost: { qi: 3000, stone: 8 }, produce: {},
    desc: '弟子等級上限 +2/級，並提高戰力（影響碾壓判定）。',
    stages: [
      { lv: 0, emoji: '🟫', label: '空地' },
      { lv: 1, emoji: '🪵', label: '木樁場' },
      { lv: 4, emoji: '🗡️', label: '兵器架' },
      { lv: 7, emoji: '⚔️', label: '擂台' },
      { lv: 10, emoji: '🏟️', label: '大演武場' },
    ],
  },
  {
    id: 'array', name: '護山大陣', specialty: '陣修', element: '水',
    baseCost: { qi: 6000, stone: 15 }, produce: {},
    desc: '提高稀有事件機率（長老、商隊來訪，額外掉落）。',
    stages: [
      { lv: 0, emoji: '▫️', label: '一圈石子' },
      { lv: 1, emoji: '🔯', label: '殘缺陣紋' },
      { lv: 4, emoji: '🧿', label: '陣眼初成' },
      { lv: 7, emoji: '🌐', label: '護罩流轉' },
      { lv: 10, emoji: '🌌', label: '周天星斗大陣' },
    ],
  },
];

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
