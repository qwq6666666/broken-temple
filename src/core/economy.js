// 產出與各種加成的統一計算：基礎 × 建築 × 境界 × 弟子派駐 × 法寶。
import { CONFIG } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';
import { REALMS } from '../data/realms.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { contribution, stat } from './discipleMath.js';

export const realmOf = s => REALMS[s.realmIdx];

// 永久加成（功法／法寶）總和
export const artifactSum = (s, key) =>
  s.artifacts.reduce((a, id) => a + (ARTIFACTS_BY_ID[id].effect[key] || 0), 0);

// 建築倍率 = 1 + 駐守弟子貢獻總和
export function buildingMult(s, id) {
  let m = 1;
  for (const d of s.disciples) if (d.at === id) m += contribution(d, id);
  return m;
}

// 建築是否在產出（等級 > 0 且未被「忍氣吞聲」暫停）
export const isActive = (s, id) => s.buildings[id].lv > 0 && s.t >= s.buildings[id].pausedUntil;

// 每秒產出：res 為 'qi' | 'stone'
export function perSec(s, res) {
  let base = res === 'qi' ? CONFIG.innateQiPerSec : 0;
  for (const d of BUILDINGS) {
    const p = d.produce[res];
    if (p && isActive(s, d.id)) base += s.buildings[d.id].lv * p * buildingMult(s, d.id);
  }
  return base * realmOf(s).mult * (1 + artifactSum(s, res + 'Mult'));
}
export const qiPerSec = s => perSec(s, 'qi');
export const stonePerSec = s => perSec(s, 'stone');

// 打坐一次獲得的靈氣
export const clickPower = s =>
  (CONFIG.click.base + s.buildings.temple.lv * CONFIG.click.perTempleLevel)
  * realmOf(s).mult * (1 + artifactSum(s, 'clickMult'));

// 藏經閣：弟子升級折扣（含法寶）
export const discipleDiscount = s =>
  Math.min(CONFIG.disciple.discountMax,
    s.buildings.library.lv * CONFIG.disciple.libraryDiscountPerLevel * buildingMult(s, 'library')
    + artifactSum(s, 'discipleDiscount'));

// 護山大陣：稀有事件機率
export const rareChance = s =>
  Math.min(0.95, CONFIG.building_effect.rareBase
    + s.buildings.array.lv * CONFIG.building_effect.rarePerLevel * buildingMult(s, 'array'));

// 玩家戰力：境界 × 演武場 × 持有弟子屬性 × 法寶（影響「碾壓」判定）
export function combatPower(s) {
  const arena = 1 + s.buildings.arena.lv * CONFIG.building_effect.arenaPowerPerLevel * buildingMult(s, 'arena');
  const owned = 1 + CONFIG.disciple.ownedPowerFactor * s.disciples.reduce((a, d) => a + stat(d), 0);
  return realmOf(s).power * arena * owned * (1 + artifactSum(s, 'powerMult'));
}

// 每個固定 tick 呼叫：推進遊戲時鐘、產出資源、招賢令自然增加
export function tick(s, dt) {
  s.t += dt;
  const sec = dt / 1000;
  s.res.qi += qiPerSec(s) * sec;
  s.res.stone += stonePerSec(s) * sec;
  s.tokenAcc += dt;
  const step = CONFIG.gacha.tokenTrickleSec * 1000;
  if (s.tokenAcc >= step) {
    const n = Math.floor(s.tokenAcc / step);
    s.res.token += n; s.tokenAcc -= n * step;
  }
}
