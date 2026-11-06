// 弟子頭像：有立繪就疊在 emoji 上（載入失敗時移除圖片，露出底下的 emoji）。
import { PORTRAITS } from '../data/portraits.js';
import { esc } from './dom.js';

export const portraitHtml = df =>
  `<span class="pe">${df.emoji}</span>${PORTRAITS[df.id] ? `<img class="pi" src="${esc(PORTRAITS[df.id])}" alt="" loading="lazy" onerror="this.remove()">` : ''}`;
