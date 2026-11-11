// UR 專屬機制的啟用判斷：該 UR 弟子派駐在任一建築中
export const urActive = (s, defId) => s.disciples.some(d => d.defId === defId && d.at);
