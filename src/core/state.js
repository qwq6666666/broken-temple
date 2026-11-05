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
    artifacts: [],                          // 已獲得的功法法寶 id
    settings: { loss: true },               // 承受損失開關
    tokenAcc: 0,
    meditateReadyAt: 0,                     // 打坐冷卻結束時間（遊戲時鐘）
    burstActive: false,
    stats: { meditations: 0, bursts: 0 },
  };
}
