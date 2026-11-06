# 破廟宗主

純 HTML + CSS + ES Modules 的放置遊戲，不需打包。

## 執行
ES Modules 在 `file://` 會被瀏覽器擋，請用本機伺服器：

```bash
npx serve .
```

測試／調數值：網址加 `?speed=10`（遊戲時間 10 倍速）。加 `?perf` 會每 5 秒在 console 印出 render／tick 的平均與最大耗時（25 位弟子、15 位仇人時每幀約 0.4～0.8ms，不需優化）。Console 可用 `__game.state` 直接改資源。

```bash
node tests/run.mjs           # 核心邏輯測試（保底、成本、連鎖、tick 線性…）；或 npm test
node tests/invariants.mjs 1 12   # 核心壓力：機器人連續多輪轉生，檢查不變量與存檔往返（有問題時結束碼非 0）；npm run test:invariants
node tests/e2e/run.mjs       # 瀏覽器端到端（桌面＋手機）：版面溢出掃描與全操作覆蓋；需 npm i -D playwright，未安裝會略過；npm run test:e2e
node tests/sim.mjs 40       # 平衡模擬器：貪婪機器人跑 40 小時，印出各里程碑時間
node tests/sim.mjs 40 passive   # 同上但完全不打坐（純掛機）
node tests/sim.mjs 40 active rebirth   # 化神後自動轉生並購買道心，印出每一輪耗時
node tests/sim.mjs 12 equip branch commission insight smart   # 開啟新功能的最佳化機器人（裝備法寶、弟子進階、領委託、領悟專長心得、用「補滿空位」派駐）
ELEMENT=0 node tests/sim.mjs 12   # 關閉五行相生相剋／克制當比較基準；SHENG/KE/ENEMY_BEAT 可覆寫數值；SEED 指定亂數種子
```

調數值時先跑 sim。單一亂數種子結果雜訊很大（同設定化神耗時可差 ±20%），比較設定請多種子取平均。
目前節奏（16 種子平均，機器人偏樂觀）：首次引爆約 15 分；首輪到化神約 **3.7 小時**（含打坐、機器人隨手把弟子塞進第一個空位）；**會依專長／五行派駐的玩家（`smart`，用「補滿空位」）約 2.2～2.5 小時**——專長相符 ×2 原本就是最大的玩家技巧差距。之後每輪轉生約 2 小時、道心約 50。
新功能各自對首輪到化神的影響（最佳化機器人上限）：法寶裝備 −2%、弟子進階 −3%、宗門委託 −7%、五行相生相剋 −5%、專長心得 −2%，仇人五行克制幾乎無影響；全開約 −20%（smart 派駐基準 2.49 → 1.90）。
注意：16 種子平均本身有約 ±6% 的雜訊（關閉效果但保持啟用，與完全停用就差 5%；曾有一次 16 種子量到 −11% 但 48 種子下為 0），要下結論請用 48 種子（約 1 分鐘）。補滿空位的建築價值加權（`config.assignValue`）與等權在 48 種子下無顯著差異。
宗門委託對平衡很敏感：早期靈石獎勵下限（`stoneMin`）若設 20（早期突破只要 4 靈石），化神會快 13～19%，現為 4。