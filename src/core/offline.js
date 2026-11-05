// 離線收益：回到遊戲時依離開時間補算。
// 資源與招賢令 × efficiency；偽裝值與蓄力時間、仇人成長照常（維持壓力）；離線期間不產生訪客。
import { CONFIG } from '../config.js';
import { lvlLabel } from '../data/realms.js';
import * as economy from './economy.js';
import * as conceal from './conceal.js';
import { perm } from './dao.js';

export function applyOffline(s, elapsedMs) {
  const O = CONFIG.offline;
  if (!(elapsedMs >= O.minMs)) return null;
  const capMs = O.capMs + perm(s, 'offlineCap') * 3600 * 1000;        // 道心：神遊太虛
  const eff = Math.min(1, O.efficiency + perm(s, 'offlineEff'));       // 道心：守廟靈獸
  const used = Math.min(elapsedMs, capMs);
  const before = { qi: s.res.qi, stone: s.res.stone, token: s.res.token, disguise: s.disguise.value, charge: s.disguise.chargeMs };
  const labels = new Map(s.grudges.map(g => [g.id, lvlLabel(g.lvl)]));

  // 分步結算，讓「暫停產出」等計時器自然到期
  for (let left = used; left > 0; left -= O.stepMs) {
    const step = Math.min(O.stepMs, left);
    economy.tick(s, step * eff);       // 產出 × 效率
    s.t += step * (1 - eff);           // 補齊遊戲時鐘
    conceal.tick(s, step);                      // 偽裝／蓄力／仇人成長：全時間
  }
  // 回來時別立刻被訪客蓋住歡迎畫面
  s.visitor.nextAt = Math.max(s.visitor.nextAt, s.t + 20000);
  s.incident.nextAt = Math.max(s.incident.nextAt, s.t + 60000);
  if (s.incident.current) s.incident.current.expiresAt = Math.max(s.incident.current.expiresAt, s.t + 60000);   // 離線不算逾時

  return {
    elapsedMs, usedMs: used, capped: elapsedMs > capMs, capMs, efficiency: eff,
    gains: { qi: s.res.qi - before.qi, stone: s.res.stone - before.stone, token: s.res.token - before.token },
    disguiseGain: s.disguise.value - before.disguise,
    chargeMinutes: (s.disguise.chargeMs - before.charge) / 60000,
    disguiseFull: conceal.disguiseFull(s),
    grown: s.grudges.filter(g => lvlLabel(g.lvl) !== labels.get(g.id)).map(g => ({ name: g.name, to: lvlLabel(g.lvl) })),
  };
}
