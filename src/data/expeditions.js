// 秘境：派 1～3 位弟子組隊限時探索（遊戲時間，離線也會完成）。
// difficulty 對照隊伍戰力；專長／五行相合的弟子貢獻更高。成功率 = 比值/(比值+1)，夾在 5%～95%。
// 獎勵：qiSec/stoneSec 為「N 秒產出」，其餘為固定量或機率。
export const EXP_RULES = { maxTeam: 3, specialtyMult: 1.3, elementMult: 1.15, failShare: 0.2, slots: [[0, 1], [5, 2], [9, 3], [12, 4]] };   // slots: [境界序號, 同時進行數]
export const EXPEDITIONS = [
  { id: 'cave',  name: '後山洞府',   emoji: '🕳️', unlockRealm: 2,  minutes: 10, difficulty: 8,    want: { element: '土' },
    desc: '後山塌了半邊的洞府，據說藏著前人遺留的靈氣。', reward: { qiSec: 300, stoneSec: 60 } },
  { id: 'spring', name: '靈泉秘洞',   emoji: '💧', unlockRealm: 4,  minutes: 15, difficulty: 20,   want: { element: '水' },
    desc: '山腹深處有一汪終年不涸的靈泉，水汽裡都帶著靈氣。', reward: { qiSec: 450, stoneSec: 100 } },
  { id: 'field', name: '古戰場遺跡', emoji: '⚔️', unlockRealm: 5,  minutes: 20, difficulty: 15,   want: { specialty: '劍修' },
    req: { minTeam: 2 },
    desc: '殘劍與骸骨遍地，戾氣沖天，適合劍修歷練。', reward: { qiSec: 600, stoneSec: 150, artifact: 0.10 } },
  { id: 'swamp', name: '迷霧沼澤',   emoji: '🌫️', unlockRealm: 7,  minutes: 25, difficulty: 35,   want: { specialty: '農修' }, req: { minTeam: 2, anyElement: ['木', '土'] },
    desc: '終年不散的濃霧裡藏著稀有靈草，也藏著把人繞暈的瘴氣。', reward: { stoneSec: 250, artifact: 0.12 } },
  { id: 'valley', name: '藥王谷',    emoji: '🌿', unlockRealm: 8,  minutes: 30, difficulty: 65,  want: { specialty: '丹修' },
    req: { anyElement: ['木', '水'] },
    desc: '古藥王隱居的山谷，遍地靈藥，也遍地毒瘴。', reward: { stoneSec: 400 } },
  { id: 'maze',  name: '天機迷陣',   emoji: '🌀', unlockRealm: 9, minutes: 45, difficulty: 150,  want: { specialty: '陣修' },
    req: { minTeam: 2, noDupElement: true },
    desc: '天機閣廢棄的陣法試煉場，走對一步，機緣便多一分。', reward: { artifact: 0.20, recruit: 0.15 } },
  { id: 'sky',   name: '九霄雲台',   emoji: '☁️', unlockRealm: 10, minutes: 50, difficulty: 200, want: { specialty: '劍修' }, req: { minTeam: 3, noDupElement: true },
    desc: '雲海之上的古老論劍台，五行齊備的隊伍才踏得上去。', reward: { qiSec: 1200, stoneSec: 900, artifact: 0.30, recruit: 0.10 } },
  { id: 'abyss', name: '龍脈深淵',   emoji: '🐉', unlockRealm: 11, minutes: 60, difficulty: 260, want: { specialty: '體修' },
    req: { minTeam: 3, specialty: '體修' },
    desc: '傳說盤著一條沉睡的龍脈，肉身不夠強的進去就別想出來。', reward: { stoneSec: 1500, artifact: 0.35 } },
  // ── 元嬰・化神之後的高階秘境：難度高、獎勵大；材料沿用雲台星砂／龍脈精華（`mat` 欄位），所以仍是每輪突破的供應來源 ──
  { id: 'ruins', name: '祖庭遺墟',   emoji: '🏛️', unlockRealm: 12, minutes: 35, difficulty: 340, want: { specialty: '陣修' }, mat: 'sky',
    req: { minTeam: 2, specialty: '陣修' },
    desc: '三千年前祖庭崩塌的遺址，殘存的護山大陣仍在自行運轉，只有懂陣的人走得進去。', reward: { qiSec: 2400, stoneSec: 2000, artifact: 0.40, recruit: 0.12 } },
  { id: 'seal',  name: '地底封印',   emoji: '🔒', unlockRealm: 13, minutes: 45, difficulty: 480, want: { element: '火' }, mat: 'abyss',
    req: { minTeam: 3, anyElement: ['金', '木'] },
    desc: '破廟地底那道敲門聲的源頭。下去的人要同時壓得住封印、也撐得住封印裡的東西。', reward: { qiSec: 3200, stoneSec: 3000, artifact: 0.45, recruit: 0.15 } },
  { id: 'rift',  name: '虛空裂隙',   emoji: '🌌', unlockRealm: 13, minutes: 60, difficulty: 650, want: { specialty: '丹修' }, mat: 'abyss',
    req: { minTeam: 3, noDupElement: true, specialty: '丹修' },
    desc: '天幕上被劫雷撕開的口子，裡頭什麼都有，也什麼都沒有。要五行調和的隊伍，加上一位能護住神魂的丹修。', reward: { qiSec: 5000, stoneSec: 5000, artifact: 0.50, recruit: 0.20 } },
];
// 隊伍限制（選填 req）：minTeam 至少幾人／anyElement 至少一位屬於這些五行／specialty 至少一位該專長／noDupElement 五行不可重複
export const reqLines = e => {
  const r = e.req || {}, out = [];
  if (r.minTeam) out.push(`至少 ${r.minTeam} 人同行`);
  if (r.anyElement) out.push(`需有${r.anyElement.join('或')}系弟子`);
  if (r.specialty) out.push(`需有${r.specialty}弟子`);
  if (r.noDupElement) out.push('隊員五行不可重複');
  return out;
};
// 這個秘境產出的材料 id（預設與秘境同名；高階秘境用 `mat` 沿用既有材料）
export const matIdOf = e => e.mat || e.id;
export const EXPEDITIONS_BY_ID = Object.fromEntries(EXPEDITIONS.map(e => [e.id, e]));
