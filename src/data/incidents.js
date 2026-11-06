// 隨機事件：每 4～8 分鐘彈出一則，限時作答，逾時視為「無視」（timeoutChoice）。
// effects 宣告式資料（由 core/incidents.js 統一結算）：
//   qiSec / stoneSec  獲得「N 秒產出」       loseQiSec / loseStoneSec  損失「N 秒產出」
//   token / shard     固定數量                pauseBuilding  隨機一棟建築暫停 N 毫秒
//   disguise          偽裝值加減              artifact / recruit  獲得功法法寶／降服弟子的機率
//   gamble {p, win, lose}                     以機率 p 套用 win，否則 lose（各為 effects）
//   armorByArray      損失依護山大陣等級減免
// def.minRealm 為境界序號下限（13＝化神）；def.minReb（選填）為至少轉生幾次。
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
  { id: 'gamble', emoji: '🎲', title: '山下賭坊', weight: 6, good: false, minRealm: 1, timeoutChoice: 1,
    text: '山腳新開了間賭坊，夥計熱情地招呼你進去「玩兩把」。',
    choices: [
      { label: '小賭一把', cost: { stoneSec: 30 }, desc: '花約 30 秒靈石產出；五成贏回三倍', effects: { gamble: { p: 0.5, win: { stoneSec: 90 }, lose: {} } } },
      { label: '不賭', desc: '君子不入賭坊', effects: {} },
    ] },
  { id: 'spring', emoji: '💧', title: '後山靈泉', weight: 8, good: true, minRealm: 0, timeoutChoice: 0,
    text: '後山冒出一眼靈泉，水汽氤氳，靈氣撲面。',
    choices: [
      { label: '取水', desc: '穩穩得到一些靈氣', effects: { qiSec: 100 } },
      { label: '下去泡澡', desc: '四成得招賢令；失敗則著涼，損失少量靈氣', effects: { gamble: { p: 0.4, win: { token: 2 }, lose: { loseQiSec: 20 } } } },
    ] },
  { id: 'old', emoji: '🧑‍🤝‍🧑', title: '同門舊識', weight: 6, good: false, minRealm: 2, timeoutChoice: 0,
    text: '一位當年的雜役同伴在山門外探頭探腦，欲言又止。',
    choices: [
      { label: '裝作不認識', desc: '偽裝值 +1', effects: { disguise: 1 } },
      { label: '請他進來敘舊', desc: '破費一點靈石，對方感念，留下招賢令一枚', effects: { loseStoneSec: 10, token: 1 } },
    ] },
  { id: 'beast', emoji: '🐺', title: '妖獸闖山', weight: 6, good: false, minRealm: 3, timeoutChoice: 1,
    text: '一頭妖獸闖進山門，在後院低吼。',
    choices: [
      { label: '迎戰', desc: '六成擊退並得靈氣與碎片；失敗則建築暫停 4 分鐘', effects: { gamble: { p: 0.6, win: { qiSec: 150, shard: 1 }, lose: { pauseBuilding: min(4) } } } },
      { label: '躲起來', desc: '損失一點靈氣', effects: { loseQiSec: 40 } },
    ] },
  { id: 'recipe', emoji: '📃', title: '遺落的丹方', weight: 6, good: true, minRealm: 2, timeoutChoice: 1,
    text: '你在舊丹房的牆縫裡摸出一頁泛黃的丹方。',
    choices: [
      { label: '潛心研究', cost: { qiSec: 60 }, desc: '花約 60 秒靈氣；五成煉成，得碎片與靈石', effects: { gamble: { p: 0.5, win: { shard: 3, stoneSec: 60 }, lose: {} } } },
      { label: '轉手賣掉', desc: '換一點靈石', effects: { stoneSec: 40 } },
    ] },
  { id: 'story', emoji: '👴', title: '老祖講古', weight: 6, good: true, minRealm: 0, timeoutChoice: 0,
    text: '老祖心情不錯，開始講三千年前的「光榮事蹟」。',
    choices: [
      { label: '認真聽', desc: '聽出點門道，得到靈氣', effects: { qiSec: 50 } },
      { label: '打瞌睡', desc: '老祖氣得塞給你一枚招賢令堵嘴', effects: { token: 1 } },
    ] },

  { id: 'pilgrim', emoji: '🙏', title: '遠道香客', weight: 7, good: true, minRealm: 1, timeoutChoice: 0,
    text: '一位風塵僕僕的香客在破廟前跪了一炷香的時間，說是聽聞這裡「靈驗」。',
    choices: [
      { label: '收下香火錢', desc: '得到一小筆靈石', effects: { stoneSec: 45 } },
      { label: '請他留下聽經', desc: '三成機會領悟碎片，其餘為一小筆靈氣', effects: { gamble: { p: 0.3, win: { shard: 2 }, lose: { qiSec: 40 } } } },
    ] },
  { id: 'thief', emoji: '🥷', title: '蒙面飛賊', weight: 7, good: false, minRealm: 2, timeoutChoice: 1,
    text: '夜裡有人翻過院牆，朝你的靈石袋摸去。',
    choices: [
      { label: '設伏擒拿', cost: { qiSec: 40 }, desc: '花約 40 秒靈氣；擒住飛賊，繳獲贓物', effects: { stoneSec: 90 } },
      { label: '裝作沒看見', desc: '損失一些靈石，你忍住了：偽裝值 +1', effects: { loseStoneSec: 40, disguise: 1 } },
    ] },
  { id: 'rain', emoji: '🌧️', title: '及時雨', weight: 6, good: true, minRealm: 0, timeoutChoice: 0,
    text: '久旱之後下了一場雨，靈田裡的苗眼看著往上竄。',
    choices: [
      { label: '趁勢施肥', cost: { stoneSec: 30 }, desc: '花約 30 秒靈石；換得大量靈氣', effects: { qiSec: 200 } },
      { label: '順其自然', desc: '得到一小筆靈氣', effects: { qiSec: 60 } },
    ] },
  { id: 'debtor', emoji: '📒', title: '討債的來了', weight: 6, good: false, minRealm: 3, timeoutChoice: 1,
    text: '一個自稱「商盟」的掌櫃攤開帳本：你前任留下的破廟，還欠三十年的香油錢。',
    choices: [
      { label: '還一部分', cost: { stoneSec: 70 }, desc: '花約 70 秒靈石；掌櫃滿意，送你一枚招賢令', effects: { token: 1 } },
      { label: '賴帳', desc: '一半機會平安無事；失敗則一棟建築暫停 4 分鐘', effects: { gamble: { p: 0.5, win: {}, lose: { pauseBuilding: min(4) } } } },
    ] },
  { id: 'mirage', emoji: '🏝️', title: '海市蜃樓', weight: 5, good: true, minRealm: 5, timeoutChoice: 2,
    text: '山間升起一片幻境，隱約是一座從未見過的宮殿。',
    choices: [
      { label: '闖進去', desc: '四成機會得到法寶；失敗則損失靈氣', effects: { gamble: { p: 0.4, win: { artifact: 1 }, lose: { loseQiSec: 80 } } } },
      { label: '只在外圍採集', desc: '得到少量碎片', effects: { shard: 1 } },
      { label: '不理', desc: '幻境散去', effects: {} },
    ] },
  { id: 'junior', emoji: '🧒', title: '外門弟子請教', weight: 6, good: true, minRealm: 2, timeoutChoice: 1,
    text: '一個外門小弟子紅著臉站在門口，說想請教「怎麼才能不被欺負」。',
    choices: [
      { label: '傾囊相授', cost: { qiSec: 60 }, desc: '花約 60 秒靈氣；他心服口服，留下一枚招賢令', effects: { token: 1 } },
      { label: '教他忍字訣', desc: '偽裝值 +2', effects: { disguise: 2 } },
    ] },
  // ── 化神之後／轉生之後的事件（minRealm 13 = 化神；minReb = 至少轉生幾次）──
  { id: 'cloud', emoji: '🌩️', title: '遠方劫雲', weight: 6, good: true, minRealm: 13, timeoutChoice: 0,
    text: '天邊聚起一朵不屬於你的劫雲，雷光在雲裡翻滾。老祖瞇著眼：「別人的劫，也是你的功課。」',
    choices: [
      { label: '觀雲悟道', desc: '穩穩得到一大筆靈氣', effects: { qiSec: 300 } },
      { label: '借雷淬體', desc: '五成機會大賺靈石；失敗則一棟建築暫停 4 分鐘', effects: { gamble: { p: 0.5, win: { stoneSec: 400 }, lose: { pauseBuilding: min(4) } } } },
    ] },
  { id: 'echo', emoji: '📣', title: '祖庭回聲', weight: 6, good: true, minRealm: 13, timeoutChoice: 0,
    text: '山門的石階忽然傳來整齊的腳步聲，抬頭卻空無一人。老祖輕聲說：「那是三千年前的同門，回來看看這座廟。」',
    choices: [
      { label: '擺上香案', cost: { qiSec: 120 }, desc: '花約 120 秒靈氣；得到招賢令與碎片', effects: { token: 2, shard: 3 } },
      { label: '靜靜站著', desc: '得到靈氣，偽裝值 +1', effects: { qiSec: 150, disguise: 1 } },
    ] },
  { id: 'qyhead', emoji: '🙇', title: '青雲掌門求見', weight: 5, good: true, minRealm: 13, timeoutChoice: 1,
    text: '青雲宗現任掌門帶著一車賠禮站在山門外，深深一揖，卻不敢跨進門檻：「晚輩……是來認錯的。」',
    choices: [
      { label: '請進奉茶', desc: '對方感激涕零：得到招賢令與法寶的機會', effects: { token: 2, artifact: 0.25 } },
      { label: '收下賠禮，不見', desc: '得到一筆靈石，偽裝值 +2', effects: { stoneSec: 240, disguise: 2 } },
    ] },
  { id: 'seal', emoji: '🔒', title: '封印震動', weight: 6, good: false, minRealm: 13, timeoutChoice: 1,
    text: '破廟地底傳來沉悶的敲擊聲，像有誰在下面叩門。老祖臉色一沉：「三千年前封的東西，醒了半隻眼。」',
    choices: [
      { label: '啟動護山大陣', requires: { building: 'array' }, desc: '需要護山大陣；封印安穩，得到少量碎片', effects: { shard: 2 } },
      { label: '親自鎮壓', cost: { qiSec: 200 }, desc: '花約 200 秒靈氣；封印穩住，得到招賢令', effects: { token: 1 } },
      { label: '裝作沒聽見', desc: '損失較多靈氣、一棟建築暫停 5 分鐘，護山大陣可減免', effects: { loseQiSec: 150, armorByArray: true, pauseBuilding: min(5) } },
    ] },
  { id: 'letter', emoji: '✉️', title: '飛升者留書', weight: 5, good: true, minRealm: 13, timeoutChoice: 0,
    text: '一封被雷火燎過邊的信從天而降，署名是某位早已飛升的前輩：「後來者，這條路不難，只是長。」',
    choices: [
      { label: '細讀', desc: '得到靈氣與碎片', effects: { qiSec: 200, shard: 2 } },
      { label: '燒了祭天', desc: '三成五機會得到法寶；否則得到一點靈氣', effects: { gamble: { p: 0.35, win: { artifact: 1 }, lose: { qiSec: 60 } } } },
    ] },
  { id: 'pastself', emoji: '🪞', title: '前世的倒影', weight: 6, good: true, minRealm: 0, minReb: 1, timeoutChoice: 1,
    text: '你在水缸裡看見一張熟悉的臉——是上一世的你，還在為同一件事皺眉。老祖：「別嚇他，他還不知道結局。」',
    choices: [
      { label: '對他點點頭', desc: '偽裝值 +2，得到少量靈氣', effects: { disguise: 2, qiSec: 60 } },
      { label: '把這一世的經驗傳給他', cost: { qiSec: 80 }, desc: '花約 80 秒靈氣；得到招賢令', effects: { token: 2 } },
    ] },
  { id: 'well', emoji: '⚱️', title: '輪迴井', weight: 5, good: true, minRealm: 0, minReb: 2, timeoutChoice: 1,
    text: '後院的枯井裡傳出隱約的鐘聲，井水映著不同時代的月亮。老祖：「喝一口，能想起一件前世的事。」',
    choices: [
      { label: '喝一口', desc: '四成機會想起丹方（大量碎片）；否則只是一口涼水', effects: { gamble: { p: 0.4, win: { shard: 6 }, lose: { qiSec: 40 } } } },
      { label: '往井裡投一枚靈石', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石；井水回敬招賢令', effects: { token: 2 } },
    ] },
  { id: 'oldfriend', emoji: '🧑‍🤝‍🧑', title: '某一世的舊友', weight: 5, good: true, minRealm: 0, minReb: 3, timeoutChoice: 1,
    text: '山下來了個陌生人，笑著喊你的名字，說是「上一世欠你一頓飯」。你沒有這段記憶，老祖卻點了點頭。',
    choices: [
      { label: '請他吃飯', cost: { stoneSec: 90 }, desc: '花約 90 秒靈石；他留下招賢令與碎片', effects: { token: 2, shard: 3 } },
      { label: '收下欠的飯錢', desc: '得到一筆靈石', effects: { stoneSec: 150 } },
    ] },
];
export const INCIDENTS_BY_ID = Object.fromEntries(INCIDENTS.map(i => [i.id, i]));
