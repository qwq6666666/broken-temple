// 秘境：選秘境 → 選隊員（最多 3 位）→ 出發；到期後領取。
import { EXPEDITIONS, EXPEDITIONS_BY_ID, EXP_RULES as R } from '../data/expeditions.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES } from '../data/gachaRates.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { REALMS } from '../data/realms.js';
import { slotCount, isUnlocked, freeDisciples, successChance, teamPower } from '../core/expeditions.js';
import { fmt } from '../core/format.js';
import { esc } from './dom.js';

const rewardText = rw => [rw.qiSec && '✨靈氣', rw.stoneSec && '💎靈石', rw.token && `🎫${rw.token}`, rw.shard && `🧩${rw.shard}`, rw.artifact && `法寶${Math.round(rw.artifact * 100)}%`, rw.recruit && `弟子${Math.round(rw.recruit * 100)}%`].filter(Boolean).join('　');
const wantText = w => [w.specialty && `專長：${w.specialty}`, w.element && `五行：${w.element}`].filter(Boolean).join('、');

export function expeditionPanel(s, ui) {
  const slots = slotCount(s), used = s.expeditions.length;
  // 進行中／待領取（只顯示到「分鐘」，避免每秒重繪害按鈕點不到）
  const list = s.expeditions.map((x, i) => {
    const e = EXPEDITIONS_BY_ID[x.id], team = x.uids.map(u => s.disciples.find(d => d.uid === u)).filter(Boolean).map(d => DISCIPLES_BY_ID[d.defId].emoji).join('');
    if (x.status === 'done') {
      const r = x.result, got = [r.qi && `✨${fmt(r.qi)}`, r.stone && `💎${fmt(r.stone)}`, r.token && `🎫${r.token}`, r.shard && `🧩${r.shard}`, r.artifactId && `${ARTIFACTS_BY_ID[r.artifactId].emoji}${esc(ARTIFACTS_BY_ID[r.artifactId].name)}`, r.recruit && '🙋 一位弟子'].filter(Boolean).join('　');
      return `<div class="card exp done ${x.success ? '' : 'failed'}"><div class="big">${e.emoji}</div><div class="body"><b>${esc(e.name)}</b> <span class="tag ${x.success ? 'gold' : 'red'}">${x.success ? '探索成功' : '探索失敗'}</span> ${team}<br><small>${got}</small></div>
        <div class="act"><button class="btn primary" data-act="expClaim" data-i="${i}">領取</button></div></div>`;
    }
    const mins = Math.max(1, Math.ceil((x.endAt - s.t) / 60000));
    return `<div class="card exp"><div class="big">${e.emoji}</div><div class="body"><b>${esc(e.name)}</b> ${team}<br><small class="dim">探索中，約 ${mins} 分鐘後完成（成功率 ${Math.round(x.chance * 100)}%）</small></div></div>`;
  }).join('');

  // 秘境清單
  const picked = ui.expPick, team = (ui.expTeam || []).filter(u => s.disciples.some(d => d.uid === u));
  const realms = EXPEDITIONS.map(e => {
    const open = isUnlocked(s, e), sel = picked === e.id;
    return `<div class="card exp ${sel ? 'sel' : ''} ${open ? '' : 'locked'}"><div class="big">${open ? e.emoji : '🔒'}</div>
      <div class="body"><b>${esc(e.name)}</b> <small class="dim">${e.minutes} 分鐘・難度 ${e.difficulty}</small><br><small>${open ? esc(e.desc) : `需突破至 ${esc(REALMS[e.unlockRealm].name)}`}</small>
      ${open ? `<br><small class="dim">推薦 ${esc(wantText(e.want))}｜獎勵：${rewardText(e.reward)}</small>` : ''}</div>
      ${open ? `<div class="act"><button class="btn ${sel ? 'primary' : ''}" data-act="expPick" data-id="${e.id}">${sel ? '選擇中' : '派遣'}</button></div>` : ''}</div>`;
  }).join('');

  // 組隊
  let teamBox = '';
  if (picked && EXPEDITIONS_BY_ID[picked] && isUnlocked(s, EXPEDITIONS_BY_ID[picked])) {
    const e = EXPEDITIONS_BY_ID[picked], free = freeDisciples(s);
    const chips = free.map(d => {
      const df = DISCIPLES_BY_ID[d.defId], on = team.includes(d.uid), match = (e.want.specialty && df.specialty === e.want.specialty) || (e.want.element && df.element === e.want.element);
      return `<button class="chip-btn ${on ? 'on' : ''}" style="--rc:${RARITIES[df.rarity].color}" data-act="expToggle" data-uid="${d.uid}">${df.emoji} ${esc(df.name)}<small>Lv${d.lv}${match ? '・相合' : ''}</small></button>`;
    }).join('') || '<small class="dim">沒有可派遣的弟子（都在探索中，或還沒有弟子）。</small>';
    const ch = team.length ? successChance(s, picked, team) : 0, can = team.length && used < slots;
    teamBox = `<div class="teambox"><b>組隊：${esc(e.name)}</b> <small class="dim">（最多 ${R.maxTeam} 位；出發後隊員會從建築撤下）</small>
      <div class="chips">${chips}</div>
      <div class="row">${team.length ? `<span>隊伍戰力 <b class="gold">${fmt(teamPower(s, picked, team))}</b> / 難度 ${e.difficulty}　成功率 <b class="gold">${Math.round(ch * 100)}%</b></span>` : '<small class="dim">請選擇隊員</small>'}
        <button class="btn ${can ? 'primary' : ''}" data-act="expGo" ${can ? '' : 'disabled'}>${used >= slots ? '探索位已滿' : '出發'}</button></div></div>`;
  }
  return `<p class="hint">🧭 秘境探索位 ${used}/${slots}（境界提升可增加）。派遣中的弟子無法派駐建築；離線時探索也會完成。</p>${list}${teamBox}<h3>秘境</h3>${realms}`;
}
