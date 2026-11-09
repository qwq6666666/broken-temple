// 勢力：威望、階級與獎勵、可能回頭的仇人。
import { FACTIONS, FACTION_TIERS, FACTION_RULES as R } from '../data/factions.js';
import { specText } from '../data/specs.js';
import { repOf, tierOf } from '../core/factions.js';
import { esc, crow } from './dom.js';

export function factionPanel(s, ui) {
  const idle = [];
  const rows = FACTIONS.map(f => {
    const rep = repOf(s, f.id), tier = tierOf(s, f.id), next = R.thresholds[tier], prev = tier ? R.thresholds[tier - 1] : 0;
    const pct = next ? Math.floor((rep - prev) / (next - prev) * 100) : 100;
    const step = (n, txt) => `<small class="${tier >= n ? 'gold' : 'dim'}">${tier >= n ? '✔' : '○'} ${esc(FACTION_TIERS[n])}（${R.thresholds[n - 1]}）：${esc(txt)}</small>${tier >= n && f.tierLines?.[n] ? `<small class="dim storytext">「${esc(f.tierLines[n])}」</small>` : ''}`;
    const detail = `${f.lore ? `<small class="storytext">${esc(f.lore)}</small>` : ''}<small class="dim">${esc(f.desc)}　來訪者多為：${esc((f.lean || []).join('、'))}</small>
        ${step(1, `打他們的人，獎勵 +${Math.round(R.tier1Reward * 100)}%`)}
        ${step(2, '被碾壓的人更常「求和」；並有機會派人「進貢」')}
        ${step(3, `永久加成：${specText(f.perk)}；求和賠禮 ×2`)}`;
    if (!rep) { idle.push({ f, detail }); return ''; }                    // 還沒接觸的勢力收進同一列
    return crow(ui, { key: 'f' + f.id, cls: '', icon: f.emoji, title: `<b>${esc(f.name)}</b>`, badges: ` <span class="tag ${tier ? 'gold' : ''}">${esc(FACTION_TIERS[tier])}</span>`,
      sub: `<small class="dim">威望 ${rep}${next ? ' / ' + next : '（已滿）'}</small><div class="gbar"><div style="width:${pct}%"></div></div>`, detail });
  }).join('') + (idle.length ? crow(ui, { key: 'fidle', cls: 'dimmed', icon: '🏴', title: `<b>尚未接觸的勢力 ${idle.length} 個</b>`, sub: esc(idle.map(x => x.f.name).join('、')),
    detail: idle.map(x => `<div class="idlef"><b>${x.f.emoji} ${esc(x.f.name)}</b>${x.detail}</div>`).join('') }) : '');
  const back = s.returners.length ? `<p class="hint">🔙 有 <b>${s.returners.length}</b> 位被你碾壓過的仇人，可能回頭。</p>` : '';
  return `<p class="hint">碾壓 +2、險勝／當場打臉 +1、收下求和或進貢 +3。同一勢力一次擊敗 3 人以上有「一網打盡」獎勵。</p>${back}${rows}`;
}
