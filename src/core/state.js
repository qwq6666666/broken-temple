// 單一狀態樹。此版不存檔，所以只有 createState。
import { CONFIG } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';

export function createState() {
  const buildings = {};
  for (const d of BUILDINGS) buildings[d.id] = { lv: d.id === 'temple' ? CONFIG.start.templeLevel : 0, pausedUntil: 0 };
  return {
    t: 0,                                   // 遊戲時鐘 (ms，已含 timeScale)
    res: { qi: CONFIG.start.qi, stone: CONFIG.start.stone, token: CONFIG.start.token, shard: 0, daoHeart: 0 }, // daoHeart 預留給轉生
    realmIdx: 0,
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
    endureStreak: 0,                        // 連續忍氣吞聲次數（憋屈值）
    meditateReadyAt: 0,                     // 打坐冷卻結束時間（遊戲時鐘）
    reincarnation: { count: 0, shop: {} },  // 轉生次數、道心商店等級
    run: { bursts: 0, maxChain: 0, nemeses: 0, goals: 0 },   // 本輪表現（轉生時結算道心）
    unlocked: {},                           // 已解鎖的分頁（新手引導）
    seenIntro: false,                       // 是否看過開場說明
    nemeses: {},                            // 宿敵進度 {id: {met, defeated}}
    goalsDone: [],                          // 已完成的宗門大事
    burstActive: false,
    stats: { meditations: 0, bursts: 0, maxChain: 0, incidents: 0, nemesisDefeated: 0 },
  };
}
