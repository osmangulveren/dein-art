// The whole money path, end to end, against a local test chain: deploy the splits contract, log in, release a film with
// two people, record the split, send support from another wallet, and read it back on the film page and the dashboard.
//   1. npx -y ganache@7 --chain.chainId 11155111 --wallet.deterministic --port 8545
//   2. the dein-art-api preview server (wrangler dev on port 8790)
//   3. node tools/qa/moneypath.mjs
// The browser gets a stand-in wallet that forwards to the local chain (its accounts are unlocked), and the site's
// requests to the Sepolia RPC are answered by the local chain as well. Nothing here touches a real network.
import { launch } from '../../promo/cdp.mjs';
import { ethers } from 'ethers';
import { writeFileSync } from 'node:fs';
const B = 'http://localhost:8790/', RPC = 'http://127.0.0.1:8545', SHOTS = process.argv[2];
const chain = new ethers.JsonRpcProvider(RPC, undefined, { cacheTimeout: -1 });
const [admin, maker, editor, , viewer] = (await chain.listAccounts()).map(a => a.address.toLowerCase());
const page = await launch({ width: 1440, height: 1100, scale: 0.6 });
await page.send('Network.enable'); await page.send('Network.setCacheDisabled', { cacheDisabled: true });
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__errs = []; addEventListener('error', e => { if (e.message) __errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  addEventListener('unhandledrejection', e => __errs.push('rejection: ' + (e.reason && e.reason.message)));
  window.confirm = () => true;
  (() => { const real = window.fetch.bind(window); window.fetch = (u, o) => real(typeof u === 'string' && u.startsWith('https://ethereum-sepolia-rpc.publicnode.com') ? '${RPC}' : u, o);
    const acct = () => localStorage.getItem('testAccount') || '${maker}';
    window.ethereum = { request: async ({ method, params = [] }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [acct()];
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null;
      if (method === 'personal_sign') { method = 'eth_sign'; params = [params[1], params[0]]; }          // the local chain knows the older name, with the two parts the other way round
      const r = await (await real('${RPC}', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) })).json();
      if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code, data: r.error.data });
      return r.result; } }; })();` });
let failed = 0;
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
const open = async (p, wait = 2500) => { await Promise.race([page.goto(B + p), page.sleep(20000)]); await page.sleep(wait); };
const errs = () => page.run(`(window.__errs || []).join(' || ')`);
const until = async (expr, ms = 20000) => { for (let t = 0; t < ms; t += 400) { if (await page.run(expr).catch(() => false)) return true; await page.sleep(400); } return false; };
const as = who => page.run(`localStorage.setItem('testAccount', '${who}'); localStorage.removeItem('session')`);
const login = async () => { await page.run(`document.querySelector('[data-open-login]').click()`); await page.sleep(300); await page.run(`document.querySelector('[data-login="wallet"]').click()`); return until(`!!localStorage.getItem('session')`); };
const shot = async n => { if (SHOTS) writeFileSync(`${SHOTS}/money-${n}.png`, await page.shot({ format: 'png' })); };
const bal = a => chain.getBalance(a);

// 1. deploy the contract from the deploy page
await open('deploy.html'); await as(admin); await open('deploy.html');
await page.run(`document.querySelector('[data-d="splits"] [data-deploy]').click()`);
ok('the splits contract deploys from the deploy page', await until(`/for this browser only|is on Sepolia/.test(document.querySelector('[data-d="splits"]').innerText) && !!localStorage.getItem('splitsAddress')`), await page.run(`document.querySelector('[data-d="splits"] h2').textContent`));
const at = await page.run(`localStorage.getItem('splitsAddress')`);
ok('a wallet that is not an admin cannot make it the address for everyone', (await (await fetch(B + 'api/config')).json()).splits === undefined);

// 2. the maker logs in and releases a film
await as(maker); await open('release.html');
ok('the maker logs in with the wallet', await login());
await open('release.html');
await page.run(`(async () => { const c = Object.assign(document.createElement('canvas'), { width: 320, height: 180 }), g = c.getContext('2d'); let n = 0;
  const rec = new MediaRecorder(c.captureStream(12), { mimeType: 'video/webm' }), parts = []; rec.ondataavailable = e => parts.push(e.data);
  const tick = setInterval(() => { g.fillStyle = 'hsl(' + (n * 9) + ' 60% 40%)'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.font = '40px sans-serif'; g.fillText('take ' + (++n), 90, 100); }, 80);
  rec.start(); await new Promise(r => setTimeout(r, 2200)); clearInterval(tick); await new Promise(r => { rec.onstop = r; rec.stop(); });
  const dt = new DataTransfer(); dt.items.add(new File([new Blob(parts, { type: 'video/webm' })], 'a test film.webm', { type: 'video/webm' }));
  const input = document.querySelector('[data-rel-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
ok('the film file is read', await until(`!!document.querySelector('.rel-file') && !/Reading/.test(document.querySelector('.rel-file').innerText)`, 15000), await page.run(`document.querySelector('.rel-file')?.innerText.replace(/\\n/g, ' | ')`));
const set = (sel, v) => page.run(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
const next = async () => { await page.run(`document.querySelector('[data-next]').click()`); await page.sleep(500); };
await next();
await set('[data-f="title"]', 'A Test Film "With Quotes" <b>'); await set('[data-f="desc"]', 'A short film made by a test, to see whether the money really arrives.'); await set('[data-f="type"]', 'Short film'); await next();
ok('the maker\'s own wallet is filled in for the first person', (await page.run(`document.querySelector('[data-f="people.0.wallet"]').value`)) === maker);
await set('[data-f="people.0.name"]', 'Mina Maker'); await set('[data-f="people.0.pct"]', '60');
await page.run(`document.querySelector('[data-add="people"]').click()`); await page.sleep(300);
await set('[data-f="people.1.name"]', 'Edo Editor'); await set('[data-f="people.1.role"]', 'Editor'); await set('[data-f="people.1.pct"]', '40');
await next();
ok('a share without a wallet is refused', await page.run(`/wallet address/.test(document.querySelector('.cf-err')?.textContent || '')`), await page.run(`document.querySelector('.cf-err')?.textContent`));
await set('[data-f="people.1.wallet"]', editor); await next(); await next();
await shot('1-check');
await page.run(`document.querySelector('[data-f="confirm"]').click()`); await page.sleep(300);
await page.run(`document.querySelector('[data-next]').click()`);
ok('the film is released', await until(`/It is released/.test(document.body.innerText)`, 30000), await page.run(`(document.querySelector('.stage h1, .done h1') || {}).textContent + ' ' + (document.querySelector('.stage .muted')?.textContent || '')`));
const films = await (await fetch(B + 'api/films')).json(), film = films[0];
ok('the server kept it as plain text, with its people and shares', film && film.title === 'A Test Film "With Quotes" b' && film.people.length === 2 && film.people[1].wallet === editor && film.owner === maker, film && `${film.id} · ${film.title}`);
ok('its address has the mark of a released film', /--[0-9a-f]{6}$/.test(film.id));

// 3. the film page: play, split, record
await open('watch.html?f=' + film.id, 3500);
ok('the film page shows it', (await page.run(`document.querySelector('.filmhead h1').textContent`)).startsWith('A Test Film') && !(await errs()), await errs());
ok('no tag from the title reached the page', await page.run(`!document.querySelector('.filmhead h1 b')`));
ok('the video plays from the site', await page.run(`new Promise(r => { const v = document.querySelector('video'); v.muted = true; v.addEventListener('playing', () => r(true), { once: true }); v.addEventListener('error', () => r(false), { once: true }); setTimeout(() => r(false), 12000); document.querySelector('.player .play').click(); })`));
ok('the split is shown and not yet recorded', await until(`/not recorded yet/.test(document.querySelector('[data-chain-split]').innerText)`), await page.run(`document.querySelector('.chainstate').innerText.replace(/\\n/g, ' ')`));
await page.run(`document.querySelector('[data-chain-register]').click()`);
ok('the maker records the split on the chain', await until(`/Recorded on the chain/.test(document.querySelector('[data-chain-split]').innerText)`, 30000), await page.run(`document.querySelector('.chainstate').innerText.replace(/\\n/g, ' ').slice(0, 90)`));
await shot('2-film');

// 4. a viewer sends support
await as(viewer); await open('watch.html?f=' + film.id, 3500);
const before = await Promise.all([maker, editor, admin, viewer].map(bal));
await page.run(`document.querySelector('[data-chain-support]').click()`);
ok('the support dialog opens with the breakdown', await until(`/Mina Maker · 60%/.test(document.querySelector('#chainpay').innerText)`), await page.run(`document.querySelector('#chainpay .sum').innerText.replace(/\\n/g, ' | ')`));
await shot('3-dialog');
await page.run(`document.querySelector('[data-cp-send]').click()`);
ok('the payment goes through', await until(`/Sent/.test(document.querySelector('#chainpay h2')?.textContent || '')`, 30000), await page.run(`document.querySelector('#chainpay').innerText.replace(/\\n+/g, ' | ').slice(0, 160)`));
const got = (await Promise.all([maker, editor, admin, viewer].map(bal))).map((b, i) => b - before[i]);
ok('60% reached the maker and 40% the editor, in the same transaction', got[0] === ethers.parseEther('0.00282') && got[1] === ethers.parseEther('0.00188'), got.slice(0, 2).map(ethers.formatEther).join(' / '));
ok('the fee reached the wallet that deployed the contract', got[2] === ethers.parseEther('0.0003'));
ok('the film page shows what was received', await until(`/1 payment so far, 0.005 test ETH/.test(document.querySelector('[data-chain-split]').innerText)`), await page.run(`document.querySelector('.chainstate').innerText.replace(/\\n/g, ' ').slice(0, 110)`));
await shot('4-after');

// 5. the dashboards
await as(maker); await open('dashboard.html'); await login(); await open('dashboard.html', 5000);
ok('the maker\'s dashboard shows the film and the money', await until(`/0\\.00282 ETH/.test(document.querySelector('[data-dash]').innerText) && /A Test Film/.test(document.querySelector('[data-dash]').innerText)`), await page.run(`[...document.querySelectorAll('.kpi')].map(k => k.innerText.replace(/\\n/g, ' ')).join(' | ')`));
await shot('5-dashboard');
await as(editor); await open('dashboard.html'); await login(); await open('dashboard.html', 5000);
ok('the editor\'s dashboard shows their share of it', await until(`/0\\.00188 ETH/.test(document.querySelector('[data-dash]').innerText)`), await page.run(`document.querySelector('.kpi').innerText.replace(/\\n/g, ' ')`));

// 6. where else the film shows up
await open('index.html', 3000);
ok('the home page lists it under what creators released', await page.run(`!document.querySelector('[data-releases]').hidden && /A Test Film/.test(document.querySelector('[data-releases]').innerText)`));
await open('artist.html?wallet=' + editor, 3500);
ok('it is on the editor\'s wallet page', await page.run(`/A Test Film/.test(document.querySelector('[data-panel="videos"]').innerText)`));
await open('search.html?q=test+film', 4000);
ok('search finds it', await page.run(`/A Test Film/.test(document.querySelector('[data-search]').innerText)`));

// 7. someone else cannot remove it; its maker can
const bad = await fetch(B + 'api/films/' + film.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: null }) });
ok('nobody without the wallet can remove it', bad.status === 401);
await as(maker); await open('watch.html?f=' + film.id); await login(); await open('watch.html?f=' + film.id, 3000);
await page.run(`document.querySelector('[data-film-remove]').click()`);
ok('its maker removes it', await until(`location.pathname === '/' || /index/.test(location.pathname)`, 10000) && (await (await fetch(B + 'api/films')).json()).every(f => f.id !== film.id));
ok('no script errors along the way', !(await errs()), await errs());
console.log(failed ? `${failed} FAILED` : 'all passed'); page.close(); process.exit(failed ? 1 : 0);
