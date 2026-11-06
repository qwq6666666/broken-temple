// 手機版橫向溢出掃描：以「設定視窗寬」為準（isMobile 時 innerWidth 會被內容撐大，不可用）。
// 在 390／360／320 寬、早期／中期／後期進度、所有分頁，展開全部精簡列後檢查有沒有元素超出視窗。
export async function run(b, URL, devices) {
  const issues = [];
  for (const W of [390, 360, 320]) {
    const c = await b.newContext({ ...devices['iPhone 12'], viewport: { width: W, height: 800 } }); const p = await c.newPage();
    await p.goto(URL + '?speed=1'); await p.waitForTimeout(700); await p.evaluate(() => document.getElementById('overlay').classList.remove('on'));
    for (const stage of ['early', 'mid', 'late']) {
      await p.evaluate(async stage => {
        const s = __game.state; const G = await import('/src/core/gacha.js');
        s.realmIdx = { early: 2, mid: 8, late: 13 }[stage]; s.res.stone = 1e9; s.res.qi = 1e12; s.res.token = 40; s.res.shard = 300; s.res.merit = 30;
        for (const k of Object.keys(s.res)) if (k.startsWith('mat_')) s.res[k] = 5;
        s.unlocked.gacha = s.unlocked.goals = s.unlocked.avenge = s.unlocked.expedition = s.unlocked.factions = s.unlocked.nemesis = s.unlocked.dao = true; s.stats.bursts = 2;
        if (stage !== 'early') { G.pull(s, 30); s.disciples.forEach((d, i) => { d.lv = 10; d.star = i % 4; }); s.artifacts = ['yinqi', 'tuna', 'huxin']; s.factions.qingyun = 70; s.factions.chiyan = 20; s.reincarnation.count = 3; }
        s.grudges = Array.from({ length: stage === 'early' ? 1 : 8 }, (_, i) => ({ id: 500 + i, name: ['蔣鴻志', '周長庚', '李承恩之弟', '孫無咎', '趙明', '錢貫', '吳起', '鄭和'][i % 8], type: ['former', 'rival', 'elder', 'trader'][i % 4], sect: ['青雲宗', '赤焰谷', '萬劍山莊', '南海商隊'][i % 4], role: '外門弟子', personality: ['傲慢', '勢利', '刻薄'][i % 3], lvl: 4 + i, alert: i === 2, element: ['金', '木', '水', '火', '土'][i % 5], ripe: i === 1 ? 2 : 0, foe: i === 3 ? 3 : 0 }));
        s.disguise.value = 20; s.visitor.nextAt = 1e15; s.visitor.current = null;
      }, stage);
      await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('overlay').classList.remove('on'));
      const tabs = await p.$$eval('#tabs .tab', e => e.map(x => x.dataset.tab));
      for (const t of tabs) {
        await p.evaluate(t => { __game.ui.tab = t; }, t); await p.waitForTimeout(350);
        // 展開所有精簡列
        await p.evaluate(() => document.querySelectorAll('#panel .cmain').forEach(x => x.click())); await p.waitForTimeout(200);
        const r = await p.evaluate(W => {
          const bad = []; const de = document.documentElement;
          document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (r.width && r.right > W + 1 && cs.position !== 'fixed' && !el.closest('svg, canvas, .scene, #toasts, .fxcanvas') && cs.visibility !== 'hidden') bad.push(`${el.tagName}.${(el.className || '').toString().split(' ')[0]} r=${Math.round(r.right)}`); });
          return { sw: de.scrollWidth, bad: [...new Set(bad)].slice(0, 5) };
        }, W);
        if (r.sw > W + 1 || r.bad.length) issues.push(`W${W} ${stage} ${t}: scrollWidth=${r.sw} 溢出元素=${r.bad.join(' | ')}`);
      }
    }
    await c.close();
  }
  return issues;
}
