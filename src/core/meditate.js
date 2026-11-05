// 打坐（引氣）：有冷卻，防止連點刷數值；冷卻用遊戲時鐘 s.t 計算。
import { CONFIG } from '../config.js';
import { clickPower } from './economy.js';

export const cooldownLeft = s => Math.max(0, s.meditateReadyAt - s.t);
export const canMeditate = s => cooldownLeft(s) <= 0;

// 回傳獲得的靈氣；冷卻中回傳 0
export function meditate(s) {
  if (!canMeditate(s)) return 0;
  const g = clickPower(s);
  s.res.qi += g;
  s.meditateReadyAt = s.t + CONFIG.click.cooldownMs;
  s.stats.meditations++;
  return g;
}
