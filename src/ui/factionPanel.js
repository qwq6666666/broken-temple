// 勢力：威望、階級與獎勵、可能回頭的仇人。
import { FACTIONS, FACTION_TIERS, FACTION_RULES as R } from '../data/factions.js';
import { specText } from '../data/specs.js';
import { repOf, tierOf } from '../core/factions.js';
import { esc, crow } from './dom.js';

export function factionPanel(s, ui) {
  const rows = FACTIONS.map(f => {
    const rep = repOf(s, f.id), tier = tierOf(s, f.id), next = R.thresholds[tier], prev = tier ? R.thresholds[tier - 1] : 0;
    const pct = next ? Math.floor((rep - prev) / (next - prev) * 100) : 100;
    const step = (n, txt) => `<small class="${tier >= n ? 'gold' : 'dim'}">${tier >= n ? '✔' : '○'} ${esc(FACTION_TIERS[n])}（${R.thresholds[n - 1]}）：${esc(txt)}</small>`;
    const detail = `<small class="dim">${esc(f.desc)}</small>
        ${step(1, `打他們的人，獎勵 +${Math.round(R.tier1Reward * 100)}%`)}
        ${step(2, '被碾壓的人更常「求和」而不是復仇')}
        ${step(3, `永久加成：${specText(f.perk)}；求和賠禮 ×2`)}`;
    return crow(ui, { key: 'f' + f.id, cls: rep ? '' : 'dimmed', icon: f.emoji, title: `<b>${esc(f.name)}</b>`, badges: ` <span class="tag ${tier ? 'gold' : ''}">${esc(FACTION_TIERS[tier])}</span>`,
      sub: `<small class="dim">威望 ${rep}${next ? ' / ' + next : '（已滿）'}</small><div class="gbar"><div style="width:${pct}%"></div></div>`, detail });
  }).join('');
  const back = s.returners.length ? `<p class="hint">🔙 有 <b>${s.returners.length}</b> 位被你碾壓過的仇人，可能回頭。</p>` : '';
  return `<p class="hint">碾壓 +2、險勝／當場打臉 +1、收下求和 +3。</p>${back}${rows}`;
}
