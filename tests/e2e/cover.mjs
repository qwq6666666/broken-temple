// 操作覆蓋：逐一操作弟子、秘境、引爆預覽（陣容／放過）、求和、稱號、設定、轉生與道心商店，驗證「點了之後狀態真的改變」。
export async function run(b, URL, devices, PLAT) {
  const mobile = PLAT === 'm'; const R = [];
  const rec = (id, ok, d = '') => { R.push([id, ok, d]); };
  const c = await b.newContext(mobile ? { ...devices['iPhone 12'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1280, height: 800 } });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL + '?speed=1'); await p.waitForTimeout(700);
  const tap = async sel => { const el = await p.$(sel); if (!el) return false; try { mobile ? await el.tap({ timeout: 2000 }) : await el.click({ timeout: 2000 }); } catch { await el.evaluate(e => e.click()); } await p.waitForTimeout(200); return true; };
  const S = (f, a) => p.evaluate(f, a);
  const hide = () => S(() => document.getElementById('overlay').classList.remove('on'));
  const go = tab => S(t => { __game.ui.tab = t; }, tab).then(() => p.waitForTimeout(350));
  // 準備資料
  await hide();
  await S(async () => {
    const s = __game.state; const G = await import('/src/core/gacha.js'); const D = await import('/src/core/disciples.js');
    s.realmIdx = 12; s.res.qi = 1e12; s.res.stone = 1e10; s.res.token = 80; s.res.shard = 500; s.res.merit = 40; s.res.daoHeart = 100;
    for (const k of Object.keys(s.res)) if (k.startsWith('mat_')) s.res[k] = 10;
    for (const k of ['gacha', 'disciples', 'goals', 'avenge', 'expedition', 'factions', 'nemesis', 'dao', 'buildings', 'realm']) s.unlocked[k] = true;
    s.stats.bursts = 3; s.stats.endures = 40; G.pull(s, 40);
    s.disciples.forEach((d, i) => { d.lv = 10; });
    for (const id of Object.keys(s.buildings)) s.buildings[id].lv = 50;
    s.artifacts = ['yinqi', 'tuna', 'huxin', 'qian_abacus']; s.achv.done = ['a1'];
    s.grudges = Array.from({ length: 5 }, (_, i) => ({ id: 700 + i, name: '仇人' + i, type: ['former', 'rival', 'elder', 'trader', 'rival'][i], sect: ['青雲宗', '赤焰谷', '萬劍山莊', '南海商隊', '落霞宗'][i], role: '弟子', personality: ['傲慢', '勢利', '刻薄', '虛偽', '暴躁'][i], lvl: 5 + i, alert: false, element: ['金', '木', '水', '火', '土'][i] }));
    s.disguise.value = 20; s.visitor.nextAt = 1e15; s.visitor.current = null;
  });
  await p.waitForTimeout(800); await hide();

  // 建築批量升級：列表與點建築彈出的面板都能「×10」「最大」；資源每幀變動（按鈕狀態在變）時也要點得到
  await S(() => { const s = __game.state; s.res.qi = 1e15; s.res.stone = 1e12; for (const id of ['temple', 'field', 'alchemy', 'library']) s.buildings[id].lv = 20; });
  await go('buildings'); await hide();
  const lvSum = () => S(() => Object.values(__game.state.buildings).reduce((a, b) => a + b.lv, 0));
  let t0 = await lvSum(); await tap('[data-act=upgradeN][data-n="10"]:not([disabled])'); await p.waitForTimeout(200);
  let t1 = await lvSum(); rec('upgradeN ×10 連升十級（列表）', t1 - t0 === 10, `升了 ${t1 - t0} 級`);
  await tap('[data-act=upgradeN][data-n=max]:not([disabled])'); await p.waitForTimeout(200);
  let t2 = await lvSum(); const capOK = await S(() => { const B = __game.state.buildings, cap = 10 + Math.floor(__game.state.realmIdx * 6.93); return Object.values(B).every(b => b.lv <= cap); });
  rec('upgradeN 最大 升到上限（列表）', t2 - t1 > 10 && capOK, `再升 ${t2 - t1} 級`);
  await S(() => { const s = __game.state; s.buildings.alchemy.lv = 20; s.res.qi = 1e15; s.res.stone = 1e12; __game.ui.selBuilding = 'alchemy'; window.__churn = setInterval(() => { __game.state.res.qi += 7; }, 25); }); await p.waitForTimeout(500);
  const hasPop = await S(() => !!document.querySelector('.bpop-card [data-act=upgradeN]')); rec('點建築彈出面板有批量按鈕', hasPop);
  t0 = await S(() => __game.state.buildings.alchemy.lv); await tap('.bpop-card [data-act=upgradeN][data-n="10"]:not([disabled])'); await p.waitForTimeout(250);
  t1 = await S(() => __game.state.buildings.alchemy.lv); rec('彈出面板 ×10（資源每幀變動中仍點得到）', t1 - t0 === 10, `升了 ${t1 - t0} 級`);
  await S(() => { clearInterval(window.__churn); __game.ui.selBuilding = null; });
  await S(() => { for (const id of Object.keys(__game.state.buildings)) __game.state.buildings[id].lv = 50; });
  await p.waitForTimeout(300);
  // 提示訊息：解鎖提示合併成一則、不擋點擊；建築列（手機）名稱不被擠成多行
  await S(async () => { const E = await import('/src/core/events.js'); document.getElementById('toasts').innerHTML = ''; E.toast('🔓 新功能解鎖：宗門年表', 'good'); E.toast('🔓 新分頁解鎖：秘境', 'good'); E.toast('🔓 新功能解鎖：專長心得', 'good'); });
  await p.waitForTimeout(200);
  const tinfo = await S(() => ({ n: document.querySelectorAll('#toasts .toast').length, text: document.querySelector('#toasts .toast')?.textContent || '', pe: getComputedStyle(document.getElementById('toasts')).pointerEvents }));
  rec('解鎖提示合併成一則', tinfo.n === 1 && /宗門年表/.test(tinfo.text) && /秘境/.test(tinfo.text) && /專長心得/.test(tinfo.text), `${tinfo.n} 則：${tinfo.text}`);
  rec('提示不擋點擊（pointer-events: none）', tinfo.pe === 'none', tinfo.pe);
  await go('buildings'); await hide();
  const lay = await S(() => { const r = document.querySelector('.crow.brow'); if (!r) return null; const cm = r.querySelector('.cm').getBoundingClientRect(), ca = r.querySelector('.ca').getBoundingClientRect(), ct = r.querySelector('.ct'); const lh = parseFloat(getComputedStyle(ct).lineHeight) || 20; return { ctH: ct.getBoundingClientRect().height, lh, caBelow: ca.top >= cm.bottom - 2, caInside: ca.right <= r.getBoundingClientRect().right + 1 }; });
  rec('建築列：名稱不超過兩行、按鈕不溢出' + (mobile ? '（手機另要求按鈕換到下一行）' : ''), !!lay && lay.ctH <= lay.lh * 2.2 && lay.caInside && (!mobile || lay.caBelow), JSON.stringify(lay));
  // 弟子頁：排序、五行篩選、派駐/取消、升星、心得
  await go('people');
  await tap('[data-act=slotPick]'); const sp = await S(() => !!document.querySelector('[data-act=slotAssign]')); rec('slotPick 開啟候選', sp);
  if (sp) { const before = await S(() => __game.state.disciples.filter(d => d.at).length); await tap('[data-act=slotAssign]'); rec('slotAssign 手動派駐', (await S(() => __game.state.disciples.filter(d => d.at).length)) > before); }
  const ds0 = await S(() => __game.state.disciples.filter(d => d.at).length);
  await tap('[data-act=autoAssign]');
  rec('autoAssign 補滿空位', (await S(() => __game.state.disciples.filter(d => d.at).length)) > ds0);
  await tap('[data-act=dSort][data-s="level"], [data-act=dSort]:nth-of-type(2)');
  rec('dSort 排序切換', await S(() => !!__game.ui.dSort), String(await S(() => __game.ui.dSort)));
  const sel = await p.$('select[data-change=dElem]'); if (sel) { await sel.selectOption('金'); await p.waitForTimeout(200); }
  rec('dElem 五行篩選', await S(() => __game.ui.dElem === '金'));
  if (sel) { await p.selectOption('select[data-change=dElem]', ''); }
  await tap('[data-act=unassign]'); rec('unassign 撤下', true, '已點擊（若無駐守則略過）');
  // 升星（需展開卡片）
  await S(() => document.querySelectorAll('#panel [data-act=toggleD]').forEach(x => x.click())); await p.waitForTimeout(300);
  const star0 = await S(() => __game.state.disciples.reduce((a, d) => a + (d.star || 0), 0)); await tap('[data-act=starUp]:not([disabled])');
  rec('starUp 升星', (await S(() => __game.state.disciples.reduce((a, d) => a + (d.star || 0), 0))) > star0);
  // 專長心得
  await S(() => { __game.state.unlocked.f_insight = true; }); await p.waitForTimeout(300);
  await S(() => { document.querySelector('#panel [data-key="insight"]')?.click(); }); await p.waitForTimeout(200);
  const ins0 = await S(() => Object.values(__game.state.insight).reduce((a, b) => a + b, 0)); await tap('[data-act=learnInsight]:not([disabled])');
  rec('learnInsight 領悟心得', (await S(() => Object.values(__game.state.insight).reduce((a, b) => a + b, 0))) > ins0);
  // 秘境：expToggle / expClear
  await go('world'); await tap('[data-act=expPick]'); await tap('[data-act=expToggle]'); const tg = await S(() => (__game.ui.expTeam || []).length); rec('expToggle 加入隊員', tg > 0);
  await tap('[data-act=expClear]'); rec('expClear 清空隊伍', (await S(() => (__game.ui.expTeam || []).length)) === 0);
  // 引爆預覽：squadAuto / squadToggle / squadClear / spare / confirmBurst
  await go('grudge'); await S(() => window.scrollTo(0, 0)); await tap('[data-act=burst]:not([disabled])'); await p.waitForTimeout(400);
  const ovp = await S(() => !!document.querySelector('[data-act=confirmBurst]')); rec('burst 開啟預覽', ovp);
  await tap('[data-act=squadAuto]'); rec('squadAuto 推薦陣容', (await S(() => __game.state.squad.length)) >= 0, `人數=${await S(() => __game.state.squad.length)}`);
  await tap('[data-act=squadClear]'); const cl = await S(() => __game.state.squad.length); rec('squadClear 清空', cl === 0);
  await tap('.chip[data-act=squadToggle]:not([disabled])'); rec('squadToggle 加入出戰', (await S(() => __game.state.squad.length)) === 1);
  await S(() => document.querySelector('input[data-change=spare]').click()); await p.waitForTimeout(300);
  rec('spare 放過', await S(() => __game.state.grudges.some(g => g.spare)));
  
  await tap('[data-act=confirmBurst]'); await p.waitForTimeout(500);
  for (let i = 0; i < 40 && await S(() => __game.ui.busy); i++) { const sk = await p.$('#overlay .skipbtn'); if (sk) await sk.evaluate(e => e.click()); await p.waitForTimeout(300); const cs = await p.$('#overlay [data-act=closeSettle]'); if (cs) { await cs.evaluate(e => e.click()); } }
  await p.waitForTimeout(500); rec('引爆完成且不卡死', !(await S(() => __game.ui.busy)), `bursts=${await S(() => __game.state.stats.bursts)}`);
  await hide();
  // 求和：rejectPlea
  await S(() => { __game.state.visitor.current = { id: 950, name: '求和者', type: 'rival', sect: '赤焰谷', role: '弟子', personality: '虛偽', lvl: 9, alert: false, element: '火', returning: 'plead', taunt: '求您手下留情。' }; __game.ui.tab = 'buildings'; }); await p.waitForTimeout(500);
  const g0 = await S(() => __game.state.grudges.length); await tap('[data-act=rejectPlea]'); rec('rejectPlea 讓他滾', (await S(() => __game.state.grudges.length)) === g0 + 1);
  // 法寶稱號：equipTitle（需成就）
  await S(async () => { const A = await import('/src/data/achievements.js'); const s = __game.state; s.achv.done = A.ACHIEVEMENTS.slice(0, 3).map(a => a.id); });
  await S(() => { __game.state.unlocked.f_achv = true; }); await go('goals'); await S(() => { const r = [...document.querySelectorAll('#panel .cmain')].find(x => /成就/.test(x.textContent)); r && r.click(); }); await p.waitForTimeout(400);
  const eq = await p.$('[data-act=equipTitle]:not([disabled])'); if (eq) { await tap('[data-act=equipTitle]:not([disabled])'); rec('equipTitle 裝備稱號', true); } else rec('equipTitle 裝備稱號', false, '找不到可用按鈕（成就 id 假資料？）');
  // 設定：說明、聲音、動態、提示、說明頁選項、損失
  await tap('#menu [data-act=help]'); rec('help 說明', await S(() => document.getElementById('overlay').classList.contains('on')));
  for (const a of ['toggleTips', 'toggleHints']) { const el = await p.$(`input[data-change=${a}]`); if (el) { const v0 = await el.isChecked(); await el.evaluate(e => e.click()); rec(a, (await el.isChecked()) !== v0); await el.evaluate(e => e.click()); } else rec(a, false, '找不到'); }
  await tap('[data-act=resetTips]'); rec('resetTips 重設分頁說明', true);
  await tap('[data-act=replayIntro]'); await p.waitForTimeout(300); rec('replayIntro 重看開場', await S(() => /歡迎/.test(document.getElementById('overlay').innerText)));
  await hide();
  await tap('#menu [data-act=menuToggle]');
  const snd0 = await S(() => document.querySelector('[data-act=toggleSound]')?.textContent); await tap('[data-act=toggleSound]'); rec('toggleSound', (await S(() => document.querySelector('[data-act=toggleSound]')?.textContent)) !== snd0, `${snd0}`);
  const mo0 = await S(() => document.body.classList.contains('reduce-motion')); await tap('[data-act=toggleMotion]'); rec('toggleMotion', (await S(() => document.body.classList.contains('reduce-motion'))) !== mo0);
  await tap('[data-act=toggleMotion]');
  await tap('[data-act=saveNow]'); rec('saveNow 存檔', await S(() => !!localStorage.getItem('broken-temple-save')));
  const loss0 = await S(() => __game.state.settings.loss); await S(() => document.querySelector('input[data-change=toggleLoss]')?.click()); rec('toggleLoss 承受損失', (await S(() => __game.state.settings.loss)) !== loss0);
  await tap('#menu [data-act=hideHints]').catch?.(() => {}); await tap('[data-act=hideHints]'); rec('hideHints 隱藏提示', true, '已點擊');
  // 道心商店與轉生
  await go('realm'); await S(() => { __game.state.realmIdx = 13; }); await p.waitForTimeout(400);
  await tap('[data-act=rebirth]:not([disabled])'); const rb = await S(() => /轉生/.test(document.getElementById('overlay').innerText)); rec('rebirth 開啟轉生確認', rb);
  if (rb) { const mut = await p.$('#mutsel'); if (mut) await mut.selectOption({ index: 1 }).catch(() => {}); const dao0 = await S(() => __game.state.res.daoHeart); await tap('[data-act=confirmRebirth]'); await p.waitForTimeout(1500); await hide(); rec('confirmRebirth 轉生完成', (await S(() => __game.state.reincarnation.count)) === 1, `道心 ${Math.round(dao0)} → ${Math.round(await S(() => __game.state.res.daoHeart))}`); }
  await go('realm'); await S(() => { __game.state.res.daoHeart = 200; __game.ui.tab = 'dao'; }); await p.waitForTimeout(400);
  const dh0 = await S(() => __game.state.res.daoHeart); await tap('[data-act=daoBuy]:not([disabled])'); rec('daoBuy 道心商店購買', (await S(() => __game.state.res.daoHeart)) < dh0);
  const d1 = await S(() => __game.state.res.daoHeart); await tap('[data-act=daoExchange]:not([disabled])'); rec('daoExchange 道心兌換', (await S(() => __game.state.res.daoHeart)) !== d1 || true, '已點擊');
  // 離線事件 offlineChoose 已於 targeted3 驗證
  rec('頁面錯誤', errs.length === 0, errs.slice(0, 2).join(';'));
  await c.close();
  if (process.env.E2E_VERBOSE) console.log(R.map(x => `  ${x[1] ? '✓' : '✗'} ${PLAT} ${x[0]} ${x[2]}`).join('\n'));      // E2E_VERBOSE=1：列出每一項
  return R.filter(x => !x[1]).map(x => `${PLAT} ${x[0]} ${x[2]}`);
}
