// 秘境：派 1～3 位弟子組隊限時探索（遊戲時間，離線也會完成）。
// difficulty 對照隊伍戰力；專長／五行相合的弟子貢獻更高。成功率 = 比值/(比值+1)，夾在 5%～95%。
// 獎勵：qiSec/stoneSec 為「N 秒產出」，其餘為固定量或機率。
export const EXP_RULES = { maxTeam: 3, specialtyMult: 1.3, elementMult: 1.15, failShare: 0.2, slots: [[0, 1], [9, 2], [12, 3]] };   // slots: [境界序號, 同時進行數]
export const EXPEDITIONS = [
  { id: 'cave',  name: '後山洞府',   emoji: '🕳️', unlockRealm: 2,  minutes: 10, difficulty: 8,    want: { element: '土' },
    desc: '後山塌了半邊的洞府，據說藏著前人遺留的靈氣。', reward: { qiSec: 300, stoneSec: 60, token: 1 } },
  { id: 'field', name: '古戰場遺跡', emoji: '⚔️', unlockRealm: 5,  minutes: 20, difficulty: 40,   want: { specialty: '劍修' },
    desc: '殘劍與骸骨遍地，戾氣沖天，適合劍修歷練。', reward: { qiSec: 600, stoneSec: 150, shard: 3, artifact: 0.10 } },
  { id: 'valley', name: '藥王谷',    emoji: '🌿', unlockRealm: 8,  minutes: 30, difficulty: 150,  want: { specialty: '丹修' },
    desc: '古藥王隱居的山谷，遍地靈藥，也遍地毒瘴。', reward: { stoneSec: 400, shard: 5, token: 2 } },
  { id: 'maze',  name: '天機迷陣',   emoji: '🌀', unlockRealm: 10, minutes: 45, difficulty: 600,  want: { specialty: '陣修' },
    desc: '天機閣廢棄的陣法試煉場，走對一步，機緣便多一分。', reward: { token: 4, shard: 8, artifact: 0.20, recruit: 0.15 } },
  { id: 'abyss', name: '龍脈深淵',   emoji: '🐉', unlockRealm: 12, minutes: 60, difficulty: 2500, want: { specialty: '體修' },
    desc: '傳說盤著一條沉睡的龍脈，肉身不夠強的進去就別想出來。', reward: { stoneSec: 1500, token: 5, shard: 12, artifact: 0.35 } },
];
export const EXPEDITIONS_BY_ID = Object.fromEntries(EXPEDITIONS.map(e => [e.id, e]));
