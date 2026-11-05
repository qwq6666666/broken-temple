// 離線歸來事件：離開超過 minMs 回來時，歡迎畫面出現一則小故事與二選一。
// 獎勵 = 目前每秒產出 × 秒數（有下限），所以前後期都有感；沒有懲罰，選哪個都不虧。
export const OFFLINE_EVENT_MIN_MS = 30 * 60 * 1000;
export const OFFLINE_EVENTS = [
  { id: 'dog', text: '一隻野狗叼著什麼東西蹲在廟門口，老祖說那是「你欠本座的香火錢」。',
    choices: [{ label: '收下', reward: { stoneSec: 600, min: { stone: 30 } }, done: '狗叼來的是半塊靈石，你收下了。' },
              { label: '餵牠一口', reward: { token: 1 }, done: '野狗搖著尾巴走了，隔天廟門口多了一張招賢令。' }] },
  { id: 'leak', text: '你不在的時候下了場雨，屋頂漏得更理直氣壯了。老祖拿盆接水，接了一整夜。',
    choices: [{ label: '補屋頂', reward: { qiSec: 600, min: { qi: 60 } }, done: '修補時順便刮出一層積年靈塵。' },
              { label: '換個地方睡', reward: { stoneSec: 300, min: { stone: 20 } }, done: '你在角落睡得很好，還撿到一塊被雨沖出的石頭。' }] },
  { id: 'monk', text: '一位雲遊老僧路過，隔著門檻看了你的破廟三眼，什麼都沒說就走了，留下一個蒲團。',
    choices: [{ label: '坐上去打坐', reward: { qiSec: 900, min: { qi: 80 } }, done: '蒲團上殘留著不知多少年的靜氣。' },
              { label: '追上去問', reward: { token: 1 }, done: '老僧頭也不回，丟下一句「緣分」，和一張招賢令。' }] },
  { id: 'rat', text: '老祖說廟裡鬧耗子。你看了一眼，那是一隻會撥算盤的靈鼠。',
    choices: [{ label: '讓牠對帳', reward: { stoneSec: 900, min: { stone: 40 } }, done: '靈鼠一夜算出三處爛帳，補回一筆靈石。' },
              { label: '趕走', reward: { qiSec: 300, min: { qi: 40 } }, done: '牠跑得太急，撞翻了香爐，倒出一把靈氣餘燼。' }] },
  { id: 'letter', text: '門縫裡塞進一封沒署名的信：「有人在看你。別擔心，是善意的。」老祖罕見地沒有吐槽。',
    choices: [{ label: '收進懷裡', reward: { token: 1 }, done: '信紙背面夾著一張泛黃的招賢令。' },
              { label: '燒掉', reward: { qiSec: 600, min: { qi: 60 } }, done: '紙灰飄起，化成一縷細細的靈氣。' }] },
];
export const OFFLINE_EVENTS_BY_ID = Object.fromEntries(OFFLINE_EVENTS.map(e => [e.id, e]));
