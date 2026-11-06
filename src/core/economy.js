// 產出與各種加成的統一計算：基礎 × 建築 × 境界 × 弟子派駐 × 法寶。
import { CONFIG } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';
import { REALMS } from '../data/realms.js';
import { ARTIFACTS_BY_ID, EQUIP_BONUS } from '../data/artifacts.js';
import { goalPerm } from './goals.js';
import { bondSum } from './bonds.js';
import { STORY_RULES } from '../data/stories.js';
import { perm as daoPerm } from './dao.js';
import { insightPerm } from './insight.js';
import { gloryPerm } from './glory.js';
import { explorePerm } from './exploration.js';
import { contribution, powerStat, traitOf, traitValue } from './discipleMath.js';

export const realmOf = s => REALMS[s.realmIdx];

// 永久加成（功法／法寶／宗門大事）總和
export const artifactSum = (s, key) =>
  s.artifacts.reduce((a, id) => a + (ARTIFACTS_BY_ID[id].effect[key] || 0) * (1 + (s.equipped.includes(id) ? EQUIP_BONUS : 0)), 0) + goalPerm(s, key) + daoPerm(s, key) + insightPerm(s, key, 'perm') + gloryPerm(s, key) + explorePerm(s, key);

// 特性加總：只計算「已派駐」的弟子
// 弟子特性實際效果 = 基礎 × 星級 ×（1 + 每讀一章故事 +10%）
export const traitValueS = (s, d) => traitValue(d) * (1 + STORY_RULES.bonusPerChapter * (s.stories?.[d.defId] || 0));
export function traitSum(s, key) {
  let v = bondSum(s, key) + insightPerm(s, key, 'trait');   // 緣分加成 + 專長心得（忍氣吞聲損失、建築暫停）
  for (const d of s.disciples) if (d.at && traitOf(d).key === key) v += traitValueS(s, d);
  return v;
}

// 建築倍率 = 1 + 駐守弟子貢獻總和
export function buildingMult(s, id) {
  let m = 1;
  const at = s.disciples.filter(d => d.at === id);
  for (const d of at) m += contribution(d, id, at.filter(x => x !== d));
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
  return base * realmOf(s).mult * (1 + artifactSum(s, res + 'Mult') + traitSum(s, res + 'Mult'));
}
export const qiPerSec = s => perSec(s, 'qi');
export const stonePerSec = s => perSec(s, 'stone');

// 打坐一次獲得的靈氣：取「保底」與「N 秒產出」較大者，所以後期仍有意義但不會超越被動產出太多
export const clickPower = s => {
  const floor = (CONFIG.click.base + s.buildings.temple.lv * CONFIG.click.perTempleLevel) * realmOf(s).mult;
  return Math.max(floor, qiPerSec(s) * CONFIG.click.productionSec) * (1 + artifactSum(s, 'clickMult'));
};

// 藏經閣：弟子升級折扣（含法寶）
export const discipleDiscount = s =>
  Math.min(CONFIG.disciple.discountMax,
    s.buildings.library.lv * CONFIG.disciple.libraryDiscountPerLevel * buildingMult(s, 'library')
    + s.buildings.hall.lv * 0.02 * buildingMult(s, 'hall')                                // 傳功殿
    + artifactSum(s, 'discipleDiscount'));

// 護山大陣：稀有事件機率
export const rareChance = s =>
  Math.min(0.95, CONFIG.building_effect.rareBase
    + s.buildings.array.lv * CONFIG.building_effect.rarePerLevel * buildingMult(s, 'array')
    + s.buildings.beast.lv * 0.02 * buildingMult(s, 'beast')                              // 靈獸園
    + traitSum(s, 'rare') + daoPerm(s, 'rare'));

// 玩家戰力：境界 × 演武場 × 持有弟子屬性 × 法寶（影響「碾壓」判定）
export function combatPower(s) {
  const arena = (1 + s.buildings.arena.lv * CONFIG.building_effect.arenaPowerPerLevel * buildingMult(s, 'arena'))
    * (1 + s.buildings.tower.lv * 0.06 * buildingMult(s, 'tower'));                     // 鎮魔塔
  const owned = 1 + CONFIG.disciple.ownedPowerFactor * s.disciples.reduce((a, d) => a + powerStat(d), 0);
  return realmOf(s).power * arena * owned * (1 + artifactSum(s, 'powerMult') + traitSum(s, 'power'));
}

// 每個固定 tick 呼叫：推進遊戲時鐘、產出資源、招賢令自然增加
export function tick(s, dt) {
  s.t += dt;
  const sec = dt / 1000;
  s.res.qi += qiPerSec(s) * sec;
  s.res.stone += stonePerSec(s) * sec;
  s.tokenAcc += dt;
  const step = CONFIG.gacha.tokenTrickleSec * 1000 / (1 + daoPerm(s, 'tokenRate') + s.buildings.beast.lv * 0.08 * buildingMult(s, 'beast'));   // 道心：招賢名聲
  if (s.tokenAcc >= step) {
    const n = Math.floor(s.tokenAcc / step);
    s.res.token += n; s.tokenAcc -= n * step;
  }
}

// 鎮魔塔：爆擊獎勵加成
export const towerBurst = s => s.buildings.tower.lv * 0.03 * buildingMult(s, 'tower');
