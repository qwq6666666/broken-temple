# 破廟宗主

純 HTML + CSS + ES Modules 的放置遊戲，不需打包。

## 執行
ES Modules 在 `file://` 會被瀏覽器擋，請用本機伺服器：

```bash
npx serve .
```

測試／調數值：網址加 `?speed=10`（遊戲時間 10 倍速）。Console 可用 `__game.state` 直接改資源。

```bash
node tests/run.mjs           # 核心邏輯測試（保底、成本、連鎖、tick 線性…）
node tests/sim.mjs 40       # 平衡模擬器：貪婪機器人跑 40 小時，印出各里程碑時間
node tests/sim.mjs 40 passive   # 同上但完全不打坐（純掛機）
```

調數值時先跑 sim：目前節奏（機器人，偏樂觀）約為 首次引爆 15 分、煉氣九層 1.1 小時、化神 5.4 小時（含打坐）／9.7 小時（純掛機）。

## 結構
- `src/core/`：遊戲邏輯（零 DOM），`loop.js` 為固定 100ms tick（以時間差累積，背景分頁回來會補算）
- `src/ui/`：畫面與演出
- `src/data/`：建築、境界、弟子、仇人、台詞、法寶等資料
- `src/config.js`：所有平衡參數（成本係數、保底、蓄力、連鎖、訪客頻率、判定門檻…）

## 想調整時改哪裡
| 想改 | 檔案 |
|---|---|
| 建築成本／產出／外觀 | `data/buildings.js`、`config.js`（costGrowth） |
| 境界倍率、突破成本 | `config.js` 的 `realm` |
| 抽卡機率、保底 | `data/gachaRates.js`、`config.js` 的 `gacha` |
| 新增弟子 | `data/disciples.js` |
| 新增性格／台詞 | `data/visitors.js`、`data/lines.js` |
| 蓄力、偽裝、連鎖、碾壓門檻 | `config.js` 的 `conceal`／`burst` |
| 仇人獎勵 | `data/enemies.js` |
| 功法／法寶 | `data/artifacts.js` |

## 範圍
此版為 M5b：建築、境界、弟子抽卡、忍・藏・爆。尚未實作：存檔、離線收益、轉生（道心僅預留）、成就、音效、付費。
