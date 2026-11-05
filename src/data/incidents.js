// 隨機事件：每 4～8 分鐘彈出一則，限時作答，逾時視為「無視」（timeoutChoice）。
// effects 宣告式資料（由 core/incidents.js 統一結算）：
//   qiSec / stoneSec  獲得「N 秒產出」       loseQiSec / loseStoneSec  損失「N 秒產出」
//   token / shard     固定數量                pauseBuilding  隨機一棟建築暫停 N 毫秒
//   disguise          偽裝值加減              artifact / recruit  獲得功法法寶／降服弟子的機率
//   gamble {p, win, lose}                     以機率 p 套用 win，否則 lose（各為 effects）
//   armorByArray      損失依護山大陣等級減免
// choice.cost {stoneSec|qiSec}：先付費才能選；choice.requires {building}：需該建築 ≥1 級。
export const INCIDENT_INTERVAL = { firstSec: 300, minSec: 420, maxSec: 840, expireSec: 150 };
const min = n => n * 60 * 1000;

export const INCIDENTS = [
  { id: 'fortune', emoji: '✨', title: '天降機緣', weight: 10, good: true, minRealm: 0, timeoutChoice: 0,
    text: '破廟上空忽然靈光一閃，一縷精純靈氣飄落院中。',
    choices: [
      { label: '收下', desc: '穩穩收下一小筆靈氣', effects: { qiSec: 60 } },
      { label: '冒險參悟', desc: '五成機會大賺；失敗則一棟建築暫停 3 分鐘', effects: { gamble: { p: 0.5, win: { qiSec: 180 }, lose: { pauseBuilding: min(3) } } } },
    ] },
  { id: 'caravan', emoji: '🐪', title: '商隊求援', weight: 10, good: true, minRealm: 0, timeoutChoice: 1,
    text: '一支商隊的駱駝摔斷了腿，領隊哀求你施以援手。',
    choices: [
      { label: '慷慨解囊', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石產出；得招賢令，小機率獲得法寶', effects: { token: 1, artifact: 0.08 } },
      { label: '婉拒', desc: '關你什麼事', effects: {} },
    ] },
  { id: 'deviation', emoji: '🌀', title: '走火入魔', weight: 8, good: false, minRealm: 2, timeoutChoice: 1,
    text: '你打坐時氣息忽然紊亂，丹田一陣翻騰。',
    choices: [
      { label: '花靈石化解', cost: { stoneSec: 90 }, desc: '花約 90 秒靈石產出，平安無事', effects: {} },
      { label: '硬扛', desc: '五成因禍得福（大量靈氣）；失敗則建築暫停 6 分鐘', effects: { gamble: { p: 0.5, win: { qiSec: 100 }, lose: { pauseBuilding: min(6) } } } },
    ] },
  { id: 'rats', emoji: '🐀', title: '山鼠偷糧', weight: 8, good: false, minRealm: 0, timeoutChoice: 1,
    text: '一群山鼠鑽進糧倉，正啃著你的靈米。',
    choices: [
      { label: '驅趕', desc: '損失少量靈氣', effects: { loseQiSec: 20 } },
      { label: '放任不管', desc: '損失較多靈氣，但你忍住了：偽裝值 +1', effects: { loseQiSec: 50, disguise: 1 } },
    ] },
  { id: 'stele', emoji: '🪧', title: '殘破石碑', weight: 8, good: true, minRealm: 0, timeoutChoice: 0,
    text: '後山有塊長滿青苔的石碑，隱約刻著古老的口訣。',
    choices: [
      { label: '拓印', desc: '得到一筆靈氣', effects: { qiSec: 80 } },
      { label: '靜心參悟', desc: '三成五機會領悟碎片', effects: { gamble: { p: 0.35, win: { shard: 2 }, lose: {} } } },
    ] },
  { id: 'lost', emoji: '🧑‍🎓', title: '迷路弟子', weight: 6, good: true, minRealm: 0, timeoutChoice: 1,
    text: '一位背著行囊的少年在山門外徘徊，說是走錯了路。',
    choices: [
      { label: '收留', desc: '五成機會拜入門下（成為待招募弟子）', effects: { recruit: 0.5 } },
      { label: '給乾糧打發', desc: '損失少量靈氣，對方感激，留下招賢令一枚', effects: { loseQiSec: 10, token: 1 } },
    ] },
  { id: 'storm', emoji: '⛈️', title: '雷雨將至', weight: 6, good: false, minRealm: 0, timeoutChoice: 1,
    text: '烏雲壓頂，山雨欲來，破廟的屋頂又開始漏了。',
    choices: [
      { label: '啟動護山大陣', requires: { building: 'array' }, desc: '需要護山大陣；毫髮無傷', effects: {} },
      { label: '硬挨', desc: '損失靈氣，護山大陣等級越高損失越少', effects: { loseQiSec: 80, armorByArray: true } },
    ] },
  { id: 'elder', emoji: '🧓', title: '神祕老者', weight: 6, good: true, minRealm: 3, timeoutChoice: 2,
    text: '一位白鬍子老者在山門擺攤，自稱能換「天機」。',
    choices: [
      { label: '以靈石換丹藥', cost: { stoneSec: 80 }, desc: '花約 80 秒靈石產出，換得少量碎片', effects: { shard: 3 } },
      { label: '以靈氣換一卦', cost: { qiSec: 100 }, desc: '花約 100 秒靈氣；五成換得招賢令', effects: { gamble: { p: 0.5, win: { token: 2 }, lose: {} } } },
      { label: '不理', desc: '老者搖頭嘆氣離去', effects: {} },
    ] },
  { id: 'envoy', emoji: '🧑‍🎓', title: '青雲宗使者路過', weight: 6, good: false, minRealm: 1, timeoutChoice: 0,
    text: '青雲宗的使者經過山門，輕蔑地瞥了破廟一眼。',
    choices: [
      { label: '低頭裝沒看見', desc: '偽裝值 +2，但損失一點靈石', effects: { disguise: 2, loseStoneSec: 15 } },
      { label: '瞪回去', desc: '偽裝值 -1，心情大好得一點靈氣', effects: { disguise: -1, qiSec: 40 } },
    ] },
  { id: 'meteor', emoji: '☄️', title: '天降流星', weight: 3, good: true, minRealm: 4, timeoutChoice: 1,
    text: '一顆流星拖著長尾墜向後山，隱隱有寶光。',
    choices: [
      { label: '趕去接住', desc: '四成得到法寶；失敗則建築暫停 5 分鐘', effects: { gamble: { p: 0.4, win: { artifact: 1 }, lose: { pauseBuilding: min(5) } } } },
      { label: '遠遠觀賞', desc: '沾一點靈氣', effects: { qiSec: 100 } },
    ] },
  { id: 'grumpy', emoji: '👴', title: '老祖鬧脾氣', weight: 5, good: false, minRealm: 0, timeoutChoice: 1,
    text: '老祖抱怨你好久沒擦他的牌位，賭氣不肯說話。',
    choices: [
      { label: '擦牌位哄他', desc: '損失少量靈氣，老祖開心地塞給你一枚招賢令', effects: { loseQiSec: 30, token: 1 } },
      { label: '裝沒聽見', desc: '什麼也沒發生，只是耳根清靜了', effects: {} },
    ] },
  { id: 'fox', emoji: '🦊', title: '野狐拜廟', weight: 5, good: true, minRealm: 0, timeoutChoice: 1,
    text: '一隻白狐蹲在廟前，對著神龕拜了三拜。',
    choices: [
      { label: '供奉靈石', cost: { stoneSec: 40 }, desc: '花約 40 秒靈石產出；六成得招賢令，小機率有弟子投奔', effects: { gamble: { p: 0.6, win: { token: 1, recruit: 0.15 }, lose: {} } } },
      { label: '趕走', desc: '白狐一溜煙跑了', effects: {} },
    ] },
];
export const INCIDENTS_BY_ID = Object.fromEntries(INCIDENTS.map(i => [i.id, i]));
