// Clicks every button, switch, tab and select on every page, and follows every internal link.
// Reports script errors, links that do not answer, and controls that do nothing at all.
//   node tools/qa/controls.mjs                  every page, against the local worker
//   node tools/qa/controls.mjs watch release    only pages whose address starts with one of these
// One of each kind of control is tried (forty hearts on a grid are one button). Dialogs that confirm are answered "no".
import { launch } from '../../promo/cdp.mjs';
import { PAGES, HOOK } from './pages.mjs';
const BASE = 'http://localhost:8790/', only = process.argv.slice(2);
const pages = [...PAGES, 'market.html?cat=Footage', 'market.html?cat=Merch', 'item.html?id=sfx-pack-weather-nature'].filter(p => !only.length || only.some(o => p.startsWith(o)));
const page = await launch({ width: 1440, height: 1000 });
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK + ` window.confirm = () => false; window.alert = () => {}; window.prompt = () => null; window.open = () => null; try { localStorage.setItem('side', 'open'); } catch (e) {}` });
const SEL = 'button, summary, [role="button"], .chip, .tab, input[type=checkbox], input[type=radio], select, input[type=range]';
const report = [], links = new Map();
for (const p of pages) {
  await page.goto(BASE + p); await page.sleep(2600);
  const loadErr = await page.run(`(window.__errs || []).join(' || ')`);
  if (loadErr) report.push(`ERROR on load   ${p}   ${loadErr}`);
  const list = JSON.parse(await page.run(`JSON.stringify([...document.querySelectorAll(${JSON.stringify(SEL)})].map((el, i) => { const r = el.getBoundingClientRect(); return { i, ok: r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.disabled && !el.closest('[hidden]'), tag: el.tagName.toLowerCase(),
    label: (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 50), key: el.className + '|' + (el.getAttribute('aria-label') || el.textContent || '').replace(/[0-9]+/g, '#').replace(/\\s+/g, ' ').trim().slice(0, 24) }; }))`));
  JSON.parse(await page.run(`JSON.stringify([...document.querySelectorAll('a[href]:not([download])')].map(a => a.getAttribute('href')))`)).forEach(h => {
    if (!h || /^(https?:|mailto:|#|javascript:|\/api\/)/.test(h)) return;
    const kind = h.split('?')[0] + (h.includes('?') ? '?' + h.split('?')[1].split('=')[0] : '');
    if (!links.has(kind)) links.set(kind, [h, p]);
  });
  const seen = new Set(), todo = list.filter(b => b.ok && !seen.has(b.key) && seen.add(b.key));
  let flagged = 0;
  for (const b of todo) {
    await page.goto(BASE + p); await page.sleep(1400);
    const res = await page.run(`(async () => { const el = [...document.querySelectorAll(${JSON.stringify(SEL)})][${b.i}]; if (!el) return '';
      let changed = 0; const mo = new MutationObserver(m => { changed += m.length; }); mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      const url = location.href, dialogs = document.querySelectorAll('dialog[open]').length, y = scrollY, before = window.__errs.length, snd = typeof audio !== 'undefined' ? audio : null, wasPaused = snd ? snd.paused : true, value = el.value;
      if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (el.type === 'range') { el.value = Number(el.max) / 2; el.dispatchEvent(new Event('input', { bubbles: true })); }
      else el.click();
      await new Promise(r => setTimeout(r, 700)); mo.disconnect();
      const errs = window.__errs.slice(before).filter(e => !/play\\(\\) failed|user didn't interact/.test(e)).join(' || ');
      const effect = changed > 0 || location.href !== url || document.querySelectorAll('dialog[open]').length !== dialogs || scrollY !== y || (snd && snd.paused !== wasPaused) || el.tagName === 'SELECT' || el.type === 'checkbox';
      return (errs ? 'ERROR ' + errs : '') + (effect ? '' : ' NOTHING HAPPENED'); })()`).catch(() => '');
    if (res.trim()) { flagged++; report.push(`${/ERROR/.test(res) ? 'ERROR on click ' : 'does nothing   '} ${p}   [${b.tag}] “${b.label}”   ${res.replace('NOTHING HAPPENED', '').trim()}`); }
  }
  console.log(`${p.padEnd(74)} ${String(todo.length).padStart(3)} controls, ${flagged} flagged`);
}
let bad = 0;
for (const [, [h, from]] of links) {
  const url = new URL(h, BASE + from).href, status = await page.run(`fetch(${JSON.stringify(url)}).then(r => r.status).catch(() => 0)`);
  let errs = '';
  if (status === 200) { await Promise.race([page.goto(url), page.sleep(9000)]); await page.sleep(1300); errs = await page.run(`(window.__errs || []).join(' || ')`).catch(() => ''); }
  if (status !== 200 || errs) { bad++; report.push(`LINK   ${h}   (on ${from})   status ${status}   ${errs}`); }
}
console.log(`${links.size} kinds of links followed, ${bad} flagged`);
console.log(report.length ? report.join('\n') : 'nothing flagged');
page.close(); process.exit(report.length ? 1 : 0);
