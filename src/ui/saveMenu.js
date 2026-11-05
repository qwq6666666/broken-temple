// 存檔選單：手動存檔、匯出／匯入（JSON 文字）、重置。
import { serialize, parse, save, clearSave } from '../core/save.js';
import { CONFIG } from '../config.js';
import { toast } from '../core/events.js';
import { showModal, closeOverlay } from './overlay.js';

// 重置／匯入後會 reload，要避免 beforeunload 又把舊狀態存回去
export const guard = { noSave: false };

export function saveNow(s) {
  const ok = save(s);
  toast(ok ? '已存檔' : '存檔失敗（瀏覽器可能禁用了儲存）', ok ? 'good' : 'warn');
}

export function openExport(s) {
  showModal(`<h3>匯出存檔</h3><p class="hint">複製下面整段文字，存到記事本；要還原時用「匯入」貼回來。</p>
    <textarea id="savebox" readonly style="width:100%;height:160px;background:#0e1613;color:#efe6d0;border:1px solid #33423b;border-radius:8px;padding:8px">${serialize(s).replace(/</g, '&lt;')}</textarea>
    <button class="btn primary" data-act="copyExport">📋 複製</button>`);
}
export function copyExport() {
  const box = document.getElementById('savebox'); if (!box) return;
  box.select();
  (navigator.clipboard?.writeText(box.value) ?? Promise.reject()).then(() => toast('已複製', 'good'), () => { document.execCommand('copy'); toast('已複製', 'good'); });
}

export function openImport() {
  showModal(`<h3>匯入存檔</h3><p class="hint">貼上先前匯出的文字。<b class="gold">會覆蓋目前進度。</b></p>
    <textarea id="savebox" style="width:100%;height:160px;background:#0e1613;color:#efe6d0;border:1px solid #33423b;border-radius:8px;padding:8px"></textarea>
    <button class="btn primary" data-act="doImport">匯入並重新載入</button>`);
}
export function doImport() {
  const box = document.getElementById('savebox'); if (!box) return;
  try {
    parse(box.value.trim());                       // 先驗證，壞檔不覆蓋現有存檔
    localStorage.setItem(CONFIG.save.key, box.value.trim());
    guard.noSave = true; location.reload();
  } catch (e) { toast('匯入失敗：' + e.message, 'warn'); }
}

export function resetSave() {
  if (!confirm('確定要清除所有進度、重新開始嗎？此動作無法復原。')) return;
  clearSave(); guard.noSave = true; location.reload();
}
export { closeOverlay };
