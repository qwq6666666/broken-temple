// 九重天劫：化神之後的長線目標（跨轉生保留）。
// 每一劫有一個「在化神時成立」的條件（多半看本輪表現，所以要靠一輪輪轉生去嘗試）。
// 條件達成時進入「待渡」，玩家按「渡劫」領取：獎勵（道心、永久加成）＋ 一段後日談故事。
// 九劫全渡後開啟「道果」（道心商店裡可無限升級的永久加成），沒有終點的長線出口。
//
// check(s) 回傳 { cur, target, text, failed? }：
//   cur/target  進度條；text 是畫面上的進度文字；failed 表示「本輪已不可能達成」（轉生後再試）。
// 本輪統計請用 core/ascend.js 的 runStat（轉生當下會記錄基準）與 runMs（本輪經過時間）。
import { fmtTime } from '../core/format.js';

export const ASCEND_RULES = {
  minRealm: 13,                 // 化神
  speedLimitMs: 120 * 60 * 1000, // 「速證」限時：本輪開始起 2 小時內抵達化神（模擬器機器人約四分之一的輪次做得到）
};

const cnt = (cur, target, unit) => ({ cur: Math.min(cur, target), target, text: `${Math.min(cur, target)}/${target} ${unit}` });

// 第 N 重天（顯示分組）
export const HEAVENS = [
  { id: 'thunder', name: '第一重天・雷劫', blurb: '雷落破廟。老祖說，三千年前他也是這樣被劈醒的。' },
  { id: 'heart',   name: '第二重天・心魔劫', blurb: '雷劈得到身，劈不到心。心魔，只有自己能過。' },
  { id: 'karma',   name: '第三重天・因果劫', blurb: '最後一重，算的是舊帳：你欠的、別人欠你的、老祖欠天下的。' },
];

export const TRIALS = [
  { id: 'th1', heaven: 'thunder', icon: '⚡', name: '引雷入體', desc: '本輪引爆 8 次後抵達化神',
    check: s => cnt(s.run.bursts, 8, '次引爆'),
    reward: { dao: 8, perm: { qiMult: 0.03 } },
    story: ['第一道雷', '雷落下來的時候，破廟的瓦片一片也沒碎。老祖站在屋簷下，難得沒有吐槽：「當年我扛第一道雷，躺了三天。你……站著。」你低頭看了看自己，才發現袖口焦了一圈，人卻好端端的。'] },
  { id: 'th2', heaven: 'thunder', icon: '🌩️', name: '九重雷池', desc: '本輪單次引爆連鎖達 8 人後抵達化神',
    check: s => cnt(s.run.maxChain, 8, '人連鎖'),
    reward: { dao: 8, perm: { burstReward: 0.03 } },
    story: ['連環雷', '雷池裡的雷是一道接一道的，像極了你一口氣掀翻的那串仇人。老祖數著：「一、二、三……你這連鎖，比天雷還整齊。」最後一道雷落下時，整座破廟的燈籠同時亮了。'] },
  { id: 'th3', heaven: 'thunder', icon: '☁️', name: '劫雲問心', desc: '本輪處理 10 則突發事件後抵達化神',
    check: s => cnt(runStat(s, 'incidents'), 10, '則事件'),
    reward: { dao: 8, perm: { stoneMult: 0.03 } },
    story: ['劫雲裡的人間', '劫雲散去時，有人看見雲縫裡露出山下的炊煙。老祖說：「天劫不只問你扛不扛得住，還問你這一路上，有沒有好好看過人間。」你想起那些商隊、香客、迷路的少年，點了點頭。'] },

  { id: 'hr1', heaven: 'heart', icon: '😶', name: '忍字訣', desc: '本輪忍氣吞聲 130 次後抵達化神',
    check: s => cnt(runStat(s, 'endures'), 130, '次忍氣吞聲'),
    reward: { dao: 10, perm: { qiMult: 0.03 } },
    story: ['心魔的第一句話', '心魔化作你最熟悉的樣子，開口只有一句：「你忍了那麼多次，不恨嗎？」你想了很久，回答：「恨。所以我記著。」心魔愣住，然後消散了。老祖輕聲道：「能把恨記成帳，而不是記成刀，你比我當年強。」'] },
  { id: 'hr2', heaven: 'heart', icon: '⏳', name: '速證大道', desc: '本輪開始起 2 小時內抵達化神',
    check: s => {
      const left = ASCEND_RULES.speedLimitMs - runMs(s), reached = s.realmIdx >= ASCEND_RULES.minRealm;
      return { cur: reached ? 1 : 0, target: 1, failed: left < 0, text: left < 0 ? '本輪已超時，轉生後再試' : `本輪還剩 ${fmtTime(left)}` };
    },
    reward: { dao: 10, perm: { powerMult: 0.04 } },
    story: ['來得及', '心魔問你：「你這麼趕，是怕來不及嗎？」你說：「是怕有人等太久。」老祖在一旁假裝打盹，耳朵卻悄悄動了動。三千年，他確實等得夠久了。'] },
  { id: 'hr3', heaven: 'heart', icon: '🧭', name: '眾生相', desc: '本輪完成 12 次秘境探索後抵達化神',
    check: s => cnt(runStat(s, 'expeditions'), 12, '次秘境探索'),
    reward: { dao: 10, perm: { stoneMult: 0.03 } },
    story: ['弟子們的心魔', '心魔最後變成了你的弟子們——阿福、小六子、柳二娘……他們一個個從秘境帶回傷痕與笑，擋在你前面。你忽然明白，所謂心魔，從來不是一個人打得過的東西。'] },

  { id: 'kr1', heaven: 'karma', icon: '🔥', name: '業火焚身', desc: '本輪單次引爆連鎖達 14 人（復仇簿近乎全滿）後抵達化神',
    check: s => cnt(s.run.maxChain, 14, '人連鎖'),
    reward: { dao: 12, perm: { burstReward: 0.04 } },
    story: ['業火', '十個人，十筆舊帳，一把火燒得乾乾淨淨。業火沒有燒傷你，只燒掉了你肩上那些「不是你的」債。老祖說：「別人欠你的，討回來；你欠別人的，還清。天道只算這一種帳。」'] },
  { id: 'kr2', heaven: 'karma', icon: '☯️', name: '因果輪迴', desc: '累計轉生 8 次後抵達化神',
    check: s => cnt(s.reincarnation.count, 8, '次轉生'),
    reward: { dao: 12, perm: { powerMult: 0.04 } },
    story: ['第九世', '你走過八次輪迴，每一次都把破廟重新蓋起來。第九次，因果之線在你眼前展開——你這才看見，每一世的你，都在替下一世鋪路。老祖說：「那條路，我走了三千年。現在輪到你，看看盡頭有什麼。」'] },
  { id: 'kr3', heaven: 'karma', icon: '🏯', name: '破廟飛升', desc: '前八劫全部渡過後，再抵達一次化神',
    check: s => cnt(s.ascend.done.filter(id => id !== 'kr3').length, 8, '劫已渡'),
    reward: { dao: 30, perm: { qiMult: 0.05, stoneMult: 0.05, powerMult: 0.05 } },
    story: ['祖庭', '最後一道劫光落下，破廟的牌匾無聲地換了字——「青雲祖庭」。老祖的身影淡了一半，笑著說：「三千年前我封門，是怕你們進不來；三千年後我開門，是怕你們不進來。」他沒有消失，只是從此坐在簷下，看著山門。「飛升？本座哪裡也不去。這裡，就是天上。」'] },
];
export const TRIALS_BY_ID = Object.fromEntries(TRIALS.map(t => [t.id, t]));

// ── 道果：九劫全渡後開啟，道心商店中可持續升級的永久加成（見 data/daoShop.js 的 gate: 'ascend'）──
export const FRUIT_INTRO = '九劫已過，道果初成。道果沒有上限，只有越來越貴的價錢——這是給走得最遠的人的長路。';

// 本輪統計：s.stats 的累計值減去轉生當下的基準（舊存檔沒有基準時，視為從頭累計，只會更寬鬆）
export const runMs = s => Math.max(0, s.t - (s.run.startT || 0));
export const runStat = (s, k) => Math.max(0, (s.stats[k] || 0) - ((s.run.base && s.run.base[k]) || 0));
// 需要記錄基準的統計欄位
export const RUN_BASE_KEYS = ['incidents', 'endures', 'expeditions'];
