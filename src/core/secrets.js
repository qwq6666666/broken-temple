// 弟子隱藏身份：氣運之子（fate）、臥底反間（spy）。身份標在弟子的 tag 欄位，留在宗門就持續生效（不用派駐）。
export const hasTag = (s, tag) => s.disciples.some(d => d.tag === tag);
