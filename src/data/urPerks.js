// UR 專屬機制：派駐中才生效（弟子 id → 名稱與說明）。效果寫在對應的 core 模組（endure／burst／economy／offline）。
export const UR_PERKS = {
  luoshen:  { name: '星河護幕', desc: '超載區的露餡機率 −50%' },
  xuantian: { name: '一劍破局', desc: '每次引爆，最強的非宿敵仇人判定升一階（險勝→碾壓、不敵→險勝）' },
  taixu:    { name: '丹成',     desc: '每次引爆後 15 分鐘，靈氣產出再 +20%' },
  cangwu:   { name: '古木庇護', desc: '離線效率 +10%（仍受上限）' },
  zhenyue:  { name: '不動如山', desc: '長老反噬無效；標記失敗不扣靈石、不變警覺' },
  guixu:    { name: '潮汐',     desc: '每次引爆後，下一位訪客必為稀有類型（長老或商隊）' },
};
