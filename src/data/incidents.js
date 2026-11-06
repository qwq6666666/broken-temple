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
  // ── 中期（築基前後）的日常小事：輕鬆毒舌，風險低 ──
  { id: 'bill', emoji: '🧾', title: '老祖的帳單', weight: 6, good: false, minRealm: 6, timeoutChoice: 1,
    text: '老祖遞來一張寫滿字的帳單，標題是「本座三百年辛苦費」。你仔細看了一眼，最後一行寫著：「利息另計。」',
    choices: [
      { label: '乖乖付錢', cost: { stoneSec: 50 }, desc: '花約 50 秒靈石產出；老祖難得笑了，賞你一枚招賢令', effects: { token: 1 } },
      { label: '跟老祖討價還價', desc: '五成機會砍價成功得靈氣；失敗則被唸一頓，損失少量靈氣', effects: { gamble: { p: 0.5, win: { qiSec: 80 }, lose: { loseQiSec: 30 } } } },
    ] },
  { id: 'roof', emoji: '🏚️', title: '屋頂又漏了', weight: 7, good: false, minRealm: 6, timeoutChoice: 1,
    text: '半夜下起大雨，破廟的屋頂以一種近乎執著的方式漏進你的被窩。老祖：「本座早就說過。」其實他沒說過。',
    choices: [
      { label: '爬上去補', cost: { qiSec: 40 }, desc: '花約 40 秒靈氣；順手在瓦縫裡摸到一點碎片', effects: { shard: 1 } },
      { label: '換個角落睡', desc: '損失少量靈氣，護山大陣越高損失越少', effects: { loseQiSec: 40, armorByArray: true } },
    ] },
  { id: 'cat', emoji: '🐈', title: '野貓認主', weight: 6, good: true, minRealm: 7, timeoutChoice: 0,
    text: '一隻瘦巴巴的野貓蹲在供桌上，盯著你的香爐。老祖：「別理牠。……牠看起來很餓。……別理牠。」',
    choices: [
      { label: '收養', desc: '野貓留在廟裡抓老鼠，順便叼來幾片碎片', effects: { shard: 2 } },
      { label: '餵一條小魚乾', cost: { stoneSec: 20 }, desc: '花約 20 秒靈石；貓留下一枚招賢令，小機率叼來法寶', effects: { token: 1, artifact: 0.1 } },
    ] },
  { id: 'mousegov', emoji: '🐁', title: '靈鼠求收編', weight: 5, good: true, minRealm: 7, timeoutChoice: 1,
    text: '一隻戴著小帽子的靈鼠在你面前行了個禮：「宗主，我們鼠族想加入貴宗，包吃住就行。」老祖：「這算不算招安？」',
    choices: [
      { label: '收編', desc: '三成機會有鼠族勇士拜入門下（成為待招募弟子）', effects: { recruit: 0.3 } },
      { label: '給牠們一點糧食', cost: { qiSec: 30 }, desc: '花約 30 秒靈氣；牠們感激地搬來一些靈氣', effects: { qiSec: 90 } },
    ] },
  { id: 'tour', emoji: '🧳', title: '外宗參觀團', weight: 6, good: true, minRealm: 8, timeoutChoice: 0,
    text: '一隊外宗弟子拿著小旗子站在山門前，導遊大聲宣布：「各位請看，這就是傳說中的『被逐出青雲宗的那座破廟』。」',
    choices: [
      { label: '收門票', desc: '得到一筆靈石，偽裝值 +1（忍住不翻白眼）', effects: { stoneSec: 120, disguise: 1 } },
      { label: '請他們喝茶', cost: { qiSec: 60 }, desc: '花約 60 秒靈氣；有人心生敬佩，留下招賢令', effects: { token: 1, disguise: 1 } },
    ] },
  { id: 'paper', emoji: '📰', title: '宗門小報', weight: 6, good: false, minRealm: 8, timeoutChoice: 1,
    text: '山下的《修仙週報》頭版寫著：「破廟宗主疑似偷吃供品，證據是香爐裡少了一根香。」老祖：「那是本座吃的。」',
    choices: [
      { label: '寫信澄清', cost: { qiSec: 50 }, desc: '花約 50 秒靈氣；風評回升，偽裝值 +2', effects: { disguise: 2 } },
      { label: '默默買十份收藏', desc: '流量就是靈石：得到一筆靈石，但被唸了一句', effects: { stoneSec: 60, loseQiSec: 15 } },
    ] },
  { id: 'duel', emoji: '🤺', title: '路邊約戰', weight: 6, good: false, minRealm: 9, timeoutChoice: 1,
    text: '一位年輕劍修攔在山路上，雙手抱拳：「聽聞宗主劍法通神，請賜教三招！」身後有人在偷偷錄影——如果這世界有錄影的話。',
    choices: [
      { label: '應戰', desc: '六成機會三招解決，對方留下招賢令；失敗則丟面子，損失靈氣', effects: { gamble: { p: 0.6, win: { token: 2 }, lose: { loseQiSec: 60 } } } },
      { label: '讓他三招', desc: '風度翩翩：偽裝值 +1，得到少量靈氣', effects: { disguise: 1, qiSec: 40 } },
    ] },
  { id: 'tax', emoji: '🧮', title: '山下稅吏', weight: 5, good: false, minRealm: 9, timeoutChoice: 1,
    text: '一位拿著算盤的稅吏站在山門口：「按律，宗門需繳『破廟稅』。」老祖壓低聲音：「這世上有這種稅嗎？……他怎麼知道廟是破的？」',
    choices: [
      { label: '乖乖繳稅', cost: { stoneSec: 70 }, desc: '花約 70 秒靈石；稅吏滿意地走了', effects: {} },
      { label: '讓老祖出面嚇他', desc: '五成機會嚇退稅吏還倒賺；失敗則一棟建築暫停 3 分鐘', effects: { gamble: { p: 0.5, win: { stoneSec: 100 }, lose: { pauseBuilding: min(3) } } } },
    ] },
  { id: 'dream', emoji: '🌙', title: '老祖托夢', weight: 5, good: true, minRealm: 10, timeoutChoice: 1,
    text: '半夜你夢見老祖站在床邊，嚴肅地說：「徒兒，有件大事。」你睜大眼睛，他說：「……本座忘了。明天想起來再說。」',
    choices: [
      { label: '認真聽完整個夢', desc: '雖然沒有重點，但你還是睡了個好覺：得到靈氣', effects: { qiSec: 200 } },
      { label: '裝睡', desc: '老祖悻悻離去：偽裝值 +1，順便夢到一點碎片', effects: { disguise: 1, shard: 1 } },
    ] },
  { id: 'ghost', emoji: '👻', title: '廟裡有鬼', weight: 5, good: false, minRealm: 10, timeoutChoice: 1,
    text: '半夜供桌上傳來嗚嗚的哭聲。你點燈一看，是一隻迷路的小鬼，哭著說找不到回家的路。老祖：「喂，別哭，吵到本座睡覺了。」',
    choices: [
      { label: '超度他', cost: { qiSec: 100 }, desc: '花約 100 秒靈氣；小鬼道謝，留下招賢令', effects: { token: 2 } },
      { label: '啟動護山大陣送他一程', requires: { building: 'array' }, desc: '需要護山大陣；順利送走，得到碎片', effects: { shard: 2 } },
      { label: '嚇他', desc: '五成機會嚇出一筆靈氣；失敗則一棟建築暫停 4 分鐘', effects: { gamble: { p: 0.5, win: { qiSec: 150 }, lose: { pauseBuilding: min(4) } } } },
    ] },
  { id: 'wedding', emoji: '🧧', title: '山下喜帖', weight: 5, good: true, minRealm: 11, timeoutChoice: 0,
    text: '山下的財主派人送來一張燙金喜帖，請你當證婚人。老祖看了一眼：「你一個欠債修士，證什麼婚？……嗯，吃席的話，可以。」',
    choices: [
      { label: '赴宴', desc: '吃得盡興，主人封了一個大紅包：得到靈石', effects: { stoneSec: 200 } },
      { label: '送一份賀禮', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石；主人回禮招賢令，小機率附贈法寶', effects: { token: 2, artifact: 0.1 } },
    ] },
  { id: 'bigmatch', emoji: '🏆', title: '青雲宗年度大比', weight: 5, good: false, minRealm: 11, timeoutChoice: 1,
    text: '青雲宗寄來一封燙金請柬：「誠邀貴宗前來『觀摩』年度大比。」落款的「觀摩」二字特地加粗了。老祖：「這是在炫耀。」',
    choices: [
      { label: '前去觀摩', desc: '你坐在最後一排看完全場：偽裝值 +2，順便撿到碎片', effects: { disguise: 2, shard: 2 } },
      { label: '把請柬當柴燒', desc: '解氣！得到一點靈氣，但老祖唸你「不夠沉穩」，損失少量靈氣', effects: { qiSec: 100, loseQiSec: 20 } },
    ] },
  { id: 'beastking', emoji: '🐲', title: '妖王使者', weight: 5, good: true, minRealm: 12, timeoutChoice: 1,
    text: '山中的妖王派來一位使者，畢恭畢敬地遞上拜帖：「我王想與貴宗談一談——關於後山那片竹林的歸屬。」老祖：「讓他們去搶，反正竹子是本座的。」',
    choices: [
      { label: '坐下談判', cost: { qiSec: 150 }, desc: '花約 150 秒靈氣；各退一步，得到招賢令與碎片', effects: { token: 2, shard: 3 } },
      { label: '轟出去', desc: '四成機會妖王服軟獻寶；失敗則損失靈氣，護山大陣可減免', effects: { gamble: { p: 0.4, win: { artifact: 1 }, lose: { loseQiSec: 120, armorByArray: true } } } },
    ] },
  { id: 'fallen', emoji: '🪂', title: '天上掉下一個人', weight: 5, good: true, minRealm: 12, timeoutChoice: 0,
    text: '「砰」的一聲，一個人從天上掉進了後院，灰頭土臉地爬起來：「……飛升失敗了。請問這裡是哪？」老祖：「本座的廟。你壓壞了本座的菜。」',
    choices: [
      { label: '扶他起來', desc: '五成機會他願意留下當弟子（成為待招募弟子）', effects: { recruit: 0.5 } },
      { label: '給他一碗粥', cost: { qiSec: 40 }, desc: '花約 40 秒靈氣；他感激涕零，留下招賢令與碎片', effects: { token: 1, shard: 1 } },
    ] },
  // ── 中段補充（煉氣四層～元嬰，每個境界各 2 則）：日常小事與小抉擇 ──
  { id: 'mushroom', emoji: '🍄', title: '後山怪菇', weight: 6, good: true, minRealm: 4, timeoutChoice: 1,
    text: '後山一夜之間長出一圈五顏六色的蘑菇，還會微微發光。老祖：「別吃。……除非你想看看會怎樣。」',
    choices: [
      { label: '嚐一口', desc: '五成機會靈氣暴漲；失敗則上吐下瀉，一棟建築暫停 2 分鐘', effects: { gamble: { p: 0.5, win: { qiSec: 130 }, lose: { pauseBuilding: min(2) } } } },
      { label: '曬乾賣掉', desc: '穩穩換一小筆靈石', effects: { stoneSec: 50 } },
    ] },
  { id: 'peddler', emoji: '🛒', title: '貨郎叫賣', weight: 6, good: false, minRealm: 4, timeoutChoice: 1,
    text: '一位挑著擔子的貨郎在山門外吆喝：「祖傳秘笈，今日特價！」擔子裡的秘笈全是同一本，封面上還沾著油漬。',
    choices: [
      { label: '買一本', cost: { stoneSec: 40 }, desc: '花約 40 秒靈石；翻開竟有幾頁真貨，得到碎片', effects: { shard: 2 } },
      { label: '殺價', desc: '五成機會殺到骨折還多送一本；失敗則被貨郎白眼，損失少量靈石', effects: { gamble: { p: 0.5, win: { shard: 2 }, lose: { loseStoneSec: 15 } } } },
    ] },
  { id: 'bridge', emoji: '🌉', title: '山路斷橋', weight: 6, good: false, minRealm: 5, timeoutChoice: 1,
    text: '通往山下的獨木橋被昨夜的雨沖斷了。村民在對岸張望：「宗主，這橋可是靠你們廟才有人走的！」老祖：「我們廟根本沒人走。」',
    choices: [
      { label: '出錢修橋', cost: { stoneSec: 50 }, desc: '花約 50 秒靈石；村民感念，送來一枚招賢令', effects: { token: 1 } },
      { label: '繞遠路', desc: '損失少量靈氣，白白多走了半天', effects: { loseQiSec: 40 } },
    ] },
  { id: 'scholar', emoji: '📚', title: '落第書生', weight: 6, good: true, minRealm: 5, timeoutChoice: 0,
    text: '一位考了十次都沒中的書生蹲在山門外，抱著書箱嘆氣：「天下之大，竟無我容身之處。」老祖：「這裡有。破點，但有。」',
    choices: [
      { label: '請他抄經', desc: '他抄得一手好字，得到靈氣與一點碎片', effects: { qiSec: 60, shard: 1 } },
      { label: '管他一頓飯', cost: { qiSec: 30 }, desc: '花約 30 秒靈氣；他感動落淚，留下招賢令', effects: { token: 1, shard: 1 } },
    ] },
  { id: 'kitchenfire', emoji: '🔥', title: '灶房失火', weight: 6, good: false, minRealm: 6, timeoutChoice: 1,
    text: '灶房冒出滾滾濃煙。老祖在一旁淡定地說：「本座沒動，是你昨晚煮的粥自己燒起來的。」',
    choices: [
      { label: '立刻撲滅', cost: { qiSec: 40 }, desc: '花約 40 秒靈氣；火勢撲滅，平安無事', effects: {} },
      { label: '先搶救靈米', desc: '救下靈米，但一棟建築暫停 4 分鐘，護山大陣越高損失越少', effects: { pauseBuilding: min(4), loseQiSec: 30, armorByArray: true } },
    ] },
  { id: 'crane', emoji: '🦢', title: '仙鶴歇腳', weight: 5, good: true, minRealm: 6, timeoutChoice: 0,
    text: '一隻羽毛雪白的仙鶴落在屋脊上，歪頭打量你的破廟，好像在確認自己有沒有飛錯地方。',
    choices: [
      { label: '讓牠歇著', desc: '仙鶴臨走留下一縷靈氣', effects: { qiSec: 100 } },
      { label: '餵靈米', cost: { stoneSec: 30 }, desc: '花約 30 秒靈石；仙鶴留下招賢令，小機率叼來法寶', effects: { token: 1, artifact: 0.15 } },
    ] },
  { id: 'monk', emoji: '🧘', title: '雲遊僧人', weight: 6, good: true, minRealm: 7, timeoutChoice: 0,
    text: '一位雲遊僧人在山門口盤腿坐下，說要與你論一場道。老祖小聲提醒：「他是來蹭飯的。……不過道理應該是真的。」',
    choices: [
      { label: '論道', desc: '五成機會悟出心得（碎片）；失敗則被問倒，偽裝值 -1', effects: { gamble: { p: 0.5, win: { shard: 3 }, lose: { disguise: -1 } } } },
      { label: '佈施一餐', cost: { stoneSec: 40 }, desc: '花約 40 秒靈石；僧人合十，留下招賢令', effects: { token: 2 } },
    ] },
  { id: 'flood', emoji: '🌊', title: '山洪', weight: 6, good: false, minRealm: 7, timeoutChoice: 2,
    text: '連日大雨，後山的溪水暴漲，渾濁的洪水正往廟裡灌。老祖站在供桌上：「本座飄著就好，你們自己想辦法。」',
    choices: [
      { label: '啟動護山大陣', requires: { building: 'array' }, desc: '需要護山大陣；水勢被擋住，還沖來一點碎片', effects: { shard: 2 } },
      { label: '搶救糧倉', cost: { qiSec: 60 }, desc: '花約 60 秒靈氣；糧倉保住了', effects: {} },
      { label: '認命', desc: '損失較多靈氣，護山大陣越高損失越少', effects: { loseQiSec: 110, armorByArray: true } },
    ] },
  { id: 'smith', emoji: '⚒️', title: '流浪鐵匠', weight: 6, good: true, minRealm: 8, timeoutChoice: 1,
    text: '一位扛著鐵砧的流浪鐵匠問：「借個爐子打鐵，成不成？」他腰間掛的錘子，看起來比你的廟還舊。',
    choices: [
      { label: '請他打件東西', cost: { stoneSec: 80 }, desc: '花約 80 秒靈石；有機會打出一件法寶', effects: { artifact: 0.35, shard: 1 } },
      { label: '跟他切磋手藝', desc: '五成機會學到訣竅（碎片）；失敗則燙到手，損失少量靈氣', effects: { gamble: { p: 0.5, win: { shard: 3 }, lose: { loseQiSec: 20 } } } },
    ] },
  { id: 'drought', emoji: '🌵', title: '靈田乾旱', weight: 6, good: false, minRealm: 8, timeoutChoice: 1,
    text: '連著二十天沒下雨，靈田裂開一道道口子，靈菜蔫頭耷腦。老祖：「本座覺得，是你水澆少了。」',
    choices: [
      { label: '引後山靈泉灌田', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石；田活了，還多長出一茬靈氣', effects: { qiSec: 130 } },
      { label: '硬撐著', desc: '損失靈氣，但你在田埂上悟出一點碎片', effects: { loseQiSec: 70, shard: 1 } },
    ] },
  { id: 'inspect', emoji: '🔍', title: '宗門查驗', weight: 5, good: false, minRealm: 9, timeoutChoice: 1,
    text: '兩位佩劍的執事上門，翻開簿子：「奉命查驗，貴宗是否擅用靈脈。」老祖在旁邊小聲：「這座山的靈脈是本座先占的。」',
    choices: [
      { label: '遞上茶水點心', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石；對方滿意地蓋章，偽裝值 +2', effects: { disguise: 2 } },
      { label: '據理力爭', desc: '五成機會把對方說到語塞，還賠禮招賢令；失敗則被記上一筆，一棟建築暫停 3 分鐘', effects: { gamble: { p: 0.5, win: { token: 2 }, lose: { pauseBuilding: min(3) } } } },
    ] },
  { id: 'pearl', emoji: '🔮', title: '來歷不明的寶珠', weight: 5, good: true, minRealm: 9, timeoutChoice: 1,
    text: '你在後院挖到一顆溫溫的珠子，裡面彷彿有雲在流動。老祖盯著它看了很久，說：「……別問，我不記得了。」',
    choices: [
      { label: '嘗試煉化', desc: '四成機會煉成法寶；失敗則靈氣反噬，損失少量靈氣', effects: { gamble: { p: 0.4, win: { artifact: 1 }, lose: { loseQiSec: 40 } } } },
      { label: '供在案頭', desc: '寶珠散出微光，滋養廟裡的靈氣', effects: { qiSec: 120 } },
    ] },
  { id: 'cavemap', emoji: '🗺️', title: '前輩洞府傳聞', weight: 5, good: true, minRealm: 10, timeoutChoice: 1,
    text: '山下茶館裡有人在賣一張「前輩洞府藏寶圖」，說得天花亂墜。老祖：「那座洞府本座去過。……裡面沒東西，只有一隻蝙蝠。」',
    choices: [
      { label: '買圖探洞', cost: { stoneSec: 80 }, desc: '花約 80 秒靈石；洞裡雖然只有蝙蝠，但牠身下壓著幾片碎片與招賢令', effects: { shard: 3, token: 1 } },
      { label: '自己摸黑去', desc: '四成五機會挖到一大筆碎片；失敗則迷了路，一棟建築暫停 4 分鐘', effects: { gamble: { p: 0.45, win: { shard: 6 }, lose: { pauseBuilding: min(4) } } } },
    ] },
  { id: 'drunk', emoji: '🍶', title: '醉酒長老', weight: 5, good: false, minRealm: 10, timeoutChoice: 1,
    text: '一位醉醺醺的長老倒在山門口，嘴裡反覆唸著「我沒醉」。老祖：「這人本座認識，喝醉了比清醒時講理。」',
    choices: [
      { label: '陪他喝一杯', cost: { stoneSec: 60 }, desc: '花約 60 秒靈石；酒後吐真言，他送你招賢令與碎片', effects: { token: 2, shard: 1 } },
      { label: '扶他回客房', desc: '損失一點靈氣，他隔天醒來感激地留下招賢令', effects: { loseQiSec: 30, token: 1 } },
    ] },
  { id: 'alliance', emoji: '🤝', title: '他宗結盟提議', weight: 5, good: true, minRealm: 11, timeoutChoice: 1,
    text: '一位陌生宗門的使者帶著燙金盟書求見：「久聞貴宗之名，願結為兄弟宗門。」老祖低聲說：「他們是想借你的名頭，躲債。」',
    choices: [
      { label: '簽下盟約', cost: { stoneSec: 120 }, desc: '花約 120 秒靈石；對方奉上厚禮，得到招賢令', effects: { token: 3 } },
      { label: '婉言謝絕', desc: '對方客氣離去：偽裝值 +1，得到少量靈氣', effects: { disguise: 1, qiSec: 60 } },
    ] },
  { id: 'blight', emoji: '🦠', title: '靈稻病蟲', weight: 6, good: false, minRealm: 11, timeoutChoice: 1,
    text: '靈稻的葉子上爬滿了半透明的小蟲，吃起來咔滋咔滋。老祖：「這蟲比你勤快，吃了一整晚。」',
    choices: [
      { label: '噴藥除蟲', cost: { stoneSec: 90 }, desc: '花約 90 秒靈石；蟲除乾淨，稻子反而長得更好', effects: { qiSec: 100 } },
      { label: '放著不管', desc: '損失靈氣，護山大陣越高損失越少', effects: { loseQiSec: 110, armorByArray: true } },
    ] },
  { id: 'innerdemon', emoji: '😈', title: '心魔來訪', weight: 5, good: false, minRealm: 12, timeoutChoice: 2,
    text: '你在入定時看見另一個自己坐在對面，笑著說：「你為什麼要忍？」老祖冷靜地說：「這是心魔，別理他，也別真的聽他。」',
    choices: [
      { label: '直面心魔', desc: '五成五機會勘破心障，得到靈氣與碎片；失敗則損失靈氣、一棟建築暫停 5 分鐘', effects: { gamble: { p: 0.55, win: { qiSec: 150, shard: 4 }, lose: { loseQiSec: 100, pauseBuilding: min(5) } } } },
      { label: '以護山大陣鎮壓', requires: { building: 'array' }, desc: '需要護山大陣；心魔退散，得到少量碎片', effects: { shard: 2 } },
      { label: '當作沒看見', desc: '偽裝值 +1，但損失一點靈氣', effects: { disguise: 1, loseQiSec: 40 } },
    ] },
  { id: 'tianji', emoji: '🧭', title: '天機閣來客', weight: 5, good: true, minRealm: 12, timeoutChoice: 1,
    text: '天機閣的年輕卜師站在山門前，手裡的羅盤轉個不停：「宗主，我算到貴宗近日有大事——但算不出是好事還是壞事。」',
    choices: [
      { label: '請他卜一卦', cost: { qiSec: 120 }, desc: '花約 120 秒靈氣；卦象大吉，得到招賢令與碎片', effects: { token: 2, shard: 3 } },
      { label: '聽而不問', desc: '卜師尷尬地留下茶錢：得到靈氣', effects: { qiSec: 200 } },
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
