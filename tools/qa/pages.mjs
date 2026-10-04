// Opens every page of the site and reports script errors and empty pages.
//   node tools/qa/pages.mjs                       against the local worker (http://localhost:8790/)
//   node tools/qa/pages.mjs https://example.com/   against any copy of the site
// Run it before every push: a page can look fine and still have thrown at the end of its script.
import { launch } from '../../promo/cdp.mjs';
export const PAGES = ['index.html', 'trending.html', 'live.html', 'market.html', 'market.html?cat=Music', 'item.html?id=tpl-film-looks', 'watch.html', 'watch.html?f=nosferatu', 'creator.html', 'dashboard.html',
  'artist.html?name=Buster%20Keaton', 'artist.html?name=XCOPY', 'artist.html?wallet=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'studios.html', 'studio.html?s=star-film', 'collection.html?artist=XCOPY',
  'collection.html?contract=0x6df9bb5d8c067de97031d62de63c4d94a54fb567', 'token.html?c=0x6df9bb5d8c067de97031d62de63c4d94a54fb567&id=1', 'category.html?c=documentary', 'search.html?q=moon',
  'upload.html', 'release.html', 'add-credit.html', 'share-asset.html', 'fund.html', 'deploy.html'];
export const HOOK = `window.__errs = []; addEventListener('error', e => { if (e.message) __errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  addEventListener('unhandledrejection', e => __errs.push('rejection: ' + (e.reason && e.reason.message)));`;
if (import.meta.url === 'file://' + process.argv[1].replace(/ /g, '%20')) {
  const BASE = process.argv[2] || 'http://localhost:8790/';
  const page = await launch({ width: 1440, height: 900 });
  await page.send('Network.enable'); await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
  let bad = 0;
  for (const p of PAGES) {
    await Promise.race([page.goto(BASE + p), page.sleep(15000)]); await page.sleep(1800);
    const errs = await page.run(`(window.__errs || ['the error hook did not load']).join(' || ')`), text = await page.run(`document.querySelector('main') ? document.querySelector('main').innerText.trim().length : -1`);
    const flag = errs || (text >= 0 && text < 20 ? 'EMPTY PAGE' : '');
    if (flag) bad++;
    console.log((flag ? 'FAIL ' : 'ok   ') + p.padEnd(74) + flag);
  }
  console.log(bad ? `${bad} of ${PAGES.length} pages have a problem` : `all ${PAGES.length} pages load without script errors`);
  page.close(); process.exit(bad ? 1 : 0);
}
