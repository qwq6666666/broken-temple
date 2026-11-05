// 秘境：選秘境 → 選隊員（最多 3 位）→ 出發；到期後領取。
import { EXPEDITIONS, EXPEDITIONS_BY_ID, EXP_RULES as R, reqLines } from '../data/expeditions.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES } from '../data/gachaRates.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { REALMS } from '../data/realms.js';
import { slotCount, isUnlocked, freeDisciples, successChance, teamPower, reqCheck, bestTeam, memberScore } from '../core/expeditions.js';
import { fmt } from '../core/format.js';
import { esc, crow } from './dom.js';

const rewardText = rw => [rw.qiSec && '✨靈氣', rw.stoneSec && '💎靈石', rw.token && `🎫${rw.token}`, rw.shard && `🧩${rw.shard}`, rw.artifact && `法寶${Math.round(rw.artifact * 100)}%`, rw.recruit && `弟子${Math.round(rw.recruit * 100)}%`].filter(Boolean).join('　');
const wantText = w => [w.specialty && `專長：${w.specialty}`, w.element && `五行：${w.element}`].filter(Boolean).join('、');

const reqTags = (s, e, uids) => {
  const items = reqCheck(s, e, uids).items;
  return items.map(i => `<span class="tag ${i.ok ? 'gold' : 'red'}">${i.ok ? '✔' : '✘'} ${esc(i.text)}</span>`).join(' ');
};

export function expeditionPanel(s, ui) {
  const slots = slotCount(s), used = s.expeditions.length;
  const teamEmoji = x => x.uids.map(u => s.disciples.find(d => d.uid === u)).filter(Boolean).map(d => DISCIPLES_BY_ID[d.defId].emoji).join('');
  // 待領取排最上面；進行中顯示進度條（5% 一格，避免每秒重繪害按鈕點不到）
  const idx = s.expeditions.map((x, i) => i), doneIdx = idx.filter(i => s.expeditions[i].status === 'done'), runIdx = idx.filter(i => s.expeditions[i].status !== 'done');
  const doneRows = doneIdx.map(i => {
    const x = s.expeditions[i], e = EXPEDITIONS_BY_ID[x.id], r = x.result;
    const got = [r.qi && `✨${fmt(r.qi)}`, r.stone && `💎${fmt(r.stone)}`, r.token && `🎫${r.token}`, r.shard && `🧩${r.shard}`, r.artifactId && `${ARTIFACTS_BY_ID[r.artifactId].emoji}${esc(ARTIFACTS_BY_ID[r.artifactId].name)}`, r.recruit && '🙋 一位弟子'].filter(Boolean).join('　');
    return crow(ui, { key: 'xd' + i, cls: `done ${x.success ? '' : 'failed'}`, icon: e.emoji, title: `<b>${esc(e.name)}</b>`,
      badges: ` <span class="tag ${x.success ? 'gold' : 'red'}">${x.success ? '探索成功' : '探索失敗'}</span> ${teamEmoji(x)}`, sub: got,
      act: `<button class="btn primary" data-act="expClaim" data-i="${i}">領取</button>` });
  }).join('');
  const runRows = runIdx.map(i => {
    const x = s.expeditions[i], e = EXPEDITIONS_BY_ID[x.id];
    const pct = Math.min(100, Math.max(0, Math.floor((s.t - x.startAt) / (x.endAt - x.startAt) * 20) * 5));
    const mins = Math.max(1, Math.ceil((x.endAt - s.t) / 60000));
    return crow(ui, { key: 'xr' + i, icon: e.emoji, title: `<b>${esc(e.name)}</b> ${teamEmoji(x)}`,
      sub: `<div class="gbar"><div style="width:${pct}%"></div></div><small class="dim">約 ${mins} 分鐘後完成・成功率 ${Math.round(x.chance * 100)}%</small>` });
  }).join('');
  const claimAll = doneIdx.length > 1 ? `<div class="dtools"><button class="btn primary" data-act="expClaimAll">全部領取（${doneIdx.length}）</button></div>` : '';

  // 秘境清單：列上直接顯示「最佳隊伍的預估成功率」與限制
  const picked = ui.expPick, team = (ui.expTeam || []).filter(u => s.disciples.some(d => d.uid === u));
  const realms = EXPEDITIONS.map(e => {
    const open = isUnlocked(s, e), sel = picked === e.id;
    let sub;
    if (!open) sub = `需突破至 ${esc(REALMS[e.unlockRealm].name)}`;
    else {
      const bt = bestTeam(s, e.id), lines = reqLines(e);
      sub = `${bt ? `預估成功率 <b class="gold">${Math.round(bt.chance * 100)}%</b>` : '<span class="red">目前湊不出合法隊伍</span>'}${lines.length ? `・限制：${esc(lines.join('、'))}` : ''}`;
    }
    return crow(ui, { key: 'e' + e.id, cls: `${sel ? 'sel' : ''} ${open ? '' : 'locked'}`, icon: open ? e.emoji : '🔒',
      title: `<b>${esc(e.name)}</b> <small class="dim">${e.minutes} 分鐘・難度 ${e.difficulty}</small>`, sub,
      act: open ? `<button class="btn ${sel ? 'primary' : ''}" data-act="expPick" data-id="${e.id}">${sel ? '選擇中' : '派遣'}</button>` : '',
      detail: open ? `<small>${esc(e.desc)}</small><small class="dim">推薦 ${esc(wantText(e.want))}（相合者貢獻更高）</small><small>獎勵：${rewardText(e.reward)}</small>` : '' });
  }).join('');

  // 組隊：限制逐條打勾、推薦隊伍、候選依貢獻排序（相合者標色）
  let teamBox = '';
  if (picked && EXPEDITIONS_BY_ID[picked] && isUnlocked(s, EXPEDITIONS_BY_ID[picked])) {
    const e = EXPEDITIONS_BY_ID[picked], free = freeDisciples(s);
    const sorted = [...free].sort((a, b) => memberScore(s, picked, b.uid) - memberScore(s, picked, a.uid));
    const chips = sorted.map(d => {
      const df = DISCIPLES_BY_ID[d.defId], on = team.includes(d.uid), match = (e.want.specialty && df.specialty === e.want.specialty) || (e.want.element && df.element === e.want.element);
      return `<button class="chip-btn ${on ? 'on' : ''} ${match ? 'match' : ''}" style="--rc:${RARITIES[df.rarity].color}" data-act="expToggle" data-uid="${d.uid}">${df.emoji} ${esc(df.name)}<small>Lv${d.lv}・${esc(df.element)}・${esc(df.specialty)}${match ? '・相合' : ''}</small></button>`;
    }).join('') || '<small class="dim">沒有可派遣的弟子（都在探索中，或還沒有弟子）。</small>';
    const rc = reqCheck(s, e, team), legal = team.length && rc.ok, can = legal && used < slots, ch = team.length ? successChance(s, picked, team) : 0;
    const bt = bestTeam(s, picked);
    teamBox = `<div class="teambox"><b>組隊：${esc(e.name)}</b> <small class="dim">（最多 ${R.maxTeam} 位；出發後隊員會從建築撤下）</small>
      ${(e.req ? `<div class="chips">${reqTags(s, e, team)}</div>` : '')}
      <div class="row"><button class="btn" data-act="expAuto" ${bt ? '' : 'disabled'}>⚡ 推薦隊伍${bt ? `（成功率 ${Math.round(bt.chance * 100)}%）` : ''}</button>
        ${team.length ? '<button class="btn mini" data-act="expClear">清空</button>' : ''}</div>
      <div class="chips">${chips}</div>
      <div class="row">${team.length ? `<span>隊伍戰力 <b class="gold">${fmt(teamPower(s, picked, team))}</b> / 難度 ${e.difficulty}　成功率 <b class="gold">${Math.round(ch * 100)}%</b></span>` : '<small class="dim">請選擇隊員，或按「推薦隊伍」</small>'}
        <button class="btn ${can ? 'primary' : ''}" data-act="expGo" ${can ? '' : 'disabled'}>${used >= slots ? '探索位已滿' : team.length && !rc.ok ? '不符合限制' : '出發'}</button></div></div>`;
  }
  return `<p class="hint">🧭 探索位 ${used}/${slots}。派遣中的弟子無法派駐。</p>${claimAll}${doneRows}${runRows}${teamBox}<h3 class="sub">秘境</h3>${realms}`;
}
