// 單一狀態樹。此版不存檔，所以只有 createState。
import { CONFIG } from '../config.js';
import { MAT_KEYS } from '../data/materials.js';
import { BUILDINGS } from '../data/buildings.js';

export function createState() {
  const buildings = {};
  for (const d of BUILDINGS) buildings[d.id] = { lv: d.id === 'temple' ? CONFIG.start.templeLevel : 0, pausedUntil: 0 };
  return {
    t: 0,                                   // 遊戲時鐘 (ms，已含 timeScale)
    res: { qi: CONFIG.start.qi, stone: CONFIG.start.stone, token: CONFIG.start.token, shard: 0, daoHeart: 0, merit: 0, ...Object.fromEntries(MAT_KEYS.map(k => [k, 0])) }, // daoHeart 預留給轉生
    realmIdx: 0,                            // 境界序號 0..25（見 data/realms.js）
    breakAt: 0,                             // 上次突破的遊戲時間（小階穩固計時用，轉生重置）
    frontier: 0,                            // 歷史最高境界序號（跨轉生保留；舊路重走折扣用）
    buildings,
    disciples: [],                          // {uid, defId, lv, at}
    recruits: [],                           // 被降服、待招募：{uid, defId, from}
    nextUid: 1,
    gacha: { total: 0, sinceSR: 0, sinceSSR: 0 },
    disguise: { value: 0, chargeMs: 0 },    // 偽裝值 / 蓄力時間
    grudges: [],                            // 復仇簿
    nextGid: 1,
    visitor: { current: null, nextAt: CONFIG.visitor.firstSec * 1000 },
    incident: { current: null, nextAt: 300000 },   // 隨機事件
    artifacts: [],                          // 已獲得的功法法寶 id
    settings: { loss: true },               // 承受損失開關
    tokenAcc: 0,
    pillUntil: 0,                           // 太虛真人「丹成」：引爆後 15 分鐘靈氣 +20% 的到期時間
    tideNext: false,                        // 歸墟「潮汐」：下一位訪客必為稀有類型
    fame: { n: 0, until: 0 },               // 威名：亮一手打臉累積的產出加成（層數、到期時間）
    endureStreak: 0,                        // 連續忍氣吞聲次數（憋屈值）
    meditateReadyAt: 0,                     // 打坐冷卻結束時間（遊戲時鐘）
    reincarnation: { count: 0, shop: {} },  // 轉生次數、道心商店等級
    run: { bursts: 0, maxChain: 0, nemeses: 0, goals: 0, startT: 0, base: {} },   // 本輪表現（轉生時結算道心）；startT／base 是本輪起點的時間與統計基準（天劫用）
    expeditions: [],                        // 進行中／待領取的秘境探索
    mutator: null,                          // 本輪輪迴詞條
    factions: {},                           // 勢力威望 {factionId: rep}（跨轉生保留）
    returners: [],                          // 日後可能回頭的仇人（本輪）
    specs: {},                              // 建築專精 {buildingId: optionId}（本輪）
    dshards: {},                            // 弟子專屬碎片 {defId: n}：抽到重複弟子時獲得，只能用來替該弟子升星（跨轉生保留）
    stories: {},                            // 已讀弟子故事章數 {defId: n}
    unlocked: {},                           // 已解鎖的分頁（新手引導）
    seenIntro: false,                       // 是否看過開場說明
    nemeses: {},                            // 宿敵進度 {id: {met, defeated}}
    glory: { lv: 0 },                       // 宗門榮耀已達等級（只升不降，跨轉生保留）
    explore: {},                            // 秘境探索度 {秘境id: 成功次數}（跨轉生保留）
    exMile: {},                             // 已領取的發現事件 {秘境id: {1:'x',2:'a'|'b',3:'x'}}
    tokBuy: { n: 0, resetAt: 0 },           // 靈石買招賢令的限購計數（遊戲時間）
    foes: {},                               // 仇人記憶 {名字: {beaten: 擊敗次數}}（跨轉生保留）
    squad: [],                              // 出戰陣容（弟子 uid，最多 3 人，跨轉生保留）
    insight: {},                            // 專長心得層數 {專長: 0~3}（跨轉生保留）
    offlineLast: null,                      // 上一次離線歸來事件的 id（避免連續重複，跨轉生保留）
    weekly: { claimed: -1 },                // 已領取每週挑戰獎勵的週序號（跨轉生保留）
    equipped: [],                           // 裝備欄中的法寶 id（跨轉生保留）
    achv: { done: [], title: null },        // 成就與裝備中的稱號（跨轉生保留）
    chronicle: [],                          // 宗門年表（跨轉生保留）
    commissions: { list: [], nextAt: 0, done: 0 },   // 宗門委託（跨轉生保留）
    goalsDone: [],                          // 已完成的宗門大事
    ascend: { done: [], ready: [] },        // 九重天劫：已渡／待渡（跨轉生保留）
    burstActive: false,
    stats: { meditations: 0, bursts: 0, maxChain: 0, incidents: 0, nemesisDefeated: 0, expeditions: 0, endures: 0, upgrades: 0 },
  };
}
