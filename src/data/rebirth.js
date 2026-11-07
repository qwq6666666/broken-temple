// 轉生：哪些會重置、哪些會保留。確認視窗的文字與 dao.rebirth 的行為都由這裡產生，避免新增功能後文案過時。
// keys 是頂層狀態欄位（直接帶到下一輪）；res 是保留的資源（符合其一即保留）。
export const REBIRTH_KEEP = [
  { label: '弟子收藏與星級（等級與派駐、進階會重置）', keys: ['disciples', 'dshards', 'nextUid', 'nextGid', 'recruits'] },
  { label: '碎片、功勳、秘境材料', res: k => k === 'shard' || k === 'merit' || k.startsWith('mat_') },
  { label: '功法法寶與裝備', keys: ['artifacts', 'equipped'] },
  { label: '宗門大事、成就與稱號、年表、委託進度、宗門榮耀', keys: ['goalsDone', 'achv', 'chronicle', 'commissions', 'glory', 'weekly'] },
  { label: '專長心得、出戰陣容', keys: ['insight', 'squad'] },
  { label: '秘境探索度與發現事件', keys: ['explore', 'exMile'] },
  { label: '宿敵進度、仇人記憶與老對頭、勢力威望', keys: ['nemeses', 'foes', 'factions'] },
  { label: '抽卡保底、弟子故事、統計與設定', keys: ['gacha', 'stories', 'stats', 'settings', 'unlocked', 'seenIntro', 'offlineLast'] },
  { label: '九重天劫進度與道果', keys: ['ascend'] },
  { label: '道心與商店加成', keys: ['reincarnation'] },
];
export const REBIRTH_RESET = ['靈氣、靈石、招賢令', '境界與建築（含專精）', '弟子等級、派駐與進階', '復仇簿、回頭客與偽裝／蓄力', '進行中的秘境探索與突發事件'];
export const KEEP_KEYS = REBIRTH_KEEP.flatMap(g => g.keys || []);

// 轉生時回到初始值的頂層欄位（t 與 res 另有特殊處理）。新增狀態欄位時，必須歸入 REBIRTH_KEEP 或這裡，測試會檢查。
export const RESET_KEYS = ['t', 'res', 'realmIdx', 'buildings', 'disguise', 'grudges', 'visitor', 'incident', 'tokenAcc', 'endureStreak', 'fame', 'meditateReadyAt', 'run', 'expeditions', 'mutator', 'returners', 'specs', 'tokBuy', 'burstActive'];
