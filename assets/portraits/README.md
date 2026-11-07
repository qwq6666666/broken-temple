# 弟子立繪

把立繪放在這個資料夾，再到 `src/data/portraits.js` 加一行對應（弟子 id → 路徑）即可，不需要改程式：

```js
export const PORTRAITS = {
  luoshen: 'assets/portraits/luoshen.png',
};
```

- 建議 **正方形**（512×512 或 1024×1024），人物置中；方塊牌與彈出面板都用同一張（以 `object-fit: cover` 裁切，臉請放在畫面上半部）。
- 檔案載入失敗時會自動退回 emoji，不會出現破圖。
- 弟子 id 見 `src/data/disciples.js`。
