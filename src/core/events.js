// 極簡事件匯流排：core 只負責發事件（toast、quote…），ui 負責訂閱，core 不碰 DOM。
const handlers = {};
export const bus = {
  on(evt, fn) { (handlers[evt] ||= []).push(fn); },
  emit(evt, payload) { (handlers[evt] || []).forEach(fn => fn(payload)); },
};
export const toast = (text, kind = 'info') => bus.emit('toast', { text, kind });
export const quote = text => bus.emit('quote', text);
// 提示音／演出提示：core 只發 cue，ui 決定要不要播（core 不碰音效與 DOM）
export const cue = (name, data) => bus.emit('cue', { name, data });
