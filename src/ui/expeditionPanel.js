// 秘境：選秘境 → 選隊員（最多 3 位）→ 出發；到期後領取。
import { MATERIALS, REALM_MATS } from '../data/materials.js';
import { BRANCHES } from '../data/branches.js';
import { EXPLORATION, EX_KEYS } from '../data/exploration.js';
import { exLevel, exXp, exNext, pendingEvents } from '../core/exploration.js';
import { EXPEDITIONS, EXPEDITIONS_BY_ID, EXP_RULES as R, reqLines, matIdOf } from '../data/expeditions.js';
import { DISCIPLES_BY_ID } from '../data/disciples.js';
import { RARITIES } from '../data/gachaRates.js';
import { ARTIFACTS_BY_ID } from '../data/artifacts.js';
import { REALMS, fromLegacy } from '../data/realms.js';
import { slotCount, isUnlocked, freeDisciples, successChance, teamPower, reqCheck, bestTeam, memberScore } from '../core/expeditions.js';
import { fmt } from '../core/format.js';
import { esc, crow } from './dom.js';

const rewardText = (rw, id) => [`${MATERIALS[matIdOf(EXPEDITIONS_BY_ID[id])].icon}${MATERIALS[matIdOf(EXPEDITIONS_BY_ID[id])].name}`, rw.qiSec && '✨靈氣', rw.stoneSec && '💎靈石', rw.artifact && `法寶${Math.round(rw.artifact * 100)}%`, rw.recruit && `弟子${Math.round(rw.recruit * 100)}%`].filter(Boolean).join('　');
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
    const got = [r.qi && `✨${fmt(r.qi)}`, r.stone && `💎${fmt(r.stone)}`, r.mat && `${MATERIALS[r.matId || x.id].icon}${r.mat}`, r.token && `🎫${r.token}`, r.shard && `🧩${r.shard}`, r.artifactId && `${ARTIFACTS_BY_ID[r.artifactId].emoji}${esc(ARTIFACTS_BY_ID[r.artifactId].name)}`, r.recruit && '🙋 一位弟子'].filter(Boolean).join('　');
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
    if (!open) sub = `需突破至 ${esc(REALMS[fromLegacy(e.unlockRealm)].name)}`;
    else {
      const bt = bestTeam(s, e.id), lines = reqLines(e);
      sub = `${bt ? `成功率 <b class="gold">${Math.round(bt.chance * 100)}%</b>` : '<span class="red">湊不出合法隊伍</span>'}${lines.length ? ` <span class="tag" title="${esc(lines.join('、'))}">限制 ${lines.length}</span>` : ''}`;
    }
    return crow(ui, { key: 'e' + e.id, cls: `${sel ? 'sel' : ''} ${open ? '' : 'locked'}`, icon: open ? e.emoji : '🔒',
      title: `<b>${esc(e.name)}</b> <small class="dim">${e.minutes} 分鐘・難度 ${e.difficulty}</small>${open ? exBadge(s, e.id) : ''}`, sub,
      act: open ? `<button class="btn ${sel ? 'primary' : ''}" data-act="expPick" data-id="${e.id}">${sel ? '選擇中' : '派遣'}</button>` : '',
      detail: open ? `<small>${esc(e.desc)}</small>${reqLines(e).length ? `<small>限制：${esc(reqLines(e).join('、'))}</small>` : ''}<small class="dim">推薦 ${esc(wantText(e.want))}（相合者貢獻更高）</small><small>獎勵：${rewardText(e.reward, e.id)}　<span class="dim">${esc(matUse(e.id))}</span></small>` : '' });
  }).join('');

  // 組隊：限制逐條打勾、推薦隊伍、候選依貢獻排序（相合者標色）
  let teamBox = '';
  if (picked && EXPEDITIONS_BY_ID[picked] && isUnlocked(s, EXPEDITIONS_BY_ID[picked])) {
    const e = EXPEDITIONS_BY_ID[picked], free = freeDisciples(s);
    const r0 = e.req || {};
    const helps = d => { const df = DISCIPLES_BY_ID[d.defId]; return !!((r0.anyElement && r0.anyElement.includes(df.element)) || (r0.specialty && df.specialty === r0.specialty)); };
    const isMatch = d => { const df = DISCIPLES_BY_ID[d.defId]; return !!((e.want.specialty && df.specialty === e.want.specialty) || (e.want.element && df.element === e.want.element)); };
    // 符合限制的排前面 → 相合 → 貢獻高
    const sorted = [...free].sort((a, b) => (helps(b) - helps(a)) || (isMatch(b) - isMatch(a)) || memberScore(s, picked, b.uid) - memberScore(s, picked, a.uid));
    const tile = d => {
      const df = DISCIPLES_BY_ID[d.defId], on = team.includes(d.uid), match = isMatch(d);
      return `<button class="etile rar-${df.rarity} ${on ? 'on' : ''} ${match ? 'match' : ''}" style="--rc:${RARITIES[df.rarity].color}" data-act="expToggle" data-uid="${d.uid}" aria-pressed="${on}" aria-label="${esc(df.name)}，${esc(df.element)}系${esc(df.specialty)}，等級 ${d.lv}${match ? '，相合' : ''}">
        <span class="eem">${df.emoji}</span><span class="enm">${esc(df.name)}</span><span class="eel e-${esc(df.element)}">${esc(df.element)}</span>
        <span class="elv"><small>Lv</small>${d.lv}</span><span class="esp">${esc(df.specialty.slice(0, 1))}</span>${match ? '<span class="emt" title="相合：貢獻更高">✦</span>' : ''}${on ? '<span class="eck">✓</span>' : ''}</button>`;
    };
    const need = sorted.filter(helps), rest = sorted.filter(d => !helps(d)), split = need.length && rest.length;
    const group = (title, list) => list.length ? `${title ? `<small class="egroup">${title}（${list.length}）</small>` : ''}<div class="etiles">${list.map(tile).join('')}</div>` : '';
    const chips = free.length ? (split ? group('✔ 符合限制的弟子', need) + group('其他弟子', rest) : group('', sorted)) : '<small class="dim">沒有可派遣的弟子（都在探索中，或還沒有弟子）。</small>';
    const rc = reqCheck(s, e, team), legal = team.length && rc.ok, can = legal && used < slots, ch = team.length ? successChance(s, picked, team) : 0;
    const bt = bestTeam(s, picked);
    const slotsHtml = Array.from({ length: R.maxTeam }, (_, i) => {
      const d = s.disciples.find(x => x.uid === team[i]), df = d && DISCIPLES_BY_ID[d.defId];
      return d ? `<button class="tslot full" style="--rc:${RARITIES[df.rarity].color}" data-act="expToggle" data-uid="${d.uid}" title="點一下移出隊伍" aria-label="移出 ${esc(df.name)}">${df.emoji}<b>${esc(df.name)}</b><small>Lv${d.lv}・${esc(df.element)}${esc(df.specialty.slice(0, 1))}</small></button>` : '<span class="tslot empty">空位</span>';
    }).join('');
    teamBox = `<div class="teambox"><div class="teambar">
      <div class="tbtop"><b>組隊：${esc(e.name)}</b><span class="tbacts"><button class="btn mini" data-act="expAuto" ${bt ? '' : 'disabled'}>⚡ 推薦${bt ? ` ${Math.round(bt.chance * 100)}%` : ''}</button>${team.length ? '<button class="btn mini" data-act="expClear">清空</button>' : ''}</span></div>
      <div class="tslots">${slotsHtml}</div>
      ${e.req ? `<div class="chips">${reqTags(s, e, team)}</div>` : ''}
      <div class="tbgo">${team.length ? `<span class="tbstat">戰力 <b class="gold">${fmt(teamPower(s, picked, team))}</b> / 難度 ${e.difficulty}　成功率 <b class="gold">${Math.round(ch * 100)}%</b></span>` : '<small class="dim">選隊員，或按「推薦」</small>'}
        <button class="btn ${can ? 'primary' : ''}" data-act="expGo" ${can ? '' : 'disabled'}>${used >= slots ? '探索位已滿' : team.length && !rc.ok ? '不符合限制' : '出發'}</button></div></div>
      <small class="dim">最多 ${R.maxTeam} 位；出發後隊員會從建築撤下。右上＝五行　左下＝專長（劍／丹／陣／農／體）　✦＝相合（貢獻更高）</small>
      ${chips}</div>`;
  }
  return `${pendingBox(ui, s)}<p class="hint">🧭 探索位 ${used}/${slots}。派遣中的弟子無法派駐。</p>${claimAll}${doneRows}${runRows}${teamBox}${realms}`;
}

// ── 探索度 ──
const exBadge = (s, id) => { const lv = exLevel(s, id), nx = exNext(s, id); return ` <span class="tag ${lv ? 'gold' : ''}" title="探索成功累積 ${exXp(s, id)} 次；每升一級解鎖一則發現事件，且該秘境獎勵 +10%">探索 Lv${lv}${nx ? (exXp(s, id) ? ` ${exXp(s, id)}/${nx}` : '') : '・圓滿'}</span>`; };
function pendingBox(ui, s) {
  const list = pendingEvents(s); if (!list.length) return '';
  return `<div class="exfind"><b class="gold">📜 新的發現（${list.length}）</b>` + list.map(({ id, lv }) => {
    const e = EXPEDITIONS_BY_ID[id], D = EXPLORATION[id], t = D['t' + lv], pk = EX_KEYS[D.key];
    const btns = lv === 2
      ? `<button class="btn" data-act="exResolve" data-id="${id}" data-lv="2" data-c="a">A 立即資源（${esc(rewardPreview(D.reward2a))}）</button> <button class="btn primary" data-act="exResolve" data-id="${id}" data-lv="2" data-c="b">B 永久${esc(pk)} +1%</button>`
      : `<button class="btn primary" data-act="exResolve" data-id="${id}" data-lv="${lv}">${lv === 3 ? `收下（永久${esc(pk)} +1%）` : `收下（${esc(rewardPreview(D.reward1))}）`}</button>`;
    return `<div class="exev"><div>${e.emoji} <b>${esc(e.name)}・${esc(t[0])}</b><br><small class="storytext">${esc(t[1])}</small></div><div class="row">${btns}</div></div>`;
  }).join('') + '</div>';
}
const rewardPreview = r => Object.entries(r).map(([k, v]) => ({ merit: `🏅${v}`, shard: `🧩${v}`, token: `🎫${v}`, qiSec: `✨${v}秒產出`, stoneSec: `💎${v}秒產出` }[k])).join(' ');

// 這個秘境的材料拿來做什麼
function matUse(id) {
  const k = 'mat_' + matIdOf(EXPEDITIONS_BY_ID[id]), uses = [];
  for (const [i, c] of Object.entries(REALM_MATS)) if (c[k]) uses.push(`突破到${REALMS[fromLegacy(+i)].name}`);
  for (const b of Object.values(BRANCHES)) if (b.cost[k]) uses.push(`弟子進階「${b.name}」`);
  return uses.length ? `材料用途：${uses.join('、')}` : '';
}
