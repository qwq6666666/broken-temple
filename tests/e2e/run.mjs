// 瀏覽器端到端測試（桌面＋手機）：版面溢出掃描與操作覆蓋。
// 需要 Playwright：npm i -D playwright && npx playwright install chromium；沒有安裝時會略過並以 0 結束。
// 用法：node tests/e2e/run.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pw;
try { pw = createRequire(import.meta.url)('playwright'); } catch { console.log('未安裝 playwright，略過端到端測試（npm i -D playwright）'); process.exit(0); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = p.endsWith('/') ? path.join(p, 'index.html') : p;
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch();
const failures = [];
try {
  const { run: overflow } = await import('./overflow.mjs');
  const { run: cover } = await import('./cover.mjs');
  const o = await overflow(browser, URL_, pw.devices); console.log(`手機溢出掃描：${o.length ? '失敗 ' + o.length : '通過'}`); failures.push(...o.map(x => '溢出 ' + x));
  for (const plat of ['d', 'm']) { const f = await cover(browser, URL_, pw.devices, plat); console.log(`操作覆蓋（${plat === 'd' ? '桌面' : '手機'}）：${f.length ? '失敗 ' + f.length : '通過'}`); failures.push(...f.map(x => '覆蓋 ' + x)); }
} finally { await browser.close(); server.close(); }
if (failures.length) { console.log('\n失敗項目：\n' + failures.map(x => '  - ' + x).join('\n')); process.exit(1); }
console.log('\n端到端測試全部通過');
